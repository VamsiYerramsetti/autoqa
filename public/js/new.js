import { $, el, api, keys } from '/js/common.js';

const view = $('#view'), picker = $('#picker');
let talk = null, key = null;

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
    el('p', { class: 'sub' }, 'PowerPoint, PDF or Word. Keynote and Google Slides: export as PowerPoint. Up to 50 MB.'),
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
      if (added?.drawn?.length) await drawnPictures(added);
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
// PowerPoint slides arrive drawn by the server as SVG. Turn each into a small JPEG here, like PDF pages,
// so the pictures load fast on the audience's phones. If this stops halfway, the SVG is still shown.
async function drawnPictures(src) {
  const total = src.drawn.length;
  for (const [i, n] of src.drawn.entries()) {
    try {
      const meta = document.querySelector('.files li.busy .meta');
      if (meta) meta.textContent = `Slide ${i + 1} of ${total}…`;
      const svg = await fetch(`/api/talks/${talk.id}/files/${src.id}/drawn/${n}`, { headers: auth() }).then((r) => (r.ok ? r.blob() : null));
      if (!svg) continue;
      const url = URL.createObjectURL(svg);
      const img = new Image();
      img.src = url;
      await img.decode();
      const width = 1600, height = Math.round(width * (img.naturalHeight || 900) / (img.naturalWidth || 1600));
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const g = canvas.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, width, height);
      g.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      if (blob) await fetch(`/api/talks/${talk.id}/files/${src.id}/pages/${n}`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'image/jpeg' }, body: blob });
    } catch (x) { console.warn('slide picture skipped:', x); }
  }
}
picker.addEventListener('change', () => { uploadFiles(picker.files); picker.value = ''; });
// The whole page is the drop target.
addEventListener('dragover', (e) => { e.preventDefault(); $('.drop')?.classList.add('over'); });
addEventListener('dragleave', (e) => { if (!e.relatedTarget) $('.drop')?.classList.remove('over'); });
addEventListener('drop', (e) => { e.preventDefault(); $('.drop')?.classList.remove('over'); uploadFiles(e.dataTransfer.files); });

/* 3. Getting to know the talk: a short back-and-forth with the speaker, by typing or by voice */
async function prepare() {
  dots(2);
  const count = talk.sources.reduce((n, s) => n + s.count, 0);
  show(el('div', { class: 'reading' }, el('div', { class: 'flip' }), el('h2', { style: 'font-size:30px' }, `Reading ${count} ${count === 1 ? 'page' : 'pages'}…`)));
  try {
    talk = await api(`/api/talks/${talk.id}/prepare`, { method: 'POST', headers: auth() });
    conversation();
  } catch (x) { files([x.message]); }
}

// Long pasted text (a transcript, a script, notes) is kept as material the answers can quote, not just as a reply.
const LONG_PASTE = 700;

function conversation() {
  dots(2);
  const thread = el('div', { class: 'chat', 'aria-live': 'polite' });
  const box = el('textarea', { rows: 1, placeholder: 'Type or speak your answer', 'aria-label': 'Your answer' });
  const send = el('button', { class: 'send', type: 'submit', 'aria-label': 'Send answer' });
  send.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 18V4m0 0-6 6m6-6 6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const mic = voiceButton(box);
  const attach = el('button', { class: 'tool', type: 'button', 'aria-label': 'Add a file: transcript, notes, paper', title: 'Add a file', onclick: () => more.click() });
  attach.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M15.5 10.5 10 16a3.5 3.5 0 0 1-5-5l6.5-6.5a2.3 2.3 0 0 1 3.3 3.3L8.6 14a1.1 1.1 0 0 1-1.6-1.6l5.5-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const more = el('input', { type: 'file', multiple: true, hidden: true, accept: '.pdf,.pptx,.key,.ppt,.odp,.docx,.txt,.md' });
  const err = el('p', { class: 'error', role: 'alert' });
  const done = el('button', { class: 'btn', type: 'button', onclick: finish }, 'Finish');
  const skip = el('button', { class: 'btn plain', type: 'button', onclick: () => reply('') }, 'Skip');
  let waiting = false, voiceUsed = false;
  mic?.addEventListener('voice', () => { voiceUsed = true; err.textContent = ''; });
  mic?.addEventListener('voiceproblem', (e) => { err.textContent = e.detail; });

  const form = el('form', { class: 'composer talkback', onsubmit: (e) => { e.preventDefault(); reply(box.value); } },
    el('div', { class: 'line' }, attach, box, mic, send));
  box.addEventListener('input', () => { box.style.height = 'auto'; box.style.height = Math.min(box.scrollHeight, 220) + 'px'; });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer: coarse)').matches) { e.preventDefault(); reply(box.value); } });
  more.addEventListener('change', () => { addFiles([...more.files]); more.value = ''; });

  show(
    el('h1', { class: 'question', style: 'margin-bottom:8px' }, 'Tell us about your talk'),
    el('p', { class: 'sub' }, 'A few questions, one at a time, so answers go beyond the slides. Type or speak. Stop whenever you like.'),
    thread, err, form, more,
    el('div', { class: 'row', style: 'margin-top:14px' }, skip, done));

  const say = (text, kind) => { const p = el('p', { class: 'turn-' + kind }, text); thread.append(p); p.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return p; };
  const thinking = () => say('', 'thinking');

  async function step(body) {
    waiting = true; send.disabled = skip.disabled = true;
    const dotsLine = thinking();
    try {
      const out = await api(`/api/talks/${talk.id}/interview`, { method: 'POST', headers: auth(), body });
      dotsLine.remove();
      if (out.note) say(out.note, 'note');
      if (out.done) { say("That's what we needed. Your talk is ready.", 'site'); done.textContent = 'Open my talk'; form.hidden = skip.hidden = true; done.focus(); return; }
      say(out.question, 'site');
      box.focus();
    } catch (x) { dotsLine.remove(); err.textContent = x.message; }
    waiting = false; send.disabled = skip.disabled = false;
  }

  async function reply(text) {
    if (waiting) return;
    text = text.trim();
    err.textContent = '';
    mic?.stop?.();
    box.value = ''; box.style.height = 'auto';
    let answer = text;
    if (text.length > LONG_PASTE) {
      // Keep the whole paste as material; the conversation records a short pointer to it.
      try { talk = await api(`/api/talks/${talk.id}/notes`, { method: 'POST', headers: auth(), body: { text } }); answer = `(Added ${text.split(/\s+/).length} words of notes as material.)`; }
      catch (x) { err.textContent = x.message; box.value = text; return; }
    }
    say(text ? (text.length > LONG_PASTE ? answer : text) : 'Skipped', text ? 'me' : 'skip');
    await step({ answer, voice: voiceUsed });
    voiceUsed = false;
  }

  async function addFiles(list) {
    for (const file of list) {
      if (file.size > 50 * 1024 * 1024) { err.textContent = `${file.name} is too big. The limit is 50 MB.`; continue; }
      const line = say(`Adding ${file.name}…`, 'me');
      const form = new FormData(); form.append('files', file);
      try {
        const before = new Set(talk.sources.map((s) => s.id));
        talk = await api(`/api/talks/${talk.id}/files`, { method: 'POST', headers: auth(), form });
        const added = talk.sources.find((s) => !before.has(s.id));
        if (talk.problems?.length) err.textContent = talk.problems.join(' ');
        line.textContent = added ? `Added ${file.name}` : `Couldn't add ${file.name}`;
        if (added?.pdf) pictures(file, added, []);
        if (added?.drawn?.length) drawnPictures(added);
      } catch (x) { line.textContent = `Couldn't add ${file.name}`; err.textContent = x.message; }
    }
  }

  // Coming back to an unfinished setup: show what was already said, then carry on from there.
  for (const x of (talk.interview || []).filter((x) => x.a != null)) { say(x.q, 'site'); say(x.a || 'Skipped', x.a ? 'me' : 'skip'); }
  step({});
}

// Speaking instead of typing. Uses the browser's own speech recognition (Chrome, Edge, Safari); the button
// is left out where the browser has none. Words appear in the box as they are heard, so they can be corrected.
function voiceButton(box) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;
  const b = el('button', { class: 'tool mic', type: 'button', 'aria-label': 'Speak your answer', 'aria-pressed': 'false', title: 'Speak' });
  b.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="8" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 10.5a6 6 0 0 0 12 0M11 16.5V19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  let rec = null, base = '';
  const stop = () => { rec?.stop(); };
  b.stop = stop;
  b.addEventListener('click', () => {
    if (rec) return stop();
    rec = new Recognition();
    rec.lang = document.documentElement.lang === 'en' ? (navigator.language || 'en-US') : document.documentElement.lang;
    rec.continuous = true; rec.interimResults = true;
    base = box.value ? box.value.replace(/\s*$/, ' ') : '';
    rec.onresult = (e) => {
      let heard = '';
      for (let i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript;
      box.value = base + heard.trimStart();
      box.dispatchEvent(new Event('input'));
    };
    rec.onstart = () => { b.setAttribute('aria-pressed', 'true'); b.dispatchEvent(new Event('voice')); };
    // Say why it didn't work, in words, instead of the button silently doing nothing.
    const WHY = {
      'not-allowed': 'Allow the microphone for this site in your browser, then tap the microphone again.',
      'service-not-allowed': 'Allow the microphone for this site in your browser, then tap the microphone again.',
      'audio-capture': 'No microphone was found.',
      'no-speech': "We didn't hear anything. Tap the microphone and try again.",
      network: 'Speaking needs an internet connection in this browser. You can type instead.',
    };
    rec.onerror = (e) => { if (WHY[e.error]) b.dispatchEvent(new CustomEvent('voiceproblem', { detail: WHY[e.error] })); };
    rec.onend = () => { b.setAttribute('aria-pressed', 'false'); rec = null; box.focus(); };
    try { rec.start(); } catch { rec = null; b.dispatchEvent(new CustomEvent('voiceproblem', { detail: "The microphone couldn't start. You can type instead." })); }
  });
  return b;
}

async function finish() {
  await api(`/api/talks/${talk.id}/ready`, { method: 'POST', headers: auth(), body: {} });
  location.href = '/s/' + talk.id + '?new=1'; // the talk page opens with "put your code on a slide"
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
