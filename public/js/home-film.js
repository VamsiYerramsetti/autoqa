// The home page's short film: how Auto Q&A works, seen from a seat in the audience. About 30 seconds, on a loop.
// 1. You sit in the audience. Maya is on stage; her slide shows the code.
// 2. Your phone comes up, scans the code; a pointer taps "Open talk" and we zoom into your phone.
// 3. You tap a suggested question: the slide appears, the line that answers it is marked, the answer writes itself.
// 4. You ask something the slides don't cover; it goes to Maya. She replies from her phone; the reply lands on yours.
// Then back to the room, where most people got their answer and a few wait for Maya.
// Plain DOM, SVG and CSS transitions, no libraries. Only opacity and transform move. It plays only while on
// screen, has a pause button (anything that moves for more than five seconds must be stoppable), and shows one
// still frame under "reduce motion".
import { el } from '/js/common.js';

const film = document.getElementById('film');
const steps = [...document.querySelectorAll('.ways li[data-step]')];
if (film) build();

function build() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svgNS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs = {}, text) => {
    const n = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text) n.textContent = text;
    return n;
  };
  // A fixed pseudo-random sequence, so the room looks the same every time and never flickers.
  let seed = 11;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  /* ---------- Your phone, and Maya's ---------- */
  const thread = el('div', { class: 'f-thread' });
  const chips = el('div', { class: 'f-chips' });
  const box = el('div', { class: 'f-box' }, el('span', { class: 'f-typed' }), el('i', { class: 'f-caret' }));
  const send = el('span', { class: 'f-send' });
  const banner = el('div', { class: 'f-banner' }, el('i'), 'Maya replied');
  const phone = el('div', { class: 'f-phone f-you' },
    el('div', { class: 'f-head' }, el('b', {}, 'Shipping faster with AI code review'), el('span', {}, 'Maya Okafor')),
    banner, thread, el('div', { class: 'f-compose' }, chips, el('div', { class: 'f-row' }, box, send)));
  const reply = el('div', { class: 'f-box tall' }, el('span', { class: 'f-typed' }), el('i', { class: 'f-caret' }));
  const card = el('div', { class: 'f-card' },
    el('b', {}, 'Does it work with our GitLab setup?'),
    el('span', { class: 'f-who' }, '4 people asked'),
    reply,
    el('span', { class: 'f-btn' }, 'Send reply'));
  const inbox = el('div', { class: 'f-phone f-speaker' },
    el('div', { class: 'f-head' }, el('b', {}, 'Questions for you'), el('span', {}, '1 needs you')), el('div', { class: 'f-thread' },
      el('div', { class: 'f-stat' }, el('b', {}, '38'), ' answered from your slides'),
      el('div', { class: 'f-stat' }, el('b', {}, '112'), ' people in the room'), card));
  // The pointer: an ordinary arrow, so it reads as "someone clicks here".
  const cursor = el('div', { class: 'f-cursor' });
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 2.5v17.2l4.6-4.3 3 6.6 3-1.4-3-6.4h6.3z" fill="#1d1b2e" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const ripple = el('i', { class: 'f-ripple' });
  const caption = el('p', { class: 'f-caption', 'aria-live': 'off' });
  const pause = el('button', { class: 'f-pause', type: 'button', 'aria-label': 'Pause the film' });
  const stage = el('div', { class: 'f-stage' }, phone, inbox, ripple, cursor);
  // Described once in hidden text; the moving picture is hidden from screen readers, the pause button is not.
  const say = film.getAttribute('aria-label'); film.removeAttribute('role'); film.removeAttribute('aria-label');
  stage.setAttribute('aria-hidden', 'true'); caption.setAttribute('aria-hidden', 'true');
  film.replaceChildren(el('p', { class: 'sr' }, say), stage, el('div', { class: 'f-foot' }, caption, pause));
  film.classList.add('ready');

  /* ---------- The room, drawn to the stage's own shape ---------- */
  let room, people, myPhone, openPill, finder, code;
  function drawRoom() {
    seed = 11;
    const H = 500, W = Math.round(H * stage.clientWidth / stage.clientHeight);
    room = S('svg', { viewBox: `0 0 ${W} ${H}`, class: 'film-room', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid slice' });
    room.append(S('rect', { x: 0, y: 0, width: W, height: H, class: 'wall' }));
    // The big screen with Maya's first slide: the title and the code.
    const wide = W > 440;
    const sw = Math.min(340, W - 40), sh = Math.round(sw * 0.56);
    const sx = Math.round((W - sw) / 2 + (wide ? 34 : 6)), sy = 24;
    // On a narrow stage Maya stands below the screen instead of beside it, so she never covers the slide.
    const floor = sy + sh + (wide ? 52 : 112);
    const slide = S('g', { class: 'screen' });
    slide.append(S('rect', { x: sx, y: sy, width: sw, height: sh, rx: 8, class: 'paper' }));
    const fs = sw * 0.052;
    slide.append(S('text', { x: sx + sw * 0.07, y: sy + sh * 0.3, class: 'sl-t', 'font-size': fs.toFixed(1) }, 'Shipping faster'));
    slide.append(S('text', { x: sx + sw * 0.07, y: sy + sh * 0.3 + fs * 1.15, class: 'sl-t', 'font-size': fs.toFixed(1) }, 'with AI code review'));
    slide.append(S('text', { x: sx + sw * 0.07, y: sy + sh * 0.3 + fs * 2.6, class: 'sl-s', 'font-size': (fs * 0.62).toFixed(1) }, 'Maya Okafor'));
    slide.append(S('text', { x: sx + sw * 0.07, y: sy + sh * 0.84, class: 'sl-a', 'font-size': (fs * 0.62).toFixed(1) }, 'Scan to ask →'));
    const q = Math.round(sh * 0.64);
    code = drawCode(sx + sw - q - sw * 0.06, sy + (sh - q) / 2, q);
    slide.append(code);
    room.append(slide);
    // The stage edge, then Maya standing at the side of her screen.
    room.append(S('rect', { x: 0, y: floor, width: W, height: 6, class: 'edge' }));
    room.append(drawSpeaker(wide ? sx - 30 : sx + 30, floor));
    // The audience, from the back of the room: heads and shoulders, smaller further away.
    people = [];
    const rows = [[46, 0.6], [100, 0.84], [168, 1.12], [252, 1.48]];
    const dots = S('g');
    for (const [row, [dy, s]] of rows.entries()) {
      const gap = 56 * s, n = Math.ceil(W / gap) + 1, shift = row % 2 ? -gap / 2 : 0;
      for (let i = 0; i < n; i++) {
        const x = shift + i * gap + (rand() - 0.5) * 8 * s, y = floor + dy + (rand() - 0.5) * 6 * s;
        const p = drawPerson(x, y, s); dots.append(p.dot); people.push(p);
      }
    }
    room.append(dots);
    // Your own phone, held up from the bottom of the picture.
    const pw = wide ? 96 : 84, ph = Math.round(pw * 1.9), px = Math.round(W * (wide ? 0.7 : 0.66) - pw / 2), py = H - ph + 24;
    myPhone = S('g', { class: 'myphone' });
    myPhone.append(S('rect', { x: px - 6, y: py + ph * 0.45, width: 14, height: 34, rx: 7, class: 'hand' }));
    myPhone.append(S('rect', { x: px, y: py, width: pw, height: ph, rx: 14, class: 'body' }));
    myPhone.append(S('rect', { x: px + 5, y: py + 5, width: pw - 10, height: ph - 10, rx: 10, class: 'lens' }));
    // On its screen: the camera sees the code.
    const mq = pw * 0.52;
    const mini = drawCode(px + (pw - mq) / 2, py + ph * 0.24, mq);
    mini.classList.add('mini');
    myPhone.append(mini);
    finder = S('path', { class: 'finder-box', d: corners(px + (pw - mq) / 2 - 6, py + ph * 0.24 - 6, mq + 12) });
    myPhone.append(finder);
    openPill = S('g', { class: 'open' });
    openPill.append(S('rect', { x: px + 10, y: py + ph * 0.66, width: pw - 20, height: 26, rx: 13, class: 'pill' }));
    openPill.append(S('text', { x: px + pw / 2, y: py + ph * 0.66 + 17, 'text-anchor': 'middle', class: 'pill-t' }, 'Open talk'));
    myPhone.append(openPill);
    for (const [fx, fy] of [[pw - 4, 0.3], [pw - 4, 0.42], [pw - 4, 0.54]]) myPhone.append(S('rect', { x: px + fx, y: py + ph * fy, width: 12, height: 22, rx: 6, class: 'hand' }));
    room.append(myPhone);
    stage.prepend(room);
    // The zoom goes into your phone's screen, and your phone in the chat grows out of the same place.
    const cx = px + pw / 2, cy = py + ph * 0.45, k = stage.clientWidth / W;
    room.style.transformOrigin = `${(cx / W * 100).toFixed(1)}% ${(cy / H * 100).toFixed(1)}%`;
    stage.style.setProperty('--fx', `${Math.round(cx * k - stage.clientWidth / 2)}px`);
    stage.style.setProperty('--fy', `${Math.round(cy * k - stage.clientHeight / 2)}px`);
    stage.style.setProperty('--fk', (pw * k / 268).toFixed(3));
  }
  // The four corners of a camera's framing box.
  function corners(x, y, s) {
    const c = s * 0.24;
    return `M${x} ${y + c}V${y}H${x + c}M${x + s - c} ${y}H${x + s}V${y + c}M${x + s} ${y + s - c}V${y + s}H${x + s - c}M${x + c} ${y + s}H${x}V${y + s - c}`;
  }
  // A small Auto Q&A code: corner squares and round dots, from a fixed pattern.
  function drawCode(x, y, size) {
    const g = S('g', { class: 'code' }), u = size / 11;
    g.append(S('rect', { x, y, width: size, height: size, rx: u * 1.2, class: 'qr-bg' }));
    for (const [cx, cy] of [[2.5, 2.5], [8.5, 2.5], [2.5, 8.5]]) {
      g.append(S('rect', { x: x + (cx - 1.5) * u, y: y + (cy - 1.5) * u, width: 3 * u, height: 3 * u, rx: u * 0.8, class: 'finder' }));
      g.append(S('rect', { x: x + (cx - 0.6) * u, y: y + (cy - 0.6) * u, width: 1.2 * u, height: 1.2 * u, rx: u * 0.35, class: 'q-cobalt' }));
    }
    let s = 7;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3) || (r > 3 && r < 5 && c > 3 && c < 5)) continue;
      s = (s * 9301 + 49297) % 233280;
      if (s / 233280 > 0.45) g.append(S('circle', { cx: x + (c + 1.5) * u, cy: y + (r + 1.5) * u, r: u * 0.36, class: 'q-cobalt' }));
    }
    g.append(S('circle', { cx: x + 5.5 * u, cy: y + 5.5 * u, r: u * 0.75, class: 'q-yellow' }));
    return g;
  }
  // Maya: a standing figure facing the room, one arm towards her slide.
  function drawSpeaker(x, floor) {
    const g = S('g', { class: 'speaker' });
    g.append(S('rect', { x: x - 9, y: floor - 46, width: 7, height: 46, rx: 3.5, class: 'legs' }));
    g.append(S('rect', { x: x + 2, y: floor - 46, width: 7, height: 46, rx: 3.5, class: 'legs' }));
    g.append(S('rect', { x: x - 11, y: floor - 5, width: 11, height: 5, rx: 2.5, class: 'legs' }), S('rect', { x: x + 1, y: floor - 5, width: 11, height: 5, rx: 2.5, class: 'legs' }));
    g.append(S('path', { d: `M${x - 15} ${floor - 40}V${floor - 72}q0 -12 15 -12t15 12V${floor - 40}z`, class: 'shirt' }));
    g.append(S('rect', { x: x + 8, y: floor - 80, width: 28, height: 8, rx: 4, class: 'shirt arm' }));
    g.append(S('rect', { x: x - 4, y: floor - 90, width: 8, height: 8, class: 'skin' }));
    g.append(S('circle', { cx: x, cy: floor - 97, r: 11, class: 'skin' }));
    g.append(S('path', { d: `M${x - 12} ${floor - 92}q-3 -18 12 -18t12 18q-3 -9 -12 -9t-12 9z`, class: 'hair' }));
    g.append(S('circle', { cx: x - 4, cy: floor - 96, r: 1.3, class: 'face' }), S('circle', { cx: x + 4, cy: floor - 96, r: 1.3, class: 'face' }));
    g.append(S('path', { d: `M${x - 4} ${floor - 91}q4 3.5 8 0`, class: 'smile' }));
    return g;
  }
  // One person seen from behind: shoulders and collar, neck, ears, and one of five hairstyles.
  // Small differences in size, clothes, skin and hair so it reads as a crowd of people, not a pattern.
  function drawPerson(x, y, s) {
    const g = S('g', { class: 'person' });
    const tone = ['p1', 'p2', 'p3', 'p4', 'p5'][Math.floor(rand() * 5)];
    const hair = ['h1', 'h2', 'h3', 'h4'][Math.floor(rand() * 4)];
    const skin = ['s1', 's2', 's3'][Math.floor(rand() * 3)];
    const w = (17 + rand() * 4) * s, hr = (8.5 + rand() * 1.5) * s, top = y - 17 * s, cy = top - hr * 0.9;
    g.append(S('path', { d: `M${x - w} ${y + 30 * s}V${y}Q${x - w} ${top} ${x} ${top}Q${x + w} ${top} ${x + w} ${y}V${y + 30 * s}z`, class: 'shoulders ' + tone }));
    g.append(S('path', { d: `M${x - hr * 0.75} ${top + 1.5 * s}q${hr * 0.75} ${4 * s} ${hr * 1.5} 0`, class: 'collar' }));
    g.append(S('rect', { x: x - hr * 0.42, y: cy + hr * 0.5, width: hr * 0.84, height: hr * 0.9, class: 'flat ' + skin }));
    g.append(S('ellipse', { cx: x - hr * 0.98, cy: cy + hr * 0.1, rx: hr * 0.2, ry: hr * 0.3, class: 'flat ' + skin }), S('ellipse', { cx: x + hr * 0.98, cy: cy + hr * 0.1, rx: hr * 0.2, ry: hr * 0.3, class: 'flat ' + skin }));
    const look = rand();
    if (look < 0.22) { // long hair, over the shoulders
      g.append(S('path', { d: `M${x - hr * 1.08} ${cy}a${hr * 1.08} ${hr * 1.08} 0 0 1 ${hr * 2.16} 0v${hr * 1.9}q${-hr * 1.08} ${hr * 0.6} ${-hr * 2.16} 0z`, class: 'head ' + hair }));
    } else if (look < 0.4) { // a bun
      g.append(S('circle', { cx: x, cy, r: hr, class: 'head ' + hair }), S('circle', { cx: x + hr * 0.1, cy: cy - hr * 1.15, r: hr * 0.46, class: 'head ' + hair }));
    } else if (look < 0.52) { // short back and sides: skin shows below the hairline
      g.append(S('circle', { cx: x, cy, r: hr, class: 'flat ' + skin }), S('path', { d: `M${x - hr} ${cy + hr * 0.15}a${hr} ${hr} 0 0 1 ${hr * 2} 0q${-hr} ${hr * 0.5} ${-hr * 2} 0z`, class: 'head ' + hair }));
    } else if (look < 0.62) { // a ponytail
      g.append(S('circle', { cx: x, cy, r: hr, class: 'head ' + hair }), S('rect', { x: x - hr * 0.26, y: cy + hr * 0.3, width: hr * 0.52, height: hr * 1.7, rx: hr * 0.26, class: 'flat tail ' + hair }));
    } else g.append(S('circle', { cx: x, cy, r: hr, class: 'head ' + hair }));
    room.append(g);
    // At the end, people hold their phones up: cobalt screen when answered, yellow when waiting for the speaker.
    const dot = S('g', { class: 'mark-phone' });
    dot.append(S('rect', { x: x + w * 0.55, y: top - 6 * s, width: 9 * s, height: 15 * s, rx: 2.4 * s, class: 'ph-body' }), S('rect', { x: x + w * 0.55 + 1.4 * s, y: top - 4.4 * s, width: 6.2 * s, height: 11.8 * s, rx: 1.2 * s, class: 'ph-screen' }));
    return { g, dot };
  }

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
  // The pointer travels to an element inside the stage, then clicks: it gives a little, and a ring spreads.
  async function click(target, token, hold = 400) {
    const s = stage.getBoundingClientRect(), r = target.getBoundingClientRect();
    const x = r.left - s.left + r.width / 2, y = r.top - s.top + r.height / 2;
    cursor.style.transform = `translate(${x - 4}px, ${y - 3}px)`;
    cursor.classList.add('show');
    await wait(700, token);
    ripple.style.transform = `translate(${x - 18}px, ${y - 18}px)`;
    cursor.classList.add('press'); target.classList.add('pressed'); ripple.classList.add('go');
    await wait(160, token);
    cursor.classList.remove('press'); target.classList.remove('pressed');
    await wait(hold, token);
    ripple.classList.remove('go');
  }
  async function type(where, text, token, speed = 36) {
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
  // The slide in the answer: a corporate-looking results slide with a title band, three lines and a small chart.
  const slideCard = () => el('div', { class: 'f-slide corp' },
    el('div', { class: 'cs-top' }, el('b', {}, 'Pilot results'), el('em', {}, 'Engineering · Q3')),
    el('div', { class: 'cs-body' },
      el('div', { class: 'cs-lines' }, el('span', {}, '6 teams, 12 weeks'), el('span', { class: 'hl' }, 'Review time down 41%'), el('span', {}, 'Bugs caught before merge +18%')),
      el('div', { class: 'cs-chart' }, ...[100, 84, 71, 59].map((h, i) => el('i', { class: i === 3 ? 'now' : '', style: `--h:${h}%` })))),
    el('small', {}, 'Slide 7'));
  const ANSWER = '41% faster. Across six pilot teams over twelve weeks, reviews took 41% less time.';
  const ASK = 'Does it work with our GitLab setup?';
  const REPLY = 'Yes, we run it on self-hosted GitLab. Setup notes are on my site.';

  function reset() {
    scene('room');
    thread.replaceChildren(); banner.classList.remove('in');
    chips.replaceChildren(chip('How much faster were reviews?'), chip('Does it miss bugs?'), chip('Which tools?'));
    box.querySelector('.f-typed').textContent = ''; reply.querySelector('.f-typed').textContent = '';
    card.classList.remove('done'); cursor.classList.remove('show'); ripple.classList.remove('go');
    people.forEach((p) => p.dot.setAttribute('class', 'mark-phone'));
    room.classList.remove('up', 'scanned'); stage.classList.remove('zoom');
  }

  // The still frame for "reduce motion": your phone with an answer and a question sent to the speaker.
  function stillFrame() {
    reset(); scene('phone'); stage.classList.add('zoom');
    const t1 = turn('How much faster were reviews?');
    const s = slideCard(); s.classList.add('in'); s.querySelector('.hl').classList.add('on');
    t1.append(s, el('p', {}, ANSWER), el('small', { class: 'f-tag' }, el('i'), 'From slide 7 · automated'));
    const t2 = turn(ASK);
    t2.append(el('p', {}, "The talk doesn't say."), el('div', { class: 'f-hand sent' }, el('i'), 'Sent to Maya'));
    step(3, 'Answered from the slides. The rest go to the speaker.');
    pause.hidden = true;
  }

  async function play(token) {
    for (;;) {
      reset();
      // 1. In your seat. Maya is on stage, her code on the screen.
      step(1, 'You’re at Maya’s talk. Her code is on the screen.');
      await wait(2200, token);
      // 2. Your phone comes up and scans it.
      step(2, 'You scan it. No app, no sign-up.');
      room.classList.add('up');
      await wait(1300, token);
      room.classList.add('scanned');
      await wait(500, token);
      await click(openPill, token, 200);
      // Into your phone.
      cursor.classList.remove('show');
      stage.classList.add('zoom'); scene('phone');
      await wait(1000, token);
      // 3. Tap a suggestion: the slide, the line that answers it, then the answer.
      step(3, 'You ask. The slide shows the line that answers it.');
      const first = chips.firstElementChild;
      await click(first, token, 100);
      first.remove(); chips.append(chip('What did it cost?')); cursor.classList.remove('show');
      const t1 = turn('How much faster were reviews?');
      await wait(450, token);
      const s = slideCard(); t1.append(s); requestAnimationFrame(() => s.classList.add('in'));
      await wait(450, token);
      s.querySelector('.hl').classList.add('on');
      await wait(650, token);
      const a = el('p'); t1.append(a);
      await write(a, ANSWER, token);
      t1.append(el('small', { class: 'f-tag' }, el('i'), 'From slide 7 · automated'));
      await wait(1500, token);
      // 4. Something the slides don't cover goes to Maya.
      step(4, 'Not in the slides? It goes to Maya.');
      await type(box, ASK, token);
      await click(send, token, 80);
      cursor.classList.remove('show');
      box.querySelector('.f-typed').textContent = '';
      const t2 = turn(ASK);
      await wait(450, token);
      t2.append(el('p', {}, "The talk doesn't say."));
      const hand = el('div', { class: 'f-hand' }, el('span', {}, 'Send to Maya?'), el('span', { class: 'f-btn dark' }, 'Send'));
      t2.append(hand);
      await wait(600, token);
      await click(hand.lastElementChild, token, 150);
      hand.replaceChildren(el('i'), 'Sent to Maya'); hand.classList.add('sent');
      cursor.classList.remove('show');
      await wait(1200, token);
      // Maya answers from her own phone.
      step(4, 'Maya replies when she can, from her phone.');
      scene('speaker');
      await wait(900, token);
      await type(reply, REPLY, token, 28);
      await click(card.querySelector('.f-btn'), token, 80);
      card.classList.add('done'); cursor.classList.remove('show');
      await wait(900, token);
      // Back on your phone: the reply arrives, for everyone who asked.
      scene('phone');
      step(4, 'Her reply lands in your chat.');
      await wait(450, token);
      banner.classList.add('in');
      const r = el('div', { class: 'f-reply' }, el('small', {}, 'Maya replied'), REPLY, el('span', { class: 'f-connect' }, 'Connect with Maya'));
      t2.append(r); requestAnimationFrame(() => r.classList.add('in'));
      await wait(2600, token);
      // Back out to the room: most people answered (cobalt), a few waiting for Maya (yellow).
      room.classList.remove('up', 'scanned'); stage.classList.remove('zoom'); scene('room');
      step(0, 'Every question gets an answer.');
      await wait(700, token);
      const order = people.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, Math.round(people.length * 0.55));
      for (const [k, i] of order.entries()) { people[i].dot.setAttribute('class', 'mark-phone ' + (k % 7 === 3 ? 'waiting' : 'answered')); if (k % 2) await wait(30, token); }
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

  drawRoom();
  if (still) { stillFrame(); return; }
  // Before it comes into view, the first step is lit and captioned, so the section never looks greyed out.
  step(1, 'You’re at Maya’s talk. Her code is on the screen.');
  // Play only while it can be seen; start from the beginning the first time it comes into view.
  let started = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !started) { started = true; start(); }
  }, { threshold: 0.35 }).observe(film);
  // The room is drawn to the stage's shape; when the width changes a lot, redraw it and start cleanly.
  let w = innerWidth;
  addEventListener('resize', () => {
    if (Math.abs(innerWidth - w) < 60) return;
    w = innerWidth; room.remove(); drawRoom();
    if (started) start(); else reset();
  });
}
