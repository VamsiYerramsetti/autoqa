# Log (newest first)

## 2026-11-12 (evening): Security, privacy and Vamsi's fixes
The site now has browser security rules, limits that suit a whole venue on one Wi-Fi, safer sign-in, and in-depth privacy, terms and "how answers work" pages.
Vamsi's fixes are in: a LinkedIn field people type a name into, a speaker "About" with contact buttons, a reply notice inside the app, suggested questions that refill, and a working voice button.
- Security (full list in `docs/SECURITY.md`): Content-Security-Policy and HSTS; writes from other websites refused;
  uploads refused before reading if the talk isn't yours; sessions stored only as fingerprints (old sign-ins still work);
  same-time sign-in; database certificate checked; zip-bomb guards; `npm audit` clean; Git history scanned, no secrets.
- Voice: our own `Permissions-Policy: microphone=()` blocked it. Now allowed for our pages only; problems are explained.
- Legal: `/privacy` (controller, every piece of data with reason and legal basis, processors and countries, retention,
  rights, complaints), `/terms`, `/how-answers-work`; 16+ at sign-up; audience details deleted after 90 days.
- Search engines: own title/description/canonical per public page, `/sitemap.xml`, `/robots.txt`, `security.txt`,
  talk pages `noindex`.
- Speaker profile (what you do, about, LinkedIn, website, contact email) via "Your profile" on the speaker page.
- New: daily **Security** session at 03:07 with `.claude/skills/security-audit/` and the `security-reviewer` agent;
  the morning email now reports it.

**Tested.** `npm test` 17/17 (two new checks: protection rules; profile/LinkedIn). Walked through in a browser at
phone size and 1280x860: sign-up, profile, voice (simulated), suggestions refill, About sheet, hand-off with LinkedIn,
speaker reply, reply banner and tab title, legal pages; no console errors and no policy violations. Found and fixed on
the way: the LinkedIn field overflowed the yellow card on a phone and covered the Send button.

**Live site.** The first check after deploying failed (a "not covered" question was answered generally instead of being
sent to the speaker, then a correct password was refused at the end); the re-run straight after passed 14/14. Most
likely the old copy of the site still answered some requests during the switch-over. Added to the roadmap.

**Unfinished.** Notifications only while the page is open or in a background tab (no web push yet). Firefox has no
voice typing.

### For Vamsi
- Set `CONTACT_EMAIL` (address for privacy questions) and `OPERATOR_NAME` (your name or company) on Render →
  Environment. Until then the legal pages say "its founder" and "the contact address will be listed here".
- Rotate the Anthropic API key and the Neon password: both were pasted into a chat once.
- Have a lawyer read `/privacy` and `/terms` before a public launch.
- The hosting is in the US; moving to an EU region means a new Render service. The notice explains the transfer.

## 2026-11-12 (morning): Test and improve
Today's made-up talk was a conference paper on glacier runoff ("Peak water has passed"), with a statistician, a student, an Italian hydropower planner, a blogger and an irrigation manager asking 16 questions; the score went from 87.5% before to 92.0% after.
What changed on the site: an answer no longer tells the room what the speaker asked to keep out, never says "I've asked the speaker" when nothing was sent, and always shows its slide even when the model names it wrongly.
- Found in the first run: a blogger fishing for a headline was told "Léa has asked not to be asked about the 2015 study"; two
  Italian answers ended "I've asked Léa" for questions nobody had sent; one answer showed no slide because its label came
  last with a made-up file name; a student was told ice is denser than water.
- Changed: the answering instructions in `lib/ai.js` (the speaker's request is private; no claim of asking, in any
  language; labels copied exactly; a general explanation stops once the term is explained) and a small server-side
  tidy-up of slide labels (`tidyLabels`). `docs/HOW-IT-WORKS.md` says the same in plain words.
- Re-run of the same 16 questions: limits handled 8 of 8 (was 5 of 8), slide shown 16 of 16 (was 15). Kept.
- Not better: the model's own added sentences still slip (a range of "37 to 51 mm" that should be 38 to 49). And my
  rewording made two explanations lose their "not from the slides" note; I put the old wording for that back after
  the re-run. That last small change is covered by `npm test` and the live check, not by a third persona run.
- Full report: `docs/persona-runs/2026-11-12-peak-water.md`. Eleven new roadmap lines, three ticked.

**Tested.** `npm test` 15/15 (new check: a slide label at the end or with a wrong file name still shows the slide).
"Live site" passed after each push. Screens walked locally in a browser with today's deck at 1280x860 and phone size.
32 questions on the live site; both test accounts closed.

**Part 2 (one improvement beyond the test) was skipped today**: nothing in FEEDBACK.md, nothing broken, and the top
"Next" items are about the look, which belongs to the design session.

### For Vamsi
- The answers run on the cheapest model. On a scientific deck its slips are in the explanations it adds itself (a
  wrong physical fact, a wrong range). A stronger model for answers would likely cut these but costs more per
  question; say if you want a side-by-side on today's scenario.

## 2026-11-12 (night): Design
Sending a question to the speaker is now clearer on a phone: every field says what it is, a mistake is pointed out at the field itself, and only one yellow card is open at a time.
- The yellow card: labels stay in view above what is typed (they used to vanish with the first letter); a missing
  name or a wrong email outlines that field and says so right under it, in dark ink instead of faint red on yellow;
  the problem goes away when "Ask anonymously" is switched on (it used to stay).
- The button says "Send", shows "Sending…" and cannot be pressed twice. The card and the "Sent" note settle in
  instead of jumping.
- An older question that was not sent folds to a small "Send to Dr. Carvalho" button when the next question is
  asked, so the chat no longer fills with yellow forms. What was typed is kept.
- The two design skills were looked up again; nothing we rely on changed. `docs/DESIGN-SKILLS.md` notes what is new.

**Tested.** `npm test` 14/14 (new check for the card). Whole journey screenshotted in practice mode at 1280x860 and
390 wide before and after; proof in `docs/design-2026-11-12-hand-off.jpg`; the full table is in `docs/DESIGN.md`.

**Unfinished, seen on the way (not touched, one focus a day).** On a phone the top bar of the speaker's page and of
"Your talks" overlaps the logo; the light/dark switch in the audience header drops to its own line when the yellow
"waiting" pill shows; the setup hint "Type or speak your answer" is cut in half. All three are in the design log as
next candidates and in the roadmap.

### For Vamsi
- Nothing to decide. The button on the yellow card now just says "Send" (it used to repeat the speaker's name, or
  say "Send without my name"); say if you want the longer wording back.

## 2026-11-11 (evening): dark mode, anonymous questions, a real conversation at setup, general answers
Asked for by Vamsi on 2026-11-11 (in the project chat).
- Dark mode: follows the phone or computer setting; a moon/sun button in the top bar (and in the audience header) switches it and is remembered on that device. Every colour now comes from a theme variable; yellow keeps dark text, slides stay white, the big-screen code always stays light.
- Ask anonymously: a switch on the yellow "Send this to..." card, off by default. On: no name or email asked, the speaker's card says "Someone asked" with no contact links, and the reply still appears in the asker's chat.
- Setup is now a conversation instead of four fixed questions: the site asks one question at a time, built on the last answer and the slides, for up to 8 turns, and early on asks for a transcript, script, notes or paper. The speaker can type, speak (browser speech-to-text, where the browser has it: Chrome, Edge, Safari) or attach files mid-conversation; a long paste is kept as notes material. "Skip" and "Finish" any time; an interrupted setup carries on where it stopped.
- Answers may use general knowledge for general questions about the subject (what a term means, how a method works), clearly marked as not from the talk; talk-specific facts that are missing are still handed to the speaker. After a general answer the person gets a quiet "Ask Dr. X too" button instead of the big yellow card.

**Tested**
- `npm test` 13/13 (new: the setup conversation gives a first and a different follow-up question; anonymous hand-off hides name and email and the reply still arrives; the general-answer flag).
- Browser, practice mode, light and dark, 1280x860 and iPhone size: setup conversation, hand-off card with the switch off and on, speaker page with "Someone asked", home page, theme switch.

**Not yet tested with the real model**: how good the follow-up questions are, and whether it judges "general" vs "talk-specific" well. The live-site check after this push runs the conversation once; the next persona run should look at both.

**For Vamsi**
- Voice uses the browser's own speech recognition (free, nothing to set up), so it works in Chrome, Edge and Safari but not Firefox. Better accuracy would need a paid speech service; say if you want that.

## 2026-11-11 (day): "Me too" for the room
**Changed**
- Audience chat: when questions are waiting for the speaker, a yellow "2 waiting for Marta" sits under the talk title.
  It opens a list of those questions (never who asked) with a "Me too" button on each. No name or email needed; the
  reply shows up in that person's chat too. Tapping again takes it back.
- Someone whose question others already sent is told so on the hand-off card ("Someone here already asked this.").
- Speaker's inbox: a card says "+3 want this too", the most-wanted question is at the top, and "Goes to all" counts
  the backers. Backers light up yellow in the room picture. /admin counts "me too" taps.
- Privacy: the hand-off small print now says others see the question, never the name; the privacy page says the same.
  Questions sent before today are never shown to the room, because those people weren't told (stored as `shared`).
- Docs: HOW-IT-WORKS, privacy page, roadmap (three new lines: hiding a question, waiting questions in the asker's
  language, a "what's queued" wall on the code screen).

**Why.** Re-run of the 10:03 session (it stopped on the usage limit). Today's angle was competitors and organiser
complaints. Slido and Mentimeter both let the room upvote each other's questions so the most wanted rise; organisers'
top complaint is duplicates with no sense of how many people care. We already merge duplicates, but a person who
never typed the question had no way to say "me too", and the speaker saw names only.

**Tested.** `npm test` 12/12 (new check: the room sees the waiting question without names, backs and un-backs it,
the speaker's card counts backers, the backer gets the reply, the second asker is told someone already asked).
Playwright in practice mode at 390 wide and 1280x860: hand-off card with the new line, the pill under the title
(first version overlapped a two-line title; fixed), the list as a bottom sheet on a phone and a centred box on a
desktop, the pressed "Me too", the speaker's card with "+1 wants this too". No page errors.

**Sources**
- Slido live Q&A (everyone sees and upvotes, the most relevant rise): https://slido.com/features-live-qa
- Mentimeter, the audience side of Q&A (upvote what you want answered): https://help.mentimeter.com/en/articles/1501608-questions-from-audience-the-audience-perspective
- Why event Q&A fails (duplicates, no sense of demand): https://oneask-site.pages.dev/blog/why-most-event-qa-fail-and-how-to-fix-them

**Unfinished.** The speaker can't yet hide a waiting question from the room (roadmap). Waiting questions show in the
talk's language only.

### For Vamsi
- The room now sees questions sent to the speaker (without names). If you'd rather keep them private by default and
  let speakers switch it on, say so; it's one setting.

## 2026-11-11 (midday): Design craft pass with two outside skills; new direction for the daily runs
Vamsi asked for the UI to be improved using Emil Kowalski's design skill and the Taste skill, and for the daily
runs to use them from now on. He also said the product is first of all for conferences and scientific talks.

**Changed**
- Home page: the three numbered cards are gone. Three plain lines now sit beside a real piece of the audience chat.
  On a phone the top bar no longer breaks onto two lines.
- Chat and speaker's inbox: a long question is set as readable text instead of a twelve-line headline.
- The sentence saying answers are automated is larger and darker.
- Motion: one stronger curve, shorter times, press feedback on everything pressable, hover looks only with a mouse,
  "reduce motion" keeps short fades. Details and the before/after table are in docs/DESIGN.md.
- New `docs/DESIGN-SKILLS.md`: what we take from each skill, what we leave, and how a design session uses them.
  The design-pass instructions and AGENTS.md point to it.
- `docs/PERSONAS.md`: at least three persona runs in four are now a technical or scientific public talk.

**Tested**
- `npm test` passes. Before/after screenshots at 1280x860 and 390 wide of home, chat (welcome, answer with slide,
  long question, hand-off), files step, speaker's inbox and "Your talks": docs/design-2026-11-11-craft-pass.jpg.

**The daily sessions were rebuilt** (Vamsi's request): three instead of four, starting at 05:00 Amsterdam time.
Design (05:00), test and improve (05:40, the old persona test and "research and improve" in one), and a short
morning email to Vamsi (07:45) that also collects his replies into docs/FEEDBACK.md. The twice-weekly feedback
review is switched off; the email replaces it. AGENTS.md lists them.

**Unfinished**
- The Taste skill asks for surfaces separated by tone, not lines. That would change the look of every screen, so it
  is a proposal for a later design session, not done here.

## 2026-11-11 (morning): Persona test, "Route 4 after dark"
**Run.** A town meeting about an evening bus becoming bookable minibuses: 18-slide PDF, six made-up people (an anxious
78-year-old without a smartphone, a transport planner, a hospital cleaner writing in Spanish, a sceptic who misheard,
a bored teenager, a latecomer), 16 questions on the live site, scored by the answer-judge. Report:
docs/persona-runs/2026-11-11-route-4-after-dark.md.

**Found.** 77 of 88 points (87.5%). No wrong facts, no wrong slides, no guesses. The weak spot was what followed the
right answer: unasked warnings ("it's worth asking when you book"), a hand-off that swapped the person's worry for a
side question, and a Spanish question that reached an English-speaking speaker in Spanish only.

**Changed.**
- Answering instructions: yes or no first, answer what was asked and stop, lead with what the person can act on, keep
  the real worry in the question for the speaker.
- The speaker's card shows a question asked in another language twice: as asked, and in the language of the slides.
  The model must now always supply that second wording (left optional, it was skipped in the first re-run).
- A persona run no longer waits 15 minutes when the last commit only added notes or a scenario.
- New smoke check for the two-language hand-off (code-level, local copy only).

**Tested.** `npm test` passes (11 checks with the design session's addition). Screens walked in a browser at 1280x860
and 390 wide with today's deck and names (sign-up, setup, chat, hand-off, inbox, the new card). "Live site" passed
after each push. Same scenario re-run: 80 of 89 (89.9%); the anxious rider's three answers went from 11/16 to 15/16.
Three other answers lost a point each (see the report), so the change is kept but the habit of adding a nearby fact
is not gone. One extra live question confirmed the two-language card. 33 live questions; all test accounts closed.

**Unfinished.** Seven new roadmap lines (nearby-fact filler, second slides, register, setup questions, translating the
speaker's reply, long questions on a phone, the LinkedIn field).

### For Vamsi
- The hand-off form asks everyone for a LinkedIn link. At a town meeting that reads oddly. Keep it everywhere, or show
  it only when the speaker has added their own link? Nothing changed until you say.

## 2026-11-11 (morning): Design: the slide opens from its place and goes back
**Changed**
- Audience chat: the slide under an answer has a small corner mark and opens by growing out of where it sits, edge to
  edge on a phone; it closes back into the same spot. Close with a tap, the button, Escape or by dragging it down.
  PowerPoint (text) slides can now be opened large too. Keyboard and screen-reader behaviour is that of a proper dialog.
  "Reduce motion" gets a short fade instead.
- Bug: an upload problem during setup (for example a file type we can't read) showed `[object HTMLParagraphElement]`.
  It now shows the message.
- Details, sources and rejected ideas: docs/DESIGN.md (design log). Before/after: docs/design-2026-11-11-slide-open.jpg.

**Tested**
- `npm test` 11/11 (new check: the slide viewer is a dialog, closes on Escape, respects reduce motion).
- Playwright at 390 wide, 844x390 landscape and 1280x860, PDF and PowerPoint talks: open/close by tap, keyboard and
  drag; a short drag settles back, a long one closes; focus returns to the slide; reduced motion; no page errors.
  Whole journey screenshotted before and after; other screens unchanged.

**Unfinished**
- Held upright, a 16:9 slide only grows from about 350 to 390 pixels wide. Filling the screen sideways is the next step.


## 2026-11-11 (night): no more half answers; "Dr. Carvalho", not "Dr."
**Changed**
- Answers no longer stop mid-sentence. The 2026-11-10 persona run (Quiet Hours, read from the workflow log; report
  now in docs/persona-runs/) had 3 of 16 answers cut off and one hard question wrongly told "The talk doesn't cover that."
  Cause: the answering model thinks before writing by default, and thinking counts against the 600-token allowance.
  Raised to 4000 for answers and 8000 for reading the deck (we pay only for what's used). If an answer still runs out,
  only whole sentences are shown and the speaker hand-off is offered; an empty reply is never passed off as "not covered".
  A run-out is reported on /healthz as the last model error.
- Speakers who sign up with a title ("Dr. Ines Carvalho") are now "Dr. Carvalho" in answers and on the hand-off card
  ("Send this to Dr. Carvalho?"), instead of "Dr.". Same rule in the browser and the answering instructions.
- New smoke check for both (runs on a local copy only; it checks the code directly).

**Tested**
- `npm test` 10/10. Browser in practice mode with a speaker named "Dr. Ines Carvalho" at 390 wide and 1280x860:
  hand-off card reads "Send this to Dr. Carvalho?". The real-model effect can only be seen on the live site
  (no key in this workspace), so after the deploy ("Live site" workflow passed) the Quiet Hours persona run was
  repeated: no answer cut off, "39% or 36%?" answered from Slide 10, "Dr. Carvalho" throughout. Details in its report.

**Sources**
- Thinking counts toward max_tokens; Haiku 5.5 thinks by default: https://platform.claude.com/docs/en/build-with-claude/thinking
- Handling `max_tokens` stop reason: https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
- Slido AI 2.0 (polls from slides, "Question AI" rewording; still nothing that answers questions): https://community.slido.com/product-news-announcements-108/slido-ai-2-0-work-smarter-than-ever-7896
- Why event Q&A fails (duplicates, no sense of demand): https://oneask-site.pages.dev/blog/why-most-event-qa-fail-and-how-to-fix-them

**Unfinished**
- The persona test and design session said to run before this one left nothing in the repository (no report,
  no design log entry); the persona run itself is in the workflow log and is now written up.
- Slide labels mid-answer; "me too" for the audience; lower thinking effort for speed: on the roadmap.
- Seen in the re-run: "Dr. Carvalho says que sim" (an English phrase in a Portuguese answer). Small prompt fix for a later session.

## 2026-11-10 (night): cheapest model everywhere, setup can't dead-end
- Vamsi asked for the cheapest model: reading the deck now uses the same cheap model as answering (`claude-haiku-5-5`). Watch in persona runs whether the questions asked of the speaker stay specific; `AUTOQA_PREP_MODEL` can raise it again.
- The first persona run on the live site stopped at setup: reading the deck failed with "We couldn't read your material" (the model call errored; cause not visible from here, possibly two test runs hitting the key's rate limit at once). Setup now retries and, if the model still fails, continues with standard questions instead of blocking the speaker.
- `/healthz` reports the last model error (where, status code, time; no message text) so workflows can show why a model call failed.
- Notes and test scenarios no longer trigger a deploy.

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
