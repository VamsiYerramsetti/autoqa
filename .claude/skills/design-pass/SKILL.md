---
name: design-pass
description: Improve one screen or moment of Auto Q&A's experience (layout, wording, colour, motion, interaction), with research first and before/after screenshots as proof. Use for any UI or design work on this repository.
---

1. Read `docs/DESIGN.md` (principles, current system, design log) and the newest persona report for confusing moments.
2. Screenshot the whole journey at 1280x860 and 390 wide with Playwright (`require('playwright')`; start the app with
   `PORT=<free port> AUTOQA_DATA=<temp file> node server.js`). Include empty, loading, error and long-content states.
3. Pick ONE focus. Search the web for how the best-crafted products handle that exact moment; note specific patterns
   and sources.
4. Change it. Work from the variables at the top of `public/css/app.css`; keep selectors simple and comment why.
   Touch targets 44px+, visible focus, contrast 4.5:1, motion only in answer to an action, honour reduced motion.
5. Screenshot the same states again and put before/after side by side (Python PIL is available). Look hard. If it is
   not clearly better, iterate or revert. Check neighbouring screens.
6. `npm test`, then add or adjust a check in `test/smoke.mjs` if behaviour changed.
7. Record in `docs/DESIGN.md` (date, focus, change, reason, sources, rejected ideas, next candidates) and `docs/LOG.md`.
