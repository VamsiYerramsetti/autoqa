# 2026-11-10: Quiet Hours (hospital briefing on night-time falls)

Recorded on 2026-11-11 from the "Persona run" workflow log (run 3, live site on version 85c509b). Not judged by the
answer-judge; this is a reading of the transcript.

18-slide PowerPoint, one speaker note, 6 audience members, 16 questions: 11 answered directly, 5 offered to the
speaker (2 sent). 2.4s average to first word, none slower than 4s. Speaker replies were reused correctly afterwards.

## What went wrong
1. **Answers cut off mid-sentence** (3 of 16): "For the 03:00 round, the ward now uses "offer, don't wake"", the NEWS2
   explanation in Portuguese, and "Não consigo dizer se a sua mãe deve". No hand-off was offered on any of them.
2. **Wrong "The talk doesn't cover that."** for "39% on slide 8 or 36% on slide 10?" although slide 10 answers it,
   with no slide and no hand-off: a dead end.
3. **"Dr. says" / "According to Dr."** The speaker signed up as "Dr. Ines Carvalho" and the answers took "Dr." as her first name.
4. A slide label in the middle of an answer ("... For the next stage, [Slide 17] proposes ...").

## Cause and fix (2026-11-11)
Causes 1 and 2: the answering model (claude-haiku-5-5) thinks before it writes by default, and that thinking counts
against the answer allowance, which was 600 tokens. Hard questions used it all up: the text stopped mid-sentence,
or nothing was written and the app filled in "The talk doesn't cover that." Allowance raised to 4000. If it ever
runs out again, only whole sentences are shown and the speaker hand-off is offered. Cause 3: speakers with a title
are now called "Dr. Carvalho". Item 4 is on the roadmap.

## Re-run after the fix (2026-11-11, version 843cf34)
Same scenario, 16 questions: 10 answered directly, 6 offered to the speaker (3 sent). 2.1s average to first word.
- No answer cut off; the Portuguese NEWS2 and zolpidem answers are complete (the zolpidem one says to ask her mother's
  doctor or pharmacist, which is right).
- "39% or 36%?" is now answered from Slide 10 (raw count vs. per 1,000 occupied bed-nights) instead of "not covered".
- The speaker is "Dr. Carvalho" throughout.
- New, small: one Portuguese answer starts "Dr. Carvalho says que sim" (English phrase in a Portuguese answer); the
  cost answer adds two figures into "roughly €32,900 in the first year" (arithmetic, not a guess, but the talk gives
  no total); the 39/36 answer took 4.7s to start.
