/*
 * Local stand-in for the Apps Script backend.
 *
 * Implements exactly the actions Code.gs implements, backed by JSON files in
 * .local-store/ instead of Google Sheets and Drive. It exists so the entire
 * flow — login, draft, resume, submit, generated files, notification email —
 * can be exercised and reviewed before anyone connects a Google account, and so
 * changes to the form can be tested later without writing to live client data.
 *
 * Only reachable when MFP_MOCK=1. Never loaded in the deployed environment.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* No import of the schema or of report.mjs: like Code.gs, this receives the
   finished Markdown and signals from submit.mjs and only stores them. */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const storeDir = path.join(root, '.local-store');
const invitesFile = path.join(storeDir, 'invites.json');

/* Seed invites so there is always something to log in with. */
const SEED = {
	'MFP-TEST-0001': { company: 'Foshan Example Packaging Co., Ltd', contact: 'Mr Li', email: 'li@example.com', status: 'open' },
	'MFP-TEST-0002': { company: 'Jiangsu Sample Printing Co., Ltd', contact: 'Ms Wang', email: 'wang@example.com', status: 'open' },
};

async function ensureStore() {
	if (!existsSync(storeDir)) await mkdir(storeDir, { recursive: true });
	if (!existsSync(invitesFile)) await writeFile(invitesFile, JSON.stringify(SEED, null, 2));
}

async function readJson(file, fallback) {
	try {
		return JSON.parse(await readFile(file, 'utf8'));
	} catch {
		return fallback;
	}
}

const draftFile = (code) => path.join(storeDir, `draft-${code}.json`);
const submissionDir = (code) => path.join(storeDir, `submission-${code}`);

export async function handleMock(action, payload) {
	await ensureStore();
	const invites = await readJson(invitesFile, SEED);

	switch (action) {
		case 'validateCode': {
			const code = String(payload.code || '').trim().toUpperCase();
			const invite = invites[code];
			if (!invite) throw Object.assign(new Error('That access code was not recognised. Please check it and try again.'), { code: 'BAD_CODE' });
			return { ok: true, invite: { code, ...invite } };
		}

		case 'getInvite': {
			const invite = invites[payload.code];
			if (!invite) throw new Error('Unknown code');
			return { ok: true, invite: { code: payload.code, ...invite } };
		}

		case 'loadDraft': {
			const draft = await readJson(draftFile(payload.code), null);
			return { ok: true, ...(draft || { answers: {}, meta: { revision: 0, updatedAt: null } }) };
		}

		case 'saveDraft': {
			const invite = invites[payload.code];
			if (invite?.status === 'submitted') throw Object.assign(new Error('Already submitted'), { code: 'LOCKED' });
			await writeFile(draftFile(payload.code), JSON.stringify({ answers: payload.answers || {}, meta: payload.meta || {} }, null, 2));
			invites[payload.code] = { ...invite, lastActivity: new Date().toISOString() };
			await writeFile(invitesFile, JSON.stringify(invites, null, 2));
			return { ok: true, revision: payload.meta?.revision ?? 0 };
		}

		case 'submit': {
			const code = payload.code;
			const invite = invites[code];
			if (!invite) throw new Error('Unknown code');
			if (invite.status === 'submitted') throw Object.assign(new Error('Already submitted'), { code: 'LOCKED' });

			const submittedAt = payload.submittedAt || new Date().toISOString();
			const answers = payload.answers || {};
			const signals = payload.signals || [];
			const dir = submissionDir(code);
			await mkdir(dir, { recursive: true });

			// The same artefacts Code.gs writes to Drive, so what is reviewed
			// locally is what the real backend produces.
			await writeFile(
				path.join(dir, 'partA-submission.json'),
				JSON.stringify({ code, company: invite.company, submittedAt, schemaVersion: payload.schemaVersion, answers, signals }, null, 2),
			);
			await writeFile(path.join(dir, 'partA-submission.md'), payload.markdown || '');
			await writeFile(path.join(dir, 'answers-flat.json'), JSON.stringify(payload.flat || [], null, 2));
			await writeFile(path.join(dir, 'notification-email.txt'), buildEmail({ code, summary: payload.summary || {}, invite, signals, submittedAt }));

			invites[code] = { ...invite, status: 'submitted', submittedAt };
			await writeFile(invitesFile, JSON.stringify(invites, null, 2));

			return { ok: true, submittedAt };
		}

		case 'listInvites': {
			return { ok: true, invites, files: existsSync(storeDir) ? await readdir(storeDir) : [] };
		}

		default:
			throw new Error(`Unknown action: ${action}`);
	}
}

/* Written to a file rather than sent. Mirrors Code.gs's notification exactly,
   including the internal signals block, which must never reach the customer. */
function buildEmail({ code, summary, invite, signals, submittedAt }) {
	return [
		`To: tommy.chan@mingfongpaper.com`,
		`Subject: Questionnaire submitted — ${summary.company || invite.company}`,
		'',
		`Company:  ${summary.company || invite.company}`,
		`Site:     ${summary.site || '—'}`,
		`Contact:  ${summary.contact || '—'}`,
		`Email:    ${summary.email || '—'}`,
		`Phone:    ${summary.phone || '—'}`,
		`Code:     ${code}`,
		`Received: ${submittedAt}`,
		'',
		'--- INTERNAL — DO NOT FORWARD TO CLIENT ---',
		signals.length ? signals.map((s, i) => `${i + 1}. ${s}`).join('\n\n') : 'No automatic signals triggered.',
	].join('\n');
}
