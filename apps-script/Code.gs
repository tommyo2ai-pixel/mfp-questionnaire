/**
 * Ming Fong Paper — questionnaire backend.
 *
 * Bound to a Google Sheet in Tommy's own Drive. It stores invites, drafts and
 * submissions, writes the report files, and sends the notification email.
 *
 * It is only ever called server-to-server by the Netlify functions, never by a
 * customer's browser — script.google.com is blocked in mainland China, where
 * most respondents are. Every request must carry the shared secret; the web app
 * has to be deployed as "Anyone" (otherwise Google would demand a sign-in the
 * customer cannot complete), so that secret is the actual access control.
 *
 * This file deliberately does no interpretation of the answers. The Markdown
 * report and the internal "signals" arrive already built from
 * netlify/functions/_lib/report.mjs, so there is one implementation of each
 * rather than two that can drift apart.
 *
 * FIRST RUN: Extensions ▸ Apps Script, paste this file, then run setupSheet().
 * See DEPLOY.md.
 */

/* ------------------------------------------------------------------ config */

var SHEET_INVITES = 'Invites';
var SHEET_SUBMISSIONS = 'Submissions';
var SHEET_ANSWERS = 'Answers';

var PROP_SECRET = 'SHARED_SECRET';
var PROP_ROOT_FOLDER = 'ROOT_FOLDER_ID';
var PROP_NOTIFY = 'NOTIFY_EMAIL';
var PROP_FAILURES = 'RECENT_FAILURES';
var PROP_SITE_URL = 'SITE_URL';

var ROOT_FOLDER_NAME = 'Ming Fong — Questionnaires';
var DEFAULT_NOTIFY = 'tommy.chan@mingfongpaper.com';

/* Where the questionnaire is served. This is only used to build the invite link
   that gets sent to a client, so it can change at any time without affecting
   codes already issued — the same code works on either address.
   Change it with Ming Fong ▸ Set questionnaire address when the custom domain
   is live. */
var DEFAULT_SITE_URL = 'https://mfp-questionnaire.netlify.app';

/* Unambiguous alphabet: no I, O, 0 or 1, because these codes get read aloud on
   the phone and retyped from WeChat messages. 8 characters ≈ 40 bits. */
var CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/* A brute-force brake. The Netlify function also pauses on each failure, and a
   40-bit code is not realistically guessable, but this stops anyone hammering
   the endpoint from burning through the daily quota. */
var FAILURE_WINDOW_MS = 10 * 60 * 1000;
var FAILURE_LIMIT = 50;

/* --------------------------------------------------------------- entrypoint */

function doPost(e) {
	try {
		var payload = JSON.parse(e.postData.contents);

		if (!secretMatches(payload.secret)) {
			return jsonOut({ ok: false, error: 'Unauthorised' });
		}

		switch (payload.action) {
			case 'validateCode':
				return jsonOut(validateCode(payload));
			case 'getInvite':
				return jsonOut(getInvite(payload.code));
			case 'loadDraft':
				return jsonOut(loadDraft(payload.code));
			case 'saveDraft':
				return jsonOut(saveDraft(payload));
			case 'submit':
				return jsonOut(submit(payload));
			default:
				return jsonOut({ ok: false, error: 'Unknown action' });
		}
	} catch (error) {
		return jsonOut({ ok: false, error: String(error && error.message ? error.message : error) });
	}
}

/* A GET is only ever a human pasting the /exec URL into a browser. Say
   something useful rather than throwing. */
function doGet() {
	return ContentService.createTextOutput(
		'Ming Fong Paper questionnaire backend. This endpoint accepts POST requests from the questionnaire site only.',
	).setMimeType(ContentService.MimeType.TEXT);
}

function jsonOut(object) {
	return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}

function secretMatches(given) {
	var expected = PropertiesService.getScriptProperties().getProperty(PROP_SECRET);
	if (!expected || !given || given.length !== expected.length) return false;
	// Constant-time-ish: always compare every character.
	var diff = 0;
	for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
	return diff === 0;
}

/* ------------------------------------------------------------------ actions */

function validateCode(payload) {
	var code = String(payload.code || '').toUpperCase();

	if (tooManyRecentFailures()) {
		return { ok: false, error: 'Too many attempts. Please try again in a few minutes.', code: 'RATE_LIMITED' };
	}

	var row = findInviteRow(code);
	if (!row) {
		recordFailure();
		return { ok: false, error: 'That access code was not recognised.', code: 'BAD_CODE' };
	}

	touchInvite(row, { status: row.status === 'submitted' ? 'submitted' : 'in progress' });
	return { ok: true, invite: invitePayload(row) };
}

function getInvite(code) {
	var row = findInviteRow(String(code || '').toUpperCase());
	if (!row) return { ok: false, error: 'Unknown code', code: 'BAD_CODE' };
	return { ok: true, invite: invitePayload(row) };
}

function loadDraft(code) {
	var row = findInviteRow(String(code || '').toUpperCase());
	if (!row) return { ok: false, error: 'Unknown code', code: 'BAD_CODE' };

	var file = draftFile(row, false);
	if (!file) return { ok: true, answers: {}, meta: { revision: 0 } };

	try {
		var parsed = JSON.parse(file.getBlob().getDataAsString());
		return { ok: true, answers: parsed.answers || {}, meta: parsed.meta || { revision: 0 } };
	} catch (error) {
		// A corrupt draft must not lock somebody out of their own questionnaire;
		// their browser still holds a copy in localStorage.
		return { ok: true, answers: {}, meta: { revision: 0 } };
	}
}

function saveDraft(payload) {
	var code = String(payload.code || '').toUpperCase();
	var row = findInviteRow(code);
	if (!row) return { ok: false, error: 'Unknown code', code: 'BAD_CODE' };
	if (row.status === 'submitted') return { ok: false, error: 'Already submitted', code: 'LOCKED' };

	var body = JSON.stringify({ answers: payload.answers || {}, meta: payload.meta || {} });
	var file = draftFile(row, true);
	file.setContent(body);

	touchInvite(row, { status: 'in progress' });
	return { ok: true, revision: (payload.meta && payload.meta.revision) || 0 };
}

function submit(payload) {
	var code = String(payload.code || '').toUpperCase();

	// Two tabs pressing Submit at the same moment must not produce two folders.
	var lock = LockService.getScriptLock();
	lock.waitLock(30000);
	try {
		var row = findInviteRow(code);
		if (!row) return { ok: false, error: 'Unknown code', code: 'BAD_CODE' };
		if (row.status === 'submitted') return { ok: false, error: 'Already submitted', code: 'LOCKED' };

		var submittedAt = payload.submittedAt || new Date().toISOString();
		var summary = payload.summary || {};
		var flat = payload.flat || [];
		var signals = payload.signals || [];
		var folder = inviteFolder(row);

		// 1. The three artefacts.
		folder.createFile(
			Utilities.newBlob(
				JSON.stringify(
					{
						code: code,
						company: summary.company || row.company,
						submittedAt: submittedAt,
						schemaVersion: payload.schemaVersion,
						answers: payload.answers || {},
						signals: signals,
					},
					null,
					2,
				),
				'application/json',
				'partA-submission.json',
			),
		);

		folder.createFile(Utilities.newBlob(payload.markdown || '', 'text/markdown', 'partA-submission.md'));

		var pdf = folder.createFile(
			Utilities.newBlob(submissionHtml(summary, flat, submittedAt, code), MimeType.HTML, 'temp')
				.getAs(MimeType.PDF)
				.setName('Part A — ' + safeName(summary.company || row.company) + '.pdf'),
		);

		// 2. The spreadsheet rows.
		appendSubmissionRow(row, summary, flat, signals, submittedAt, folder, pdf);
		appendAnswerRows(code, summary.company || row.company, submittedAt, flat);

		// 3. Lock the invite.
		touchInvite(row, { status: 'submitted', submittedAt: submittedAt, folderUrl: folder.getUrl() });

		// 4. Notify. Sending must never fail the submission — the answers are
		//    already safely in Drive, and the customer has been told it worked.
		try {
			sendNotification(summary, signals, flat, code, folder, pdf, submittedAt);
		} catch (error) {
			console.error('Notification email failed: ' + error);
		}
		try {
			if (summary.email) sendConfirmation(summary, flat);
		} catch (error) {
			console.error('Confirmation email failed: ' + error);
		}

		return { ok: true, submittedAt: submittedAt, folderUrl: folder.getUrl() };
	} finally {
		lock.releaseLock();
	}
}

/* ------------------------------------------------------------------ invites */

function invitesSheet() {
	var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_INVITES);
	if (!sheet) throw new Error('The "' + SHEET_INVITES + '" sheet is missing. Run setupSheet() once.');
	return sheet;
}

var INVITE_COLUMNS = ['Code', 'Company', 'Contact', 'Email', 'Created', 'Status', 'Last activity', 'Submitted', 'Folder'];

function findInviteRow(code) {
	if (!code) return null;
	var sheet = invitesSheet();
	var values = sheet.getDataRange().getValues();
	for (var i = 1; i < values.length; i++) {
		if (String(values[i][0]).toUpperCase().trim() === code) {
			return {
				rowIndex: i + 1,
				code: code,
				company: values[i][1],
				contact: values[i][2],
				email: values[i][3],
				status: String(values[i][5] || '').toLowerCase(),
				submittedAt: values[i][7],
				folderUrl: values[i][8],
			};
		}
	}
	return null;
}

function invitePayload(row) {
	return {
		code: row.code,
		company: row.company,
		status: row.status === 'submitted' ? 'submitted' : 'open',
		submittedAt: row.submittedAt ? String(row.submittedAt) : null,
	};
}

function touchInvite(row, changes) {
	var sheet = invitesSheet();
	sheet.getRange(row.rowIndex, 7).setValue(new Date());
	if (changes.status) sheet.getRange(row.rowIndex, 6).setValue(changes.status);
	if (changes.submittedAt) sheet.getRange(row.rowIndex, 8).setValue(changes.submittedAt);
	if (changes.folderUrl) sheet.getRange(row.rowIndex, 9).setValue(changes.folderUrl);
}

/* -------------------------------------------------------------------- Drive */

function rootFolder() {
	var properties = PropertiesService.getScriptProperties();
	var id = properties.getProperty(PROP_ROOT_FOLDER);
	if (id) {
		try {
			return DriveApp.getFolderById(id);
		} catch (error) {
			// Folder deleted or moved to another account — fall through and remake.
		}
	}
	var folder = DriveApp.createFolder(ROOT_FOLDER_NAME);
	properties.setProperty(PROP_ROOT_FOLDER, folder.getId());
	return folder;
}

function inviteFolder(row) {
	var name = safeName(row.company) + ' — ' + row.code;
	var root = rootFolder();
	var existing = root.getFoldersByName(name);
	return existing.hasNext() ? existing.next() : root.createFolder(name);
}

function draftFile(row, createIfMissing) {
	var folder = inviteFolder(row);
	var files = folder.getFilesByName('draft.json');
	if (files.hasNext()) return files.next();
	if (!createIfMissing) return null;
	return folder.createFile(Utilities.newBlob('{}', 'application/json', 'draft.json'));
}

function safeName(value) {
	return String(value || 'Unknown')
		.replace(/[\\/:*?"<>|]/g, '-')
		.trim()
		.slice(0, 80);
}

/* --------------------------------------------------------------- spreadsheet */

function appendSubmissionRow(row, summary, flat, signals, submittedAt, folder, pdf) {
	var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_SUBMISSIONS);
	var answered = flat.filter(function (item) {
		return item.answer;
	}).length;

	sheet.appendRow([
		new Date(submittedAt),
		row.code,
		summary.company || row.company,
		summary.site || '',
		summary.contact || '',
		summary.email || '',
		summary.phone || '',
		answered + ' / ' + flat.length,
		signals.length,
		folder.getUrl(),
		pdf.getUrl(),
	]);
}

/*
 * Long format — one row per question per submission. Wide format would need a
 * new column every time a question is added, and would silently misalign old
 * submissions against a reworded schema. This shape survives both, and is the
 * easy one to filter and compare across clients.
 */
function appendAnswerRows(code, company, submittedAt, flat) {
	var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ANSWERS);
	if (!flat.length) return;

	var rows = flat.map(function (item) {
		return [new Date(submittedAt), code, company, item.section, item.id, item.question, item.answer || ''];
	});
	sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

/* ------------------------------------------------------------------- output */

function submissionHtml(summary, flat, submittedAt, code) {
	var html = [
		'<html><head><meta charset="utf-8"><style>',
		'body{font-family:Helvetica,Arial,sans-serif;font-size:11pt;color:#0f172a;margin:36px}',
		'h1{font-size:18pt;margin:0 0 4px}h2{font-size:12pt;margin:22px 0 8px;color:#047857;border-bottom:1px solid #ddd;padding-bottom:4px}',
		'table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:5px 0;border-bottom:1px solid #eee}',
		'td.q{width:52%;color:#475569;padding-right:14px}.blank{color:#94a3b8;font-style:italic}',
		'.meta{color:#475569;font-size:9.5pt;margin-bottom:18px}',
		'</style></head><body>',
		'<h1>Part A — Pre-Proposal</h1>',
		'<div class="meta">Flexographic Printing Standardization Program<br>',
		escapeHtml(summary.company || '') + (summary.site ? ' · ' + escapeHtml(summary.site) : '') + '<br>',
		'Submitted ' + escapeHtml(submittedAt) + ' · Reference ' + escapeHtml(code) + '</div>',
	];

	var section = null;
	flat.forEach(function (item) {
		if (item.section !== section) {
			if (section !== null) html.push('</table>');
			section = item.section;
			html.push('<h2>' + escapeHtml(item.section) + '. ' + escapeHtml(item.sectionTitle) + '</h2><table>');
		}
		html.push(
			'<tr><td class="q">' +
				escapeHtml(item.question) +
				'</td><td>' +
				(item.answer ? escapeHtml(item.answer).replace(/\n/g, '<br>') : '<span class="blank">Not answered</span>') +
				'</td></tr>',
		);
	});
	if (section !== null) html.push('</table>');

	html.push('</body></html>');
	return html.join('');
}

function escapeHtml(value) {
	return String(value === undefined || value === null ? '' : value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/* -------------------------------------------------------------------- email */

function notifyAddress() {
	return PropertiesService.getScriptProperties().getProperty(PROP_NOTIFY) || DEFAULT_NOTIFY;
}

function siteUrl() {
	var value = PropertiesService.getScriptProperties().getProperty(PROP_SITE_URL) || DEFAULT_SITE_URL;
	return value.replace(/\/+$/, '');
}

/*
 * The invite. This is the only email the client gets before they start, so it
 * has to do three jobs at once: say who it is from, say what it costs them in
 * time, and give them a way in that survives being forwarded to a colleague.
 * Hence both a link and the bare code — the link is one tap on a phone, and the
 * code still works if the link is mangled by a mail client or WeChat.
 */
function sendInviteEmail(code, company, contact, email) {
	var link = siteUrl() + '/?c=' + encodeURIComponent(code);

	var body = [
		'<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#0f172a;max-width:620px;line-height:1.6">',
		'<p>Dear ' + escapeHtml(contact || 'Sir or Madam') + ',</p>',
		'<p>Thank you for your interest in the Flexographic Printing Standardization Program. ',
		'Before we prepare a proposal for <strong>' + escapeHtml(company) + '</strong>, we ask a short set of questions ',
		'so that the proposal is scoped against your actual operation rather than a generic assumption.</p>',

		'<p style="margin:24px 0"><a href="' + link + '" ',
		'style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">',
		'Open the questionnaire</a></p>',

		'<p>If the button does not work, go to <a href="' + siteUrl() + '">' + escapeHtml(siteUrl()) + '</a> ',
		'and enter this access code:</p>',
		'<p style="font-size:20px;font-weight:bold;letter-spacing:1px;margin:8px 0 20px">' + escapeHtml(code) + '</p>',

		'<p>A few things worth knowing before you start:</p>',
		'<ul style="padding-left:20px">',
		'<li>It takes about 25 minutes.</li>',
		'<li><strong>Your answers save as you type.</strong> You can close the page and come back later with the same link or code — on a computer or a phone.</li>',
		'<li>Please answer only what you know. Blank or approximate answers are genuinely useful; gaps in available information tell us something too. Please do not spend time researching answers you do not have to hand.</li>',
		'<li>Nothing is submitted until you choose to submit it.</li>',
		'</ul>',

		'<p>All information is treated as confidential and used only for proposal preparation. ',
		'If you would prefer the questions as a document instead, just reply to this email.</p>',

		'<p>Kind regards,<br>Tommy Chan<br>Ming Fong Paper Limited, Hong Kong<br>',
		'<a href="mailto:' + notifyAddress() + '">' + notifyAddress() + '</a></p>',
		'</div>',
	];

	MailApp.sendEmail({
		to: email,
		// Tommy gets the same email, so he has a record of exactly what was sent
		// and can forward it himself if the client says it never arrived. Bcc
		// rather than Cc: the client has no reason to see an internal address on
		// their copy, and replyTo already points back here.
		bcc: notifyAddress(),
		subject: 'Your questionnaire — Ming Fong Paper Limited',
		htmlBody: body.join(''),
		name: 'Ming Fong Paper Limited',
		replyTo: notifyAddress(),
	});
}

function sendNotification(summary, signals, flat, code, folder, pdf, submittedAt) {
	var answered = flat.filter(function (item) {
		return item.answer;
	}).length;

	var body = [
		'<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#0f172a;max-width:640px">',
		'<h2 style="font-size:17px;margin:0 0 12px">Questionnaire submitted</h2>',
		'<table style="border-collapse:collapse;font-size:14px">',
		emailRow('Company', summary.company),
		emailRow('Site', summary.site),
		emailRow('Contact', summary.contact),
		emailRow('Email', summary.email),
		emailRow('Phone / WeChat', summary.phone),
		emailRow('Employees', summary.employees),
		emailRow('Answered', answered + ' of ' + flat.length + ' applicable questions'),
		emailRow('Reference', code),
		emailRow('Received', submittedAt),
		'</table>',
		'<p style="margin:16px 0"><a href="' + folder.getUrl() + '">Open the Drive folder</a> · <a href="' + pdf.getUrl() + '">PDF</a></p>',
		'<p style="color:#475569;font-size:13px">partA-submission.md in that folder is the file to hand to Claude when drafting the proposal.</p>',
	];

	if (signals.length) {
		body.push(
			'<div style="margin-top:22px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px">',
			'<p style="margin:0 0 10px;font-weight:bold;color:#9a3412">Internal — do not forward to the client</p>',
			'<ol style="margin:0;padding-left:20px;color:#0f172a">',
		);
		signals.forEach(function (signal) {
			body.push('<li style="margin-bottom:8px">' + escapeHtml(signal) + '</li>');
		});
		body.push('</ol></div>');
	}

	body.push('</div>');

	var options = {
		to: notifyAddress(),
		subject: 'Questionnaire submitted — ' + (summary.company || 'Unknown company'),
		htmlBody: body.join(''),
		name: 'Ming Fong Paper questionnaire',
	};
	// Reply goes straight to the client, so the notification doubles as the
	// start of the thread. Only set it when there is an address to use.
	if (summary.email) options.replyTo = summary.email;
	MailApp.sendEmail(options);
}

function emailRow(label, value) {
	return (
		'<tr><td style="padding:3px 14px 3px 0;color:#475569">' +
		escapeHtml(label) +
		'</td><td style="padding:3px 0"><strong>' +
		escapeHtml(value || '—') +
		'</strong></td></tr>'
	);
}

/*
 * The customer's copy. It must contain nothing from the signals block, and it
 * asks for the optional documents they ticked — uploads are deliberately not
 * part of this version, so email is how those arrive.
 */
function sendConfirmation(summary, flat) {
	var documents = flat.filter(function (item) {
		return item.id === 'opt_documents' && item.answer;
	});

	var body = [
		'<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#0f172a;max-width:620px">',
		'<p>Dear ' + escapeHtml(summary.contact || 'Sir or Madam') + ',</p>',
		'<p>Thank you — we have received the pre-proposal questionnaire for <strong>' + escapeHtml(summary.company) + '</strong>.</p>',
		'<p>We will review your answers and arrange a 30-minute call to clarify a small number of points. The proposal is issued within 5 working days of that call.</p>',
	];

	if (documents.length) {
		body.push(
			'<p>You indicated that these already exist: <strong>' + escapeHtml(documents[0].answer) + '</strong>. ',
			'Whenever convenient, please send them to this address or by WeChat. Please do not create anything new for this purpose.</p>',
		);
	}

	body.push(
		'<p>All information you provided is treated as confidential and used only for proposal preparation.</p>',
		'<p>Kind regards,<br>Tommy Chan<br>Ming Fong Paper Limited, Hong Kong<br>',
		'<a href="mailto:' + notifyAddress() + '">' + notifyAddress() + '</a></p>',
		'</div>',
	);

	MailApp.sendEmail({
		to: summary.email,
		subject: 'Questionnaire received — Ming Fong Paper Limited',
		htmlBody: body.join(''),
		name: 'Ming Fong Paper Limited',
		replyTo: notifyAddress(),
	});
}

/* ------------------------------------------------------------ rate limiting */

function recordFailure() {
	var properties = PropertiesService.getScriptProperties();
	var now = Date.now();
	var recent = [];
	try {
		recent = JSON.parse(properties.getProperty(PROP_FAILURES) || '[]');
	} catch (error) {
		recent = [];
	}
	recent = recent
		.filter(function (time) {
			return now - time < FAILURE_WINDOW_MS;
		})
		.concat(now);
	properties.setProperty(PROP_FAILURES, JSON.stringify(recent.slice(-200)));
}

function tooManyRecentFailures() {
	var properties = PropertiesService.getScriptProperties();
	var now = Date.now();
	try {
		var recent = JSON.parse(properties.getProperty(PROP_FAILURES) || '[]').filter(function (time) {
			return now - time < FAILURE_WINDOW_MS;
		});
		return recent.length >= FAILURE_LIMIT;
	} catch (error) {
		return false;
	}
}

/* ----------------------------------------------------------- sheet UI + setup */

function onOpen() {
	SpreadsheetApp.getUi()
		.createMenu('Ming Fong')
		.addItem('Create invite…', 'createInvitePrompt')
		.addSeparator()
		.addItem('Set up sheets', 'setupSheet')
		.addItem('Set questionnaire address…', 'setSiteUrlPrompt')
		.addItem('Show settings', 'showSettings')
		.addItem('Run self-test', 'selfTest')
		.addToUi();
}

/** Run once after pasting this file in. Safe to run again. */
function setupSheet() {
	var spreadsheet = SpreadsheetApp.getActive();

	ensureSheet(spreadsheet, SHEET_INVITES, INVITE_COLUMNS);
	ensureSheet(spreadsheet, SHEET_SUBMISSIONS, [
		'Submitted',
		'Code',
		'Company',
		'Site',
		'Contact',
		'Email',
		'Phone / WeChat',
		'Answered',
		'Signals',
		'Folder',
		'PDF',
	]);
	ensureSheet(spreadsheet, SHEET_ANSWERS, ['Submitted', 'Code', 'Company', 'Section', 'Field ID', 'Question', 'Answer']);

	var properties = PropertiesService.getScriptProperties();
	if (!properties.getProperty(PROP_SECRET)) {
		properties.setProperty(PROP_SECRET, randomToken(48));
	}
	if (!properties.getProperty(PROP_NOTIFY)) {
		properties.setProperty(PROP_NOTIFY, DEFAULT_NOTIFY);
	}
	if (!properties.getProperty(PROP_SITE_URL)) {
		properties.setProperty(PROP_SITE_URL, DEFAULT_SITE_URL);
	}
	rootFolder();

	// Running this from the Apps Script editor's own Run button — rather than
	// from the spreadsheet's Ming Fong menu — has no UI to pop a dialog into.
	// Everything above this line still completed, so that must not read as a
	// failure: fall back to the execution log, which is visible either way.
	try {
		showSettings();
	} catch (error) {
		Logger.log(settingsText());
		Logger.log('Setup finished. The line above has your GAS_SECRET — copy it into Netlify. ' + '(Shown here because this was run from the editor, not from the spreadsheet’s Ming Fong menu; that menu can also show it with Show settings.)');
	}
}

function ensureSheet(spreadsheet, name, headers) {
	var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
	sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#f1f5f9');
	sheet.setFrozenRows(1);
	sheet.autoResizeColumns(1, headers.length);
	return sheet;
}

function settingsText() {
	var properties = PropertiesService.getScriptProperties();
	return (
		'Copy these into Netlify (Site configuration ▸ Environment variables):\n\n' +
		'GAS_SECRET\n' +
		properties.getProperty(PROP_SECRET) +
		'\n\n' +
		'GAS_URL\n' +
		'The /exec URL from Deploy ▸ Manage deployments.\n\n' +
		'Invite links point at: ' +
		siteUrl() +
		'\nNotifications go to: ' +
		notifyAddress() +
		'\nDrive folder: ' +
		ROOT_FOLDER_NAME
	);
}

/* Sheet menu ▸ Show settings. Only callable from the spreadsheet's own menu —
   see setupSheet() for the editor-run fallback that logs this instead. */
function showSettings() {
	SpreadsheetApp.getUi().alert('Questionnaire settings', settingsText(), SpreadsheetApp.getUi().ButtonSet.OK);
}

/*
 * Sheet menu ▸ Set questionnaire address. Use this when the custom domain goes
 * live. Codes already issued keep working — only newly generated links change.
 */
function setSiteUrlPrompt() {
	var ui = SpreadsheetApp.getUi();
	var response = ui.prompt(
		'Questionnaire address',
		'Where the questionnaire is served, with no trailing slash.\n\nCurrently: ' + siteUrl(),
		ui.ButtonSet.OK_CANCEL,
	);
	if (response.getSelectedButton() !== ui.Button.OK) return;

	var value = response.getResponseText().trim().replace(/\/+$/, '');
	if (!/^https:\/\/[^\s\/]+$/.test(value)) {
		ui.alert('That does not look right', 'Enter the address on its own, for example:\n\nhttps://mfp-questionnaire.netlify.app', ui.ButtonSet.OK);
		return;
	}

	PropertiesService.getScriptProperties().setProperty(PROP_SITE_URL, value);
	ui.alert('Saved', 'New invite links will use:\n\n' + value + '\n\nCodes already sent still work on either address.', ui.ButtonSet.OK);
}

/** Sheet menu ▸ Create invite. Produces the code and the link to send. */
function createInvitePrompt() {
	var ui = SpreadsheetApp.getUi();

	var company = ui.prompt('Create invite', 'Company name:', ui.ButtonSet.OK_CANCEL);
	if (company.getSelectedButton() !== ui.Button.OK || !company.getResponseText().trim()) return;

	var contact = ui.prompt('Create invite', 'Contact name (optional):', ui.ButtonSet.OK_CANCEL);
	if (contact.getSelectedButton() !== ui.Button.OK) return;

	var email = ui.prompt('Create invite', 'Contact email — leave blank to send it yourself:', ui.ButtonSet.OK_CANCEL);
	if (email.getSelectedButton() !== ui.Button.OK) return;

	var companyName = company.getResponseText().trim();
	var contactName = contact.getResponseText().trim();
	var address = email.getResponseText().trim();

	var invite = createInvite(companyName, contactName, address);

	// The email is the point of the whole exercise, but a send failure — quota,
	// a typo in the address — must not lose the code that was just created. So
	// the invite is written first, and the dialog always shows the link.
	var status = { ok: false, message: '' };
	if (address) {
		try {
			sendInviteEmail(invite.code, companyName, contactName, address);
			markInviteSent(invite.code);
			status = { ok: true, message: 'Emailed to ' + address + '. A copy has been sent to you.' };
		} catch (error) {
			status = { ok: false, message: 'Could not email ' + address + ' — ' + error.message + '. Send the message below by hand.' };
		}
	} else {
		status = { ok: false, message: 'No email address given, so nothing was sent. Send the message below by hand.' };
	}

	showInviteDialog(invite.code, companyName, contactName, status);
}

/*
 * The message Tommy pastes into WeChat or an email. Deliberately plain text
 * with no formatting: WeChat strips anything else, and this has to survive
 * being pasted into whatever the client happens to use.
 */
function inviteMessage(code, company, contact) {
	return [
		'Dear ' + (contact || 'Sir or Madam') + ',',
		'',
		'Thank you for your interest in the Flexographic Printing Standardization Program. ' +
			'Before we prepare a proposal for ' +
			company +
			', please complete our short pre-proposal questionnaire:',
		'',
		siteUrl() + '/?c=' + code,
		'',
		'Access code: ' + code,
		'',
		'It takes about 25 minutes. Your answers save as you type, so you can close the page and ' +
			'come back later, on a computer or a phone.',
		'',
		'Please answer only what you know. Blank or approximate answers are useful too — please do ' +
			'not spend time researching anything you do not have to hand.',
		'',
		'Kind regards,',
		'Tommy Chan',
		'Ming Fong Paper Limited, Hong Kong',
		notifyAddress(),
	].join('\n');
}

/*
 * Everything needed to send the invite: the message ready to copy, and the
 * link and code in plain text as a fallback.
 */
function showInviteDialog(code, company, contact, status) {
	var link = siteUrl() + '/?c=' + code;
	var message = inviteMessage(code, company, contact);

	var html = [
		'<style>',
		'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;',
		'color:#0f172a;margin:0;padding:18px 20px;font-size:13px;line-height:1.5}',
		'h2{font-size:15px;margin:0 0 2px}.sub{color:#475569;margin:0 0 14px}',
		'.status{padding:9px 12px;border-radius:7px;margin-bottom:16px;font-size:12.5px}',
		'.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}',
		'.warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}',
		'label{display:block;font-weight:600;margin:0 0 5px;font-size:12px}',
		'textarea{width:100%;box-sizing:border-box;height:210px;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;',
		'border:1px solid #cbd5e1;border-radius:7px;padding:9px;resize:vertical;background:#f8fafc}',
		'button{margin-top:8px;background:#047857;color:#fff;border:0;border-radius:7px;',
		'padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer}',
		'button:hover{background:#065f46}',
		'.copied{color:#047857;font-weight:600;margin-left:10px;font-size:12px}',
		'.facts{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px;color:#475569;font-size:12px}',
		'.facts code{background:#f1f5f9;padding:2px 6px;border-radius:4px;color:#0f172a;font-size:12px}',
		'</style>',

		'<h2>' + escapeHtml(company) + '</h2>',
		'<p class="sub">Invite created' + (contact ? ' for ' + escapeHtml(contact) : '') + '.</p>',
		'<div class="status ' + (status.ok ? 'ok' : 'warn') + '">' + escapeHtml(status.message) + '</div>',

		'<label for="msg">Message — copy into WeChat or email</label>',
		'<textarea id="msg" readonly>' + escapeHtml(message) + '</textarea>',
		'<button id="copy" type="button">Copy message</button>',
		'<span class="copied" id="done"></span>',

		'<div class="facts">',
		'Link <code>' + escapeHtml(link) + '</code><br>',
		'Access code <code>' + escapeHtml(code) + '</code>',
		'</div>',

		'<script>',
		'document.getElementById("copy").addEventListener("click", function () {',
		'  var box = document.getElementById("msg");',
		'  box.focus(); box.select(); box.setSelectionRange(0, box.value.length);',
		'  var done = document.getElementById("done");',
		'  try {',
		'    document.execCommand("copy");',
		'    done.textContent = "Copied";',
		'  } catch (e) {',
		'    done.textContent = "Press Cmd-C or Ctrl-C to copy";',
		'  }',
		'  setTimeout(function () { done.textContent = ""; }, 4000);',
		'});',
		'</script>',
	].join('');

	SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(430), 'Invite created');
}

/* Records that the invite email went out, so the Invites sheet distinguishes
   "created but never sent" from "sent, not opened yet". */
function markInviteSent(code) {
	var invite = findInviteRow(code);
	if (!invite) return;
	invitesSheet().getRange(invite.rowIndex, 6).setValue('sent');
}

function createInvite(company, contact, email) {
	var sheet = invitesSheet();
	var code = newCode();
	sheet.appendRow([code, company, contact || '', email || '', new Date(), 'new', '', '', '']);

	// Create the folder now so drafts have somewhere to live from the first save.
	inviteFolder({ code: code, company: company });
	return { code: code, company: company };
}

function newCode() {
	for (var attempt = 0; attempt < 20; attempt++) {
		var code = 'MFP-' + randomBlock(4) + '-' + randomBlock(4);
		if (!findInviteRow(code)) return code;
	}
	throw new Error('Could not generate an unused code');
}

function randomBlock(length) {
	var out = '';
	for (var i = 0; i < length; i++) out += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
	return out;
}

function randomToken(length) {
	var alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	var out = '';
	for (var i = 0; i < length; i++) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
	return out;
}

/* ---------------------------------------------------------------- self-test */

/**
 * Proves the whole Google side works before a real client sees it: creates an
 * invite, saves a draft, submits, writes the files and sends the real emails.
 * Delete the "Self-Test" folder and the two sheet rows afterwards.
 */
function selfTest() {
	var ui = SpreadsheetApp.getUi();
	var invite = createInvite('Self-Test Company Ltd', 'Test Contact', notifyAddress());

	// Sent first, and allowed to fail loudly, because this is now the email the
	// client actually depends on to get in at all.
	var inviteError = '';
	try {
		sendInviteEmail(invite.code, 'Self-Test Company Ltd', 'Test Contact', notifyAddress());
	} catch (error) {
		inviteError = 'Invite email FAILED: ' + error.message + '\n\n';
	}

	var answers = {
		a_company_name: 'Self-Test Company Ltd',
		a_contact_email: notifyAddress(),
		a_site_country: 'CN',
		a_site_address: '88 Example Road, Hanjiang District, Yangzhou, Jiangsu',
		h3_internal_owner: 'no',
	};
	var flat = [
		{ section: 'A', sectionTitle: 'Company & Contact', id: 'a_company_name', question: 'Company name', answer: 'Self-Test Company Ltd' },
		{ section: 'A', sectionTitle: 'Company & Contact', id: 'a_contact_email', question: 'Email', answer: notifyAddress() },
		{ section: 'A', sectionTitle: 'Company & Contact', id: 'a_site_country', question: 'Country / region of the site', answer: 'China (mainland)' },
		{
			section: 'A',
			sectionTitle: 'Company & Contact',
			id: 'a_site_address',
			question: 'Site address',
			answer: '88 Example Road, Hanjiang District, Yangzhou, Jiangsu',
		},
		{ section: 'A', sectionTitle: 'Company & Contact', id: 'a_contact_phone', question: 'Phone / WeChat', answer: '+86 138 0000 0000' },
		{ section: 'B', sectionTitle: 'Products & Customers', id: 'b4_repeat_share', question: 'B4. Repeat work share', answer: '' },
	];

	saveDraft({ code: invite.code, answers: answers, meta: { revision: 1 } });

	var result = submit({
		code: invite.code,
		submittedAt: new Date().toISOString(),
		schemaVersion: 'A-1.1 (self-test)',
		answers: answers,
		flat: flat,
		markdown: '# Self-test\n\nThis file was produced by selfTest().\n',
		signals: ['This is a self-test signal. If you can read it in the email, the internal notification works.'],
		summary: {
			company: 'Self-Test Company Ltd',
			site: '88 Example Road, Hanjiang District, Yangzhou, Jiangsu, China (mainland)',
			contact: 'Test Contact',
			email: notifyAddress(),
			phone: '+86 138 0000 0000',
			employees: '',
			code: invite.code,
		},
	});

	ui.alert(
		'Self-test complete',
		inviteError +
			(result.ok ? 'Everything worked.' : 'FAILED: ' + result.error) +
			'\n\nCheck:\n' +
			'1. Three emails have arrived at ' +
			notifyAddress() +
			':\n' +
			'   · "Your questionnaire" — the invite, with a working link and code\n' +
			'   · "Questionnaire submitted" — your notification, with the orange internal box\n' +
			'   · "Questionnaire received" — the client confirmation, with NO internal box\n' +
			'2. The Drive folder contains 4 files including a PDF\n' +
			'3. The Submissions and Answers sheets have new rows\n\n' +
			'Open the link in the invite email to confirm it reaches the questionnaire.\n' +
			'Then delete the "Self-Test Company Ltd" folder and its rows.\n\n' +
			(result.folderUrl || ''),
		ui.ButtonSet.OK,
	);
}
