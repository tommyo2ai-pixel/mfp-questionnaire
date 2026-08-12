/*
 * PART A — PRE-PROPOSAL QUESTIONNAIRE
 * Flexographic Printing Standardization Program · Ming Fong Paper Limited
 *
 * This file IS the questionnaire. Nothing else hard-codes a question, a label
 * or an option — render.js turns this data into the form, format.js turns it
 * plus the answers into the Markdown and spreadsheet rows that land in Drive.
 * To reword a question, edit it here and nowhere else.
 *
 * -------------------------------------------------------------------------
 * FIELD TYPES
 *
 *   text      single line
 *   email     single line, validated
 *   textarea  multi-line
 *   number    numeric, optional `unit` shown after the box
 *   radio     pick one from `options`
 *   checkbox  pick any from `options`; `max` caps how many
 *   select    pick one from a long `options` list, as a dropdown
 *   phone     country dialling code + number, stored as { dial, number }
 *   table     repeatable rows defined by `columns`
 *   metrics   the Section F performance grid — each row has a value, a unit
 *             and a "Not tracked" toggle
 *
 * CONDITIONAL FOLLOW-UPS — two mechanisms, deliberately kept distinct:
 *
 *   option.reveal    fields shown inline when THAT option is chosen, for the
 *                    document's "☐ Yes — how many: ___" pattern
 *   field.showWhen   a whole separate question that depends on an earlier
 *                    answer: { field: 'c2_other_processes', in: ['yes'] }
 *
 * IDS ARE PERMANENT. They become JSON keys in Drive and column keys in the
 * spreadsheet. Rewording a label is free; changing an id orphans every answer
 * already collected, so add a new field instead.
 * -------------------------------------------------------------------------
 */

import { COUNTRIES } from './countries.js';

export const SCHEMA_VERSION = 'A-1.1';

export const partA = {
	id: 'partA',
	title: 'Part A — Pre-Proposal',
	subtitle: 'Flexographic Printing Standardization Program',

	/* Shown once above the first section. Mirrors the covering note in the
	   source document — it is what stops people abandoning the form when they
	   hit a question they cannot answer. */
	preamble: [
		'This lets us scope and price the proposal against your actual operation, rather than a generic assumption. It takes about 25 minutes.',
		'Please answer only what you know. Blank or approximate answers are acceptable and useful — gaps in available information are themselves diagnostic. Please do not spend time researching answers you do not have to hand.',
		'Your answers save automatically. You can close this page and come back later using the same link and code.',
		'All information is treated as confidential and used only for proposal preparation.',
	],

	sections: [
		/* ================================================================= A */
		{
			id: 'A',
			title: 'Company & Contact',
			fields: [
				{
					id: 'a_company_name',
					type: 'text',
					label: 'Company name',
					required: true,
				},
				{
					id: 'a_site_country',
					type: 'select',
					label: 'Country / region of the site',
					options: COUNTRIES,
					placeholder: 'Select a country or region',
				},
				{
					id: 'a_site_address',
					type: 'textarea',
					rows: 3,
					label: 'Site address',
					hint: 'Street, district, city and province. This affects travel arrangements for the visit, so the more complete the better.',
				},
				{
					id: 'a_contact_name',
					type: 'text',
					label: 'Contact name and title',
				},
				{
					id: 'a_contact_email',
					type: 'email',
					label: 'Email',
					required: true,
					hint: 'We reply to this address, so it is the one answer we do need.',
				},
				{
					id: 'a_contact_phone',
					type: 'phone',
					label: 'Phone / WeChat',
					hint: 'Pick the country code, then type the number.',
				},
				{
					id: 'a_employees',
					type: 'number',
					label: 'Number of employees at this site',
				},
				{
					id: 'a1_multi_site',
					type: 'radio',
					number: 'A1',
					label: 'Is printing carried out at more than one site?',
					options: [
						{ value: 'one', label: 'No, one site' },
						{
							value: 'multi',
							label: 'Yes',
							reveal: [{ id: 'a1_site_count', type: 'number', label: 'How many sites' }],
						},
					],
				},
				{
					id: 'a2_prepress_location',
					type: 'radio',
					number: 'A2',
					label: 'Is prepress located at this same site?',
					options: [
						{ value: 'yes', label: 'Yes' },
						{
							value: 'no',
							label: 'No',
							reveal: [{ id: 'a2_prepress_where', type: 'text', label: 'Where is it located' }],
						},
						{ value: 'outsourced', label: 'Outsourced' },
					],
				},
				{
					id: 'a3_report_recipients',
					type: 'checkbox',
					number: 'A3',
					label: 'Who will receive and act on the diagnostic report?',
					hint: 'Tick all that apply.',
					options: [
						{ value: 'gm', label: 'General Manager / owner' },
						{ value: 'production_manager', label: 'Production Manager' },
						{ value: 'quality_manager', label: 'Quality Manager' },
						{ value: 'technical_manager', label: 'Technical Manager' },
						{ value: 'group_parent', label: 'Group / parent company' },
						{
							value: 'other',
							label: 'Other',
							reveal: [{ id: 'a3_recipients_other', type: 'text', label: 'Please specify' }],
						},
					],
				},
				{
					id: 'a4_nda',
					type: 'radio',
					number: 'A4',
					label: 'Is a signed non-disclosure agreement required before we begin?',
					options: [
						{ value: 'yes_ours', label: 'Yes — we will provide our template' },
						{ value: 'yes_yours', label: 'Yes — please use ours' },
						{ value: 'no', label: 'No' },
						{ value: 'not_sure', label: 'Not sure' },
					],
				},
			],
		},

		/* ================================================================= B */
		{
			id: 'B',
			title: 'Products & Customers',
			fields: [
				{
					id: 'b1_products',
					type: 'checkbox',
					number: 'B1',
					label: 'Main products printed',
					hint: 'Tick all that apply.',
					options: [
						{ value: 'flexible_packaging', label: 'Flexible packaging' },
						{ value: 'labels', label: 'Labels' },
						{ value: 'folding_carton', label: 'Folding carton' },
						{ value: 'corrugated', label: 'Corrugated' },
						{ value: 'paper_tissue', label: 'Paper / tissue' },
						{
							value: 'other',
							label: 'Other',
							reveal: [{ id: 'b1_products_other', type: 'text', label: 'Please specify' }],
						},
					],
				},
				{
					id: 'b2_end_markets',
					type: 'checkbox',
					number: 'B2',
					label: 'Main end markets',
					options: [
						{ value: 'food', label: 'Food' },
						{ value: 'beverage', label: 'Beverage' },
						{ value: 'pharmaceutical', label: 'Pharmaceutical' },
						{ value: 'personal_care', label: 'Personal care' },
						{ value: 'household', label: 'Household' },
						{ value: 'industrial', label: 'Industrial' },
						{
							value: 'other',
							label: 'Other',
							reveal: [{ id: 'b2_end_markets_other', type: 'text', label: 'Please specify' }],
						},
					],
				},
				{
					id: 'b3_customer_standards',
					type: 'radio',
					number: 'B3',
					label: 'Do any customers impose their own colour or quality standards (brand-owner specifications, supplier audits)?',
					options: [
						{
							value: 'yes',
							label: 'Yes',
							reveal: [{ id: 'b3_standards_which', type: 'text', label: 'Which standards or customers' }],
						},
						{ value: 'no', label: 'No' },
						{ value: 'not_sure', label: 'Not sure' },
					],
				},
				{
					id: 'b4_repeat_share',
					type: 'number',
					number: 'B4',
					label: 'Approximate share of business that is repeat / recurring work',
					unit: '%',
				},
				{
					id: 'b5_active_skus',
					type: 'number',
					number: 'B5',
					label: 'Approximate number of active jobs or SKUs printed regularly',
				},
				{
					id: 'b6_job_structure',
					type: 'radio',
					number: 'B6',
					label: 'Typical job structure',
					options: [
						{ value: 'mostly_spot', label: 'Mostly spot colours' },
						{ value: 'mostly_process', label: 'Mostly process (CMYK)' },
						{ value: 'combination', label: 'Combination' },
						{ value: 'varies', label: 'Varies widely' },
					],
				},
			],
		},

		/* ================================================================= C */
		{
			id: 'C',
			title: 'Equipment',
			fields: [
				{
					id: 'c1_presses',
					type: 'table',
					number: 'C1',
					label: 'Flexographic presses',
					hint: 'Add a row per press. Approximate details are fine — leave anything you are unsure of blank.',
					addLabel: 'Add another press',
					rowLabel: 'Press',
					minRows: 1,
					columns: [
						{ id: 'make_model', label: 'Make / model' },
						{ id: 'year', label: 'Year' },
						{ id: 'web_width', label: 'Web width (m)' },
						{ id: 'colours', label: 'Colours' },
						{ id: 'max_speed', label: 'Max speed (m/min)' },
						{ id: 'substrates', label: 'Substrates run' },
					],
				},
				{
					id: 'c2_other_processes',
					type: 'radio',
					number: 'C2',
					label: 'Do you also run gravure or other printing processes at this site?',
					options: [
						{
							value: 'yes',
							label: 'Yes',
							reveal: [{ id: 'c2_line_count', type: 'number', label: 'How many lines' }],
						},
						{ value: 'no', label: 'No' },
					],
				},
				{
					id: 'c2_gravure_scope',
					type: 'radio',
					label: 'Should gravure be included in the scope of this program?',
					showWhen: { field: 'c2_other_processes', in: ['yes'] },
					options: [
						{ value: 'include', label: 'Yes, include' },
						{ value: 'flexo_only', label: 'No, flexo only' },
						{ value: 'undecided', label: 'Undecided — please advise' },
					],
				},
				{
					id: 'c3_diagnostic_scope',
					type: 'radio',
					number: 'C3',
					label: 'Should the diagnostic cover all presses, or a nominated subset?',
					options: [
						{ value: 'all', label: 'All presses' },
						{
							value: 'subset',
							label: 'Subset',
							reveal: [{ id: 'c3_subset_which', type: 'text', label: 'Which presses' }],
						},
						{ value: 'advise', label: 'Please advise' },
					],
				},
				{
					id: 'c4_anilox_count',
					type: 'number',
					number: 'C4',
					label: 'Approximate number of anilox rolls in inventory',
				},
				{
					id: 'c5_shifts',
					type: 'radio',
					number: 'C5',
					label: 'Number of shifts operated',
					options: [
						{ value: '1', label: '1 shift' },
						{ value: '2', label: '2 shifts' },
						{ value: '3', label: '3 shifts' },
					],
				},
				{
					id: 'c5_shift_times',
					type: 'text',
					label: 'Shift start and end times',
					hint: 'For example: 08:00–16:00, 16:00–24:00',
				},
				{
					id: 'c5_operators',
					type: 'number',
					label: 'Total press operators',
				},
				{
					id: 'c6_prepress_software',
					type: 'text',
					number: 'C6',
					label: 'What prepress workflow / RIP software do you use?',
					hint: 'For example Esko Automation Engine, Hybrid, Kodak, other — approximate is fine.',
				},
			],
		},

		/* ================================================================= D */
		{
			id: 'D',
			title: 'Supply Chain',
			fields: [
				{
					id: 'd1_plates',
					type: 'radio',
					number: 'D1',
					label: 'Printing plates',
					options: [
						{ value: 'in_house', label: 'Made in-house' },
						{ value: 'purchased', label: 'Purchased from external supplier' },
						{ value: 'both', label: 'Both' },
					],
				},
				{
					id: 'd1_plate_suppliers',
					type: 'number',
					label: 'Number of plate suppliers',
					showWhen: { field: 'd1_plates', in: ['purchased', 'both'] },
				},
				{
					id: 'd1_written_specs',
					type: 'radio',
					label: 'Do you receive written specifications from them?',
					showWhen: { field: 'd1_plates', in: ['purchased', 'both'] },
					options: [
						{ value: 'yes', label: 'Yes' },
						{ value: 'no', label: 'No' },
						{ value: 'not_sure', label: 'Not sure' },
					],
				},
				{
					id: 'd1_plate_lead_time',
					type: 'number',
					label: 'Typical lead time for a new plate',
					unit: 'days',
					showWhen: { field: 'd1_plates', in: ['purchased', 'both'] },
				},
				{
					id: 'd2_ink',
					type: 'radio',
					number: 'D2',
					label: 'Printing ink',
					options: [
						{ value: 'in_house', label: 'Mixed / manufactured in-house' },
						{ value: 'purchased', label: 'Purchased ready-to-use' },
						{ value: 'both', label: 'Both' },
					],
				},
				{
					id: 'd2_ink_type',
					type: 'checkbox',
					label: 'Ink type',
					options: [
						{ value: 'water_based', label: 'Water-based' },
						{ value: 'solvent_based', label: 'Solvent-based' },
						{ value: 'uv', label: 'UV' },
						{ value: 'mixed', label: 'Mixed' },
					],
				},
				{
					id: 'd2_ink_suppliers',
					type: 'number',
					label: 'Number of ink suppliers',
					showWhen: { field: 'd2_ink', in: ['purchased', 'both'] },
				},
				{
					id: 'd3_substrate',
					type: 'radio',
					number: 'D3',
					label: 'Substrate',
					options: [
						{ value: 'in_house', label: 'Manufactured in-house' },
						{ value: 'purchased', label: 'Purchased' },
						{ value: 'both', label: 'Both' },
					],
				},
				{
					id: 'd3_same_department',
					type: 'radio',
					label: 'Is substrate production managed by the same department as printing?',
					showWhen: { field: 'd3_substrate', in: ['in_house', 'both'] },
					options: [
						{ value: 'yes', label: 'Yes' },
						{ value: 'no', label: 'No' },
					],
				},
				{
					id: 'd4_incoming_inspection',
					type: 'radio',
					number: 'D4',
					label: 'Do you carry out any incoming inspection on purchased plates, ink or substrate?',
					options: [
						{ value: 'documented', label: 'Yes, documented' },
						{ value: 'informal', label: 'Yes, informal' },
						{ value: 'none', label: 'No' },
					],
				},
			],
		},

		/* ================================================================= E */
		{
			id: 'E',
			title: 'Current Process Control',
			fields: [
				{
					id: 'e1_controls',
					type: 'checkbox',
					number: 'E1',
					label: 'Which of the following do you currently have?',
					hint: 'Tick all that apply. Ticking nothing is a valid and useful answer.',
					options: [
						{ value: 'written_sops', label: 'Written SOPs for press operation' },
						{ value: 'colour_standards', label: 'Documented colour standards with numerical tolerances (e.g. ΔE limits)' },
						{ value: 'tvi_curves', label: 'Dot gain / TVI curves applied in prepress' },
						{ value: 'anilox_register', label: 'Anilox inventory register with volumes recorded' },
						{ value: 'first_off', label: 'Recorded first-off approval procedure' },
						{ value: 'in_process_checks', label: 'Logged in-process quality checks' },
						{ value: 'preventive_maintenance', label: 'Preventive maintenance schedule' },
						{ value: 'none', label: 'None of the above / not sure', exclusive: true },
					],
				},
				{
					id: 'e2_instruments',
					type: 'checkbox',
					number: 'E2',
					label: 'Measurement instruments available on site',
					hint: 'Tick all that apply.',
					options: [
						{
							value: 'spectrophotometer',
							label: 'Spectrophotometer',
							reveal: [{ id: 'e2_spectro_model', type: 'text', label: 'Make / model, if known' }],
						},
						{ value: 'densitometer', label: 'Densitometer' },
						{ value: 'plate_dot', label: 'Plate dot measurement device / loupe' },
						{ value: 'anilox_inspection', label: 'Anilox inspection device' },
						{
							value: 'viscosity_cup',
							label: 'Viscosity cup',
							reveal: [{ id: 'e2_viscosity_type', type: 'text', label: 'Type of cup' }],
						},
						{ value: 'ph_meter', label: 'pH meter' },
						{ value: 'dyne_pens', label: 'Dyne pens or test fluids' },
						{ value: 'viewing_booth', label: 'Standard viewing booth (D50)' },
						{ value: 'none', label: 'None / not sure', exclusive: true },
					],
				},
				{
					id: 'e2_calibrated',
					type: 'radio',
					label: 'For any instruments held — are they calibrated on a schedule?',
					options: [
						{ value: 'yes', label: 'Yes' },
						{ value: 'no', label: 'No' },
						{ value: 'not_sure', label: 'Not sure' },
					],
				},
				{
					id: 'e3_colour_approval',
					type: 'radio',
					number: 'E3',
					label: 'How is colour approved at the press?',
					options: [
						{ value: 'measured', label: 'Measured against a numerical target' },
						{ value: 'visual', label: 'Visual comparison to an approved sample' },
						{ value: 'operator_judgement', label: 'Operator judgement' },
						{ value: 'varies', label: 'Varies by job or by operator' },
					],
				},
				{
					id: 'e4_impression',
					type: 'radio',
					number: 'E4',
					label: 'How is impression set?',
					options: [
						{ value: 'written_procedure', label: 'Defined written procedure' },
						{ value: 'automatic', label: 'Automatic / press-assisted' },
						{ value: 'operator_experience', label: 'Operator experience' },
					],
				},
			],
		},

		/* ================================================================= F */
		{
			id: 'F',
			title: 'Current Performance',
			intro: 'Approximate figures are sufficient. If a figure is not tracked, tick "Not tracked" — that is genuinely useful information, not a gap to apologise for.',
			fields: [
				{
					id: 'f_performance',
					type: 'metrics',
					label: 'Current performance figures',
					rows: [
						{ id: 'f_makeready_time', label: 'Average makeready time per job', unit: 'minutes' },
						{ id: 'f_makeready_waste', label: 'Average makeready waste per job', unit: 'metres / kg' },
						{ id: 'f_running_waste', label: 'Running waste rate', unit: '%' },
						{ id: 'f_reprint_rate', label: 'Reprint / rework rate', unit: '%' },
						{ id: 'f_complaints_month', label: 'Customer complaints per month', unit: 'per month' },
						{ id: 'f_oee', label: 'Overall equipment effectiveness (OEE), if measured', unit: '%' },
					],
				},
				{
					id: 'f1_data_available',
					type: 'radio',
					number: 'F1',
					label: 'Do you have waste, rework and complaint data available for the past 12 months?',
					options: [
						{ value: 'systematic', label: 'Yes, systematically recorded' },
						{ value: 'partial', label: 'Partially' },
						{ value: 'no', label: 'No' },
					],
				},
			],
		},

		/* ================================================================= G */
		{
			id: 'G',
			title: 'Problems & Priorities',
			fields: [
				{
					id: 'g1_frequent_issues',
					type: 'checkbox',
					number: 'G1',
					label: 'Which issues occur most often?',
					hint: 'Tick up to four.',
					max: 4,
					options: [
						{ value: 'colour_between_runs', label: 'Colour inconsistency between runs of the same job' },
						{ value: 'colour_between_shifts', label: 'Colour inconsistency between shifts or operators' },
						{ value: 'colour_between_presses', label: 'Colour inconsistency between presses' },
						{ value: 'long_makeready', label: 'Long makeready times' },
						{ value: 'high_waste', label: 'High waste' },
						{ value: 'print_defects', label: 'Recurring print defects (banding, pinholing, ghosting, mottle, etc.)' },
						{ value: 'register', label: 'Register problems' },
						{ value: 'substrate', label: 'Substrate-related problems (treatment, adhesion, gauge)' },
						{ value: 'plate_quality', label: 'Plate quality or consistency' },
						{ value: 'ink_quality', label: 'Ink quality or consistency' },
						{ value: 'complaints', label: 'Customer complaints or rejections' },
						{ value: 'staff_loss', label: 'Loss of experienced staff / knowledge' },
					],
				},
				{
					id: 'g2_biggest_problem',
					type: 'textarea',
					number: 'G2',
					label: 'Please briefly describe the single problem causing you the most cost or difficulty',
					rows: 4,
				},
				{
					id: 'g3_desired_outcome',
					type: 'textarea',
					number: 'G3',
					label: 'What outcome would make this program clearly worthwhile for you?',
					rows: 4,
				},
			],
		},

		/* ================================================================= H */
		{
			id: 'H',
			title: 'Organisation & Readiness',
			fields: [
				{
					id: 'h1_previous_program',
					type: 'radio',
					number: 'H1',
					label: 'Has the company attempted a standardization or quality improvement program before?',
					options: [
						{
							value: 'yes',
							label: 'Yes',
							reveal: [
								{
									id: 'h1_outcome',
									type: 'textarea',
									label: 'What was the outcome?',
									rows: 3,
									hint: 'An honest answer here is more useful than a positive one — it tells us what to do differently.',
								},
							],
						},
						{ value: 'no', label: 'No' },
					],
				},
				{
					id: 'h2_certifications',
					type: 'checkbox',
					number: 'H2',
					label: 'Do you hold any certifications?',
					options: [
						{ value: 'iso9001', label: 'ISO 9001' },
						{ value: 'iso12647', label: 'ISO 12647' },
						{ value: 'g7', label: 'G7' },
						{ value: 'brc_fssc', label: 'BRC / FSSC' },
						{
							value: 'other',
							label: 'Other',
							reveal: [{ id: 'h2_certifications_other', type: 'text', label: 'Please specify' }],
						},
						{ value: 'none', label: 'None', exclusive: true },
					],
				},
				{
					id: 'h3_internal_owner',
					type: 'radio',
					number: 'H3',
					label: 'Is there a person who could be assigned to own the standard internally after the program?',
					options: [
						{
							value: 'yes_identified',
							label: 'Yes, identified',
							reveal: [{ id: 'h3_owner_role', type: 'text', label: 'Their role' }],
						},
						{ value: 'yes_not_identified', label: 'Yes, but not yet identified' },
						{ value: 'no', label: 'No' },
						{ value: 'not_sure', label: 'Not sure' },
					],
				},
				{
					id: 'h4_training_release',
					type: 'radio',
					number: 'H4',
					label: 'Can operators realistically be released from production for training?',
					options: [
						{ value: 'full', label: 'Yes, full sessions' },
						{ value: 'short', label: 'Only short sessions' },
						{ value: 'difficult', label: 'Difficult' },
						{ value: 'not_sure', label: 'Not sure' },
					],
				},
				{
					id: 'h5_press_time',
					type: 'radio',
					number: 'H5',
					label: 'Can press time be made available for a controlled test run (2–3 hours)?',
					options: [
						{ value: 'yes', label: 'Yes' },
						{ value: 'with_planning', label: 'With planning' },
						{ value: 'difficult', label: 'Difficult' },
					],
				},
				{
					id: 'h6_working_language',
					type: 'checkbox',
					number: 'H6',
					label: 'Working language of production supervisors and operators',
					options: [
						{ value: 'mandarin', label: 'Mandarin' },
						{ value: 'cantonese', label: 'Cantonese' },
						{ value: 'english', label: 'English' },
						{
							value: 'other',
							label: 'Other',
							reveal: [{ id: 'h6_language_other', type: 'text', label: 'Please specify' }],
						},
					],
				},
				{
					id: 'h6_interpreter',
					type: 'radio',
					label: 'Will an interpreter be required for technical discussions?',
					options: [
						{ value: 'no', label: 'No' },
						{ value: 'yes', label: 'Yes' },
						{ value: 'not_sure', label: 'Not sure' },
					],
				},
			],
		},

		/* ================================================================= I */
		{
			id: 'I',
			title: 'Project Framing',
			fields: [
				{
					id: 'i1_drivers',
					type: 'checkbox',
					number: 'I1',
					label: 'What is driving this now?',
					hint: 'Tick all that apply.',
					options: [
						{ value: 'customer_pressure', label: 'Customer or brand-owner pressure' },
						{ value: 'cost_waste', label: 'Cost / waste reduction' },
						{ value: 'quality_complaints', label: 'Quality complaints' },
						{ value: 'new_business', label: 'Preparing for new business or tenders' },
						{ value: 'equipment_investment', label: 'New equipment investment decision' },
						{ value: 'staff_loss', label: 'Loss of key staff' },
						{ value: 'management_initiative', label: 'Management initiative' },
						{
							value: 'other',
							label: 'Other',
							reveal: [{ id: 'i1_drivers_other', type: 'text', label: 'Please specify' }],
						},
					],
				},
				{
					id: 'i2_approach',
					type: 'radio',
					number: 'I2',
					label: 'Preferred approach',
					options: [
						{ value: 'diagnostic_only', label: 'Start with diagnostic only, decide later' },
						{ value: 'full_program', label: 'Full program, if the diagnostic supports it' },
						{ value: 'undecided', label: 'Undecided' },
					],
				},
				{
					id: 'i3_budget',
					type: 'radio',
					number: 'I3',
					label: 'Is a budget range already approved for this?',
					options: [
						{ value: 'yes', label: 'Yes' },
						{ value: 'not_yet', label: 'Not yet' },
						{ value: 'prefer_not_say', label: 'Prefer not to say' },
					],
				},
				{
					id: 'i4_start_timing',
					type: 'radio',
					number: 'I4',
					label: 'Preferred start timing',
					options: [
						{ value: 'within_1_month', label: 'Within 1 month' },
						{ value: '1_3_months', label: '1–3 months' },
						{ value: '3_6_months', label: '3–6 months' },
						{ value: 'undecided', label: 'Undecided' },
					],
				},
				{
					id: 'i5_avoid_period',
					type: 'text',
					number: 'I5',
					label: 'Any period to avoid (peak season, audits, shutdown, public holidays)?',
				},
				{
					id: 'i6_approvers',
					type: 'text',
					number: 'I6',
					label: 'Besides yourself, who else must review or approve the proposal internally?',
				},
			],
		},

		/* ================================================================= J */
		{
			id: 'J',
			title: 'Anything Else',
			fields: [
				{
					id: 'j_anything_else',
					type: 'textarea',
					label: 'Is there anything about your operation, history or constraints that would help us prepare a more accurate proposal?',
					rows: 6,
				},
			],
		},

		/* ========================================================== OPTIONAL */
		{
			id: 'OPT',
			title: 'Optional Documents',
			intro: 'Tick only what already exists and could be shared easily. Please do not create anything for this purpose. Nothing is uploaded here — once you submit, we will reply and you can send whichever of these you ticked by email or WeChat.',
			fields: [
				{
					id: 'opt_documents',
					type: 'checkbox',
					label: 'Documents that already exist and could be shared',
					options: [
						{ value: 'press_list', label: 'Press list or equipment schedule' },
						{ value: 'anilox_inventory', label: 'Anilox inventory list' },
						{ value: 'existing_sops', label: 'Existing SOPs' },
						{ value: 'waste_defect_data', label: 'Waste or defect summary data' },
						{ value: 'customer_specs', label: 'Customer quality specifications' },
						{ value: 'print_samples', label: 'Recent print samples showing a typical problem' },
					],
				},
			],
		},
	],

	/* Shown on the review screen, immediately above the submit button. */
	closing:
		'On receipt we will review your answers and arrange a 30-minute call to clarify a small number of points. The proposal is issued within 5 working days of that call.',
};

export default partA;
