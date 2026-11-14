---
name: prompt-cache-audit
description: Check whether Auto Q&A's prompt caching is working and what it saves, per talk. Use when cache share is low, answer cost per question goes up, or after changing the prompt in lib/ai.js.
---

# Prompt cache audit

## How caching is set up (lib/ai.js, `systemBlocks`)

1. Block 1, **cached**: the answering rules + the whole talk material + the speaker's setup answers.
   It carries `cache_control: { type: 'ephemeral' }` (5-minute cache, refreshed on every hit).
2. Block 2, not cached: the speaker's fixes from testing (changes rarely, small).
3. Block 3, not cached: speaker replies to earlier questions (grows during a talk, small).

Anything that changes per question must stay **after** block 1, or every question rewrites the cache.
Cache reads on Haiku 5.5 cost 10% of normal input; writes cost 125%.

## Run it

```bash
node .claude/skills/prompt-cache-audit/cache.mjs [--days 7] [--data path]
```

Per talk it shows answer calls, cache writes vs reads, the share of prompt tokens read from cache, and the
money saved compared with no caching.

## What to look for

- **Writes on nearly every call** (cache share near 0): the cached block is changing between questions. Look
  for anything per-question that slipped into block 1 (a time, the asker's name, the question count).
- **Writes only after quiet gaps**: normal. The cache lives 5 minutes; a talk with a question every few
  minutes keeps it warm. If talks have long gaps, consider the 1-hour cache (`ttl: '1h'`, 2x write price) only
  if the audit shows many re-writes per talk.
- **Cache share high but cost still up**: check `long-prompt-guard` (prompts over 100K are billed at 5x on Haiku 5.5, cache reads included).
