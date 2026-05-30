# Architecture Guide

## High-level structure

- `frontend/` — Next.js product website and interaction flow
- `backend/` — Express API for auth, upload, session, and share logic

## Auth layer

- local auth data is stored in `backend/data/auth-db.json`
- presentation and audience-question data is stored in `backend/data/presentations-db.json`
- a fresh local setup can seed one initial account from `AUTOQA_LOCAL_USERNAME`, `AUTOQA_LOCAL_PASSWORD`, and `AUTOQA_LOCAL_DISPLAY_NAME`
- the frontend calls `/api/auth/session` on load to hydrate login state
- successful login sets an HTTP-only cookie used by protected API routes

## Speaker workspace

- public marketing pages live on `/`
- authenticated speaker pages live under `/speaker`
- `/speaker/new` hosts the 3-step presentation setup flow
- `/speaker/questions` aggregates audience questions across presentations
- `/speaker/presentations/[id]` shows per-presentation assets, QR status, scans, and audience questions
- audience QR links resolve to `/audience/[id]?token=...`

## Local access model

Even though the code is split into frontend and backend, the local browser entry point is intentionally simplified to:

```text
http://localhost:3000
```

The frontend proxies requests to the backend using Next.js rewrites.

## Flow

1. homepage render
2. user logs in from the header or upload gate
3. upload files to `/api/upload`
4. transition into clarification UI
5. save clarification edits to `/api/clarifications`
6. generate share URL with `/api/qr`
7. move into the speaker workspace presentation view
8. audience members scan the QR code, land on `/audience/[id]`, and submit grounded questions
