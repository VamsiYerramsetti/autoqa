// The home page's short film: how Auto Q&A works, played on a loop, about 25 seconds.
// 1. A speaker on stage, the code on the screen, a room of dots; one person scans it.
// 2. We zoom into their phone: they tap a suggested question, the slide appears, the answer writes itself.
// 3. They ask something the slides don't cover; it goes to the speaker.
// 4. The speaker answers from their phone; the reply lands on the person's phone.
// Plain DOM and CSS transitions, no libraries. It only plays while on screen, has a pause button (anything that
// moves for more than five seconds must be stoppable), and shows one still frame under "reduce motion".
import { el } from '/js/common.js';

const film = document.getElementById('film');
const steps = [...document.querySelectorAll('.ways li[data-step]')];
if (film) build();

function build() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svgNS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs = {}) => { const n = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };

  /* ---------- Scene 1: the room ---------- */
  const room = S('svg', { viewBox: '0 6 400 470', class: 'film-room', 'aria-hidden': 'true' });
  // The big screen: "Ask me anything." and the code.
  const screen = S('g', { class: 'screen' });
  screen.append(S('rect', { x: 70, y: 28, width: 260, height: 146, rx: 12, class: 'paper' }));
  screen.append(S('rect', { x: 92, y: 62, width: 104, height: 14, rx: 7, class: 'ink' }));
  screen.append(S('rect', { x: 92, y: 84, width: 76, height: 14, rx: 7, class: 'ink' }));
  screen.append(S('rect', { x: 92, y: 122, width: 86, height: 8, rx: 4, class: 'soft' }));
  const code = S('g', { class: 'code' });
  code.append(S('rect', { x: 220, y: 46, width: 92, height: 92, rx: 10, class: 'paper-edge' }));
  // A small branded code: corner squares and dots, drawn from a fixed pattern so it never flickers.
  for (const [cx, cy] of [[234, 60], [298, 60], [234, 124]]) {
    code.append(S('rect', { x: cx - 9, y: cy - 9, width: 18, height: 18, rx: 5, class: 'finder' }));
    code.append(S('rect', { x: cx - 4, y: cy - 4, width: 8, height: 8, rx: 2.5, class: 'cobalt' }));
  }
  let seed = 7;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const x = 226 + c * 9.5, y = 52 + r * 9.5;
    if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3) || (r === 4 && c === 4)) continue;
    seed = (seed * 9301 + 49297) % 233280;
    if (seed / 233280 > 0.45) code.append(S('circle', { cx: x + 4, cy: y + 4, r: 3.1, class: 'cobalt' }));
  }
  code.append(S('circle', { cx: 262, cy: 92, r: 5, class: 'yellow' }), S('circle', { cx: 270, cy: 92, r: 5, class: 'cobalt' }));
  screen.append(code);
  room.append(screen);
  // The speaker, at the side of the screen, with a little wave.
  const speaker = S('g', { class: 'speaker' });
  speaker.append(S('rect', { x: 26, y: 132, width: 30, height: 56, rx: 15, class: 'ink' }), S('circle', { cx: 41, cy: 118, r: 12, class: 'ink' }));
  speaker.append(S('rect', { x: 50, y: 140, width: 26, height: 9, rx: 4.5, class: 'ink arm' }));
  room.append(speaker);
  room.append(S('rect', { x: 20, y: 190, width: 360, height: 8, rx: 4, class: 'ink stage-edge' }));
  // The audience: rows of dots facing the stage. One of them is "you".
  const seats = [];
  for (let r = 0; r < 7; r++) {
    const n = 7 + r * 2, y = 228 + r * 36;
    for (let i = 0; i < n; i++) seats.push({ x: 200 + (i - (n - 1) / 2) * (330 / (n + 1)), y, r });
  }
  const dots = seats.map((s) => { const c = S('circle', { cx: s.x.toFixed(1), cy: s.y, r: 9, class: 'seat' }); room.append(c); return c; });
  const me = seats.findIndex((s) => s.r === 2 && s.x > 230 && s.x < 270);
  const you = { x: seats[me].x, y: seats[me].y };
  const beam = S('path', { d: `M${you.x} ${you.y - 20}L266 140`, class: 'beam' });
  const phoneUp = S('rect', { x: you.x - 7, y: you.y - 34, width: 14, height: 24, rx: 3.5, class: 'pocket' });
  room.append(beam, phoneUp);

  /* ---------- Scene 2 and 3: the person's phone ---------- */
  const thread = el('div', { class: 'f-thread' });
  const chips = el('div', { class: 'f-chips' });
  const box = el('div', { class: 'f-box' }, el('span', { class: 'f-typed' }), el('i', { class: 'f-caret' }));
  const send = el('span', { class: 'f-send' });
  const banner = el('div', { class: 'f-banner' }, el('i'), 'Maya replied');
  const phone = el('div', { class: 'f-phone' },
    el('div', { class: 'f-head' }, el('b', {}, 'Green roofs that store rain'), el('span', {}, 'Maya Okafor')),
    banner, thread, el('div', { class: 'f-compose' }, chips, el('div', { class: 'f-row' }, box, send)));
  /* ---------- Scene 4: the speaker's phone ---------- */
  const reply = el('div', { class: 'f-box tall' }, el('span', { class: 'f-typed' }), el('i', { class: 'f-caret' }));
  const card = el('div', { class: 'f-card' },
    el('b', {}, 'Would it work on a sloped roof?'),
    el('span', { class: 'f-who' }, '3 people asked'),
    reply,
    el('span', { class: 'f-btn' }, 'Send reply'));
  const inbox = el('div', { class: 'f-phone f-speaker' },
    el('div', { class: 'f-head' }, el('b', {}, 'Questions for you'), el('span', {}, '1 needs you')), el('div', { class: 'f-thread' }, card));
  const finger = el('div', { class: 'f-finger' });
  const caption = el('p', { class: 'f-caption', 'aria-live': 'off' });
  const pause = el('button', { class: 'f-pause', type: 'button', 'aria-label': 'Pause the film' });
  const stage = el('div', { class: 'f-stage' }, room, phone, inbox, finger);
  film.replaceChildren(stage, el('div', { class: 'f-foot' }, caption, pause));
  film.classList.add('ready');

  /* ---------- helpers ---------- */
  let playing = !still, visible = false, run = 0;
  const wait = (ms, token) => new Promise((resolve, reject) => {
    let left = ms, last = performance.now();
    const tick = (now) => {
      if (token !== run) return reject(new Error('restart'));
      if (playing && visible) left -= now - last;
      last = now;
      if (left <= 0) resolve(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const step = (n, text) => {
    steps.forEach((li) => li.classList.toggle('on', li.dataset.step === String(n)));
    caption.textContent = text;
  };
  const scene = (name) => { stage.dataset.scene = name; };
  // The finger travels to an element inside the stage, then presses.
  async function tap(target, token, hold = 450) {
    const s = stage.getBoundingClientRect(), r = target.getBoundingClientRect();
    finger.style.transform = `translate(${r.left - s.left + r.width / 2 - 22}px, ${r.top - s.top + r.height / 2 - 22}px)`;
    finger.classList.add('show');
    await wait(650, token);
    finger.classList.add('press'); target.classList.add('pressed');
    await wait(180, token);
    finger.classList.remove('press'); target.classList.remove('pressed');
    await wait(hold, token);
  }
  async function type(where, text, token, speed = 38) {
    const t = where.querySelector('.f-typed');
    where.classList.add('typing');
    for (let i = 1; i <= text.length; i++) { t.textContent = text.slice(0, i); await wait(speed, token); }
    where.classList.remove('typing');
  }
  async function write(node, text, token) {
    for (const word of text.split(' ')) { node.textContent += (node.textContent ? ' ' : '') + word; await wait(70, token); }
  }
  const chip = (text) => el('span', { class: 'f-chip' }, text);
  const turn = (q) => { const n = el('div', { class: 'f-turn' }, el('b', {}, q)); thread.append(n); requestAnimationFrame(() => n.classList.add('in')); return n; };

  function reset() {
    scene('room');
    thread.replaceChildren(); banner.classList.remove('in');
    chips.replaceChildren(chip('How much did runoff drop?'), chip('What does it cost?'), chip('Who is it for?'));
    box.querySelector('.f-typed').textContent = ''; reply.querySelector('.f-typed').textContent = '';
    card.classList.remove('done'); finger.classList.remove('show');
    dots.forEach((d) => d.setAttribute('class', 'seat'));
    room.classList.remove('scan'); stage.classList.remove('zoom');
  }

  // The still frame for "reduce motion": the person's phone with an answer and a question sent to the speaker.
  function stillFrame() {
    reset(); scene('phone'); stage.classList.add('zoom');
    dots.forEach((d, i) => d.setAttribute('class', i % 5 === 1 ? 'seat answered' : 'seat here'));
    const t1 = turn('How much did runoff drop?');
    t1.append(slideCard(), el('p', {}, 'By 62% at peak, across four pilot schools.'), el('small', { class: 'f-tag' }, el('i'), 'From slide 4 · automated'));
    const t2 = turn('Would it work on a sloped roof?');
    t2.append(el('p', {}, "The talk doesn't say."), el('div', { class: 'f-hand sent' }, el('i'), 'Sent to Maya'));
    step(3, 'Answered from the slides. The rest go to the speaker.');
    pause.hidden = true;
  }
  const slideCard = () => el('div', { class: 'f-slide' }, el('b', {}, 'Pilot results'), el('i'), el('i'), el('i', { class: 'short' }), el('small', {}, 'Slide 4'));

  async function play(token) {
    for (;;) {
      reset();
      // 1. The talk, the code, the room filling up.
      step(1, 'Your talk, with the code on screen.');
      for (let i = 0; i < dots.length; i++) { dots[i].setAttribute('class', 'seat here'); if (i % 3 === 0) await wait(30, token); }
      await wait(900, token);
      step(2, 'Someone scans it. No app, no sign-up.');
      dots[me].setAttribute('class', 'seat you');
      room.classList.add('scan');
      await wait(1700, token);
      // Into their phone.
      stage.classList.add('zoom'); scene('phone');
      await wait(900, token);
      // 2. Tap a suggestion: the slide, then the answer.
      step(3, 'They ask. Your slides answer, and show the slide.');
      const first = chips.firstElementChild;
      await tap(first, token, 150);
      first.remove(); chips.append(chip('What comes next?'));
      const t1 = turn('How much did runoff drop?');
      await wait(500, token);
      const s = slideCard(); t1.append(s); requestAnimationFrame(() => s.classList.add('in'));
      await wait(600, token);
      const a = el('p'); t1.append(a);
      await write(a, 'By 62% at peak, across four pilot schools.', token);
      t1.append(el('small', { class: 'f-tag' }, el('i'), 'From slide 4 · automated'));
      await wait(1500, token);
      // 3. Something the slides don't cover.
      step(4, "What the slides can't answer goes to you.");
      await type(box, 'Would it work on a sloped roof?', token);
      await tap(send, token, 100);
      box.querySelector('.f-typed').textContent = '';
      const t2 = turn('Would it work on a sloped roof?');
      thread.scrollTop = thread.scrollHeight;
      await wait(500, token);
      t2.append(el('p', {}, "The talk doesn't say."));
      const hand = el('div', { class: 'f-hand' }, el('span', {}, 'Send to Maya?'), el('span', { class: 'f-btn dark' }, 'Send'));
      t2.append(hand); thread.scrollTop = thread.scrollHeight;
      await wait(700, token);
      await tap(hand.lastElementChild, token, 200);
      hand.replaceChildren(el('i'), 'Sent to Maya'); hand.classList.add('sent');
      thread.scrollTop = thread.scrollHeight;
      await wait(1300, token);
      // 4. The speaker answers from their own phone.
      step(4, 'You reply when you can, from your phone.');
      scene('speaker');
      await wait(900, token);
      await type(reply, 'Yes, up to 15°, with a deeper crate.', token, 34);
      await tap(card.querySelector('.f-btn'), token, 100);
      card.classList.add('done');
      await wait(900, token);
      // Back on the person's phone: the reply arrives for everyone who asked.
      scene('phone');
      step(4, 'Everyone who asked gets your reply.');
      await wait(500, token);
      banner.classList.add('in');
      const r = el('div', { class: 'f-reply' }, el('small', {}, 'Maya replied'), 'Yes, up to 15°, with a deeper crate.');
      t2.append(r); requestAnimationFrame(() => r.classList.add('in'));
      thread.scrollTop = thread.scrollHeight;
      finger.classList.remove('show');
      await wait(2600, token);
      // Back out to the room: most questions answered (cobalt), a few with the speaker (yellow).
      finger.classList.remove('show');
      room.classList.remove('scan'); stage.classList.remove('zoom'); scene('room');
      step(4, 'The whole room heard. You stayed on your talk.');
      const order = dots.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 44);
      for (const [k, i] of order.entries()) { dots[i].setAttribute('class', k % 9 === 4 ? 'seat waiting' : 'seat answered'); if (k % 2) await wait(40, token); }
      await wait(2600, token);
      // Out, and round again.
      film.classList.add('fade'); await wait(500, token); film.classList.remove('fade');
    }
  }

  function start() { run++; const token = run; play(token).catch(() => {}); }
  function paintPause() {
    pause.setAttribute('aria-label', playing ? 'Pause the film' : 'Play the film');
    pause.classList.toggle('paused', !playing);
    film.classList.toggle('paused', !playing);
  }
  pause.addEventListener('click', () => { playing = !playing; paintPause(); });
  paintPause();

  if (still) { stillFrame(); return; }
  // Play only while it can be seen; start from the beginning the first time it comes into view.
  let started = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !started) { started = true; start(); }
  }, { threshold: 0.35 }).observe(film);
  // The phone layout moves with the page width; restart cleanly instead of finishing with a misplaced finger.
  let w = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - w) > 60 && started) { w = innerWidth; start(); } });
}
