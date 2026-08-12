/*
 * PART B — PRE-VISIT PREPARATION, shown read-only.
 *
 * Nothing here is collected yet. It exists because the source document is
 * explicit about why: "Part B is included so you can see what will be required
 * later, and so any potential obstacle can be raised early." Two items have
 * lead times long enough to wreck a visit if they surface in the final week —
 * photography permission and the fingerprint test plate — so both are called
 * out rather than buried in a list.
 *
 * When Part B becomes a real form, replace this with a full schema in the shape
 * of schema.partA.js; render.js and format.js already handle it.
 */

export const partBPreview = {
	title: 'Part B — Pre-Visit Preparation',
	intro:
		'For information only — there is nothing to complete now. Part B is filled in after an agreement is signed, at least three weeks before the on-site visit. It is shown here so you can see what will be needed and raise anything difficult early.',

	sections: [
		{
			id: 'K',
			title: 'Site Access & Security',
			note: 'Photography needs an early answer. The diagnostic report is built on photographic evidence of equipment condition, defects and setup practice. If cameras are not permitted on your production floor, please tell us as soon as possible so the report format and evidence method can be adapted before the visit.',
			items: [
				'Visit coordinator — name, title, mobile and WeChat',
				'Visitor registration: advance notice, ID or passport copies, background checks',
				'Site entry documents required',
				'Whether photographs may be taken on the production floor, and any restricted areas',
				'Whether measurement data may be exported from your systems (waste logs, job records)',
				'Whether portable test equipment may be brought on site — spectrophotometer, anilox scope, dyne pens, dot gauge',
				'Safety induction and PPE arrangements',
				'Hygiene requirements in production areas — common in food and pharmaceutical packaging',
			],
		},
		{
			id: 'L',
			title: 'Scheduling',
			note: 'The visit must take place during genuine production. A specially prepared demonstration day will not produce a valid baseline.',
			items: [
				'Proposed visit dates and confirmed shift times',
				'Which shifts should be observed — shift-to-shift variation is one of the strongest indicators of undocumented process knowledge, so night-shift observation usually means one late or early session',
				'Whether normal commercial production will be running throughout',
				'The planned production schedule for the visit week — which jobs on which presses',
				'Any conflicts: customer audits, maintenance shutdown, holidays',
			],
		},
		{
			id: 'M',
			title: 'On-Site Working Arrangements',
			items: [
				'A desk or meeting room with power',
				'Internet access for the consultant',
				'Nearest suitable hotel and distance from site',
				'Transport between hotel and site',
				'Canteen or meal arrangements',
			],
		},
		{
			id: 'N',
			title: 'People to be Made Available',
			items: [
				'Internal counterpart who accompanies throughout',
				'Production or plant manager, for kick-off and closing',
				'Prepress lead, plate room lead, ink room lead',
				'Substrate production lead, if produced in-house',
				'Quality manager and maintenance lead',
				'Shift supervisors from all shifts',
				'Two to three senior operators per shift, about 20 minutes each',
			],
		},
		{
			id: 'O',
			title: 'Documents to Prepare',
			note: 'Gather only what already exists. Incomplete is fine — please do not create documents for this purpose. Sending them one to two weeks ahead means on-site time is spent on the production floor rather than reading in an office.',
			items: [
				'Press specifications and equipment list',
				'Anilox inventory list, with original engraving certificates if retained',
				'Current TVI / dot gain curve files',
				'Colour standards and customer specifications',
				'Plate and ink supplier specifications, technical data sheets, recent delivery records',
				'Substrate specifications, and in-house production records if applicable',
				'Waste, rework, reprint and customer complaint data for the past 12 months',
				'Existing SOPs, work instructions, maintenance records and calibration certificates',
				'Recent problem samples, with a note of what went wrong',
			],
		},
		{
			id: 'P',
			title: 'Controlled Fingerprint Run',
			note: 'The test plate has a lead time and a cost. A test form must be plated before the run, and plates are usually bought in. An existing repeat job can be used as the fingerprint reference instead — cheaper and faster, though it yields less complete data. Either approach works, but the decision should be made when dates are confirmed, not on the day.',
			items: [
				'Nominated press — usually the highest volume or most representative',
				'Nominated substrate, and whether enough is in stock',
				'Ink set to be used',
				'Whether prepress can accept and process a supplied test file (PDF)',
				'Plate supplier lead time, and who bears the plate cost',
				'Press time available for the run, and who authorises taking a press out of production',
			],
		},
		{
			id: 'Q',
			title: 'Final Confirmation',
			note: 'Where operators are told an audit is happening but not why, defensive or altered behaviour is common and reduces the value of observation. A brief, honest explanation — that the purpose is to improve the process, not to assess individuals — produces markedly better results. We can supply suggested wording.',
			items: [
				'Anything about site conditions, access or culture that would help the visit go smoothly',
				'Whether the workforce has been told an external assessment will take place',
			],
		},
	],
};

export default partBPreview;
