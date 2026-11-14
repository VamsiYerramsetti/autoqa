// Draws each PowerPoint slide as a picture (SVG), so answers can show the real slide and not just its words.
// Google Slides and Keynote decks work too once exported as .pptx. Plain JavaScript, no outside programs:
// it reads the slide's shapes, pictures, colours and text and places them where PowerPoint would.
// It is a close likeness, not a pixel copy: fonts fall back to the viewer's own, charts show as a frame.
// The speaker's browser turns each SVG into a JPEG (like PDF pages), so pictures stay small in storage.
import JSZip from 'jszip';
import { readPart } from './zip.js';

/* ---------- a tiny XML reader: elements, attributes, text; namespace prefixes dropped ---------- */

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unescape = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m));
const local = (n) => n.slice(n.indexOf(':') + 1);

// Reads left to right with plain searches, so any file takes time in proportion to its size. A file that isn't
// well-formed (an unclosed comment, a stray "<") simply stops the reading there: a hostile file can't stall the server.
const TAG = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
export function parseXml(xml) {
  const root = { name: '#root', attrs: {}, kids: [], text: '' };
  const stack = [root];
  let at = 0;
  while (at < xml.length) {
    const top = stack[stack.length - 1];
    const lt = xml.indexOf('<', at);
    if (lt < 0) { top.text += unescape(xml.slice(at)); break; }
    if (lt > at) top.text += unescape(xml.slice(at, lt));
    // CDATA, comments and declarations: skip to their end, or stop if they never end.
    const special = xml.startsWith('<![CDATA[', lt) ? ']]>' : xml.startsWith('<!--', lt) ? '-->' : '?!'.includes(xml[lt + 1]) ? '>' : null;
    if (special) {
      const end = xml.indexOf(special, lt + 2);
      if (end < 0) break;
      if (special === ']]>') top.text += xml.slice(lt + 9, end);
      at = end + special.length;
      continue;
    }
    TAG.lastIndex = lt;
    const m = TAG.exec(xml);
    if (!m) break;
    at = TAG.lastIndex;
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    const node = { name: local(m[2]), attrs: {}, kids: [], text: '' };
    for (const a of m[3].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) node.attrs[a[1].includes(':') && !a[1].startsWith('r:') ? local(a[1]) : a[1]] = unescape(a[2] ?? a[3]);
    top.kids.push(node);
    if (!m[4]) stack.push(node);
  }
  return root;
}
const kid = (n, name) => n?.kids.find((k) => k.name === name);
const kids = (n, name) => n?.kids.filter((k) => k.name === name) || [];
const path = (n, ...names) => names.reduce((x, name) => kid(x, name), n);
const num = (v, d = 0) => (v == null || v === '' || Number.isNaN(+v) ? d : +v);

/* ---------- colours ---------- */

function hex(rgb) { return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function toRgb(h) { const v = parseInt(h, 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb([h, s, l]) {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const toLinear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const fromLinear = (l) => 255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);
const PRESET = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', grey: '808080', darkGray: 'A9A9A9', lightGray: 'D3D3D3', orange: 'FFA500' };

// A colour element (srgbClr, schemeClr, ...) with its tweaks (lumMod, tint, alpha) → { c: '#rrggbb', a: 0..1 }.
function colour(node, ctx) {
  if (!node) return null;
  let base;
  if (node.name === 'srgbClr') base = node.attrs.val;
  else if (node.name === 'sysClr') base = node.attrs.lastClr || (node.attrs.val === 'window' ? 'FFFFFF' : '000000');
  else if (node.name === 'prstClr') base = PRESET[node.attrs.val] || '000000';
  else if (node.name === 'scrgbClr') base = hex(['r', 'g', 'b'].map((k) => num(node.attrs[k]) / 100000 * 255)).slice(1);
  else if (node.name === 'schemeClr') {
    let key = node.attrs.val;
    if (key === 'phClr' && ctx.phClr) return tweak(ctx.phClr, node);
    key = ctx.map[key] || key;
    base = ctx.theme[key] || '000000';
  } else return null;
  return tweak({ c: '#' + base, a: 1 }, node);
}
function tweak(start, node) {
  let rgb = toRgb(start.c.slice(1)), a = start.a;
  for (const t of node.kids) {
    const v = num(t.attrs.val) / 100000;
    if (t.name === 'alpha') a = v;
    else if (t.name === 'lumMod' || t.name === 'lumOff') { const hsl = rgbToHsl(rgb); hsl[2] = t.name === 'lumMod' ? hsl[2] * v : hsl[2] + v; hsl[2] = Math.max(0, Math.min(1, hsl[2])); rgb = hslToRgb(hsl); }
    // Office mixes towards white (tint) or black (shade) in linear light, which looks lighter than plain mixing.
    else if (t.name === 'tint') rgb = rgb.map((c) => fromLinear(toLinear(c) * v + (1 - v)));
    else if (t.name === 'shade') rgb = rgb.map((c) => fromLinear(toLinear(c) * v));
  }
  return { c: hex(rgb), a };
}
const COLOUR_TAGS = new Set(['srgbClr', 'schemeClr', 'sysClr', 'prstClr', 'scrgbClr']);
const firstColour = (n) => n?.kids.find((k) => COLOUR_TAGS.has(k.name));

/* ---------- text measuring (Helvetica/Arial widths, what most viewers fall back to) ---------- */

const W = ' 278!278"355#556$556%889&667\'191(333)333*389+584,278-333.278/278:278;278<584=584>584?556[278\\278]278^469_556`333{334|260}334~584';
const WIDTH = { '@': 1015 };
for (let i = 0; i < W.length; i += 4) WIDTH[W[i]] = +W.slice(i + 1, i + 4);
'0123456789'.split('').forEach((c) => { WIDTH[c] = 556; });
const UPPER = 'A667B667C722D722E667F611G778H722I278J500K667L556M833N722O778P667Q778R722S667T611U722V667W944X667Y667Z611';
const LOWER = 'a556b556c500d556e556f278g556h556i222j222k500l222m833n556o556p556q556r333s500t278u556v500w722x500y500z500';
for (const s of [UPPER, LOWER]) for (let i = 0; i < s.length; i += 4) WIDTH[s[i]] = +s.slice(i + 1, i + 4);
// Narrower families than Arial, roughly: Calibri (and its stand-in Carlito), Times, Cambria, Garamond.
const NARROW = [[/calibri|carlito|aptos/i, 0.9], [/times|cambria|garamond|georgia/i, 0.92], [/arial narrow|condensed/i, 0.82]];
function textWidth(str, size, bold, font = '') {
  const k = NARROW.find(([re]) => re.test(font))?.[1] || 1;
  return k * textWidthArial(str, size, bold);
}
function textWidthArial(str, size, bold) {
  let w = 0;
  for (const ch of str) { const code = ch.codePointAt(0); w += WIDTH[ch] ?? (code > 0x2e80 ? 1000 : 600); }
  return (w / 1000) * size * (bold ? 1.06 : 1);
}

/* ---------- the deck ---------- */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp', webp: 'image/webp' };
const MAX_PICTURE = 6_000_000;

function relsOf(xml, base) {
  const out = {};
  if (!xml) return out;
  for (const r of kids(parseXml(xml).kids[0], 'Relationship')) {
    const t = r.attrs.Target || '';
    out[r.attrs.Id] = { type: (r.attrs.Type || '').split('/').pop(), target: r.attrs.TargetMode === 'External' ? null : resolve(base, t) };
  }
  return out;
}
function resolve(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const p of target.split('/')) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); }
  return parts.join('/');
}

export async function renderPptx(buffer, { maxSlides = 300 } = {}) {
  const zip = await JSZip.loadAsync(buffer);
  const read = (f) => readPart(zip, f);
  const cache = new Map();
  const part = async (f) => { if (!f) return null; if (!cache.has(f)) { const x = await read(f); cache.set(f, x ? { xml: parseXml(x).kids.find((k) => k.name) , rels: relsOf(await read(f.replace(/([^/]+)$/, '_rels/$1.rels')), f), file: f } : null); } return cache.get(f); };
  const pictures = new Map();
  const picture = async (file) => {
    if (!file) return null;
    if (!pictures.has(file)) {
      const ext = file.split('.').pop().toLowerCase();
      const data = MIME[ext] ? await readPart(zip, file, { cap: MAX_PICTURE, type: 'base64' }) : undefined;
      pictures.set(file, data ? `data:${MIME[ext]};base64,${data}` : null);
    }
    return pictures.get(file);
  };

  const presFile = 'ppt/presentation.xml';
  const pres = await part(presFile);
  if (!pres) return [];
  const size = path(pres.xml, 'sldSz');
  const W0 = num(size?.attrs.cx, 12192000), H0 = num(size?.attrs.cy, 6858000);
  const defaultText = path(pres.xml, 'defaultTextStyle');
  const slides = kids(path(pres.xml, 'sldIdLst'), 'sldId').map((s) => pres.rels[s.attrs['r:id']]?.target).filter((f) => f && zip.file(f));

  const out = [];
  let total = 0;
  for (const [i, file] of slides.slice(0, maxSlides).entries()) {
    try {
      const svg = await renderSlide(file);
      total += svg.length;
      // A deck heavy with photos: stop drawing rather than fill the memory. Those slides fall back to text.
      if (total > 120_000_000) break;
      out.push({ n: i + 1, svg });
    } catch (e) { /* one odd slide never stops the rest */ }
  }
  return out;

  async function renderSlide(file) {
    const slide = await part(file);
    const layout = await part(Object.values(slide.rels).find((r) => r.type === 'slideLayout')?.target);
    const master = await part(Object.values(layout?.rels || {}).find((r) => r.type === 'slideMaster')?.target);
    const themePart = await part(Object.values(master?.rels || {}).find((r) => r.type === 'theme')?.target);
    const theme = Object.create(null), fonts = {};
    const scheme = path(themePart?.xml, 'themeElements', 'clrScheme');
    // Theme colours go straight into the drawing, so only a plain six-digit colour is accepted.
    for (const c of scheme?.kids || []) { const col = firstColour(c), v = col?.name === 'sysClr' ? col.attrs.lastClr : col?.attrs.val; theme[c.name] = /^[0-9a-f]{6}$/i.test(v || '') ? v : '000000'; }
    const fontScheme = path(themePart?.xml, 'themeElements', 'fontScheme');
    fonts.major = path(fontScheme, 'majorFont', 'latin')?.attrs.typeface;
    fonts.minor = path(fontScheme, 'minorFont', 'latin')?.attrs.typeface;
    const fmt = path(themePart?.xml, 'themeElements', 'fmtScheme');
    const map = { ...(path(master?.xml, 'clrMap')?.attrs || { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' }) };
    const over = path(slide.xml, 'clrMapOvr', 'overrideClrMapping') || path(layout?.xml, 'clrMapOvr', 'overrideClrMapping');
    if (over) Object.assign(map, over.attrs);
    const ctx = { theme, map, fonts, fmt, master, layout, slide, defs: [], uid: 0 };

    const body = [];
    body.push(await background(ctx));
    // Shapes on the master and layout (logos, bands) show unless the slide or layout says not to.
    if (master && layout?.xml.attrs.showMasterSp !== '0' && slide.xml.attrs.showMasterSp !== '0') body.push(await tree(path(master.xml, 'cSld', 'spTree'), master, ctx, true));
    if (layout && slide.xml.attrs.showMasterSp !== '0') body.push(await tree(path(layout.xml, 'cSld', 'spTree'), layout, ctx, true));
    body.push(await tree(path(slide.xml, 'cSld', 'spTree'), slide, ctx, false));
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${pt(W0)} ${pt(H0)}" width="${Math.round(W0 / 9525)}" height="${Math.round(H0 / 9525)}">${toPoints(`<defs>${ctx.defs.join('')}</defs>${body.join('')}`)}</svg>`;
  }

  async function background(ctx) {
    const rect = (fill) => `<rect width="${W0}" height="${H0}" ${fill}/>`;
    for (const p of [ctx.slide, ctx.layout, ctx.master]) {
      const bg = path(p?.xml, 'cSld', 'bg');
      if (!bg) continue;
      const pr = kid(bg, 'bgPr');
      if (pr) return rect(await fillAttr(pr, p, ctx, W0, H0, 0, 0) || 'fill="#ffffff"');
      const ref = kid(bg, 'bgRef');
      if (ref) { const c = colour(firstColour(ref), ctx); return rect(c ? `fill="${c.c}"` : 'fill="#ffffff"'); }
    }
    return rect('fill="#ffffff"');
  }

  // A fill (solid, gradient, picture) as SVG attributes, or '' for none / not given.
  async function fillAttr(pr, owner, ctx, w, h, x, y) {
    if (!pr) return '';
    if (kid(pr, 'noFill')) return 'fill="none"';
    const solid = kid(pr, 'solidFill');
    if (solid) { const c = colour(firstColour(solid), ctx); return c ? `fill="${c.c}"${c.a < 1 ? ` fill-opacity="${c.a.toFixed(3)}"` : ''}` : ''; }
    const grad = kid(pr, 'gradFill');
    if (grad) {
      const stops = kids(kid(grad, 'gsLst'), 'gs').map((g) => ({ pos: num(g.attrs.pos) / 1000, c: colour(firstColour(g), ctx) })).filter((s) => s.c);
      if (!stops.length) return '';
      const id = 'g' + ctx.uid++;
      if (kid(grad, 'path')) {
        ctx.defs.push(`<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.75">${stops.map((s) => `<stop offset="${s.pos}%" stop-color="${s.c.c}" stop-opacity="${s.c.a}"/>`).join('')}</radialGradient>`);
        return `fill="url(#${id})"`;
      }
      const ang = num(path(grad, 'lin')?.attrs.ang, 0) / 60000 * Math.PI / 180;
      const dx = Math.cos(ang) / 2, dy = Math.sin(ang) / 2;
      ctx.defs.push(`<linearGradient id="${id}" x1="${0.5 - dx}" y1="${0.5 - dy}" x2="${0.5 + dx}" y2="${0.5 + dy}">${stops.map((s) => `<stop offset="${s.pos}%" stop-color="${s.c.c}" stop-opacity="${s.c.a}"/>`).join('')}</linearGradient>`);
      return `fill="url(#${id})"`;
    }
    const blip = kid(pr, 'blipFill');
    if (blip) {
      const src = await picture(owner.rels[path(blip, 'blip')?.attrs['r:embed']]?.target);
      if (!src) return '';
      const id = 'p' + ctx.uid++;
      ctx.defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><image href="${src}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></pattern>`);
      return `fill="url(#${id})"`;
    }
    return '';
  }

  async function tree(spTree, owner, ctx, onlyDecor, group = null) {
    if (!spTree) return '';
    const out = [];
    for (let node of spTree.kids) {
      // Newer features come with an older fallback (often a picture): use the fallback.
      if (node.name === 'AlternateContent') node = kid(node, 'Fallback')?.kids[0] || kid(node, 'Choice')?.kids[0];
      if (!node) continue;
      const ph = path(node, 'nvSpPr', 'nvPr', 'ph') || path(node, 'nvPicPr', 'nvPr', 'ph');
      // Placeholders on a layout or master are only prompts ("Click to add title"): never drawn.
      if (onlyDecor && ph) continue;
      try {
        if (node.name === 'sp' || node.name === 'cxnSp') out.push(await shape(node, owner, ctx, group));
        else if (node.name === 'pic') out.push(await pic(node, owner, ctx, group));
        else if (node.name === 'grpSp') out.push(await grp(node, owner, ctx, onlyDecor, group));
        else if (node.name === 'graphicFrame') out.push(await frame(node, owner, ctx, group));
      } catch { /* skip a shape we can't read */ }
    }
    return out.join('');
  }

  // Position and size, following a placeholder back to its layout and master when the slide doesn't say.
  function placement(node, ctx, prName = 'spPr') {
    let xfrm = path(node, prName, 'xfrm') || path(node, 'xfrm');
    if (!xfrm || !kid(xfrm, 'off')) {
      const ph = placeholderOf(node);
      if (ph) for (const p of [ctx.layout, ctx.master]) { const twin = findPlaceholder(p, ph); const x = twin && path(twin, 'spPr', 'xfrm'); if (x && kid(x, 'off')) { xfrm = x; break; } }
    }
    if (!xfrm) return null;
    const off = kid(xfrm, 'off'), ext = kid(xfrm, 'ext');
    return { x: num(off?.attrs.x), y: num(off?.attrs.y), w: num(ext?.attrs.cx), h: num(ext?.attrs.cy), rot: num(xfrm.attrs.rot) / 60000, flipH: xfrm.attrs.flipH === '1', flipV: xfrm.attrs.flipV === '1', xfrm };
  }
  function placeholderOf(node) {
    return path(node, 'nvSpPr', 'nvPr', 'ph') || path(node, 'nvPicPr', 'nvPr', 'ph') || path(node, 'nvGraphicFramePr', 'nvPr', 'ph');
  }
  function findPlaceholder(p, ph) {
    if (!p) return null;
    const all = [];
    const walk = (n) => { for (const k of n?.kids || []) { if (k.name === 'sp' || k.name === 'pic') all.push(k); else if (k.name === 'grpSp') walk(k); } };
    walk(path(p.xml, 'cSld', 'spTree'));
    const type = ph.attrs.type || 'body', idx = ph.attrs.idx;
    const t = (k) => placeholderOf(k);
    return (idx != null && all.find((k) => t(k)?.attrs.idx === idx))
      || all.find((k) => t(k) && (t(k).attrs.type || 'body') === type)
      || (type === 'ctrTitle' && all.find((k) => t(k)?.attrs.type === 'title'))
      || (type === 'subTitle' && all.find((k) => (t(k)?.attrs.type || 'body') === 'body'))
      || null;
  }
  function transform(b, group) {
    let t = '';
    if (b.rot || b.flipH || b.flipV) {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      t = `translate(${cx} ${cy})${b.rot ? ` rotate(${b.rot})` : ''}${b.flipH || b.flipV ? ` scale(${b.flipH ? -1 : 1} ${b.flipV ? -1 : 1})` : ''} translate(${-cx} ${-cy})`;
    }
    return t ? ` transform="${t}"` : '';
  }

  async function grp(node, owner, ctx, onlyDecor) {
    const x = path(node, 'grpSpPr', 'xfrm');
    const inner = await tree(node, owner, ctx, onlyDecor);
    if (!x) return inner;
    const off = kid(x, 'off'), ext = kid(x, 'ext'), co = kid(x, 'chOff'), ce = kid(x, 'chExt');
    const sx = num(ce?.attrs.cx) ? num(ext?.attrs.cx) / num(ce.attrs.cx) : 1, sy = num(ce?.attrs.cy) ? num(ext?.attrs.cy) / num(ce.attrs.cy) : 1;
    return `<g transform="translate(${num(off?.attrs.x)} ${num(off?.attrs.y)}) scale(${sx} ${sy}) translate(${-num(co?.attrs.x)} ${-num(co?.attrs.y)})">${inner}</g>`;
  }

  async function pic(node, owner, ctx) {
    const b = placement(node, ctx);
    if (!b) return '';
    const blip = path(node, 'blipFill', 'blip');
    const src = await picture(owner.rels[blip?.attrs['r:embed']]?.target);
    if (!src) return '';
    const crop = path(node, 'blipFill', 'srcRect')?.attrs || {};
    const l = num(crop.l) / 100000, t = num(crop.t) / 100000, r = num(crop.r) / 100000, bt = num(crop.b) / 100000;
    const fw = b.w / Math.max(0.01, 1 - l - r), fh = b.h / Math.max(0.01, 1 - t - bt);
    const id = 'c' + ctx.uid++;
    ctx.defs.push(`<clipPath id="${id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/></clipPath>`);
    return `<g clip-path="url(#${id})"${transform(b)}><image href="${src}" x="${b.x - l * fw}" y="${b.y - t * fh}" width="${fw}" height="${fh}" preserveAspectRatio="none"/></g>`;
  }

  async function frame(node, owner, ctx) {
    const b = placement(node, ctx, 'xfrm');
    if (!b) return '';
    const data = path(node, 'graphic', 'graphicData');
    const tbl = kid(data, 'tbl');
    if (tbl) return table(tbl, b, ctx);
    // SmartArt keeps a drawn copy of itself: draw that.
    const dgm = kid(data, 'relIds');
    if (dgm) {
      const drawing = Object.values(owner.rels).find((r) => r.type === 'diagramDrawing')?.target;
      const d = await part(drawing);
      const t = d && path(d.xml, 'spTree');
      if (t) return `<g transform="translate(${b.x} ${b.y})">${await tree(t, d, ctx, false)}</g>`;
    }
    // Charts: a light frame where the chart sits. Its numbers are still in the text the answers read.
    if (kid(data, 'chart')) {
      const c = await part(owner.rels[kid(data, 'chart').attrs['r:id']]?.target);
      return chart(c?.xml, b, ctx) || `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#f3f3f6" stroke="#d5d5de" stroke-width="${b.w / 400}" rx="${b.w / 80}"/>`;
    }
    return '';
  }

  // Charts, drawn simply from the numbers saved in the file: bars, lines or a pie, in the deck's colours.
  function chart(xml, b, ctx) {
    const plot = path(xml, 'chart', 'plotArea');
    if (!plot) return '';
    const kind = plot.kids.find((k) => /^(bar|bar3D|line|line3D|pie|pie3D|doughnut|area)Chart$/.test(k.name));
    if (!kind) return '';
    const values = (n) => kids(path(n, 'numRef', 'numCache') || path(n, 'numLit'), 'pt').sort((x, y) => num(x.attrs.idx) - num(y.attrs.idx)).map((p) => num(kid(p, 'v')?.text));
    const labels = (n) => kids(path(n, 'strRef', 'strCache') || path(n, 'numRef', 'numCache') || path(n, 'strLit'), 'pt').map((p) => kid(p, 'v')?.text || '');
    const series = kids(kind, 'ser').map((sr, i) => ({ v: values(kid(sr, 'val')), cat: labels(kid(sr, 'cat')), c: colour(firstColour(path(sr, 'spPr', 'solidFill')), ctx)?.c || '#' + (ctx.theme['accent' + ((i % 6) + 1)] || '4472C4') }));
    if (!series.length || !series[0].v.length) return '';
    const words = (n) => (n ? (n.name === 't' ? n.text : n.kids.map(words).join('')) : '');
    const named = (sr) => words(kid(sr, 'tx')).trim();
    // A chart title with no text of its own shows the series name, as PowerPoint does.
    const title = words(path(xml, 'chart', 'title', 'tx')).trim() || ((path(xml, 'chart', 'title') || path(xml, 'chart', 'autoTitleDeleted')?.attrs.val === '0') && kids(kind, 'ser').length === 1 ? named(kids(kind, 'ser')[0]) : '');
    const fs = Math.min(b.h, b.w) / 17, ink = '#595959', out = [];
    const top = b.y + (title ? fs * 2.2 : fs), bottom = b.y + b.h - fs * 2, left = b.x + fs * 3, right = b.x + b.w - fs;
    if (title) out.push(`<text x="${b.x + b.w / 2}" y="${b.y + fs * 1.4}" font-size="${fs * 1.2}" font-weight="bold" fill="${ink}" text-anchor="middle" font-family="Calibri, Carlito, Arial, sans-serif">${esc(title)}</text>`);
    if (kind.name.startsWith('pie') || kind.name === 'doughnut') {
      const v = series[0].v, total = v.reduce((x, y) => x + Math.max(0, y), 0) || 1;
      const cats = series[0].cat, legendW = cats.length ? (right - left) * 0.3 : 0;
      const r = Math.min(right - left - legendW, bottom - top) / 2, cx = (left + right - legendW) / 2, cy = (top + bottom) / 2;
      let a = -Math.PI / 2;
      // Arcs as many short straight steps: the drawing is later rescaled number by number, which arc flags wouldn't survive.
      const arc = (a1, a2) => { const pts = []; const k = Math.max(2, Math.ceil((a2 - a1) / 0.05)); for (let j = 0; j <= k; j++) { const t = a1 + (a2 - a1) * j / k; pts.push(`L${cx + r * Math.cos(t)} ${cy + r * Math.sin(t)}`); } return pts.join(''); };
      v.forEach((x, i) => {
        const da = Math.max(0, x) / total * Math.PI * 2, a2 = a + da;
        const col = colour(firstColour(path(kids(kids(kind, 'ser')[0], 'dPt').find((d) => num(path(d, 'idx')?.attrs.val) === i), 'spPr', 'solidFill')), ctx)?.c || '#' + (ctx.theme['accent' + ((i % 6) + 1)] || '4472C4');
        out.push(`<path d="M${cx} ${cy}${arc(a, a2)}Z" fill="${col}" stroke="#fff" stroke-width="${fs / 6}"/>`);
        if (cats[i] != null) { const ly = top + (bottom - top) / 2 - cats.length * fs * 0.75 + i * fs * 1.5; out.push(`<rect x="${right - legendW + fs}" y="${ly - fs * 0.8}" width="${fs * 0.8}" height="${fs * 0.8}" fill="${col}"/><text x="${right - legendW + fs * 2.2}" y="${ly}" font-size="${fs}" fill="${ink}" font-family="Calibri, Carlito, Arial, sans-serif">${esc(cats[i].slice(0, 20))}</text>`); }
        a = a2;
      });
      return out.join('');
    }
    const all = series.flatMap((x) => x.v), max = Math.max(0, ...all), min = Math.min(0, ...all);
    const span = max - min || 1, step = Math.pow(10, Math.floor(Math.log10(span / 4))) * ([1, 2, 5, 10].find((k) => span / (Math.pow(10, Math.floor(Math.log10(span / 4))) * k) <= 6) || 10);
    const top2 = Math.ceil(max / step) * step, bot2 = Math.floor(min / step) * step;
    const y = (v) => bottom - (v - bot2) / (top2 - bot2 || 1) * (bottom - top);
    for (let g = bot2; g <= top2 + step / 2; g += step) {
      out.push(`<path d="M${left} ${y(g)}L${right} ${y(g)}" stroke="#d9d9d9" stroke-width="${fs / 12}"/>`);
      out.push(`<text x="${left - fs * 0.4}" y="${y(g) + fs * 0.35}" font-size="${fs}" fill="${ink}" text-anchor="end" font-family="Calibri, Carlito, Arial, sans-serif">${+g.toFixed(6)}</text>`);
    }
    const n = series[0].v.length, slot = (right - left) / n, cats = series[0].cat;
    const horizontal = path(kind, 'barDir')?.attrs.val === 'bar';
    series.forEach((sr, si) => {
      if (kind.name.startsWith('bar') && !horizontal) {
        const bw = slot * 0.6 / series.length;
        sr.v.forEach((v, i) => { const x = left + slot * i + slot * 0.2 + bw * si; out.push(`<rect x="${x}" y="${Math.min(y(v), y(0))}" width="${bw}" height="${Math.abs(y(0) - y(v))}" fill="${sr.c}"/>`); });
      } else {
        out.push(`<path d="${sr.v.map((v, i) => `${i ? 'L' : 'M'}${left + slot * (i + 0.5)} ${y(v)}`).join('')}" fill="none" stroke="${sr.c}" stroke-width="${fs / 4}" stroke-linejoin="round"/>`);
      }
    });
    cats.forEach((c, i) => out.push(`<text x="${left + slot * (i + 0.5)}" y="${bottom + fs * 1.3}" font-size="${fs}" fill="${ink}" text-anchor="middle" font-family="Calibri, Carlito, Arial, sans-serif">${esc(c.slice(0, 18))}</text>`));
    return out.join('');
  }

  async function table(tbl, b, ctx) {
    const cols = kids(kid(tbl, 'tblGrid'), 'gridCol').map((c) => num(c.attrs.w));
    // Without a table style, cells are plain unless they say otherwise (no blue banding).
    // Two common built-in styles are plain ("No Style, Table Grid" and "No Style, No Grid"); the rest get
    // PowerPoint's usual look of a coloured header and banded rows.
    const styleId = (path(tbl, 'tblPr', 'tableStyleId')?.text || '').toUpperCase();
    const grid = styleId.includes('5940675A'), plain = grid || styleId.includes('2D5ABB26');
    const styled = !plain && (Boolean(styleId) || ['firstRow', 'bandRow'].some((k) => path(tbl, 'tblPr')?.attrs[k] === '1'));
    const out = [];
    let y = b.y;
    for (const [ri, tr] of kids(tbl, 'tr').entries()) {
      const h = num(tr.attrs.h);
      let x = b.x, rowH = h;
      const cells = kids(tr, 'tc');
      // Measure first, so a row grows with its text as in PowerPoint.
      const laid = cells.map((tc, ci) => { const w = cols[ci] || 0; return { tc, w, text: layoutText(kid(tc, 'txBody'), { x: 0, y: 0, w, h }, ctx, null, ri === 0 ? { b: true } : null, true) }; });
      for (const c of laid) rowH = Math.max(rowH, c.text.height);
      for (const c of laid) {
        const pr = kid(c.tc, 'tcPr');
        let fill = await fillAttr(pr, ctx.slide, ctx, c.w, rowH, x, y);
        if (!fill && !styled) fill = 'fill="none"';
        if (!fill) fill = ri === 0 ? `fill="${'#' + (ctx.theme.accent1 || '4472C4')}"` : `fill="${ri % 2 ? '#e9ebf5' : '#cfd5ea'}"`;
        const auto = styled && ri === 0 && !kid(pr, 'solidFill') ? { color: '#ffffff' } : null;
        out.push(`<rect x="${x}" y="${y}" width="${c.w}" height="${rowH}" ${fill} ${styled ? 'stroke="#ffffff" stroke-width="12700"' : 'stroke="none"'}/>`);
        // Cell borders the deck sets itself.
        for (const [side, x1, y1, x2, y2] of [['lnL', x, y, x, y + rowH], ['lnR', x + c.w, y, x + c.w, y + rowH], ['lnT', x, y, x + c.w, y], ['lnB', x, y + rowH, x + c.w, y + rowH]]) {
          const l = kid(pr, side);
          const lc = l && !kid(l, 'noFill') && colour(firstColour(kid(l, 'solidFill')), ctx);
          if (!lc && grid) out.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#000000" stroke-width="12700"/>`);
          if (lc) out.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${lc.c}" stroke-width="${num(l.attrs.w, 12700)}"/>`);
        }
        out.push(layoutText(kid(c.tc, 'txBody'), { x, y, w: c.w, h: rowH }, ctx, null, { ...(ri === 0 ? { b: true } : {}), ...(auto || {}) }).svg);
        x += c.w;
      }
      y += rowH;
    }
    return out.join('');
  }

  async function shape(node, owner, ctx) {
    const b = placement(node, ctx);
    if (!b) return '';
    const pr = kid(node, 'spPr');
    const style = kid(node, 'style');
    let fill = await fillAttr(pr, owner, ctx, b.w, b.h, b.x, b.y);
    if (!fill && style) { const ref = kid(style, 'fillRef'); if (ref && num(ref.attrs.idx) > 0) { const c = colour(firstColour(ref), ctx); if (c) fill = `fill="${c.c}"`; } }
    if (!fill) fill = 'fill="none"';
    // Outline
    let stroke = 'stroke="none"';
    const ln = kid(pr, 'ln');
    const lnColour = (() => {
      if (ln && kid(ln, 'noFill')) return null;
      const c = ln && kid(ln, 'solidFill') ? colour(firstColour(kid(ln, 'solidFill')), ctx) : null;
      if (c) return c;
      const ref = style && kid(style, 'lnRef');
      if (ref && num(ref.attrs.idx) > 0) return colour(firstColour(ref), ctx);
      return null;
    })();
    if (lnColour) stroke = `stroke="${lnColour.c}" stroke-width="${num(ln?.attrs.w, 12700)}"${lnColour.a < 1 ? ` stroke-opacity="${lnColour.a}"` : ''}${path(ln, 'prstDash') && path(ln, 'prstDash').attrs.val !== 'solid' ? ` stroke-dasharray="${num(ln?.attrs.w, 12700) * 3} ${num(ln?.attrs.w, 12700) * 2}"` : ''}`;
    const geom = path(pr, 'prstGeom')?.attrs.prst || (kid(pr, 'custGeom') ? 'cust' : 'rect');
    if (node.name === 'cxnSp' || /line|Connector/.test(geom)) fill = 'fill="none"';
    const outline = geometry(geom, b, pr);
    const parts = [];
    if (outline && (fill !== 'fill="none"' || stroke !== 'stroke="none"')) parts.push(outline.replace('/>', ` ${fill} ${stroke}/>`));
    const fontRef = style && kid(style, 'fontRef');
    const fontColour = fontRef ? colour(firstColour(fontRef), ctx) : null;
    const txt = kid(node, 'txBody');
    if (txt) parts.push(layoutText(txt, b, ctx, node, fontColour ? { color: fontColour.c } : null).svg);
    return `<g${transform(b)}>${parts.join('')}</g>`;
  }

  function geometry(prst, b, pr) {
    const { x, y, w, h } = b;
    const adj = (name, d) => { const g = path(pr, 'prstGeom', 'avLst')?.kids.find((k) => k.attrs.name === name); return g ? num(String(g.attrs.fmla).replace('val ', ''), d) : d; };
    switch (prst) {
      case 'rect': case 'snip1Rect': case 'flowChartProcess': case 'flowChartAlternateProcess': return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
      case 'roundRect': { const r = Math.min(w, h) * adj('adj', 16667) / 100000; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`; }
      case 'ellipse': case 'flowChartConnector': return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
      case 'triangle': return `<path d="M${x + w / 2} ${y}L${x + w} ${y + h}L${x} ${y + h}Z"/>`;
      case 'rtTriangle': return `<path d="M${x} ${y}L${x + w} ${y + h}L${x} ${y + h}Z"/>`;
      case 'diamond': case 'flowChartDecision': return `<path d="M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z"/>`;
      case 'line': case 'straightConnector1': case 'bentConnector3': return `<path d="M${b.flipH ? x + w : x} ${b.flipV ? y + h : y}L${b.flipH ? x : x + w} ${b.flipV ? y : y + h}"/>`;
      case 'rightArrow': { const t = h * 0.25, hw = Math.min(w, h * 0.5); return `<path d="M${x} ${y + t}H${x + w - hw}V${y}L${x + w} ${y + h / 2}L${x + w - hw} ${y + h}V${y + h - t}H${x}Z"/>`; }
      case 'leftArrow': { const t = h * 0.25, hw = Math.min(w, h * 0.5); return `<path d="M${x + w} ${y + t}H${x + hw}V${y}L${x} ${y + h / 2}L${x + hw} ${y + h}V${y + h - t}H${x + w}Z"/>`; }
      case 'chevron': { const d = Math.min(w, h * 0.5); return `<path d="M${x} ${y}H${x + w - d}L${x + w} ${y + h / 2}L${x + w - d} ${y + h}H${x}L${x + d} ${y + h / 2}Z"/>`; }
      case 'homePlate': { const d = Math.min(w, h * 0.5); return `<path d="M${x} ${y}H${x + w - d}L${x + w} ${y + h / 2}L${x + w - d} ${y + h}H${x}Z"/>`; }
      case 'parallelogram': { const d = Math.min(w, h) * 0.25; return `<path d="M${x + d} ${y}H${x + w}L${x + w - d} ${y + h}H${x}Z"/>`; }
      case 'hexagon': { const d = Math.min(w, h) * 0.25; return `<path d="M${x + d} ${y}H${x + w - d}L${x + w} ${y + h / 2}L${x + w - d} ${y + h}H${x + d}L${x} ${y + h / 2}Z"/>`; }
      case 'cust': return custom(b, kid(pr, 'custGeom'));
      default: return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    }
  }

  function custom(b, cg) {
    const d = [];
    for (const p of kids(kid(cg, 'pathLst'), 'path')) {
      const pw = num(p.attrs.w, b.w) || 1, ph = num(p.attrs.h, b.h) || 1;
      const X = (v) => b.x + num(v) / pw * b.w, Y = (v) => b.y + num(v) / ph * b.h;
      for (const c of p.kids) {
        const pts = kids(c, 'pt');
        if (c.name === 'moveTo') d.push(`M${X(pts[0].attrs.x)} ${Y(pts[0].attrs.y)}`);
        else if (c.name === 'lnTo') d.push(`L${X(pts[0].attrs.x)} ${Y(pts[0].attrs.y)}`);
        else if (c.name === 'cubicBezTo') d.push('C' + pts.map((q) => `${X(q.attrs.x)} ${Y(q.attrs.y)}`).join(' '));
        else if (c.name === 'quadBezTo') d.push('Q' + pts.map((q) => `${X(q.attrs.x)} ${Y(q.attrs.y)}`).join(' '));
        else if (c.name === 'close') d.push('Z');
      }
    }
    return d.length ? `<path d="${d.join('')}"/>` : '';
  }

  /* ---------- text ---------- */

  // The style a paragraph at level `lvl` inherits: master text styles, then the placeholder's own list styles.
  function levelStyles(node, ctx, lvl) {
    const ph = node && placeholderOf(node);
    const type = ph ? ph.attrs.type || 'body' : null;
    const layers = [];
    const key = `lvl${lvl + 1}pPr`;
    const tx = path(ctx.master?.xml, 'txStyles');
    if (!ph) layers.push(kid(defaultText, key));
    else layers.push(kid(kid(tx, type === 'title' || type === 'ctrTitle' ? 'titleStyle' : ['body', 'subTitle', 'obj'].includes(type) ? 'bodyStyle' : 'otherStyle'), key));
    if (ph) for (const p of [ctx.master, ctx.layout]) { const twin = findPlaceholder(p, ph); layers.push(kid(path(twin, 'txBody', 'lstStyle'), key)); }
    layers.push(kid(path(node, 'txBody', 'lstStyle'), key));
    return layers.filter(Boolean);
  }
  function bodyProps(node, ctx, txBody) {
    const ph = node && placeholderOf(node);
    const layers = [];
    if (ph) for (const p of [ctx.master, ctx.layout]) { const twin = findPlaceholder(p, ph); if (twin) layers.push(path(twin, 'txBody', 'bodyPr')); }
    layers.push(kid(txBody, 'bodyPr'));
    const out = { l: 91440, t: 45720, r: 91440, b: 45720, anchor: 't', wrap: true, scale: 1, shrink: false };
    for (const bp of layers.filter(Boolean)) {
      if (bp.attrs.lIns != null) out.l = num(bp.attrs.lIns); if (bp.attrs.tIns != null) out.t = num(bp.attrs.tIns);
      if (bp.attrs.rIns != null) out.r = num(bp.attrs.rIns); if (bp.attrs.bIns != null) out.b = num(bp.attrs.bIns);
      if (bp.attrs.anchor) out.anchor = bp.attrs.anchor;
      if (bp.attrs.wrap === 'none') out.wrap = false;
      const fit = kid(bp, 'normAutofit');
      if (fit) { out.shrink = true; if (fit.attrs.fontScale) out.scale = num(fit.attrs.fontScale) / 100000; }
    }
    if (ph && (ph.attrs.type === 'title' || ph.attrs.type === 'ctrTitle') && !layers.some((l) => l?.attrs.anchor)) out.anchor = ph.attrs.type === 'ctrTitle' ? 'b' : 'ctr';
    return out;
  }
  function runStyle(layers, rPr, extra, ctx, node) {
    const s = { sz: 1800, b: false, i: false, u: false, color: null, font: null };
    const take = (r) => {
      if (!r) return;
      if (r.attrs.sz) s.sz = num(r.attrs.sz); if (r.attrs.b != null) s.b = r.attrs.b === '1' || r.attrs.b === 'true';
      if (r.attrs.i != null) s.i = r.attrs.i === '1' || r.attrs.i === 'true'; if (r.attrs.u) s.u = r.attrs.u !== 'none';
      const f = kid(r, 'solidFill'); if (f) { const c = colour(firstColour(f), ctx); if (c) s.color = c.c; }
      const latin = kid(r, 'latin')?.attrs.typeface; if (latin) s.font = latin;
    };
    for (const l of layers) take(kid(l, 'defRPr'));
    // A shape's own style colour (white text on a filled shape) beats the deck-wide defaults, not the run's own colour.
    if (extra) { if (extra.b) s.b = true; if (extra.color) s.color = extra.color; }
    take(rPr);
    const ph = node && placeholderOf(node);
    if (!s.font || s.font.startsWith('+')) s.font = (s.font === '+mj-lt' || (!s.font && ph && /title/i.test(ph.attrs.type || ''))) ? ctx.fonts.major : ctx.fonts.minor;
    if (!s.color) s.color = '#' + (ctx.theme[ctx.map.tx1 || 'dk1'] || '000000');
    return s;
  }
  function paraStyle(layers, pPr) {
    const p = { algn: 'l', marL: 0, indent: 0, bullet: null, auto: null, lnSpc: 1, before: 0, after: 0, buColor: null };
    for (const l of [...layers, pPr].filter(Boolean)) {
      if (l.attrs.algn) p.algn = l.attrs.algn;
      if (l.attrs.marL != null) p.marL = num(l.attrs.marL); if (l.attrs.indent != null) p.indent = num(l.attrs.indent);
      if (kid(l, 'buNone')) { p.bullet = null; p.auto = null; }
      if (kid(l, 'buChar')) { p.bullet = symbol(kid(l, 'buChar').attrs.char, kid(l, 'buFont')?.attrs.typeface || p.buFont); p.auto = null; }
      if (kid(l, 'buFont')) p.buFont = kid(l, 'buFont').attrs.typeface;
      if (kid(l, 'buAutoNum')) { p.auto = kid(l, 'buAutoNum').attrs.type || 'arabicPeriod'; p.bullet = null; }
      const ls = path(l, 'lnSpc', 'spcPct'); if (ls) p.lnSpc = num(ls.attrs.val) / 100000;
      const sb = path(l, 'spcBef', 'spcPts'); if (sb) p.before = num(sb.attrs.val) / 100 * 12700;
      const sbp = path(l, 'spcBef', 'spcPct'); if (sbp) p.beforePct = num(sbp.attrs.val) / 100000;
      const sa = path(l, 'spcAft', 'spcPts'); if (sa) p.after = num(sa.attrs.val) / 100 * 12700;
    }
    return p;
  }

  // Lays the text of one shape out in lines. Returns the SVG and the height it needs.
  function layoutText(txBody, box, ctx, node, extra, measureOnly = false) {
    if (!txBody) return { svg: '', height: 0 };
    const bp = bodyProps(node, ctx, txBody);
    const paras = kids(txBody, 'p');
    if (!paras.some((p) => p.kids.some((k) => (k.name === 'r' || k.name === 'fld') && kid(k, 't')?.text.trim()))) return { svg: '', height: 0 };
    const avail = Math.max(1, box.w - bp.l - bp.r);
    const attempt = (scale) => {
      const lines = [];
      let y = 0, counter = 0;
      for (const [pi, p] of paras.entries()) {
        const pPr = kid(p, 'pPr');
        const lvl = num(pPr?.attrs.lvl);
        const layers = levelStyles(node, ctx, lvl);
        const ps = paraStyle(layers, pPr);
        const runs = [];
        for (const r of p.kids) {
          if (r.name === 'r' || r.name === 'fld') runs.push({ text: kid(r, 't')?.text || '', s: runStyle(layers, kid(r, 'rPr'), extra, ctx, node) });
          else if (r.name === 'br') runs.push({ br: true, s: runStyle(layers, kid(r, 'rPr'), extra, ctx, node) });
        }
        const endSz = runStyle(layers, kid(p, 'endParaRPr'), extra, ctx, node).sz;
        if (ps.auto) counter++; else counter = 0;
        const bulletText = ps.bullet ? ps.bullet : ps.auto ? autoNumber(ps.auto, counter) : '';
        const hasText = runs.some((r) => r.text?.trim());
        if (pi > 0) y += (ps.before + (ps.beforePct || 0) * ((runs.find((r) => r.text)?.s.sz || endSz) / 100 * 12700) * 1.2) * scale;
        const startX = ps.marL, firstX = ps.marL + ps.indent;
        // Break the runs into words and fill lines.
        let line = { items: [], width: 0, size: 0 }, x = firstX;
        const width = () => avail - (lines.length || line.items.length ? 0 : 0);
        const flush = () => { lines.push({ ...line, para: ps, x0: line.x0 ?? startX, y }); };
        line.x0 = firstX;
        if (hasText && bulletText) line.bullet = { text: bulletText, x: ps.marL + ps.indent, s: runs.find((r) => r.text)?.s };
        if (hasText && bulletText && ps.indent < 0) { x = startX; line.x0 = startX; }
        const words = [];
        for (const r of runs) {
          if (r.br) { words.push({ br: true, s: r.s }); continue; }
          for (const part of r.text.split(/(\s+)/)) if (part) words.push({ text: part, s: r.s });
        }
        let maxSz = 0;
        const place = () => {
          const sz = Math.max(line.size, endSz) / 100 * 12700 * scale;
          const lh = sz * 1.2 * ps.lnSpc;
          line.lh = lh; line.base = y + lh * 0.8;
          flush(); y += lh;
        };
        for (const wd of words) {
          if (wd.br) { place(); line = { items: [], width: 0, size: 0, x0: startX }; x = startX; continue; }
          const sz = wd.s.sz * scale;
          const pt = sz / 100 * 12700;
          const wWidth = textWidth(wd.text, pt, wd.s.b, wd.s.font);
          const isSpace = !wd.text.trim();
          if (bp.wrap && !isSpace && x + wWidth > width() && line.items.some((it) => it.text.trim())) {
            // trailing spaces don't count
            while (line.items.length && !line.items.at(-1).text.trim()) { const sp = line.items.pop(); x -= sp.w; }
            place();
            line = { items: [], width: 0, size: 0, x0: startX }; x = startX;
          }
          if (isSpace && !line.items.length && lines.length && lines.at(-1).para === ps) continue;
          line.items.push({ text: wd.text, s: wd.s, w: wWidth, x });
          x += wWidth; line.size = Math.max(line.size, wd.s.sz); maxSz = Math.max(maxSz, wd.s.sz);
          line.width = x;
        }
        place();
        y += ps.after * scale;
      }
      return { lines, height: y };
    };
    let scale = bp.scale, laid = attempt(scale);
    const room = box.h - bp.t - bp.b;
    // "Shrink text on overflow": PowerPoint makes text smaller until it fits.
    if (bp.shrink) while (laid.height > room && scale > 0.4) { scale -= 0.05; laid = attempt(scale); }
    const height = laid.height + bp.t + bp.b;
    if (measureOnly) return { svg: '', height };
    const top = box.y + bp.t + (bp.anchor === 'ctr' ? (room - laid.height) / 2 : bp.anchor === 'b' ? room - laid.height : 0);
    const left = box.x + bp.l;
    const out = [];
    for (const ln of laid.lines) {
      if (!ln.items.length && !ln.bullet) continue;
      const used = ln.items.length ? ln.items.at(-1).x + ln.items.at(-1).w - ln.x0 : 0;
      const span = avail - ln.x0;
      const shift = ln.para.algn === 'ctr' ? (span - used) / 2 : ln.para.algn === 'r' ? span - used : 0;
      const by = top + ln.base;
      if (ln.bullet && ln.bullet.s) {
        const s = ln.bullet.s;
        out.push(`<text x="${left + ln.bullet.x + Math.max(0, shift)}" y="${by}" font-size="${s.sz * scale / 100 * 12700}" fill="${s.color}" font-family="${esc(fontStack(s.font))}">${esc(ln.bullet.text)}</text>`);
      }
      if (!ln.items.length) continue;
      const spans = [];
      let cur = null;
      for (const it of ln.items) {
        const s = it.s;
        const key = [s.sz, s.b, s.i, s.u, s.color, s.font].join('|');
        if (cur && cur.key === key) cur.text += it.text;
        else { cur = { key, s, text: it.text }; spans.push(cur); }
      }
      // data-w: the line's laid-out width, so an answer can mark this line on the slide (lib/slidetext.js).
      out.push(`<text x="${left + ln.x0 + Math.max(0, shift)}" y="${by}" xml:space="preserve" data-w="${Math.round(used)}">${spans.map((sp) => `<tspan font-size="${(sp.s.sz * scale / 100 * 12700).toFixed(0)}" fill="${sp.s.color}" font-family="${esc(fontStack(sp.s.font))}"${sp.s.b ? ' font-weight="bold"' : ''}${sp.s.i ? ' font-style="italic"' : ''}${sp.s.u ? ' text-decoration="underline"' : ''}>${esc(sp.text)}</tspan>`).join('')}</text>`);
    }
    return { svg: out.join(''), height };
  }
}

// Shapes are worked out in slide units (EMU, 914400 to the inch) and written out in points: browsers
// won't draw text that is half a million units tall, however much it is scaled down.
const pt = (v) => +(v / 12700).toFixed(2);
const nums = (str) => str.replace(/-?\d+(\.\d+)?(e-?\d+)?/g, (v) => pt(+v));
function toPoints(svg) {
  return svg
    .replace(/ (x|y|width|height|rx|ry|cx|cy|font-size|stroke-width)="(-?[\d.e-]+)"/g, (m, k, v) => ` ${k}="${pt(+v)}"`)
    .replace(/ (d|stroke-dasharray)="([^"]*)"/g, (m, k, v) => ` ${k}="${nums(v)}"`)
    .replace(/translate\(([^)]*)\)/g, (m, v) => `translate(${nums(v)})`);
}

// Bullets drawn from symbol fonts (Wingdings "l" is a round dot): show the shape, not the letter.
const SYMBOLS = { l: '●', n: '■', q: '❑', u: '◆', v: '❖', 'Ø': '➢', 'ü': '✓', '§': '■', 'Ü': '➢', 'o': '○', '': '•', '·': '•' };
function symbol(ch, font) {
  if (!ch) return '•';
  if (/wingdings|symbol|webdings/i.test(font || '')) return SYMBOLS[ch] || '•';
  return ch;
}

function autoNumber(type, n) {
  const roman = (v) => [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']].reduce((s, [k, r]) => { while (v >= k) { s += r; v -= k; } return s; }, '');
  const base = /alpha/i.test(type) ? String.fromCharCode(96 + ((n - 1) % 26) + 1) : /roman/i.test(type) ? roman(n) : String(n);
  const cased = /UcPeriod|UcParen|Uc/.test(type) ? base.toUpperCase() : base;
  return /Paren/.test(type) ? (/ParenBoth/.test(type) ? `(${cased})` : `${cased})`) : `${cased}.`;
}
function fontStack(font) {
  const f = font && !font.startsWith('+') ? `'${font.replace(/'/g, '')}', ` : '';
  return `${f}Calibri, Carlito, Arial, Helvetica, sans-serif`;
}
