// Where each line of text sits on a slide, so an answer can point at the exact words on the slide picture.
// A line is { t: text, x, y, w, h }, all as fractions of the slide (0-1, from the top left).
// Kept on each unit as `boxes` when the file is read (PDF) or drawn (PowerPoint). Old talks simply have none.

const r4 = (v) => Math.round(v * 10000) / 10000;

// PDF: pdf.js gives every piece of text with its position; pieces on the same baseline are joined into lines.
export function pdfLines(items, viewport, Util) {
  const W = viewport.width, H = viewport.height, parts = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const m = Util.transform(viewport.transform, it.transform);
    const h = Math.hypot(m[2], m[3]);
    if (!h || Math.abs(m[1]) > 0.01 * h) continue; // rotated text: no box
    parts.push({ t: it.str, x: m[4], y: m[5] - h * 0.9, w: it.width * viewport.scale, h: h * 1.15 });
  }
  parts.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const p of parts) {
    const line = lines.find((l) => Math.abs(l.y + l.h / 2 - (p.y + p.h / 2)) < Math.min(l.h, p.h) * 0.45 && p.x - (l.x + l.w) < p.h * 3);
    if (!line) { lines.push({ ...p }); continue; }
    const x1 = Math.max(line.x + line.w, p.x + p.w), y1 = Math.max(line.y + line.h, p.y + p.h);
    line.t += (p.x > line.x + line.w + p.h * 0.1 ? ' ' : '') + p.t;
    line.x = Math.min(line.x, p.x); line.y = Math.min(line.y, p.y);
    line.w = x1 - line.x; line.h = y1 - line.y;
  }
  return lines.slice(0, 80).map((l) => ({ t: l.t.replace(/\s+/g, ' ').trim(), x: r4(l.x / W), y: r4(l.y / H), w: r4(l.w / W), h: r4(l.h / H) }));
}

// PowerPoint: our own drawing (lib/pptx-render.js) marks each laid-out line with its width (data-w, in slide units).
const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
export function svgLines(svg) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!vb) return [];
  const W = +vb[1], H = +vb[2], lines = [];
  // Plain splits, not patterns that search ahead, so a huge drawing can't make this slow.
  for (const piece of svg.split('<text ').slice(1, 400)) {
    const head = piece.slice(0, piece.indexOf('>'));
    const w = head.match(/data-w="([\d.]+)"/), x = head.match(/ ?x="(-?[\d.]+)"/), y = head.match(/ y="(-?[\d.]+)"/);
    if (!w || !x || !y) continue;
    const body = piece.slice(0, piece.indexOf('</text>'));
    const sizes = [...body.matchAll(/font-size="([\d.]+)"/g)].map((m) => +m[1]);
    const fs = sizes.length ? Math.max(...sizes) : 12;
    const t = unescape(body.replace(/<[^>]*>/g, '').replace(/^[^>]*>/, '')).replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const width = +w[1] / 12700; // slide units to points, as the drawing does
    lines.push({ t, x: r4(+x[1] / W), y: r4((+y[1] - fs * 0.95) / H), w: r4(width / W), h: r4((fs * 1.25) / H) });
  }
  return lines.slice(0, 80);
}

// Which lines hold the quoted words. Compared by words, so punctuation and bullets don't matter.
// Returns the indexes of a run of up to three neighbouring lines, or [] when nothing fits well enough.
export const wordsOf = (t) => (String(t).toLowerCase().match(/[\p{L}\p{N}%€$£.,]+/gu) || []).map((w) => w.replace(/[.,]+$/, '')).filter((w) => w.length > 1 || /\d/.test(w));
export function findLines(lines, quote) {
  const q = new Set(wordsOf(quote));
  if (!q.size) return [];
  const score = lines.map((l) => { const w = wordsOf(l); return w.length ? w.filter((x) => q.has(x)).length / w.length : 0; });
  const hits = score.map((sc, i) => [sc, i]).filter(([sc]) => sc >= 0.5);
  if (!hits.length) {
    const best = score.reduce((b, sc, i) => (sc > score[b] ? i : b), 0);
    return score[best] >= 0.3 ? [best] : [];
  }
  const top = hits.sort((a, b) => b[0] - a[0])[0][1];
  const run = [top];
  for (let i = top - 1; i >= 0 && score[i] >= 0.5 && run.length < 3; i--) run.unshift(i);
  for (let i = top + 1; i < lines.length && score[i] >= 0.5 && run.length < 3; i++) run.push(i);
  return run;
}
