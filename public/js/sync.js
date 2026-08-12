/*
 * Background sync to the server.
 *
 * The store has already written to localStorage by the time we hear about a
 * change, so nothing here is on the critical path for not losing work. This
 * file only decides when to talk to the network, and how to describe what is
 * happening in language that is honest on a bad connection: "saved on this
 * device" is true and reassuring; "saved" alone would not be.
 *
 * Failure is expected, not exceptional. Factory Wi-Fi drops, and this form is
 * mostly filled in from mainland China over links we do not control.
 */

const DEBOUNCE_MS = 3000;
const MAX_BACKOFF_MS = 60000;

export const STATUS_TEXT = {
	saved: 'All answers saved',
	saving: 'Saving…',
	pending: 'Unsaved changes',
	offline: 'Offline — saved on this device',
	error: 'Saved on this device, retrying…',
};

export function createSync({ store, onStatus = () => {} }) {
	let timer = null;
	let inFlight = false;
	let dirty = false;
	let failures = 0;
	let status = 'saved';

	function setStatus(next) {
		if (status === next) return;
		status = next;
		onStatus(next, STATUS_TEXT[next]);
	}

	async function push() {
		if (inFlight) return;
		if (!dirty) return;

		if (!navigator.onLine) {
			setStatus('offline');
			return;
		}

		inFlight = true;
		dirty = false;
		setStatus('saving');

		const snapshot = { answers: store.getAll(), meta: store.getMeta() };

		try {
			const response = await fetch('/api/draft', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(snapshot),
			});

			if (response.status === 401) {
				// The session expired mid-questionnaire. Everything is still on this
				// device, so send them back to the code screen rather than losing it.
				window.dispatchEvent(new CustomEvent('mfp:session-expired'));
				return;
			}
			if (!response.ok) throw new Error(`save failed: ${response.status}`);

			const body = await response.json().catch(() => ({}));
			store.markSynced(body.revision);
			failures = 0;
			setStatus(dirty ? 'pending' : 'saved');
		} catch {
			// Put the change back in the queue and retry with a widening gap, so a
			// long outage does not turn into a request every three seconds.
			dirty = true;
			failures += 1;
			setStatus(navigator.onLine ? 'error' : 'offline');
			const wait = Math.min(DEBOUNCE_MS * 2 ** failures, MAX_BACKOFF_MS);
			clearTimeout(timer);
			timer = setTimeout(push, wait);
		} finally {
			inFlight = false;
		}
	}

	function schedule() {
		dirty = true;
		if (status !== 'saving') setStatus(navigator.onLine ? 'pending' : 'offline');
		clearTimeout(timer);
		timer = setTimeout(push, DEBOUNCE_MS);
	}

	const unsubscribe = store.subscribe((reason) => {
		if (reason === 'local') schedule();
	});

	window.addEventListener('online', () => {
		failures = 0;
		clearTimeout(timer);
		if (dirty) push();
		else setStatus('saved');
	});

	window.addEventListener('offline', () => setStatus(dirty ? 'offline' : 'offline'));

	/*
	 * Last chance to save when the tab goes away. keepalive lets the request
	 * outlive the page; visibilitychange fires on mobile where unload often
	 * does not.
	 */
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState !== 'hidden' || !dirty) return;
		try {
			navigator.sendBeacon?.('/api/draft', new Blob([JSON.stringify({ answers: store.getAll(), meta: store.getMeta() })], { type: 'application/json' }));
		} catch {
			/* best effort only — localStorage already has it */
		}
	});

	return {
		/** Force an immediate save and wait for it — used before submitting. */
		async flush() {
			clearTimeout(timer);
			if (!dirty && !inFlight) return true;
			dirty = true;
			await push();
			return !dirty;
		},
		status: () => status,
		stop() {
			clearTimeout(timer);
			unsubscribe();
		},
	};
}
