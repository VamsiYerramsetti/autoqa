// "Put your QR code on a slide": the speaker picks a code style and a slide design from two rows of previews, then downloads
// exactly what they picked. Nothing downloads on opening. Opened from the speaker page (speaker.js).
import { el, sheet, icon } from '/js/common.js';
import { CODE_STYLES, SLIDES, slideAssets, drawSlide, drawAnimatedFrame, animatedGif, GIF_FRAMES, GIF_DELAY } from '/js/qrkit.js';

// The last code style picked on this device, so the full-screen code page can show the same one.
export const STYLE_KEY = 'autoqa-qr-style';
const remember = { get: () => { try { return localStorage.getItem(STYLE_KEY); } catch { return null; } },
  set: (v) => { try { localStorage.setItem(STYLE_KEY, v); } catch {} } };
const calm = matchMedia('(prefers-reduced-motion: reduce)');

// A row of choices that behaves like radio buttons: one picked, arrow keys move, one Tab stop.
function choiceRow(label, items, picked, onPick, preview) {
  const row = el('div', { class: 'pick-row', role: 'radiogroup', 'aria-label': label });
  const tiles = items.map((it) => {
    const tile = el('button', { type: 'button', role: 'radio', class: 'pick', 'data-id': it.id },
      el('span', { class: 'pick-look' }, preview(it)), el('b', {}, it.name), el('span', { class: 'small muted' }, it.note));
    tile.onclick = () => choose(it.id, true);
    return tile;
  });
  function choose(id, user) {
    for (const t of tiles) {
      const on = t.dataset.id === id;
      t.setAttribute('aria-checked', on); t.tabIndex = on ? 0 : -1;
      if (on && user) t.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: calm.matches ? 'auto' : 'smooth' });
    }
    onPick(id);
  }
  row.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = tiles.indexOf(document.activeElement), next = tiles[(i + step + tiles.length) % tiles.length];
    choose(next.dataset.id, true); next.focus();
  });
  row.append(...tiles);
  choose(picked, false);
  return { row, tiles };
}

export async function openChooser(talk) {
  const id = talk.id, joinUrl = new URL(talk.joinUrl), short = joinUrl.host + '/j/' + talk.code;
  const q = await fetch(`/api/talks/${id}/qr.json`).then((r) => r.json());
  const fileName = (talk.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'talk').toLowerCase();
  let style = CODE_STYLES.some((s) => s.id === remember.get()) ? remember.get() : 'autoqa', design = 'cobalt';
  const assets = new Map(); // code style → what the slides need, loaded once
  const assetsFor = (s) => { if (!assets.has(s)) assets.set(s, slideAssets(talk, s, q)); return assets.get(s); };

  const save = (blob, name) => { const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const pngOf = (canvas) => new Promise((r) => canvas.toBlob(r, 'image/png'));
  const done = (btn, text) => { const was = btn.lastChild.textContent; btn.lastChild.textContent = text; btn.classList.add('ok'); setTimeout(() => { btn.lastChild.textContent = was; btn.classList.remove('ok'); }, 1800); };
  const busy = async (btn, text, job) => { const was = btn.lastChild.textContent; btn.disabled = true; btn.lastChild.textContent = text; try { await job(); } finally { btn.disabled = false; btn.lastChild.textContent = was; } };

  // The moving preview of the animated code: one small canvas, stepped like the GIF, still under "reduce motion".
  const live = el('canvas', { width: 320, height: 320, 'aria-hidden': 'true' });
  let tick = 0, opened = false;
  const step = () => { drawAnimatedFrame(live.getContext('2d'), q, 320, calm.matches ? 0.25 : (tick++ % GIF_FRAMES) / GIF_FRAMES); };
  step();
  const timer = setInterval(() => { if (opened && !live.isConnected) return clearInterval(timer); if (!calm.matches) step(); }, GIF_DELAY);

  const codeLook = (s) => (s.gif ? live : el('img', { src: `/api/talks/${id}/qr.svg?style=${s.id}`, alt: '', loading: 'lazy' }));
  const thumbs = new Map(SLIDES.map((d) => [d.id, el('canvas', { width: 384, height: 216, 'aria-hidden': 'true' })]));
  const big = document.createElement('canvas');
  async function paintSlides() {
    const want = style, a = await assetsFor(want);
    for (const d of SLIDES) {
      if (want !== style) return; // a newer pick is already painting
      drawSlide(big, d.id, a);
      const g = thumbs.get(d.id).getContext('2d'); g.clearRect(0, 0, 384, 216); g.drawImage(big, 0, 0, 384, 216);
    }
  }

  const codeFiles = el('div', { class: 'qr-files' });
  const stillNote = el('p', { class: 'small muted' }, 'On a slide, the animated code is a still. Download the GIF to place it moving.');
  const codeRow = choiceRow('Code style', CODE_STYLES, style, (s) => {
    style = s; remember.set(s); stillNote.hidden = s !== 'animated'; paintCodeFiles(); paintSlides();
  }, codeLook);
  const slideRow = choiceRow('Slide', SLIDES, design, (d) => { design = d; }, (d) => thumbs.get(d.id));

  // A still code as a 1200 px PNG, kept in proportion (framed styles are taller than wide).
  async function codePng() {
    const a = await assetsFor(style), iw = a.code.naturalWidth || a.code.width, ih = a.code.naturalHeight || a.code.height;
    const c = document.createElement('canvas'); c.width = 1200; c.height = Math.round(1200 * ih / iw);
    c.getContext('2d').drawImage(a.code, 0, 0, c.width, c.height);
    return pngOf(c);
  }
  function paintCodeFiles() {
    const s = CODE_STYLES.find((x) => x.id === style);
    if (s.gif) {
      const gif = el('button', { class: 'btn quiet', type: 'button' }, icon('down', 18), 'Download code (GIF)');
      gif.onclick = () => busy(gif, 'Making the GIF…', async () => save(await animatedGif(q), `auto-qa-${fileName}-animated.gif`));
      codeFiles.replaceChildren(gif);
    } else {
      const png = el('button', { class: 'btn quiet', type: 'button' }, icon('down', 18), 'Download code (PNG)');
      png.onclick = async () => save(await codePng(), `auto-qa-${fileName}-${style}.png`);
      const svg = el('button', { class: 'btn quiet', type: 'button' }, icon('down', 18), 'SVG');
      svg.onclick = async () => save(await fetch(`/api/talks/${id}/qr.svg?style=${style}`).then((r) => r.blob()), `auto-qa-${fileName}-${style}.svg`);
      codeFiles.replaceChildren(png, svg);
    }
    codeFiles.classList.toggle('one', Boolean(s.gif));
  }
  paintCodeFiles();

  const slideBtn = el('button', { class: 'btn', type: 'button' }, icon('slide', 18), 'Download slide (PNG)');
  slideBtn.onclick = () => busy(slideBtn, 'Drawing…', async () => save(await pngOf(drawSlide(document.createElement('canvas'), design, await assetsFor(style))), `auto-qa-slide-${design}-${fileName}.png`));
  const copyLink = el('button', { class: 'btn quiet', type: 'button' }, icon('link', 18), short);
  copyLink.onclick = async () => { try { await navigator.clipboard.writeText(joinUrl.href); done(copyLink, 'Link copied'); } catch {} };

  const panel = sheet(
    el('h3', {}, 'Put your QR code on a slide'),
    el('p', { class: 'small muted' }, 'Pick a code and a slide, then download. People scan it and ask.'),
    el('h4', { id: 'pick-code' }, 'Code style'), codeRow.row,
    el('h4', { id: 'pick-slide' }, 'Slide'), slideRow.row,
    stillNote,
    slideBtn, codeFiles, copyLink,
    el('button', { class: 'btn plain', type: 'button', onclick: () => panel.close() }, 'Done'));
  panel.panel.parentElement.classList.add('share', 'qrpick');
  codeRow.row.setAttribute('aria-labelledby', 'pick-code'); slideRow.row.setAttribute('aria-labelledby', 'pick-slide');
  opened = true;
  codeRow.tiles.find((t) => t.dataset.id === style)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
