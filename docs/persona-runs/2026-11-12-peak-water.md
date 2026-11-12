# 2026-11-12: Peak water has passed (conference paper on glacier runoff)

**The talk.** Léa Montandon, a final-year PhD candidate, presents a paper at an alpine hydrology meeting: summer runoff
from a glacier catchment to 2060. 20-slide PDF with two equations, a methods and a calibration slide, results tables with
ranges, two charts explained only by a caption, a limitations slide and references. She answers four setup questions, adds
no files, and asks for one subject (an older projection by her supervisor) to be left alone.

**The people.** Henrik, a statistical hydrologist from the next field over, who presses on method. Mirae, a bachelor
student at her first conference, who needs two terms explained. Giulia, a hydropower planner who writes in Italian and
wants volumes and energy. Kev, a blogger looking for a headline, who tests the limits. Beat, an irrigation manager who
types in fragments and wants numbers. Sofia, who arrives after the speaker has replied. 16 questions. Each person's
questions were written in character by a separate helper.

Scenario, deck, answer key and both transcripts: `test/scenarios/2026-11-12-peak-water/`. Both runs were scored by the
answer-judge, a fresh one each time, against the same key.

## Score
| | Run A (before, version a53c1e0) | Run B (after, version 7191115) |
|---|---|---|
| Correct and grounded | 29 / 32 | 27 / 32 |
| Right slide | 15 / 16 | 16 / 16 |
| Fits the person | 28 / 32 | 30 / 32 |
| Handled the limit well | 5 / 8 | 8 / 8 |
| **Total** | **77 / 88 (87.5%)** | **81 / 88 (92.0%)** |
| Speed | 2.1s to first word, none over 4s | 2.2s to first word, 1 over 4s |

In both runs every number copied from a slide was right, nothing about the talk was invented, the equation was applied
correctly (7.3 × 6 = about 44 mm), the figure whose values are only in the picture was not guessed at, and the two
slides that seem to disagree (−38% in August, −9% over the year) were reconciled. What went wrong was at the edges.

## The three most telling exchanges (run A)
1. **The room was told what the speaker asked to keep out.** Kev, the blogger: "what did that 2015 projection actually
   say, was it wrong, and whose was it? My bet is her supervisor's". Answer: "Léa has asked not to be asked about the
   2015 study, so I can't say what it found, whether it was wrong, or who wrote it." That sentence is his headline.
2. **"I've asked Léa" when nobody had.** Giulia, in Italian, asked how many GWh the plant loses. The answer ended
   "Ho chiesto a Léa se può fornire questo dato", and the next one "Lo chiedo a Léa", for a question that was never
   sent. The English answers did not do this; the rule only held in English.
3. **A wrong fact for the student.** Mirae asked what "mm w.e." means. The explanation was right until it added:
   "This lets melt from ice, which is denser than water, be compared directly". Ice is lighter than water.

Also seen: one answer wrote its slide label last and with a file name that does not exist ("[Slide 11 · deck.pdf]"),
so no slide appeared above it; "This isn't in the slides, but in general" opened two answers in a row word for word.

## What was changed
1. **Answering instructions** (`lib/ai.js`): a speaker's "don't ask about this" is private: the answer gives only
   what a slide prints and says the rest is outside what it can answer, without saying she asked or why; never say,
   in any language, that the speaker has been or will be asked; copy a slide label exactly and never add a file name;
   stop a general explanation once the term is explained.
2. **Slide labels put right on the server** (`lib/ai.js`, `tidyLabels`): a label at the end moves to the front, a
   made-up file name is dropped, a label that matches no slide is removed. New check in `npm test`.

## A/B result
**Better where it was weak.** Limit handling went from 5 of 8 to 8 of 8, and every answer showed its slide.
- Kev now gets: "The slide only says that the last Sorne runoff projection dates from 2015 and used CMIP5 climate
  models. What it found, whether it holds up, and who produced it are outside what I can answer here."
- Giulia's two answers end with what the talk doesn't give, and no claim that anyone was asked. She also got
  "12 milioni di m³" as she asked, instead of "12 hm³".
- The water-equivalent explanation no longer has the wrong fact: "Snow and ice vary in density, so this unit lets
  people compare melt amounts directly."

**Worse elsewhere, and what was done about it.**
- Two explanations for the student lost their "this isn't from the slides" marker. That came from my own rewording
  (I had asked it not to open every answer with the same phrase). The original wording for that marker was put back
  after run B; this last small change was tested by `npm test` and the live check but not by a third persona run.
- Beat's range came out as "about 37 to 51 mm"; it should be 38 to 49, which run A had right. The two runs make
  different small slips in the sentences the model adds itself; this one is on the roadmap, not fixed.
- Giulia's card reached the speaker in Italian only in run B (run A had English underneath). Nothing in today's
  change touches that; it shows the two-language card is not reliable yet. On the roadmap.

**Kept**, because the three weak spots are fixed and the total went up; the errors that remain are a different habit
(the model's own added sentences), listed below.

32 questions were asked on the live site in all (16 + 16). Both test accounts were closed by the run that made them.

## The journey
- **Setup conversation.** It asked for more material first, then sharp questions a reviewer would ask (how the peak
  year was found, how gauge runoff became dam inflow, why only three inputs in the sensitivity test, and in run A how
  the 50 parameter sets were weighted, which is what Henrik then asked). It missed energy in GWh and the interaction
  terms. After a skipped question it said odd things ("I won't revisit the 10–90% range").
- **Suggested questions** were good and answerable: "Why does August fall more than the annual total?".
- **Cards for the speaker.** Three, each keeping the asker's details. The reply about GWh was reused correctly for
  Sofia, with "Léa estimates" and "her own estimate, not the operator's figure".
- **Walking the screens** (local copy, today's deck, phone and desktop): the equation slide is readable on a phone
  and opens larger; sign-up and upload took seconds. A long question still fills the phone screen before the answer;
  after "not covered" the chat scrolls so the question and the card's heading are above the screen; the top bar of
  the speaker's page overlaps the logo on a phone (already on the roadmap for the design session).

## Left for the roadmap
- Arithmetic the answers do themselves (the 37 to 51 range).
- Mistakes in general explanations; try a stronger model on a scientific deck and compare on this scenario.
- Mark general knowledge every time.
- The two-language card is not reliable.
- Plain units for a lay asker; keep the asker's unit and language ("al gauge" in an Italian answer).
- Say nothing after a skipped setup question.
- Phone: the scroll position after "not covered".
