# Auto Q&A

**Every question at a talk gets an answer.**

At most talks, some questions never get asked (people are shy) and many never get answered (there's no time).
Auto Q&A fixes both:

1. **The speaker** uploads their slides before the talk and answers a few quick questions about it.
2. **The audience** scans a QR code on the screen and asks questions from their phones. No app, no sign-up.
3. **Answers come straight away**, in plain words, taken from the speaker's own slides. Each answer shows the slide it came from.
4. **Anything the slides don't cover** can be sent to the speaker, who replies after the talk. The reply appears in the
   person's chat, and from then on everyone else who asks gets it straight away.

Try it: **https://autoqa-jcol.onrender.com**
(On the free hosting plan the site sleeps when nobody uses it; the first visit can take a minute.)

## Where things are, in plain words

| If you want to... | Look at |
|---|---|
| Understand how it works, without code | [`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md) |
| See what the product is meant to be and why | [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) |
| See what's planned next | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| See what changed recently | [`docs/LOG.md`](docs/LOG.md) (newest first) |
| See how it looks and why | [`docs/DESIGN.md`](docs/DESIGN.md) |
| See how it's tested | [`docs/TESTING.md`](docs/TESTING.md) and [`docs/PERSONAS.md`](docs/PERSONAS.md) |
| Give feedback that will be acted on | Write it in `docs/FEEDBACK.md` (or tell Claude in the project chat) |
| Work on the code with an AI agent | [`AGENTS.md`](AGENTS.md) |

## Who works on it

Vamsi owns the product. Claude improves it every day in scheduled sessions: testing it with made-up speakers
and audiences, improving the design, researching and building features. Each session writes what it did in
`docs/LOG.md` and sends Vamsi a short message. Every change is tested automatically and then goes live.

## Running it yourself (technical)

You need [Node.js](https://nodejs.org) 22 or newer.

```
npm install
npm test     # walks through the whole product automatically: sign up, set up a talk, ask, hand off, reply
npm start    # then open http://localhost:4321
```

Without an Anthropic API key it runs in "practice mode": answers are simple word matches. Settings are listed in
`.env.example`.

### How the live site is set up
- **GitHub** stores the code. **Render** runs it (settings in `render.yaml`). **Neon** stores the data (Postgres).
- On Render the settings are `ANTHROPIC_API_KEY`, `DATABASE_URL` and `ADMIN_EMAIL` (the account that may open `/admin`).
- Every push to `main` triggers a deploy (GitHub secret `RENDER_DEPLOY_HOOK`), then the "Live site" workflow
  tests the real site.
