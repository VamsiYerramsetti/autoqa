import { $, el, api, first } from '/js/common.js';

const code = location.pathname.split('/').pop().toUpperCase();
const store = 'autoqa:seat:' + code;
const app = $('#app');
let token = null;
try { token = localStorage.getItem(store); } catch {}

let talk;
try {
  talk = await api('/api/join/' + code, { headers: token ? { 'x-token': token } : {} });
} catch (x) {
  // Wrong code: let people type it again from the screen. Not open yet: say so and keep it simple.
  const wrong = x.status === 404;
  const box = el('input', { class: 'input', placeholder: 'Code', 'aria-label': 'Code', autocapitalize: 'characters', autocomplete: 'off', maxlength: 8, value: wrong ? '' : code });
  app.append(el('div', { class: 'closed' }, el('div', {},
    el('h1', {}, wrong ? 'No talk with that code' : 'Not open yet'),
    el('p', { class: 'muted' }, wrong ? 'Check the code on the screen and try again.' : x.message),
    wrong && el('form', { class: 'retry', onsubmit: (e) => { e.preventDefault(); const c = box.value.replace(/[^a-z0-9]/gi, '').toUpperCase(); if (c) location.href = '/j/' + c; } },
      box, el('button', { class: 'btn' }, 'Go')),
    !wrong && el('button', { class: 'btn quiet', style: 'margin-top:24px', onclick: () => location.reload() }, 'Try again'))));
  throw x;
}
token = talk.token;
try { localStorage.setItem(store, token); } catch {}
const auth = { 'x-token': token };
const speaker = first(talk.speaker.name);
let me = talk.me, busy = false, seen = 0;
const shown = new Set();
document.title = talk.title;

const thread = el('main', { class: 'thread', 'aria-live': 'polite' });
const welcome = el('div', { class: 'welcome' },
  el('h2', {}, 'Ask about this talk.'),
  el('p', {}, `Automated answers, drawn from ${speaker}'s slides. Anything they can't answer, you can send to ${speaker}.`));
const suggest = el('div', { class: 'suggest' });
const input = el('textarea', { rows: 1, placeholder: 'Your question', 'aria-label': 'Your question', enterkeyhint: 'send' });
const sendBtn = el('button', { class: 'send', 'aria-label': 'Ask', disabled: true });
sendBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 18V4m0 0-6 6m6-6 6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const form = el('form', { onsubmit: (e) => { e.preventDefault(); ask(input.value); } }, input, sendBtn);

app.append(el('div', { class: 'ask' },
  el('header', {}, el('h1', { title: talk.title }, talk.title), el('p', {}, talk.speaker.name)),
  thread,
  el('div', { class: 'composer' }, suggest, form)));
thread.append(welcome);

input.addEventListener('input', () => {
  sendBtn.disabled = busy || !input.value.trim();
  input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px';
});
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });

let chips = [...talk.suggested];
function drawChips() {
  suggest.replaceChildren(...chips.map((q) => el('button', { type: 'button', onclick: () => { api('/api/event', { method: 'POST', headers: auth, body: { name: 'suggestion_tapped' } }).catch(() => {}); ask(q); } }, q)));
  suggest.hidden = !chips.length;
}
drawChips();

// An answer opens with the slide it rests on, e.g. "[Slide 4] ...". We show that slide, then the words.
const LABEL = /\[((?:Slide|Page|Part|Notes)(?: \d+)?(?: · [^\[\]\n]{1,40})?)\]/g;
function split(text) {
  const labels = [];
  let rest = text;
  for (;;) {
    const m = rest.match(/^\s*\[((?:Slide|Page|Part|Notes)(?: \d+)?(?: · [^\[\]\n]{1,40})?)\]\s*/);
    if (!m) break;
    labels.push(m[1]); rest = rest.slice(m[0].length);
  }
  // While the answer is still arriving, don't flash a half-written label.
  if (/^\s*\[[^\]]*$/.test(rest)) rest = '';
  return { labels, rest };
}

function fill(parts, text) {
  const { labels, rest } = split(text);
  labels.slice(0, 2).forEach((l) => slide(parts, l));
  parts.a.replaceChildren();
  rest.split(LABEL).forEach((piece, i) => {
    if (i % 2 === 0) { if (piece) parts.a.append(piece); return; }
    parts.a.append(el('button', { class: 'chip', type: 'button', onclick: () => slide(parts, piece, true) }, piece));
  });
}

const sources = new Map();
function source(label) {
  if (!sources.has(label)) sources.set(label, api('/api/source?label=' + encodeURIComponent(label), { headers: auth }).catch(() => null));
  return sources.get(label);
}

// Add a slide to the strip above an answer (once), and optionally bring it into view.
function slide(parts, label, reveal) {
  let fig = [...parts.deck.children].find((f) => f.dataset.label === label);
  if (!fig) {
    fig = el('figure', { class: 'slide', 'data-label': label }, el('div', { class: 'frame' }), el('figcaption', {}, label));
    parts.deck.append(fig);
    parts.deck.hidden = false;
    parts.deck.classList.toggle('many', parts.deck.children.length > 1);
    source(label).then((src) => {
      if (!src) return fig.remove();
      const frame = fig.firstElementChild;
      if (src.image) {
        const img = el('img', { src: src.image, alt: '', loading: 'lazy' });
        img.addEventListener('load', () => frame.classList.add('ready'));
        frame.append(img);
      } else {
        frame.classList.add('ready', 'text');
        frame.append(el('strong', {}, src.title), el('ul', {}, src.lines.map((l) => el('li', {}, l))));
      }
      // Every slide opens larger, whether it is a picture (PDF) or laid-out text (PowerPoint).
      frame.append(el('span', { class: 'cue', 'aria-hidden': 'true' }));
      frame.setAttribute('role', 'button'); frame.tabIndex = 0;
      frame.setAttribute('aria-label', `${src.label}: ${src.title}. Open larger`);
      frame.addEventListener('click', () => zoom(src, frame));
      frame.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoom(src, frame); } });
    });
  }
  if (reveal) fig.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// Where the slide itself sits inside its frame (a picture may be narrower than the 16:9 frame).
function slideBox(frame, ratio) {
  const r = frame.getBoundingClientRect();
  const width = Math.min(r.width, r.height * ratio), height = width / ratio;
  return { left: r.left + (r.width - width) / 2, top: r.top + (r.height - height) / 2, width, height };
}

// Open a slide large. It grows out of its place in the chat and goes back there when closed, so it is
// plainly the same slide, not a new screen. Close by tapping anywhere, the button, Escape or dragging it down.
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(.2, 0, 0, 1)';
function zoom(src, frame) {
  api('/api/event', { method: 'POST', headers: auth, body: { name: 'slide_opened' } }).catch(() => {});
  const picture = frame.querySelector('img');
  const ratio = picture ? picture.naturalWidth / picture.naturalHeight || 16 / 9 : 16 / 9;
  // A picture is simply shown bigger. A text slide is a copy of the small one, scaled up so it keeps its layout.
  const big = picture ? el('img', { src: src.image, alt: `${src.label}: ${src.title}` }) : frame.cloneNode(true);
  const small = frame.offsetWidth;
  if (!picture) {
    for (const name of ['role', 'tabindex', 'aria-label']) big.removeAttribute(name);
    big.style.width = small + 'px'; big.style.height = frame.offsetHeight + 'px';
  }
  const stage = el('div', { class: 'stage' }, big);
  const shade = el('div', { class: 'shade' });
  const shut = el('button', { class: 'btn', type: 'button' }, 'Close');
  const box = el('div', { class: 'zoom', role: 'dialog', 'aria-modal': 'true', 'aria-label': src.label }, shade, stage, shut);

  // The largest size that fits the screen, leaving room for the Close button. Edge to edge on a phone.
  let home;
  function place() {
    const edge = innerWidth > 620 ? 24 : 0;
    const width = Math.min(innerWidth - 2 * edge, (innerHeight - 136) * ratio), height = width / ratio;
    home = { left: (innerWidth - width) / 2, top: Math.max(12, (innerHeight - 76 - height) / 2), width, height };
    for (const side in home) stage.style[side] = home[side] + 'px';
    if (!picture) big.style.transform = `scale(${width / small})`;
  }
  // The move that puts the large slide exactly over the small one.
  function toSmall() {
    const t = slideBox(frame, ratio);
    return `translate(${t.left - home.left}px, ${t.top - home.top}px) scale(${t.width / home.width})`;
  }
  const fade = (node, from, to, ms) => node.animate([{ opacity: from }, { opacity: to }], { duration: ms, fill: 'forwards' });

  let closing = false;
  function close() {
    if (closing) return;
    closing = true;
    removeEventListener('keydown', keys); removeEventListener('resize', place);
    // Going back is a little quicker than arriving (250ms against 300ms), as leaving should be.
    const ms = calm.matches ? 120 : 250;
    fade(shade, getComputedStyle(shade).opacity, 0, ms); fade(shut, 1, 0, ms);
    const back = calm.matches ? fade(stage, 1, 0, ms)
      : stage.animate([{ transform: stage.style.transform || 'none' }, { transform: toSmall() }], { duration: ms, easing: EASE, fill: 'forwards' });
    back.finished.then(() => { box.remove(); frame.classList.remove('away'); frame.focus({ preventScroll: true }); });
  }
  // Keyboard: Escape closes; Tab stays on the one button there is.
  function keys(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { e.preventDefault(); shut.focus(); }
  }

  // Drag down to put the slide away, like a photo in a messaging app. If the person has pinched to zoom
  // in, we leave their finger alone so they can move around the slide.
  const pinched = () => (window.visualViewport?.scale || 1) > 1.01;
  let startY = null, pulled = 0, dragged = false;
  box.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && e.isPrimary && !pinched()) { startY = e.clientY; pulled = 0; dragged = false; } });
  box.addEventListener('pointermove', (e) => {
    if (startY == null) return;
    pulled = Math.max(0, e.clientY - startY);
    if (pulled > 6) dragged = true;
    stage.style.transform = `translate(0px, ${pulled}px) scale(1)`;
    shade.style.opacity = 1 - Math.min(pulled / 400, 0.6);
  });
  const release = () => {
    if (startY == null) return;
    startY = null;
    if (pulled > 90) return close();
    if (pulled) stage.animate([{ transform: stage.style.transform }, { transform: 'none' }], { duration: 200, easing: EASE });
    stage.style.transform = ''; shade.style.opacity = '';
  };
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', release);
  box.addEventListener('click', () => { if (dragged) dragged = false; else close(); });
  window.visualViewport?.addEventListener('resize', () => { box.style.touchAction = pinched() ? 'auto' : ''; });

  addEventListener('keydown', keys); addEventListener('resize', place);
  document.body.append(box);
  place();
  frame.classList.add('away'); // the small slide has "left" its place while the large one is open
  fade(shade, 0, 1, calm.matches ? 120 : 200); fade(shut, 0, 1, calm.matches ? 120 : 200);
  if (calm.matches) fade(stage, 0, 1, 120);
  else stage.animate([{ transform: toSmall() }, { transform: 'none' }], { duration: 300, easing: EASE });
  shut.focus({ preventScroll: true });
}

function turn(question) {
  welcome.remove();
  const a = el('div', { class: 'a' }), deck = el('div', { class: 'deck', hidden: true });
  // Long questions are set as text, not as a headline, so the answer is still on screen (see .q.long).
  const node = el('section', { class: 'turn' }, el('h2', { class: question.length > 110 ? 'q long' : 'q' }, question), deck, a);
  thread.append(node);
  return { node, a, deck };
}

const asked = new Map(); // message id of an unanswered question -> its place in the chat
function handoff(node, msg) {
  asked.set(msg.id, node);
  if (msg.sent) return node.append(sentNote());
  const err = el('p', { class: 'error', role: 'alert' });
  const name = el('input', { placeholder: 'Your name', autocomplete: 'name', value: me.name, 'aria-label': 'Your name' });
  const email = el('input', { placeholder: 'Email', type: 'email', autocomplete: 'email', inputmode: 'email', value: me.email, 'aria-label': 'Email' });
  const link = el('input', { placeholder: 'LinkedIn link (optional)', value: me.linkedin, 'aria-label': 'LinkedIn link, optional', inputmode: 'url' });
  const known = me.name && me.email;
  const box = el('form', { class: 'hand', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    try {
      const out = await api('/api/handoff', { method: 'POST', headers: auth, body: { messageId: msg.id, name: name.value, email: email.value, linkedin: link.value } });
      me = out.me; box.replaceWith(sentNote());
    } catch (x) { err.textContent = x.message; }
  } },
    el('h3', {}, `Send this to ${speaker}?`),
    !known && name, !known && email, !known && link, err,
    el('button', { class: 'btn' }, `Send to ${speaker}`),
    !known && el('p', { class: 'fine' }, `${speaker} gets your name, email and question, so they can reply. Nothing else. `, el('a', { href: '/privacy', target: '_blank' }, 'Privacy')));
  node.append(box);
}
const sentNote = () => el('div', { class: 'hand sent' }, `Sent to ${speaker}. The reply will show up here.`);

function speakerReply(msg, quiet) {
  const reply = el('div', { class: 'from' }, el('b', {}, `${talk.speaker.name} replied`), msg.text,
    talk.speaker.linkedin && el('div', {}, el('a', { href: talk.speaker.linkedin, target: '_blank', rel: 'noopener', onclick: () => { api('/api/event', { method: 'POST', headers: auth, body: { name: 'connect_tapped' } }).catch(() => {}); } }, `Connect with ${speaker} on LinkedIn`)));
  welcome.remove();
  // Under the person's own question when we can find it; otherwise as a new entry with the question on top.
  const home = asked.get(msg.replyTo);
  if (home) {
    home.querySelector('.hand.sent')?.remove();
    home.append(reply);
    if (!quiet) reply.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  const node = el('section', { class: 'turn' }, msg.about && el('h2', { class: 'q' }, msg.about), reply);
  thread.append(node);
  if (!quiet) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function ask(text) {
  text = (text || '').trim();
  if (!text || busy) return;
  busy = true; sendBtn.disabled = true;
  input.value = ''; input.style.height = 'auto';
  chips = chips.filter((c) => c !== text); drawChips();
  const parts = turn(text), { node, a } = parts;
  // Keep the question at the top of the screen while the answer writes itself below it.
  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  let answer = '';
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ text }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Something went wrong. Try again.');
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '';
    a.classList.add('caret');
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.t === 'delta') { answer += ev.text; fill(parts, answer); }
        if (ev.t === 'done') {
          a.classList.remove('caret'); fill(parts, ev.message.text);
          shown.add(ev.message.id); seen = Math.max(seen, ev.message.createdAt);
          if (ev.message.handoff) { handoff(node, ev.message); node.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        }
      }
    }
  } catch (x) {
    a.classList.remove('caret');
    a.replaceChildren(el('span', { class: 'error' }, x.message));
  }
  busy = false; sendBtn.disabled = !input.value.trim();
}

// Rebuild what was said before (after a refresh), then watch for the speaker's replies.
let pending = null;
for (const m of talk.messages) {
  shown.add(m.id); seen = Math.max(seen, m.createdAt);
  if (m.role === 'user') pending = turn(m.text);
  else if (m.role === 'assistant' && pending) { fill(pending, m.text); if (m.handoff) handoff(pending.node, m); pending = null; }
  else if (m.role === 'speaker') speakerReply(m, true);
}
chips = chips.filter((c) => !talk.messages.some((m) => m.text === c)); drawChips();

setInterval(async () => {
  if (busy || document.hidden) return;
  try {
    const { messages } = await api('/api/thread?since=' + seen, { headers: auth });
    for (const m of messages) {
      if (shown.has(m.id)) continue;
      shown.add(m.id); seen = Math.max(seen, m.createdAt);
      if (m.role === 'speaker') speakerReply(m);
    }
  } catch {}
}, 4000);
