---
name: security-audit
description: Check Auto Q&A for security, privacy, legal and search-engine problems, fix the small ones with a test, and record the rest. Use for the daily Security session or when asked to "audit", "harden", "check privacy/GDPR" or "is it safe".
---

Read `docs/SECURITY.md` first: it lists what is already in place and what does not apply yet. Don't redo settled items;
re-check them quickly and spend the time on what's new.

## 1. Look outside (15 minutes at most)
Search the web for what changed recently and what people commonly get wrong in small web apps:
- new advisories for our dependencies (`npm audit`, `npm outdated`, the GitHub advisory database)
- OWASP Top 10 / OWASP ASVS items for session handling, access control, uploads, rate limits
- EU rules that touch us: GDPR guidance from the Autoriteit Persoonsgegevens and the EDPB, the EU AI Act transparency
  duties, ePrivacy/cookie rules; plus anything in the news about small apps being fined or breached
- for every idea found, ask: does it apply to Auto Q&A **now** (no payments, no marketing email, EU operator, speakers
  sign in, audience never does)? Write the ones that don't apply into the checklist as "Not applicable" with the reason.

## 2. Look inside
Walk the whole product with fresh eyes, in this order, and write down anything wrong:
1. `git log -p` since the last Security entry in `docs/LOG.md`: did anyone add a route, a field, a page or a dependency?
2. Every route in `server.js`: who may call it? Does it check the talk belongs to the signed-in account? Is there a limit?
   Does it accept more than it needs? Could a stranger read someone else's question, email or LinkedIn?
3. Every place user text reaches a page (`public/js/*.js`): text nodes only, never `innerHTML` with user data.
4. Secrets: `git grep -nE "sk-ant|postgres(ql)?://[^ ]*@|RENDER_DEPLOY|password\s*=\s*['\"]"`; also scan new commits.
5. Headers on a running local copy (`curl -sI`): CSP, frame-ancestors, HSTS (hosted only), nosniff, Permissions-Policy.
6. Personal data: anything new collected? Is it in `/privacy` (what, why, who receives it, how long)? Does `tidyUp()` delete it?
7. Pages: every public page has its own title, description, one h1, canonical; `/sitemap.xml` and `/robots.txt` are right;
   talk and speaker pages are `noindex`; a wrong address returns a real 404.
8. Accessibility quick pass: images have alt text, buttons have names, focus is visible, contrast holds in dark mode.

Optionally have the `security-reviewer` agent read the changed files independently.

## 3. Fix, small and proven
- Fix at most three things per session, smallest risk first. Each fix gets a check in `test/smoke.mjs`.
- Never weaken a protection to make a test pass. Never print, log or commit a secret, even a fake-looking one.
- Anything touching sign-in, stored data format or deletion: open a pull request instead of pushing to `main`.
- Run `npm test`, `git pull --rebase origin main`, push, and wait for the "Live site" workflow to pass.
- Never attack the live site, never run outside scanners against it, never create accounts on other services.
  Pen-test tools (e.g. Strix) may only run against a local copy, after reading their code.

## 4. Record
- Update `docs/SECURITY.md`: tables, and a dated line at the top of "Findings log".
- Add a dated entry at the top of `docs/LOG.md` titled `## <date> (night): Security`. Its first two lines are plain
  sentences the morning email can quote: what was checked, what was fixed, anything risky left.
- Anything that needs Vamsi (keys, accounts, lawyers, money, settings) goes under "For Vamsi".
