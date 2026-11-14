// The Auto Q&A code: a QR code drawn in our own look, so people recognise it on a slide.
// Several styles, all built on the same rules so every one of them scans like a plain QR code:
//   - highest error correction (H), so the Q+A mark in the middle covers less than a tenth of what the code can lose;
//   - dark modules on a light ground, never inverted (many phone readers cannot read light-on-dark);
//   - at least 4 modules of white quiet margin around the code, even inside a frame or a card;
//   - the corner markers and the small alignment squares are drawn whole, never covered by the mark.
// `brandedQr` (the "autoqa" style) stays the default everywhere.
import QRCode from 'qrcode';
import alignment from 'qrcode/lib/core/alignment-pattern.js';
import { octopusSvg } from '../public/js/octopus.js';

const INK = '#1d1b2e', COBALT = '#2f3ced', YELLOW = '#ffc83d';
const QUIET = 4;
const FONT = "'Bricolage Grotesque', 'Avenir Next', 'Helvetica Neue', Arial, sans-serif";

// The styles a speaker can pick, in the order the chooser shows them.
export const QR_STYLES = ['autoqa', 'octopus', 'ink', 'frame', 'card', 'room'];

// The code as plain data: which modules are dark, where the corner and alignment squares are, and the hole
// left in the middle for the mark. Shared by the SVG styles here and the animated code drawn in the browser.
export function qrMatrix(text) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size, dark = (r, c) => Boolean(qr.modules.get(r, c));
  const finders = [[0, 0], [0, n - 7], [n - 7, 0]];
  const inFinder = (r, c) => finders.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
  // The smaller corner-like squares (alignment patterns) help phones read a tilted code: drawn whole, never as dots.
  const aligns = alignment.getPositions(qr.version);
  const inAlign = (r, c) => aligns.some(([ar, ac]) => Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2);
  // Room for the mark in the middle: a circle about a fifth of the code wide.
  const mid = n / 2, hole = Math.max(3.6, n * 0.125);
  // Bigger codes have an alignment square in the very middle: then the mark is left out rather than covering it.
  const withMark = !aligns.some(([ar, ac]) => Math.hypot(ar + 0.5 - mid, ac + 0.5 - mid) < hole + 3.5);
  const inHole = (r, c) => withMark && Math.hypot(r + 0.5 - mid, c + 0.5 - mid) < hole + 0.6;
  let modules = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) modules += dark(r, c) ? '1' : '0';
  return { size: n, quiet: QUIET, version: qr.version, errorCorrection: 'H', modules, finders, alignments: aligns,
    mark: withMark ? { cx: mid, cy: mid, r: hole } : null, dark, inFinder, inAlign, inHole };
}

// The octopus with its Q and A glasses (public/js/octopus.js) on a white disc in the middle of the code.
const OCTO = octopusSvg().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const octopus = (x, y, size) => `<svg x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${size.toFixed(3)}" height="${size.toFixed(3)}" viewBox="0 0 64 64">${OCTO}</svg>`;
function mark(m, cx, cy) {
  if (!m.mark) return '';
  const hole = m.mark.r, size = hole * 1.72;
  return `<circle cx="${cx}" cy="${cy}" r="${hole}" fill="#fff"/>` + octopus(cx - size / 2, cy - size / 2 + hole * 0.04, size);
}

// A small deterministic "random" number per module, so the Room style looks the same every time.
const jitter = (r, c) => { const x = Math.sin(r * 127.1 + c * 311.7) * 43758.5453; return x - Math.floor(x); };

// How each style draws one data module, a corner marker and an alignment square.
const LOOKS = {
  // Round cobalt dots (our "room of dots"), rounded ink corner markers with a cobalt centre.
  autoqa: {
    dot: (x, y) => `M${x + 0.5} ${y + 0.5}m-.46 0a.46 .46 0 1 0 .92 0a.46 .46 0 1 0-.92 0`, dotFill: COBALT,
    finder: (x, y) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="${INK}" stroke-width="1"/>`
      + `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="1.1" fill="${COBALT}"/>`,
    align: (x, y) => `<rect x="${x - 1.5}" y="${y - 1.5}" width="4" height="4" rx="1.2" fill="none" stroke="${INK}" stroke-width="1"/><circle cx="${x + 0.5}" cy="${y + 0.5}" r=".55" fill="${INK}"/>`,
  },
  // Classic square modules in ink: the most contrast, for dim projectors and far rows.
  ink: {
    dot: (x, y) => `M${x} ${y}h1v1h-1z`, dotFill: INK,
    finder: (x, y) => `<path d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z" fill="${INK}" fill-rule="evenodd"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${INK}"/>`,
    align: (x, y) => `<path d="M${x - 2} ${y - 2}h5v5h-5zM${x - 1} ${y - 1}v3h3v-3z" fill="${INK}" fill-rule="evenodd"/><rect x="${x}" y="${y}" width="1" height="1" fill="${INK}"/>`,
  },
  // A crowd: dots of slightly different sizes, most cobalt, some ink. Never smaller than 3/4 of a module.
  room: {
    dot: (x, y, r, c) => { const d = 0.38 + jitter(r, c) * 0.11; return `M${x + 0.5} ${y + 0.5}m-${d} 0a${d} ${d} 0 1 0 ${2 * d} 0a${d} ${d} 0 1 0-${2 * d} 0`; },
    dotFill: COBALT, inkShare: 0.28,
    finder: (x, y) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="3" fill="none" stroke="${INK}" stroke-width="1"/>`
      + `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.6" fill="${COBALT}"/>`,
    align: (x, y) => `<rect x="${x - 1.5}" y="${y - 1.5}" width="4" height="4" rx="2" fill="none" stroke="${INK}" stroke-width="1"/><circle cx="${x + 0.5}" cy="${y + 0.5}" r=".55" fill="${INK}"/>`,
  },
};

// The code itself (quiet margin included) as SVG shapes, `look` picking how modules are drawn.
// The top-left of the quiet margin is at 0,0; the white square behind it is (n + 8) modules wide.
function codeShapes(m, look, { ground = true, corner = QUIET * 0.9 } = {}) {
  const L = LOOKS[look], n = m.size, plain = [], inky = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!m.dark(r, c) || m.inFinder(r, c) || m.inAlign(r, c) || m.inHole(r, c)) continue;
    (L.inkShare && jitter(c, r) < L.inkShare ? inky : plain).push(L.dot(c + QUIET, r + QUIET, r, c));
  }
  const side = n + QUIET * 2, mid = n / 2 + QUIET;
  return (ground ? `<rect width="${side}" height="${side}" rx="${corner}" fill="#fff"/>` : '')
    + `<path d="${plain.join('')}" fill="${L.dotFill}"/>` + (inky.length ? `<path d="${inky.join('')}" fill="${INK}"/>` : '')
    + m.finders.map(([r, c]) => L.finder(c + QUIET, r + QUIET)).join('')
    + m.alignments.map(([r, c]) => L.align(c + QUIET, r + QUIET)).join('')
    + mark(m, mid, mid);
}

const svg = (w, h, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w * 10)}" height="${Math.round(h * 10)}"${label ? ` role="img" aria-label="${label}"` : ''}>${body}</svg>`;
const LABEL = 'Auto Q&amp;A code: scan to ask a question';

// Each style: the code plus whatever frames it. Sizes are in modules.
const STYLES = {
  autoqa: (m, label) => { const s = m.size + QUIET * 2; return svg(s, s, codeShapes(m, 'autoqa'), label && LABEL); },
  ink: (m, label) => { const s = m.size + QUIET * 2; return svg(s, s, codeShapes(m, 'ink', { corner: 0 }), label && LABEL); },
  room: (m, label) => { const s = m.size + QUIET * 2; return svg(s, s, codeShapes(m, 'room'), label && LABEL); },
  // "Octopus": the mascot sits on the top-left corner and holds on to the code, one arm along the top edge and
  // one down the left edge, like half a frame. Nothing of it reaches further than half the quiet margin.
  octopus: (m, label) => {
    const s = m.size + QUIET * 2, o = 9.5, w = o + s + 1.6, edge = o - 1.2;
    // An arm: a gently waving line from the octopus to the far end of an edge, with a curl at its tip.
    const arm = (along) => {
      const p = (t, d) => (along === 'x' ? `${t.toFixed(2)} ${(edge + d).toFixed(2)}` : `${(edge + d).toFixed(2)} ${t.toFixed(2)}`);
      const end = o + s - 2.2, start = 12, step = (end - start) / 6;
      let d = `M${p(start, 0)}`;
      for (let i = 0; i < 6; i++) d += `Q${p(start + step * (i + 0.5), i % 2 ? 0.75 : -0.75)} ${p(start + step * (i + 1), 0)}`;
      d += `q${along === 'x' ? '1.6 -0.2 1.5 -1.6 q-0.2 -1.2 -1.3 -0.6' : '-0.2 1.6 -1.6 1.5 q-1.2 -0.2 -0.6 -1.3'}`;
      return `<path d="${d}" fill="none" stroke="${COBALT}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`;
    };
    const body = arm('x') + arm('y')
      + `<g transform="translate(${o} ${o})">${codeShapes(m, 'autoqa', { corner: 3.2 })}</g>`
      + octopus(-0.4, -0.8, 15);
    return svg(w, w, body, label && LABEL);
  },
  // "Ask frame": the code in a cobalt speech bubble whose bottom band says "Scan to ask".
  frame: (m, label) => {
    const s = m.size + QUIET * 2, line = 1.4, band = 7.5, tail = 3, w = s + line * 2, h = s + line + band;
    const text = Math.min(4, s * 0.115);
    const body = `<rect x="${line / 2}" y="${line / 2}" width="${w - line}" height="${h - line / 2}" rx="5" fill="#fff" stroke="${COBALT}" stroke-width="${line}"/>`
      + `<path d="M0 ${s + line}h${w}v${band - 5}a5 5 0 0 1-5 5H${s * 0.32}l-${tail * 1.3} ${tail}v-${tail}H5a5 5 0 0 1-5-5z" fill="${COBALT}"/>`
      + `<g transform="translate(${line} ${line})">${codeShapes(m, 'autoqa', { corner: 3.6 })}</g>`
      + `<text x="${w / 2}" y="${s + line + band / 2 + text * 0.36}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${text}" fill="#fff">Scan to ask<tspan fill="${YELLOW}">.</tspan></text>`;
    return svg(w, h + tail, body, label && LABEL);
  },
  // "Cobalt card": the code on a white square inside a cobalt card that says "Ask me anything".
  card: (m, label) => {
    const s = m.size + QUIET * 2, pad = 3, foot = 9, w = s + pad * 2, h = s + pad + foot;
    const text = Math.min(4.4, s * 0.12);
    const body = `<rect width="${w}" height="${h}" rx="5.5" fill="${COBALT}"/>`
      + `<g transform="translate(${pad} ${pad})">${codeShapes(m, 'autoqa', { corner: 3 })}</g>`
      + `<text x="${w / 2}" y="${s + pad + foot / 2 + text * 0.36}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${text}" fill="#fff">Ask me anything<tspan fill="${YELLOW}">.</tspan></text>`;
    return svg(w, h, body, label && LABEL);
  },
};

export function qrSvg(text, style = 'autoqa', { label = true } = {}) {
  return (STYLES[style] || STYLES.autoqa)(qrMatrix(text), label);
}

export function brandedQr(text, { label = true } = {}) {
  return qrSvg(text, 'autoqa', { label });
}

// The public shape of the code for the browser (the animated code is drawn there).
export function qrJson(text) {
  const { size, quiet, version, errorCorrection, modules, finders, alignments, mark: m } = qrMatrix(text);
  return { size, quiet, version, errorCorrection, modules, finders, alignments, mark: m };
}
