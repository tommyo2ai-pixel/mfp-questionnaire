/*
 * Answers → readable question/answer pairs.
 *
 * flatten() produces [{ section, id, question, answer }] — used for the review
 * screen, and sent with the submission so that the labels stored in Drive are
 * the exact labels the customer saw, even after a later rewording.
 *
 * The Markdown report and the consultant's internal "signals" used to live here
 * and have deliberately moved to netlify/functions/_lib/report.mjs. Everything
 * in this directory is downloadable by the customer, and the signals are a
 * commercial judgement about the company filling the form in.
 *
 * LANGUAGE. Both functions take a `lang`, defaulting to English. The review
 * screen and the receipt pass the reader's language; the copy sent with the
 * submission passes nothing, so what lands in Drive is always English and two
 * clients stay comparable however each of them read the form.
 */

import { isEmpty } from './state.js';
import { tLang, fieldText, optionLabel, columnLabel, rowText, sectionText } from './i18n.js';

/* ----------------------------------------------------------------- values */

export function formatValue(field, value, lang = 'en') {
	if (isEmpty(value)) return '';

	switch (field.type) {
		case 'radio':
		case 'select': {
			const option = (field.options || []).find((o) => o.value === value);
			return option ? optionLabel(field, option, lang) : String(value);
		}

		// Stored as { country, dial, number } but read as one thing.
		case 'phone':
			return [value.dial, String(value.number || '').trim()].filter(Boolean).join(' ');

		case 'checkbox': {
			const chosen = [].concat(value);
			return (field.options || [])
				.filter((o) => chosen.includes(o.value))
				.map((o) => optionLabel(field, o, lang))
				.join('; ');
		}

		case 'table': {
			const rowLabel = fieldText(field, 'rowLabel', lang) || 'Row';
			return value
				.filter((row) => !isEmpty(Object.values(row)))
				.map((row, i) => {
					const cells = field.columns
						.map((c) => (isEmpty(row[c.id]) ? null : `${columnLabel(field, c, lang)}: ${String(row[c.id]).trim()}`))
						.filter(Boolean);
					return `${rowLabel} ${i + 1} — ${cells.join(', ')}`;
				})
				.join('\n');
		}

		default: {
			const text = String(value).trim();
			const unit = fieldText(field, 'unit', lang);
			return unit ? `${text} ${unit}` : text;
		}
	}
}

/* ---------------------------------------------------------------- flatten */

/**
 * Walk the schema in document order and emit one entry per question, including
 * revealed follow-ups and each metrics row. Conditional questions that do not
 * apply are skipped entirely rather than reported blank — "not applicable" and
 * "left blank" mean very different things when reading these back.
 */
export function flatten(schema, answers, { includeBlank = true, lang = 'en' } = {}) {
	const out = [];
	const get = (id) => answers[id];

	const visible = (field) => {
		if (!field.showWhen) return true;
		const value = get(field.showWhen.field);
		if (field.showWhen.in) return [].concat(value ?? []).some((v) => field.showWhen.in.includes(v));
		if (field.showWhen.equals !== undefined) return value === field.showWhen.equals;
		return !isEmpty(value);
	};

	const push = (section, field, question, answer) => {
		if (!includeBlank && !answer) return;
		out.push({ section: section.id, sectionTitle: sectionText(section, 'title', lang), id: field.id, question, answer });
	};

	for (const section of schema.sections) {
		const walk = (field, prefix = '') => {
			if (!visible(field)) return;

			if (field.type === 'metrics') {
				for (const row of field.rows) {
					const cell = get(field.id)?.[row.id];
					const answer = cell?.notTracked
						? tLang(lang, 'notTracked')
						: isEmpty(cell?.value)
							? ''
							: `${String(cell.value).trim()} ${rowText(row, 'unit', lang)}`;
					push(section, row, rowText(row, 'label', lang), answer);
				}
				return;
			}

			const text = fieldText(field, 'label', lang);
			const label = field.number ? `${field.number}. ${text}` : text;
			push(section, field, prefix + label, formatValue(field, get(field.id), lang));

			for (const option of field.options || []) {
				if (!option.reveal) continue;
				const chosen = [].concat(get(field.id) ?? []);
				if (!chosen.includes(option.value)) continue;
				for (const sub of option.reveal) walk(sub, `${optionLabel(field, option, lang)} → `);
			}
		};

		for (const field of section.fields) walk(field);
	}

	return out;
}
