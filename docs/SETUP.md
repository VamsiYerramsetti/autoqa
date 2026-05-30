# Setup Guide

## Local goal

Use a single browser URL for testing:

```text
http://localhost:3000
```

No separate frontend or backend env files are required.

## Prerequisites

- Node.js 20+
- npm 10+

## Install dependencies

```bash
npm install
```

## Start both services

```bash
npm run dev
```

## Open the app

```text
http://localhost:3000
```

## Local authentication

When the backend starts, it creates a local file-backed auth database here:

```text
backend/data/auth-db.json
```

The file stores the local login record used by your development setup.

Presentation sessions, QR scans, and audience questions are stored here:

```text
backend/data/presentations-db.json
```

If you are setting up a fresh environment, create the record in `backend/data/auth-db.json` or provide local values through `AUTOQA_LOCAL_USERNAME`, `AUTOQA_LOCAL_PASSWORD`, and optionally `AUTOQA_LOCAL_DISPLAY_NAME` before first startup.

Use the `Log in` button in the header or click into the upload area to open the login modal, then enter the credentials you configured locally.

## Speaker workspace flow

After login, the product routes into the speaker workspace:

- `/speaker` for presentation overview
- `/speaker/new` for the 3-step new presentation flow
- `/speaker/questions` for the audience inbox across presentations
- `/speaker/profile` for speaker account details

## Optional health check

```text
http://localhost:3000/health
```

## Internal local routing

- frontend listens on `3000`
- backend listens on `4000`
- frontend proxies `/api/*` and `/health` to backend
- the browser only needs `localhost:3000`
- auth state is stored in an HTTP-only session cookie set by the backend
