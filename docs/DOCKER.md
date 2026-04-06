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
