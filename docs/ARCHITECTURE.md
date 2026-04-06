# Architecture Guide

## High-level structure

- `frontend/` — Next.js product website and interaction flow
- `backend/` — Express API for upload/session/share logic

## Local access model

Even though the code is split into frontend and backend, the local browser entry point is intentionally simplified to:

```text
http://localhost:3000
```

The frontend proxies requests to the backend using Next.js rewrites.

## Flow

1. homepage render
2. upload files to `/api/upload`
3. transition into clarification UI
4. save clarification edits to `/api/clarifications`
5. generate share URL with `/api/qr`
6. render QR code and audience preview
