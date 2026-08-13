/*
 * Does the Chinese dictionary still cover the schema?
 *
 * The translation is a side-car keyed by field id, which keeps the schema clean
 * but means a new question added to schema.partA.js is silently English until
 * someone notices. This finds them.
 *
 *     node scripts/check-i18n.mjs
 *
 * Exits non-zero if anything is missing, so it can go in a pre-commit hook or
 * CI later. Missing text is not a bug at runtime — i18n.js falls back to
 * English — so this reports, it does not enforce.
 */

import { partA } from '../public/js/schema.partA.js';
import { partBPreview } from '../public/js/schema.partB.js';
import { ZH_PART_A, ZH_PART_B, ZH_COUNTRIES } from '../public/js/i18n.zh-Hant.js';
import { COUNTRIES } from '../public/js/countries.js';

const missing = [];

/* Every text property a field can carry, checked against its dictionary entry. */
function checkField(field) {
	const zh = ZH_PART_A.fields[field.id];
	if (!zh) return missing.push(`field ${field.id} — no entry at all`);

	for (const key of ['hint', 'unit', 'placeholder', 'addLabel', 'rowLabel']) {
		if (field[key] && !zh[key]) missing.push(`${field.id}.${key}`);
	}
	for (const column of field.columns || []) {
		if (!zh.columns?.[column.id]) missing.push(`${field.id} column ${column.id}`);
	}
	// Metrics rows are fields in their own right — format.js exports them as
	// separate questions — so they get their own top-level entries.
	if (field.type === 'metrics') {
		for (const row of field.rows) {
			const rowZh = ZH_PART_A.fields[row.id];
			if (!rowZh) missing.push(`metrics row ${row.id}`);
			else if (row.unit && !rowZh.unit) missing.push(`metrics row ${row.id}.unit`);
		}
	}
	for (const option of field.options || []) {
		if (!zh.options?.[option.value]) missing.push(`${field.id} option ${option.value}`);
		for (const sub of option.reveal || []) checkField(sub);
	}
}

for (const key of ['title', 'subtitle', 'closing']) {
	if (partA[key] && !ZH_PART_A[key]) missing.push(`partA.${key}`);
}
if ((ZH_PART_A.preamble || []).length !== partA.preamble.length) {
	missing.push(`partA.preamble — ${ZH_PART_A.preamble?.length ?? 0} paragraphs, schema has ${partA.preamble.length}`);
}

for (const section of partA.sections) {
	const zh = ZH_PART_A.sections[section.id];
	if (!zh) missing.push(`section ${section.id}`);
	else if (section.intro && !zh.intro) missing.push(`section ${section.id}.intro`);
	for (const field of section.fields) checkField(field);
}

for (const group of partBPreview.sections) {
	const zh = ZH_PART_B.sections[group.id];
	if (!zh) {
		missing.push(`part B section ${group.id}`);
		continue;
	}
	if (group.note && !zh.note) missing.push(`part B ${group.id}.note`);
	// A mismatched count means a bullet was added on one side only, which reads
	// as a missing requirement rather than as a missing translation.
	if ((zh.items || []).length !== group.items.length) {
		missing.push(`part B ${group.id}.items — ${zh.items?.length ?? 0} in Chinese, ${group.items.length} in English`);
	}
}

for (const country of COUNTRIES) {
	if (!ZH_COUNTRIES[country.value]) missing.push(`country ${country.value} (${country.label})`);
}

if (missing.length) {
	console.error(`${missing.length} untranslated:\n` + missing.map((m) => `  ${m}`).join('\n'));
	process.exit(1);
}
console.log('i18n: Traditional Chinese covers the schema completely.');
