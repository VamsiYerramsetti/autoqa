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
- **Forms:** a field's label is always in view (never a placeholder); a problem is written under the field it belongs
  to, in ink, with the field outlined; on yellow, red is never used for text.
- **Motion:** a thing that moves across the screen (the slide opening) travels on `cubic-bezier(.2, 0, 0, 1)`;
  a thing that arrives or answers a press uses `--ease-out: cubic-bezier(.23, 1, .32, 1)`. Press 140ms, arriving
  300ms, leaving 250ms. Everything pressable gives a little under the finger (`scale(.97)`). Hover looks are for a
  mouse only. With "reduce motion" on, a 120ms fade replaces travel, growth and loops.
- **Theme switch:** light and dark cross-fade in about 0.65 s (the whole page as one picture where the browser can,
  colour by colour elsewhere). Sheets rise in (260 ms), new suggestion chips rise in, the reply banner drops in.
- **The Auto Q&A code:** the audience QR code is drawn in our look (`lib/qr.js`), in five still styles and one moving
  one, all picked from "Put it on a slide" on the speaker page:
  - *Auto Q&A* (the default, unchanged): cobalt round dots, ink corner markers with rounded corners and a cobalt centre,
    the Q+A mark in the middle.
  - *Ink*: classic square modules in ink, the most contrast, for dim projectors.
  - *Ask frame*: the code inside a cobalt speech bubble whose band says "Scan to ask."
  - *Cobalt card*: the code on a white square inside a cobalt card that says "Ask me anything."
  - *Room*: a crowd of dots of slightly different sizes (never under 3/4 of a module), most cobalt, some ink.
  - *Animated (GIF)*: the Ask frame drawn in the browser (`public/js/qrkit.js`, GIF writer `public/js/gif.js`), 720×720,
    16 frames, 2 s loop, 16 colours. Only things that never change a module move: a soft wave of colour runs across
    the dots from cobalt to ink and back (both dark on white), the mark bobs inside its own white disc, a yellow cursor
    blinks after "Scan to ask". A still code stays the default: animated codes have no reliability data.
  Rules for every style: error correction H; at least 4 modules of white quiet margin, also inside a frame or card;
  dark on light, never inverted; the mark covers under a tenth of the code and never a corner or alignment square.
  `/api/talks/:id/qr.svg?style=` serves the still styles; `/api/talks/:id/qr.json` gives the module grid for the
  moving one. The full-screen code page uses the last plain style picked on that device (Auto Q&A, Ink or Room).
  The speaker's private phone code stays a plain black square on purpose.
- **Slides with the code:** four 1920×1080 designs drawn in the browser with the bundled fonts, each in the chosen code
  style: *Cobalt* (to open Q&A), *Light*, *Closing* ("Thank you." / "Still have a question?") and *Corner card*
  (transparent, to paste over any slide). Each says what to do ("Scan with your phone camera. No app, no sign-up."),
  what happens ("My slides answer straight away. Anything else comes to me, and I'll reply."), the short address with
  the code picked out, and the talk title and speaker. The code is 55–60% of the slide's height (the corner card 48%).
- **Contact buttons:** LinkedIn with LinkedIn's own mark (allowed for linking to a profile), website with a globe,
  email with an envelope. Icons are 24-unit line drawings at 1.8 stroke (`icon()` in `common.js`).
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

### 2026-11-14: code styles, a moving code and a slide chooser (Vamsi's request)
- Before: one code style; "Put it on a slide" showed the code with Copy / PNG / SVG / "Ready-made slide", and the
  slide button downloaded at once a white slide saying "Questions?" and "Scan to ask".
- After: the sheet opens on two rows of previews that scroll sideways and snap: **Code style** (Auto Q&A, Ink, Ask
  frame, Cobalt card, Room, Animated) and **Slide** (Cobalt, Light, Closing, Corner card, each redrawn in the chosen
  code style). Both rows are radio groups (arrow keys move, one Tab stop). Nothing downloads until "Download slide
  (PNG)" or "Download code (PNG / SVG, or GIF)" is pressed. The animated preview stands still under reduce motion.
  On a phone the sheet rises from the bottom. Files: `lib/qr.js`, `public/js/qrkit.js`, `public/js/qrchooser.js`,
  `public/js/gif.js`.
- Scanning test (jsQR, every file downloaded from the chooser): each still style as SVG and PNG decodes at 90, 160,
  300 and 600 px; all 16 frames of the GIF decode at 160 and 600 px (403 KB); all 24 slides (4 designs × 6 code
  styles) decode at 300, 600 and 1080 px high. Misses: slides drawn only 160 px high (the code is then ~80 px; the
  Closing, Corner card and some Animated ones), and the Corner card with the Auto Q&A code at exactly 1080 px (it
  reads at 500–1400 px around it). jsQR is stricter than phone cameras; the next step is a check on real phones.
- Sources: [QR code design rules](https://www.qr-code-generator.com/blog/qr-code-design-rules/) (quiet zone, dark on
  light, error correction, logo size) ; [QR codes in presentations](https://www.qr-code-generator.com/blog/qr-codes-in-presentations/)
  (scan distance about 10× the code's width, so on a slide the code is at least ~40% of the slide's height) ;
  [Animated QR codes](https://www.bleepingcomputer.com/news/technology/animated-qr-codes-how-do-they-work-and-how-to-create-your-own/amp/)
  (they work because readers sample module centres, but there is no reliability data → a still code stays the default).
- Rejected: animating the dots' size or position (would change what a reader samples); a light-on-dark code for the
  Cobalt card (many readers cannot read inverted codes, so the code sits on its own white square); yellow data dots
  in the Room style (too light to read as dark).
- Next: try each style on two or three real phones from 5 m; a moving preview on the full-screen code page.

### 2026-11-13 (night): the home page film (Vamsi's request)
- Before: a still card with two example questions beside three steps.
- After: a ~28 s looping film in flat product shapes: a speaker on stage with the code on screen, the room of dots
  filling, one person scanning; a zoom into their phone (tap a suggestion → slide → answer with "From slide 4 ·
  automated"); a question the slides don't cover goes to Maya; her phone, her reply; the reply lands; back out to
  the room turning cobalt and yellow. The four steps on the left light up with the film. `public/js/home-film.js`.
- Rules kept: only opacity and transform move; plays only while on screen; pause button (WCAG 2.2.2, anything
  moving over 5 s); one still frame under reduce motion; the old still example stays for browsers without scripts.
- Next: a "watch it with sound off" caption track is not needed (no sound); consider the same film on the Why page.

### 2026-11-13: motion, the Auto Q&A code, contact icons (Vamsi's requests)
- Before: the theme snapped; the QR code was a plain black square; LinkedIn was a text button; no icons anywhere.
- After: theme cross-fade; branded code with copy/download/ready-made slide; icon buttons; chips and sheets arrive
  with a small rise. Dark-mode cobalt darkened to `#5562fa` so white text on buttons passes 4.5:1 (axe scan).
- Screens checked at 1280×860 and iPhone 14, light and dark. Next: a hero product preview with a real slide
  picture; a moving dot on the code page when someone joins.
- 2026-11-12, interaction and screen: **sending a question to the speaker** (the yellow card on the phone).
  Audited against both skills; candidates carried over from the craft pass ("placeholders as labels", "the card
  arriving and the Sent confirmation").

  | Before | After | Why |
  |---|---|---|
  | "Your name", "Email" and "LinkedIn link (optional)" were grey placeholders that vanished with the first letter; a field holding "tomas" said nothing about what it was | Each field carries its label, always in view, inside the white box above what is typed | Taste: a control explains itself by its form, its label and its place. NN/g: placeholders as labels are harmful |
  | A problem ("That email doesn't look right.") appeared in one spot above the button, far from the field | The field itself gets a red outline and the sentence sits right under it; focus goes to that field; it clears as soon as the person types | Taste: an error next to its cause. GOV.UK error message pattern; WCAG 3.3.1 |
  | The problem was red text on yellow: 4.4:1, under our 4.5:1 rule | Dark ink, semi-bold, on yellow (13:1); red is only the outline, on white | Our contrast rule in this file |
  | Switching to "Ask anonymously" left the email problem on a card that no longer asked for an email | The problem goes when it no longer applies | A bug found in today's screenshots |
  | The name and email were only checked after a round trip to the server | Checked on the phone first, at once; the server still checks | Emil: the interface answers the press immediately |
  | Pressing "Send" showed nothing until the reply came back, and a second tap could send again | The button says "Sending…" and cannot be pressed twice | Emil: every press gets feedback |
  | Every unanswered question kept its full yellow form open: two questions meant two forms, about two phone screens of yellow | One card open at a time. An older, unsent one folds to a small "Send to Dr. Carvalho" button (the same yellow-dotted button as "Ask Dr. Carvalho too"); what was typed is kept | Taste: no blank or repeated stretch; principle 1 (never louder than the talk) |
  | The card and the "Sent" note appeared with a jump | Both settle in (300ms, `--ease-out`); on "Sent" the yellow dot lands once. A 120ms fade under reduced motion | Emil: things that arrive now and then may move; ease-out; under 300ms; gentler, not none |
  | Heading "Send this to Dr. Carvalho?" and, right under it, a button "Send to Dr. Carvalho" / "Send without my name" | The button says "Send" | Principle 3: few words; the heading and the switch already say it |
  | Small print 13px | 14px | Taste: side notes may be small, not tiny |

  - Proof: `docs/design-2026-11-12-hand-off.jpg` (phone, before above, after below). Desktop checked too.
  - Sources: the two skills (`docs/DESIGN-SKILLS.md`) ; https://www.nngroup.com/videos/placeholders-form-fields/ ;
    https://design-system.service.gov.uk/components/error-message ; https://design-system.service.gov.uk/patterns/validation ;
    https://nhsuk.github.io/accessibility-checklist/pages/3.3.1-errors-can-be-identified-and-described
  - Rejected: labels that float up out of the placeholder when typing starts (motion on something typed into every
    time, and it starts life as a placeholder); hiding the LinkedIn field behind a link (one more control, and
    connecting with the speaker is part of the product); animating the card's height when it folds (Emil: move only
    `transform` and `opacity`); red problem text (too faint on yellow).
  - Next candidates, seen in today's screenshots: (screen) on a phone the top bar of the speaker's page and of "Your
    talks" overlaps the logo ("Code RXCAQ · Your talks" and the email address run into it and off the edge); in the
    audience header the light/dark switch drops to its own line once the yellow "waiting" pill shows; in setup the
    hint "Type or speak your answer" is cut in half on a phone. (interaction) a new card landing on the speaker's
    page; the setup "Reading..." loader as a placeholder shaped like what is coming. (identity) lines against tone
    steps is still to be proposed to Vamsi with mock-ups; not started.
- 2026-11-11 (evening, built in the project chat at Vamsi's request): **dark theme** (follows the device, moon/sun switch, every colour now a variable: `--surface`, `--ring`, `--deep` for text on yellow, `--slide` for white slides), **"Ask anonymously" switch** on the yellow card, **setup as a conversation** (transcript layout like the audience chat; attach, microphone and send in one row; the mic turns yellow while listening), and a quiet **"Ask X too"** pill after general answers.
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
