# Testing

## First, always
`npm test` walks the whole product in practice mode (no key needed): sign up, set up a talk, ask, hand off, reply, close the account. It must pass before every push. `SITE=https://the-live-address npm test` runs the same checks against the live site (it creates and then closes one test account).

## Every change
1. Copy the project somewhere temporary, `npm install`, start it on a spare port with `AUTOQA_DATA` pointing at a throwaway file.
2. Walk through both journeys in a real browser (Playwright): set up a talk with `samples/rooftop-rain.pdf` and again with the `.pptx`, join as the audience at phone size, ask, hand off, reply as the speaker, check the reply arrives.
3. Take screenshots at 1280x860 and iPhone size and look at them. Check `/admin`, `/privacy` and a made-up address (not-found page).

## Real answers
- The API key is set on the hosting service, never in the repository. Do not ask for it, print it or commit it.
- To judge real answers, use the live site: sign up a test account there (address ending in `@autoqa.example`), set up a talk with a test deck, ask the question set below through the audience page or `/api/chat`, then close the test account. Keep a run to about 20 questions.
- If the live site address is not yet in `docs/LOG.md` or the README, real-answer testing is not possible; say so in the log.

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
- Audience answers: `claude-haiku-5-5`. Reading the deck and writing the interview: `claude-sonnet-5-5`. Both can be changed in `.env`.
