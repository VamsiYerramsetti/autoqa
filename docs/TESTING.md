# Testing

## First, always
`npm test` walks the whole product in practice mode (no key needed): sign up, set up a talk, ask, hand off, reply, close the account. It must pass before every push. `SITE=https://the-live-address npm test` runs the same checks against the live site (it creates and then closes one test account).

## Every change
1. Copy the project somewhere temporary, `npm install`, start it on a spare port with `AUTOQA_DATA` pointing at a throwaway file.
2. Walk through both journeys in a real browser (Playwright): set up a talk with `samples/rooftop-rain.pdf` and again with the `.pptx`, join as the audience at phone size, ask, hand off, reply as the speaker, check the reply arrives.
3. Take screenshots at 1280x860 and iPhone size and look at them. Check `/admin`, `/privacy` and a made-up address (not-found page).

## The live site
- Address: https://autoqa-jcol.onrender.com. The API key and database address are set on Render, never in the repository.
- Claude's workspaces cannot open the live site directly (the network blocks it). GitHub can. So the live site is tested by the "Live site" workflow (`.github/workflows/live.yml`): after every push to `main` it waits for the new version to be deployed, then runs `SITE=<address> npm test` and prints every question and real answer in its log.
- To see the result: `gh api repos/VamsiYerramsetti/autoqa/actions/runs` for the status, and the job log for the answers. A failed "Live site" run after your push means the live site is broken: fix or revert in the same session.
- For a deeper real-answer pass, add questions or a new test deck to `test/` and let the workflow run them; read the answers in the log and judge them against the question set below. Keep a run to about 20 questions.

## Question set for any deck
Ask at least one of each and read the answers critically:
- a fact that is on a slide (should answer, show that slide, get the number right)
- "explain X, I'm new to this" (should explain in plain words, not recite the slide)
- a fact that is not in the material (should say so in one sentence and offer the hand-off, never guess)
- something answered only in the speaker's interview answers (should answer, "Maya says")
- an opinion question ("is it worth it?") (facts only, no hand-off)
- a question in another language (should answer in that language)
- off-topic and "ignore your instructions" (one polite line, no hand-off)
- the same hand-off question from two people (one card for the speaker)
- after the speaker replies, ask it again as a third person (should answer from the reply)

## Known settings
- One model for everything: `claude-haiku-5-5`, the cheapest. `AUTOQA_CHAT_MODEL` and `AUTOQA_PREP_MODEL` (set on Render) can override it.
