# Roadmap

Work top to bottom. Tick items off and note them in LOG.md.

## Done
- [x] Octopus logo, roaming mascot, octopus QR codes and the "holding on" style (2026-11-14).
- [x] Slide pictures are read: charts, photos and diagrams described once per slide and used in answers.
- [x] Audience: deck viewer with swipe, folding slides, close on the yellow card, named or anonymous feedback; questions to the speaker are private.
- [x] Speaker: add/remove context at any time; tidier "How it went".
- [x] Security (2026-11-14): a speaker's fixes are capped at 20,000 characters in total and no longer override the answering rules; a flood of visit beacons can't push out question and cost records; legal pages have canonical links; privacy lists feedback and fixes.
- [x] Vamsi's list (2026-11-14): Q+A logo; answers write themselves in; a slide only when the answer is on it, with the exact line marked (PDF and PowerPoint); "Not what you needed? Ask the speaker"; anonymous feedback; speaker test seat with "Fix this answer"; "How it went"; setup questions with a reason each and clearer buttons; five code styles, an animated GIF code and four slide designs; new home, Why and /how-it-works pages; cookie-free visit counts and a full founder portal; model cost tracking and FinOps skills.
- [x] Security (2026-11-13): hostile PowerPoint files can't inject markup into slide drawings, stall the server with unclosed tags, or unpack into gigabytes by lying about sizes.
- [x] Home page film: talk → scan → ask → slide answer → hand-off → speaker reply, looping, with pause and reduce-motion still (2026-11-13). Covers audit A01.
- [x] Morning email redesigned: status, four numbers, a card per session, score bars, what was learned online, needs you, quick links (`docs/email-template.html`).
- [x] Real slide pictures for PowerPoint (drawn on the server: shapes, photos, tables, charts, text); Keynote/Google Slides via PowerPoint export (2026-11-13).
- [x] Branded Auto Q&A QR code; "Show QR code"; "Put it on a slide" (copy, PNG, SVG, ready-made slide). Private code stays plain.
- [x] Theme cross-fade and a small motion vocabulary (sheets, chips, banner); LinkedIn/website/email icon buttons; a typed name opens a LinkedIn search.
- [x] Why page with who it's for and a short FAQ; home page: audience code entry, reassurance line, labelled example.
- [x] Every answer says where it came from ("From slide 4 · automated", "General background, not from the talk · automated").
- [x] At upload: what is read and that files go to Anthropic (not for training). Typed questions survive a reload; failed sends get "Try again".
- [x] Automated accessibility scan (axe, WCAG 2.2 AA) on 10 pages in both themes: contrast fixed, 0 issues left.
- [x] Security pass (2026-11-12): browser rules (CSP, HSTS), no cross-site writes, limits that suit a venue on one Wi-Fi, hashed sessions, upload guards; see docs/SECURITY.md.
- [x] In-depth privacy notice, terms, "How answers work" page, 16+ at sign-up, delete-my-details, automatic removal of audience details after 90 days.
- [x] LinkedIn field that takes a link, a handle or @handle; speaker profile (what you do, about, LinkedIn, website, email) with an "About" button and contact buttons for the audience.
- [x] Reply notice inside the app (banner, tab title, optional phone notification); suggested questions refill to three; voice button works.
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
- [x] Answers answer what was asked and stop: no warnings or gaps the person didn't raise; the question offered to the speaker keeps the person's real worry.
- [x] A question asked in another language shows on the speaker's card as asked and in the language of the slides.
- [x] In other languages, "Marta says" is said in that language ("Según Marta").
- [x] Slide labels unique per file ("Slide 4 · appendix.pdf" when two files both have a Slide 4).
- [x] The slide under an answer opens from its place and closes back (tap, button, Escape, drag down); text slides open too.
- [x] "Me too": the room sees questions waiting for the speaker (no names) and can back them without giving details; the speaker sees how many want each one, most-wanted first, and backers get the reply.

- [x] The "send to the speaker" card: labels always in view, a problem shown at its own field, "Sending…", one open card at a time.

- [x] The speaker's "please don't ask about..." stays private: the answer no longer tells the room she asked.
- [x] Answers never say the speaker has been or will be asked (seen in Italian: "Ho chiesto a Léa", "Lo chiedo a Léa").
- [x] A slide label written at the end of an answer, or with a made-up file name, is put right so the slide still shows.

## Next
- [ ] Check picture reading on three real picture-heavy decks with the live model; tune the wording of `seeSlides` if descriptions are vague.
- [ ] Optional public question wall the speaker can switch on ("Me too" was removed when questions became private).
- [ ] Security: pin the founder portal to one account id (`ADMIN_USER_ID`), not only the email, because sign-up does not prove someone owns an address (pull request: touches sign-in).
- [ ] Security: send the speaker's private key and `ADMIN_KEY` in a header, not in the address (`qr.svg?inbox=1&key=`, `/admin?key=`), so they don't land in logs and browser history.
- [ ] Security: fake visit beacons can still inflate the portal's visitor counts (no harm to data any more); consider a per-address daily cap on beacons.
- [ ] Security: keep slide drawings small in storage (cap a deck's drawings at ~40 MB, or store each picture once instead of copying it into every slide).
- [ ] Security: Word files are unzipped by mammoth without our byte cap; check the real size first (`lib/zip.js`) or unzip them ourselves.
- [ ] Security: clamp the slide size a PowerPoint file states (very tall or thin decks can crash the speaker's own tab).
- [ ] SEO: give /privacy, /terms and /how-answers-work a canonical link like the other public pages.
From the UX/UI audit of 2026-11-12 (`docs/` has no copy; Vamsi shared it in chat). Open items worth doing, in order:
- [ ] A27 A public demo talk anyone can try without an account (a fixed sample talk, reset nightly).
- [ ] A15 Speaker inbox: sort by most "Me too", oldest unanswered; "Needs your reply" count at the top.
- [ ] A18 Announce a finished answer once to screen readers (now the whole thread is a polite live region while it streams).
- [ ] A16 Show a quiet "offline" line in the audience chat when the connection drops, and send queued questions when it returns.
- [ ] A21 Measure LCP/INP/CLS on home and audience pages (Lighthouse in the live workflow), keep the audience page light.
- [ ] A26 A support/contact route once CONTACT_EMAIL is set (needs Vamsi).
- [ ] A28 Moderated tests with two real speakers and their audience (needs Vamsi to find them).
- [ ] PowerPoint pictures: arrowheads on connectors, SmartArt colours, slide numbers/footers, EMF pictures (shown blank today).
- [ ] Phone: the top bar of the speaker's page and of "Your talks" overlaps the logo; the light/dark switch in the audience header wraps under the "waiting" pill; the setup hint text is cut off.
- [ ] Let an opened slide fill a phone sideways (upright, a 16:9 slide barely grows); swipe between slides when an answer has two.
- [ ] Make the "not covered" reply consistent: one short sentence naming what's missing, no slide description first.
- [ ] Grow the live test's real-answer questions towards the full question set in docs/TESTING.md, on a longer test deck.
- [ ] Email service: confirm the email address at sign-up, password reset, send the speaker's reply to the asker, digest to the speaker.
- [ ] Account page: change name, password and LinkedIn link; delete a single talk from "Your talks".
- [ ] Test real answers on 3 real, longer decks (20+ slides, charts, sparse text). The 6-slide sample passes; see docs/TESTING.md for the question set. Waiting on real decks: put them in samples/.
- [ ] Read slides as images too (charts, diagrams, image-only decks), not just their text.
- [ ] Thumbnails of the slides during upload.
- [ ] Email: send the speaker's reply to the asker; one digest to the speaker after the talk.
- [ ] Group similar hand-off questions by meaning (currently by shared words).
- [ ] Follow-up suggestions after each answer.
- [ ] Speaker can edit their interview answers and add material after setup; "My talks" list.
- [ ] Legal review of /privacy and /terms by a lawyer before public launch (needs Vamsi).
- [ ] Cookie consent banner only if third-party analytics or ads are ever added (none today).
- [ ] Live check flaked once right after a deploy (2026-11-12): wait until /healthz answers with the new version several times in a row before testing, and make the "not covered" test question one that can't be answered from general knowledge.
- [ ] Phone notifications when the page is closed (web push). Today the notice works while the page is open or in a background tab.
- [ ] Voice input in Firefox (no speech recognition there): hide the button rather than show one that can't work, or record and transcribe on the server.
- [ ] Move hosting to an EU region if customers ask for EU-only processing.

- [ ] Try a lower thinking effort for answers (faster first word, cheaper) once the live test shows answers are complete; compare quality on a persona run first.
- [ ] Slide labels still appear mid-answer ("... [Slide 17] proposes ..."); they show as a tappable chip. Labels at the end or with a wrong file name are fixed (2026-11-12); decide whether mid-answer chips stay.
- [ ] Check the arithmetic the answers do themselves: a range worked out from "7.3 ± 0.9" came out as "37 to 51 mm" instead of 38 to 49 (2026-11-12 run). Either have the model show the two multiplications or leave ranges out.
- [ ] General explanations are where mistakes appear ("ice, which is denser than water"; "shares summing to 100% fits either choice"). Try a stronger model for answers on a scientific deck and compare on the 2026-11-12 scenario.
- [ ] Always mark general knowledge as not from the talk: in one run of two, a term was explained with no marker.
- [x] The two-language card for the speaker is not reliable: the same Italian question got English underneath in one run and not in the next. Translate on the server when the second line is missing. (2026-11-13: a small check adds the line after sending; not yet seen in a live persona run.)
- [ ] A demand for a one-word verdict on a sweeping claim ("AI makes ecologists obsolete, yes or no") got a flat "No." (2026-11-13 run B). Give the facts without a verdict, as for other opinion questions.
- [ ] When an answer says a specific fact isn't covered, it should always offer it to the speaker: "Orin Nano" was named as missing in both 2026-11-13 runs and never offered.
- [ ] Quote slide figures exactly: "mostly rodents" for a slide's 41%, "58.5 hours (… = 58.3 h)" in one sentence (2026-11-13).
- [ ] Mid-answer labels: an answer in two paragraphs showed "Slide 6, Slide 13, Slide 6"; show each slide once.
- [ ] Translate a unit for a lay asker ("44 mm w.e." meant nothing to an irrigation manager; "a layer of water about 4.4 cm deep" would).
- [ ] Keep the asker's requested unit and their language throughout ("milioni di m³", not "hm³"; "alla stazione di misura", not "al gauge").
- [ ] Setup conversation: after a skipped question the site says odd things ("I won't revisit the 10–90% range"; repeating the last note). Say nothing after a skip.
- [ ] Phone: after "not covered", the chat scrolls so far that the question and "Send this to ..." heading are hidden above the yellow card's fields. (Seen again 2026-11-13 at 390 wide: only the fields and Send are on screen.)
- [ ] Phone: the LinkedIn field's placeholder is cut off at 390 wide ("linkedin.com/in/your-name or a li").
- [ ] When a number is only in a chart's picture, say so and offer the nearest printed fact (for the 2040 value: "−9% a year by the 2050s").
- [ ] Stop adding a nearby fact after the answer is complete (seen: the 23:42 train offered to someone who finishes work at 00:45; Aldercote added to "how late on a Saturday?").
- [ ] Use a second slide when it qualifies the first (the 85% test against the "9 in 10" aim; a comment deadline for someone told "not decided yet").
- [ ] Match the asker's register: a casual one-line question gets a casual one-line answer; off-topic gets one line, not two sentences.
- [ ] Setup questions should aim at what a room really asks (jobs, late hours, what you can bring, what if it fails); in the Route 4 run three of four missed.
- [ ] Translate the speaker's reply for an asker who wrote in another language (the question now reaches the speaker in both; the reply still goes back as written).
- [ ] On a phone, show a long question smaller or folded, so the answer is on screen without scrolling.
- [ ] Let the speaker hide a waiting question from the room (moderation; the room sees questions since "Me too").
- [ ] Show waiting questions in the asker's own language when they write in another one (now always in the talk's language).
- [ ] Put the speaker's most-wanted waiting questions on the "Show the code" screen, so the room sees what's queued (Slido-style wall), only if speakers ask for it.
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

## New ideas (2026-11-14)
- [ ] Persona run focused on the new slide rule: does the model show a slide only when it helps, and is the quoted line always on that slide?
- [ ] Marks for slides inside grouped or rotated PowerPoint shapes (positions there are approximate today).
- [ ] Moderation for feedback that is plainly abusive (today: a reminder only).
- [ ] Portal: per-week cohort of speakers who come back for a second talk.

