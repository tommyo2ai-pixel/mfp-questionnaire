/*
 * Schema → DOM.
 *
 * Every field type in schema.partA.js is built here, and nothing else in the
 * app knows what a question looks like. Two rules the whole file follows:
 *
 *   1. Answers flow one way. An input event writes to the store, and the store
 *      is then the truth. Visibility is recomputed from the store afterwards,
 *      never from the DOM.
 *   2. Nothing is required except the two fields marked so in the schema. The
 *      source document is explicit that blanks are useful data, so there are no
 *      red borders, no blocking validation and no completion percentage.
 */

import { isEmpty } from './state.js';
import { COUNTRIES } from './countries.js';

const el = (tag, attrs = {}, children = []) => {
	const node = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (v === undefined || v === null || v === false) continue;
		if (k === 'class') node.className = v;
		else if (k === 'text') node.textContent = v;
		else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
		else if (v === true) node.setAttribute(k, '');
		else node.setAttribute(k, v);
	}
	for (const child of [].concat(children)) {
		if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
	}
	return node;
};

/* ------------------------------------------------------------------ section */

export function renderSection(section, store, { readOnly = false, onChange = () => {} } = {}) {
	const root = el('section', { class: 'section', 'data-section': section.id });

	root.appendChild(
		el('header', { class: 'section-head' }, [
			el('p', { class: 'section-eyebrow', text: `Section ${section.id}` }),
			el('h2', { class: 'section-title', text: section.title }),
			section.intro ? el('p', { class: 'section-intro', text: section.intro }) : null,
		]),
	);

	const body = el('div', { class: 'section-body' });
	for (const field of section.fields) {
		body.appendChild(renderField(field, store, { readOnly, onChange }));
	}
	root.appendChild(body);

	applyVisibility(root, store);
	return root;
}

/* -------------------------------------------------------------------- field */

function renderField(field, store, ctx) {
	const wrap = el('div', {
		class: 'field',
		'data-field': field.id,
		'data-showwhen': field.showWhen ? JSON.stringify(field.showWhen) : null,
	});

	const describedBy = [];
	if (field.hint) describedBy.push(`hint-${field.id}`);

	// Radio and checkbox groups are fieldsets so screen readers announce the
	// question before each option; everything else gets a plain <label>.
	const grouped = field.type === 'radio' || field.type === 'checkbox';
	const head = grouped ? el('legend', { class: 'field-label' }) : el('label', { class: 'field-label', for: `f-${field.id}` });

	if (field.number) head.appendChild(el('span', { class: 'field-number', text: field.number }));
	head.appendChild(document.createTextNode(field.label));
	if (field.required) head.appendChild(el('span', { class: 'field-required', text: 'required', title: 'We need this one' }));

	const hint = field.hint ? el('p', { class: 'field-hint', id: `hint-${field.id}`, text: field.hint }) : null;

	const control = buildControl(field, store, ctx, describedBy);

	if (grouped) {
		const fs = el('fieldset', { class: 'field-group' }, [head, hint, control]);
		wrap.appendChild(fs);
	} else {
		wrap.appendChild(head);
		if (hint) wrap.appendChild(hint);
		wrap.appendChild(control);
	}
	return wrap;
}

function buildControl(field, store, ctx, describedBy) {
	switch (field.type) {
		case 'textarea':
			return textareaControl(field, store, ctx, describedBy);
		case 'radio':
			return choiceControl(field, store, ctx, 'radio');
		case 'checkbox':
			return choiceControl(field, store, ctx, 'checkbox');
		case 'select':
			return selectControl(field, store, ctx, describedBy);
		case 'phone':
			return phoneControl(field, store, ctx, describedBy);
		case 'table':
			return tableControl(field, store, ctx);
		case 'metrics':
			return metricsControl(field, store, ctx);
		default:
			return inputControl(field, store, ctx, describedBy);
	}
}

/* ------------------------------------------------------- text / email / num */

function inputControl(field, store, ctx, describedBy) {
	const input = el('input', {
		class: 'input',
		id: `f-${field.id}`,
		type: field.type === 'number' ? 'text' : field.type,
		inputmode: field.type === 'number' ? 'decimal' : null,
		// Autocomplete helps on phones for the contact block and nowhere else.
		autocomplete: AUTOCOMPLETE[field.id] || 'off',
		'aria-describedby': describedBy.length ? describedBy.join(' ') : null,
		disabled: ctx.readOnly,
	});
	input.value = store.get(field.id) ?? '';
	input.addEventListener('input', () => {
		store.set(field.id, input.value);
		ctx.onChange(field.id);
	});

	if (!field.unit) return input;
	return el('div', { class: 'input-with-unit' }, [input, el('span', { class: 'input-unit', text: field.unit })]);
}

// Numbers are typed as text on purpose: type="number" silently discards
// "approximately 3" and "not tracked", and the document invites exactly those
// answers. inputmode still brings up the numeric keypad on a phone.
const AUTOCOMPLETE = {
	a_company_name: 'organization',
	a_contact_name: 'name',
	a_contact_email: 'email',
	a_contact_phone: 'tel',
};

function textareaControl(field, store, ctx, describedBy) {
	const ta = el('textarea', {
		class: 'input textarea',
		id: `f-${field.id}`,
		rows: field.rows || 4,
		'aria-describedby': describedBy.length ? describedBy.join(' ') : null,
		disabled: ctx.readOnly,
	});
	ta.value = store.get(field.id) ?? '';
	ta.addEventListener('input', () => {
		store.set(field.id, ta.value);
		ctx.onChange(field.id);
	});
	return ta;
}

/* ------------------------------------------------------- radio / checkbox */

function choiceControl(field, store, ctx, kind) {
	const list = el('div', { class: 'choices' });
	const counter = field.max ? el('p', { class: 'choice-counter', 'aria-live': 'polite' }) : null;

	for (const option of field.options) {
		const inputId = `f-${field.id}-${option.value}`;
		const input = el('input', {
			type: kind,
			id: inputId,
			name: `f-${field.id}`,
			value: option.value,
			disabled: ctx.readOnly,
		});

		const row = el('div', { class: 'choice' }, [
			el('label', { class: 'choice-label', for: inputId }, [input, el('span', { text: option.label })]),
		]);

		// Inline follow-ups ("Yes — how many: ___") live inside the option so
		// they read as part of that answer and disappear with it.
		let revealBox = null;
		if (option.reveal) {
			revealBox = el(
				'div',
				{ class: 'reveal', 'data-reveal-for': option.value, hidden: true },
				option.reveal.map((sub) => renderField(sub, store, ctx)),
			);
			row.appendChild(revealBox);
		}

		input.addEventListener('change', () => {
			applyChoice(field, store, kind, option, input);
			syncChoiceUI(field, store, list, counter);
			applyVisibility(document, store);
			ctx.onChange(field.id);
		});

		list.appendChild(row);
	}

	syncChoiceUI(field, store, list, counter);
	return el('div', {}, [list, counter]);
}

function applyChoice(field, store, kind, option, input) {
	if (kind === 'radio') {
		store.set(field.id, option.value);
		return;
	}

	const current = new Set(store.get(field.id) || []);
	if (input.checked) {
		// "None of the above" cannot coexist with a real answer, in either
		// direction — otherwise the data says both "we have nothing" and "we
		// have a spectrophotometer".
		if (option.exclusive) current.clear();
		else for (const other of field.options) if (other.exclusive) current.delete(other.value);
		if (field.max && current.size >= field.max) {
			input.checked = false;
			return;
		}
		current.add(option.value);
	} else {
		current.delete(option.value);
	}
	store.set(field.id, [...current]);
}

function syncChoiceUI(field, store, list, counter) {
	const value = store.get(field.id);
	const chosen = new Set(field.type === 'radio' ? (value ? [value] : []) : value || []);

	for (const input of list.querySelectorAll('input')) {
		input.checked = chosen.has(input.value);
		if (field.max) {
			// At the cap, unticked options go inert rather than vanishing, so the
			// remaining choices stay readable.
			const atCap = chosen.size >= field.max && !input.checked;
			input.disabled = atCap;
			input.closest('.choice').classList.toggle('is-capped', atCap);
		}
		const box = input.closest('.choice').querySelector(`[data-reveal-for="${CSS.escape(input.value)}"]`);
		if (box) box.hidden = !input.checked;
	}

	if (counter) {
		counter.textContent =
			chosen.size >= field.max
				? `${field.max} of ${field.max} chosen — untick one to change your answer`
				: `${chosen.size} of ${field.max} chosen`;
		counter.classList.toggle('is-capped', chosen.size >= field.max);
	}
}

/* ------------------------------------------------------------------ select */

/*
 * A dropdown, for lists too long to show as radio buttons. Options flagged
 * `common` are repeated in a short group at the top: a client in Foshan should
 * not have to scroll past Afghanistan to reach China. Both copies carry the
 * same value, so which one they click makes no difference to what is stored.
 */
function selectControl(field, store, ctx, describedBy) {
	const select = el('select', {
		class: 'input select',
		id: `f-${field.id}`,
		'aria-describedby': describedBy.length ? describedBy.join(' ') : null,
		disabled: ctx.readOnly,
	});

	select.appendChild(el('option', { value: '', text: field.placeholder || 'Select…' }));

	const common = field.options.filter((o) => o.common);
	if (common.length) {
		select.appendChild(el('optgroup', { label: 'Most common' }, common.map((o) => el('option', { value: o.value, text: o.label }))));
		select.appendChild(
			el('optgroup', { label: 'All countries and regions' }, field.options.map((o) => el('option', { value: o.value, text: o.label }))),
		);
	} else {
		for (const o of field.options) select.appendChild(el('option', { value: o.value, text: o.label }));
	}

	select.value = store.get(field.id) ?? '';
	select.addEventListener('change', () => {
		store.set(field.id, select.value);
		applyVisibility(document, store);
		ctx.onChange(field.id);
	});
	return select;
}

/* ------------------------------------------------------------------- phone */

/*
 * Dialling code + number, stored as { country, dial, number }. The country code
 * is kept alongside the dial code because several countries share one (+1 is
 * the US, Canada and much of the Caribbean), and without it the dropdown could
 * not show the right entry again when the customer comes back.
 */
function phoneControl(field, store, ctx, describedBy) {
	const current = store.get(field.id) || {};

	const dial = el('select', {
		class: 'input select phone-dial',
		id: `f-${field.id}-dial`,
		'aria-label': `${field.label} — country code`,
		disabled: ctx.readOnly,
	});
	dial.appendChild(el('option', { value: '', text: 'Code' }));

	// Dial code first. The box is narrow, so something has to be cut off when a
	// country has a long name — and the code is the part that must stay legible.
	const dialOption = (o) => el('option', { value: o.value, text: `${o.dial} — ${o.label}` });
	const common = COUNTRIES.filter((o) => o.common);
	dial.appendChild(el('optgroup', { label: 'Most common' }, common.map(dialOption)));
	dial.appendChild(el('optgroup', { label: 'All countries and regions' }, COUNTRIES.map(dialOption)));
	dial.value = current.country || '';

	const number = el('input', {
		class: 'input phone-number',
		id: `f-${field.id}`,
		type: 'tel',
		inputmode: 'tel',
		autocomplete: 'tel-national',
		'aria-describedby': describedBy.length ? describedBy.join(' ') : null,
		disabled: ctx.readOnly,
	});
	number.value = current.number ?? '';

	const write = () => {
		const chosen = COUNTRIES.find((c) => c.value === dial.value);
		store.set(field.id, { country: dial.value, dial: chosen ? chosen.dial : '', number: number.value });
		ctx.onChange(field.id);
	};

	dial.addEventListener('change', write);
	number.addEventListener('input', write);

	return el('div', { class: 'phone-row' }, [dial, number]);
}

/* --------------------------------------------------------------- table (C1) */

function tableControl(field, store, ctx) {
	const container = el('div', { class: 'table-rows' });
	const blank = () => Object.fromEntries(field.columns.map((c) => [c.id, '']));

	const draw = () => {
		const rows = store.get(field.id) || [];
		if (rows.length < (field.minRows || 1)) {
			rows.push(...Array.from({ length: (field.minRows || 1) - rows.length }, blank));
		}
		container.textContent = '';

		rows.forEach((row, index) => {
			const card = el('div', { class: 'row-card' });
			card.appendChild(
				el('div', { class: 'row-card-head' }, [
					el('span', { class: 'row-card-title', text: `${field.rowLabel || 'Row'} ${index + 1}` }),
					rows.length > (field.minRows || 1) && !ctx.readOnly
						? el('button', {
								type: 'button',
								class: 'link-button',
								text: 'Remove',
								'aria-label': `Remove ${field.rowLabel || 'row'} ${index + 1}`,
								onclick: () => {
									const next = (store.get(field.id) || []).slice();
									next.splice(index, 1);
									store.set(field.id, next);
									draw();
									ctx.onChange(field.id);
								},
							})
						: null,
				]),
			);

			const grid = el('div', { class: 'row-grid' });
			for (const col of field.columns) {
				const inputId = `f-${field.id}-${index}-${col.id}`;
				const input = el('input', { class: 'input', id: inputId, type: 'text', disabled: ctx.readOnly });
				input.value = row[col.id] ?? '';
				input.addEventListener('input', () => {
					const next = (store.get(field.id) || []).slice();
					while (next.length <= index) next.push(blank());
					next[index] = { ...next[index], [col.id]: input.value };
					store.set(field.id, next);
					ctx.onChange(field.id);
				});
				grid.appendChild(el('div', { class: 'row-cell' }, [el('label', { class: 'row-cell-label', for: inputId, text: col.label }), input]));
			}
			card.appendChild(grid);
			container.appendChild(card);
		});
	};

	draw();

	const wrap = el('div', {}, [container]);
	if (!ctx.readOnly) {
		wrap.appendChild(
			el('button', {
				type: 'button',
				class: 'button button-secondary button-add',
				text: field.addLabel || 'Add row',
				onclick: () => {
					store.set(field.id, [...(store.get(field.id) || []), blank()]);
					draw();
					ctx.onChange(field.id);
					container.querySelector('.row-card:last-child input')?.focus();
				},
			}),
		);
	}
	return wrap;
}

/* ------------------------------------------------------------- metrics (F) */

function metricsControl(field, store, ctx) {
	const table = el('div', { class: 'metrics' });

	for (const row of field.rows) {
		const current = store.get(field.id)?.[row.id] || { value: '', notTracked: false };
		const inputId = `f-${field.id}-${row.id}`;
		const toggleId = `${inputId}-nt`;

		const input = el('input', {
			class: 'input',
			id: inputId,
			type: 'text',
			inputmode: 'decimal',
			disabled: ctx.readOnly || current.notTracked,
		});
		input.value = current.value ?? '';

		const toggle = el('input', { type: 'checkbox', id: toggleId, disabled: ctx.readOnly });
		toggle.checked = !!current.notTracked;

		const write = (patch) => {
			const all = { ...(store.get(field.id) || {}) };
			all[row.id] = { ...(all[row.id] || { value: '', notTracked: false }), ...patch };
			store.set(field.id, all);
			ctx.onChange(field.id);
		};

		input.addEventListener('input', () => write({ value: input.value }));
		toggle.addEventListener('change', () => {
			// Ticking "not tracked" clears any figure so the two can never
			// disagree in the exported data.
			input.disabled = toggle.checked;
			if (toggle.checked) input.value = '';
			write({ notTracked: toggle.checked, value: toggle.checked ? '' : input.value });
		});

		table.appendChild(
			el('div', { class: 'metric' }, [
				el('label', { class: 'metric-label', for: inputId, text: row.label }),
				el('div', { class: 'metric-controls' }, [
					el('div', { class: 'input-with-unit' }, [input, el('span', { class: 'input-unit', text: row.unit })]),
					el('label', { class: 'metric-nt', for: toggleId }, [toggle, el('span', { text: 'Not tracked' })]),
				]),
			]),
		);
	}
	return table;
}

/* --------------------------------------------------------------- visibility */

/**
 * Show or hide every `showWhen` field against the current answers. Called after
 * any change, over the whole document, because a field in section C can depend
 * on an answer the customer just changed in section C's first question.
 */
export function applyVisibility(root, store) {
	for (const node of root.querySelectorAll('[data-showwhen]')) {
		const rule = JSON.parse(node.dataset.showwhen);
		node.hidden = !matches(rule, store);
	}
}

function matches(rule, store) {
	const value = store.get(rule.field);
	if (rule.in) return [].concat(value ?? []).some((v) => rule.in.includes(v));
	if (rule.equals !== undefined) return value === rule.equals;
	return !isEmpty(value);
}

/**
 * Answered / answerable counts for the progress readout. Hidden conditional
 * fields are excluded from both — otherwise the total moves as people answer,
 * which reads as the form growing while you fill it in.
 */
export function countProgress(schema, store) {
	let answered = 0;
	let total = 0;

	const walk = (field) => {
		if (field.showWhen && !matches(field.showWhen, store)) return;

		// A metrics block is six separate questions to the person answering it,
		// and format.js exports it as six rows. Counting it as one would make the
		// progress figure disagree with the review list.
		if (field.type === 'metrics') {
			for (const row of field.rows) {
				total += 1;
				const cell = store.get(field.id)?.[row.id];
				if (cell?.notTracked || !isEmpty(cell?.value)) answered += 1;
			}
			return;
		}

		total += 1;
		if (store.isAnswered(field.id)) answered += 1;

		for (const option of field.options || []) {
			if (!option.reveal) continue;
			const chosen = [].concat(store.get(field.id) ?? []);
			if (!chosen.includes(option.value)) continue;
			for (const sub of option.reveal) walk(sub);
		}
	};

	for (const section of schema.sections) for (const field of section.fields) walk(field);
	return { answered, total };
}

export function sectionProgress(section, store) {
	return countProgress({ sections: [section] }, store);
}
