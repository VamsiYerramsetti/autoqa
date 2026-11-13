# Security, privacy and legal: where Auto Q&A stands

Plain-language record of what protects the product, what was checked, and what is left.
The daily **Security** session (03:07) re-checks this list, adds new items it finds online, and updates this file.
How to run the check: `.claude/skills/security-audit/SKILL.md`.

## What protects the product today
| Area | What is in place | Where |
|---|---|---|
| Secrets | API key, database address and deploy hook only in environment variables; never in code, logs or Git history (all 32 commits scanned 12 Nov 2026) | `server.js`, Render, GitHub secrets |
| Passwords | scrypt with a random salt; sign-in takes the same time whether or not the account exists | `lib/store.js`, `server.js` |
| Sessions | One cookie, `HttpOnly`, `SameSite=Lax`, `Secure` when hosted. The database keeps only a fingerprint (sha256) of each session, so a leaked copy of the data can't sign anyone in | `server.js` |
| Own data only | Every speaker route checks the talk belongs to the signed-in account; uploads are refused before the file is read if not | `ownTalk`, `ownTalkFirst` |
| Admin | `/admin` numbers only for the address in `ADMIN_EMAIL`; checked on the live site after every deploy | `server.js`, `test/smoke.mjs` |
| Cross-site requests | Writes from another website are refused (Origin / Sec-Fetch-Site) | `server.js` |
| Browser rules | Content-Security-Policy (no inline scripts, no outside sources), no framing, HSTS, nosniff, referrer trimmed to the site name, camera/location off, microphone only for our own pages | `server.js` |
| XSS | All user text is put on the page as text, never as HTML | `public/js/*` |
| Limits | Per-seat, per-talk and per-day question limits (cost control), generous per-address limits so a venue sharing one Wi-Fi address still works, upload and talk-count limits per account | `LIMITS` in `server.js` |
| Uploads | 50 MB per file, 3 files, only PDF/PowerPoint/Word/text; zip parts capped by the bytes that really come out, not the size the file claims; XML and slide text read in one pass so a hostile file can't stall the server | `lib/parse.js`, `lib/zip.js`, `lib/pptx-render.js` |
| PowerPoint drawings | Theme colours must be plain six-digit colours before they reach the SVG; text is escaped; outside links dropped; a drawn slide is served sandboxed, with no scripts, forms or framing | `lib/pptx-render.js`, `sendSvg` in `server.js` |
| Database | TLS with certificate checking (Neon) | `lib/store.js` |
| Dependencies | `npm audit`: 0 known vulnerabilities (13 Nov 2026); multer 2.5.0 is past the Aug 2026 fixes (2.3.0) | `package.json` |
| Errors | No stack traces or debug output to visitors; one generic message | `server.js` |

## Privacy and legal checklist (EU first: the operator is in the Netherlands)
| Item | Status |
|---|---|
| Privacy notice: who, what, why, legal basis, who receives it, transfers, how long, rights, complaint to Autoriteit Persoonsgegevens | Done, `/privacy` |
| How answers work (automated, which model company, no training on your data, limits) — EU AI Act transparency | Done, `/how-answers-work`, plus a line on every audience screen |
| Terms of use, incl. speaker responsibility for uploaded material and a takedown address | Done, `/terms` |
| Minimum age: 16 (GDPR consent age in the Netherlands); stated at sign-up and in the notice | Done |
| Ask for personal details only when needed and say who receives them | Done: only when sending a question to the speaker, anonymous by default option |
| Delete-my-details button | Done, bottom of `/privacy` |
| Retention: audience name/email/LinkedIn removed after 90 days, counts after 365 | Done, `tidyUp()` |
| Cookie banner | Not needed: one strictly necessary sign-in cookie, no tracking. Re-check if analytics is ever added |
| Fonts from Google (Munich IP ruling) | Not applicable: fonts are self-hosted, licence in `public/fonts/LICENSE.md` |
| Session replay / keystroke analytics | Not applicable: none used |
| Marketing email unsubscribe / postal address | Not applicable until we send marketing email |
| Payments, renewal terms, refund policy | Not applicable until we charge money |
| Copyright agent (US DMCA) | Optional until US launch; takedown address is in the terms |
| Accessibility: alt text, contrast, keyboard, 44px targets | Mostly done; checked by the design session |
| SEO basics: unique titles and descriptions, one h1, canonical, sitemap, robots, real 404, crawlers allowed on public pages, talk pages `noindex` | Done |

## For Vamsi (needs a person)
- Set `CONTACT_EMAIL` and `OPERATOR_NAME` on Render. Until then the legal pages say "its founder" and a placeholder.
- Rotate the Anthropic API key and the Neon database password: both were pasted into a chat once.
- Before a public launch, have a lawyer read `/privacy` and `/terms` (they follow published guidance but are not legal advice).
- Render runs in the US. An EU region would need a new Render service; the notice already explains the transfer.
- Pen-testing tools like Strix: only ever point them at a local copy, never at the live site, and read their code first.

## Findings log (newest first)
- 2026-11-13: audit of the new PowerPoint drawing, QR and home-page code (independent reviewer agent + own checks). Fixed: a deck's theme colour could put markup (a fake sign-in form) into a slide drawing served on our own address; unclosed `<!`/`<a:p`/`<p:sldId` made reading a file take minutes to hours (one upload could freeze the site); zip parts trusted the size the file claims. Left for later (roadmap): slide drawings can be big in storage (a picture repeated on every slide is copied into each); Word files go through mammoth's own unzip without our byte cap; slide size from the file is not clamped (only the uploader's own tab can crash); legal pages have no canonical link.
- 2026-11-12: first full audit. Fixed: no CSP/HSTS, cross-site writes, uploads read before sign-in check, per-address limit that would block a whole venue, plain session tokens in the database, sign-in timing leak, unchecked database certificate, open-redirect edge in `next=`, zip-bomb guard, no retention. Voice input was blocked by our own `microphone=()` rule.
