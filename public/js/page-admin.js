import { el, api } from '/js/common.js';
const view = document.getElementById('view');
const key = new URLSearchParams(location.search).get('key') || '';
try {
  const m = await api('/api/admin/metrics?days=14' + (key ? '&key=' + encodeURIComponent(key) : ''));
  document.getElementById('range').textContent = 'Last ' + m.days + ' days';
  const top = Math.max(1, ...m.funnel.map((f) => f[1]));
  const a = m.audience, show = (v, unit = '') => (v == null ? '–' : v + unit);
  const peak = Math.max(1, ...m.perDay.map((d) => d.questions));
  view.append(
    el('h1', {}, 'Numbers'),
    el('h2', {}, 'From visitor to live talk'),
    el('div', { class: 'bars' }, m.funnel.map(([name, n]) => el('div', {}, el('span', {}, name), el('i', { style: 'width:' + (n / top) * 100 + '%' }), el('b', {}, n)))),
    el('h2', {}, 'In the room'),
    el('div', { class: 'tiles' },
      [[a.joined, 'people joined'], [a.questions, 'questions asked'], [show(a.straightAway, '%'), 'answered straight away'], [a.sent, 'sent to a speaker'], [a.meToo ?? 0, '"me too" taps'],
       [a.replies, 'speaker replies'], [show(a.medianAnswerSeconds, 's'), 'typical answer time'], [show(a.medianReplyMinutes, ' min'), 'typical speaker reply time'],
       [a.slidesOpened, 'slides opened'], [a.connects, 'LinkedIn taps'], [a.failed, 'failed answers']]
        .map(([n, label]) => el('div', {}, el('b', {}, n), el('span', {}, label)))),
    el('h2', {}, 'Questions per day'),
    el('div', { class: 'days', role: 'img', 'aria-label': 'Questions per day' }, m.perDay.map((d) => el('i', { title: d.day + ': ' + d.questions, style: 'height:' + (d.questions / peak) * 100 + '%' }))),
    el('h2', {}, 'Recent talks'),
    el('table', { class: 'plain' },
      el('tr', {}, ['Talk', 'People', 'Questions', 'Status'].map((h) => el('th', {}, h))),
      m.talks.map((t) => el('tr', {}, el('td', {}, t.title), el('td', {}, t.people), el('td', {}, t.questions), el('td', {}, t.status === 'ready' ? 'Live' : 'Setting up')))),
  );
} catch (x) {
  view.append(el('h1', {}, 'Numbers'), el('p', {}, x.message));
}
