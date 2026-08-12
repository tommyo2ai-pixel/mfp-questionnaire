/*
 * The only place that talks to Google.
 *
 * This call happens server-side, from Netlify's edge. That is the whole point:
 * script.google.com is blocked in mainland China, where most of the people
 * filling in this questionnaire are sitting, so the browser must never contact
 * Google directly. Their browser talks to questionnaire.mingfongpaper.com and
 * nothing else.
 *
 * Every request carries a shared secret. The Apps Script web app has to be
 * deployed as "anyone can access" for this to work at all — otherwise it would
 * demand a Google login the customer cannot complete — so that secret is what
 * actually protects it.
 */

const TIMEOUT_MS = 20000;

export async function callGas(action, payload = {}) {
	// The mock backend keeps the whole flow testable before any Google account
	// is involved. It is only ever reachable when MFP_MOCK is explicitly set,
	// which never happens in the deployed environment.
	if (process.env.MFP_MOCK === '1') {
		const { handleMock } = await import('./mock-store.mjs');
		return handleMock(action, payload);
	}

	const url = process.env.GAS_URL;
	const secret = process.env.GAS_SECRET;
	if (!url || !secret) throw new Error('GAS_URL and GAS_SECRET must be set');

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			method: 'POST',
			// Apps Script only exposes e.postData reliably for text/plain, and a
			// simple content type also avoids a CORS preflight it cannot answer.
			headers: { 'Content-Type': 'text/plain;charset=utf-8' },
			body: JSON.stringify({ action, secret, ...payload }),
			signal: controller.signal,
			redirect: 'follow', // Apps Script 302s to script.googleusercontent.com
		});

		const text = await response.text();
		let body;
		try {
			body = JSON.parse(text);
		} catch {
			// An HTML body here almost always means the web app was deployed with
			// the wrong access setting and Google served a sign-in page.
			throw new Error('Backend returned an unexpected response. Check the Apps Script deployment access setting.');
		}

		if (!response.ok || body.ok === false) {
			throw Object.assign(new Error(body.error || 'Backend rejected the request'), { code: body.code });
		}
		return body;
	} catch (error) {
		if (error.name === 'AbortError') throw new Error('The backend did not respond in time');
		throw error;
	} finally {
		clearTimeout(timer);
	}
}
