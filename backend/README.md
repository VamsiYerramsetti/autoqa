# Backend README

The backend is an Express + TypeScript API service.

## Local role

The backend still runs as a separate process on port `4000` internally, but the normal browser entry point remains `http://localhost:3000` because the frontend proxies API calls for you.

## Auth storage

On startup the backend creates a file-backed local auth database at `backend/data/auth-db.json`.

The local development setup reads the login record you use for your workspace from that file. On a fresh setup, you can also provide `AUTOQA_LOCAL_USERNAME`, `AUTOQA_LOCAL_PASSWORD`, and optionally `AUTOQA_LOCAL_DISPLAY_NAME` before first startup.

Protected endpoints use an HTTP-only session cookie after `/api/auth/login` succeeds.

## Presentation storage

Speaker presentation records, QR scan counts, and audience questions are persisted in `backend/data/presentations-db.json`.

The backend now serves both authenticated speaker APIs and public audience endpoints for QR-based question submission.
