# Ming Fong Paper — Pre-Proposal Questionnaire

Digital version of the Part A pre-proposal questionnaire for the Flexographic
Printing Standardization Program. Creating an invite emails the client their own
access code; they log in with it, answer over as many sittings as they need, and
submit once. Answers land in Google Drive as JSON, Markdown and PDF, and Tommy
gets an email.

- **DEPLOY.md** — one-time setup, and how to send a questionnaire day to day
- **INTEGRATION.md** — folding this into the main website later

```bash
node scripts/dev.mjs        # http://localhost:4330, no Google account needed
```

---

## The three decisions that shape everything

**1. The client's browser never contacts Google.** `script.google.com` is
blocked in mainland China, which is where most respondents are. The browser
talks only to the questionnaire's own origin — `mfp-questionnaire.netlify.app`
today, `questionnaire.mingfongpaper.com` once the domain is attached — and a
Netlify function talks to Apps Script server-side, where the block does not
apply.

**2. The questionnaire is data, not markup.** `public/js/schema.partA.js`
describes every question. One renderer builds the form from it, and the same
schema produces the review screen and the exported Markdown. Rewording a
question is a one-line edit in one file.

**3. Answers are saved locally first.** Every keystroke goes to `localStorage`
immediately; the server sync follows on a three-second debounce and retries with
a widening gap. Factory Wi-Fi drops constantly, and a form that loses an hour's
work does not get finished.

---

## Layout

```
public/                      everything the browser downloads
  index.html                 the shell — login, questionnaire, receipt
  assets/app.css             design tokens copied from the marketing site
  assets/fonts/              self-hosted; NOT Google Fonts, which is blocked in China
  js/schema.partA.js         ← the questionnaire itself, in English
  js/schema.partB.js         Part B, shown read-only
  js/i18n.zh-Hant.js         ← the Traditional Chinese of all of the above
  js/i18n.js                 language choice + English-fallback lookup
  js/countries.js            countries + dialling codes, shared by two fields
  js/render.js               schema → DOM, conditionals, repeatable rows
  js/state.js                answer store + localStorage
  js/sync.js                 debounced save, offline queue, status pill
  js/format.js               answers → question/answer pairs
  js/main.js                 screen flow

netlify/functions/           the server
  session.mjs                code → signed session cookie
  draft.mjs                  load and save the draft
  submit.mjs                 finalise; builds the report and the signals
  _lib/session.mjs           HMAC cookie signing (Web Crypto, no dependencies)
  _lib/gas.mjs               the only code that talks to Google
  _lib/report.mjs            SERVER ONLY — Markdown report + internal signals
  _lib/mock-store.mjs        local stand-in for Apps Script, used by dev.mjs

apps-script/Code.gs          the Google backend: sheets, Drive, PDF, email
scripts/dev.mjs              local server; runs the real functions
scripts/check-i18n.mjs       reports anything the Chinese does not cover yet
```

No dependencies, no build step, nothing to `npm install`. Native ES modules,
hand-written CSS, Web Crypto for signing. Netlify publishes `public/` as-is,
which also keeps the download small on slow connections.

---

## Server-only code

`netlify/functions/_lib/report.mjs` holds `deriveSignals()` — the reading of a
client's answers taken from the internal notes at the end of the source
questionnaire ("no internal owner named, the program will not survive Phase 3,
propose Phase 1 only").

**Never move that into `public/`.** Everything under `public/` is downloadable
by the client, and those signals are a commercial judgement about the very
company filling the form in. The source document marks them *DO NOT SEND TO
CLIENT*. The same rule applies to the customer confirmation email in `Code.gs`:
it must never include the signals block.

---

## Editing the questionnaire

Everything is in `public/js/schema.partA.js`. Commit and push; Netlify redeploys
in about a minute.

**Never change an `id`.** Ids become JSON keys in Drive, rows in the Answers
sheet, and the keys the Chinese dictionary is looked up by. Reword labels
freely — every submission stores the question text the client actually saw, so
old submissions stay accurate. To retire a question, delete it; to replace one,
add a new field with a new id.

After any edit here, add the Chinese in `public/js/i18n.zh-Hant.js` and run
`node scripts/check-i18n.mjs`. An untranslated question shows in English rather
than breaking, so this is the only thing that will tell you.

### Field types

| Type | Answer stored as | Notes |
| --- | --- | --- |
| `text`, `email` | string | |
| `textarea` | string | `rows` sets the height |
| `number` | string | typed as text on purpose, so "about 3" and "not tracked" survive; `unit` prints after the box |
| `radio` | option value | |
| `checkbox` | array of values | `max` caps how many; `exclusive: true` on an option makes it clear the others |
| `select` | option value | a dropdown, for lists too long for radios; options flagged `common: true` are repeated in a group at the top |
| `phone` | `{ country, dial, number }` | dialling code + number; the ISO code is stored too because several countries share `+1` |
| `table` | array of row objects | `columns`, `rowLabel`, `addLabel`, `minRows` |
| `metrics` | `{ rowId: { value, notTracked } }` | the Section F grid, each row with a "Not tracked" toggle |

Countries and dialling codes are one shared list in `public/js/countries.js`,
used by both the site-country dropdown and the phone field. Values are ISO
alpha-2 codes, so a Chinese translation later changes every label without
touching a single stored answer.

### Conditional questions

Two mechanisms, kept distinct because they read differently:

```js
// Inline follow-up — the document's "☐ Yes — how many: ___" pattern.
{ value: 'multi', label: 'Yes', reveal: [{ id: 'a1_site_count', type: 'number', label: 'How many sites' }] }

// A separate question that depends on an earlier answer.
{ id: 'c2_gravure_scope', type: 'radio', showWhen: { field: 'c2_other_processes', in: ['yes'] }, … }
```

A `showWhen` question that does not apply is left out of the export entirely,
rather than reported blank — "not applicable" and "left blank" mean very
different things when you read these back.

### Nothing is required

Only `a_company_name` and `a_contact_email` are, because that is how you reply.
Everything else may be blank by design: the source document says gaps in
available information are themselves diagnostic, and the near-empty submission
is the one that triggers the "no baseline exists" signal. Submitting with blanks
asks for confirmation; it never blocks.

---

## Adding Part B as a real form

Part B currently renders read-only from `public/js/schema.partB.js`, as the
source document intends. To make it fillable:

1. Rewrite `schema.partB.js` in the shape of `schema.partA.js` — `render.js` and
   `format.js` already handle everything it needs.
2. Give it its own `SCHEMA_VERSION` (`B-1.0`) and store it under a separate key,
   so Part A stays locked after submission while Part B is still open.
3. In `Code.gs`, write `partB-submission.*` alongside the Part A files in the
   same client folder.

Two questions in Part B have long lead times and should stay prominent wherever
they end up: photography permission (K4) and the fingerprint test plate (P4).

## Languages

English and Traditional Chinese (繁體中文), switched by two buttons in the
header. The choice is remembered in `localStorage`; a first-time visitor whose
browser asks for any `zh-*` locale gets Chinese.

The schema stays English and remains the source of truth.
`public/js/i18n.zh-Hant.js` is a side-car dictionary keyed by field id, and
`public/js/i18n.js` resolves text through it with an English fallback — a key
missing from the dictionary shows English rather than a blank.

**Nothing about a language change touches the data.** Answers are stored as
field ids and option codes, which are language-neutral, so a client can start
in English and finish in Chinese and lose nothing. And what lands in Drive is
**always English**: `flatten()` takes a `lang` and the submission calls it
without one, so two clients reading the form in different languages still
produce comparable files. The submission does record which language was used —
it appears in the Markdown as **Completed in**, so you know which language to
reply in.

Chinese renders in the device's own font (PingFang, Microsoft JhengHei, Noto).
A CJK webfont would be several megabytes, which is exactly what a factory
connection cannot spare.

### Editing the Chinese

Everything is in `i18n.zh-Hant.js`, in three blocks: `ZH_UI` (the interface),
`ZH_PART_A` (the questions) and `ZH_PART_B` (the preview). Field ids and option
values must match `schema.partA.js`; the label text next to them is yours to
change freely.

After adding or renaming a question in the schema, check nothing was missed:

```bash
node scripts/check-i18n.mjs
```

### Adding a third language

Copy `i18n.zh-Hant.js`, translate it, and add the file to the `UI`, `PART_A`
and `PART_B` tables plus the `LANGS` list in `i18n.js`. No other file changes.

---

## Local development

```bash
node scripts/dev.mjs
```

Serves `public/` and routes `/api/*` to the real function modules, with
`_lib/mock-store.mjs` standing in for Google. Two seeded codes:

```
MFP-TEST-0001    Foshan Example Packaging Co., Ltd
MFP-TEST-0002    Jiangsu Sample Printing Co., Ltd
```

Drafts, submissions and the notification email are written to `.local-store/`
so you can read exactly what the real backend would produce. Reset with
`rm -rf .local-store`.

Port 4330 rather than 4321, which the `mfp-website` dev server uses.

---

## Security

- Codes are ~40 bits from an alphabet with no `I`, `O`, `0` or `1`
- Session cookie: HttpOnly, Secure, SameSite=Lax, HMAC-SHA256, 30 days
- Every call to Apps Script carries a shared secret; the browser never has it
- Failed codes pause 600 ms in the function; Apps Script stops answering after
  50 failures in 10 minutes
- Submitting locks the code — further saves and submits return 409
- `noindex` plus `robots.txt` Disallow; the site is invite-only
- No secrets in the repo. `.local-store/` and `.env` are git-ignored

Customer login is **completely separate from Netlify Identity**, which the
marketing site uses for the Decap CMS. Identity accounts reach Git Gateway and
therefore repository write access, so client logins must never touch it.
