# 2026-11-13: Knowing the unknown animal (workshop paper, machine learning for camera traps)

**The talk.** Amara Okafor, a computer-vision postdoc, presents a workshop paper: flagging camera-trap images of species a
model was never trained on, at new sites. 20-slide PDF with two equations (energy score, loss) and the ECE formula, a
threshold slide, a results table with mean ± SD over 5 seeds, a per-site table that qualifies the headline, a reliability
diagram explained only by its caption, an ablation, a limitations slide and references. She is busy: she answers two of the
setup questions and skips the rest.

**The people.** Ingrid, a quantitative ecologist from the next field over, who presses on seeds, tuning and bias in counts.
Tariq, a first-year master's student lost on AUROC, the energy score and temperature scaling. Beatriz, who runs a
volunteer camera-trap programme in the Pantanal and writes in Portuguese. Max, who tests the limits (pretends to be the
speaker, asks for the withheld site coordinates, demands a yes/no on "AI makes ecologists obsolete"). Lin, an edge-hardware
engineer who types in fragments and wants fps and a volunteer-hours calculation. Diego, who arrives after the replies.
16 questions. Each person's questions were written in character by a separate helper.

Scenario, deck, answer key and both transcripts: `test/scenarios/2026-11-13-unknown-animal/`. Both runs were scored by the
answer-judge, a fresh one each time, against the same key.

## Score
| | Run A (before, version 6aea005) | Run B (after, version 4bbd35e) |
|---|---|---|
| Correct and grounded | 28 / 32 | 27 / 32 |
| Right slide | 15 / 16 | 16 / 16 |
| Fits the person | 30 / 32 | 30 / 32 |
| Handled the limit well | 8 / 10 | 8 / 10 |
| **Total** | **81 / 90 (90.0%)** | **81 / 90 (90.0%)** |
| Speed | 3.2s to first word, 3 over 4s | 2.9s to first word, 2 over 4s |

Both runs got the hard statistics right: the image-weighted mean of the four site AUROCs (92.4) against the headline
92.6, without inventing how 92.6 was computed; "All numbers in %" for the student; 10.2 hours saved per 10,000 photos in
Portuguese; no guess at the unlisted 38 species; the withheld coordinates refused. The second judge was stricter (it
marked down unmarked inferences and "58.5 vs 58.3 h" that the first let pass), so the equal totals hide real movement.

## The three most telling exchanges (run A)
1. **Our own server broke a correct answer.** Lin asked for the volunteer hours at 50,000 images a month, "show the math".
   The audience saw: "5 hours of review, versus 11.7 hours to check all 10,000 ... 5 × 5 = 7.5 hours", and no slide. The
   model had written 1.5 hours and 1.5 × 5. A cleanup rule meant to remove "I've flagged this for the speaker" deleted any
   sentence containing "flagged", and treated the point in "1.5" as the end of a sentence. In a talk about flagged images,
   that cut "[Slide 14] About 1,300 ... are flagged, which takes 1." out of the answer. The next answer then "corrected" it
   unprompted. Reproduced locally with the same text.
2. **"Vou encaminhar essa dúvida para a Amara."** ("I'll forward this to Amara.") The answer promised to send Beatriz's
   question; nothing had been sent. The English answer to Ingrid did the same ("so I'll pass the question on").
3. **"The talk doesn't cover this"** opened the answer to Ingrid's question on bias in occupancy estimates, although
   slide 12 says 41% of the missed unknowns are rodents or shrews and Amara had said site D's misses are night rodents.

Also seen: the withheld coordinates were offered to the speaker; the Orin Nano was named as missing but never offered;
a second label left alone on the last line; the Portuguese species card reached the speaker with no English line.

## What was changed
1. **The cleanup rule** (`lib/ai.js`, `dropPromises`): only first-person promises are removed ("I'll pass this on",
   "Vou encaminhar", "Je vais", "Ich werde" ...), and sentences are split only at a mark followed by a space, so numbers
   stay whole. A slide label left after the last sentence joins the first. New checks in `npm test`.
2. **Answering instructions** (`lib/ai.js`): before saying "not covered", give what the slides and notes offer; when the
   answer says a talk-specific fact is missing, offer it to the speaker; but don't offer what a slide says is withheld.
3. After run B, not measured by it: **the speaker's card in the talk's language** (`toTalkLanguage`, `server.js`). When the
   answer leaves that line out, one small check after sending adds it if needed. Checked by `npm test` (practice mode) and
   the live check; the next persona run with a non-English asker will show it live.

## A/B result
**Better where it was weak.**
- Lin now gets: "checking everything takes about 58.5 hours a month (50,000 × 4.2 s = 58.3 h). With the method, about 6,500
  images are flagged (1,300 per 10,000), and at 4.2 s each that's about 7.5 hours. The saving is roughly 51 hours a month",
  with slide 14 shown (0 → 1 point on correctness, slide 0 → 1).
- No answer promised to pass anything on, in any language.
- Max's coordinates: "The site locations are withheld to protect species" and no offer to the speaker.
- Ingrid's occupancy answer now leads with slide 12 (uneven errors in rodents and at night) instead of "not covered";
  her λ question reached the speaker in her own words, so Amara's reply matched it this time.
- Tariq's temperature answer now explains why fitting on validation sites keeps the test fair.

**Worse or unchanged elsewhere.**
- Max's "AI makes ecologists obsolete, yes or no" got a flat "No." (A: "The talk doesn't say ..."). The new line "don't
  open with 'The talk doesn't cover this'" may have pushed it there. On the roadmap.
- The Orin Nano was again named as missing without an offer to the speaker, despite the new instruction.
- I3 said "mostly rodents" for the slide's 41%; D1 stated Amara's expectation as fact.

**Kept.** The server fix removes a fault that changed numbers in front of the audience, which no instruction can
undo; the weak spots improved and the total held, with a stricter judge. Two new habits (a verdict on a sweeping
claim, loose quoting of figures) go to the roadmap.

32 questions were asked on the live site in all (16 + 16). Both test accounts were closed by the run that made them.

## The journey
- **Setup conversation.** Sharp, reviewer-style questions (is the 210 ms end-to-end; how the 4.2 s was measured; whether
  training sites include night IR). It checked the slide 14 arithmetic twice out loud, which a busy speaker doesn't need.
  The skipped questions were not repeated.
- **Suggested questions** were specific and answerable ("Why does night infrared imagery perform so much worse?"), but
  the list of 12 ends with five "Explain 'Method (1): the energy score'" items made from slide titles.
- **Cards for the speaker.** Five, each with the asker; the Portuguese Pantanal card had English underneath in both runs,
  the species card in neither (fixed after run B).
- **Walking the screens** (local copy, today's deck, phone and desktop): sign-up and upload took seconds and the deck read
  as 20 slides "with pictures". On a phone, after "not covered" only the card's fields and Send are on screen: the
  question and the answer are scrolled away. The LinkedIn placeholder is cut off at 390 wide. The speaker's page on a
  phone: the top bar still overlaps the logo. All on the roadmap for the design session.

## Left for the roadmap
- No yes/no verdict on sweeping claims; facts only.
- Always offer a named missing fact to the speaker.
- Quote slide figures exactly.
- Each slide once when an answer has two paragraphs.
- Phone: scroll position after "not covered"; LinkedIn placeholder cut off.
