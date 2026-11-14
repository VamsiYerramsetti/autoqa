import { $, el, api, keys, first, room, linkedinField, sheet, icon } from '/js/common.js';

const id = location.pathname.split('/').pop();
// Opening the private link on a phone carries the key in the address; keep it and tidy the address.
if (location.hash.length > 1) { keys.set(id, location.hash.slice(1)); history.replaceState(null, '', location.pathname); }
let key = keys.get(id) || '';
const auth = { 'x-key': key };
const view = $('#view');
let talk, drafts = {}, lastSig = '';

try {
  talk = await api('/api/talks/' + id, { headers: auth });
  key = auth['x-key'] = talk.key; keys.set(id, key); // signed in on a new device: pick up the private link
} catch {
  view.append(el('div', { class: 'empty', style: 'margin-top:60px' }, el('strong', {}, 'Sign in to open this talk'), el('p', { style: 'margin-bottom:16px' }, 'It belongs to an account.'), el('a', { class: 'btn', href: '/signin?next=' + encodeURIComponent(location.pathname) }, 'Sign in')));
  throw new Error('no access');
}
if (talk.status !== 'ready') location.replace('/new?talk=' + id);
keys.setCode(talk.code, key); // scanning your own code on this device then opens a test seat
document.title = talk.title + ' · Auto Q&A';
$('#code').replaceChildren('Code ' + talk.code, ' · ', el('a', { href: '/talks' }, 'Your talks'));

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const nums = { people: el('b', {}, '0'), questions: el('b', {}, '0'), waiting: el('b', {}, '0') };
const waitingBox = el('div', {}, nums.waiting, el('span', {}, 'need you'));
const cards = el('div', { class: 'cards' });
const summary = el('div', { class: 'summary trends', hidden: true });
const feedbackBox = el('section', { class: 'feedback', hidden: true });
const knows = el('section', { class: 'knows' });
let lastFb = '';

// "How the audience sees you": a short profile people can open from the chat, with ways to reach you.
const profileLine = el('span', { class: 'small muted' });
function paintProfile() {
  const p = talk.profile || {};
  const parts = [p.headline, p.linkedin && 'LinkedIn', p.email && 'Email', p.website && 'Website'].filter(Boolean);
  profileLine.textContent = parts.length ? parts.join(', ') : 'Nothing yet. Add who you are and how to reach you.';
}
function editProfile() {
  const p = talk.profile || {};
  const headline = el('input', { maxlength: 120, placeholder: 'Water engineer, Delft Water Lab' }); headline.value = p.headline || '';
  const bio = el('textarea', { maxlength: 600, rows: 3, placeholder: 'Two or three sentences about you and your work.' }); bio.value = p.bio || '';
  const link = linkedinField(p.linkedin, '');
  const site = el('input', { inputmode: 'url', autocapitalize: 'none', spellcheck: 'false', placeholder: 'your-site.org' }); site.value = (p.website || '').replace(/^https:\/\//, '').replace(/\/$/, '');
  const mail = el('input', { type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'Leave empty to keep it private' }); mail.value = p.email || '';
  const err = el('p', { class: 'error', role: 'alert' });
  const form = el('form', { class: 'stack profile', novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); err.textContent = '';
    try {
      talk = await api('/api/talks/' + id, { method: 'PATCH', headers: auth, body: { headline: headline.value, bio: bio.value, linkedin: link.value(), website: site.value, contactEmail: mail.value } });
      if (mail.value.trim() && !talk.profile.email) { err.textContent = "That email doesn't look right."; return; }
      if (link.value() && !talk.profile.linkedin) { err.textContent = "That doesn't look like a LinkedIn link."; return; }
      paintProfile(); panel.close();
    } catch (x) { err.textContent = x.message; }
  } },
    el('h3', {}, 'How the audience sees you'),
    el('label', { class: 'field' }, el('span', {}, 'What you do'), headline),
    el('label', { class: 'field' }, el('span', {}, 'About you'), bio),
    link.box,
    el('label', { class: 'field' }, el('span', {}, 'Website'), site),
    el('label', { class: 'field' }, el('span', {}, 'Email the audience can use'), mail),
    err,
    el('div', { class: 'row' }, el('button', { class: 'btn plain', type: 'button', onclick: () => panel.close() }, 'Cancel'), el('button', { class: 'btn' }, 'Save')));
  const panel = sheet(form);
  panel.panel.parentElement.classList.add('list');
}
paintProfile();

view.append(el('div', { class: 'desk' },
  el('div', { class: 'side' },
    el('h1', { class: talk.title.length > 60 ? 'long' : '' }, talk.title),
    svg,
    el('div', { class: 'key' }, el('b', { style: '--c:var(--ink)' }, 'Here'), el('b', { style: '--c:var(--cobalt)' }, 'Answered'), el('b', { style: '--c:var(--signal)' }, 'Needs you')),
    el('div', { class: 'numbers' },
      el('div', {}, nums.people, el('span', {}, 'people')),
      el('div', {}, nums.questions, el('span', {}, 'questions')),
      waitingBox),
    el('div', { class: 'actions' },
      el('a', { class: 'btn', href: '/present/' + id, target: '_blank' }, 'Show QR code'),
      el('button', { class: 'btn quiet', type: 'button', onclick: share }, 'Put QR code on a slide'),
      el('button', { class: 'btn quiet', onclick: phone }, 'Open on my phone'),
      el('a', { class: 'btn quiet', href: '/j/' + talk.code, target: '_blank' }, 'Test it yourself')),
    summary,
    el('div', { class: 'connect' }, el('button', { class: 'btn quiet', type: 'button', onclick: editProfile }, 'Your profile')),
    !talk.fullAnswers && el('p', { class: 'note' }, 'Practice mode: answers are simple word matches. Add your key to the .env file for real answers.'),
  ),
  el('div', { class: 'main' }, el('section', { class: 'inbox' }, el('h2', {}, 'Questions for you'), cards), feedbackBox, knows),
));

// "Put it on a slide": a chooser of code styles and ready-made slides (qrchooser.js), loaded when first opened.
// Nothing downloads until the speaker presses a download button.
async function share() {
  const { openChooser } = await import('/js/qrchooser.js');
  await openChooser(talk);
}
if (new URLSearchParams(location.search).has('new')) { history.replaceState(null, '', location.pathname); share(); }

function phone() {
  const sheet = el('div', { class: 'sheet', onclick: (e) => { if (e.target === sheet) sheet.remove(); } },
    el('div', {},
      el('h3', { style: 'font-size:24px' }, 'Scan with your phone'),
      el('img', { src: `/api/talks/${id}/qr.svg?inbox=1&key=${encodeURIComponent(key)}`, alt: 'Code that opens your questions on your phone' }),
      el('p', { class: 'small muted' }, 'This is your private link. Don\'t put it on a slide.'),
      el('button', { class: 'btn quiet', style: 'margin-top:16px', onclick: () => sheet.remove() }, 'Done')));
  document.body.append(sheet);
}

// A question asked in another language also shows in the language of the slides, so the speaker can read it.
const also = (item) => item.translated && el('p', { class: 'also' }, item.translated);

function card(item) {
  const names = item.people.map((p) => p.name); // anonymous askers arrive as "Someone"
  const who = names.length > 2 ? `${names[0]}, ${names[1]} and ${names.length - 2} more asked` : names.join(' and ') + ' asked';
  // People who tapped "Me too" in the room: no name, but the speaker should see how many want this answered.
  const more = item.backers > 0 && el('span', { class: 'metoos' }, item.backers === 1 ? '+1 wants this too' : `+${item.backers} want this too`);
  if (item.status === 'open') {
    const box = el('textarea', { placeholder: names[0] === 'Someone' && names.length === 1 ? 'Your reply…' : `Reply to ${first(names[0])}${names.length > 1 ? ' and the others' : ''}…`, 'aria-label': 'Your reply' });
    box.value = drafts[item.id] || '';
    box.addEventListener('input', () => { drafts[item.id] = box.value; });
    const send = el('button', { class: 'btn', onclick: async () => {
      if (!box.value.trim()) return box.focus();
      send.disabled = true;
      await api(`/api/talks/${id}/inbox/${item.id}`, { method: 'POST', headers: auth, body: { answer: box.value } });
      delete drafts[item.id]; lastSig = ''; refresh();
    } }, 'Send reply');
    return el('article', { class: 'card open', 'data-id': item.id },
      el('h3', { class: item.question.length > 110 ? 'long' : '' }, item.question), also(item), el('p', { class: 'who' }, who, more), box,
      el('div', { class: 'row' }, el('span', { class: 'small muted' }, names.length + item.backers > 1 ? `Goes to all ${names.length + item.backers}` : ''), send));
  }
  return el('article', { class: 'card' },
    el('h3', { class: item.question.length > 110 ? 'long' : '' }, item.question), also(item), el('p', { class: 'who' }, who, more),
    el('p', { class: 'reply' }, item.answer),
    el('div', { class: 'people' }, item.people.map((p) => el('span', { class: 'person' }, p.name,
      p.email && el('a', { href: `mailto:${p.email}?subject=${encodeURIComponent('Your question at ' + talk.title)}` }, 'Email'),
      p.linkedin && el('a', { class: 'in', href: p.linkedin, target: '_blank', rel: 'noopener', 'aria-label': `${p.name} on LinkedIn` }, icon('linkedin', 16), 'LinkedIn')))));
}

async function refresh() {
  let data;
  try { data = await api(`/api/talks/${id}/inbox`, { headers: auth }); } catch { return; }
  nums.people.textContent = data.stats.people;
  nums.questions.textContent = data.stats.questions;
  nums.waiting.textContent = data.stats.waiting;
  waitingBox.className = data.stats.waiting ? 'hot' : '';
  room(svg, data.seats, { min: 45 });
  drawTrends(data);
  drawFeedback(data.feedback || []);
  document.title = (data.stats.waiting ? `(${data.stats.waiting}) ` : '') + talk.title + ' · Auto Q&A';
  // Only rebuild the list when it changed, so typing a reply is never interrupted.
  const sig = JSON.stringify(data.items.map((i) => [i.id, i.status, i.people.length, i.backers]));
  if (sig === lastSig) return;
  lastSig = sig;
  const focused = document.activeElement?.closest?.('.card')?.dataset.id;
  if (!data.items.length) {
    cards.replaceChildren(el('div', { class: 'empty' }, el('strong', {}, 'Nothing needs you yet'), 'Questions your slides can\'t answer land here.'));
    return;
  }
  // The question most people want answered goes first; newest first among equals.
  const open = data.items.filter((i) => i.status === 'open').sort((a, b) => (b.people.length + b.backers) - (a.people.length + a.backers)), done = data.items.filter((i) => i.status !== 'open');
  cards.replaceChildren(...open.map(card), ...done.map(card));
  if (focused) cards.querySelector(`[data-id="${focused}"] textarea`)?.focus();
}
/* ---------- How it went: a glance, not a report ---------- */
const clock = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function drawTrends(data) {
  const t = data.trend, s = data.stats;
  summary.hidden = !t;
  if (!t) return;
  const peak = Math.max(1, ...t.buckets.map((b) => b.asked));
  const chart = t.buckets.length > 1; // one bar is not a trend: then only the facts
  const tile = (big, small, c) => el('div', { class: 'tile', style: c ? `--c:${c}` : '' }, el('b', {}, big), el('span', {}, small));
  summary.replaceChildren(...[
    el('h3', {}, 'How it went'),
    // The three numbers that matter, side by side.
    el('div', { class: 'tiles' },
      tile(s.straightAway != null ? s.straightAway + '%' : '–', 'answered straight away', 'var(--cobalt)'),
      tile(data.items.length ? `${t.replied}/${data.items.length}` : '0', 'sent to you, replied', 'var(--signal)'),
      tile(String(s.feedback || 0), 'left feedback')),
    // When the questions came.
    chart && el('div', { class: 'went-block' }, el('span', { class: 'went-label' }, `Questions over time, every ${t.step} min`),
      el('div', { class: 'spark', role: 'img', 'aria-label': `Questions every ${t.step} minutes` },
        t.buckets.map((b) => el('div', { title: `${clock(b.t)}: ${b.asked} asked, ${b.straight} answered straight away` },
          el('i', { class: 'need', style: `height:${((b.asked - Math.min(b.straight, b.asked)) / peak) * 100}%` }),
          el('i', { style: `height:${(Math.min(b.straight, b.asked) / peak) * 100}%` })))),
      el('div', { class: 'axis small muted' }, el('span', {}, clock(t.buckets[0].t)), el('span', {}, clock(t.buckets.at(-1).t))),
      el('div', { class: 'key' }, el('b', { style: '--c:var(--cobalt)' }, 'Answered straight away'), el('b', { style: '--c:var(--signal)' }, 'Needed you'))),
    data.top.length > 0 && el('div', { class: 'went-block' }, el('span', { class: 'went-label' }, 'Asked most'),
      el('ol', {}, data.top.slice(0, 3).map((q) => el('li', {}, el('span', { class: 't' }, q.text), q.n > 1 && el('span', { class: 'n' }, '×' + q.n))))),
    (t.slides[0] || t.notSatisfied > 0) && el('div', { class: 'went-block' }, el('span', { class: 'went-label' }, 'Also'),
      el('ul', { class: 'facts' },
        t.slides[0] && el('li', {}, 'Most shown: ', el('b', {}, t.slides[0].label), t.slides[0].n > 1 ? ` (${t.slides[0].n}×)` : ''),
        t.notSatisfied > 0 && el('li', {}, el('b', {}, String(t.notSatisfied)), ' wanted you instead of the answer'))),
  ].filter(Boolean));
}

/* ---------- Feedback from the audience (anonymous unless they added their name) ---------- */
const ago = (t) => { const m = Math.round((Date.now() - t) / 60e3); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
function drawFeedback(list) {
  const sig = list.map((f) => f.id).join();
  if (sig === lastFb) return;
  lastFb = sig;
  feedbackBox.hidden = !list.length;
  feedbackBox.replaceChildren(el('h2', {}, 'Feedback', el('span', { class: 'count-pill' }, String(list.length))),
    el('div', { class: 'fbs' }, list.map((f) => el('blockquote', {}, f.text, el('cite', {}, (f.from ? f.from + ' · ' : '') + ago(f.createdAt))))));
}

/* ---------- Context: everything the answers draw on. Add more with +, take something out with − ---------- */
const picker = el('input', { type: 'file', multiple: true, hidden: true, accept: '.pdf,.pptx,.key,.ppt,.odp,.docx,.txt,.md' });
document.body.append(picker);
let ctxNote = '';
function drawKnows() {
  const fixes = talk.corrections || [];
  const say = el('p', { class: 'small', role: 'status' }, ctxNote);
  const minus = (label, fn) => el('button', { class: 'pm minus', type: 'button', 'aria-label': label, title: label, onclick: fn }, '−');
  const noteBox = el('textarea', { placeholder: 'A result, a price, a link, how to get in touch…', 'aria-label': 'A note to add' });
  const noteForm = el('div', { class: 'addnote', hidden: true }, noteBox, el('button', { class: 'btn quiet', type: 'button', onclick: async () => {
    if (!noteBox.value.trim()) return noteBox.focus();
    try { talk = await api(`/api/talks/${id}/notes`, { method: 'POST', headers: auth, body: { text: noteBox.value } }); ctxNote = 'Note added.'; drawKnows(); }
    catch (x) { say.textContent = x.message; }
  } }, 'Add'));
  knows.replaceChildren(...[
    el('div', { class: 'ctx-head' }, el('h2', {}, 'Context'),
      el('button', { class: 'pm plus', type: 'button', 'aria-label': 'Add a file', title: 'Add a file', onclick: () => picker.click() }, '+')),
    el('p', { class: 'small muted' }, 'Everything the answers draw on. Add slides, papers or notes at any time, or take something out.'),
    el('ul', { class: 'taught ctx' }, talk.sources.map((src) => el('li', {},
      el('div', {}, el('b', {}, src.name), el('p', {}, src.kind === 'Notes' ? 'A note' : `${src.count} ${src.kind.toLowerCase()}${src.count === 1 ? '' : 's'}`)),
      minus(`Remove ${src.name}`, async () => {
        if (talk.sources.length === 1) { say.textContent = 'Keep at least one thing: the answers need something to draw on.'; return; }
        talk = await api(`/api/talks/${id}/files/${src.id}`, { method: 'DELETE', headers: auth }); ctxNote = `Removed ${src.name}.`; drawKnows();
      })))),
    el('div', { class: 'ctx-add' },
      el('button', { class: 'btn quiet', type: 'button', onclick: () => picker.click() }, '+ File'),
      el('button', { class: 'btn quiet', type: 'button', onclick: () => { noteForm.hidden = false; noteBox.focus(); } }, '+ Note')),
    noteForm, say,
    fixes.length > 0 && el('h3', { class: 'ctx-sub' }, 'Your fixes'),
    fixes.length > 0 && el('ul', { class: 'taught' }, fixes.map((c) => el('li', {},
      el('div', {}, el('b', {}, c.q), el('p', {}, c.fix)),
      minus('Remove this fix', async () => { talk = await api(`/api/talks/${id}/corrections/${c.id}`, { method: 'DELETE', headers: auth }); drawKnows(); })))),
    el('p', { class: 'small muted' }, 'Wrong answer? Test it yourself and tap "Fix this answer" under it.'),
  ].filter(Boolean));
}
picker.addEventListener('change', async () => {
  const { makePictures } = await import('/js/pictures.js');
  for (const file of picker.files) {
    if (file.size > 50 * 1024 * 1024) { ctxNote = `${file.name} is too big. The limit is 50 MB.`; drawKnows(); continue; }
    ctxNote = `Reading ${file.name}…`; drawKnows();
    const form = new FormData(); form.append('files', file);
    try {
      const before = new Set(talk.sources.map((x) => x.id));
      const out = await api(`/api/talks/${id}/files`, { method: 'POST', headers: auth, form });
      talk = out;
      const added = talk.sources.find((x) => !before.has(x.id));
      ctxNote = out.problems?.length ? out.problems.join(' ') : `Added ${file.name}.`;
      drawKnows();
      if (added) makePictures(id, auth, file, added).then(() => api(`/api/talks/${id}/see`, { method: 'POST', headers: auth }).catch(() => {}));
    } catch (x) { ctxNote = x.message; drawKnows(); }
  }
  picker.value = '';
});
drawKnows();
// Coming back from testing in another tab: show the new fixes.
addEventListener('focus', async () => { try { talk = await api('/api/talks/' + id, { headers: auth }); if (!knows.contains(document.activeElement)) drawKnows(); } catch {} });

refresh();
setInterval(refresh, 3000);
