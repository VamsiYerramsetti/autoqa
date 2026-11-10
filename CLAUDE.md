# Working rules for this repository

Auto Q&A is Vamsi's product. Claude maintains it in scheduled sessions; Vamsi reviews every few days.

## Before changing anything
Read `docs/BLUEPRINT.md`, `docs/ROADMAP.md`, the top entries of `docs/LOG.md`, `docs/TESTING.md`, the newest report in `docs/persona-runs/`, and `docs/FEEDBACK.md` if present.
Vamsi's feedback outranks the roadmap order.

## Product rules
- Very few words on screen. Plain language. No AI jargon, no sparkle icons, no gradients.
- Flat colour: cobalt = answered, yellow = waiting for the speaker, ink for the rest. Two bundled fonts only.
- The audience side is designed for a phone first.
- Never guess facts about a talk: if the material doesn't say it, hand it to the speaker.
- Ask people for personal details only when there is a reason, and say who receives them.
- No tracking cookies and no third-party trackers. The one cookie is the sign-in session.

## Engineering rules
- Plain Node + Express + hand-written HTML/CSS/JS. No frameworks, no build step, no native dependencies.
- Secrets (API key, database address) come from environment variables only. Never commit, print or log them.
- `npm test` must pass before every push. Add a check to `test/smoke.mjs` for each new behaviour.
- Look at what you built: run the app, take screenshots at 1280x860 and phone size, and read them critically.
- Several scheduled sessions push to this repository. Always `git pull --rebase origin main` right before pushing.
- Every push to `main` is deployed to the live site and tested there by the "Live site" workflow. Check that it passed; a red run means the live site is broken, so fix or revert in the same session.
- Small commits with plain messages. Push to `main` only when tests pass; use a pull request for anything risky
  (storage format changes, sign-in, deleting data) and say so in the log.
- Never delete user data formats without a migration: existing talks and accounts must keep working.

## After every session
- Tick finished items in `docs/ROADMAP.md`; add new ideas there with one clear line each.
- Add a dated entry at the top of `docs/LOG.md`: what changed, what was tested, what is unfinished,
  and anything Vamsi must decide under a "For Vamsi" heading.

## Do not
Deploy anywhere new, create accounts on outside services, send emails or messages to anyone, spend money,
or change repository settings. If something needs one of those, write it under "For Vamsi".
