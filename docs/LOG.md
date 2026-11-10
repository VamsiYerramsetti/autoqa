# Log (newest first)

## 2026-11-10 (evening): live
- The site is live at https://autoqa-jcol.onrender.com (Render, with the Neon database and the real API key).
- Deploys are hands-off: each push to `main` runs the "Live site" workflow, which asks Render to deploy (repository secret `RENDER_DEPLOY_HOOK`), waits for the new version at `/healthz`, and runs the full test against the real site.
- First full live run passed all 9 checks with real answers (right slide cited, hand-off offered for the uncovered question, two askers merged into one card, the speaker's reply answered the next asker).
- Seen in that run: asked twice, the same uncovered question got two different wordings ("That isn't covered in the talk material." and a longer one that first described slide 3). Worth making consistent.

## 2026-11-10 (later): moved to GitHub, accounts, database, hosting set-up

**Changed**
- The project now lives in the GitHub repository; the Desktop folder is no longer the working copy. The repository's old code is kept on the branch `archive/old-version`.
- Accounts: sign up and sign in with email and password, one sign-in cookie, "Your talks" page, close-my-account (removes talks and questions). Starting a talk now needs an account; the setup only asks for the title.
- A signed-in speaker can open their talk on any device. The private link for the phone still works.
- Storage: with `DATABASE_URL` set, everything (accounts, talks, questions, slide pictures) is kept in Postgres and survives restarts and deploys. Without it, local files as before.
- Hosting: `render.yaml` for Render, `/admin` opens for the account named in `ADMIN_EMAIL`, QR codes use the site's public address.
- `npm test` walks the whole product (9 checks). A GitHub workflow runs it on every push.

**Tested**
- `npm test` with file storage and with a real Postgres; data and a slide picture survived a restart in database mode.
- Browser walk-through: sign up from the home page, set up a talk with the PDF, "Your talks" with a finished and an unfinished talk, opening the talk signed in on a second device, big-screen code.

**Not done**
- No email is sent yet (no confirmation of the address, no password reset, no reply by email). Needs an email service.

**For Vamsi**
- Connect Render and, ideally, a Neon database (README, "Put it online").
- Password reset and confirming email addresses need an email service (for example Resend). Say when you want it.

## 2026-11-10 (afternoon): polish pass and unique slide labels

**Changed**
- Slide labels are now unique per file. When two files both have a "Slide 4", the later file's slides are called "Slide 4 · appendix.pdf" (file name, with the extension only when two files share a name; pasted notes become "Notes · 2"). The tag is set once when the file is added, so old answers keep pointing at the right slide; older talks get tags the first time they're read. The answer instructions now tell the model to copy the whole label.
- Speaker reply now appears under the asker's own question in their chat, replacing the "Sent to Maya" note, instead of repeating the question as a new entry. Works for people whose question was merged with someone else's.
- Audience header: talk title capped at two lines, so long titles no longer eat a quarter of the phone screen.
- Speaker page on a phone: "Questions for you" now comes straight after the numbers instead of at the very bottom. Long titles get a smaller size on the speaker page. The join code is shown top right.
- Top questions list on the speaker page: each question capped at two lines.
- Suggested questions on the phone scroll to the screen edge, so it's clear there are more.
- Wrong join code: new page "No talk with that code" with a box to type the code again. A talk that isn't open yet still says "Not open yet", now with "Try again". (The server now answers 404 for an unknown code and 409 for not open yet.)

**Tested**
- Full walk-through in a browser in practice mode on a fresh data file: set up a talk with a 120-character title, uploaded the PDF, the PowerPoint and the PDF again, interview, speaker page, audience on iPhone size (welcome, answer with slide, hand-off, sent), speaker reply on desktop, reply arriving live under the question, reload of the audience chat, speaker page on a phone, code screen, /admin, /privacy, not-found page, wrong code. Screenshots at 1280x860 and iPhone 13. No script errors.
- With the real key (8 calls in the cloud workspace, key filtered from all output, staged copy deleted afterwards): PDF + PowerPoint of the sample deck plus two pasted notes. Answers correct; notes facts answered as "Maya says". Asked about the PowerPoint's slide 2: before the prompt tweak it cited the PDF's "Slide 2", after it cited "Slide 2 · rooftop-rain.pptx", and the phone showed that slide.

**Noticed, not fixed**
- The model sometimes puts a slide label mid-answer ("... [Slide 4] In the pilot ..."). It shows as a tappable chip, so it reads fine, but it is against the instructions.
- When someone asks about "speaker notes" by name, the answer says "the speaker notes" instead of "Maya says".
- A partly covered question ("how much water do the roofs hold back?") answers what it can and offers the hand-off for the missing total. That is what the rules say; worth watching whether people find it noisy.

**For Vamsi**
- Real longer decks: the top roadmap item needs 2-3 of your own decks (20+ slides, charts). Drop them in samples/ and the next run will test them.
- Confirm the label style "Slide 4 · appendix.pdf" for the second file, or say if you'd rather have "Appendix, slide 4".
- Confirm moving "Questions for you" above the buttons on phones (desktop layout unchanged).

## 2026-11-10: first run with the real key
- Tested real answers on the sample deck (text questions through the API, then a browser run with the PDF deck). Slide picture shows with the answer; first words arrive in about 1-2 seconds.
- Fixed: preparing a talk failed with the real model (it rejects a forced tool call), so the interview never appeared. Now works; interview capped at 4 questions.
- Tuned answers: no more "I've flagged this" wording (the yellow card does the asking), no hand-off for opinion questions, off-topic replies no longer start with a stray label, speaker notes are quoted as "Maya says".
- Checked: answers in the asker's language (German), refuses to reveal contact details, declines off-topic politely, hands off missing facts only.
- Added docs/TESTING.md (how to test, and where the real key can and can't be used).
- Not done yet: accuracy on real, longer decks (only the 6-slide sample so far).

## 2026-11-09 (late): slides in answers, numbers, site basics
- Answers now open with the slide they rest on; the audience sees the slide, then the explanation. PDF pages are turned into pictures in the speaker's browser at upload.
- Prompt changed: explain in own words with light background; talk-specific facts only from the material.
- Cookie-free event tracking, /admin numbers page (this computer only unless ADMIN_KEY is set in .env), speaker summary (answered straight away, top questions).
- /privacy (draft, needs legal review) with delete-my-details, 404 page, robots.txt, protection headers, 30 questions/minute limit per address.
- Tested in a browser with a PDF deck and a PowerPoint deck in practice mode; real-key results are noted below when run.

## 2026-11-09: first working version
- Researched the market and UX practice (see BLUEPRINT.md). Found a close competitor, PresEngage.
- Built the full loop: set up a talk, upload, interview, QR screen, audience chat with slide references, hand-off to speaker, grouped inbox, reply shown in the asker's chat, LinkedIn connect, replies teach the assistant.
- Tested end to end in a browser (desktop + phone sizes) in practice mode. Not yet tested with a real API key.
