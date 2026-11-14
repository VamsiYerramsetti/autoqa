---
name: long-prompt-guard
description: Find talks whose prompt is near or over 100K tokens, where Claude Haiku 5.5 bills the whole request at 5x. Use before a big talk, when a speaker uploads a long deck, or when model-spend reports calls over 100K.
---

# Long prompt guard

Claude Haiku 5.5 prices a request by its prompt length: over 100,000 tokens (input + cache reads + cache writes)
the **whole request** costs 5x, cache hits included. Auto Q&A puts the entire deck into every answer, so a long
deck can cross the line.

The app caps material at 300,000 characters (`MAX_MATERIAL` in `lib/ai.js`), which is normally about 75-90K
tokens. Dense text (tables, code, non-English text) can use more tokens per character.

## Run it

```bash
node .claude/skills/long-prompt-guard/size.mjs [--data path]
```

For every talk it estimates the prompt size from the material, and where real calls exist it shows the actual
largest prompt seen. Anything over 85K is flagged.

## If a talk is too big

In order of preference:
1. Ask the speaker to remove appendix or backup files they don't need answered.
2. Lower `MAX_MATERIAL` for everyone (answers lose the cut-off part of very long decks).
3. Longer term: retrieve only the relevant slides per question instead of the whole deck (bigger change; note it in docs/ROADMAP.md).
