# Frontend README

The frontend is a Next.js App Router app.

## Key local behavior

Use only:

```text
http://localhost:3000
```

Frontend code calls same-origin endpoints like `/api/upload`. Next.js rewrites those calls to the backend service automatically.

## Auth UX

- the header now includes a `Log in` action
- clicking the upload area while signed out opens a login popup
- the popup behaves like a standard website sign-in form and does not expose stored credentials
- after login, the frontend keeps auth state in sync by calling `/api/auth/session`

## Speaker routes

- `/speaker` shows the presentation dashboard
- `/speaker/new` embeds the full 3-step presentation builder
- `/speaker/questions` collects audience questions across QR links
- `/speaker/presentations/[id]` shows one presentation and its question stream
- `/audience/[id]` is the public attendee question form reached from a generated QR link
