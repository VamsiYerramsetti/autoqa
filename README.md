# Auto Q&A

Every question at a talk gets an answer. The audience scans a code and asks from their phones;
answers come from the speaker's own slides and show the slide they rest on; anything the slides
can't answer goes to the speaker, who replies afterwards.

## Put it online (about ten minutes, once)

GitHub stores the code. A hosting service runs it. The repository is set up for [Render](https://render.com):

1. Sign in to Render with your GitHub account.
2. **New > Blueprint**, choose this repository. Render reads `render.yaml`.
3. When asked, fill in:
   - `ANTHROPIC_API_KEY`: your Anthropic key.
   - `DATABASE_URL`: a Postgres address. Create a free database at [neon.tech](https://neon.tech) and paste its connection string. Leave empty to try things out; data is then wiped on every deploy.
   - `ADMIN_EMAIL`: the email you will sign up with. That account can open `/admin`.
4. Render gives you an address like `https://autoqa.onrender.com`. Every push to `main` redeploys it.

On Render's free plan the site sleeps after 15 minutes without visitors and takes about a minute to wake.

## What's where

| Part | File |
|---|---|
| Server and all routes | `server.js` |
| Reading PDF / PowerPoint / Word files | `lib/parse.js` |
| Everything that talks to the model (the instructions live here) | `lib/ai.js` |
| Storage, accounts' password hashing | `lib/store.js` |
| Pages | `public/*.html`, `public/js/*.js`, `public/css/app.css` |
| End-to-end test | `test/smoke.mjs` (`npm test`) |

Pages: `/` home, `/signup` and `/signin`, `/talks` your talks, `/new` set up a talk, `/s/:id` questions for
the speaker, `/present/:id` the code for the big screen, `/j/:code` the audience chat, `/admin` numbers, `/privacy`.

## Working on it

```
npm install
npm test          # walks the whole product: sign up, set up a talk, ask, hand off, reply
npm start         # http://localhost:4321
```

Project notes live in `docs/`: `BLUEPRINT.md` (what and why), `ROADMAP.md` (what's next),
`LOG.md` (what was done, newest first), `TESTING.md` (how to test), `FEEDBACK.md` (Vamsi's feedback).
`CLAUDE.md` holds the working rules for the scheduled build sessions.
