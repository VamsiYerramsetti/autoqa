// End-to-end check of the whole product through its own web address, in practice mode (no key needed).
// Run: npm test            (starts a throwaway copy of the app)
//      SITE=https://your-site npm test   (checks a live site instead; creates one test account)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

let server = null, SITE = process.env.SITE?.replace(/\/$/, '');
if (!SITE) {
  const port = 4600 + Math.floor(Math.random() * 300);
  const data = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'autoqa-')), 'db.json');
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: port, AUTOQA_DATA: data, ANTHROPIC_API_KEY: '', DATABASE_URL: process.env.TEST_DATABASE_URL || '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  SITE = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(SITE + '/healthz')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
}

let jar = '';
async function call(pathname, { method = 'GET', body, headers = {}, form, raw } = {}) {
  const res = await fetch(SITE + pathname, { method, redirect: 'manual',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(jar ? { cookie: jar } : {}), ...headers },
    body: form || (body ? JSON.stringify(body) : undefined) });
  const set = res.headers.getSetCookie?.() || [];
  if (set.length) jar = set.map((c) => c.split(';')[0]).filter((c) => !c.endsWith('=')).join('; ');
  if (raw) return res;
  const txt = await res.text();
  let data; try { data = JSON.parse(txt); } catch { data = txt; }
  return { status: res.status, data };
}
const steps = [];
async function step(name, fn) { try { await fn(); steps.push('ok   ' + name); } catch (e) { steps.push('FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; } }

const stamp = Date.now().toString(36), email = `test+${stamp}@autoqa.example`, password = 'correct-horse-' + stamp;
let talk, seat, seat2, handoffMsg;

await step('pages load', async () => {
  for (const p of ['/', '/signup', '/signin', '/privacy', '/healthz']) assert.equal((await call(p, { raw: true })).status, 200, p);
  assert.equal((await call('/no-such-page', { raw: true })).status, 404);
  // The home page shows a piece of the real chat, and says plainly that answers are automated.
  const home = await (await call('/', { raw: true })).text();
  assert.match(home, /class="demo"/); assert.match(home, /Answers are automated/);
});
// The browser side has no test of its own here, so at least make sure the slide viewer's promises are in the page script.
await step('a slide opens large as a proper dialog and respects "reduce motion"', async () => {
  const script = (await call('/js/join.js')).data;
  assert.match(script, /'aria-modal': 'true'/, 'dialog');
  assert.match(script, /prefers-reduced-motion/, 'reduce motion');
  assert.match(script, /key === 'Escape'/, 'Escape closes');
});
await step('cannot start a talk without an account', async () => {
  assert.equal((await call('/api/talks', { method: 'POST', body: { title: 'x' } })).status, 401);
});
await step('sign up, sign out, wrong password, sign in', async () => {
  assert.equal((await call('/api/signup', { method: 'POST', body: { name: 'Maya Okafor', email, password: 'short' } })).status, 400);
  assert.equal((await call('/api/signup', { method: 'POST', body: { name: 'Maya Okafor', email, password } })).status, 200);
  assert.equal((await call('/api/signup', { method: 'POST', body: { name: 'Maya Okafor', email, password } })).status, 409);
  assert.equal((await call('/api/me')).data.me.email, email);
  await call('/api/signout', { method: 'POST' }); jar = '';
  assert.equal((await call('/api/me')).data.me, null);
  assert.equal((await call('/api/signin', { method: 'POST', body: { email, password: 'nope-nope-nope' } })).status, 401);
  assert.equal((await call('/api/signin', { method: 'POST', body: { email, password } })).status, 200);
});
await step('set up a talk from a PowerPoint file', async () => {
  const made = await call('/api/talks', { method: 'POST', body: { title: 'Rooftop Rain' } });
  assert.equal(made.status, 200);
  const form = new FormData(); form.append('files', new Blob([fs.readFileSync('samples/rooftop-rain.pptx')]), 'rooftop-rain.pptx');
  const up = await call(`/api/talks/${made.data.id}/files`, { method: 'POST', form });
  assert.equal(up.data.sources[0].count, 6);
  const prep = await call(`/api/talks/${made.data.id}/prepare`, { method: 'POST' });
  assert.ok(prep.data.interview.length >= 3, 'interview questions');
  const ready = await call(`/api/talks/${made.data.id}/ready`, { method: 'POST', body: { answers: ['School boards.'] } });
  assert.equal(ready.data.status, 'ready'); talk = ready.data;
  assert.equal((await call('/api/me')).data.talks.length, 1);
  assert.match((await call(`/api/talks/${talk.id}/qr.svg`, { raw: true })).headers.get('content-type'), /svg/);
});
await step('someone else cannot open the talk', async () => {
  const mine = jar; jar = '';
  assert.equal((await call(`/api/talks/${talk.id}`)).status, 404);
  assert.equal((await call(`/api/talks/${talk.id}/inbox`)).status, 404);
  jar = mine;
});
async function ask(token, text) {
  const res = await call('/api/chat', { method: 'POST', headers: { 'x-token': token }, body: { text }, raw: true });
  const message = JSON.parse((await res.text()).trim().split('\n').pop()).message;
  if (process.env.SITE) console.log(`   Q: ${text}\n   A: ${message.text}${message.handoff ? '\n   (offered to send to the speaker: ' + message.handoff + ')' : ''}\n`);
  return message;
}
await step('audience joins and gets an answer with its slide', async () => {
  const mine = jar; jar = '';
  assert.equal((await call('/api/join/ZZZZZ')).status, 404);
  seat = (await call('/api/join/' + talk.code)).data; assert.ok(seat.token);
  const a = await ask(seat.token, 'How much did peak runoff drop in the pilot?');
  assert.match(a.text, /62/); assert.match(a.text, /\[Slide 4/);
  const src = await call('/api/source?label=' + encodeURIComponent('Slide 4'), { headers: { 'x-token': seat.token } });
  assert.match(JSON.stringify(src.data), /Pilot results/);
  jar = mine;
});
await step('a question the slides cannot answer is handed to the speaker, merged for two askers', async () => {
  const mine = jar; jar = '';
  handoffMsg = await ask(seat.token, 'Does it work on sloped tile roofs?'); assert.ok(handoffMsg.handoff);
  assert.equal((await call('/api/handoff', { method: 'POST', headers: { 'x-token': seat.token }, body: { messageId: handoffMsg.id, name: 'Jonas', email: 'not-an-email' } })).status, 400);
  assert.equal((await call('/api/handoff', { method: 'POST', headers: { 'x-token': seat.token }, body: { messageId: handoffMsg.id, name: 'Jonas', email: 'jonas@autoqa.example' } })).status, 200);
  seat2 = (await call('/api/join/' + talk.code)).data;
  const m2 = await ask(seat2.token, 'Does this work on sloped tile roofs?');
  await call('/api/handoff', { method: 'POST', headers: { 'x-token': seat2.token }, body: { messageId: m2.id, name: 'Aisha', email: 'aisha@autoqa.example' } });
  jar = mine;
  const inbox = (await call(`/api/talks/${talk.id}/inbox`)).data;
  assert.equal(inbox.items.length, 1); assert.equal(inbox.items[0].people.length, 2); assert.equal(inbox.stats.waiting, 1);
});
await step('speaker replies; askers see it; the next person gets it straight away', async () => {
  const inbox = (await call(`/api/talks/${talk.id}/inbox`)).data;
  assert.equal((await call(`/api/talks/${talk.id}/inbox/${inbox.items[0].id}`, { method: 'POST', body: { answer: 'Not yet. It needs a flat roof, under 5 degrees.' } })).status, 200);
  const mine = jar; jar = '';
  const thread = (await call('/api/thread?since=0', { headers: { 'x-token': seat.token } })).data.messages;
  assert.ok(thread.some((m) => m.role === 'speaker' && /flat roof/.test(m.text)));
  const seat3 = (await call('/api/join/' + talk.code)).data;
  const again = await ask(seat3.token, 'Can it work on sloped tile roofs?');
  assert.match(again.text, /flat/i); assert.ok(!again.handoff);
  jar = mine;
});
// Checks the code directly rather than the site, so it runs only on a local copy (the live check has no packages installed).
if (server) await step('answers name a "Dr." speaker properly and never show half a sentence', async () => {
  const { callName, finishAnswer } = await import('../lib/ai.js');
  const { first } = await import('../public/js/common.js');
  for (const [full, want] of [['Dr. Ines Carvalho', 'Dr. Carvalho'], ['prof Jan de Vries', 'Prof. de Vries'], ['Maya Okafor', 'Maya']]) {
    assert.equal(callName(full), want); assert.equal(first(full), want);
  }
  // The model ran out of room mid-sentence: keep whole sentences and offer the question to the speaker.
  const cut = finishAnswer({ stop_reason: 'max_tokens', content: [] }, '[Slide 5] Rounds are at 23:00. For the 03:00 round the', 'What about 3am?');
  assert.equal(cut.text, '[Slide 5] Rounds are at 23:00.'); assert.equal(cut.handoff.question, 'What about 3am?');
  // Nothing written at all: do not claim the talk is silent; offer it to the speaker.
  const empty = finishAnswer({ stop_reason: 'end_turn', content: [] }, '', 'Which figure is right?');
  assert.doesNotMatch(empty.text, /doesn't cover|isn't covered/); assert.ok(empty.handoff);
  const fine = finishAnswer({ stop_reason: 'end_turn', content: [] }, '[Slide 2] Yes, 40%.', 'q');
  assert.equal(fine.text, '[Slide 2] Yes, 40%.'); assert.equal(fine.handoff, null);
  // Asked in Spanish at an English talk: the speaker also gets the question in the talk's language.
  const flag = (input) => finishAnswer({ stop_reason: 'end_turn', content: [{ type: 'tool_use', name: 'not_covered', input }] }, 'La charla no lo dice.', 'q');
  assert.deepEqual(flag({ question: '¿Van a ampliar el horario?', for_speaker: 'Will the hours be extended?' }).handoff, { question: '¿Van a ampliar el horario?', forSpeaker: 'Will the hours be extended?' });
  assert.equal(flag({ question: 'Can I bring my bike?' }).handoff.forSpeaker, '');
});
await step('close the account and everything in it', async () => {
  assert.equal((await call('/api/me', { method: 'DELETE', body: { password: 'wrong-wrong' } })).status, 401);
  assert.equal((await call('/api/me', { method: 'DELETE', body: { password } })).status, 200);
  assert.equal((await call('/api/join/' + talk.code)).status, 404);
});

console.log(steps.join('\n'));
console.log(process.exitCode ? '\nSome checks failed.' : `\nAll ${steps.length} checks passed against ${SITE}`);
server?.kill();
