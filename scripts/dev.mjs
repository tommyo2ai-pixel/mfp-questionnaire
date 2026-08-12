#!/usr/bin/env node
/*
 * Local development server.
 *
 *   node scripts/dev.mjs        → http://localhost:4330
 *   PORT=5000 node scripts/dev.mjs
 *
 * Serves public/ and routes /api/* to the real function modules — the same
 * files Netlify deploys, called with real Request objects and returning real
 * Responses. Nothing is stubbed except Google itself, which is replaced by
 * _lib/mock-store.mjs writing to .local-store/.
 *
 * So what you exercise here is what runs in production, and none of it needs a
 * Google account, a Netlify account or an internet connection.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
// 4330 rather than the usual 4321, which the mfp-website Astro dev server uses.
const PORT = Number(process.env.PORT || 4330);

// Defaults that make the mock backend the only reachable backend locally.
process.env.MFP_MOCK ??= '1';
process.env.SESSION_SECRET ??= 'dev-only-secret-never-use-in-production';

const { default: sessionFn } = await import('../netlify/functions/session.mjs');
const { default: draftFn } = await import('../netlify/functions/draft.mjs');
const { default: submitFn } = await import('../netlify/functions/submit.mjs');

const routes = {
	'/api/session': sessionFn,
	'/api/draft': draftFn,
	'/api/submit': submitFn,
};

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`);

	const handler = routes[url.pathname];
	if (handler) return handleApi(handler, req, res, url);

	// Static files, with a hard stop on anything trying to climb out of public/.
	let filePath = path.join(publicDir, decodeURIComponent(url.pathname));
	if (!filePath.startsWith(publicDir)) {
		res.writeHead(403).end('Forbidden');
		return;
	}

	try {
		if ((await stat(filePath)).isDirectory()) filePath = path.join(filePath, 'index.html');
	} catch {
		filePath = path.join(publicDir, 'index.html'); // single-page fallback
	}

	try {
		const body = await readFile(filePath);
		res.writeHead(200, {
			'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
			'Cache-Control': 'no-store',
		});
		res.end(body);
	} catch {
		res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
	}
});

async function handleApi(handler, req, res, url) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);

	const request = new Request(url.toString(), {
		method: req.method,
		headers: req.headers,
		body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
	});

	try {
		const response = await handler(request, {});
		const headers = {};
		for (const [key, value] of response.headers) headers[key] = value;
		res.writeHead(response.status, headers);
		res.end(Buffer.from(await response.arrayBuffer()));
		console.log(`${req.method} ${url.pathname} → ${response.status}`);
	} catch (error) {
		console.error(`${req.method} ${url.pathname} → 500`, error);
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: error.message }));
	}
}

server.listen(PORT, () => {
	console.log(`\n  Ming Fong questionnaire — local development\n`);
	console.log(`  http://localhost:${PORT}\n`);
	console.log(`  Mock backend: .local-store/`);
	console.log(`  Seeded access codes:`);
	console.log(`    MFP-TEST-0001   Foshan Example Packaging Co., Ltd`);
	console.log(`    MFP-TEST-0002   Jiangsu Sample Printing Co., Ltd\n`);
	console.log(`  Reset everything:  rm -rf .local-store\n`);
});
