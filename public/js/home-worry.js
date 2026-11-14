// The picture beside the home page headline: why this product exists.
// Three people in the audience, each with a question they never ask (too shy, out of time, the slide went by,
// no way to reach the speaker). The worries pile up; then, briefly, the answer: they ask from their phones.
// Plain DOM and CSS. Plays only while on screen, has a pause button, and is one still picture under "reduce motion".
import { el } from '/js/common.js';
import { octopusSvg } from '/js/octopus.js';

const box = document.getElementById('worry');
if (box) build();

function person(x, { shirt, hair, skin, style }) {
  // A head-and-shoulders figure facing us: shirt, neck, ears, face, hair, brows, eyes, and two mouths (worried / glad).
  const hairPath = {
    short: `M${x - 21} 62q-3 -30 21 -31t21 31q-6 -14 -21 -14t-21 14z`,
    long: `M${x - 23} 96q-6 -66 23 -66t23 66h-9v-34q-4 -12 -14 -12t-14 12v34z`,
    bun: `M${x - 21} 62q-3 -30 21 -31t21 31q-6 -14 -21 -14t-21 14zM${x - 8} 28a8 8 0 1 1 16 0a8 8 0 1 1 -16 0z`,
  }[style];
  return `<g class="who">
    <path d="M${x - 44} 150v-22q0 -24 44 -24t44 24v22z" fill="${shirt}"/>
    <path d="M${x - 9} 108l9 9l9 -9" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="${x - 8}" y="84" width="16" height="24" rx="7" fill="${skin}"/>
    <circle cx="${x - 21}" cy="68" r="5" fill="${skin}"/><circle cx="${x + 21}" cy="68" r="5" fill="${skin}"/>
    <ellipse cx="${x}" cy="66" rx="20" ry="24" fill="${skin}"/>
    <path d="${hairPath}" fill="${hair}"/>
    <path class="brow" d="M${x - 13} 60q5 -4 9 -1M${x + 4} 59q4 -3 9 1" fill="none" stroke="#1d1b2e" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${x - 8}" cy="67" r="2.4" fill="#1d1b2e"/><circle cx="${x + 8}" cy="67" r="2.4" fill="#1d1b2e"/>
    <path class="m-sad" d="M${x - 6} 80q6 -4 12 0" fill="none" stroke="#1d1b2e" stroke-width="2.2" stroke-linecap="round"/>
    <path class="m-glad" d="M${x - 7} 77q7 7 14 0" fill="none" stroke="#1d1b2e" stroke-width="2.2" stroke-linecap="round"/>
    <g class="phone"><rect x="${x + 20}" y="112" width="20" height="34" rx="5" fill="#1d1b2e"/><rect x="${x + 23}" y="116" width="14" height="24" rx="2.5" fill="#2f3ced"/><circle cx="${x + 30}" cy="128" r="3.4" fill="#ffc83d"/></g>
  </g>`;
}

function build() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WORRIES = [
    ['Is this a stupid question?', 'a'],
    ['Time’s up. My hand was still raised.', 'c'],
    ['That slide went by too fast…', 'b'],
    ['How do I reach the speaker afterwards?', 'a'],
  ];
  const bubbles = WORRIES.map(([text, who], i) => el('p', { class: `w-bubble to-${who} n${i}` }, el('span', {}, text), el('i', { class: 'tick', 'aria-hidden': 'true' })));
  const people = el('div', { class: 'w-people' });
  people.innerHTML = `<svg viewBox="0 0 360 150" aria-hidden="true">
    ${person(62, { shirt: '#6b6a7b', hair: '#1d1b2e', skin: '#e9c6a5', style: 'short' })}
    ${person(180, { shirt: '#2f3ced', hair: '#5a3825', skin: '#c9966f', style: 'long' })}
    ${person(298, { shirt: '#1d1b2e', hair: '#2b2a3a', skin: '#8f5d42', style: 'bun' })}
  </svg>`;
  const line = el('p', { class: 'w-line' });
  const pet = el('span', { class: 'w-pet' }); pet.innerHTML = octopusSvg({ size: 44 });
  const pause = el('button', { class: 'f-pause w-pause', type: 'button', 'aria-label': 'Pause the animation' });
  // Described once in hidden text; the moving picture is hidden from screen readers, the pause button is not.
  const say = box.getAttribute('aria-label'); box.removeAttribute('role'); box.removeAttribute('aria-label');
  const show = el('div', { 'aria-hidden': 'true' }, el('div', { class: 'w-bubbles' }, bubbles), people);
  line.setAttribute('aria-hidden', 'true');
  box.replaceChildren(el('p', { class: 'sr' }, say), show, el('div', { class: 'w-foot' }, pet, line, pause));
  box.classList.add('ready');

  const PROBLEM = 'Most questions never get asked.', FIX = 'Now they all do. From a phone, in seconds.';
  if (still) { bubbles.forEach((b) => b.classList.add('in')); line.textContent = PROBLEM + ' ' + FIX; pause.hidden = true; return; }

  let playing = true, visible = false, run = 0;
  const wait = (ms, token) => new Promise((ok, no) => {
    let left = ms, last = performance.now();
    const tick = (now) => { if (token !== run) return no(new Error('restart')); if (playing && visible) left -= now - last; last = now; if (left <= 0) ok(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  async function play(token) {
    for (;;) {
      box.classList.remove('solved', 'fade'); bubbles.forEach((b) => b.classList.remove('in', 'done'));
      line.textContent = PROBLEM;
      await wait(700, token);
      // The problem, one worry at a time: this is the part that gets the time.
      for (const b of bubbles) { b.classList.add('in'); await wait(2300, token); }
      await wait(1200, token);
      // The answer, briefly: phones out, every worry ticked.
      box.classList.add('solved'); line.textContent = FIX;
      for (const b of bubbles) { await wait(260, token); b.classList.add('done'); }
      await wait(3600, token);
      box.classList.add('fade'); await wait(450, token);
    }
  }
  pause.addEventListener('click', () => { playing = !playing; pause.classList.toggle('paused', !playing); box.classList.toggle('paused', !playing); pause.setAttribute('aria-label', playing ? 'Pause the animation' : 'Play the animation'); });
  let started = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !started) { started = true; run++; play(run).catch(() => {}); } }, { threshold: 0.3 }).observe(box);
}
