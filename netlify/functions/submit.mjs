/*
 * POST /api/submit — finalise the questionnaire.
 *
 * The backend does the work that matters: writes the JSON, Markdown and PDF to
 * the client's Drive folder, appends the spreadsheet rows, emails Tommy, and
 * locks the code so the answers cannot change afterwards.
 *
 * The client sends both the raw answers and the flattened question/answer
 * pairs. That is on purpose — the flattened list carries the exact labels the
 * customer saw, so a later rewording of the schema can never silently change
 * what an old submission appears to say.
 */

import { callGas } from './_lib/gas.mjs';
import { requireSession, json } from './_lib/session.mjs';
import { markdownFromFlat, deriveSignals, buildSummary } from './_lib/report.mjs';

export const config = { path: '/api/submit' };

const MAX_BODY_BYTES = 1024 * 1024;

export default async (request) => {
	if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

	let session;
	try {
		session = await requireSession(request);
	} catch {
		return json({ error: 'Server is not configured' }, { status: 500 });
	}
	if (!session) return json({ error: 'No session' }, { status: 401 });

	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) return json({ error: 'Submission is too large' }, { status: 413 });

	let body;
	try {
		body = JSON.parse(raw);
	} catch {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const answers = body.answers;
	if (!answers || typeof answers !== 'object') return json({ error: 'Invalid request' }, { status: 400 });

	// The only two answers the form insists on, re-checked here because the
	// client-side check is a courtesy, not a control.
	if (!String(answers.a_company_name || '').trim() || !String(answers.a_contact_email || '').trim()) {
		return json({ error: 'Company name and contact email are required.' }, { status: 400 });
	}

	const flat = Array.isArray(body.flat) ? body.flat : [];
	const submittedAt = new Date().toISOString();
	const meta = {
		code: session.code,
		company: session.company,
		submittedAt,
		schemaVersion: body.schemaVersion || null,
		// Which language the form was read in. The answers themselves are always
		// English — this only tells Tommy which language to reply in.
		lang: typeof body.lang === 'string' ? body.lang.slice(0, 16) : null,
	};

	try {
		// The report and the internal signals are built here, on the server, and
		// handed to Apps Script finished. That keeps one implementation of each,
		// and keeps the signals out of anything the customer could read.
		const result = await callGas('submit', {
			...meta,
			answers,
			flat,
			markdown: markdownFromFlat(flat, { ...meta, answers }),
			signals: deriveSignals(answers, flat),
			summary: buildSummary(answers, meta, flat),
		});
		return json({ ok: true, submittedAt: result.submittedAt || submittedAt });
	} catch (error) {
		if (error.code === 'LOCKED') {
			return json({ error: 'This questionnaire has already been submitted.' }, { status: 409 });
		}
		return json({ error: error.message }, { status: 502 });
	}
};
