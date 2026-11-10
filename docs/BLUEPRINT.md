# Auto Q&A: blueprint

## The product in one line
Every question at a talk gets an answer: straight away from the speaker's own material, or from the speaker afterwards.

## Who it's for first
Conference, meetup and university speakers. (The closest competitor, PresEngage, sells to sales teams and webinars.)

## The two journeys

**Speaker (about three minutes, before the talk)**
1. Title, name, email.
2. Drop slides (PDF, PowerPoint, Word, or pasted notes). Speaker notes in PowerPoint files are read too.
3. Three or four short questions about the gaps: things an audience will ask that the slides don't say. One per screen, all skippable.
4. "Show the code" opens a full-screen slide with the QR code and a short typed address.
5. During and after: a page with the room (one dot per person) and "Questions for you". Same question from several people is one card; one reply goes to all of them. "Open on my phone" moves this page to the speaker's phone.

**Audience (no app, no sign-up)**
1. Scan. The first screen says what this is and that answers are automated.
2. Ask, or tap a suggested question. The slide the answer rests on appears first (tap to enlarge), then two to four sentences that explain it in plain words.
3. If the material doesn't cover it: "Send this to Maya?" Only now do we ask for name and email (LinkedIn optional).
4. The speaker's reply shows up in the same chat, with "Connect with Maya on LinkedIn" if the speaker added a link.

## Rules the product keeps
- Never guess. If it isn't in the material or the speaker's notes, hand it to the speaker.
- Ask for personal details only at the moment there's a reason, and say exactly who gets them.
- Always say answers are automated (EU AI Act Art. 50 applies from Aug 2026).
- Each speaker reply becomes part of what the assistant knows, so the next person with the same question gets it instantly.
- Few words on every screen. No "AI" branding, no sparkle icons.

## How the answering works
There is no model training. The full text of the material, the speaker's interview answers and the speaker's
replies so far go into the model's instructions (cached, so repeat questions are cheap). A deck is small enough
that this beats search-based retrieval on accuracy. The model has one tool, `not_covered`, which it calls instead
of improvising. Two models: a fast one for audience answers, a stronger one to read the deck and write the interview.

## Numbers and privacy
No cookies. Page views and product events (talk started, slides added, joined, question, answered, not covered, sent to speaker, reply) are stored without names or emails; a visitor is a hash that changes daily. `/admin` shows the funnel and room numbers. `/privacy` explains this and lets anyone delete their details. A consent banner is only needed if third-party analytics are added later.

## Connection
LinkedIn does not let apps send connection requests or look up profiles, so: email is the default channel
(collected at hand-off), and both sides can paste a LinkedIn link that shows as a button to the other.

## Look
Cobalt = answered, yellow = a raised hand waiting for the speaker, ink for everything else. Flat colour.
Bricolage Grotesque for headlines, Instrument Sans for text (both bundled, no outside font requests).
The signature element is the room: curved rows of dots, one per person, used on the home page and live on the speaker's page.
The chat reads as a transcript (bold question, plain answer), not speech bubbles.

## Market notes (Nov 2026 research)
- Slido, Mentimeter, Pigeonhole, Vevox, Poll Everywhere collect and rank questions; none answers them from the speaker's material.
- **PresEngage already does the core loop** (deck upload, live AI answers with slide references, QR join, flag unanswered to presenter). It is positioned at sales/webinars and treats the audience as leads.
- Where Auto Q&A can differ: the pre-talk interview, the two-way connection, replies that teach the assistant, conference/academic focus, and later an organiser view across all sessions.
- Unverified: no solid public number for how many conference questions go unanswered. Worth measuring ourselves.
- Pricing direction: free for one talk with a cap, per-speaker monthly plan, per-event licence for organisers. Each chat costs model usage, so no lifetime deals.
