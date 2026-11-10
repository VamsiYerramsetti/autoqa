// Plays out a made-up talk on the real site: a speaker persona sets up a talk, audience personas ask
// questions (with follow-ups), the speaker replies, and everything said is printed as a transcript.
//
//   SITE=https://the-live-site node test/persona.mjs test/scenarios/<name>/scenario.json
//   node test/persona.mjs <scenario>          (no SITE: starts a throwaway local copy in practice mode)
//
// Scenario file (JSON), paths relative to the scenario's folder:
// {
//   "title": "Talk title",
//   "speaker": { "name": "Dr. Lena Vos", "about": "who she is, for the report only" },
//   "deck": "deck.pptx",                       // .pptx, .pdf, .docx, .txt or .md
//   "notes": "optional extra notes the speaker pastes in",
//   "interview": ["answer to the 1st question the site asks the speaker", "..."],   // optional, by position
//   "audience": [
//     { "name": "Tom", "about": "first-year student, shy", "email": "tom@autoqa.example",
//       "asks": [ "a question", { "q": "a question to hand to the speaker if it isn't covered", "send": true } ] }
//   ],
//   "replies": [ { "match": "words from the question", "answer": "what the speaker replies" } ],   // optional
//   "after": [ { "name": "Late arrival", "asks": ["asked after the speaker replied"] } ]           // optional
// }
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = process.argv[2];
if (!file) { console.error('Give a scenario file.'); process.exit(2); }
const scenario = JSON.parse(fs.readFileSync(file, 'utf8'));
const dir = path.dirname(file);

let server = null, SITE = process.env.SITE?.replace(/\/$/, '');
if (!SITE) {
  const port = 4900 + Math.floor(Math.random() * 90);
  const data = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'autoqa-')), 'db.json');
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: port, AUTOQA_DATA: data, DATABASE_URL: '' }, stdio: 'ignore' });
  SITE = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(SITE + '/healthz')).ok) break; } catch {} await sleep(200); }
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

let jar = '';
async function call(pathname, { method = 'GET', body, headers = {}, form, cookies = true } = {}) {
  const res = await fetch(SITE + pathname, { method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookies && jar ? { cookie: jar } : {}), ...headers },
    body: form || (body ? JSON.stringify(body) : undefined) });
  const set = res.headers.getSetCookie?.() || [];
  if (cookies && set.length) jar = set.map((c) => c.split(';')[0]).filter((c) => !c.endsWith('=')).join('; ');
  const txt = await res.text();
  let data; try { data = JSON.parse(txt); } catch { data = txt; }
  if (!res.ok) throw new Error(`${method} ${pathname} -> ${res.status} ${typeof data === 'string' ? data.slice(0, 200) : data.error}`);
  return data;
}
const say = (s = '') => console.log(s);
const stats = { questions: 0, answered: 0, offered: 0, sent: 0, slow: 0, firstWord: [], total: [] };

async function ask(seat, who, item) {
  const q = typeof item === 'string' ? item : item.q;
  const t0 = Date.now(); let first = 0, buf = '';
  const res = await fetch(SITE + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-token': seat.token }, body: JSON.stringify({ text: q }) });
  if (!res.ok) { say(`  ${who}: ${q}\n    !! the site refused: ${res.status} ${(await res.text()).slice(0, 160)}\n`); return null; }
  const reader = res.body.getReader(), dec = new TextDecoder();
  for (;;) { const x = await reader.read(); if (x.done) break; if (!first) first = Date.now() - t0; buf += dec.decode(x.value); }
  const m = JSON.parse(buf.trim().split('\n').pop()).message, total = Date.now() - t0;
  stats.questions++; stats.firstWord.push(first); stats.total.push(total); if (first > 4000) stats.slow++;
  m.handoff ? stats.offered++ : stats.answered++;
  const slides = [...m.text.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1]);
  say(`  ${who}: ${q}`);
  say(`    Answer (${(first / 1000).toFixed(1)}s to first word, ${(total / 1000).toFixed(1)}s in all${slides.length ? '; shows ' + slides.join(', ') : '; no slide shown'}):`);
  say('    ' + m.text.replace(/\n/g, '\n    '));
  if (m.handoff) {
    say(`    -> offered to send to the speaker as: "${m.handoff}"`);
    if (item.send) {
      await call('/api/handoff', { method: 'POST', cookies: false, headers: { 'x-token': seat.token }, body: { messageId: m.id, name: seat.name, email: seat.email } });
      stats.sent++; say('    -> sent');
    }
  } else if (item.send) say('    (the persona would have sent this to the speaker, but it was answered directly)');
  say();
  await sleep(2300); // stay under the site's per-address limit
  return m;
}

async function audience(list, heading) {
  if (!list?.length) return [];
  say(`\n== ${heading} ==\n`);
  const seats = [];
  for (const [i, p] of list.entries()) {
    const seat = await call('/api/join/' + talk.code, { cookies: false });
    Object.assign(seat, { name: p.name || `Guest ${i + 1}`, email: p.email || `guest${i + 1}.${stamp}@autoqa.example` });
    say(`-- ${seat.name}${p.about ? ' (' + p.about + ')' : ''} --`);
    if (i === 0 && seat.suggested?.length) say(`  Suggested questions on screen: ${seat.suggested.join(' | ')}\n`);
    for (const item of p.asks || []) await ask(seat, seat.name, item);
    seats.push(seat);
  }
  return seats;
}

const stamp = Date.now().toString(36), email = `persona+${stamp}@autoqa.example`, password = 'persona-' + stamp + '-pw';
let talk;
try {
  const health = await call('/healthz');
  say(`Site: ${SITE}  version ${health.version || '(local)'}  real answers: ${health.fullAnswers ? 'yes' : 'no (practice mode)'}`);
  say(`Talk: "${scenario.title}" by ${scenario.speaker?.name}${scenario.speaker?.about ? ' (' + scenario.speaker.about + ')' : ''}\n`);

  await call('/api/signup', { method: 'POST', body: { name: scenario.speaker?.name || 'Test Speaker', email, password } });
  const made = await call('/api/talks', { method: 'POST', body: { title: scenario.title } });
  const form = new FormData();
  form.append('files', new Blob([fs.readFileSync(path.join(dir, scenario.deck))]), path.basename(scenario.deck));
  const up = await call(`/api/talks/${made.id}/files`, { method: 'POST', form });
  say(`== Setting up ==\n\nUploaded ${scenario.deck}: ${up.sources.map((s) => `${s.count} ${s.kind.toLowerCase()}s`).join(', ')}${up.problems?.length ? '\n  Problems reported: ' + up.problems.join(' / ') : ''}`);
  if (scenario.notes) await call(`/api/talks/${made.id}/notes`, { method: 'POST', body: { text: scenario.notes } });
  let t0 = Date.now();
  const prep = await call(`/api/talks/${made.id}/prepare`, { method: 'POST' });
  say(`Reading took ${((Date.now() - t0) / 1000).toFixed(1)}s. The site's one-line summary: ${prep.summary || '(none)'}`);
  say('Questions the site asked the speaker:');
  prep.interview.forEach((x, i) => say(`  ${i + 1}. ${x.q}\n     ${scenario.interview?.[i] ? 'Speaker: ' + scenario.interview[i] : '(skipped)'}`));
  talk = await call(`/api/talks/${made.id}/ready`, { method: 'POST', body: { answers: prep.interview.map((_, i) => scenario.interview?.[i] || '') } });

  await audience(scenario.audience, 'The audience asks');

  let inbox = await call(`/api/talks/${talk.id}/inbox`);
  say(`\n== The speaker's inbox ==\n\n${inbox.stats.people} people, ${inbox.stats.questions} questions, ${inbox.items.length} card(s) for the speaker:`);
  for (const item of inbox.items) {
    say(`  - "${item.question}" (${item.people.map((p) => p.name).join(', ')})`);
    const reply = (scenario.replies || []).find((r) => item.question.toLowerCase().includes(r.match.toLowerCase()));
    if (reply) { await call(`/api/talks/${talk.id}/inbox/${item.id}`, { method: 'POST', body: { answer: reply.answer } }); say(`    Speaker replies: ${reply.answer}`); }
    else say('    (no reply in this scenario)');
  }
  await audience(scenario.after, 'After the speaker replied');

  const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length / 1000).toFixed(1) : '-');
  say(`\n== Numbers ==\n\n${stats.questions} questions: ${stats.answered} answered directly, ${stats.offered} offered to the speaker (${stats.sent} sent).`);
  say(`Average ${avg(stats.firstWord)}s to first word, ${avg(stats.total)}s per answer; ${stats.slow} slower than 4s to start.`);
} catch (e) {
  say(`\n!! The run stopped: ${e.message}`); process.exitCode = 1;
} finally {
  try { await call('/api/me', { method: 'DELETE', body: { password } }); say('\nTest account closed.'); } catch { say('\n(Could not close the test account.)'); }
  server?.kill();
}
