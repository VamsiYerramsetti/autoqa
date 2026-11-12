# Instructions for AI agents working on Auto Q&A

This file is for any AI coding agent (Claude, Codex, Cursor, ...). People should start with `README.md`.

## What this is
Auto Q&A lets a speaker upload slides and show a QR code. The audience asks questions from their phones.
Answers come from the speaker's own material and show the slide they rest on. Anything the material
doesn't cover is offered to the speaker, who replies later. Owner: Vamsi. Live site: https://autoqa-jcol.onrender.com

## Read first, every session
1. `docs/FEEDBACK.md` if present: Vamsi's feedback. It outranks everything else.
2. `docs/BLUEPRINT.md`: what the product is and why.
3. `docs/DESIGN.md`: the look (colours, type, logo, motion) and the design log. For any design work also
   `docs/DESIGN-SKILLS.md`: the two outside design skills Vamsi wants used, and how.
4. `docs/ROADMAP.md`: what's next.
5. The top three entries of `docs/LOG.md`: what the last sessions did.
6. `docs/SECURITY.md` before touching sign-in, personal data, uploads or pages.
7. `docs/TESTING.md`, and for persona testing `docs/PERSONAS.md` plus the newest report in `docs/persona-runs/`.

## Map of the code
| Job | File | Notes |
|---|---|---|
| Web server, every page and API route | `server.js` | Grouped by section comments: accounts, speaker setup, inbox, audience, numbers, pages |
| Talking to the model | `lib/ai.js` | The answering instructions are the `systemBlocks` text. Change wording there to change answer behaviour |
| Reading PDF, PowerPoint, Word, text | `lib/parse.js` | Turns files into labelled units ("Slide 4") |
| Storage and passwords | `lib/store.js` | Postgres when `DATABASE_URL` is set, else a JSON file. One saved document + slide pictures |
| Pages | `public/*.html` | One small HTML file per page |
| Page behaviour | `public/js/*.js` | One script per page; shared helpers in `common.js` |
| Look | `public/css/app.css` | All colours and fonts are variables at the top (`:root`) |
| Whole-product test | `test/smoke.mjs` | `npm test`; `SITE=<address> npm test` tests a live site |
| Made-up talks for testing | `test/persona.mjs`, `test/scenarios/` | See `docs/PERSONAS.md` |

## Product rules
- Very few words on screen. Plain language. No AI jargon ("AI-powered", "assistant", "magic"), no sparkle icons, no gradients, no stock illustrations.
- The audience side is designed for a phone first. Touch targets at least 44px. Respect reduced motion.
- Never guess facts about a talk: if the material doesn't say it, offer it to the speaker. General questions about the subject
  may be answered from general knowledge, clearly marked as not from the talk, with the speaker offered as an extra.
- Always say answers are automated (EU AI Act transparency), in plain words.
- Ask for personal details only when there is a reason, and say who receives them.
- No tracking cookies and no third-party trackers. The one cookie is the sign-in session.
- The look is defined in `docs/DESIGN.md`. It may evolve (colour, logo, type, motion), but only deliberately:
  one coherent change across every screen at once, recorded in `docs/DESIGN.md` with before/after screenshots.

## Engineering rules
- Plain Node + Express + hand-written HTML/CSS/JS. No frameworks, no build step, no native dependencies.
- Keep it readable: short functions, plain names, a one-line comment above anything non-obvious saying *why*.
  A newcomer should understand a file by reading it top to bottom. Split a file only when it has grown two jobs.
- Secrets (API key, database address, deploy hook) come from environment variables only. Never commit, print or log them.
- `npm test` must pass before every push. Add a check to `test/smoke.mjs` for each new behaviour.
- Look at what you built: run the app, take screenshots at 1280x860 and 390 wide, and read them critically.
- Several scheduled sessions push here. Always `git pull --rebase origin main` right before pushing.
- Every push to `main` is deployed automatically and tested on the live site by the "Live site" workflow.
  A red run means the live site is broken: fix or revert in the same session.
- Small commits with plain messages. Use a pull request instead of pushing to `main` for risky changes
  (sign-in, storage format, deleting data) and say so in the log.
- Never break existing data: old talks and accounts must keep working after any change.

## After every session
- Tick finished items in `docs/ROADMAP.md`; add new ideas there, one clear line each.
- Add a dated entry at the top of `docs/LOG.md`: what changed, what was tested, what's unfinished,
  and anything Vamsi must decide under a "For Vamsi" heading.
- If you changed how something works, update the plain-language docs (`README.md`, `docs/HOW-IT-WORKS.md`) in the same commit.

## Do not
Deploy anywhere new, create accounts on outside services, send emails or messages to anyone, spend money,
or change repository settings. If something needs one of those, write it under "For Vamsi".

## The daily sessions (Europe/Amsterdam)
Four scheduled sessions work here every night and morning without Vamsi. Each leaves a dated entry at the top of `docs/LOG.md`
whose first lines are plain sentences, because the email quotes them.
1. 00:13 **Design**: one visible step a day, using the two skills in `docs/DESIGN-SKILLS.md`. (Moved from 05:00 so it gets its own usage window.)
2. 03:07 **Security**: looks online for current security, privacy and legal practice, audits the whole product with
   `.claude/skills/security-audit/`, fixes up to three small things with tests, and records them in `docs/SECURITY.md`.
3. 05:40 **Test and improve**: a made-up conference talk and audience on the live site, a fix proven by a re-run, then one improvement.
4. 07:45 **Morning email**: a short summary to Vamsi's own inbox. His replies to that email are written into
   `docs/FEEDBACK.md`, which every session reads first. This is the only email any session may send.

## Reusable instructions
- `.claude/skills/persona-test/`: run a persona test (made-up talk and audience) on the live site.
- `.claude/skills/design-pass/`: improve one part of the experience, with before/after proof.
- `.claude/skills/security-audit/`: the security, privacy, legal and search-engine check.
- `.claude/agents/answer-judge.md`: an independent judge for persona transcripts.
- `.claude/agents/security-reviewer.md`: an independent reader of code changes, looking for holes.
Agents other than Claude can read these as plain Markdown instructions.
