import { $, el, api, first, linkedinField, sheet as openSheet, icon } from '/js/common.js';
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Website'; } };

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
  el('p', {}, `Automated answers, drawn from ${speaker}'s slides. Anything they can't answer, you can send to ${speaker}. `, el('a', { href: '/how-answers-work', target: '_blank' }, 'How answers work')));
const suggest = el('div', { class: 'suggest' });
const input = el('textarea', { rows: 1, placeholder: 'Your question', 'aria-label': 'Your question', enterkeyhint: 'send' });
const sendBtn = el('button', { class: 'send', 'aria-label': 'Ask', disabled: true });
sendBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 18V4m0 0-6 6m6-6 6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const form = el('form', { onsubmit: (e) => { e.preventDefault(); ask(input.value); } }, input, sendBtn);
// A question being typed survives a reload or a dropped connection (this tab only).
const DRAFT = 'autoqa:draft:' + location.pathname;
try { input.value = sessionStorage.getItem(DRAFT) || ''; sendBtn.disabled = !input.value.trim(); } catch {}
input.addEventListener('input', () => { try { sessionStorage.setItem(DRAFT, input.value); } catch {} });

// Questions others sent to the speaker that are still waiting. Yellow, like every raised hand in the product.
const waitBtn = el('button', { class: 'waits', type: 'button', hidden: true, 'aria-haspopup': 'dialog', onclick: () => openWaiting() });
let waiting = [];

app.append(el('div', { class: 'ask' },
  el('header', {}, el('h1', { title: talk.title }, talk.title), el('div', { class: 'by' }, whoButton(), waitBtn, window.themeSwitch?.())),
  thread,
  el('div', { class: 'composer' }, suggest, form)));
thread.append(welcome);

input.addEventListener('input', () => {
  sendBtn.disabled = busy || !input.value.trim();
  input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px';
});
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });

// The speaker's name in the header opens a small "about" panel: who they are and how to reach them.
// Shown as a button only when the speaker has put something on their profile.
function contactLinks(where) {
  const s = talk.speaker;
  const tap = (name) => () => { api('/api/event', { method: 'POST', headers: auth, body: { name } }).catch(() => {}); };
  return [
    s.linkedin && el('a', { class: 'btn in', href: s.linkedin, target: '_blank', rel: 'noopener', onclick: tap('connect_tapped') }, icon('linkedin', 20), where === 'reply' ? 'Connect' : 'LinkedIn'),
    s.website && el('a', { class: 'btn quiet', href: s.website, target: '_blank', rel: 'noopener', onclick: tap('website_tapped') }, icon('web', 18), hostOf(s.website)),
    s.email && el('a', { class: 'btn quiet', href: `mailto:${s.email}?subject=${encodeURIComponent('Your talk: ' + talk.title)}`, onclick: tap('email_tapped') }, icon('mail', 18), 'Email'),
  ].filter(Boolean);
}
function hasProfile() { const s = talk.speaker; return Boolean(s.headline || s.bio || s.linkedin || s.email || s.website); }
function openProfile() {
  api('/api/event', { method: 'POST', headers: auth, body: { name: 'profile_opened' } }).catch(() => {});
  const s = talk.speaker;
  const links = contactLinks('profile');
  const panel = openSheet(
    el('h3', {}, s.name),
    s.headline && el('p', { class: 'headline' }, s.headline),
    s.bio && el('p', { class: 'bio' }, s.bio),
    links.length ? el('div', { class: 'reach' }, links) : el('p', { class: 'small muted' }, `${speaker} hasn't added contact details.`),
    el('button', { class: 'btn plain', type: 'button', onclick: () => panel.close() }, 'Close'));
  panel.panel.parentElement.classList.add('about');
}
function whoButton() {
  if (!hasProfile()) return el('p', {}, talk.speaker.name);
  return el('button', { class: 'who', type: 'button', 'aria-haspopup': 'dialog', onclick: openProfile }, talk.speaker.name, el('span', { 'aria-hidden': 'true' }, 'About'));
}

let chips = [...talk.suggested];
let chipsShown = new Set();
function drawChips() {
  // Three at a time: when one is used, the next one in the list takes its place (and arrives with a small rise).
  const now = chips.slice(0, 3);
  suggest.replaceChildren(...now.map((q) => el('button', { type: 'button', class: chipsShown.size && !chipsShown.has(q) ? 'fresh' : '', onclick: () => { api('/api/event', { method: 'POST', headers: auth, body: { name: 'suggestion_tapped' } }).catch(() => {}); ask(q); } }, q)));
  chipsShown = new Set(now);
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

// One field on the yellow card. Its label stays in view above what is typed (a placeholder is gone with the
// first letter), and a problem is written right under the field it belongs to.
function slot(label, props) {
  const id = 'f' + Math.random().toString(36).slice(2, 8);
  const input = el('input', { ...props, 'aria-describedby': id });
  const problem = el('p', { class: 'problem', id, role: 'alert', hidden: true });
  const box = el('label', { class: 'slot' }, el('span', {}, label), input);
  const say = (text) => {
    problem.textContent = text || ''; problem.hidden = !text;
    box.classList.toggle('bad', Boolean(text));
    if (text) { input.setAttribute('aria-invalid', 'true'); input.focus(); } else input.removeAttribute('aria-invalid');
  };
  input.addEventListener('input', () => say(''));
  return { input, say, nodes: [box, problem] };
}

// The small yellow-dotted button that opens the card: "Ask Ines too" after a general answer, "Send to Ines"
// for a card that was folded away.
const offer = (node, msg, others) => {
  const more = el('button', { class: 'also', type: 'button', onclick: () => { more.remove(); handoff(node, msg, others, true); node.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } },
    msg.alsoAnswered ? `Ask ${speaker} too` : `Send to ${speaker}`);
  return more;
};

// Only one yellow card is open at a time. An older one that was never sent folds down to its small button,
// so the chat does not fill up with forms. What was typed in it is kept for the next card.
let openCard = null;
const draft = {};
function foldCard() {
  if (openCard?.box.isConnected) openCard.box.replaceWith(offer(openCard.node, openCard.msg, openCard.others));
  openCard = null;
}

function handoff(node, msg, others = 0, open = false) {
  asked.set(msg.id, node);
  if (msg.sent) return node.append(sentNote());
  // When the answer already helped in general terms, offer the speaker as a small extra, not a big yellow card.
  if (msg.alsoAnswered && !open) return node.append(offer(node, msg, others));
  foldCard();
  const err = el('p', { class: 'problem', role: 'alert' });
  const name = slot('Your name', { autocomplete: 'name', autocapitalize: 'words', value: draft.name ?? me.name });
  const email = slot('Email', { type: 'email', autocomplete: 'email', inputmode: 'email', spellcheck: 'false', value: draft.email ?? me.email });
  // Always offered, never required; the line under it says why (Vamsi's feedback, 11 Nov).
  const link = linkedinField(draft.linkedin ?? me.linkedin, `So ${speaker} can connect with you afterwards.`);
  const known = me.name && me.email;
  // Ask with your name (the default, so the speaker can reply and connect) or without it.
  const anon = el('input', { type: 'checkbox', role: 'switch', class: 'switch' });
  const details = el('div', { class: 'details' }, !known && [...name.nodes, ...email.nodes, link.box]);
  const fine = el('p', { class: 'fine' });
  const send = el('button', { class: 'btn' }, 'Send');
  const paint = () => {
    details.hidden = anon.checked || known;
    fine.replaceChildren(anon.checked
      ? `${speaker} sees the question, not who asked. The reply still shows up here. `
      : known ? '' : `${speaker} gets your name, email and question, so they can reply. Others here see the question, never your name. `,
      (anon.checked || !known) ? el('a', { href: '/privacy', target: '_blank' }, 'Privacy') : '');
  };
  // A problem with a name or email no longer applies once the person asks without them.
  anon.addEventListener('change', () => { name.say(''); email.say(''); err.textContent = ''; paint(); });
  // Say what is missing at the field itself, before anything is sent.
  const missing = () => {
    if (anon.checked || known) return false;
    if (!name.input.value.trim()) return name.say('Add your name.'), true;
    if (!/^\S+@\S+\.\S+$/.test(email.input.value.trim())) return email.say("That email doesn't look right."), true;
    return false;
  };
  const box = el('form', { class: 'hand', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    if (send.disabled || missing()) return;
    // The button answers the press at once, and a second tap cannot send it twice.
    send.disabled = true; send.textContent = 'Sending…'; err.textContent = '';
    try {
      const body = anon.checked ? { messageId: msg.id, anonymous: true } : { messageId: msg.id, name: name.input.value, email: email.input.value, linkedin: link.value() };
      const out = await api('/api/handoff', { method: 'POST', headers: auth, body });
      me = out.me; openCard = null;
      const note = sentNote(); note.classList.add('now');
      box.replaceWith(note);
    } catch (x) {
      send.disabled = false; send.textContent = 'Send';
      // The server checks too; put its answer at the same field.
      if (!known && /name/i.test(x.message)) name.say(x.message);
      else if (!known && /email/i.test(x.message)) email.say(x.message);
      else err.textContent = x.message;
    }
  } },
    // Already answered in general terms: the card is an extra, not a dead end.
    el('h3', {}, msg.alsoAnswered ? `Ask ${speaker} too?` : `Send this to ${speaker}?`),
    others > 0 && el('p', { class: 'others' }, others === 1 ? 'Someone here already asked this.' : `${others} people here already asked this.`),
    el('label', { class: 'anon' }, anon, el('span', {}, 'Ask anonymously')),
    details, err, send, fine);
  box.addEventListener('input', () => { Object.assign(draft, { name: name.input.value, email: email.input.value, linkedin: link.value() }); });
  paint();
  node.append(box);
  openCard = { box, node, msg, others };
}
const sentNote = () => el('div', { class: 'hand sent' }, el('span', {}, `Sent to ${speaker}. The reply will show up here.`), notifyOffer());

/* When the speaker replies: a banner at the top of the chat, the page title, a short buzz, and (only if the
   person said yes) a notification from the browser while this page is open in the background. */
const canNotify = () => 'Notification' in window && Notification.permission === 'granted';
function notifyOffer() {
  if (!('Notification' in window) || Notification.permission !== 'default') return null;
  const b = el('button', { class: 'tell', type: 'button', onclick: async () => {
    const answer = await Notification.requestPermission().catch(() => 'denied');
    b.replaceWith(el('small', {}, answer === 'granted' ? 'We will tell you. Keep this page open.' : 'Notifications are off. The reply will still show up here.'));
  } }, 'Tell me when it arrives');
  return b;
}
let unread = 0;
const baseTitle = document.title;
function clearUnread() { unread = 0; document.title = baseTitle; document.querySelector('.news')?.remove(); }
function announceReply(node) {
  unread++;
  document.title = `(${unread}) ${talk.speaker.name} replied`;
  try { navigator.vibrate?.(180); } catch {}
  document.querySelector('.news')?.remove();
  const banner = el('button', { class: 'news', type: 'button', onclick: () => { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); clearUnread(); } },
    el('i', { 'aria-hidden': 'true' }), unread > 1 ? `${unread} replies from ${speaker}` : `${speaker} replied`, el('span', {}, 'See it'));
  document.querySelector('.ask header').after(banner);
  if (document.hidden && canNotify()) {
    // Phones only allow this from an installed app; there the banner and title do the job when the person returns.
    try { const n = new Notification(`${talk.speaker.name} replied`, { body: node.textContent.slice(0, 140), tag: 'autoqa-reply' }); n.onclick = () => { window.focus(); banner.click(); }; } catch {}
  }
}
addEventListener('visibilitychange', () => { if (!document.hidden) checkThread(); });

function speakerReply(msg, quiet) {
  // Under the reply: the quickest ways to reach the speaker, and who they are.
  const reach = [...contactLinks('reply').slice(0, 2), hasProfile() && el('button', { class: 'btn plain', type: 'button', onclick: openProfile }, `About ${speaker}`)].filter(Boolean);
  const reply = el('div', { class: 'from' }, el('b', {}, `${talk.speaker.name} replied`), el('p', {}, msg.text), reach.length ? el('div', { class: 'reach' }, reach) : null);
  if (!quiet) setTimeout(() => announceReply(reply));
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

// "Me too": back a question someone else sent, without a name or email. The speaker sees how many want it,
// and the reply shows up in this chat too.
let sheet = null;
function showWaiting(list) {
  waiting = list;
  const n = list.length;
  waitBtn.hidden = !n;
  waitBtn.replaceChildren(el('i', { 'aria-hidden': 'true' }), `${n} waiting for ${speaker}`);
  if (sheet) drawWaiting();
}
function drawWaiting() {
  const rows = sheet.querySelector('ul');
  if (!waiting.length) return closeWaiting();
  rows.replaceChildren(...waiting.map((w) => el('li', {},
    el('p', {}, w.question),
    el('div', { class: 'row' },
      el('span', { class: 'count' }, w.people === 1 ? '1 person' : `${w.people} people`),
      w.mine ? el('span', { class: 'yours' }, 'Yours')
        : el('button', { class: 'metoo', type: 'button', 'aria-pressed': String(w.backed), onclick: (e) => metoo(w, e.currentTarget) }, w.backed ? 'Me too ✓' : 'Me too')))));
}
async function metoo(w, btn) {
  btn.disabled = true;
  try { showWaiting((await api('/api/metoo', { method: 'POST', headers: auth, body: { id: w.id, on: !w.backed } })).waiting); }
  catch { btn.disabled = false; }
}
function openWaiting() {
  const back = document.activeElement;
  const done = el('button', { class: 'btn quiet', type: 'button', onclick: () => closeWaiting() }, 'Done');
  sheet = el('div', { class: 'sheet list', onclick: (e) => { if (e.target === sheet) closeWaiting(); } },
    el('div', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'waits-title' },
      el('h3', { id: 'waits-title' }, `Waiting for ${speaker}`),
      el('p', { class: 'small muted' }, `Want an answer too? Tap Me too. The reply shows up here; ${speaker} doesn't see your name.`),
      el('ul', {}), done));
  sheet.back = back;
  sheet.keys = (e) => { if (e.key === 'Escape') closeWaiting(); };
  addEventListener('keydown', sheet.keys);
  document.body.append(sheet);
  drawWaiting();
  sheet.querySelector('button')?.focus();
}
function closeWaiting() {
  if (!sheet) return;
  removeEventListener('keydown', sheet.keys);
  sheet.remove(); sheet.back?.focus?.({ preventScroll: true }); sheet = null;
}

async function ask(text) {
  text = (text || '').trim();
  if (!text || busy) return;
  busy = true; sendBtn.disabled = true;
  input.value = ''; input.style.height = 'auto';
  try { sessionStorage.removeItem(DRAFT); } catch {}
  chips = chips.filter((c) => c !== text); drawChips();
  foldCard(); // an unsent yellow card above makes way for the new question
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
          if (ev.message.handoff) { handoff(node, ev.message, ev.others); node.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        }
      }
    }
  } catch (x) {
    a.classList.remove('caret');
    // Nothing is lost: the question goes back in the box and one tap sends it again.
    a.replaceChildren(el('span', { class: 'error' }, x.message === 'Failed to fetch' ? 'No connection just now.' : x.message), ' ',
      el('button', { class: 'chip', type: 'button', onclick: () => { node.remove(); ask(text); } }, 'Try again'));
    if (!input.value) { input.value = text; sendBtn.disabled = false; }
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
showWaiting(talk.waiting || []);

async function checkThread() {
  // In the background we only keep checking when the person asked to be told about replies.
  if (busy || (document.hidden && !canNotify())) return;
  try {
    const { messages, waiting: list } = await api('/api/thread?since=' + seen, { headers: auth });
    showWaiting(list);
    for (const m of messages) {
      if (shown.has(m.id)) continue;
      shown.add(m.id); seen = Math.max(seen, m.createdAt);
      if (m.role === 'speaker') speakerReply(m);
    }
  } catch {}
}
setInterval(checkThread, 4000);
