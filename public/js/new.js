import { $, el, api, keys } from '/js/common.js';

const view = $('#view'), picker = $('#picker');
let talk = null, key = null, answers = [];

function dots(step) {
  document.querySelectorAll('.dots i').forEach((d, i) => { d.className = i < step ? 'on' : i === step ? 'now' : ''; });
}
const auth = () => ({ 'x-key': key });
// flat(): a step may pass a list (for example several upload problems) among its parts.
const show = (...nodes) => { view.replaceChildren(...nodes.flat()); window.scrollTo(0, 0); };

/* 1. Who and what */
function details() {
  dots(0);
  const err = el('p', { class: 'error', role: 'alert' });
  const form = el('form', { class: 'stack', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    try {
      const made = await api('/api/talks', { method: 'POST', body: Object.fromEntries(f) });
      key = made.key; keys.set(made.id, key);
      history.replaceState(null, '', '/new?talk=' + made.id);
      talk = await api('/api/talks/' + made.id, { headers: auth() });
      files();
    } catch (x) { err.textContent = x.message; }
  } },
    el('label', { class: 'field' }, el('span', {}, 'Talk title'), el('input', { name: 'title', required: true, autocomplete: 'off', autofocus: true })),
    err,
    el('div', { class: 'row', style: 'margin-top:8px' }, el('span'), el('button', { class: 'btn' }, 'Continue')),
  );
  show(el('h1', {}, 'What are you presenting?'), el('p', { class: 'sub' }, 'Takes about three minutes.'), form);
}

/* 2. Material */
function files(problems = [], busy = []) {
  dots(1);
  const next = el('button', { class: 'btn', disabled: !talk.sources.length || busy.length > 0, onclick: prepare }, 'Continue');
  const drop = el('div', { class: 'drop', role: 'button', tabindex: 0, onclick: () => picker.click(),
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); } } },
    icon(), el('strong', {}, 'Drop your slides here'), el('span', { class: 'muted' }, 'or choose a file'));
  const list = el('ul', { class: 'files' },
    talk.sources.map((s) => el('li', {},
      el('span', { class: 'ico' }),
      el('div', { class: 'grow' }, el('div', { class: 'name' }, s.name), el('div', { class: 'meta' }, s.kind === 'Notes' ? 'Added' : `${s.count} ${s.kind.toLowerCase()}${s.count === 1 ? '' : 's'}` + (s.deck ? '. Export as PDF to show the real slides in answers.' : ''))),
      el('button', { 'aria-label': 'Remove ' + s.name, onclick: async () => { talk = await api(`/api/talks/${talk.id}/files/${s.id}`, { method: 'DELETE', headers: auth() }); files(); } }, '×'))),
    busy.map((name) => el('li', { class: 'busy' }, el('span', { class: 'ico' }), el('div', { class: 'grow' }, el('div', { class: 'name' }, name), el('div', { class: 'meta' }, 'Reading…')))),
  );
  const notes = el('textarea', { placeholder: 'Paste anything else people might ask about: results, prices, dates, links.' });
  const notesBox = el('div', { class: 'stack', hidden: true, style: 'margin-top:18px' },
    el('label', { class: 'field' }, el('span', {}, 'Extra notes'), notes),
    el('div', {}, el('button', { class: 'btn quiet', onclick: async () => {
      if (!notes.value.trim()) return;
      talk = await api(`/api/talks/${talk.id}/notes`, { method: 'POST', headers: auth(), body: { text: notes.value } }); files();
    } }, 'Add notes')));
  show(
    el('h1', {}, 'Add your slides'),
    el('p', { class: 'sub' }, 'PDF, PowerPoint or Word. Up to 50 MB each.'),
    drop, list,
    problems.map((p) => el('p', { class: 'error', role: 'alert', style: 'margin-top:12px' }, p)),
    notesBox,
    el('div', { class: 'row' },
      el('button', { class: 'btn plain', style: 'padding-left:0', onclick: (e) => { notesBox.hidden = false; e.target.hidden = true; notes.focus(); } }, 'Add notes too'),
      next),
  );
}

function icon() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', 56); s.setAttribute('height', 56); s.setAttribute('viewBox', '0 0 56 56'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<circle cx="28" cy="28" r="28" fill="#2f3ced"/><path d="M28 39V19m0 0-8 8m8-8 8 8" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return s;
}

async function uploadFiles(list) {
  if (!talk || !list.length) return;
  const picked = [...list], problems = [];
  for (const [i, file] of picked.entries()) {
    if (file.size > 50 * 1024 * 1024) { problems.push(`${file.name} is too big. The limit is 50 MB.`); continue; }
    const waiting = picked.slice(i).map((f) => f.name);
    files([], waiting);
    const form = new FormData();
    form.append('files', file);
    try {
      const before = new Set(talk.sources.map((s) => s.id));
      const out = await api(`/api/talks/${talk.id}/files`, { method: 'POST', headers: auth(), form });
      talk = out; problems.push(...out.problems);
      const added = talk.sources.find((s) => !before.has(s.id));
      if (added?.pdf) await pictures(file, added, waiting);
    } catch (x) { problems.push(x.message); }
  }
  try { talk = await api('/api/talks/' + talk.id, { headers: auth() }); } catch {}
  files(problems);
}

// Turn each PDF page into a picture, here in the browser, so answers can show the real slide.
async function pictures(file, src, waiting) {
  try {
    const pdfjs = await import('/vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const total = Math.min(doc.numPages, 300);
    for (let n = 1; n <= total; n++) {
      const meta = document.querySelector('.files li.busy .meta');
      if (meta) meta.textContent = `Slide ${n} of ${total}…`;
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2.5, 1400 / base.width) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), canvas, viewport }).promise;
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
      await fetch(`/api/talks/${talk.id}/files/${src.id}/pages/${n}`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'image/jpeg' }, body: blob });
    }
  } catch (x) { console.warn('slide pictures skipped:', x); }
}
picker.addEventListener('change', () => { uploadFiles(picker.files); picker.value = ''; });
// The whole page is the drop target.
addEventListener('dragover', (e) => { e.preventDefault(); $('.drop')?.classList.add('over'); });
addEventListener('dragleave', (e) => { if (!e.relatedTarget) $('.drop')?.classList.remove('over'); });
addEventListener('drop', (e) => { e.preventDefault(); $('.drop')?.classList.remove('over'); uploadFiles(e.dataTransfer.files); });

/* 3. A few quick questions */
async function prepare() {
  dots(2);
  const count = talk.sources.reduce((n, s) => n + s.count, 0);
  show(el('div', { class: 'reading' }, el('div', { class: 'flip' }), el('h2', { style: 'font-size:30px' }, `Reading ${count} ${count === 1 ? 'page' : 'pages'}…`)));
  try {
    talk = await api(`/api/talks/${talk.id}/prepare`, { method: 'POST', headers: auth() });
    answers = talk.interview.map((x) => x.a || '');
    interview(0);
  } catch (x) { files([x.message]); }
}

function interview(i) {
  dots(2);
  const total = talk.interview.length;
  if (i >= total) return finish();
  const box = el('textarea', { placeholder: 'A sentence or two is plenty.', 'aria-label': talk.interview[i].q });
  box.value = answers[i];
  const go = (keep) => { answers[i] = keep ? box.value.trim() : ''; interview(i + 1); };
  show(
    el('p', { class: 'count' }, `${i + 1} of ${total}`),
    el('h1', { class: 'question' }, talk.interview[i].q),
    el('label', { class: 'field' }, box),
    el('div', { class: 'row' },
      el('button', { class: 'btn plain', style: 'padding-left:0', onclick: () => (i ? interview(i - 1) : files()) }, 'Back'),
      el('div', { style: 'display:flex;gap:6px' },
        el('button', { class: 'btn plain', onclick: () => go(false) }, 'Skip'),
        el('button', { class: 'btn', onclick: () => go(true) }, i === total - 1 ? 'Finish' : 'Next'))),
  );
  box.focus();
}

async function finish() {
  await api(`/api/talks/${talk.id}/ready`, { method: 'POST', headers: auth(), body: { answers } });
  location.href = '/s/' + talk.id;
}

/* Resume after a reload */
// Talks belong to an account, so sign in first.
const { me } = await api('/api/me');
if (!me) { location.replace('/signup?next=' + encodeURIComponent(location.pathname + location.search)); await new Promise(() => {}); }

const resume = new URLSearchParams(location.search).get('talk');
if (resume) {
  key = keys.get(resume) || '';
  try { talk = await api('/api/talks/' + resume, { headers: auth() }); key = talk.key; keys.set(talk.id, key); files(); } catch { details(); }
} else details();
