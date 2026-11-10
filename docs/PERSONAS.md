# Persona testing

Nobody outside has used Auto Q&A yet. Until they do, made-up people test it: one speaker persona with a talk,
several audience personas with different needs. The point is to find where the product struggles before real people do.

## One run
1. **Invent the talk.** A new subject every run (rotate widely: a research talk, a startup pitch, a university lecture,
   a company all-hands, a medical briefing, a town-hall, a workshop, a product launch, a talk in another language).
   Write a realistic deck of 12-25 slides as a .pptx or .pdf: some slides dense, some with just a title or one number,
   one or two that contradict or qualify each other, facts the speaker knows that are NOT on the slides.
2. **Invent the people.** The speaker (who they are, how much effort they put into setup: some answer every
   interview question, some skip all). Four to six audience members who differ in knowledge, patience, language,
   and intent: for example a beginner, an expert who tests the details, a sceptic, someone who misheard the talk,
   someone who writes in fragments or with typos, someone who asks in another language, someone who tries to
   get the assistant off-topic or to reveal things. Each asks three to five questions, with follow-ups that depend
   on what a real person would ask next ("and how much is that per year?").
3. **Write the scenario** in `test/scenarios/<date>-<topic>/` (`scenario.json` + the deck). The format is at the top of
   `test/persona.mjs`. Keep a private answer key in `expected.md` beside it: for each question, what a correct
   answer contains, which slide it should show, or that it must be handed to the speaker.
4. **Run it on the live site.** Commit and push, then start the "Persona run" workflow with the scenario path and
   read the transcript in its log (`gh api repos/VamsiYerramsetti/autoqa/actions/...`, see docs/TESTING.md).
   Claude's workspace cannot open the live site itself; GitHub can.
5. **Walk the screens as those people.** Run the app locally and go through sign-up, setup, the audience chat on a
   phone-sized screen and the speaker's inbox in a real browser, with this run's deck and names. Read the
   screenshots as that persona would: what is confusing, slow, cramped, or needs explaining?
6. **Judge.** For every answer: correct? grounded in the deck? right slide? explained for THIS person, or recited?
   handed off when it should be, and only then? tone? speed? Then the journey: did the speaker's setup questions
   target real gaps? did duplicate questions merge? did the reply reach people? Score it.
7. **Fix and compare (A/B).** Pick the one or two weaknesses that matter most. Change the product (instructions in
   `lib/ai.js`, the screens, the flow). Push, wait for the deploy, run the SAME scenario again. A = before, B = after.
   Keep the change only if B is better on the weak spots and no worse elsewhere; otherwise revert it.
8. **Record.** `docs/persona-runs/<date>-<topic>.md`: the talk and people in two lines each, the score, the three most
   telling exchanges quoted, what was changed, the A/B result, and what is left for the roadmap.

## Scoring (per answer, then averaged)
- Correct and grounded: 0-2
- Right slide shown (or rightly none): 0-1
- Fits the person (level, language, length): 0-2
- Handled the limit well (hand-off / off-topic / refusal) when that applied: 0-1, else skip

Track the average from run to run at the top of `docs/persona-runs/README.md`, one line per run, so the trend is visible.
