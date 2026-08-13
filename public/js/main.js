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
import {
	LANGS,
	getLang,
	setLang,
	applyDocumentLang,
	t,
	syncStatusText,
	fieldText,
	optionLabel,
	sectionText,
	schemaText,
	partBText,
	partBSection,
} from './i18n.js';

const app = document.getElementById('app');
const savePill = document.getElementById('save-pill');
const brandSub = document.getElementById('brand-sub');

let session = null;
let store = null;
let sync = null;
let step = 0; // 0..sections.length-1 are sections; sections.length is Review

/*
 * Whichever screen is currently on show, so a language change can redraw it.
 * Every screen sets this as it renders. Re-rendering is safe at any moment:
 * answers live in the store, never in the DOM, so nothing typed can be lost by
 * a redraw — which is exactly why switching language mid-question is allowed.
 */
let lastScreen = () => {};

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
	lastScreen = () => showLogin({ code: document.getElementById('code')?.value ?? code, error });

	const box = document.createElement('div');
	box.className = 'login';
	box.innerHTML = `
		<h1>${escapeHtml(t('loginTitle'))}</h1>
		<p class="login-intro">${escapeHtml(t('loginIntro'))}</p>
		<form novalidate>
			<label class="visually-hidden" for="code">${escapeHtml(t('loginCodeLabel'))}</label>
			<input class="input" id="code" name="code" type="text" autocomplete="one-time-code"
				spellcheck="false" placeholder="MFP-XXXX-XXXX" required />
			<button class="button button-primary" type="submit">${escapeHtml(t('loginSubmit'))}</button>
		</form>
		<p class="login-help">
			${escapeHtml(t('loginHelpBefore'))}<a href="mailto:tommy.chan@mingfongpaper.com">tommy.chan@mingfongpaper.com</a>${escapeHtml(t('loginHelpAfter'))}
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
		button.textContent = t('loginChecking');
		try {
			const result = await api('/api/session', { method: 'POST', body: JSON.stringify({ code: value }) });
			await start(result);
		} catch (err) {
			showLogin({ code: value, error: err.message || t('loginBadCode') });
			document.getElementById('code')?.focus();
		}
	});

	app.appendChild(box);
	input.focus();
}

/* ------------------------------------------------------------------- boot */

async function start(newSession) {
	session = newSession;
	brandSub.textContent = session.company || t('brandSub');

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
		// The status text is looked up here rather than taken from sync.js, so a
		// language change re-labels the pill without the sync layer knowing that
		// languages exist.
		onStatus: (state) => {
			savePill.dataset.state = state;
			savePill.textContent = syncStatusText(state);
		},
	});
	savePill.hidden = false;
	savePill.textContent = syncStatusText('saved');

	window.addEventListener('mfp:session-expired', () => {
		sync?.stop();
		showLogin({ code: session.code, error: t('sessionExpired') });
	});

	step = 0;
	renderApp();
}

/* ------------------------------------------------------------------ shell */

function renderApp() {
	lastScreen = renderApp;
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
	heading.textContent = schemaText(partA, 'title');
	box.appendChild(heading);
	for (const text of schemaText(partA, 'preamble')) {
		const p = document.createElement('p');
		p.textContent = text;
		box.appendChild(p);
	}
	return box;
}

function buildNav() {
	const nav = document.createElement('nav');
	nav.className = 'nav';
	nav.setAttribute('aria-label', t('navSections'));

	const title = document.createElement('p');
	title.className = 'nav-title';
	title.textContent = t('navTitle');
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
			button.innerHTML = `<span class="nav-key">✓</span><span>${escapeHtml(t('navReview'))}</span>`;
		} else {
			const { answered, total } = sectionProgress(entry.section, store);
			if (answered === total) item.classList.add('is-complete');
			button.innerHTML = `<span class="nav-key">${entry.section.id}</span><span>${escapeHtml(sectionText(entry.section, 'title'))}</span><span class="nav-count">${answered}/${total}</span>`;
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
	select.setAttribute('aria-label', t('jumpToSection'));
	steps().forEach((entry, index) => {
		const option = document.createElement('option');
		option.value = String(index);
		option.textContent = entry.kind === 'review' ? t('navReview') : `${entry.section.id}. ${sectionText(entry.section, 'title')}`;
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
		back.textContent = t('back');
		back.addEventListener('click', () => goTo(step - 1));
		pager.appendChild(back);
	}

	const next = document.createElement('button');
	next.type = 'button';
	next.className = 'button button-primary button-next';
	next.textContent = step === total - 2 ? t('reviewAnswers') : t('nextSection');
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
		const where = current.kind === 'review' ? t('progressReview') : t('progressWhere', step + 1, partA.sections.length);
		text.textContent = t('progress', where, answered, total);
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

	// The review reads in whichever language the client is using; the copy sent
	// to Drive on submit is always English. See doSubmit().
	const rows = flatten(partA, store.getAll(), { lang: getLang() });
	const blanks = rows.filter((r) => !r.answer).length;

	const head = document.createElement('header');
	head.className = 'section-head';
	head.innerHTML = `
		<p class="section-eyebrow">${escapeHtml(t('reviewEyebrow'))}</p>
		<h2 class="section-title">${escapeHtml(t('reviewTitle'))}</h2>
		<p class="section-intro">${escapeHtml(schemaText(partA, 'closing'))}</p>
	`;
	section.appendChild(head);

	const missing = requiredMissing();
	if (missing.length) {
		const note = document.createElement('div');
		note.className = 'note note-error';
		note.innerHTML = t(
			'reviewMissing',
			missing.map((f) => `<strong>${escapeHtml(fieldText(f, 'label'))}</strong>`).join(t('and')),
		);
		section.appendChild(note);

		const jump = document.createElement('button');
		jump.type = 'button';
		jump.className = 'button button-secondary';
		jump.style.marginTop = '0.75rem';
		jump.textContent = t('reviewGoToA');
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
		note.textContent = t('reviewBlanks', blanks);
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
		a.textContent = row.answer || t('notAnswered');
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
	back.textContent = t('back');
	back.addEventListener('click', () => goTo(step - 1));
	actions.appendChild(back);

	const submit = document.createElement('button');
	submit.type = 'button';
	submit.className = 'button button-primary button-next';
	submit.textContent = t('submit');
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
		const ok = window.confirm(t('submitConfirm', blanks));
		if (!ok) return;
	}

	button.disabled = true;
	button.textContent = t('submitting');

	try {
		// Get the latest draft to the server first, so a failure here still
		// leaves a complete draft behind rather than a stale one.
		await sync.flush();

		const result = await api('/api/submit', {
			method: 'POST',
			body: JSON.stringify({
				answers: store.getAll(),
				// Deliberately English, whatever the client was reading. The files in
				// Drive are read by the consultant and compared across clients, so
				// they must not vary by the language the form happened to be in.
				flat: flatten(partA, store.getAll()),
				schemaVersion: SCHEMA_VERSION,
				lang: getLang(),
			}),
		});

		sync.stop();
		showReceipt({ submittedAt: result.submittedAt });
	} catch (err) {
		button.disabled = false;
		button.textContent = t('submit');
		const note = document.createElement('div');
		note.className = 'note note-error';
		note.textContent = err.status === 409 ? t('submitAlready') : t('submitFailed', err.message);
		status.appendChild(note);
	}
}

/* ---------------------------------------------------------------- receipt */

function showReceipt({ submittedAt }) {
	lastScreen = () => showReceipt({ submittedAt });
	savePill.hidden = true;
	app.textContent = '';

	const section = document.createElement('section');
	section.className = 'section';
	section.style.maxWidth = '48rem';
	section.style.margin = '2rem auto';

	const when = submittedAt ? new Date(submittedAt).toLocaleString(getLang()) : '';
	section.innerHTML = `
		<div class="receipt-mark" aria-hidden="true">✓</div>
		<h2 class="section-title">${escapeHtml(t('receiptTitle'))}</h2>
		<p class="section-intro">
			${escapeHtml(schemaText(partA, 'closing'))}
		</p>
		<div class="note note-info note-spaced">
			${escapeHtml(t('receiptContactBefore'))}<strong>${escapeHtml(store?.get('a_contact_email') || t('receiptFallbackEmail'))}</strong>${escapeHtml(t('receiptContactAfter'))}
			${when ? escapeHtml(t('receiptSubmittedAt', when)) : ''}
		</div>
	`;

	const optional = [].concat(store?.get('opt_documents') ?? []);
	if (optional.length) {
		const note = document.createElement('div');
		note.className = 'note note-info';
		note.style.marginTop = '1rem';
		const documents = partA.sections.flatMap((s) => s.fields).find((f) => f.id === 'opt_documents');
		const labels = documents.options.filter((o) => optional.includes(o.value)).map((o) => optionLabel(documents, o));
		note.innerHTML = t('receiptOptional', labels.map(escapeHtml).join(t('listSeparator')));
		section.appendChild(note);
	}

	const answers = store?.getAll() || {};
	const rows = flatten(partA, answers, { lang: getLang() });
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
	heading.textContent = t('yourAnswers');
	section.append(heading, list);

	const print = document.createElement('button');
	print.type = 'button';
	print.className = 'button button-secondary';
	print.style.marginTop = '1.5rem';
	print.textContent = t('printCopy');
	print.addEventListener('click', () => window.print());
	section.appendChild(print);

	app.appendChild(section);
}

/* --------------------------------------------------------- part B preview */

function buildPartBPreview() {
	const details = document.createElement('details');
	details.className = 'partb';

	const summary = document.createElement('summary');
	summary.textContent = t('partBSummary', partBText(partBPreview, 'title'));
	details.appendChild(summary);

	const body = document.createElement('div');
	body.className = 'partb-body';

	const intro = document.createElement('p');
	intro.className = 'section-intro';
	intro.style.marginBottom = '1.5rem';
	intro.textContent = partBText(partBPreview, 'intro');
	body.appendChild(intro);

	for (const group of partBPreview.sections) {
		const block = document.createElement('div');
		block.className = 'partb-section';
		const heading = document.createElement('h3');
		heading.textContent = `${group.id}. ${partBSection(group, 'title')}`;
		block.appendChild(heading);
		if (group.note) {
			const note = document.createElement('div');
			note.className = 'note note-warn';
			note.style.margin = '0.5rem 0 0.75rem';
			note.textContent = partBSection(group, 'note');
			block.appendChild(note);
		}
		const list = document.createElement('ul');
		for (const point of partBSection(group, 'items')) {
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

/* --------------------------------------------------------- language switch */

/*
 * Two buttons in the header rather than a dropdown: with only two languages a
 * dropdown hides the fact that the other one exists, and a client who cannot
 * read the English header would have to open it to find out. Each button is
 * labelled in its own language, so neither depends on the other being readable.
 */
function mountLangToggle() {
	const host = document.getElementById('lang-toggle');
	if (!host) return;
	host.textContent = '';
	host.setAttribute('aria-label', t('langLabel'));

	for (const lang of LANGS) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'lang-button';
		button.lang = lang.htmlLang;
		button.textContent = lang.label;
		button.setAttribute('aria-pressed', String(lang.code === getLang()));
		button.addEventListener('click', () => setLang(lang.code));
		host.appendChild(button);
	}
}

/*
 * Redraw everything after a language change. The store is untouched — answers
 * are ids and codes, not text — so this is a repaint, not a data migration.
 */
window.addEventListener('mfp:lang', () => {
	mountLangToggle();
	applyStaticText();
	if (!savePill.hidden && sync) savePill.textContent = syncStatusText(sync.status());
	lastScreen();
});

/** The strings that live in index.html rather than in a screen. */
function applyStaticText() {
	applyDocumentLang();
	for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
	// Not data-i18n, because after login this carries the company name instead.
	if (brandSub && !session?.company) brandSub.textContent = t('brandSub');
}

/* ------------------------------------------------------------------ utils */

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ------------------------------------------------------------------- init */

(async function init() {
	applyStaticText();
	mountLangToggle();

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
