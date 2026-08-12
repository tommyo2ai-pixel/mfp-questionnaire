/*
 * Session cookies, signed with HMAC-SHA256.
 *
 * There is no password and no account. The access code is the credential; once
 * it has been checked against the invite list, this cookie carries the customer
 * for thirty days so they can come back and finish. The cookie is signed rather
 * than encrypted — its contents (code, company, expiry) are not secret, but
 * they must not be forgeable.
 *
 * Web Crypto only, so this runs on Netlify's runtime and in plain Node with no
 * dependency to install or keep patched.
 */

const COOKIE_NAME = 'mfp_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const encoder = new TextEncoder();

function base64urlEncode(bytes) {
	const binary = String.fromCharCode(...new Uint8Array(bytes));
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64urlDecode(text) {
	const padded = text.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
	const binary = atob(padded);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmacKey(secret) {
	return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(payload, secret) {
	const body = base64urlEncode(encoder.encode(JSON.stringify(payload)));
	const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
	return `${body}.${base64urlEncode(signature)}`;
}

export async function verifySession(token, secret) {
	if (!token || !token.includes('.')) return null;
	const [body, signature] = token.split('.');

	let valid;
	try {
		// subtle.verify is a constant-time comparison, which a string === on the
		// signature would not be.
		valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), base64urlDecode(signature), encoder.encode(body));
	} catch {
		return null;
	}
	if (!valid) return null;

	try {
		const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
		if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
		return payload;
	} catch {
		return null;
	}
}

export function readCookie(request, name = COOKIE_NAME) {
	const header = request.headers.get('cookie') || '';
	for (const part of header.split(';')) {
		const [key, ...rest] = part.trim().split('=');
		if (key === name) return decodeURIComponent(rest.join('='));
	}
	return null;
}

export function buildCookie(token, { secure = true } = {}) {
	// HttpOnly keeps it away from any script on the page; SameSite=Lax is enough
	// because every state-changing call is a same-origin fetch.
	return [
		`${COOKIE_NAME}=${encodeURIComponent(token)}`,
		'Path=/',
		'HttpOnly',
		'SameSite=Lax',
		`Max-Age=${MAX_AGE_SECONDS}`,
		secure ? 'Secure' : null,
	]
		.filter(Boolean)
		.join('; ');
}

/** Resolve the caller's session, or null. Every protected route starts here. */
export async function requireSession(request) {
	const secret = process.env.SESSION_SECRET;
	if (!secret) throw new Error('SESSION_SECRET is not set');
	return verifySession(readCookie(request), secret);
}

export function json(body, init = {}) {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			'Content-Type': 'application/json',
			// Draft answers must never sit in a shared cache.
			'Cache-Control': 'no-store',
			...(init.headers || {}),
		},
	});
}

export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
