# Docker Guide

Start everything with:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

The frontend container proxies `/api/*` and `/health` to the backend container internally.

## Auth database persistence

The compose file mounts a named volume at `/app/data` inside the backend container.
That keeps the generated local auth database and session records across container restarts.

That persisted data includes the locally configured login record used by the app.
