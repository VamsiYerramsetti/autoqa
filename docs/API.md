# API Reference

For local testing, these are used from the same origin on:

```text
http://localhost:3000
```

## GET /health
Returns the backend health payload.

## GET /api/auth/session
Returns the current auth session.

Response shape:

```json
{
	"authenticated": true,
	"user": {
		"id": "...",
		"username": "your-username",
		"displayName": "Your Name"
	}
}
```

## POST /api/auth/login
Accepts JSON with `username` and `password`, validates against the local auth database, and sets an HTTP-only session cookie.

## POST /api/auth/logout
Clears the current session cookie and removes the stored local session.

## POST /api/auth/register
Creates a speaker account, starts a session, and returns the authenticated user payload.

## POST /api/upload
Accepts multipart files and creates a speaker-owned presentation session.

Accepted fields:

- `files` multipart payload
- optional `title` string

## POST /api/clarifications
Stores edited clarification data.

## GET /api/session/:id
Returns one speaker-owned presentation payload.

## GET /api/presentations
Returns all presentations owned by the logged-in speaker.

## POST /api/qr
Returns a share token and share URL.

## GET /api/public/presentations/:id?token=...
Validates the share token, records a QR scan, and returns the public audience view payload.

## POST /api/public/presentations/:id/questions
Accepts `token`, `question`, and optional `attendeeName`, then appends an audience question to the presentation.

## Protected endpoints

These endpoints now return `401` until the user is logged in:

- `POST /api/upload`
- `POST /api/clarifications`
- `GET /api/session/:id`
- `GET /api/presentations`
- `POST /api/qr`
