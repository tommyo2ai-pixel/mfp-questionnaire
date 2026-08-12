/*
 * GET  /api/draft   load the saved draft for this session
 * PUT  /api/draft   save the draft
 * POST /api/draft   same as PUT — navigator.sendBeacon can only POST, and the
 *                   beacon fired when a phone backgrounds the tab is often the
 *                   last chance to save someone's work
 */

import { callGas } from './_lib/gas.mjs';
import { requireSession, json } from './_lib/session.mjs';

export const config = { path: '/api/draft' };

// Roughly ten times a fully completed questionnaire. Large enough never to be
// hit by a real answer, small enough that the endpoint cannot be used as
// storage for something else.
const MAX_BODY_BYTES = 512 * 1024;

export default async (request) => {
	let session;
	try {
		session = await requireSession(request);
	} catch {
		return json({ error: 'Server is not configured' }, { status: 500 });
	}
	if (!session) return json({ error: 'No session' }, { status: 401 });

	if (request.method === 'GET') {
		try {
			const result = await callGas('loadDraft', { code: session.code });
			return json({ answers: result.answers || {}, meta: result.meta || { revision: 0 } });
		} catch (error) {
			return json({ error: error.message }, { status: 502 });
		}
	}

	if (request.method !== 'PUT' && request.method !== 'POST') {
		return json({ error: 'Method not allowed' }, { status: 405 });
	}

	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) return json({ error: 'Draft is too large' }, { status: 413 });

	let body;
	try {
		body = JSON.parse(raw);
	} catch {
		return json({ error: 'Invalid request' }, { status: 400 });
	}
	if (!body.answers || typeof body.answers !== 'object') {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	try {
		const result = await callGas('saveDraft', {
			code: session.code,
			company: session.company,
			answers: body.answers,
			meta: body.meta || {},
		});
		return json({ ok: true, revision: result.revision });
	} catch (error) {
		if (error.code === 'LOCKED') return json({ error: 'This questionnaire has already been submitted.' }, { status: 409 });
		// 502 rather than 500: the client retries on failure and the customer's
		// answers are already safe in localStorage, so this is not urgent.
		return json({ error: error.message }, { status: 502 });
	}
};
