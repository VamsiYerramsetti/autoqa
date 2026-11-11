# Design

How Auto Q&A looks and feels, and why. The design session updates this file every time it changes something.

## Principles
1. **The audience is in a dark room, half-listening, on a phone.** Everything they need is reachable by one thumb,
   readable at a glance, and never louder than the talk.
2. **Show, don't tell.** The slide itself is the explanation. The "room of dots" (one dot per person) shows what's
   happening better than numbers.
3. **Few words, plain words.** If a label needs explaining, change the label.
4. **Calm motion that answers an action.** Things move because someone did something. No idle animation, nothing
   that pulses for attention. Respect "reduce motion".
5. **Not another AI product.** No sparkles, glowing orbs, purple gradients, chat bubbles with robot avatars or
   "AI-powered" badges. It should feel like a well-made tool for talks.

## Current system
- **Colour:** ink `#1d1b2e` (text), paper `#fbfbf8` (background), cobalt `#2f3ced` (answered, primary actions),
  signal yellow `#ffc83d` (a question waiting for the speaker), tint `#e7e9ff`, muted `#6b6a7b`, line `#e2e1ea`.
  Defined once in `public/css/app.css` under `:root`.
- **Type:** Bricolage Grotesque for headlines (bundled), Instrument Sans for text (bundled). No other fonts.
- **Logo:** two overlapping dots, yellow and cobalt: a question waiting, and a question answered.
- **Signature:** the room of dots: curved rows facing a stage, filling as people join; cobalt when answered, yellow when
  waiting.
- **Chat:** reads like a transcript (bold question, plain answer), not speech bubbles. The slide sits above the answer.
- **Motion:** a thing that moves across the screen (the slide opening) travels on `cubic-bezier(.2, 0, 0, 1)`;
  a thing that arrives or answers a press uses `--ease-out: cubic-bezier(.23, 1, .32, 1)`. Press 140ms, arriving
  300ms, leaving 250ms. Everything pressable gives a little under the finger (`scale(.97)`). Hover looks are for a
  mouse only. With "reduce motion" on, a 120ms fade replaces travel, growth and loops.
- **Outside skills:** every design session works from `docs/DESIGN-SKILLS.md` (Emil Kowalski's design engineering,
  and the Taste skill).

## How the look may change
The design session may evolve colour, type, logo and motion, but:
- One coherent change at a time, applied to every screen in the same commit.
- Before/after screenshots at 1280x860 and 390 wide, compared side by side, and kept only if clearly better.
- Contrast at least 4.5:1 for text, 3:1 for large text and controls.
- Recorded in the log below with the reason and sources.
- A big change of direction (new palette, new logo) is proposed to Vamsi first under "For Vamsi" in `docs/LOG.md`,
  with a mock-up, unless he has asked for it.

## Design log (newest first)
- 2026-11-11 (2), screen and motion: **a craft pass with the two outside skills** (Vamsi's request).
  Audit of the stylesheet and the main screens against both skills:

  | Before | After | Why |
  |---|---|---|
  | Home: three equal coloured cards numbered 1 / 2 / 3, each with a little drawing | Three plain lines beside a real piece of the audience chat (question, slide, answer; one question sent to the speaker) | Taste: three equal cards and index badges are the commonest machine-made give-away; show the real product, not a drawing of it |
  | Home on a phone: "Auto Q&A", "Sign in" and "Start a talk" each broke onto two lines | The top bar stays on one line | A broken first line is the first thing a visitor sees |
  | A long question in the chat was a 22px bold headline: twelve lines, answer pushed off the phone | Questions over 110 characters are set as 17px text, semi-bold | Taste: headlines two lines or fewer; hierarchy by weight before size. Found by this morning's persona run |
  | Same for a long question on the speaker's card | Same fix | The speaker reads it, not glances at it |
  | "Automated answers, drawn from Maya's slides..." in 15px grey | 17px, near-full ink | Taste: running text 16px+ in ink; this is the one sentence that says answers are automated |
  | `transition: all` on the setup dots and the drop area | Named properties | Emil: never `transition: all` |
  | The browser's plain `ease`, 350-500ms arrivals | `--ease-out` curve, 300ms arrivals, 140ms presses | Emil: built-in curves are too weak; interface motion under 300ms |
  | Only the main buttons gave under the finger | Suggested questions, slide, send, remove, links on cards and talks do too | Emil: every pressable thing answers the press |
  | Hover looks applied on phones (an outlined button stayed filled after a tap) | Hover only with a mouse | Emil: gate hover behind `(hover: hover) and (pointer: fine)` |
  | "Reduce motion" switched every animation off | Short fades stay; travel, growth and loops go | Emil: gentler, not none |
  | Counts jittered sideways as they changed | Tabular figures on all counters | Emil's cheat sheet |

  - Proof: `docs/design-2026-11-11-craft-pass.jpg`.
  - Sources: https://github.com/emilkowalski/skills (emil-design-eng, ui-cheatsheet) ; https://github.com/Leonxlnx/taste-skill ;
    https://github.com/Leonxlnx/taste-skill-classics (taste-skill-v1, minimalist-skill). Our digest: `docs/DESIGN-SKILLS.md`.
  - Not taken from the skills, on purpose: photographs, scroll scenes, "at least 8 moving things", monospace accents.
  - Rejected: staggering the speaker's cards and the suggested questions (both lists are redrawn often, so they
    would replay; Emil: things seen often should not animate).
  - Next candidates from the same audit: (screen) surfaces are separated by 1.5px lines everywhere, where Taste asks
    for tone steps, which is an identity-level change to propose first; the hand-off card uses placeholders as labels;
    the setup "Reading..." loader could be a placeholder shaped like the questions to come. (interaction) the
    hand-off card arriving and the "Sent" confirmation; a new card landing on the speaker's page.
- 2026-11-11, interaction: **opening and closing the slide under an answer.**
  - Before: tapping a slide faded the whole screen to dark and showed the slide in the middle, on a phone hardly
    bigger than it already was. Nothing said the slide could be tapped. PowerPoint slides (shown as laid-out text)
    could not be opened at all. Focus stayed behind the dark layer; only a tap or Escape closed it.
  - Now: every slide carries a small corner mark. Tapped, it grows out of its own place in the chat (300ms) to the
    full width of the phone, and its place stays behind as an empty frame; closing sends it back there (250ms).
    Close by tapping anywhere, the Close button, Escape, or dragging the slide down (past 90px it goes away, less and
    it settles back). Text slides open too, scaled up with their layout intact. It is a proper dialog: focus moves to
    Close, Tab stays there, focus returns to the slide. Pinch-zoom still works, and while zoomed in the drag is off
    so a finger can move around the slide. Proof: `docs/design-2026-11-11-slide-open.jpg`.
  - Why: the slide is the explanation (principle 2), so opening it should feel like picking up the same object,
    not going to another screen. Sources: Material motion (container transform: 300ms in, 250ms back, standard curve
    `cubic-bezier(.2,0,0,1)`) https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md ;
    PhotoSwipe (zoom from the thumbnail by default, fade only when there is none, ~333ms, no animation under reduced
    motion) https://photoswipe.com/opening-or-closing-transition ; WAI-ARIA modal dialog (focus in, Tab kept inside,
    Escape, focus back to the opener) https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/
  - Also fixed on the way: an upload problem on the "Add your slides" step showed as `[object HTMLParagraphElement]`
    instead of its message.
  - Rejected: a visible "Slide 3" caption and a hint line in the open view (more words, and the label is on the slide
    they just tapped); a double-tap zoom of our own (the phone's pinch already does it); turning the slide sideways
    automatically to fill a phone held upright (would surprise people; see next).
  - Next candidates: (interaction) a "turn" control or auto-fill in landscape so a 16:9 slide really gets bigger on
    a phone, since held upright it only grows from about 350 to 390 wide; how the answer's first word and its slide
    arrive together; swiping between slides when an answer has two. (screen) the audience's empty first screen;
    the upload step, whose error text is small and whose drop area has no progress. (identity) not touched yet.
- 2026-11-10: system as above (first version).
