/*
 * SERVER ONLY. Never import this from anything under public/.
 *
 * This module holds two things the customer must not see:
 *
 *   markdownFromFlat()  the Drive report — harmless in itself, but it belongs
 *                       with the code below
 *   deriveSignals()     the consultant's own reading of the answers, taken from
 *                       the internal section at the end of the source
 *                       questionnaire, which is marked "INTERNAL — DO NOT SEND
 *                       TO CLIENT"
 *
 * The signals say things like "no internal owner named, the program will not
 * survive Phase 3, propose Phase 1 only". That is a commercial judgement about
 * the very company filling the form in. Anything under public/ is downloadable
 * by the customer, so this logic runs here, on the server, and reaches nobody
 * but Tommy's inbox and his Drive.
 *
 * Building the report here rather than in Apps Script also means there is one
 * implementation, not two: Code.gs receives finished text and only has to store
 * and send it.
 */

const NOT_ANSWERED = '— not answered —';

/**
 * Build the Markdown report from the flattened question/answer pairs the client
 * submitted. It works off labels rather than the schema on purpose — a later
 * rewording of a question cannot retrospectively change what an old submission
 * appears to say.
 */
export function markdownFromFlat(flat, meta = {}) {
	const lines = [];
	const answers = meta.answers || {};

	lines.push('# Part A — Pre-Proposal');
	lines.push('');
	lines.push('Flexographic Printing Standardization Program');
	lines.push('');
	lines.push(`**Company:** ${answers.a_company_name || meta.company || 'Unknown company'}`);
	if (answers.a_site_address) lines.push(`**Site:** ${answers.a_site_address}`);
	if (answers.a_contact_name) lines.push(`**Contact:** ${answers.a_contact_name}`);
	if (answers.a_contact_email) lines.push(`**Email:** ${answers.a_contact_email}`);
	if (answers.a_contact_phone) lines.push(`**Phone / WeChat:** ${answers.a_contact_phone}`);
	lines.push(`**Submitted:** ${meta.submittedAt || ''}`);
	lines.push(`**Reference:** ${meta.code || ''}`);
	lines.push(`**Schema version:** ${meta.schemaVersion || ''}`);
	lines.push('');

	const answered = flat.filter((row) => row.answer).length;
	lines.push(`**Answered:** ${answered} of ${flat.length} applicable questions.`);
	lines.push('');
	lines.push('> Blank answers are meaningful. The questionnaire explicitly invites them, so an');
	lines.push('> unanswered question usually means the information is not tracked or not to hand,');
	lines.push('> which is itself diagnostic.');
	lines.push('');

	let section = null;
	for (const row of flat) {
		if (row.section !== section) {
			section = row.section;
			lines.push('');
			lines.push(`## ${row.section}. ${row.sectionTitle}`);
			lines.push('');
		}
		lines.push(`**${row.question}**`);
		lines.push('');
		if (!row.answer) lines.push(`*${NOT_ANSWERED}*`);
		else if (row.answer.includes('\n')) for (const line of row.answer.split('\n')) lines.push(`- ${line}`);
		else lines.push(row.answer);
		lines.push('');
	}

	return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/* ---------------------------------------------------------------- signals */

const isBlank = (value) => {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return false;
};

export function deriveSignals(answers = {}) {
	const signals = [];
	const has = (id, ...values) => values.includes(answers[id]);
	const list = (id) => [].concat(answers[id] ?? []);

	const noControls = isBlank(answers.e1_controls) || list('e1_controls').includes('none');
	const perfRows = Object.values(answers.f_performance || {});
	const noBaseline = perfRows.length === 0 || perfRows.every((row) => row?.notTracked || isBlank(row?.value));

	if (noControls && noBaseline) {
		signals.push(
			'No baseline exists — E1 is empty and F is untracked. Phase 1 will run longer and they likely underestimate the gap. Manage expectations before quoting.',
		);
	}
	if (has('h3_internal_owner', 'no', 'not_sure')) {
		signals.push(
			'No internal owner named (H3) — the strongest predictor that the program will not survive Phase 3. Raise it in the call; consider proposing Phase 1 only.',
		);
	}
	if (has('h4_training_release', 'difficult')) {
		signals.push('Operators cannot be released for training (H4) — Phase 3 training will be compressed and will fail. Settle before contracting.');
	}
	if (has('h1_previous_program', 'yes')) {
		signals.push(
			`Previous improvement program attempted (H1). Outcome given: "${answers.h1_outcome || 'not stated'}". Find out why before proposing — repeating the structure repeats the result, and you own the second failure.`,
		);
	}
	if (list('g1_frequent_issues').includes('substrate') && has('d3_substrate', 'in_house', 'both')) {
		signals.push(
			'Substrate problems (G1) with in-house substrate production (D3) — the substrate-to-print handover is likely the largest single opportunity. Lead the proposal with it.',
		);
	}
	if (list('i1_drivers').includes('customer_pressure') && has('b3_customer_standards', 'yes')) {
		signals.push(
			'Customer pressure (I1) plus a defined external target (B3) — external urgency and a measurable goal. Strongest case for the full package.',
		);
	}
	if (has('i3_budget', 'not_yet')) {
		signals.push('No budget approved (I3) — expect a long approval cycle. Phase 1 standalone is the easier internal sell.');
	}
	if (has('b6_job_structure', 'mostly_spot')) {
		signals.push('Mostly spot colours (B6) — fingerprint design and Phase 2 curve work are simpler. Consider trimming days.');
	}
	if (has('a4_nda', 'yes_yours')) {
		signals.push('Client NDA required (A4) — review it for IP ownership over your methodology and templates before signing.');
	}
	if (has('c2_other_processes', 'yes')) {
		signals.push(`Gravure or other processes on site (C2), scope preference: ${answers.c2_gravure_scope || 'not stated'}. Do not assume flexo only.`);
	}
	if (has('a2_prepress_location', 'no', 'outsourced') || has('a1_multi_site', 'multi')) {
		signals.push('Multi-site or off-site prepress (A1/A2) — likely a separate engagement or added days. Check before pricing.');
	}
	// Travel is the first thing that moves the price. Guangdong is same-day by
	// rail from Hong Kong; anywhere else usually means flights and a travel day.
	if (answers.a_site_address && !/guangdong|guangzhou|shenzhen|dongguan|foshan|zhongshan|zhuhai|huizhou|jiangmen|广东|广州|深圳|东莞|佛山|中山|珠海|惠州|江门/i.test(answers.a_site_address)) {
		signals.push(
			`Site is "${answers.a_site_address}" — check travel. Outside Guangdong usually means flights and an extra travel day, so the proposal needs repricing.`,
		);
	}

	return signals;
}

/** Short header used in both the email and the spreadsheet summary row. */
export function buildSummary(answers = {}, { code, company, submittedAt } = {}) {
	return {
		company: answers.a_company_name || company || '',
		site: answers.a_site_address || '',
		contact: answers.a_contact_name || '',
		email: answers.a_contact_email || '',
		phone: answers.a_contact_phone || '',
		employees: answers.a_employees || '',
		code: code || '',
		submittedAt: submittedAt || '',
	};
}
