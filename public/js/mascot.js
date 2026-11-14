// The octopus in the logo comes to life on the public pages: it blinks, then swims out of the logo, takes a short
// tour of the empty margins of the screen (never over the words), and swims home. A tap on it sends it home.
// Decorative only: hidden from screen readers, and it stays still under "reduce motion".
import { octopusSvg } from '/js/octopus.js';

const home = document.querySelector('.top .mark img');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (home && !still) start();

function start() {
  const pet = document.createElement('div');
  pet.className = 'mascot';
  pet.setAttribute('aria-hidden', 'true');
  pet.innerHTML = octopusSvg({ size: 64, parts: true });
  document.body.append(pet);
  // While the logo octopus is out swimming, its place in the header stays, just empty.
  const homeBox = () => home.getBoundingClientRect();
  let out = false, busy = false;

  const place = (x, y, s) => { pet.style.transform = `translate(${x}px, ${y}px) scale(${s})`; };
  const atHome = () => { const r = homeBox(); return { x: r.left + r.width / 2 - 32, y: r.top + r.height / 2 - 32, s: r.width / 64 }; };

  function blink(times = 1) {
    for (const el of [pet, home.parentElement]) {
      el.classList.remove('blink'); void el.offsetWidth; el.classList.add('blink');
    }
    if (times > 1) setTimeout(() => blink(times - 1), 380);
  }
  // Where it may go: only the empty margin to the left of the page column, so it never swims over the words.
  // On a narrow screen there is no margin: it shrinks and keeps to the very edge.
  function lane() {
    const wrap = document.querySelector('.wrap, .legal, .why, main') || document.body;
    const left = wrap.getBoundingClientRect().left + parseFloat(getComputedStyle(wrap).paddingLeft || 0);
    const s = left >= 76 ? 0.9 : left >= 48 ? 0.6 : 0.42;
    return { x: Math.max(2, (left - 64 * s) / 2), s };
  }
  // One leg of the swim: a gentle S-curve, about 280 px a second, tentacles pulsing.
  function swim(from, to) {
    const d = Math.hypot(to.x - from.x, to.y - from.y), ms = Math.max(900, d * 3.6);
    const mid = { x: (from.x + to.x) / 2 + (to.y - from.y) * 0.15, y: (from.y + to.y) / 2 - (to.x - from.x) * 0.15 };
    const t = (p) => `translate(${p.x}px, ${p.y}px) scale(${p.s})`;
    pet.classList.add('swimming');
    const a = pet.animate([{ transform: t(from) }, { transform: t({ ...mid, s: (from.s + to.s) / 2 }) }, { transform: t(to) }],
      { duration: ms, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
    return a.finished.then(() => { place(to.x, to.y, to.s); pet.classList.remove('swimming'); a.cancel(); });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function tour() {
    if (busy || document.hidden) return;
    const h = atHome();
    // Only leave when the logo is on screen, so it is always seen going out and coming back.
    if (h.y < -40 || h.y > innerHeight) return;
    busy = true;
    blink(2); await wait(900);
    place(h.x, h.y, h.s); pet.classList.add('out'); home.style.visibility = 'hidden'; out = true;
    // Down the lane beside the page, a couple of stops with a blink, then back up the same lane and home.
    const { x, s } = lane(), H = innerHeight;
    const stops = [{ x, y: h.y + 90, s }, { x, y: H * (0.35 + Math.random() * 0.2), s }, { x, y: H * (0.62 + Math.random() * 0.2), s }, { x, y: h.y + 90, s }];
    let at = h;
    for (const [k, to] of stops.entries()) {
      await swim(at, to); at = to;
      if (!out) break;
      if (k === 1 || k === 2) { blink(); await wait(1500); }
    }
    if (out) await swim(at, atHome());
    pet.classList.remove('out'); home.style.visibility = ''; out = false; busy = false;
  }
  // A tap brings it straight home.
  pet.addEventListener('click', async () => {
    if (!out) return;
    out = false; pet.getAnimations().forEach((a) => a.cancel());
    const m = new DOMMatrix(getComputedStyle(pet).transform);
    await swim({ x: m.e, y: m.f, s: m.a }, atHome());
  });
  // First swim a few seconds after the page opens; then now and then, with blinks in between.
  setTimeout(tour, 3500);
  setInterval(() => { if (!busy) (Math.random() < 0.35 ? tour() : blink()); }, 14000);
}
