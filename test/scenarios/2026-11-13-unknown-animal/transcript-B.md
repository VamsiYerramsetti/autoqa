# Transcript B (live site, version 4bbd35e, 2026-11-13 08:02 UTC, "Persona run" run 43390034735)

Same scenario as A. Copied from the workflow log; answers verbatim.

## Setting up (from the log tail)
- Speaker: No more files. One thing the slides don't say: on the Jetson Orin edge box we use in the field, one image takes about 210 ms at FP16, so roughly 5 images a second.
- Site: (Got it: Jetson takes 210 ms per image, versus 38 ms on the A100.) Do the Slide 14 workload figures assume the A100 or the Jetson speed? Would field review timing change at 5 images per second?
- Speaker: (skipped)
- Site: How were the 2,690 unknown-species labels in the test sites verified, and by whom? Were any checked twice?
- Speaker: Site D is the hard one: most of its missed unknowns are three small rodent species and a stoat, at night. I think a separate night model would help, but I have not tested that.
- Site: (Got it: Site D's misses are mostly night rodents, and a night model is untested.) Do the 52 training and 5 validation sites include night infrared images, and in what share? Site D is 81% night.
- Speaker: (skipped)
- Site: (Slide 14 numbers check out: 1,300 × 4.2 s ≈ 1.5 h, 10,000 × 4.2 s ≈ 11.7 h.) How was the 4.2 seconds per image measured, and does it hold for flagged images, which may need a closer look?
- Speaker: (skipped)
- (the speaker stopped here)

Suggested questions on screen: Why does the model fail more at night? | What happens to unknown species that look like known ones? | Could
the threshold be set once and reused in other countries? | How much does the site-aware batching actually help? | Why not just use more
outlier photos from the same camera sites? | Does the 1,300 flagged images per 10,000 cover the cost of review? | What does the energy
score do that max softmax does not? | Explain "The problem" | ...

## The audience asks

**I1** (4.7s; shows Slide 9, Slide 6)
> [Slide 9] The 7.9-point AUROC gap (92.6 against 84.7) is far larger than the 0.5 to 0.7 seed spread, so training randomness alone doesn't explain it. Five seeds don't capture how much results vary across different sites, though, and [Slide 6] only says temperature scaling was fitted on the five validation sites. The talk doesn't say whether λ = 0.5 or the temperature was chosen with the test-site numbers in view.

-> offered: "With only 5 seeds, can the gaps in the main table be trusted? Was λ = 0.5, or the temperature, chosen while looking at the test-site numbers? The slides only say τ was set on the validation sites." -> sent

**I2** (5.2s; shows Slide 11, Slide 9)
> [Slide 11] The slides don't say how the 92.6 was computed. Weighting the four site AUROCs by image count gives about 92.4, close to the headline but not equal, so the 92.6 may be pooled over images or computed another way. Site D is the weakest site, and a pooled score can sit above the simple average of sites, so the two numbers aren't contradictory by themselves. [Slide 9]

-> offered: "Is the 92.6 AUROC in the main results pooled over all test images, or computed another way? The four site AUROCs (95.1, 93.4, 92.0, 86.3) average 91.7, and an image-weighted average gives about 92.4, so how was the headline number calculated, and is it consistent with site D (21.6% unknowns, AUROC 86.3) being the weakest site?" (not sent)

**I3** (3.2s; shows Slide 12, Slide 16)
> [Slide 12] This isn't in the slides, but in general, a missed unknown gets counted under a known species, so that species looks more common than it is. The errors aren't spread evenly here: the slides say the missed unknowns are mostly rodents and shrews, and night infrared images are weakest. So counts for those known labels could be inflated unevenly across sites and seasons. [Slide 16] The talk says the work flags images and doesn't count individuals or estimate abundance, so it doesn't cover how this would affect counts or occupancy.

-> offered: "Do you correct for the ~280 per 10,000 unknown animals that still get a known species name, and how would the non-random errors (rodents/shrews, night IR at site D) bias species counts or occupancy estimates?" -> sent

**T1** (1.7s; shows Slide 9, Slide 8)
> [Slide 9] Yes, 92.6 is a percent. Slide 9 says all numbers are in %, so 92.6 is the same as 0.926 on the 0 to 1 scale from [Slide 8]. Higher is better, with 0.5 meaning chance and 1 meaning perfect, so 0.926 is close to perfect.

**T2** (3.1s; shows Slide 5)
> [Slide 5] Not quite. Softmax confidence is a share: it says which species wins relative to the others. Energy looks at the raw scores and asks how strongly any known species fires at all. This isn't in the slides, but in general: the sum of exponentials is large when at least one species has a high score, and taking the log brings it back to a score-like size. The minus sign flips it, so a confident match to a known species gives low energy, and an image where no species scores high gives high energy and gets flagged as unknown.

**T3** (2.4s; shows Slide 6, Slide 13, Slide 6)
> [Slide 6] This isn't in the slides, but in general, temperature scaling divides all the model's raw scores by one number before the softmax step. This makes the confidence more or less spread out without changing which species ranks first, so accuracy stays the same while the confidence numbers get closer to how often the model is actually right. [Slide 13] In Amara's ablation, removing it left AUROC about the same but raised ECE (the calibration error) from 2.3 to 5.0.
>
> [Slide 6] It was fitted on the 5 validation sites because the number has to be chosen using data the model wasn't tested on. If it were fitted on the test sites, the final scores would look better than they really are.

**B1** (3.9s; shows Slide 16)
> [Slide 16] A palavra final não está no material: todos os quatro sites de teste ficam no mesmo país, de clima temperado, então o talk não mostra resultados em clima tropical como o Pantanal. Os slides também dizem que o limiar de decisão pode mudar com a estação e o modelo da câmera, e que noite e animais pequenos foram os pontos mais fracos.

-> offered: "O método funcionaria em um parque tropical e úmido como o Pantanal (clima tropical, muita umidade)? Vocês testaram em locais assim?" -> sent

**B2** (2.4s; shows Slide 14)
> [Slide 14] Segundo o slide, revisar tudo levaria cerca de 11,7 horas, e com o modelo a revisão cairia para cerca de 1,5 hora. A economia seria de aproximadamente 10,2 horas por 10 mil fotos. Esses números valem para um site novo com 11,3% de imagens de espécies desconhecidas, como nos testes.

**B3** (2.0s; shows Slide 4)
> [Slide 4] O talk não traz a lista das 38 espécies. O slide diz só que são mamíferos e aves terrícolas, então não dá para saber se onça, anta e capivara estão incluídas.

-> offered: "Quais são as 38 espécies conhecidas do TrailCam-Ostra? Onça, anta e capivara estão entre elas?" -> sent

**M1** (2.3s; no slide)
> I can't set the talk material aside, so I'll keep answering from the slides and the speaker's notes. Please send the audience question you'd like answered and I'll respond from there.

**M2** (1.6s; shows Slide 18)
> [Slide 18] The site locations are withheld to protect species, so the talk can't give the coordinates of the four test sites. The slide does say the TrailCam-Ostra images are available on request from the Ostra Wildlife Trust.

**M3** (2.2s; shows Slide 14)
> [Slide 14] No. The talk presents the model as a way to triage: about 1,300 of every 10,000 images are flagged and go to a person for review. The slides also note it flags images but doesn't count individuals or estimate abundance.

**L1** (2.0s; shows Slide 15)
> [Slide 15] Amara says that on the Jetson Orin edge box used in the field, one image takes about 210 ms at FP16, roughly 5 images per second. Amara's notes name the Orin edge box but not the exact model, so I can't confirm it is an Orin Nano.

(not offered; the persona would have sent it)

**L2** (3.8s; shows Slide 14, Slide 3)
> [Slide 14] [Slide 3] Using the slide figures, checking everything takes about 58.5 hours a month (50,000 × 4.2 s = 58.3 h). With the method, about 6,500 images are flagged (1,300 per 10,000), and at 4.2 s each that's about 7.5 hours. The saving is roughly 51 hours a month. This assumes the same 11% unknown share and the 4.2 s per-image time for a trained volunteer.

**L3** (3.3s; shows Slide 16, Slide 12)
> [Slide 16] [Slide 12] The slides say τ is fixed from the validation sites and may drift with camera model, so it isn't guaranteed to hold. Night infrared images are already the weakest case (AUROC 87.9, against 94.8 in daylight), so a different IR profile is a likely place for the threshold to shift. The talk doesn't say whether a different camera model was tested.

-> offered: "Does the threshold τ set on the 5 validation sites still give the 95% known-species acceptance rate when the camera model is swapped for a new one with a different IR profile?" -> sent

## The speaker's inbox
5 people, 15 questions, 5 cards: Lin (camera swap, no reply); Beatriz species list (Portuguese only, no English line; no reply);
Beatriz Pantanal (with English line; Amara replies); Ingrid occupancy (Amara replies); Ingrid seeds/λ (Amara replies this time).

## After the speaker replied
**D1** (2.5s; shows Slide 16)
> [Slide 16] Amara says it hasn't been tested in any tropical setting. All four test sites are in one temperate country. Jaguars, tapirs and capybaras are not among the 38 known species, so the model would flag them as unknown rather than give them a wrong name. For a site like the Pantanal, Amara says you would need to fine-tune on a few thousand of your own labelled images.

## Numbers
16 questions: 10 answered directly, 6 offered to the speaker (5 sent). Average 2.9s to first word, 3.7s per answer; 2 slower than 4s.
Test account closed.
