// Turn uploaded files into labelled pieces of text ("Slide 4", "Page 2", ...)
// so answers can point back to where they came from.
import path from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { readPart } from './zip.js';
import { parseXml } from './pptx-render.js';

const clean = (s) => s.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

async function pdf(buffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, verbosity: 0 }).promise;
  const units = [];
  let kind = 'Page';
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    // A landscape PDF is almost always an exported slide deck.
    if (n === 1) { const v = page.getViewport({ scale: 1 }); if (v.width > v.height * 1.15) kind = 'Slide'; }
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) text += item.str + (item.hasEOL ? '\n' : ' ');
    text = clean(text);
    if (text) units.push({ label: `${kind} ${n}`, text, n });
  }
  await doc.loadingTask?.destroy?.();
  return units;
}

function slideText(xml) {
  // One line per paragraph, joining the text runs inside it. Plain splits rather than patterns that search ahead,
  // so a hostile file can't make this slow.
  return xml.split('</a:p>').slice(0, -1)
    .map((piece) => {
      const start = piece.search(/<a:p\b/);
      if (start < 0) return '';
      return piece.slice(start).split('</a:t>').slice(0, -1)
        .map((run) => { const t = run.indexOf('<a:t>'); return t < 0 ? '' : decode(run.slice(t + 5)); }).join('');
    })
    .filter((line) => line.trim())
    .join('\n');
}

async function pptx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  // Skip any part that unpacks to more than 20 MB: no real slide is that big.
  const read = (f) => readPart(zip, f);
  const num = (name) => +name.match(/(\d+)\.xml$/)[1];
  // Slides in the order they are presented, not the order the files happen to be numbered.
  let slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((x, y) => num(x) - num(y));
  const pres = await read('ppt/presentation.xml'), rels = await read('ppt/_rels/presentation.xml.rels');
  if (pres && rels) {
    const target = {};
    const all = (node, name, out = []) => { for (const k of node.kids) { if (k.name === name) out.push(k); all(k, name, out); } return out; };
    for (const r of all(parseXml(rels), 'Relationship')) {
      const rid = r.attrs.Id, t = r.attrs.Target;
      if (rid && t) target[rid] = 'ppt/' + t.replace(/^\/ppt\//, '').replace(/^\//, '');
    }
    const ordered = all(parseXml(pres), 'sldId').map((s) => target[s.attrs['r:id']]).filter((f) => f && zip.file(f));
    if (ordered.length) slides = ordered;
  }
  const units = [];
  for (const [i, file] of slides.entries()) {
    let text = slideText((await read(file)) || '');
    const rel = await read(file.replace('slides/', 'slides/_rels/') + '.rels');
    const notesFile = rel?.match(/Target="\.\.\/(notesSlides\/notesSlide\d+\.xml)"/)?.[1];
    if (notesFile && zip.file('ppt/' + notesFile)) {
      const noteText = slideText((await read('ppt/' + notesFile)) || '').replace(/^\d+$/gm, '').trim();
      if (noteText) text += `\n\nSpeaker notes: ${noteText}`;
    }
    text = clean(text);
    if (text) units.push({ label: `Slide ${i + 1}`, text, n: i + 1 });
  }
  return units;
}

function chunk(text, label = 'Part') {
  const paras = clean(text).split(/\n\s*\n/);
  const units = [];
  let cur = '';
  for (const p of paras) {
    if (cur && (cur + p).length > 1800) { units.push(cur); cur = ''; }
    cur += (cur ? '\n\n' : '') + p;
  }
  if (cur.trim()) units.push(cur);
  return units.map((t, i) => ({ label: `${label} ${i + 1}`, text: t }));
}

export const ACCEPTED = ['.pdf', '.pptx', '.docx', '.txt', '.md'];

// Guards against files built to exhaust the server: a deck with thousands of slides, or a small archive that
// unpacks into gigabytes. Real decks are nowhere near these limits.
const MAX_UNITS = 600, MAX_TEXT = 3_000_000;
function withinLimits(units) {
  const kept = units.slice(0, MAX_UNITS);
  let total = 0;
  for (const u of kept) { u.text = u.text.slice(0, Math.max(0, MAX_TEXT - total)); total += u.text.length; }
  return kept.filter((u) => u.text);
}

export async function parseFile(name, buffer) {
  return withinLimits(await readFile(name, buffer));
}

async function readFile(name, buffer) {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.pdf') return pdf(buffer);
  if (ext === '.pptx') return pptx(buffer);
  if (ext === '.docx') return chunk((await mammoth.extractRawText({ buffer })).value);
  if (ext === '.txt' || ext === '.md') return chunk(buffer.toString('utf8'));
  // Common slide formats we can't open directly, with the one-step way to get a file we can.
  if (ext === '.key') throw new Error("Can't read Keynote files directly. In Keynote: File → Export To → PowerPoint, then add that file.");
  if (ext === '.ppt') throw new Error("Can't read old .ppt files. Open it in PowerPoint and save it as .pptx.");
  if (ext === '.odp') throw new Error("Can't read .odp files directly. Export it as PowerPoint (.pptx) or PDF.");
  throw new Error(`Can't read ${ext || 'this'} files yet. Use PDF, PowerPoint, Word or text. From Google Slides: File → Download → PowerPoint.`);
}

// Two files can both have a "Slide 4". The later file's labels get a short tag from its name
// ("Slide 4 · appendix"), set once when the file is added so old answers keep pointing at the right slide.
export const labelOf = (src, unit) => (src.tag ? `${unit.label} · ${src.tag}` : unit.label);

export function tagSource(talk, src) {
  const taken = new Set(talk.sources.filter((s) => s !== src).flatMap((s) => s.units.map((u) => labelOf(s, u).toLowerCase())));
  if (!src.units.some((u) => taken.has(u.label.toLowerCase()))) return;
  // Pasted notes have no useful file name, so they are simply numbered: "Notes · 2".
  if (src.name === 'Your notes') {
    for (let i = 2; ; i++) if (!src.units.some((u) => taken.has(`${u.label} · ${i}`.toLowerCase()))) { src.tag = String(i); return; }
  }
  // Same name, different format (talk.pdf and talk.pptx): keep the extension so the two can be told apart.
  const stem = (n) => n.replace(/\.[^.]+$/, '').toLowerCase();
  const twin = talk.sources.some((s) => s !== src && stem(s.name) === stem(src.name));
  const base = (twin ? src.name : src.name.replace(/\.[^.]+$/, '')).replace(/[\[\]\n·]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24).trim() || 'file';
  for (let i = 1; ; i++) {
    const tag = i === 1 ? base : `${base} ${i}`;
    if (!src.units.some((u) => taken.has(`${u.label} · ${tag}`.toLowerCase()))) { src.tag = tag; return; }
  }
}

// Older talks were saved before tags existed; give later colliding files a tag the first time they're read.
export function tagAll(talk) {
  let changed = false;
  talk.sources.forEach((src, i) => {
    if (src.tag) return;
    const earlier = { sources: talk.sources.slice(0, i + 1) };
    tagSource(earlier, src);
    if (src.tag) changed = true;
  });
  return changed;
}
