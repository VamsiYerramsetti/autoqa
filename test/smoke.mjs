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
let talk, seat, seat2, seat4, w0, handoffMsg;

await step('pages load', async () => {
  for (const p of ['/', '/signup', '/signin', '/privacy', '/terms', '/how-answers-work', '/healthz']) assert.equal((await call(p, { raw: true })).status, 200, p);
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
// Same for the yellow "send to the speaker" card: labels that stay in view, a problem written at its own field,
// a button that cannot send twice, and only one open card at a time.
await step('the send-to-speaker card labels its fields, puts a problem at the field and opens one at a time', async () => {
  const script = (await call('/js/join.js')).data;
  assert.match(script, /class: 'slot'/, 'label kept above the field');
  assert.match(script, /'aria-invalid', 'true'/, 'problem marked on its field');
  assert.match(script, /send\.disabled = true/, 'no double send');
  assert.match(script, /function foldCard/, 'one open card');
  assert.doesNotMatch(script, /placeholder: 'Your name'/, 'no placeholder used as a label');
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
  assert.equal(prep.status, 200);
  // The setup conversation: a first question, the speaker answers, a follow-up comes back, then they stop.
  const q1 = (await call(`/api/talks/${made.data.id}/interview`, { method: 'POST', body: {} })).data;
  assert.ok(q1.question && !q1.done, 'first question');
  const q2 = (await call(`/api/talks/${made.data.id}/interview`, { method: 'POST', body: { answer: 'School boards and city water planners.', voice: true } })).data;
  assert.ok(q2.question && q2.question !== q1.question, 'a different next question');
  assert.equal(q2.asked, 1);
  const ready = await call(`/api/talks/${made.data.id}/ready`, { method: 'POST', body: {} });
  assert.equal(ready.data.status, 'ready'); talk = ready.data;
  assert.equal((await call('/api/me')).data.talks.length, 1);
  assert.match((await call(`/api/talks/${talk.id}/qr.svg`, { raw: true })).headers.get('content-type'), /svg/);
});
await step('protection: browser rules on every page, no cross-site writes, no uploads from strangers', async () => {
  const home = await call('/', { raw: true });
  const policy = home.headers.get('content-security-policy') || '';
  assert.match(policy, /script-src 'self'/); assert.doesNotMatch(policy, /script-src[^;]*unsafe-inline/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.equal(home.headers.get('x-powered-by'), null);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.match(home.headers.get('permissions-policy'), /microphone=\(self\)/, 'the speaker may use the microphone');
  // No page carries script text of its own: everything is loaded from our files, as the policy demands.
  for (const p of ['/', '/signup', '/privacy', '/terms', '/how-answers-work', `/present/${talk.id}`, '/admin']) {
    const html = await (await call(p, { raw: true })).text();
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>\s*\S/, `inline script on ${p}`);
  }
  // A request from another website is refused, even with the speaker's cookie.
  assert.equal((await call('/api/talks', { method: 'POST', headers: { origin: 'https://evil.example' }, body: { title: 'x' } })).status, 403);
  assert.equal((await call('/api/signout', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await call('/api/me')).data.me.email, email, 'still signed in');
  // A stranger cannot upload into someone's talk (and is turned away before the file is read).
  const mine = jar; jar = '';
  const form = new FormData(); form.append('files', new Blob(['hello']), 'x.txt');
  assert.equal((await call(`/api/talks/${talk.id}/files`, { method: 'POST', form })).status, 404);
  assert.equal((await call('/api/admin/metrics')).status === 200, !process.env.SITE, 'numbers page is closed to strangers on the live site');
  jar = mine;
  for (const p of ['/robots.txt', '/sitemap.xml', '/.well-known/security.txt', '/api/site']) assert.equal((await call(p, { raw: true })).status, 200, p);
});
await step('speaker profile: LinkedIn typed any way becomes a clean link; the audience sees only what was shared', async () => {
  for (const [typed, want] of [['maya-okafor', 'https://www.linkedin.com/in/maya-okafor'], ['@maya-okafor', 'https://www.linkedin.com/in/maya-okafor'],
    ['linkedin.com/in/maya-okafor/', 'https://www.linkedin.com/in/maya-okafor'], ['https://nl.linkedin.com/in/maya-okafor?trk=x', 'https://www.linkedin.com/in/maya-okafor'],
    ['https://evil.example/in/maya', ''], ['javascript:alert(1)', '']]) {
    const out = await call(`/api/talks/${talk.id}`, { method: 'PATCH', body: { linkedin: typed } });
    assert.equal(out.data.profile.linkedin, want, typed);
  }
  const saved = await call(`/api/talks/${talk.id}`, { method: 'PATCH', body: { linkedin: 'maya-okafor', headline: 'Water engineer, Delft Water Lab', bio: 'Works on roofs.', website: 'javascript:alert(1)', contactEmail: 'not-an-email' } });
  assert.equal(saved.data.profile.website, ''); assert.equal(saved.data.profile.email, '');
  const mine = jar; jar = '';
  const seen = (await call('/api/join/' + talk.code)).data;
  assert.equal(seen.speaker.headline, 'Water engineer, Delft Water Lab'); assert.equal(seen.speaker.linkedin, 'https://www.linkedin.com/in/maya-okafor');
  assert.equal(seen.speaker.email, '', "the account email is never shown; only a public one the speaker adds");
  assert.ok(seen.suggested.length >= 3, 'suggested questions');
  jar = mine;
});
await step('someone else cannot open the talk', async () => {
  const mine = jar; jar = '';
  assert.equal((await call(`/api/talks/${talk.id}`)).status, 404);
  assert.equal((await call(`/api/talks/${talk.id}/inbox`)).status, 404);
  jar = mine;
});
async function ask(token, text) {
  const res = await call('/api/chat', { method: 'POST', headers: { 'x-token': token }, body: { text }, raw: true });
  const done = JSON.parse((await res.text()).trim().split('\n').pop()), message = { ...done.message, others: done.others };
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
  assert.equal(m2.others, 1, 'the second asker is told someone already asked');
  await call('/api/handoff', { method: 'POST', headers: { 'x-token': seat2.token }, body: { messageId: m2.id, name: 'Aisha', email: 'aisha@autoqa.example' } });
  jar = mine;
  const inbox = (await call(`/api/talks/${talk.id}/inbox`)).data;
  assert.equal(inbox.items.length, 1); assert.equal(inbox.items[0].people.length, 2); assert.equal(inbox.stats.waiting, 1);
});
await step('the room sees the waiting question and can back it with "Me too", no name needed', async () => {
  const mine = jar; jar = '';
  seat4 = (await call('/api/join/' + talk.code)).data;
  assert.equal(seat4.waiting.length, 1); const w = seat4.waiting[0]; w0 = w.question;
  assert.match(w.question, /slop|tile|pitch/i); assert.equal(w.people, 2); assert.equal(w.mine, false);
  assert.ok(!JSON.stringify(seat4.waiting).includes('Jonas'), 'names never shown to the room');
  const h = { 'x-token': seat4.token };
  assert.equal((await call('/api/metoo', { method: 'POST', headers: h, body: { id: w.id } })).data.waiting[0].people, 3);
  assert.equal((await call('/api/metoo', { method: 'POST', headers: h, body: { id: w.id, on: false } })).data.waiting[0].people, 2);
  const on = (await call('/api/metoo', { method: 'POST', headers: h, body: { id: w.id } })).data.waiting[0];
  assert.equal(on.backed, true);
  assert.equal((await call('/api/thread?since=0', { headers: { 'x-token': seat.token } })).data.waiting[0].mine, true);
  jar = mine;
  const card = (await call(`/api/talks/${talk.id}/inbox`)).data.items[0];
  assert.equal(card.backers, 1); assert.equal(card.people.length, 2);
});
await step('speaker replies; askers see it; the next person gets it straight away', async () => {
  const inbox = (await call(`/api/talks/${talk.id}/inbox`)).data;
  assert.equal((await call(`/api/talks/${talk.id}/inbox/${inbox.items[0].id}`, { method: 'POST', body: { answer: 'Not yet. It needs a flat roof, under 5 degrees.' } })).status, 200);
  const mine = jar; jar = '';
  const thread = (await call('/api/thread?since=0', { headers: { 'x-token': seat.token } })).data.messages;
  assert.ok(thread.some((m) => m.role === 'speaker' && /flat roof/.test(m.text)));
  const backer = (await call('/api/thread?since=0', { headers: { 'x-token': seat4.token } })).data;
  assert.ok(backer.messages.some((m) => m.role === 'speaker' && /flat roof/.test(m.text) && m.about === w0), 'Me too gets the reply');
  assert.equal(backer.waiting.length, 0);
  const seat3 = (await call('/api/join/' + talk.code)).data;
  const again = await ask(seat3.token, 'Can it work on sloped tile roofs?');
  assert.match(again.text, /flat/i); assert.ok(!again.handoff);
  jar = mine;
});
// Checks the code directly rather than the site, so it runs only on a local copy (the live check has no packages installed).
if (server) await step('a question can be sent anonymously: the speaker sees no name or email, the reply still arrives', async () => {
  const mine = jar; jar = '';
  const seat = (await call('/api/join/' + talk.code)).data;
  const m = await ask(seat.token, 'Who designed the poster for the event?');
  assert.ok(m.handoff, 'offered to the speaker');
  {
    assert.equal((await call('/api/handoff', { method: 'POST', headers: { 'x-token': seat.token }, body: { messageId: m.id, anonymous: true } })).status, 200);
    jar = mine;
    const card = (await call(`/api/talks/${talk.id}/inbox`)).data.items.find((i) => i.people.some((p) => p.anonymous));
    assert.ok(card, 'anonymous card in the inbox');
    const anonPerson = card.people.find((p) => p.anonymous);
    assert.equal(anonPerson.email, ''); assert.equal(anonPerson.name, 'Someone');
    await call(`/api/talks/${talk.id}/inbox/${card.id}`, { method: 'POST', body: { answer: 'The city paid.' } });
    jar = '';
    const thread = (await call('/api/thread?since=0', { headers: { 'x-token': seat.token } })).data.messages;
    assert.ok(thread.some((x) => x.role === 'speaker' && /city paid/.test(x.text)), 'reply reaches the anonymous asker');
  }
  jar = mine;
});
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
  assert.deepEqual(flag({ question: '¿Van a ampliar el horario?', for_speaker: 'Will the hours be extended?', in_general: false }).handoff, { question: '¿Van a ampliar el horario?', forSpeaker: 'Will the hours be extended?', general: false });
  // Answered from general knowledge: the speaker is offered as an extra ("Ask ... too"), not as the only way out.
  assert.equal(flag({ question: 'What is a p-value?', for_speaker: 'What is a p-value?', in_general: true }).handoff.general, true);
  assert.equal(flag({ question: 'Can I bring my bike?' }).handoff.forSpeaker, '');
});
if (server) await step('a slide label in the wrong place or with a made-up file name still shows the slide', async () => {
  const { tidyLabels, finishAnswer } = await import('../lib/ai.js');
  const deck = ['Slide 10', 'Slide 11'], two = ['Slide 4', 'Slide 4 · appendix'];
  // Seen live on 2026-11-12: the label came last and carried the file's name, so no slide appeared.
  assert.equal(tidyLabels('Both are right.\n\n[Slide 11 · deck.pdf]', deck), '[Slide 11] Both are right.');
  assert.equal(tidyLabels('[Slide 10] Yes, 17% less.', deck), '[Slide 10] Yes, 17% less.');
  assert.equal(tidyLabels('[Slide 10] It falls 17% [Slide 11], then recovers.', deck), '[Slide 10] It falls 17% [Slide 11], then recovers.');
  assert.equal(tidyLabels('[Slide 99] Hello there.', deck), 'Hello there.', 'a label that matches nothing is removed');
  assert.equal(tidyLabels('[Slide 4 · appendix] From the appendix.', two), '[Slide 4 · appendix] From the appendix.', 'a real file tag is kept');
  assert.equal(tidyLabels('Back to the talk, please.', deck), 'Back to the talk, please.');
  assert.equal(finishAnswer({ stop_reason: 'end_turn', content: [] }, 'Both. [Slide 11 · deck.pdf]', 'q', () => {}, deck).text, '[Slide 11] Both.');
});
await step('close the account and everything in it', async () => {
  assert.equal((await call('/api/me', { method: 'DELETE', body: { password: 'wrong-wrong' } })).status, 401);
  assert.equal((await call('/api/me', { method: 'DELETE', body: { password } })).status, 200);
  assert.equal((await call('/api/join/' + talk.code)).status, 404);
});

console.log(steps.join('\n'));
console.log(process.exitCode ? '\nSome checks failed.' : `\nAll ${steps.length} checks passed against ${SITE}`);
server?.kill();
