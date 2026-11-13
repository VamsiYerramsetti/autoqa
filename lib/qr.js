// The Auto Q&A code: a QR code drawn in our own look, so people recognise it on a slide.
// Round dots instead of squares (our "room of dots"), rounded corner markers in ink with a cobalt centre,
// and the two-dot mark in the middle. It still scans like any QR code: highest error correction (the mark
// covers less than a tenth of what the code can lose), dark on white, and the standard quiet margin.
import QRCode from 'qrcode';
import alignment from 'qrcode/lib/core/alignment-pattern.js';

const INK = '#1d1b2e', COBALT = '#2f3ced', YELLOW = '#ffc83d';

export function brandedQr(text, { label = true } = {}) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size, dark = (r, c) => qr.modules.get(r, c);
  const quiet = 4, size = n + quiet * 2;
  // The three corner markers are 7×7; they are drawn as shapes, not dots.
  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  // Room for the mark in the middle: a circle about a fifth of the code wide.
  // The smaller corner-like squares (alignment patterns) help phones read a tilted code: drawn whole, never as dots.
  const aligns = alignment.getPositions(qr.version);
  const inAlign = (r, c) => aligns.some(([ar, ac]) => Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2);
  const mid = n / 2, hole = Math.max(3.2, n * 0.1);
  // Bigger codes have an alignment square in the very middle: then the mark is left out rather than covering it.
  const withMark = !aligns.some(([ar, ac]) => Math.hypot(ar + 0.5 - mid, ac + 0.5 - mid) < hole + 3.5);
  const inHole = (r, c) => withMark && Math.hypot(r + 0.5 - mid, c + 0.5 - mid) < hole + 0.6;
  const dots = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!dark(r, c) || inFinder(r, c) || inAlign(r, c) || inHole(r, c)) continue;
    dots.push(`M${c + quiet + 0.5} ${r + quiet + 0.5}m-.46 0a.46 .46 0 1 0 .92 0a.46 .46 0 1 0-.92 0`);
  }
  const finder = (r, c) => {
    const x = c + quiet, y = r + quiet;
    return `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="${INK}" stroke-width="1"/>`
      + `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="1.1" fill="${COBALT}"/>`;
  };
  const align = ([r, c]) => `<rect x="${c - 2 + quiet + 0.5}" y="${r - 2 + quiet + 0.5}" width="4" height="4" rx="1.2" fill="none" stroke="${INK}" stroke-width="1"/><circle cx="${c + quiet + 0.5}" cy="${r + quiet + 0.5}" r=".55" fill="${INK}"/>`;
  const cx = mid + quiet, cy = mid + quiet, d = hole * 0.72;
  const mark = !withMark ? '' : `<circle cx="${cx}" cy="${cy}" r="${hole}" fill="#fff"/>`
    + `<circle cx="${cx - d * 0.42}" cy="${cy}" r="${d * 0.62}" fill="${YELLOW}"/>`
    + `<circle cx="${cx + d * 0.42}" cy="${cy}" r="${d * 0.62}" fill="${COBALT}"/>`;
  const body = `<rect width="${size}" height="${size}" rx="${quiet * 0.9}" fill="#fff"/>`
    + `<path d="${dots.join('')}" fill="${COBALT}"/>`
    + finder(0, 0) + finder(0, n - 7) + finder(n - 7, 0) + aligns.map(align).join('') + mark;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 10}" height="${size * 10}"${label ? ' role="img" aria-label="Auto Q&amp;A code: scan to ask a question"' : ''}>${body}</svg>`;
}
