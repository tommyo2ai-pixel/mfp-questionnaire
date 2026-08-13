/*
 * Language selection and text resolution.
 *
 * Two languages: English and Traditional Chinese (繁體中文). The schema stays
 * English and remains the source of truth; i18n.zh-Hant.js supplies display
 * text keyed by field id. Everything in this file is a lookup with an English
 * fallback, so a key missing from the dictionary degrades to English rather
 * than to a blank label.
 *
 * WHAT NEVER CHANGES WITH LANGUAGE
 *   - stored answers: option values and field ids are language-neutral codes
 *   - the export to Drive: format.js is called with 'en' for the submission, so
 *     two clients reading the form in different languages still produce
 *     comparable files
 *
 * A client can therefore start the questionnaire in English, switch to Chinese
 * halfway, and lose nothing.
 */

import { ZH_UI, ZH_PART_A, ZH_PART_B, ZH_COUNTRIES } from './i18n.zh-Hant.js';

export const LANGS = [
	{ code: 'en', label: 'EN', htmlLang: 'en' },
	{ code: 'zh-Hant', label: '繁體中文', htmlLang: 'zh-Hant' },
];

const STORAGE_KEY = 'mfp.lang';

/* English UI strings. The Chinese half lives in ZH_UI; the two must stay in
   step, which is why they are two flat objects with identical keys rather than
   one nested structure per string. */
const EN_UI = {
	documentTitle: 'Pre-Proposal Questionnaire — Ming Fong Paper Limited',
	brandSub: 'Pre-Proposal Questionnaire',
	skipToContent: 'Skip to content',
	langLabel: 'Language / 語言',
	confidential: 'All information is treated as confidential and used only for proposal preparation.',
	noscript:
		'This questionnaire needs JavaScript so that your answers can be saved as you go. If you cannot enable it, email tommy.chan@mingfongpaper.com and we will send you a document version instead.',

	loginTitle: 'Pre-Proposal Questionnaire',
	loginIntro:
		'Flexographic Printing Standardization Program. Enter the access code from your invitation to begin, or to continue a questionnaire you have already started.',
	loginCodeLabel: 'Access code',
	loginSubmit: 'Continue',
	loginChecking: 'Checking…',
	loginHelpBefore: 'No code, or it is not working? Email ',
	loginHelpAfter: ' and we will send you a new one.',
	loginBadCode: 'That code was not recognised.',
	sessionExpired: 'Your session timed out. Enter your code again — nothing has been lost.',

	saveSaved: 'All answers saved',
	saveSaving: 'Saving…',
	savePending: 'Unsaved changes',
	saveOffline: 'Offline — saved on this device',
	saveError: 'Saved on this device, retrying…',

	navTitle: 'Sections',
	navSections: 'Questionnaire sections',
	navReview: 'Review & submit',
	jumpToSection: 'Jump to section',
	sectionEyebrow: (id) => `Section ${id}`,
	progress: (where, answered, total) => `${where} · ${answered} of ${total} questions answered`,
	progressWhere: (index, total) => `Section ${index} of ${total}`,
	progressReview: 'Review',

	back: 'Back',
	nextSection: 'Next section',
	reviewAnswers: 'Review answers',

	required: 'required',
	requiredTitle: 'We need this one',
	notAnswered: 'Not answered',
	selectPlaceholder: 'Select…',
	groupCommon: 'Most common',
	groupAll: 'All countries and regions',
	dialCode: 'Code',
	phoneCountryCode: (label) => `${label} — country code`,
	remove: 'Remove',
	removeRow: (rowLabel, index) => `Remove ${rowLabel} ${index}`,
	addRow: 'Add row',
	notTracked: 'Not tracked',
	chosenOf: (n, max) => `${n} of ${max} chosen`,
	chosenAtCap: (max) => `${max} of ${max} chosen — untick one to change your answer`,

	reviewEyebrow: 'Final step',
	reviewTitle: 'Review & submit',
	reviewMissing: (labels) => `We need ${labels} before you can submit — that is how we reply to you. Everything else is optional.`,
	reviewGoToA: 'Go to Section A',
	and: ' and ',
	listSeparator: ', ',
	reviewBlanks: (n) =>
		`You have left ${n} question${n === 1 ? '' : 's'} blank. That is completely fine — blanks tell us what is not currently tracked, which is useful in itself. Submit whenever you are ready.`,
	submit: 'Submit questionnaire',
	submitting: 'Submitting…',
	submitConfirm: (n) =>
		`You have left ${n} question${n === 1 ? '' : 's'} blank.\n\n` +
		'That is fine — blank answers are useful and tell us what is not currently tracked. ' +
		'You will not be able to edit the questionnaire after submitting.\n\nSubmit now?',
	submitAlready: 'This questionnaire has already been submitted. Please contact us if you need to change an answer.',
	submitFailed: (message) => `We could not submit just now: ${message}. Your answers are saved — please try again in a moment.`,

	receiptTitle: 'Thank you — your questionnaire has been received',
	receiptContactBefore: 'We will review your answers and be in touch at ',
	receiptContactAfter: '.',
	receiptFallbackEmail: 'the address you provided',
	receiptSubmittedAt: (when) => `Submitted ${when}.`,
	receiptOptional: (labels) =>
		`You indicated these documents already exist: <strong>${labels}</strong>. Please email them to <a href="mailto:tommy.chan@mingfongpaper.com">tommy.chan@mingfongpaper.com</a> when convenient — there is no need to create anything new.`,
	yourAnswers: 'Your answers',
	printCopy: 'Print or save a copy',

	partBSummary: (title) => `${title} — nothing to do now`,
};

const UI = { en: EN_UI, 'zh-Hant': ZH_UI };
const PART_A = { 'zh-Hant': ZH_PART_A };
const PART_B = { 'zh-Hant': ZH_PART_B };

/* ------------------------------------------------------------ current lang */

/*
 * Order of preference: what this person chose last time, then what their
 * browser asks for, then English. Any zh-* browser locale gets Traditional
 * Chinese — it is the only Chinese we ship, and it is closer for a Simplified
 * reader than English is.
 */
function initialLang() {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && UI[stored]) return stored;
	} catch {
		/* private browsing — fall through to the browser's preference */
	}
	const preferred = [...(navigator.languages || [navigator.language || 'en'])];
	if (preferred.some((l) => String(l).toLowerCase().startsWith('zh'))) return 'zh-Hant';
	return 'en';
}

let current = initialLang();

export function getLang() {
	return current;
}

/** Change language. Fires `mfp:lang` so main.js can re-render. */
export function setLang(code) {
	if (!UI[code] || code === current) return;
	current = code;
	try {
		localStorage.setItem(STORAGE_KEY, code);
	} catch {
		/* the choice just will not survive a reload */
	}
	applyDocumentLang();
	window.dispatchEvent(new CustomEvent('mfp:lang', { detail: { lang: code } }));
}

/** Set <html lang> and the tab title. Called on boot and on every change. */
export function applyDocumentLang() {
	const entry = LANGS.find((l) => l.code === current) || LANGS[0];
	document.documentElement.lang = entry.htmlLang;
	document.title = t('documentTitle');
}

/* ------------------------------------------------------------- ui strings */

/**
 * A UI string. Values in the tables above are either strings or functions;
 * arguments passed here go to the function. Falls back to English, then to the
 * key itself, so a typo is visible rather than silent.
 */
export function t(key, ...args) {
	return tLang(current, key, ...args);
}

/**
 * The same, in a language named explicitly. format.js needs this: the review
 * screen is rendered in the reader's language while the copy sent to Drive is
 * always English.
 */
export function tLang(lang, key, ...args) {
	const value = UI[lang]?.[key] ?? EN_UI[key];
	if (value === undefined) return key;
	return typeof value === 'function' ? value(...args) : value;
}

/** The status-pill text, keyed by the state names sync.js emits. */
export function syncStatusText(state) {
	return t({ saved: 'saveSaved', saving: 'saveSaving', pending: 'savePending', offline: 'saveOffline', error: 'saveError' }[state] || 'saveSaved');
}

/* --------------------------------------------------------- schema strings */

const entry = (fieldId, lang) => PART_A[lang ?? current]?.fields?.[fieldId];

/**
 * Any text property of a field — `label`, `hint`, `unit`, `placeholder`,
 * `addLabel`, `rowLabel`. Falls back to the schema's own English.
 */
export function fieldText(field, key = 'label', lang) {
	return entry(field.id, lang)?.[key] ?? field[key];
}

/** An option's label, keyed by the option value that gets stored. */
export function optionLabel(field, option, lang) {
	return entry(field.id, lang)?.options?.[option.value] ?? option.label;
}

/** A table column heading (C1's press rows). */
export function columnLabel(field, column, lang) {
	return entry(field.id, lang)?.columns?.[column.id] ?? column.label;
}

/**
 * A metrics row (Section F). Rows carry their own ids and format.js treats
 * them as fields, so they are looked up exactly like one.
 */
export function rowText(row, key = 'label', lang) {
	return entry(row.id, lang)?.[key] ?? row[key];
}

/** A section's `title` or `intro`. */
export function sectionText(section, key = 'title', lang) {
	return PART_A[lang ?? current]?.sections?.[section.id]?.[key] ?? section[key];
}

/** A top-level Part A string: `title`, `subtitle`, `closing`, `preamble`. */
export function schemaText(schema, key, lang) {
	return PART_A[lang ?? current]?.[key] ?? schema[key];
}

/** A country or region name, by ISO alpha-2 code. */
export function countryLabel(country, lang) {
	return (lang ?? current) === 'en' ? country.label : (ZH_COUNTRIES[country.value] ?? country.label);
}

/* ------------------------------------------------------------ part B text */

export function partBText(preview, key) {
	return PART_B[current]?.[key] ?? preview[key];
}

export function partBSection(group, key) {
	return PART_B[current]?.sections?.[group.id]?.[key] ?? group[key];
}
