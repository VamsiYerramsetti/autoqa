---
name: model-choice
description: Compare models for audience answers on quality and cost before switching AUTOQA_CHAT_MODEL. Use when asked whether a cheaper or better model would do, or when Anthropic releases a new model.
---

# Model choice

Audience answers use `AUTOQA_CHAT_MODEL` (default `claude-haiku-5-5`); reading a deck uses `AUTOQA_PREP_MODEL`
(default `claude-sonnet-5-5`). Both can be changed in `.env` without code changes. Add any new model's prices
to `lib/prices.js` first so the portal can count it.

## Procedure

1. Pick a ready talk from the data file (ideally a real, long deck).
2. Run the comparison. It costs money, so it refuses to run without `--run` and stops after 12 questions per model:
   ```bash
   node .claude/skills/model-choice/compare.mjs --talk <talkId> --models claude-haiku-5-5,claude-sonnet-5-5 --run
   ```
   It asks the standard question set from docs/TESTING.md (a fact on a slide, an explanation, a missing fact,
   an opinion, another language, off-topic) and prints every answer with its time and cost.
   The API key is read from `.env` by the app's own code; never print or copy it.
3. Read the answers side by side against the rules in `lib/ai.js`: right slide and quote, right numbers,
   hand-off only for missing facts, plain words, 2-4 sentences.
4. Recommend the cheapest model that gets every answer right. Record the result in docs/LOG.md.
