import { $, el, api, keys, first, room, linkedinField, sheet } from '/js/common.js';

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
document.title = talk.title + ' · Auto Q&A';
$('#code').replaceChildren('Code ' + talk.code, ' · ', el('a', { href: '/talks' }, 'Your talks'));

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const nums = { people: el('b', {}, '0'), questions: el('b', {}, '0'), waiting: el('b', {}, '0') };
const waitingBox = el('div', {}, nums.waiting, el('span', {}, 'need you'));
const cards = el('div', { class: 'cards' });
const summary = el('div', { class: 'summary', hidden: true });

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
      el('a', { class: 'btn', href: '/present/' + id, target: '_blank' }, 'Show the code'),
      el('button', { class: 'btn quiet', onclick: phone }, 'Open on my phone'),
      el('a', { class: 'btn quiet', href: '/j/' + talk.code, target: '_blank' }, 'Try it as the audience')),
    summary,
    el('div', { class: 'connect' }, el('button', { class: 'btn quiet', type: 'button', onclick: editProfile }, 'Your profile'), profileLine),
    !talk.fullAnswers && el('p', { class: 'note' }, 'Practice mode: answers are simple word matches. Add your key to the .env file for real answers.'),
  ),
  el('section', { class: 'inbox' }, el('h2', {}, 'Questions for you'), cards),
));

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
      p.linkedin && el('a', { class: 'in', href: p.linkedin, target: '_blank', rel: 'noopener' }, 'LinkedIn')))));
}

async function refresh() {
  let data;
  try { data = await api(`/api/talks/${id}/inbox`, { headers: auth }); } catch { return; }
  nums.people.textContent = data.stats.people;
  nums.questions.textContent = data.stats.questions;
  nums.waiting.textContent = data.stats.waiting;
  waitingBox.className = data.stats.waiting ? 'hot' : '';
  room(svg, data.seats, { min: 45 });
  summary.hidden = data.stats.straightAway == null;
  if (!summary.hidden) summary.replaceChildren(
    el('div', { class: 'meter' }, el('i', { style: `width:${data.stats.straightAway}%` })),
    el('p', {}, el('b', {}, data.stats.straightAway + '%'), ' answered straight away'),
    data.top.length > 0 && el('ol', {}, data.top.slice(0, 3).map((q) => el('li', {}, el('span', { class: 't' }, q.text, q.n > 1 && el('span', { class: 'n' }, ' ×' + q.n))))));
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
refresh();
setInterval(refresh, 3000);
