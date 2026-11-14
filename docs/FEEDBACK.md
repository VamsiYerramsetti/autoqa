# Feedback from Vamsi (newest first)

Vamsi's replies to the morning email, in his words, with what to do about each. Every session reads this first;
it outranks the roadmap. Tick an action when it is done and say so in `docs/LOG.md`.

## 2026-11-14 (in chat)

> A better logo: a Q and an A, seamlessly merged, a little gradient. Smoother animations: text that comes in slowly,
> like a gradient, in the chat and the setup questions; better type. Show a slide only when it deserves it, let it
> arrive gradually, and when the answer is right on the slide, highlight that part with a slow animation. Let the
> audience give feedback to the speaker, with a reminder to keep it constructive. A quick, simple trend view for the
> speaker after the talk. A separate portal only for me with complete analysis of how the site is used, following
> best practice and the privacy rules. A FinOps skills library in the codebase. "Next" and "Finish" in the setup
> questions are confusing; explain briefly why each question is asked. When a speaker tests their own code and isn't
> satisfied, let them correct it and have that taken in. Several slide designs for the QR code to scroll through and
> download, more explicit than just the code. A quick "not satisfied, ask the speaker" button in the chat.

> (later) "Every question gets an answer." as the headline, with a slogan about elevating the Q&A; simpler wording.
> The film: an AI / software-development topic, seen from an audience member who looks at the stage, scans the code
> and zooms into the phone; a cursor instead of a dot; people that look like people; steps 1–4; more space. Remove
> the lede. A better Why: the real meaning (unasked questions, not comfortable asking, connecting after), more
> pictures, less text, don't limit who it's for, a sliding sequence. A "How it works" tab, and a deeper page linked
> under the last step. Research messaging and positioning. Several branded QR code styles, maybe an animated GIF.
> Don't say "Answers are automated and come from the speaker's own material" on the home page.

**Actions**
- [x] All of the above, 2026-11-14. See docs/LOG.md. The home-page footer line is gone; every answer in the chat still says "automated" (EU AI Act).

## 2026-11-12 (in chat, evening)

> LinkedIn "is not so seamless. It's just like a URL"; a used suggested question should be replaced; the voice button
> doesn't activate; the audience needs a quick way to contact the speaker and see who they are; a notice in the app
> when the speaker replies (not email); an in-depth privacy policy; a daily "Auto Q&A security" session whose
> results go into the morning email.

**Actions**
- [x] All of the above, 2026-11-12. The security session runs daily at 03:07 (`.claude/skills/security-audit/`).

## 2026-11-12 (from his reply of 11 November to "Auto Q&A this morning: Wednesday 11 November")

He was answering the question "should the 'send to speaker' form ask everyone for a LinkedIn link, or only when
the speaker added theirs?"

> It should always ask for the users for their LinkedIn, but in a open way, and there should be a smart way for
> the user to know why it's asking for the LinkedIn, because the speaker can connect with you on LinkedIn after,
> if needed. Be clever with the UI.

**Actions**
- [x] Keep the LinkedIn field on every "send to the speaker" form, at every kind of talk. Decided: do not hide it
      when the speaker has no link of their own. (Closes the open roadmap line about this.)
- [x] Ask in an open way: clearly optional, never blocking "Send", never an error when left empty.
- [x] Say why, right at the field and in very few words: the speaker can connect with you on LinkedIn afterwards
      if needed. Name the speaker, as the rest of the card does.
- [x] "Be clever with the UI": this is a design task for the design session. Find a neat way to show the reason
      (not a long sentence of small print), on a phone first, and prove it with before/after screenshots.
- [x] Check the speaker's side matches the promise: the speaker can actually see and open the asker's LinkedIn link.
  Done 2026-11-12: the field shows a LinkedIn badge and a fixed "linkedin.com/in/" so people type only their name;
  a pasted link or @handle is tidied; the line under it says why. See docs/LOG.md.
