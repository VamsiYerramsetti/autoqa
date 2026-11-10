---
name: persona-test
description: Test Auto Q&A with a made-up speaker, talk and audience on the live site, score the answers, fix the weakest spot and prove the fix with a re-run. Use for persona testing or "test it like a real audience".
---

Follow `docs/PERSONAS.md` exactly. In short:

1. Read `docs/persona-runs/README.md` and the last two reports so today's subject and people differ.
2. Invent the talk (new subject, 12-25 slides as .pptx or .pdf, some dense, some sparse, facts the speaker knows that
   are not on the slides) and four to six audience members who differ in knowledge, patience, language and intent.
3. Write `test/scenarios/<date>-<topic>/scenario.json` (format at the top of `test/persona.mjs`), the deck, and a private
   `expected.md` answer key.
4. Push, then start the "Persona run" workflow:
   `gh api -X POST repos/VamsiYerramsetti/autoqa/actions/workflows/persona.yml/dispatches -f ref=main -f 'inputs[scenario]=<path>'`
   Wait for it and read the transcript from the job log. (Agent workspaces cannot open the live site; GitHub can.)
5. Judge every answer against the key with the scoring in `docs/PERSONAS.md`. Use the `answer-judge` agent if you can
   spawn sub-agents, so the judge hasn't seen your reasoning.
6. Fix the one or two weaknesses that matter most, push, wait for "Live site" to pass, re-run the SAME scenario.
   Keep the fix only if the re-run is better where it was weak and no worse elsewhere.
7. Write `docs/persona-runs/<date>-<topic>.md`, add a line to `docs/persona-runs/README.md`, add a "Persona test" entry
   to `docs/LOG.md`.
