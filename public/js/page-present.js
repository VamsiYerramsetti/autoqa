import { api, keys } from '/js/common.js';
const id = location.pathname.split('/').pop();
const key = keys.get(id);
document.getElementById('qr').src = '/api/talks/' + id + '/qr.svg';
const talk = await api('/api/talks/' + id, { headers: { 'x-key': key || '' } });
keys.set(id, talk.key);
const u = new URL(talk.joinUrl);
document.getElementById('url').innerHTML = u.host + '/j/<b>' + talk.code + '</b>';
const live = document.getElementById('live');
async function tick() {
  try {
    const { stats } = await api('/api/talks/' + id + '/inbox', { headers: { 'x-key': key } });
    if (stats.people) { live.hidden = false; live.lastElementChild.textContent = stats.people === 1 ? '1 person is here' : stats.people + ' people are here'; }
  } catch {}
}
tick(); setInterval(tick, 4000);
