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
 */

import { isEmpty } from './state.js';

/* ----------------------------------------------------------------- values */

export function formatValue(field, value) {
	if (isEmpty(value)) return '';

	switch (field.type) {
		case 'radio': {
			const option = (field.options || []).find((o) => o.value === value);
			return option ? option.label : String(value);
		}

		case 'checkbox': {
			const chosen = [].concat(value);
			return (field.options || [])
				.filter((o) => chosen.includes(o.value))
				.map((o) => o.label)
				.join('; ');
		}

		case 'table':
			return value
				.filter((row) => !isEmpty(Object.values(row)))
				.map((row, i) => {
					const cells = field.columns
						.map((c) => (isEmpty(row[c.id]) ? null : `${c.label}: ${String(row[c.id]).trim()}`))
						.filter(Boolean);
					return `${field.rowLabel || 'Row'} ${i + 1} — ${cells.join(', ')}`;
				})
				.join('\n');

		default: {
			const text = String(value).trim();
			return field.unit ? `${text} ${field.unit}` : text;
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
export function flatten(schema, answers, { includeBlank = true } = {}) {
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
		out.push({ section: section.id, sectionTitle: section.title, id: field.id, question, answer });
	};

	for (const section of schema.sections) {
		const walk = (field, prefix = '') => {
			if (!visible(field)) return;

			if (field.type === 'metrics') {
				for (const row of field.rows) {
					const cell = get(field.id)?.[row.id];
					const answer = cell?.notTracked ? 'Not tracked' : isEmpty(cell?.value) ? '' : `${String(cell.value).trim()} ${row.unit}`;
					push(section, row, row.label, answer);
				}
				return;
			}

			const label = field.number ? `${field.number}. ${field.label}` : field.label;
			push(section, field, prefix + label, formatValue(field, get(field.id)));

			for (const option of field.options || []) {
				if (!option.reveal) continue;
				const chosen = [].concat(get(field.id) ?? []);
				if (!chosen.includes(option.value)) continue;
				for (const sub of option.reveal) walk(sub, `${option.label} → `);
			}
		};

		for (const field of section.fields) walk(field);
	}

	return out;
}
