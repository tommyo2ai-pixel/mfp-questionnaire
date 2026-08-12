/*
 * POST /api/session   exchange an access code for a session
 * GET  /api/session   report the current session, if any
 *
 * The access code is the only credential. It is issued by Tommy per company and
 * sent by email or WeChat, which is deliberate: a code travels over whatever
 * channel already works, where a magic-link email from Gmail to a mainland
 * corporate mailbox frequently does not arrive at all.
 */

import { callGas } from './_lib/gas.mjs';
import { signSession, verifySession, readCookie, buildCookie, json, SESSION_MAX_AGE_SECONDS } from './_lib/session.mjs';

export const config = { path: '/api/session' };

export default async (request) => {
	const secret = process.env.SESSION_SECRET;
	if (!secret) return json({ error: 'Server is not configured' }, { status: 500 });

	const secure = (request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')) === 'https';

	if (request.method === 'GET') {
		const payload = await verifySession(readCookie(request), secret);
		if (!payload) return json({ error: 'No session' }, { status: 401 });

		// Ask the backend for the current status rather than trusting the cookie:
		// a questionnaire submitted from another device must show as submitted
		// here too, not offer an editable form.
		try {
			const { invite } = await callGas('getInvite', { code: payload.code });
			return json({ code: invite.code, company: invite.company, status: invite.status, submittedAt: invite.submittedAt || null });
		} catch {
			return json({ code: payload.code, company: payload.company, status: 'open' });
		}
	}

	if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	// Accept what people actually type: lower case, spaces, missing hyphens.
	const code = String(body.code || '')
		.toUpperCase()
		.replace(/[^A-Z0-9-]/g, '');
	if (!code) return json({ error: 'Please enter your access code.' }, { status: 400 });

	let invite;
	try {
		({ invite } = await callGas('validateCode', { code }));
	} catch (error) {
		// A deliberate pause on failure. Codes carry about 40 bits of entropy, so
		// this is belt and braces alongside the attempt limit in the backend.
		await new Promise((resolve) => setTimeout(resolve, 600));
		const message = error.code === 'BAD_CODE' || !error.code ? 'That access code was not recognised. Please check it and try again.' : error.message;
		return json({ error: message }, { status: 401 });
	}

	const token = await signSession(
		{
			code: invite.code,
			company: invite.company,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
		},
		secret,
	);

	return json(
		{ code: invite.code, company: invite.company, status: invite.status || 'open', submittedAt: invite.submittedAt || null },
		{ headers: { 'Set-Cookie': buildCookie(token, { secure }) } },
	);
};
