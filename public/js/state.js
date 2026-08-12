/*
 * The answer store.
 *
 * One plain object holds every answer, keyed by the field ids in
 * schema.partA.js. Writes go to localStorage synchronously and notify
 * subscribers; sync.js listens and pushes to the server on a debounce. That
 * ordering is deliberate — the customer's work is safe on their own device
 * before the network is involved at all, which is what makes the form usable
 * on unreliable factory Wi-Fi.
 *
 * Answer shapes by field type:
 *   text/email/textarea/number  string
 *   radio                       string (the chosen option value)
 *   checkbox                    array of option values
 *   table                       array of row objects, keyed by column id
 *   metrics                     { rowId: { value: string, notTracked: bool } }
 */

const STORAGE_PREFIX = 'mfp.questionnaire.';

export function createStore(code) {
	const storageKey = STORAGE_PREFIX + code;
	let answers = {};
	let meta = { updatedAt: null, revision: 0 };
	const listeners = new Set();

	function notify(reason) {
		for (const fn of listeners) fn(reason);
	}

	function persist() {
		try {
			localStorage.setItem(storageKey, JSON.stringify({ answers, meta }));
		} catch {
			// Private browsing or a full quota. The in-memory copy still works for
			// this session and the server sync is unaffected, so carry on quietly
			// rather than interrupting someone mid-questionnaire.
		}
	}

	return {
		/** Restore whatever this device has, so a reload never loses work. */
		loadLocal() {
			try {
				const raw = localStorage.getItem(storageKey);
				if (!raw) return false;
				const parsed = JSON.parse(raw);
				answers = parsed.answers || {};
				meta = parsed.meta || meta;
				return true;
			} catch {
				return false;
			}
		},

		/*
		 * Adopt the server's copy — but only when it is genuinely newer.
		 * Someone who filled in a section offline on this device, then opened the
		 * form again before the sync completed, must not have that work replaced
		 * by an older server draft.
		 */
		mergeRemote(remote) {
			if (!remote || !remote.answers) return false;
			const remoteRev = Number(remote.meta?.revision || 0);
			if (remoteRev <= meta.revision) return false;
			answers = remote.answers;
			meta = remote.meta;
			persist();
			notify('remote');
			return true;
		},

		get(id) {
			return answers[id];
		},

		set(id, value) {
			if (deepEqual(answers[id], value)) return;
			if (isEmpty(value)) delete answers[id];
			else answers[id] = value;
			meta.revision += 1;
			meta.updatedAt = new Date().toISOString();
			persist();
			notify('local');
			return true;
		},

		getAll() {
			return answers;
		},

		getMeta() {
			return { ...meta };
		},

		/** Called after a successful server save so revisions stay comparable. */
		markSynced(revision) {
			if (typeof revision === 'number' && revision > meta.revision) meta.revision = revision;
			persist();
		},

		isAnswered(id) {
			return !isEmpty(answers[id]);
		},

		subscribe(fn) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},

		clearLocal() {
			try {
				localStorage.removeItem(storageKey);
			} catch {
				/* nothing we can do, and nothing that matters */
			}
		},
	};
}

/*
 * "Empty" has to cover every answer shape, because an empty answer must not
 * count towards the progress indicator or appear in the Markdown export. A
 * metrics row marked "not tracked" is NOT empty — that is a real answer and
 * the source document treats it as diagnostic.
 */
export function isEmpty(value) {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) {
		if (value.length === 0) return true;
		// A table whose rows are all blank counts as unanswered.
		return value.every((entry) => (typeof entry === 'object' ? isEmpty(Object.values(entry)) : isEmpty(entry)));
	}
	if (typeof value === 'object') {
		if (value.notTracked === true) return false;
		// A phone answer is the number. Picking a country code and typing nothing
		// is not an answer, and must not count towards the progress figure or
		// appear in the export as a bare "+86".
		if ('number' in value && 'dial' in value) return isEmpty(value.number);
		return Object.values(value).every(isEmpty);
	}
	return false;
}

function deepEqual(a, b) {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null || typeof a !== 'object') return false;
	const ka = Object.keys(a);
	const kb = Object.keys(b);
	if (ka.length !== kb.length) return false;
	return ka.every((k) => deepEqual(a[k], b[k]));
}
