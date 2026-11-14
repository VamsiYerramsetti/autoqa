// The Auto Q&A code and slides, drawn in the browser: the moving (GIF) code, and ready-made 1920x1080 slides
// that carry whichever code style the speaker picked. Used by the "Put your QR code on a slide" chooser (qrchooser.js).
// The still code styles themselves are drawn on the server (lib/qr.js) and fetched as SVG.
import { Gif } from '/js/gif.js';
import { octopusSvg } from '/js/octopus.js';

const C = { paper: '#fbfbf8', ink: '#1d1b2e', cobalt: '#2f3ced', yellow: '#ffc83d', muted: '#6b6a7b', line: '#e2e1ea' };
const D = "'Bricolage Grotesque', 'Avenir Next', system-ui, sans-serif";
const B = "'Instrument Sans', 'Helvetica Neue', system-ui, sans-serif";

// Code styles in the order the chooser shows them. `framed` styles bring their own frame and words,
// so a slide shows them as they are instead of on a white card.
export const CODE_STYLES = [
  { id: 'autoqa', name: 'Auto Q&A', note: 'Cobalt dots' },
  { id: 'octopus', name: 'Octopus', note: 'Holding on to your code', framed: true },
  { id: 'ink', name: 'Ink', note: 'Most contrast' },
  { id: 'frame', name: 'Ask frame', note: '"Scan to ask"', framed: true },
  { id: 'card', name: 'Cobalt card', note: '"Ask me anything"', framed: true },
  { id: 'room', name: 'Room', note: 'A crowd of dots' },
  { id: 'animated', name: 'Animated', note: 'GIF, gently moving', framed: true, gif: true },
];

export const SLIDES = [
  { id: 'cobalt', name: 'Cobalt', note: 'To open Q&A' },
  { id: 'light', name: 'Light', note: 'For light decks' },
  { id: 'closing', name: 'Closing', note: 'Your last slide' },
  { id: 'corner', name: 'Corner card', note: 'Transparent, for any slide' },
];

const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
export const fontsReady = () => Promise.all([
  document.fonts.load(`800 80px ${D}`), document.fonts.load(`600 40px ${D}`), document.fonts.load(`700 40px ${D}`),
  document.fonts.load(`500 40px ${B}`)]).catch(() => {});

/* ---------- the moving code ---------- */

// The animated code is the "Ask frame" look drawn on canvas from the code's modules (/api/talks/:id/qr.json).
// What moves never changes which modules are dark or light, so every frame scans:
//   - a soft wave of colour runs across the dots, cobalt to ink and back (both stay dark on white);
//   - the Q+A mark bobs a little inside its own white disc;
//   - a yellow cursor blinks after "Scan to ask".
export const GIF_SIZE = 720, GIF_FRAMES = 16, GIF_DELAY = 125; // 2 s loop

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
// The 16 colours of the GIF: our colours plus the in-between shades that smooth the edges of dots and letters.
const PALETTE = ['#ffffff', C.ink, C.cobalt, mix(C.cobalt, C.ink, 1 / 3), mix(C.cobalt, C.ink, 2 / 3), C.yellow,
  mix('#ffffff', C.cobalt, 0.5), mix('#ffffff', C.ink, 0.5), mix('#ffffff', C.cobalt, 0.25), mix('#ffffff', C.ink, 0.25),
  mix('#ffffff', C.cobalt, 0.75), mix(C.cobalt, C.yellow, 0.5), mix('#ffffff', C.yellow, 0.5), mix('#ffffff', C.ink, 0.75),
  mix(C.cobalt, '#ffffff', 0.12), mix(C.ink, C.cobalt, 0.5)]
  .map((c) => (c.startsWith('#') ? hex(c) : c.match(/\d+/g).map(Number)));

// The octopus mark, drawn from the same picture as the logo. Loaded once; it is there long before a GIF is made.
const OCTO = new Image();
OCTO.src = 'data:image/svg+xml,' + encodeURIComponent(octopusSvg({ size: 256 }));
// Centred at cx,cy, sized to a white disc of radius r (same proportions as lib/qr.js).
function logo(g, cx, cy, r) {
  const size = r * 1.72;
  if (OCTO.complete && OCTO.naturalWidth) g.drawImage(OCTO, cx - size / 2, cy - size / 2 + r * 0.04, size, size);
}

// Draws the code (quiet margin included) in the Auto Q&A look at x,y, `side` px wide, at moment t (0..1).
function drawCode(g, q, x, y, side, t, wave = true) {
  const n = q.size, m = side / (n + q.quiet * 2), o = q.quiet;
  const dark = (r, c) => q.modules[r * n + c] === '1';
  const inFinder = (r, c) => q.finders.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
  const inAlign = (r, c) => q.alignments.some(([ar, ac]) => Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2);
  const inHole = (r, c) => q.mark && Math.hypot(r + 0.5 - q.mark.cy, c + 0.5 - q.mark.cx) < q.mark.r + 0.6;
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x, y, side, side, m * 3.6); g.fill();
  const px = (c) => x + (c + o) * m, py = (r) => y + (r + o) * m;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!dark(r, c) || inFinder(r, c) || inAlign(r, c) || inHole(r, c)) continue;
    // The wave: a diagonal band that crosses the code once per loop and darkens cobalt toward ink.
    const phase = (r + c) / (2 * n) - t, w = wave ? Math.max(0, Math.cos(2 * Math.PI * phase)) ** 6 : 0;
    g.fillStyle = mix(C.cobalt, C.ink, w);
    g.beginPath(); g.arc(px(c) + m / 2, py(r) + m / 2, m * 0.46, 0, 7); g.fill();
  }
  g.lineWidth = m;
  for (const [r, c] of q.finders) {
    g.strokeStyle = C.ink; g.beginPath(); g.roundRect(px(c) + m / 2, py(r) + m / 2, 6 * m, 6 * m, 1.9 * m); g.stroke();
    g.fillStyle = C.cobalt; g.beginPath(); g.roundRect(px(c) + 2 * m, py(r) + 2 * m, 3 * m, 3 * m, 1.1 * m); g.fill();
  }
  for (const [r, c] of q.alignments) {
    g.strokeStyle = C.ink; g.beginPath(); g.roundRect(px(c) - 1.5 * m, py(r) - 1.5 * m, 4 * m, 4 * m, 1.2 * m); g.stroke();
    g.fillStyle = C.ink; g.beginPath(); g.arc(px(c) + m / 2, py(r) + m / 2, 0.55 * m, 0, 7); g.fill();
  }
  if (q.mark) {
    const cx = px(q.mark.cx - 0), cy = py(q.mark.cy), r = q.mark.r * m;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    // The bob stays inside the white disc: the mark reaches 0.77 of the disc, it moves at most 0.07 more.
    logo(g, cx, cy + Math.sin(2 * Math.PI * t) * r * 0.07, r);
  }
}

// One frame of the moving code on a size×size canvas: the code in a cobalt speech bubble that says "Scan to ask".
// `still` draws it for a slide: no wave, and no white square around the bubble.
export function drawAnimatedFrame(g, q, size, t, { still = false } = {}) {
  const k = size / 720, line = 10 * k, band = 108 * k, tail = 26 * k, pad = 24 * k;
  const side = size - 2 * pad - line - band - tail, w = side + 2 * line, x = (size - w) / 2, y = pad;
  if (still) g.clearRect(0, 0, size, size); else { g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); }
  // The bubble: a cobalt outline around the code, a cobalt band with the words, and a small tail.
  g.fillStyle = C.cobalt; g.beginPath(); g.roundRect(x, y, w, side + line + band, 40 * k); g.fill();
  g.beginPath(); g.moveTo(x + w * 0.24, y + side + line + band - 1); g.lineTo(x + w * 0.24 - tail * 1.3, y + side + line + band + tail);
  g.lineTo(x + w * 0.24 + tail * 1.6, y + side + line + band - 1); g.fill();
  drawCode(g, q, x + line, y + line, side, t, !still);
  g.font = `700 ${50 * k}px ${D}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  const words = 'Scan to ask', tw = g.measureText(words).width, cursor = 6 * k, gap = 8 * k;
  const tx = x + (w - tw - gap - cursor) / 2, ty = y + side + line + band / 2;
  g.fillStyle = '#fff'; g.fillText(words, tx, ty);
  // The cursor blinks: on for the first half of the loop.
  if (!still && t < 0.5) { g.fillStyle = C.yellow; g.fillRect(tx + tw + gap, ty - 24 * k, cursor, 46 * k); }
  g.textBaseline = 'alphabetic';
}

export async function animatedGif(q, size = GIF_SIZE) {
  await fontsReady();
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  const gif = new Gif(size, size, PALETTE);
  for (let i = 0; i < GIF_FRAMES; i++) {
    drawAnimatedFrame(g, q, size, i / GIF_FRAMES);
    gif.frame(g.getImageData(0, 0, size, size).data, GIF_DELAY);
    await new Promise((r) => setTimeout(r)); // let the page breathe between frames
  }
  return gif.blob();
}

/* ---------- slides ---------- */

const W = 1920, H = 1080;

// What a slide needs: the talk's words, the logo and the code in the chosen style (an image or a canvas).
export async function slideAssets(talk, style, q) {
  await fontsReady();
  const code = style === 'animated' ? (() => {
    const c = document.createElement('canvas'); c.width = c.height = 1080;
    drawAnimatedFrame(c.getContext('2d'), q, 1080, 0, { still: true }); return c;
  })() : await load(`/api/talks/${talk.id}/qr.svg?style=${style}`);
  const u = new URL(talk.joinUrl);
  return { code, framed: CODE_STYLES.find((s) => s.id === style)?.framed, logo: await load('/logo.svg'),
    host: u.host, code_: talk.code, title: talk.title, speaker: talk.speaker?.name || '' };
}

function lines(g, text, max) {
  const out = []; let cur = '';
  for (const w of String(text).split(/\s+/)) {
    const t = cur ? cur + ' ' + w : w;
    if (g.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
// Wrapped text; returns the y below it. Cut with "…" past maxLines.
function para(g, text, x, y, max, lh, maxLines = 4) {
  let l = lines(g, text, max);
  if (l.length > maxLines) { l = l.slice(0, maxLines); l[maxLines - 1] = l[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
  l.forEach((s, i) => g.fillText(s, x, y + i * lh));
  return y + l.length * lh;
}
function round(g, x, y, w, h, r, fill) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); }
// The code in a box of size×size: plain codes on a white card, framed ones as they are (kept in proportion).
function codeBox(g, a, x, y, size) {
  const iw = a.code.naturalWidth || a.code.width, ih = a.code.naturalHeight || a.code.height;
  if (!a.framed) { round(g, x, y, size, size, 44, '#fff'); g.drawImage(a.code, x + 30, y + 30, size - 60, size - 60); return; }
  const k = Math.min(size / iw, size / ih), w = iw * k, h = ih * k;
  g.drawImage(a.code, x + (size - w) / 2, y + (size - h) / 2, w, h);
}
// "host/j/CODE" with the code picked out. The head is measured in its own font before switching to the bold one.
function address(g, a, x, y, size, color, codeColor) {
  g.font = `600 ${size}px ${D}`; g.fillStyle = color;
  const head = a.host + '/j/', after = x + g.measureText(head).width;
  g.fillText(head, x, y);
  g.fillStyle = codeColor; g.font = `800 ${size}px ${D}`; g.fillText(a.code_, after, y);
}
function brand(g, a, x, y, color) {
  g.drawImage(a.logo, x, y - 36, 46, 46);
  g.font = `700 34px ${D}`; g.fillStyle = color; g.fillText('Auto Q&A', x + 60, y);
}
function footer(g, a, color) {
  g.font = `500 30px ${B}`; g.fillStyle = color;
  para(g, [a.title, a.speaker].filter(Boolean).join('  ·  '), 120, H - 80, 1000, 36, 1);
}

// Each design says plainly what to do, what happens next, and gives the address for anyone without a camera.
// The code is at least 40% of the slide's height, so it scans from the back of a room (about 10× its width away).
const DRAW = {
  cobalt(g, a) {
    g.fillStyle = C.cobalt; g.fillRect(0, 0, W, H);
    codeBox(g, a, 1170, 170, 640);
    g.fillStyle = '#fff'; g.font = `800 120px ${D}`;
    let y = para(g, 'Got a question? Ask it here.', 120, 270, 960, 124, 3);
    g.font = `500 40px ${B}`; g.fillStyle = 'rgba(255,255,255,.9)';
    y = para(g, 'Scan with your phone camera. No app, no sign-up.', 120, y + 40, 940, 54);
    y = para(g, "My slides answer straight away. Anything else comes to me, and I'll reply.", 120, y + 14, 940, 54);
    address(g, a, 120, Math.max(y + 80, 880), 46, '#fff', C.yellow);
    footer(g, a, 'rgba(255,255,255,.75)');
  },
  light(g, a) {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    codeBox(g, a, 120, 170, 640);
    if (!a.framed) { g.lineWidth = 3; g.strokeStyle = C.line; g.beginPath(); g.roundRect(120, 170, 640, 640, 44); g.stroke(); }
    g.fillStyle = C.ink; g.font = `800 112px ${D}`;
    let y = para(g, 'Got a question? Ask it here.', 880, 270, 920, 116, 3);
    g.font = `500 40px ${B}`; g.fillStyle = '#3b3950';
    y = para(g, 'Scan with your phone camera. No app, no sign-up.', 880, y + 40, 920, 54);
    y = para(g, "My slides answer straight away. Anything else comes to me, and I'll reply.", 880, y + 14, 920, 54);
    address(g, a, 880, Math.max(y + 80, 880), 44, C.ink, C.cobalt);
    brand(g, a, 120, H - 80, C.ink);
    g.font = `500 30px ${B}`; g.fillStyle = C.muted;
    para(g, [a.title, a.speaker].filter(Boolean).join('  ·  '), 880, H - 80, 920, 36, 1);
  },
  closing(g, a) {
    g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    codeBox(g, a, 1210, 200, 600);
    g.fillStyle = '#fff'; g.font = `800 170px ${D}`; g.fillText('Thank you.', 120, 350);
    g.font = `700 68px ${D}`; g.fillStyle = C.yellow;
    let y = para(g, 'Still have a question?', 120, 490, 1000, 76);
    g.font = `500 42px ${B}`; g.fillStyle = 'rgba(255,255,255,.88)';
    y = para(g, 'Scan with your phone camera and ask. My slides answer straight away; anything else comes to me, and I\'ll reply.', 120, y + 24, 980, 56);
    address(g, a, 120, Math.max(y + 80, 900), 46, '#fff', C.yellow);
    footer(g, a, 'rgba(255,255,255,.65)');
  },
  // A transparent slide with one white card in the bottom right corner: paste it over any slide.
  corner(g, a) {
    g.clearRect(0, 0, W, H);
    const w = 600, h = 760, x = W - w - 56, y = H - h - 56;
    g.save(); g.shadowColor = 'rgba(29,27,46,.25)'; g.shadowBlur = 40; g.shadowOffsetY = 12;
    round(g, x, y, w, h, 40, '#fff'); g.restore();
    if (a.framed) codeBox(g, a, x + 40, y + 34, w - 80);
    else g.drawImage(a.code, x + 40, y + 34, w - 80, w - 80);
    g.textAlign = 'center';
    g.fillStyle = C.ink; g.font = `800 50px ${D}`; g.fillText('Questions? Scan to ask.', x + w / 2, y + w + 26, w - 50);
    g.font = `500 28px ${B}`; g.fillStyle = C.muted; g.fillText('No app. My slides answer, or I will.', x + w / 2, y + w + 74, w - 50);
    g.textAlign = 'left';
    const head = a.host + '/j/'; g.font = `600 30px ${D}`; const hw = g.measureText(head).width;
    g.font = `800 30px ${D}`; const cw = g.measureText(a.code_).width;
    address(g, a, x + (w - hw - cw) / 2, y + w + 124, 30, C.ink, C.cobalt);
  },
};

export function drawSlide(canvas, design, a) {
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.textBaseline = 'alphabetic';
  DRAW[design](g, a);
  return canvas;
}
