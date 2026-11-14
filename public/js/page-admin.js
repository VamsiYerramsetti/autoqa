// The founder portal: visits, product, speed and cost, health. Data from /api/admin/metrics (server.js).
import { el, api } from '/js/common.js';
const view = document.getElementById('view');
const RANGES = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];
let days = 7, timer = 0;
// An admin key in the address (?key=) is sent as a header and taken out of the address bar at once.
const adminKey = new URLSearchParams(location.search).get('key') || '';
if (adminKey) history.replaceState(null, '', location.pathname);
try { days = +sessionStorage.getItem('portal:days') || 7; } catch {}

/* ---------- small helpers ---------- */
const dash = '–';
const num = (v) => (v == null ? dash : Number(v).toLocaleString());
const pc = (v) => (v == null ? dash : v + '%');
const secs = (v) => (v == null ? dash : v < 60 ? Math.round(v) + 's' : Math.floor(v / 60) + 'm ' + String(Math.round(v % 60)).padStart(2, '0') + 's');
const usd = (v) => (v == null ? dash : v === 0 ? '$0' : v < 0.01 ? '$' + v.toFixed(4) : '$' + v.toFixed(2));
const tok = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v));
const PAGE = { home: 'Home', setup: 'Set up a talk', speaker: 'Speaker page', present: 'Code screen', audience: 'Audience chat', privacy: 'Privacy', portal: 'Portal' };
const tile = (value, label, note, cls = '') => el('div', { class: 'tile ' + cls }, el('b', {}, value), el('span', {}, label), note && el('small', {}, note));
const section = (id, title, sub, ...kids) => el('section', { id, class: 'block' }, el('h2', {}, title), sub && el('p', { class: 'sub' }, sub), ...kids);

// Columns over time: one series, one colour, value in the tooltip, first and last date under the axis.
function columns(rows, key, fmt, label) {
  const peak = Math.max(...rows.map((r) => r[key]), 0);
  const top = peak <= 0 ? 1 : peak;
  const date = (d) => new Date(d + 'T12:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' });
  return el('figure', { class: 'cols-fig' },
    el('figcaption', {}, label, el('span', {}, 'peak ' + fmt(peak))),
    el('div', { class: 'cols', role: 'img', 'aria-label': label },
      rows.map((r) => el('div', { 'data-tip': `${date(r.day)}: ${fmt(r[key])}` }, el('i', { style: `height:${(r[key] / top) * 100}%` })))),
    el('div', { class: 'cols-axis' }, el('span', {}, date(rows[0].day)), el('span', {}, date(rows.at(-1).day))));
}
// Horizontal bars for a ranked list.
function hbars(list, fmt = num, name = (x) => x) {
  if (!list.length) return el('p', { class: 'none' }, 'Nothing yet');
  const top = Math.max(1, ...list.map((x) => x.n));
  return el('div', { class: 'hbars' }, list.map((x) => el('div', { 'data-tip': `${name(x.name)}: ${fmt(x.n)}` },
    el('span', {}, name(x.name)), el('i', {}, el('em', { style: `width:${(x.n / top) * 100}%` })), el('b', {}, fmt(x.n)))));
}
// A funnel: each step's bar against the first, with the share that made it from the step before.
function funnel(steps) {
  const first = Math.max(1, steps[0][1]);
  return el('div', { class: 'funnel' }, steps.map(([name, n], i) => {
    const prev = i ? steps[i - 1][1] : null;
    return el('div', { 'data-tip': `${name}: ${num(n)}` },
      el('span', {}, name),
      el('i', {}, el('em', { style: `width:${Math.min(100, (n / first) * 100)}%` })),
      el('b', {}, num(n)),
      el('small', {}, i && prev ? Math.round((n / prev) * 100) + '%' : ''));
  }));
}
function table(head, rows) {
  return el('div', { class: 'table-wrap' }, el('table', { class: 'plain' },
    el('thead', {}, el('tr', {}, head.map((h) => el('th', {}, h)))),
    el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, c)))))));
}

/* ---------- sign in ---------- */
// The portal opens for the founder account (ADMIN_EMAIL, signed in), or on the computer running Auto Q&A.
function signIn() {
  document.getElementById('ranges').hidden = true;
  document.getElementById('jump').hidden = true;
  view.replaceChildren(el('div', { class: 'gate' }, el('h1', {}, 'Portal'),
    el('p', { class: 'muted' }, 'Only for the founder. Sign in with the founder account.'),
    el('a', { class: 'btn', href: '/signin?next=/admin' }, 'Sign in')));
}

/* ---------- the portal ---------- */
function ranges() {
  const box = document.getElementById('ranges');
  box.hidden = false;
  box.replaceChildren(...RANGES.map(([d, label]) => el('button', { type: 'button', 'aria-pressed': String(d === days), onclick: () => { days = d; try { sessionStorage.setItem('portal:days', d); } catch {} load(); } }, label)));
}

async function load() {
  clearTimeout(timer);
  let m;
  try { m = await api('/api/admin/metrics?days=' + days, { headers: adminKey ? { 'x-admin-key': adminKey } : {} }); }
  catch (x) { return signIn(); }
  ranges();
  document.getElementById('jump').hidden = false;
  const o = m.overview, p = m.product, s = m.speed, c = m.cost, h = m.health;
  const y = scrollY;
  view.replaceChildren(
    section('overview', 'Overview', `${RANGES.find((r) => r[0] === days)?.[1] || days + ' days'}. Your own tests and visits with "do not track" are left out.`,
      el('div', { class: 'tiles' },
        tile(num(o.live), 'on the site now', 'last 5 minutes', 'live'),
        tile(num(o.visitors), 'visitors', 'unique per day, added up'),
        tile(num(o.visits), 'visits'),
        tile(num(o.pageviews), 'page views'),
        tile(o.viewsPerVisit ?? dash, 'pages per visit'),
        tile(secs(o.avgVisitSec), 'average visit', 'time the page was on screen'),
        tile(pc(o.bounce), 'left after one page'),
        tile(num(p.questions), 'questions asked'),
        tile(pc(p.straightAway), 'answered straight away'),
        tile(usd(c.total), 'model cost', c.perQuestion != null ? usd(c.perQuestion) + ' per question' : null)),
      days > 1 && el('div', { class: 'charts' },
        columns(m.perDay, 'visitors', num, 'Visitors per day'),
        columns(m.perDay, 'questions', num, 'Questions per day'),
        columns(m.perDay, 'cost', usd, 'Model cost per day'))),

    section('traffic', 'Traffic', 'Where visits come from, what people look at, on what.',
      el('div', { class: 'grid3' },
        el('div', {}, el('h3', {}, 'Sources'), hbars(m.sources)),
        el('div', {}, el('h3', {}, 'First page of a visit'), hbars(m.entries, num, (n) => PAGE[n] || n)),
        el('div', {}, el('h3', {}, 'Devices'), hbars(m.devices.type, num, (n) => n[0].toUpperCase() + n.slice(1)))),
      el('div', { class: 'grid3' },
        el('div', {}, el('h3', {}, 'Browsers'), hbars(m.devices.browser)),
        el('div', {}, el('h3', {}, 'Systems'), hbars(m.devices.os)),
        el('div', {})),
      el('h3', {}, 'Pages'),
      m.pages.length ? table(['Page', 'Views', 'Visitors', 'Time on page', 'Scrolled'], m.pages.map((r) => [PAGE[r.page] || r.page, num(r.views), num(r.visitors), secs(r.avgSec), pc(r.scroll)])) : el('p', { class: 'none' }, 'No visits yet')),

    section('product', 'Product', 'How speakers and audiences move through Auto Q&A.',
      el('div', { class: 'grid2' },
        el('div', {}, el('h3', {}, 'Speakers'), funnel(m.funnels.speaker)),
        el('div', {}, el('h3', {}, 'Audience'), funnel(m.funnels.audience))),
      el('h3', {}, 'Answer quality'),
      el('div', { class: 'tiles' },
        tile(pc(p.straightAway), 'answered from the material'),
        tile(num(p.notCovered), 'not in the material'),
        tile(pc(p.unhappyShare), 'tapped "Ask the speaker"', num(p.unhappy) + ' answers'),
        tile(pc(p.withSlide), 'answers that showed a slide'),
        tile(num(p.slidesOpened), 'slides enlarged'),
        tile(num(p.corrections), 'fixes by speakers'),
        tile(num(p.feedback), 'feedback notes'),
        tile(num(p.replies), 'speaker replies'),
        tile(num(p.connects), 'LinkedIn taps'),
        tile(num(p.meToo), '"Me too" taps'))),

    section('speed', 'Speed and cost', 'Prices from Anthropic\'s price list, set in lib/prices.js.',
      el('div', { class: 'tiles' },
        tile(secs(s.firstWordMedianSec), 'to the first word', 'typical; slowest 10%: ' + secs(s.firstWordP90Sec)),
        tile(secs(s.answerMedianSec), 'to a full answer', 'typical; slowest 10%: ' + secs(s.answerP90Sec)),
        tile(s.replyMedianMin == null ? dash : s.replyMedianMin + ' min', 'until a speaker replies', 'typical'),
        tile(usd(c.total), 'model cost'),
        tile(usd(c.perQuestion), 'per question'),
        tile(pc(c.cacheShare), 'of prompt read from cache', 'higher is cheaper'),
        tile(num(c.longPrompts), 'prompts over 100K tokens', 'these cost 5× on Haiku', c.longPrompts ? 'warn' : '')),
      c.byModel.length ? table(['Model', 'Calls', 'Input', 'Cache read', 'Cache write', 'Output', 'Cost'], c.byModel.map((r) => [r.model, num(r.calls), tok(r.input), tok(r.cacheRead), tok(r.cacheWrite), tok(r.output), usd(r.cost)])) : el('p', { class: 'none' }, 'No model calls yet'),
      c.topTalks.length > 0 && el('div', {}, el('h3', {}, 'Most expensive talks'), hbars(c.topTalks.map((t) => ({ name: t.title, n: t.cost })), usd))),

    section('health', 'Health', null,
      el('div', { class: 'tiles' },
        tile(h.fullAnswers ? 'Real answers' : 'Practice mode', 'answering', h.fullAnswers ? 'API key found' : 'no API key set', h.fullAnswers ? '' : 'warn'),
        tile(h.durable ? 'Database' : 'File', 'storage', h.durable ? 'kept across restarts' : 'lost on restart', h.durable ? '' : 'warn'),
        tile(h.uptimeHours + ' h', 'running for', h.version ? 'version ' + h.version : null),
        tile(num(h.failedAnswers), 'failed answers', null, h.failedAnswers ? 'warn' : ''),
        tile(h.memoryMb + ' MB', 'memory'),
        tile(num(h.records.talks) + ' / ' + num(h.records.people), 'talks / people'),
        tile(h.node, 'Node')),
      el('h3', {}, 'Last model problem'),
      h.lastModelError ? table(['When', 'Where', 'What'], [[new Date(h.lastModelError.at).toLocaleString(), h.lastModelError.where, [h.lastModelError.status, h.lastModelError.type].filter(Boolean).join(' ')]]) : el('p', { class: 'none' }, 'None since the last restart')),

    section('talks', 'Talks', 'The 20 most recent. Speakers\' own tests are left out.',
      m.talks.length ? table(['Talk', 'Speaker', 'Status', 'Started', 'People', 'Questions', 'Straight away', 'Feedback', 'Cost'],
        m.talks.map((t) => [t.title, t.speaker, t.status === 'ready' ? 'Live' : 'Setting up', new Date(t.created).toLocaleDateString(), num(t.people), num(t.questions), pc(t.straightAway), num(t.feedback), usd(t.cost)])) : el('p', { class: 'none' }, 'No talks yet')),
  );
  scrollTo(0, y);
  timer = setTimeout(load, 30000);
}

// One tooltip for every chart: follows the pointer, also works with keyboard focus.
const tip = document.getElementById('tip');
document.addEventListener('pointerover', (e) => { const t = e.target.closest('[data-tip]'); if (!t) return (tip.hidden = true); tip.textContent = t.dataset.tip; tip.hidden = false; });
document.addEventListener('pointermove', (e) => { if (!tip.hidden) { tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 12) + 'px'; tip.style.top = e.clientY - 36 + 'px'; } });
document.addEventListener('pointerleave', () => { tip.hidden = true; });
load();
