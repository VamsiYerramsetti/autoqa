# Feedback from Vamsi (newest first)

Vamsi's replies to the morning email, in his words, with what to do about each. Every session reads this first;
it outranks the roadmap. Tick an action when it is done and say so in `docs/LOG.md`.

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
