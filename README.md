# AutoQ&A

AutoQ&A is a **website-first, presentation-grounded AI Q&A experience** rebuilt as a monorepo with two code folders:

- `frontend/` — the premium Next.js website and interactive user flow
- `backend/` — the Express + TypeScript API server

## The one thing that changed in this version

For local testing, you should only need **one browser URL**:

```text
http://localhost:3000
```

You do **not** need a separate frontend env file.
You do **not** need a separate backend env file.
You do **not** need to manually call the backend port from the browser.

The frontend proxies these same-origin paths internally:

- `/api/*`
- `/health`

So the browser experience feels like a single app on a single local URL.

---

## Quick start

```bash
unzip autoqa.zip
cd autoqa
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Local runtime model

Internally during local development:

- frontend runs on `localhost:3000`
- backend runs on `localhost:4000`

But externally, for your browser and manual testing, you use only:

```text
http://localhost:3000
```

This works because the frontend rewrites `/api/*` and `/health` to the backend automatically.

---

## Repository structure

```text
autoqa/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── README.md
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DOCKER.md
│   └── SETUP.md
├── frontend/
│   ├── README.md
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.mjs
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next-env.d.ts
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
└── backend/
    ├── README.md
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── src/
```

---

## Product summary

AutoQ&A turns presentation material into a grounded audience Q&A experience.

The intended flow is:

1. land on the website
2. understand the product immediately
3. upload files with no sign-in
4. see polished processing feedback
5. review likely audience questions
6. generate a QR-ready audience link

### Product trust model

The experience emphasizes three core rules:

- answers should come only from uploaded and speaker-approved material
- speaker clarifications improve relevance and scope control
- the system should abstain instead of guessing

---

## Setup overview

### Local Node-based setup

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Docker setup

```bash
docker compose up --build
```

Then open:

```text
http://localhost:3000
```

---

## Environment philosophy

This repository no longer requires separate env files for frontend and backend in normal local development.

### Default behavior

Everything works with code defaults.

### Optional root-level env only

A root `.env.example` is provided if you want to override defaults such as the backend proxy target, but the standard local flow does not require any env file creation.

---

## Main scripts

- `npm run dev` — run frontend + backend together
- `npm run dev:frontend` — run only the frontend
- `npm run dev:backend` — run only the backend
- `npm run build` — build backend then frontend
- `npm run start` — start production servers for both workspaces
- `npm run lint` — lint the frontend
- `npm run typecheck` — typecheck frontend + backend

---

## Documentation map

- `docs/SETUP.md` — detailed setup instructions
- `docs/DOCKER.md` — Docker guidance
- `docs/ARCHITECTURE.md` — architecture walkthrough
- `docs/API.md` — API reference
- `frontend/README.md` — frontend notes
- `backend/README.md` — backend notes
