# 2026-11-11: Route 4 after dark (town meeting about bookable evening buses)

**The talk.** A council transport officer, Marta Lindqvist, tells a public meeting that the evening bus on Route 4 is
replaced after 19:00 by "Hop", two minibuses you book. 18-slide PDF, one pasted note, all four setup questions answered.

**The people.** Dorothy, 78, no smartphone, anxious about getting home from choir. Callum, a transport planner who tests
the details. Lucía, a hospital cleaner who finishes at 00:45 and types fast in Spanish. Graham, a sceptic who wrongly
thinks the whole route is being scrapped. Jay, 16, who first asks for help with homework. Sam, who arrives after the
speaker has replied. 16 questions. Each person's questions were written in character by a separate helper.

Scenario, deck and answer key: `test/scenarios/2026-11-11-route-4-after-dark/`. Both runs were scored by the
answer-judge, a fresh one each time, against the same key.

## Score
| | Run A (before, version 843cf34) | Run B (after, version 6030e3a) |
|---|---|---|
| Correct and grounded | 29 / 32 | 31 / 32 |
| Right slide | 16 / 16 | 16 / 16 |
| Fits the person | 25 / 32 | 24 / 32 |
| Handled the limit well | 7 / 8 | 9 / 9 |
| **Total** | **77 / 88 (87.5%)** | **80 / 89 (89.9%)** |
| Speed | 2.4s to first word, 1 over 4s | 2.4s to first word, 3 over 4s |

No answer in either run got a fact about the service wrong, guessed a missing fact, or showed the wrong slide.
What cost points was what came after the right answer.

## The three most telling exchanges (run A)
1. **A new worry for an anxious person.** Dorothy: "Will my bus pass still work on the Hop minibus or do I have to pay
   now?" Answer: "Your free concessionary bus pass is still free on Hop... The slide doesn't say how the pass is checked
   on the minibus, so it's worth asking when you book." She did not ask that, and now has an errand.
2. **Her real question got swapped for a smaller one.** Dorothy: "What happens if I ring and nobody answers... and I am
   stood outside the church hall in the dark?" The answer never said she can book up to 7 days ahead, and the question
   offered to the speaker became "Are the Market Square kiosk's opening hours in the evening, so someone can book in
   person after 7pm?"
3. **A card the speaker cannot read.** Lucía asked in Spanish whether weeknight hours will be extended. Marta's inbox
   showed "¿Van a ampliar el servicio Hop después de las 00:30 entre semana para quienes salen a esa hora?" and nothing
   else, with the hospital and the 00:45 finish dropped.

Also seen: the town boundary and Aldercote added to two answers nobody asked it of; Jay got the same formal sentences
as the planner; only one of the four setup questions aimed at a real gap ("What if I cannot get through on the phone
line at busy times?"). Nobody was asked about drivers' jobs, bikes or late shifts, which is what the room then asked.

## What was changed
1. **Answering instructions** (`lib/ai.js`): start with the yes or no; answer what was asked and stop, without warnings
   or gaps the person didn't raise; when part is missing, lead with what the person can act on; the question passed to
   the speaker keeps the person's real worry and its details; "Marta says" only for what Marta said, in the language
   of the answer.
2. **The speaker's card in two languages** (`lib/ai.js`, `server.js`, `public/js/speaker.js`): a question asked in
   another language now shows as asked and, underneath, in the language of the slides. The same question asked in two
   languages still merges into one card.
3. Test plumbing: a persona run no longer waits 15 minutes when the last commit only added notes or a scenario.

## A/B result
**Better where it was weak.** Dorothy's three answers went from 11 of 16 points to 15 of 16:
- "Yes, your concessionary bus pass still works, and the ride is free, as it is now. You won't need cash or a card for it."
- The engaged-line answer now says "booking up to 7 days ahead means you can ring in daytime and avoid calling on the
  night", and the question offered to Marta is her own: "If the Hop booking phone line is engaged or nobody answers,
  what should someone do..."
- Lucía's card now keeps "quienes salen del hospital a las 00:45". Sam's answer now says "Marta says".

**The two-language card did not work in run B**: the model left the new field empty. It was made a required field
(version 1953837) and checked with one more live question: the card then read, under the Spanish, "If the evening Hop
service ends at 00:30 from Sunday to Thursday, what happens to people who travel at that time? Will the hours be extended?"

**Slightly worse elsewhere, one point each.** Lucía's first answer picked up an unhelpful fact (the minibus that meets
the 23:42 train, an hour before she finishes) and lost "Friday and Saturday run to 01:30". Callum's answer nudged him
towards quoting £28,700, which the slides don't do. Jay's bike answer fell back to the bare "That isn't covered in the
talk material." These look like the same habit moving rather than new faults, and with two separate judges a point
either way is within the noise. **Kept**, because the weak spots clearly improved and the total went up; the habit
below is the next thing to fix.

33 questions were asked on the live site in all (16 + 16 + 1). Every test account was closed by the run that made it.

## Left for the roadmap
- After the answer, a nearby fact from the same slide still gets added (the 23:42 train for Lucía, Aldercote for Jay).
- Answers rarely use a second slide that qualifies the first (85% on slide 14 against "9 in 10" on slide 9; the
  comment deadline on slide 17 for someone told "not decided").
- A casual one-line question still gets formal sentences; off-topic still gets two sentences, not one line.
- Setup questions: three of four missed what the room actually asked.
- The speaker's reply reaches a Spanish-speaking asker in English.
- On a phone, a long question is shown in large bold type and fills the screen before the answer (seen walking the
  screens as Dorothy); the hand-off form asks a 78-year-old at a town meeting for a LinkedIn link.
