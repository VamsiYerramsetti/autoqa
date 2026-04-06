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

## Optional health check

```text
http://localhost:3000/health
```

## Internal local routing

- frontend listens on `3000`
- backend listens on `4000`
- frontend proxies `/api/*` and `/health` to backend
- the browser only needs `localhost:3000`
