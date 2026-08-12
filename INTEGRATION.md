# Folding this into mingfongpaper.com

The questionnaire ships as its own Netlify site — `mfp-questionnaire.netlify.app`
at first, `questionnaire.mingfongpaper.com` once the domain is attached. It does
not have to stay that way. Both sites run on Netlify, so moving it into the main
website is mostly a file copy — the functions run unchanged.

Nothing here is required. A separate site is a perfectly good end state, and it
has one real advantage: a bug in the questionnaire cannot take down the
marketing site, and the two deploy independently.

---

## Option 1 — Link to it (nothing to build)

The questionnaire is invite-only, so it does not need a public link. If you want
one anyway, add a line to the Consultancy page in `mfp-website`:

```astro
<p class="mt-6 text-sm text-muted">
  Existing client with a questionnaire link?
  <a href="https://questionnaire.mingfongpaper.com/" class="text-accent-text">Continue your questionnaire</a>.
</p>
```

Anyone arriving without a code sees the access-code screen, which explains what
to do and gives your email address. That is a reasonable place to land.

---

## Option 2 — Move it to `/questionnaire/` on the main site

Worth doing if you would rather maintain one repository and one deploy.

### What moves

| From here | To `mfp-website` |
| --- | --- |
| `netlify/functions/*` | `netlify/functions/*` — unchanged |
| `public/js/*` | `public/questionnaire/js/*` |
| `public/assets/app.css` | `public/questionnaire/app.css` |
| `public/index.html` | becomes `src/pages/questionnaire/index.astro` |
| `netlify.toml` headers | merged into the existing `netlify.toml` |
| `apps-script/` | copy across for reference; the deployed script does not move |

Fonts do not need copying — the site already self-hosts Space Grotesk and Inter
through Fontsource, so the `@font-face` rules at the top of `app.css` can be
deleted and the site's own fonts used instead.

### The page

`mfp-website` is `output: 'static'`, and it stays that way. The questionnaire is
a client-rendered island; Astro just serves its shell. Because the app owns the
whole screen, render it as its own document rather than through `BaseLayout` —
the same approach `src/pages/admin/index.astro` already takes for the CMS.

```astro
---
// src/pages/questionnaire/index.astro
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Pre-Proposal Questionnaire — Ming Fong Paper Limited</title>
    <link rel="stylesheet" href="/questionnaire/app.css" />
  </head>
  <body>
    <!-- header, main#app and footer, copied from public/index.html -->
    <script type="module" src="/questionnaire/js/main.js"></script>
  </body>
</html>
```

### Three things that will bite

**1. Keep it out of the sitemap.** `astro.config.mjs` already filters
`/contact/thanks/` and `/admin/`. Add the questionnaire:

```js
filter: (page) =>
  !page.endsWith('/contact/thanks/') &&
  !page.includes('/admin/') &&
  !page.includes('/questionnaire/'),
```

**2. `trailingSlash: 'always'` applies to the whole site.** The API paths are
declared in each function's `config.path` (`/api/session` and so on) and are
served by the function router, not by Astro, so they are unaffected. But make
sure nothing rewrites `/api/session` to `/api/session/`, and keep the fetch
calls in the client exactly as they are.

**3. Do not reuse Netlify Identity.** The site uses it for Decap CMS with Git
Gateway, which means an Identity account can reach repository write access.
Client logins must stay on the access-code system. Two different populations,
two different mechanisms — do not merge them because both happen to be "login".

### Environment variables

`GAS_URL`, `GAS_SECRET` and `SESSION_SECRET` move to the main site's environment
variables. Set them **before** the first deploy that includes the functions, and
trigger a fresh deploy afterwards — Netlify only picks them up on a new build.

### Cutover

Do not delete the old site on the day you switch. Keep
`questionnaire.mingfongpaper.com` alive as a redirect to
`https://www.mingfongpaper.com/questionnaire/` for a few months: invite links
already sent to clients carry the old host, and a client half way through a
questionnaire should not meet a dead link.

Drafts live in Google Drive, keyed by access code, so they survive the move
untouched. Sessions do not — `SESSION_SECRET` and the cookie domain both change,
so everyone re-enters their code once. Their answers are still there.
