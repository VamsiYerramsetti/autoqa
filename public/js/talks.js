import { $, el, api, keys, first } from '/js/common.js';

const view = $('#view');
const data = await api('/api/me');
if (!data.me) location.replace('/signin?next=/talks');

// Remember each talk's private link on this device, so the big-screen code and phone hand-over work.
data.talks.forEach((t) => keys.set(t.id, t.key));

$('#who').replaceChildren(data.me.email, ' · ', el('a', { href: '#', onclick: async (e) => { e.preventDefault(); await api('/api/signout', { method: 'POST' }); location.href = '/'; } }, 'Sign out'));

const day = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
function row(t) {
  const ready = t.status === 'ready';
  return el('a', { class: 'talk' + (t.waiting ? ' hot' : ''), href: ready ? '/s/' + t.id : '/new?talk=' + t.id },
    el('div', {}, el('h3', {}, t.title), el('p', { class: 'small muted' }, ready ? `Code ${t.code} · ${day(t.createdAt)}` : 'Not finished · ' + day(t.createdAt))),
    ready
      ? el('div', { class: 'tally' }, el('span', {}, el('b', {}, t.people), ' people'), el('span', {}, el('b', {}, t.questions), ' questions'), t.waiting ? el('span', { class: 'need' }, el('b', {}, t.waiting), ' need you') : null)
      : el('span', { class: 'btn quiet' }, 'Continue'));
}

view.append(
  el('div', { class: 'row', style: 'margin:16px 0 28px' }, el('h1', {}, data.talks.length ? 'Your talks' : `Hello, ${first(data.me.name)}`), el('a', { class: 'btn', href: '/new' }, 'New talk')),
  data.talks.length
    ? el('div', { class: 'talks' }, data.talks.map(row))
    : el('div', { class: 'empty' }, el('strong', {}, 'No talks yet'), 'Add your slides and get a code to show your audience.'),
  el('p', { class: 'small muted', style: 'margin:40px 0' }, el('a', { href: '#', onclick: close }, 'Close my account')),
);

async function close(e) {
  e.preventDefault();
  const password = prompt('This removes your account, your talks and every question asked in them. It cannot be undone.\n\nType your password to confirm.');
  if (!password) return;
  try { await api('/api/me', { method: 'DELETE', body: { password } }); location.href = '/'; }
  catch (x) { alert(x.message); }
}
