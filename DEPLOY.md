# Setting it up

One-time setup, about 30 minutes. You need a Google account and a Netlify
account. Both are free, and you already have Netlify from the website.

The questionnaire runs on its own — nothing here touches
`mingfongpaper.com` or the website's Netlify site. For the trial it lives at:

```
https://mfp-questionnaire.netlify.app
```

The custom domain is **Part 4**, and it is optional. Do it whenever you like;
codes issued before the move keep working afterwards.

Day-to-day use — sending a questionnaire to a client — is under
**Sending a questionnaire**. That part takes about ten seconds.

---

## How it fits together

Three pieces, each doing one job.

| | Job |
| --- | --- |
| **Netlify** | Serves the questionnaire at mfp-questionnaire.netlify.app |
| **Google Sheet + Apps Script** | Stores the invites, the drafts and the submissions; sends you the email |
| **Google Drive** | Holds one folder per client, with their answers as JSON, Markdown and PDF |

The client's browser only ever talks to the Netlify address. It never contacts
Google. That is deliberate and it matters: Google is blocked in mainland China,
where most of your clients are. Netlify talks to Google on the server side,
where the block does not apply.

---

# Part 1 — The Google side

## Step 1: Create the spreadsheet

1. Go to <https://sheets.new>. A new blank spreadsheet opens.
2. Name it **Ming Fong — Questionnaires** (click "Untitled spreadsheet" at the
   top left).

## Step 2: Add the script

1. In that spreadsheet, click **Extensions ▸ Apps Script**. A new tab opens.
2. Delete whatever is in the editor (usually `function myFunction() {}`).
3. Open `apps-script/Code.gs` from this project, copy **all** of it, and paste
   it in.
4. Click the save icon.
5. Name the project **Questionnaire backend** (click "Untitled project").

## Step 3: Run the setup

1. In the Apps Script editor, choose **setupSheet** from the function dropdown
   at the top.
2. Click **Run**.
3. Google asks for permission. This is expected — the script needs to use your
   Sheets, Drive and Gmail.
   - Click **Review permissions** → choose your account
   - You will see **"Google hasn't verified this app"**. This is normal for a
     script you wrote yourself. Click **Advanced**, then
     **Go to Questionnaire backend (unsafe)**.
   - Click **Allow**.
4. Go back to the spreadsheet tab. It now has three sheets — **Invites**,
   **Submissions** and **Answers** — and a dialog showing your settings.

**Copy the `GAS_SECRET` value from that dialog somewhere safe.** You need it in
Step 6. You can see it again any time with **Ming Fong ▸ Show settings**.

> If the **Ming Fong** menu is not in the spreadsheet's menu bar, reload the
> spreadsheet tab.

## Step 4: Publish the script as a web app

1. Back in the Apps Script tab, click **Deploy ▸ New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** `questionnaire`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
4. Click **Deploy**, then **Authorise access** if asked.
5. Copy the **Web app URL**. It ends in `/exec`. That is your `GAS_URL`.

> **"Who has access: Anyone" is correct and is not a security hole.** It has to
> be Anyone, because the caller is Netlify's server, which cannot sign in to a
> Google account. The script rejects every request that does not carry your
> `GAS_SECRET`, and that secret only ever exists on Netlify's servers — never in
> the client's browser and never in the code on GitHub.

---

# Part 2 — The Netlify side

Your repository and site already exist:

- <https://github.com/tommyo2ai-pixel/mfp-questionnaire>
- <https://app.netlify.com/projects/mfp-questionnaire>

## Step 5: Push the code

From this project folder on your Mac, first time only:

```bash
git init && git add -A && git commit -m "Ming Fong questionnaire" && git branch -M main && git remote add origin https://github.com/tommyo2ai-pixel/mfp-questionnaire.git && git push -u origin main
```

Netlify picks the push up and deploys within a minute or so. From then on, any
later change is just `git add -A && git commit -m "…" && git push`.

## Step 6: Set the three environment variables

In Netlify: **Site configuration ▸ Environment variables**, then
**Add a variable ▸ Add a single variable** for each:

| Key | Value |
| --- | --- |
| `GAS_URL` | The `/exec` URL from Step 4 |
| `GAS_SECRET` | The secret from Step 3 |
| `SESSION_SECRET` | A long random string — generate one with the command below |

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then go to **Deploys** and click **Trigger deploy ▸ Deploy site**. Environment
variables are only picked up by a new deploy, so this step is not optional.

The site is now live at **<https://mfp-questionnaire.netlify.app>**. That is a
real HTTPS address you can send to a client today.

---

# Part 3 — Prove it works

## Step 8: Run the self-test

In the spreadsheet: **Ming Fong ▸ Run self-test**.

This creates a fake client, saves a draft, submits it, writes the files and
sends the real emails. Check all four:

1. Two emails arrived — one notification to you, one confirmation
2. Google Drive has **Ming Fong — Questionnaires ▸ Self-Test Company Ltd — MFP-…**
   containing four files, one of them a PDF
3. The **Submissions** and **Answers** sheets have new rows
4. The notification email has an orange **"Internal — do not forward to the
   client"** box

Then delete the Self-Test folder and its rows.

## Step 9: Try it as a client would

Create a real invite (below), open the link on your phone, answer a few
questions, close the browser, reopen the link, and check your answers are still
there. Then submit.

That is the whole trial. You can start sending it to clients from here.

---

# Part 4 — The custom domain (optional, later)

Everything works on `mfp-questionnaire.netlify.app`. Moving to
`questionnaire.mingfongpaper.com` only changes the address; it changes nothing
about how the questionnaire behaves, and **codes already issued keep working on
both addresses**. So there is no rush and no risk in leaving it.

When you want it:

1. In Netlify: **Domain management ▸ Add a domain** →
   `questionnaire.mingfongpaper.com`.
2. Netlify tells you which DNS record to create. Add it wherever
   `mingfongpaper.com` is managed. If your DNS is already at Netlify, it offers
   to do this for you — accept.
3. Wait for the certificate. Usually a few minutes, occasionally an hour.
4. Open the address to confirm it loads.
5. In the spreadsheet: **Ming Fong ▸ Set questionnaire address…** and enter
   `https://questionnaire.mingfongpaper.com`.

Step 5 is the one that is easy to forget. Without it, new invite links still
point at the Netlify address — which still works, so nothing breaks; it just
looks less like you.

This is a subdomain. It does not touch `mingfongpaper.com` itself, and the
website's own Netlify site is not involved at any point.

---

# Sending a questionnaire

1. Open the **Ming Fong — Questionnaires** spreadsheet.
2. **Ming Fong ▸ Create invite…**
3. Type the company name, contact name and email.
4. Copy the link it shows you and send it by email or WeChat.

The link looks like:

```
https://mfp-questionnaire.netlify.app/?c=MFP-7K4M-2QX9
```

The code works from any device, so a client can start on a computer and finish
on a phone. Their answers save as they type — they can close the page and come
back days later.

## Watching progress

The **Invites** sheet shows a **Status** and **Last activity** for each client:

| Status | Meaning |
| --- | --- |
| `new` | Sent, not opened yet |
| `in progress` | They have started answering |
| `submitted` | Finished — see the Submissions sheet |

If somebody started a week ago and stopped, **Last activity** tells you, and a
short message usually restarts them.

## When a submission arrives

You get an email straight away. In their Drive folder:

| File | Use |
| --- | --- |
| `partA-submission.md` | **Give this to Claude when drafting the proposal** |
| `partA-submission.json` | The structured answers, plus the internal signals |
| `Part A — <Company>.pdf` | For your records, or to send back to them |
| `draft.json` | What they had before submitting; ignore it |

The email also carries a short **internal** block — the reading of their answers
from your own consultant notes, such as "no internal owner named" or "outside
Guangdong, reprice the travel". **Never forward that email to a client.** If you
want to send them something, send the PDF.

---

# Fixing things

**"That access code was not recognised" for a code you just made.**
The Netlify site is talking to the wrong script, or not at all. Check `GAS_URL`
ends in `/exec`, check `GAS_SECRET` matches **Ming Fong ▸ Show settings**, and
remember that changing an environment variable needs a new deploy (Step 6.5).

**"Backend returned an unexpected response."**
The web app was deployed with the wrong access setting. Redo Step 4 and make
sure **Who has access** is **Anyone**.

**Nothing happens when a client opens the link.**
Ask whether they can open <https://mfp-questionnaire.netlify.app> at all.
Netlify is normally reachable from mainland China but is not guaranteed. If they
cannot reach it, email them the questionnaire as a document instead — it is the
same questions in the same order.

**No email arrived, but the answers are in Drive.**
Email sending is deliberately allowed to fail without failing the submission.
A consumer Gmail account can send 100 emails a day; a Workspace account 1,500.
Check the Apps Script tab under **Executions** for the error.

**You changed a question and want the old submissions to still make sense.**
They do. Every submission stores the exact question text the client saw, so
rewording a question never changes what an old answer appears to say.

---

# Changing the questionnaire

The questions live in one file: `public/js/schema.partA.js`. Edit the wording,
commit, push — Netlify redeploys in about a minute. See `README.md` for the
field types and for how to add Part B or a Chinese translation.

**Never change a field's `id`.** Reword the label as much as you like; changing
an id orphans every answer already collected.
