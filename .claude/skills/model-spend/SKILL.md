---
name: model-spend
description: Report what Auto Q&A has spent on model calls - per day, per model, per talk, per question - from the app's own records. Use when asked about cost, spend, the bill, cost per talk or question, or whether costs are going up.
---

# Model spend

Every model call the app makes is recorded as a `model_call` event in the saved data (Postgres on the live site, a JSON file locally) (no text, only token counts,
model, kind and time). Prices live in `lib/prices.js`, copied from Anthropic's price list. This skill reads both;
nothing has to be worked out again by hand.

## Run it

```bash
node .claude/skills/model-spend/spend.mjs            # last 30 days: the live database if DATABASE_URL is set, else data/db.json
node .claude/skills/model-spend/spend.mjs --days 7
node .claude/skills/model-spend/spend.mjs --data /path/to/db.json --json   # machine-readable
```

It prints: total, per day, per model, per kind (`answer` = audience answers, `prepare` = reading a deck),
the 10 most expensive talks, cost per question, share of prompt tokens read from cache, and how many calls went
over 100K prompt tokens (Haiku 5.5 bills those at 5x).

## Reading the result

- **Cost per question** is the number to watch. With Haiku 5.5 and a warm cache it should be a fraction of a cent.
- **Cache share below ~70%** on `answer` calls means the cache isn't being reused: run `prompt-cache-audit`.
- **Any call over 100K tokens**: run `long-prompt-guard`.
- `prepare` is one call per talk on Sonnet; it is expected to be the larger single cost per talk.
- Speakers' own test questions are included here (they cost money) but marked `test` - the script shows them separately.

## When prices change

Edit `lib/prices.js` only (check https://platform.claude.com/docs/en/about-claude/pricing). The portal and every
skill read from it.

## Without the database

The founder portal (`/admin`, section "Speed and cost") shows the same totals for any period. Use it when
DATABASE_URL isn't available in the session.
