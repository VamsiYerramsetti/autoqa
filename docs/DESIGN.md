# Design

How Auto Q&A looks and feels, and why. The design session updates this file every time it changes something.

## Principles
1. **The audience is in a dark room, half-listening, on a phone.** Everything they need is reachable by one thumb,
   readable at a glance, and never louder than the talk.
2. **Show, don't tell.** The slide itself is the explanation. The "room of dots" (one dot per person) shows what's
   happening better than numbers.
3. **Few words, plain words.** If a label needs explaining, change the label.
4. **Calm motion that answers an action.** Things move because someone did something. No idle animation, nothing
   that pulses for attention. Respect "reduce motion".
5. **Not another AI product.** No sparkles, glowing orbs, purple gradients, chat bubbles with robot avatars or
   "AI-powered" badges. It should feel like a well-made tool for talks.

## Current system
- **Colour:** ink `#1d1b2e` (text), paper `#fbfbf8` (background), cobalt `#2f3ced` (answered, primary actions),
  signal yellow `#ffc83d` (a question waiting for the speaker), tint `#e7e9ff`, muted `#6b6a7b`, line `#e2e1ea`.
  Defined once in `public/css/app.css` under `:root`.
- **Type:** Bricolage Grotesque for headlines (bundled), Instrument Sans for text (bundled). No other fonts.
- **Logo:** two overlapping dots, yellow and cobalt: a question waiting, and a question answered.
- **Signature:** the room of dots: curved rows facing a stage, filling as people join; cobalt when answered, yellow when
  waiting.
- **Chat:** reads like a transcript (bold question, plain answer), not speech bubbles. The slide sits above the answer.

## How the look may change
The design session may evolve colour, type, logo and motion, but:
- One coherent change at a time, applied to every screen in the same commit.
- Before/after screenshots at 1280x860 and 390 wide, compared side by side, and kept only if clearly better.
- Contrast at least 4.5:1 for text, 3:1 for large text and controls.
- Recorded in the log below with the reason and sources.
- A big change of direction (new palette, new logo) is proposed to Vamsi first under "For Vamsi" in `docs/LOG.md`,
  with a mock-up, unless he has asked for it.

## Design log (newest first)
- 2026-11-10: system as above (first version).
