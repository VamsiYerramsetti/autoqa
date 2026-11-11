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
