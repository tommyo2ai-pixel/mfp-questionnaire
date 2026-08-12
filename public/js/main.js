/*
 * Application shell: login → questionnaire → review → receipt.
 *
 * One section is shown at a time on every screen size. Ten sections at once is
 * what makes the paper version feel like a 25-minute job people put off; one at
 * a time with a visible position and a running count of what is answered is
 * what makes it a job they finish.
 */

import { partA, SCHEMA_VERSION } from './schema.partA.js';
import { partBPreview } from './schema.partB.js';
import { createStore, isEmpty } from './state.js';
import { createSync } from './sync.js';
import { renderSection, applyVisibility, countProgress, sectionProgress } from './render.js';
import { flatten } from './format.js';

const app = document.getElementById('app');
const savePill = document.getElementById('save-pill');
const brandSub = document.getElementById('brand-sub');

let session = null;
let store = null;
let sync = null;
let step = 0; // 0..sections.length-1 are sections; sections.length is Review

const steps = () => [...partA.sections.map((s) => ({ kind: 'section', section: s })), { kind: 'review' }];

/* -------------------------------------------------------------------- api */

async function api(path, options = {}) {
	const response = await fetch(path, {
		headers: { 'Content-Type': 'application/json' },
		...options,
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok) throw Object.assign(new Error(body.error || `Request failed (${response.status})`), { status: response.status, body });
	return body;
}

/* ------------------------------------------------------------------ login */

function showLogin({ code = '', error = '' } = {}) {
	savePill.hidden = true;
	app.textContent = '';

	const box = document.createElement('div');
	box.className = 'login';
	box.innerHTML = `
		<h1>Pre-Proposal Questionnaire</h1>
		<p class="login-intro">
			Flexographic Printing Standardization Program. Enter the access code from your
			invitation to begin, or to continue a questionnaire you have already started.
		</p>
		<form novalidate>
			<label class="visually-hidden" for="code">Access code</label>
			<input class="input" id="code" name="code" type="text" autocomplete="one-time-code"
				spellcheck="false" placeholder="MFP-XXXX-XXXX" required />
			<button class="button button-primary" type="submit">Continue</button>
		</form>
		<p class="login-help">
			No code, or it is not working? Email
			<a href="mailto:tommy.chan@mingfongpaper.com">tommy.chan@mingfongpaper.com</a>
			and we will send you a new one.
		</p>
	`;

	if (error) {
		const note = document.createElement('div');
		note.className = 'note note-error';
		note.style.marginTop = '1rem';
		note.textContent = error;
		box.querySelector('form').after(note);
	}

	const form = box.querySelector('form');
	const input = box.querySelector('#code');
	const button = box.querySelector('button');
	input.value = code;

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const value = input.value.trim().toUpperCase();
		if (!value) return input.focus();

		button.disabled = true;
		button.textContent = 'Checking…';
		try {
			const result = await api('/api/session', { method: 'POST', body: JSON.stringify({ code: value }) });
			await start(result);
		} catch (err) {
			showLogin({ code: value, error: err.message || 'That code was not recognised.' });
			document.getElementById('code')?.focus();
		}
	});

	app.appendChild(box);
	input.focus();
}

/* ------------------------------------------------------------------- boot */

async function start(newSession) {
	session = newSession;
	brandSub.textContent = session.company || 'Pre-Proposal Questionnaire';

	if (session.status === 'submitted') {
		store = createStore(session.code);
		store.loadLocal();
		try {
			const draft = await api('/api/draft');
			store.mergeRemote(draft);
		} catch {
			/* the local copy is enough to render the receipt */
		}
		return showReceipt({ submittedAt: session.submittedAt });
	}

	store = createStore(session.code);
	store.loadLocal();

	// The server copy wins only if it is genuinely newer — see mergeRemote.
	try {
		const draft = await api('/api/draft');
		store.mergeRemote(draft);
	} catch {
		/* offline start: carry on with whatever this device has */
	}

	sync = createSync({
		store,
		onStatus: (state, text) => {
			savePill.dataset.state = state;
			savePill.textContent = text;
		},
	});
	savePill.hidden = false;
	savePill.textContent = 'All answers saved';

	window.addEventListener('mfp:session-expired', () => {
		sync?.stop();
		showLogin({ code: session.code, error: 'Your session timed out. Enter your code again — nothing has been lost.' });
	});

	step = 0;
	renderApp();
}

/* ------------------------------------------------------------------ shell */

function renderApp() {
	app.textContent = '';

	const layout = document.createElement('div');
	layout.className = 'layout';
	layout.appendChild(buildNav());

	const column = document.createElement('div');
	column.appendChild(buildStepper());

	const current = steps()[step];
	if (current.kind === 'review') {
		column.appendChild(buildReview());
	} else {
		if (step === 0) column.appendChild(buildPreamble());
		column.appendChild(
			renderSection(current.section, store, {
				onChange: () => refreshProgress(),
			}),
		);
		column.appendChild(buildPager());
	}

	layout.appendChild(column);
	app.appendChild(layout);
	refreshProgress();
	window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function buildPreamble() {
	const box = document.createElement('div');
	box.className = 'preamble';
	const heading = document.createElement('h1');
	heading.textContent = partA.title;
	box.appendChild(heading);
	for (const text of partA.preamble) {
		const p = document.createElement('p');
		p.textContent = text;
		box.appendChild(p);
	}
	return box;
}

function buildNav() {
	const nav = document.createElement('nav');
	nav.className = 'nav';
	nav.setAttribute('aria-label', 'Questionnaire sections');

	const title = document.createElement('p');
	title.className = 'nav-title';
	title.textContent = 'Sections';
	nav.appendChild(title);

	const list = document.createElement('ul');
	list.className = 'nav-list';

	steps().forEach((entry, index) => {
		const item = document.createElement('li');
		item.className = 'nav-item';

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'nav-link';
		button.setAttribute('aria-current', String(index === step));

		if (entry.kind === 'review') {
			button.innerHTML = `<span class="nav-key">✓</span><span>Review &amp; submit</span>`;
		} else {
			const { answered, total } = sectionProgress(entry.section, store);
			if (answered === total) item.classList.add('is-complete');
			button.innerHTML = `<span class="nav-key">${entry.section.id}</span><span>${entry.section.title}</span><span class="nav-count">${answered}/${total}</span>`;
		}

		button.addEventListener('click', () => goTo(index));
		item.appendChild(button);
		list.appendChild(item);
	});

	nav.appendChild(list);
	return nav;
}

function buildStepper() {
	const wrap = document.createElement('div');
	wrap.className = 'stepper';

	const row = document.createElement('div');
	row.className = 'stepper-row';

	const select = document.createElement('select');
	select.setAttribute('aria-label', 'Jump to section');
	steps().forEach((entry, index) => {
		const option = document.createElement('option');
		option.value = String(index);
		option.textContent = entry.kind === 'review' ? 'Review & submit' : `${entry.section.id}. ${entry.section.title}`;
		option.selected = index === step;
		select.appendChild(option);
	});
	select.addEventListener('change', () => goTo(Number(select.value)));

	row.appendChild(select);
	wrap.appendChild(row);

	const progress = document.createElement('div');
	progress.className = 'progress';
	progress.innerHTML = '<div class="progress-bar" id="progress-bar"></div>';
	wrap.appendChild(progress);

	const text = document.createElement('p');
	text.className = 'progress-text';
	text.id = 'progress-text';
	wrap.appendChild(text);

	return wrap;
}

function buildPager() {
	const pager = document.createElement('div');
	pager.className = 'pager';
	const total = steps().length;

	if (step > 0) {
		const back = document.createElement('button');
		back.type = 'button';
		back.className = 'button button-secondary';
		back.textContent = 'Back';
		back.addEventListener('click', () => goTo(step - 1));
		pager.appendChild(back);
	}

	const next = document.createElement('button');
	next.type = 'button';
	next.className = 'button button-primary button-next';
	next.textContent = step === total - 2 ? 'Review answers' : 'Next section';
	next.addEventListener('click', () => goTo(step + 1));
	pager.appendChild(next);

	return pager;
}

function goTo(index) {
	const total = steps().length;
	step = Math.max(0, Math.min(index, total - 1));
	renderApp();
}

function refreshProgress() {
	const { answered, total } = countProgress(partA, store);
	const bar = document.getElementById('progress-bar');
	const text = document.getElementById('progress-text');
	if (bar) bar.style.width = `${total ? (answered / total) * 100 : 0}%`;
	if (text) {
		const current = steps()[step];
		const where = current.kind === 'review' ? 'Review' : `Section ${step + 1} of ${partA.sections.length}`;
		text.textContent = `${where} · ${answered} of ${total} questions answered`;
	}

	// The desktop rail carries per-section counts, so it has to follow along.
	for (const [index, item] of [...document.querySelectorAll('.nav-item')].entries()) {
		const entry = steps()[index];
		if (!entry || entry.kind === 'review') continue;
		const { answered: a, total: t } = sectionProgress(entry.section, store);
		item.classList.toggle('is-complete', a === t);
		const count = item.querySelector('.nav-count');
		if (count) count.textContent = `${a}/${t}`;
	}
}

/* ----------------------------------------------------------------- review */

function buildReview() {
	const section = document.createElement('section');
	section.className = 'section';

	const rows = flatten(partA, store.getAll());
	const blanks = rows.filter((r) => !r.answer).length;

	const head = document.createElement('header');
	head.className = 'section-head';
	head.innerHTML = `
		<p class="section-eyebrow">Final step</p>
		<h2 class="section-title">Review &amp; submit</h2>
		<p class="section-intro">${escapeHtml(partA.closing)}</p>
	`;
	section.appendChild(head);

	const missing = requiredMissing();
	if (missing.length) {
		const note = document.createElement('div');
		note.className = 'note note-error';
		note.innerHTML = `We need ${missing.map((f) => `<strong>${escapeHtml(f.label)}</strong>`).join(' and ')} before you can submit — that is how we reply to you. Everything else is optional.`;
		section.appendChild(note);

		const jump = document.createElement('button');
		jump.type = 'button';
		jump.className = 'button button-secondary';
		jump.style.marginTop = '0.75rem';
		jump.textContent = 'Go to Section A';
		jump.addEventListener('click', () => {
			goTo(0);
			const target = document.getElementById(`f-${missing[0].id}`);
			target?.focus();
			target?.closest('.field')?.classList.add('is-missing');
		});
		section.appendChild(jump);
	} else if (blanks > 0) {
		const note = document.createElement('div');
		note.className = 'note note-info';
		note.textContent = `You have left ${blanks} question${blanks === 1 ? '' : 's'} blank. That is completely fine — blanks tell us what is not currently tracked, which is useful in itself. Submit whenever you are ready.`;
		section.appendChild(note);
	}

	const list = document.createElement('ul');
	list.className = 'review-list';
	let currentSection = null;
	for (const row of rows) {
		if (row.section !== currentSection) {
			currentSection = row.section;
			const heading = document.createElement('li');
			heading.style.padding = '1.25rem 0 0.35rem';
			heading.innerHTML = `<p class="section-eyebrow">${escapeHtml(row.section)}. ${escapeHtml(row.sectionTitle)}</p>`;
			list.appendChild(heading);
		}
		const item = document.createElement('li');
		item.className = 'review-item';
		const q = document.createElement('div');
		q.className = 'review-q';
		q.textContent = row.question;
		const a = document.createElement('div');
		a.className = row.answer ? 'review-a' : 'review-a is-blank';
		a.textContent = row.answer || 'Not answered';
		item.append(q, a);
		list.appendChild(item);
	}
	section.appendChild(list);

	section.appendChild(buildPartBPreview());

	const actions = document.createElement('div');
	actions.className = 'pager';

	const back = document.createElement('button');
	back.type = 'button';
	back.className = 'button button-secondary';
	back.textContent = 'Back';
	back.addEventListener('click', () => goTo(step - 1));
	actions.appendChild(back);

	const submit = document.createElement('button');
	submit.type = 'button';
	submit.className = 'button button-primary button-next';
	submit.textContent = 'Submit questionnaire';
	submit.disabled = missing.length > 0;
	submit.addEventListener('click', () => doSubmit(submit, blanks));
	actions.appendChild(submit);

	section.appendChild(actions);

	const status = document.createElement('div');
	status.id = 'submit-status';
	status.style.marginTop = '1rem';
	section.appendChild(status);

	return section;
}

function requiredMissing() {
	const out = [];
	for (const section of partA.sections) {
		for (const field of section.fields) {
			if (!field.required) continue;
			if (isEmpty(store.get(field.id))) out.push(field);
		}
	}
	return out;
}

/* ----------------------------------------------------------------- submit */

async function doSubmit(button, blanks) {
	const status = document.getElementById('submit-status');
	status.textContent = '';

	if (blanks > 0) {
		const ok = window.confirm(
			`You have left ${blanks} question${blanks === 1 ? '' : 's'} blank.\n\n` +
				'That is fine — blank answers are useful and tell us what is not currently tracked. ' +
				'You will not be able to edit the questionnaire after submitting.\n\nSubmit now?',
		);
		if (!ok) return;
	}

	button.disabled = true;
	button.textContent = 'Submitting…';

	try {
		// Get the latest draft to the server first, so a failure here still
		// leaves a complete draft behind rather than a stale one.
		await sync.flush();

		const result = await api('/api/submit', {
			method: 'POST',
			body: JSON.stringify({
				answers: store.getAll(),
				flat: flatten(partA, store.getAll()),
				schemaVersion: SCHEMA_VERSION,
			}),
		});

		sync.stop();
		showReceipt({ submittedAt: result.submittedAt });
	} catch (err) {
		button.disabled = false;
		button.textContent = 'Submit questionnaire';
		const note = document.createElement('div');
		note.className = 'note note-error';
		note.textContent =
			err.status === 409
				? 'This questionnaire has already been submitted. Please contact us if you need to change an answer.'
				: `We could not submit just now: ${err.message}. Your answers are saved — please try again in a moment.`;
		status.appendChild(note);
	}
}

/* ---------------------------------------------------------------- receipt */

function showReceipt({ submittedAt }) {
	savePill.hidden = true;
	app.textContent = '';

	const section = document.createElement('section');
	section.className = 'section';
	section.style.maxWidth = '48rem';
	section.style.margin = '2rem auto';

	const when = submittedAt ? new Date(submittedAt).toLocaleString() : '';
	section.innerHTML = `
		<div class="receipt-mark" aria-hidden="true">✓</div>
		<h2 class="section-title">Thank you — your questionnaire has been received</h2>
		<p class="section-intro">
			${escapeHtml(partA.closing)}
		</p>
		<div class="note note-info note-spaced">
			We will review your answers and be in touch at
			<strong>${escapeHtml(store?.get('a_contact_email') || 'the address you provided')}</strong>.
			${when ? `Submitted ${escapeHtml(when)}.` : ''}
		</div>
	`;

	const optional = [].concat(store?.get('opt_documents') ?? []);
	if (optional.length) {
		const note = document.createElement('div');
		note.className = 'note note-info';
		note.style.marginTop = '1rem';
		const labels = partA.sections
			.flatMap((s) => s.fields)
			.find((f) => f.id === 'opt_documents')
			.options.filter((o) => optional.includes(o.value))
			.map((o) => o.label);
		note.innerHTML = `You indicated these documents already exist: <strong>${labels.map(escapeHtml).join(', ')}</strong>. Please email them to <a href="mailto:tommy.chan@mingfongpaper.com">tommy.chan@mingfongpaper.com</a> when convenient — there is no need to create anything new.`;
		section.appendChild(note);
	}

	const answers = store?.getAll() || {};
	const rows = flatten(partA, answers);
	const list = document.createElement('ul');
	list.className = 'review-list';
	let currentSection = null;
	for (const row of rows) {
		if (!row.answer) continue;
		if (row.section !== currentSection) {
			currentSection = row.section;
			const heading = document.createElement('li');
			heading.style.padding = '1.25rem 0 0.35rem';
			heading.innerHTML = `<p class="section-eyebrow">${escapeHtml(row.section)}. ${escapeHtml(row.sectionTitle)}</p>`;
			list.appendChild(heading);
		}
		const item = document.createElement('li');
		item.className = 'review-item';
		const q = document.createElement('div');
		q.className = 'review-q';
		q.textContent = row.question;
		const a = document.createElement('div');
		a.className = 'review-a';
		a.textContent = row.answer;
		item.append(q, a);
		list.appendChild(item);
	}

	const heading = document.createElement('h3');
	heading.style.marginTop = '2rem';
	heading.style.fontFamily = 'var(--font-display)';
	heading.textContent = 'Your answers';
	section.append(heading, list);

	const print = document.createElement('button');
	print.type = 'button';
	print.className = 'button button-secondary';
	print.style.marginTop = '1.5rem';
	print.textContent = 'Print or save a copy';
	print.addEventListener('click', () => window.print());
	section.appendChild(print);

	app.appendChild(section);
}

/* --------------------------------------------------------- part B preview */

function buildPartBPreview() {
	const details = document.createElement('details');
	details.className = 'partb';

	const summary = document.createElement('summary');
	summary.textContent = `${partBPreview.title} — nothing to do now`;
	details.appendChild(summary);

	const body = document.createElement('div');
	body.className = 'partb-body';

	const intro = document.createElement('p');
	intro.className = 'section-intro';
	intro.style.marginBottom = '1.5rem';
	intro.textContent = partBPreview.intro;
	body.appendChild(intro);

	for (const group of partBPreview.sections) {
		const block = document.createElement('div');
		block.className = 'partb-section';
		const heading = document.createElement('h3');
		heading.textContent = `${group.id}. ${group.title}`;
		block.appendChild(heading);
		if (group.note) {
			const note = document.createElement('div');
			note.className = 'note note-warn';
			note.style.margin = '0.5rem 0 0.75rem';
			note.textContent = group.note;
			block.appendChild(note);
		}
		const list = document.createElement('ul');
		for (const point of group.items) {
			const li = document.createElement('li');
			li.textContent = point;
			list.appendChild(li);
		}
		block.appendChild(list);
		body.appendChild(block);
	}

	details.appendChild(body);
	return details;
}

/* ------------------------------------------------------------------ utils */

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ------------------------------------------------------------------- init */

(async function init() {
	const params = new URLSearchParams(location.search);
	const codeFromLink = (params.get('c') || '').trim().toUpperCase();

	// Keep the code out of the address bar and out of the browser history, so a
	// shared screenshot or a shoulder-surfed URL does not hand over the session.
	if (codeFromLink) history.replaceState(null, '', location.pathname);

	try {
		const existing = await api('/api/session');
		// An invite link always wins over whatever session this browser happens to
		// be carrying. Otherwise a reissued code, or a second company using the
		// same shared office computer, would silently open the wrong
		// questionnaire — and the two would look identical on screen.
		if (existing?.code && (!codeFromLink || existing.code === codeFromLink)) return start(existing);
	} catch {
		/* no session yet — fall through to the code in the link, or the code screen */
	}

	if (codeFromLink) {
		try {
			return start(await api('/api/session', { method: 'POST', body: JSON.stringify({ code: codeFromLink }) }));
		} catch (err) {
			return showLogin({ code: codeFromLink, error: err.message || 'That code was not recognised.' });
		}
	}

	showLogin();
})();
