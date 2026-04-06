# API Reference

For local testing, these are used from the same origin on:

```text
http://localhost:3000
```

## GET /health
Returns the backend health payload.

## POST /api/upload
Accepts multipart files and creates a new in-memory session.

## POST /api/clarifications
Stores edited clarification data.

## GET /api/session/:id
Returns a session payload.

## POST /api/qr
Returns a share token and share URL.
