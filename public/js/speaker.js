import { $, el, api, keys, first, room } from '/js/common.js';

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

const linkBox = el('input', { class: 'input', placeholder: 'linkedin.com/in/you', value: talk.speaker.linkedin || '', 'aria-label': 'Your LinkedIn link' });
const linkSaved = el('span', { class: 'small muted' });
linkBox.addEventListener('change', async () => {
  talk = await api('/api/talks/' + id, { method: 'PATCH', headers: auth, body: { linkedin: linkBox.value } });
  linkBox.value = talk.speaker.linkedin;
  linkSaved.textContent = talk.speaker.linkedin ? 'Saved. People you reply to can connect with you.' : linkBox.value ? '' : '';
  if (!talk.speaker.linkedin && linkBox.value === '') linkSaved.textContent = '';
});

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
    el('label', { class: 'field connect' }, el('span', {}, 'Let people connect with you'), linkBox, linkSaved),
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

function card(item) {
  const names = item.people.map((p) => p.name);
  const who = names.length > 2 ? `${names[0]}, ${names[1]} and ${names.length - 2} more asked` : names.join(' and ') + ' asked';
  if (item.status === 'open') {
    const box = el('textarea', { placeholder: `Reply to ${first(names[0])}${names.length > 1 ? ' and the others' : ''}…`, 'aria-label': 'Your reply' });
    box.value = drafts[item.id] || '';
    box.addEventListener('input', () => { drafts[item.id] = box.value; });
    const send = el('button', { class: 'btn', onclick: async () => {
      if (!box.value.trim()) return box.focus();
      send.disabled = true;
      await api(`/api/talks/${id}/inbox/${item.id}`, { method: 'POST', headers: auth, body: { answer: box.value } });
      delete drafts[item.id]; lastSig = ''; refresh();
    } }, 'Send reply');
    return el('article', { class: 'card open', 'data-id': item.id },
      el('h3', {}, item.question), el('p', { class: 'who' }, who), box,
      el('div', { class: 'row' }, el('span', { class: 'small muted' }, names.length > 1 ? `Goes to all ${names.length}` : ''), send));
  }
  return el('article', { class: 'card' },
    el('h3', {}, item.question), el('p', { class: 'who' }, who),
    el('p', { class: 'reply' }, item.answer),
    el('div', { class: 'people' }, item.people.map((p) => el('span', { class: 'person' }, p.name,
      el('a', { href: `mailto:${p.email}?subject=${encodeURIComponent('Your question at ' + talk.title)}` }, 'Email'),
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
  const sig = JSON.stringify(data.items.map((i) => [i.id, i.status, i.people.length]));
  if (sig === lastSig) return;
  lastSig = sig;
  const focused = document.activeElement?.closest?.('.card')?.dataset.id;
  if (!data.items.length) {
    cards.replaceChildren(el('div', { class: 'empty' }, el('strong', {}, 'Nothing needs you yet'), 'Questions your slides can\'t answer land here.'));
    return;
  }
  const open = data.items.filter((i) => i.status === 'open'), done = data.items.filter((i) => i.status !== 'open');
  cards.replaceChildren(...open.map(card), ...done.map(card));
  if (focused) cards.querySelector(`[data-id="${focused}"] textarea`)?.focus();
}
refresh();
setInterval(refresh, 3000);
