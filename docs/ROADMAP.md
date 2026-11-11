# Roadmap

Work top to bottom. Tick items off and note them in LOG.md.

## Done
- [x] Accounts (email + password), "Your talks", close account.
- [x] Database storage (Postgres) and hosting set-up for Render; test suite and GitHub workflow.
- [x] Answers show the slide they rest on (real picture for PDFs, laid-out text for PowerPoint), tap to enlarge.
- [x] Answers explain in plain words instead of quoting the slide; facts about the talk still only come from the material.
- [x] Numbers: page views and product events without cookies, /admin page, per-talk summary for the speaker.
- [x] Privacy page with delete-my-details, not-found page, search/preview tags, basic protection headers and question rate limit.
- [x] "Try it as the audience" button on the speaker page.
- [x] Visual polish pass at phone and desktop sizes: long titles, speaker page order on phones, replies shown under the asker's own question, wrong-code page.
- [x] Answers no longer stop mid-sentence or come back as a wrong "not covered" (the model's thinking used up the answer allowance); a cut-off answer keeps whole sentences and offers the speaker hand-off.
- [x] Speakers with a title are named "Dr. Carvalho", not "Dr.", in answers and on the hand-off card.
- [x] Slide labels unique per file ("Slide 4 · appendix.pdf" when two files both have a Slide 4).
- [x] The slide under an answer opens from its place and closes back (tap, button, Escape, drag down); text slides open too.

## Next
- [ ] Let an opened slide fill a phone sideways (upright, a 16:9 slide barely grows); swipe between slides when an answer has two.
- [ ] Make the "not covered" reply consistent: one short sentence naming what's missing, no slide description first.
- [ ] Grow the live test's real-answer questions towards the full question set in docs/TESTING.md, on a longer test deck.
- [ ] Email service: confirm the email address at sign-up, password reset, send the speaker's reply to the asker, digest to the speaker.
- [ ] Account page: change name, password and LinkedIn link; delete a single talk from "Your talks".
- [ ] Test real answers on 3 real, longer decks (20+ slides, charts, sparse text). The 6-slide sample passes; see docs/TESTING.md for the question set. Waiting on real decks: put them in samples/.
- [ ] Read slides as images too (charts, diagrams, image-only decks), not just their text.
- [ ] Real slide pictures for PowerPoint uploads (now PDF only) and thumbnails during upload.
- [ ] Email: send the speaker's reply to the asker; one digest to the speaker after the talk.
- [ ] Group similar hand-off questions by meaning (currently by shared words).
- [ ] Follow-up suggestions after each answer.
- [ ] Speaker can edit their interview answers and add material after setup; "My talks" list.
- [ ] Automatic deletion of audience data after 60 days. Legal review of the privacy page.
- [ ] Cookie consent banner only if third-party analytics or ads are ever added (none today).

- [ ] In other languages, say "Dr. Carvalho says" in that language too (seen: "Dr. Carvalho says que sim").
- [ ] Try a lower thinking effort for answers (faster first word, cheaper) once the live test shows answers are complete; compare quality on a persona run first.
- [ ] Slide labels still appear mid-answer ("... [Slide 17] proposes ..."); strip or move them to the front server-side.
- [ ] "Me too" for the audience: let people back a question already sent to the speaker, so the speaker sees real demand (event organisers' top Q&A complaint is duplicates with no sense of how many care).
- [ ] Save each persona run's transcript as a report in docs/persona-runs automatically (the 2026-11-10 run only lived in the workflow log).

## Before going online
- [ ] Move from one saved document to proper database tables before real traffic.
- [ ] Hosting in the EU, a domain, a short join address (autoqa.app/ABCDE).
- [ ] Limits per talk to control model cost; abuse protection.
- [ ] Try it at one real talk and count: questions asked, answered instantly, handed off, replied.

## Later
- [ ] Organiser view: all sessions of an event, what audiences didn't understand.
- [ ] After-talk summary for the speaker: top questions, gaps in the deck.
- [ ] Voice questions; more languages on the interface.
- [ ] Pricing and payments.
