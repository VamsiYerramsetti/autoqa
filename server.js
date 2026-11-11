import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import QRCode from 'qrcode';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db, { save, flush, id, joinCode, track, durable, putBlob, getBlob, dropBlobs, hashPassword, checkPassword } from './lib/store.js';
import { parseFile, ACCEPTED, labelOf, tagSource, tagAll } from './lib/parse.js';
import { prepare, answer, hasKey, overlap, lastModelError, noteError } from './lib/ai.js';

const PORT = +process.env.PORT || 4321;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// Behind a hosting service's front door, the visitor's real address is one hop back.
const HOSTED = Boolean(process.env.RENDER || process.env.PUBLIC_URL || process.env.TRUST_PROXY);
app.set('trust proxy', HOSTED ? 1 : 'loopback');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
  next();
});
app.use(express.json({ limit: '200kb' }));

// Page views, counted without cookies: a visitor is a one-way hash that changes every day.
if (!db.salt) { db.salt = id(12); save(); }
const PAGES = [[/^\/$/, 'home'], [/^\/signup$/, 'signup'], [/^\/signin$/, 'signin'], [/^\/talks$/, 'talks'], [/^\/new$/, 'setup'], [/^\/s\//, 'speaker'], [/^\/present\//, 'present'], [/^\/j\//, 'audience'], [/^\/privacy$/, 'privacy']];
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/slide/')) {
    const hit = PAGES.find(([re]) => re.test(req.path));
    if (hit) {
      const day = new Date().toISOString().slice(0, 10);
      const v = crypto.createHash('sha256').update(db.salt + day + req.ip + (req.get('user-agent') || '')).digest('base64url').slice(0, 10);
      track('view', null, { page: hit[1], v });
    }
  }
  next();
});

const hits = new Map(); // simple per-address limit on questions
function tooFast(req) {
  const now = Date.now(), list = (hits.get(req.ip) || []).filter((t) => now - t < 60_000);
  list.push(now); hits.set(req.ip, list);
  return list.length > 30;
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 10 } });

/* ---------- helpers ---------- */

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal) return n.address;
  return 'localhost';
}
const baseUrl = () => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://${lanAddress()}:${PORT}`).replace(/\/$/, '');
const joinUrl = (talk) => `${baseUrl()}/j/${talk.code}`;

const fail = (res, status, message) => res.status(status).json({ error: message });
const text = (v, max) => String(v ?? '').trim().slice(0, max);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function linkedin(v) {
  v = text(v, 200);
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, '');
  try { return /(^|\.)linkedin\.com$/i.test(new URL(v).hostname) ? v : ''; } catch { return ''; }
}

/* Accounts: a signed-in speaker is remembered with one cookie that only the server can read. */
const COOKIE = 'aq_session';
function cookie(req, name) {
  for (const part of (req.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
function currentUser(req) {
  const token = cookie(req, COOKIE);
  const session = token && db.sessions.find((s) => s.token === token && Date.now() - s.createdAt < 30 * 864e5);
  return session ? db.users.find((u) => u.id === session.userId) || null : null;
}
function startSession(req, res, user) {
  const token = id(24);
  db.sessions = db.sessions.filter((s) => Date.now() - s.createdAt < 30 * 864e5);
  db.sessions.push({ token, userId: user.id, createdAt: Date.now() });
  save();
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 30 * 864e5, path: '/' });
}
const publicUser = (u) => ({ name: u.name, email: u.email, linkedin: u.linkedin || '' });

// A talk can be opened by its owner (signed in) or by anyone holding its private link (the speaker's phone).
function speakerTalk(req, res) {
  const talk = db.talks.find((t) => t.id === req.params.id);
  const user = talk?.userId && currentUser(req);
  if (!talk || !(talk.key === req.get('x-key') || (user && user.id === talk.userId))) { fail(res, 404, "We can't find that talk."); return null; }
  return talk;
}
function askerFrom(token) {
  const asker = db.askers.find((a) => a.token === token);
  const talk = asker && db.talks.find((t) => t.id === asker.talkId);
  return talk ? { asker, talk } : {};
}
const talkEscalations = (talk) => db.escalations.filter((e) => e.talkId === talk.id);
// Everyone who wants an answer to a question for the speaker: those who sent it, and those who tapped "Me too".
const demand = (e) => e.askers.length + (e.backers || []).length;

// The questions still waiting for the speaker that the room may see and back with "Me too".
// Only ones sent since the room could see them (shared): older ones were sent without that being said.
function waitingList(talk, asker) {
  return talkEscalations(talk).filter((e) => e.status === 'open' && e.shared)
    .sort((a, b) => demand(b) - demand(a) || b.createdAt - a.createdAt)
    .map((e) => ({ id: e.id, question: e.translated || e.question, people: demand(e),
      mine: e.askers.includes(asker.id), backed: (e.backers || []).includes(asker.id) }));
}

// An open question for the speaker that says the same thing. Compared in the speaker's language when we have it,
// so the same question asked in two languages is still one card.
function twinOf(talk, msg) {
  const inTalkLanguage = (x) => x.translated || x.handoffForSpeaker || x.question || x.handoff;
  return talkEscalations(talk).find((e) => e.status === 'open' && Math.max(overlap(e.question, msg.handoff), overlap(inTalkLanguage(e), inTalkLanguage(msg))) >= 0.75);
}

function speakerView(talk) {
  return {
    id: talk.id, code: talk.code, title: talk.title, speaker: talk.speaker, status: talk.status,
    summary: talk.summary, interview: talk.interview, suggested: talk.suggested,
    sources: talk.sources.map((s) => ({ id: s.id, name: s.name, count: s.units.length, kind: s.units[0]?.label.split(' ')[0] || 'Part', pdf: /\.pdf$/i.test(s.name), deck: /\.pptx$/i.test(s.name), images: (s.images || []).length })),
    joinUrl: joinUrl(talk), fullAnswers: hasKey(), key: talk.key,
  };
}

/* ---------- accounts ---------- */

const tries = new Map(); // slows down password guessing: 10 tries per address per 10 minutes
function tooManyTries(req) {
  const now = Date.now(), list = (tries.get(req.ip) || []).filter((t) => now - t < 600_000);
  list.push(now); tries.set(req.ip, list);
  return list.length > 10;
}

app.post('/api/signup', (req, res) => {
  if (tooManyTries(req)) return fail(res, 429, 'Too many tries. Wait ten minutes.');
  const name = text(req.body.name, 80), email = text(req.body.email, 160).toLowerCase(), password = String(req.body.password || '');
  if (!name) return fail(res, 400, 'Add your name.');
  if (!isEmail(email)) return fail(res, 400, "That email doesn't look right.");
  if (password.length < 8) return fail(res, 400, 'Use at least 8 characters for your password.');
  if (password.length > 200) return fail(res, 400, 'That password is too long.');
  if (db.users.some((u) => u.email === email)) return fail(res, 409, 'There is already an account with that email. Sign in instead.');
  const user = { id: id(8), name, email, linkedin: '', pass: hashPassword(password), createdAt: Date.now() };
  db.users.push(user); track('signed_up');
  startSession(req, res, user);
  res.json({ me: publicUser(user) });
});

app.post('/api/signin', (req, res) => {
  if (tooManyTries(req)) return fail(res, 429, 'Too many tries. Wait ten minutes.');
  const email = text(req.body.email, 160).toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user || !checkPassword(String(req.body.password || ''), user.pass)) return fail(res, 401, "That email and password don't match.");
  startSession(req, res, user); track('signed_in');
  res.json({ me: publicUser(user) });
});

app.post('/api/signout', (req, res) => {
  const token = cookie(req, COOKIE);
  db.sessions = db.sessions.filter((s) => s.token !== token); save();
  res.clearCookie(COOKIE, { path: '/' }); res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.json({ me: null });
  const talks = db.talks.filter((t) => t.userId === user.id).sort((a, b) => b.createdAt - a.createdAt).map((t) => {
    const open = db.escalations.filter((e) => e.talkId === t.id && e.status === 'open').length;
    return { id: t.id, key: t.key, title: t.title, code: t.code, status: t.status, createdAt: t.createdAt, waiting: open,
      people: db.askers.filter((a) => a.talkId === t.id).length,
      questions: db.messages.filter((m) => m.talkId === t.id && m.role === 'user').length };
  });
  res.json({ me: publicUser(user), talks });
});

app.patch('/api/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return fail(res, 401, 'Sign in first.');
  if (req.body.name) user.name = text(req.body.name, 80);
  if ('linkedin' in req.body) user.linkedin = linkedin(req.body.linkedin);
  save(); res.json({ me: publicUser(user) });
});

// Close the account and remove everything that belongs to it.
app.delete('/api/me', async (req, res) => {
  const user = currentUser(req);
  if (!user) return fail(res, 401, 'Sign in first.');
  if (!checkPassword(String(req.body.password || ''), user.pass)) return fail(res, 401, "That password isn't right.");
  const mine = new Set(db.talks.filter((t) => t.userId === user.id).map((t) => t.id));
  for (const tid of mine) await dropBlobs(`slides/${tid}/`);
  db.talks = db.talks.filter((t) => !mine.has(t.id));
  for (const k of ['askers', 'messages', 'escalations']) db[k] = db[k].filter((x) => !mine.has(x.talkId));
  db.sessions = db.sessions.filter((s) => s.userId !== user.id);
  db.users = db.users.filter((u) => u.id !== user.id);
  save(); res.clearCookie(COOKIE, { path: '/' }); res.json({ ok: true });
});

app.delete('/api/talks/:id', async (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  await dropBlobs(`slides/${talk.id}/`);
  db.talks = db.talks.filter((t) => t.id !== talk.id);
  for (const k of ['askers', 'messages', 'escalations']) db[k] = db[k].filter((x) => x.talkId !== talk.id);
  save(); res.json({ ok: true });
});

/* ---------- speaker: set up ---------- */

app.post('/api/talks', (req, res) => {
  const user = currentUser(req);
  if (!user) return fail(res, 401, 'Sign in to start a talk.');
  const title = text(req.body.title, 140);
  if (!title) return fail(res, 400, 'Add a title for the talk.');
  const talk = {
    id: id(8), key: id(18), code: joinCode(), title, status: 'draft', userId: user.id,
    speaker: { name: user.name, email: user.email, linkedin: user.linkedin || '' },
    sources: [], interview: [], suggested: [], summary: '', createdAt: Date.now(),
  };
  db.talks.push(talk); save(); track('talk_started', talk.id);
  res.json({ id: talk.id, key: talk.key });
});

app.get('/api/talks/:id', (req, res) => {
  const talk = speakerTalk(req, res);
  if (talk) res.json(speakerView(talk));
});

app.patch('/api/talks/:id', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  if ('linkedin' in req.body) {
    talk.speaker.linkedin = linkedin(req.body.linkedin);
    const owner = db.users.find((u) => u.id === talk.userId);
    if (owner) owner.linkedin = talk.speaker.linkedin;
  }
  if (req.body.title) talk.title = text(req.body.title, 140);
  save(); res.json(speakerView(talk));
});

app.post('/api/talks/:id/files', upload.array('files'), async (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const problems = [];
  for (const f of req.files || []) {
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    try {
      const units = await parseFile(name, f.buffer);
      if (!units.length) { problems.push(`${name} has no text we can read. If it's all images, export it with speaker notes or add a text file.`); continue; }
      const src = { id: id(6), name, units };
      talk.sources.push(src); tagSource(talk, src);
      track('material_added', talk.id, { kind: name.split('.').pop().toLowerCase() });
    } catch (e) {
      problems.push(e.message.startsWith("Can't read") ? `${name}: ${e.message}` : `We couldn't open ${name}. Try exporting it as a PDF.`);
    }
  }
  talk.status = 'draft'; save();
  res.json({ ...speakerView(talk), problems });
});

app.post('/api/talks/:id/notes', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const body = text(req.body.text, 60000);
  if (!body) return fail(res, 400, 'Nothing to add yet.');
  const src = { id: id(6), name: 'Your notes', units: [{ label: 'Notes', text: body }] };
  talk.sources.push(src); tagSource(talk, src);
  save(); res.json(speakerView(talk));
});

// Pictures of each slide, made in the speaker's browser from their PDF, so answers can show the real slide.
const slideKey = (talk, sid, n = '') => `slides/${talk.id}/${sid}/${n ? n + '.jpg' : ''}`;
app.post('/api/talks/:id/files/:sid/pages/:n', express.raw({ type: 'image/jpeg', limit: '3mb' }), async (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const src = talk.sources.find((x) => x.id === req.params.sid), n = +req.params.n;
  if (!src || !Number.isInteger(n) || n < 1 || n > 500 || !Buffer.isBuffer(req.body) || !req.body.length) return fail(res, 400, "That slide picture didn't arrive.");
  await putBlob(slideKey(talk, src.id, n), req.body);
  src.images = [...new Set([...(src.images || []), n])];
  save(); res.json({ ok: true });
});
app.get('/j/:code/slide/:sid/:n', async (req, res) => {
  const talk = db.talks.find((t) => t.code === req.params.code.toUpperCase());
  const src = talk?.sources.find((x) => x.id === req.params.sid), n = parseInt(req.params.n, 10);
  if (!src || !(src.images || []).includes(n)) return res.sendStatus(404);
  const picture = await getBlob(slideKey(talk, src.id, n));
  if (!picture) return res.sendStatus(404);
  res.set('Cache-Control', 'private, max-age=3600').type('image/jpeg').send(picture);
});

app.delete('/api/talks/:id/files/:sid', async (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  await dropBlobs(slideKey(talk, req.params.sid));
  talk.sources = talk.sources.filter((s) => s.id !== req.params.sid);
  save(); res.json(speakerView(talk));
});

app.post('/api/talks/:id/prepare', async (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  if (!talk.sources.length) return fail(res, 400, 'Add your slides first.');
  try {
    const prep = await prepare(talk);
    const old = new Map((talk.interview || []).map((x) => [x.q, x.a]));
    talk.summary = prep.summary;
    talk.interview = prep.interview.map((x) => ({ q: x.q, a: old.get(x.q) || '' }));
    talk.suggested = prep.suggested;
    save(); res.json(speakerView(talk));
  } catch (e) {
    console.error('prepare failed:', e.message);
    fail(res, 502, "We couldn't read your material just now. Try again in a moment.");
  }
});

app.post('/api/talks/:id/ready', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  talk.interview.forEach((x, i) => { if (answers[i] != null) x.a = text(answers[i], 1200); });
  if (talk.status !== 'ready') track('talk_ready', talk.id, { answered: talk.interview.filter((x) => x.a).length, asked: talk.interview.length });
  talk.status = 'ready'; save();
  res.json(speakerView(talk));
});

app.get('/api/talks/:id/qr.svg', async (req, res) => {
  const talk = db.talks.find((t) => t.id === req.params.id);
  if (!talk) return res.sendStatus(404);
  const target = req.query.inbox && req.query.key === talk.key ? `${baseUrl()}/s/${talk.id}#${talk.key}` : joinUrl(talk);
  const svg = await QRCode.toString(target, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: '#000000', light: '#ffffff' } });
  res.type('image/svg+xml').send(svg);
});

/* ---------- speaker: during and after the talk ---------- */

app.get('/api/talks/:id/inbox', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const askers = db.askers.filter((a) => a.talkId === talk.id);
  const byId = new Map(askers.map((a) => [a.id, a]));
  const escalations = talkEscalations(talk);
  const waiting = new Set(), heard = new Set();
  for (const e of escalations) for (const a of [...e.askers, ...(e.backers || [])]) (e.status === 'open' ? waiting : heard).add(a);
  const mine = db.messages.filter((m) => m.talkId === talk.id);
  const asked = new Set(mine.filter((m) => m.role === 'user').map((m) => m.askerId));
  const replies = mine.filter((m) => m.role === 'assistant');
  const tally = new Map();
  for (const m of mine.filter((x) => x.role === 'user')) {
    const k = m.text.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
    tally.set(k, { text: m.text, n: (tally.get(k)?.n || 0) + 1 });
  }
  res.json({
    stats: {
      people: askers.length,
      questions: mine.filter((m) => m.role === 'user').length,
      waiting: escalations.filter((e) => e.status === 'open').length,
      straightAway: replies.length ? Math.round((replies.filter((m) => !m.handoff).length / replies.length) * 100) : null,
    },
    top: [...tally.values()].sort((a, b) => b.n - a.n).slice(0, 5),
    seats: askers.map((a) => (waiting.has(a.id) ? 'waiting' : heard.has(a.id) ? 'replied' : asked.has(a.id) ? 'answered' : 'here')),
    items: escalations.sort((a, b) => b.createdAt - a.createdAt).map((e) => ({
      id: e.id, question: e.question, translated: e.translated || '', status: e.status, answer: e.answer || '', createdAt: e.createdAt,
      backers: (e.backers || []).length,
      people: e.askers.map((aid) => byId.get(aid)).filter(Boolean).map((a) => ({ name: a.name, email: a.email, linkedin: a.linkedin })),
    })),
  });
});

app.post('/api/talks/:id/inbox/:eid', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const e = db.escalations.find((x) => x.id === req.params.eid && x.talkId === talk.id);
  if (!e) return fail(res, 404, "We can't find that question.");
  const reply = text(req.body.answer, 2000);
  if (!reply) return fail(res, 400, 'Write a reply first.');
  e.answer = reply; e.status = 'answered'; e.answeredAt = Date.now();
  track('reply_sent', talk.id, { people: e.askers.length, minutes: Math.round((e.answeredAt - e.createdAt) / 60000) });
  for (const aid of e.askers) {
    // Point the reply at the asker's own unanswered question, so it shows up under it in their chat.
    const theirs = db.messages.filter((m) => m.askerId === aid && m.talkId === talk.id && m.sent && m.handoff);
    const own = theirs.find((m) => m.escalationId === e.id) || theirs.find((m) => m.handoff === e.question) || theirs.find((m) => overlap(m.handoff, e.question) >= 0.75);
    db.messages.push({ id: id(8), talkId: talk.id, askerId: aid, role: 'speaker', text: reply, about: e.question, replyTo: own?.id, createdAt: Date.now() });
  }
  // People who tapped "Me too" get the reply in their chat too, under the question as they saw it.
  for (const aid of e.backers || []) {
    db.messages.push({ id: id(8), talkId: talk.id, askerId: aid, role: 'speaker', text: reply, about: e.translated || e.question, createdAt: Date.now() });
  }
  save(); res.json({ ok: true });
});

/* ---------- audience ---------- */

app.get('/api/join/:code', (req, res) => {
  const talk = db.talks.find((t) => t.code === req.params.code.toUpperCase());
  if (!talk) return fail(res, 404, 'Check the code and try again.');
  if (talk.status !== 'ready') return fail(res, 409, "The speaker hasn't opened questions yet.");
  let entry = askerFrom(req.get('x-token'));
  if (entry.talk?.id !== talk.id) {
    const asker = { id: id(8), token: id(18), talkId: talk.id, name: '', email: '', linkedin: '', createdAt: Date.now() };
    db.askers.push(asker); save(); track('joined', talk.id);
    entry = { asker, talk };
  }
  const a = entry.asker;
  res.json({
    token: a.token, title: talk.title, speaker: { name: talk.speaker.name, linkedin: talk.speaker.linkedin },
    suggested: talk.suggested, me: { name: a.name, email: a.email, linkedin: a.linkedin },
    messages: db.messages.filter((m) => m.askerId === a.id).map(publicMessage),
    waiting: waitingList(talk, a),
  });
});

const publicMessage = (m) => ({ id: m.id, role: m.role, text: m.text, about: m.about, replyTo: m.replyTo, handoff: m.handoff, sent: m.sent, createdAt: m.createdAt });

app.get('/api/thread', (req, res) => {
  const { asker, talk } = askerFrom(req.get('x-token'));
  if (!asker) return fail(res, 404, 'Scan the code again to rejoin.');
  const since = +req.query.since || 0;
  res.json({ messages: db.messages.filter((m) => m.askerId === asker.id && m.createdAt > since).map(publicMessage), waiting: waitingList(talk, asker) });
});

// "Me too": back a question someone else sent to the speaker. No name or email needed; the reply arrives in this chat.
app.post('/api/metoo', (req, res) => {
  const { asker, talk } = askerFrom(req.get('x-token'));
  if (!asker) return fail(res, 404, 'Scan the code again to rejoin.');
  const e = talkEscalations(talk).find((x) => x.id === req.body.id && x.status === 'open' && x.shared);
  if (!e) return fail(res, 404, 'That question has been answered or removed.');
  e.backers = (e.backers || []).filter((a) => a !== asker.id);
  if (req.body.on !== false && !e.askers.includes(asker.id)) { e.backers.push(asker.id); track('me_too', talk.id); }
  save();
  res.json({ waiting: waitingList(talk, asker) });
});

// What a "Slide 4" reference shows: the real slide picture when we have one, otherwise its text laid out as a slide.
app.get('/api/source', (req, res) => {
  const { talk } = askerFrom(req.get('x-token'));
  if (!talk) return fail(res, 404, 'Scan the code again to rejoin.');
  const want = String(req.query.label).replace(/\s+/g, ' ').trim().toLowerCase();
  if (tagAll(talk)) save();
  for (const s of talk.sources) {
    const u = s.units.find((x) => labelOf(s, x).toLowerCase() === want);
    if (!u) continue;
    const lines = u.text.split('\n\nSpeaker notes:')[0].split('\n').map((l) => l.replace(/^[•\-–\s]+/, '').trim()).filter(Boolean);
    return res.json({
      label: labelOf(s, u),
      image: (s.images || []).includes(u.n) ? `/j/${talk.code}/slide/${s.id}/${u.n}` : null,
      title: lines[0]?.slice(0, 120) || u.label,
      lines: lines.slice(1, 7).map((l) => l.slice(0, 160)),
    });
  }
  fail(res, 404, 'Not found.');
});

const CLIENT_EVENTS = new Set(['slide_opened', 'connect_tapped', 'suggestion_tapped']);
app.post('/api/event', (req, res) => {
  const { talk } = askerFrom(req.get('x-token'));
  if (talk && CLIENT_EVENTS.has(req.body.name)) track(req.body.name, talk.id);
  res.json({ ok: true });
});

// "Delete my details": removes this person's name, email and questions.
app.post('/api/forget', (req, res) => {
  const { asker } = askerFrom(req.get('x-token'));
  if (asker) {
    db.messages = db.messages.filter((m) => m.askerId !== asker.id);
    for (const e of db.escalations) { e.askers = e.askers.filter((a) => a !== asker.id); if (e.backers) e.backers = e.backers.filter((a) => a !== asker.id); }
    db.escalations = db.escalations.filter((e) => e.askers.length);
    db.askers = db.askers.filter((a) => a !== asker);
    save();
  }
  res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  const { asker, talk } = askerFrom(req.get('x-token'));
  if (!asker) return fail(res, 404, 'Scan the code again to rejoin.');
  const question = text(req.body.text, 600);
  if (!question) return fail(res, 400, 'Type a question first.');
  if (tooFast(req)) return fail(res, 429, 'Too many questions at once. Give it a minute.');
  const mine = db.messages.filter((m) => m.askerId === asker.id);
  if (mine.filter((m) => m.role === 'user').length >= 40) return fail(res, 429, "That's a lot of questions. Catch the speaker after the talk for more.");

  db.messages.push({ id: id(8), talkId: talk.id, askerId: asker.id, role: 'user', text: question, createdAt: Date.now() });
  save();
  const history = [...mine.filter((m) => m.role !== 'speaker'), { role: 'user', text: question }]
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));

  res.set({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
  const send = (o) => res.write(JSON.stringify(o) + '\n');
  const started = Date.now();
  track('question', talk.id);
  try {
    const out = await answer(talk, talkEscalations(talk), history, (d) => send({ t: 'delta', text: d }));
    const msg = { id: id(8), talkId: talk.id, askerId: asker.id, role: 'assistant', text: out.text, handoff: out.handoff?.question, handoffForSpeaker: out.handoff?.forSpeaker || undefined, createdAt: Date.now() };
    db.messages.push(msg); save();
    track(out.handoff ? 'not_covered' : 'answered', talk.id, { ms: Date.now() - started });
    // If others already sent the same question, say so: it is a reason to add yours.
    const twin = msg.handoff && twinOf(talk, msg);
    send({ t: 'done', message: publicMessage(msg), others: twin && !twin.askers.includes(asker.id) ? demand(twin) : 0 });
  } catch (e) {
    track('answer_failed', talk.id);
    noteError('answer', e);
    const msg = { id: id(8), talkId: talk.id, askerId: asker.id, role: 'assistant', text: "Something went wrong on our side.", handoff: question, createdAt: Date.now() };
    db.messages.push(msg); save();
    send({ t: 'done', message: publicMessage(msg) });
  }
  res.end();
});

// The asker chooses to send an unanswered question to the speaker, and says who they are.
app.post('/api/handoff', (req, res) => {
  const { asker, talk } = askerFrom(req.get('x-token'));
  if (!asker) return fail(res, 404, 'Scan the code again to rejoin.');
  const msg = db.messages.find((m) => m.id === req.body.messageId && m.askerId === asker.id && m.handoff);
  if (!msg) return fail(res, 400, "We can't find that question.");
  const name = text(req.body.name, 80) || asker.name, email = text(req.body.email, 160) || asker.email;
  if (!name) return fail(res, 400, 'Add your name.');
  if (!isEmail(email)) return fail(res, 400, "That email doesn't look right.");
  Object.assign(asker, { name, email });
  if ('linkedin' in req.body) asker.linkedin = linkedin(req.body.linkedin);

  if (!msg.sent) {
    const twin = twinOf(talk, msg);
    if (twin) {
      if (!twin.askers.includes(asker.id)) twin.askers.push(asker.id);
      if (twin.backers) twin.backers = twin.backers.filter((a) => a !== asker.id); // sent it themselves now
      msg.escalationId = twin.id;
    } else {
      // shared: the form now says others here see the question (never the name), so the room can back it.
      const e = { id: id(8), talkId: talk.id, question: msg.handoff, translated: msg.handoffForSpeaker, askers: [asker.id], backers: [], shared: true, status: 'open', createdAt: Date.now() };
      db.escalations.push(e); msg.escalationId = e.id;
    }
    msg.sent = true;
    track('sent_to_speaker', talk.id, { merged: Boolean(twin) });
  }
  save();
  res.json({ ok: true, me: { name: asker.name, email: asker.email, linkedin: asker.linkedin } });
});

/* ---------- numbers for the founder ---------- */

function adminOk(req) {
  const me = currentUser(req);
  if (process.env.ADMIN_EMAIL && me?.email === process.env.ADMIN_EMAIL.toLowerCase()) return true; // the founder, signed in
  if (process.env.ADMIN_KEY) return req.query.key === process.env.ADMIN_KEY || req.get('x-admin-key') === process.env.ADMIN_KEY;
  return !HOSTED && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip); // nothing set: this computer only
}
app.get('/api/admin/metrics', (req, res) => {
  if (!adminOk(req)) return fail(res, 403, 'Open this page on the computer running Auto Q&A, or add your admin key.');
  const days = Math.min(90, +req.query.days || 14), since = Date.now() - days * 864e5;
  const ev = db.events.filter((e) => e.t >= since);
  const count = (name) => ev.filter((e) => e.name === name).length;
  const uniq = (list) => new Set(list).size;
  const views = ev.filter((e) => e.name === 'view');
  const answered = count('answered'), missed = count('not_covered');
  const replyMins = ev.filter((e) => e.name === 'reply_sent').map((e) => e.minutes).sort((a, b) => a - b);
  const speeds = ev.filter((e) => e.name === 'answered' && e.ms).map((e) => e.ms).sort((a, b) => a - b);
  const mid = (a) => (a.length ? a[Math.floor(a.length / 2)] : null);
  const perDay = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const day = ev.filter((e) => new Date(e.t).toISOString().slice(0, 10) === d);
    perDay.push({ day: d, visitors: uniq(day.filter((e) => e.name === 'view').map((e) => e.v)), questions: day.filter((e) => e.name === 'question').length, talks: day.filter((e) => e.name === 'talk_ready').length });
  }
  res.json({
    days,
    funnel: [
      ['Visited the site', uniq(views.filter((e) => e.page === 'home' || e.page === 'setup').map((e) => e.v))],
      ['Started a talk', count('talk_started')],
      ['Added slides', uniq(ev.filter((e) => e.name === 'material_added').map((e) => e.talkId))],
      ['Finished setup', count('talk_ready')],
      ['Had an audience', uniq(ev.filter((e) => e.name === 'joined').map((e) => e.talkId))],
    ],
    audience: {
      joined: count('joined'), questions: count('question'), answered, notCovered: missed, sent: count('sent_to_speaker'), meToo: count('me_too'),
      replies: count('reply_sent'), slidesOpened: count('slide_opened'), connects: count('connect_tapped'), failed: count('answer_failed'),
      straightAway: answered + missed ? Math.round((answered / (answered + missed)) * 100) : null,
      medianAnswerSeconds: mid(speeds) != null ? +(mid(speeds) / 1000).toFixed(1) : null,
      medianReplyMinutes: mid(replyMins),
    },
    perDay,
    talks: db.talks.slice(-20).reverse().map((t) => ({
      title: t.title, status: t.status, created: t.createdAt,
      people: db.askers.filter((a) => a.talkId === t.id).length,
      questions: db.messages.filter((m) => m.talkId === t.id && m.role === 'user').length,
    })),
  });
});

/* ---------- pages ---------- */

app.use('/vendor/pdfjs', express.static(path.join(ROOT, 'node_modules/pdfjs-dist/build'), { maxAge: '7d' }));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));
const page = (name) => (req, res) => res.sendFile(path.join(ROOT, 'public', name));
app.get('/new', page('new.html'));
app.get('/signup', page('account.html'));
app.get('/signin', page('account.html'));
app.get('/talks', page('talks.html'));
app.get('/s/:id', page('speaker.html'));
app.get('/present/:id', page('present.html'));
app.get('/j/:code', page('join.html'));
app.get('/admin', page('admin.html'));
app.get('/healthz', (req, res) => res.json({ ok: true, version: (process.env.RENDER_GIT_COMMIT || '').slice(0, 7), fullAnswers: hasKey(), durable, lastModelError }));
app.get('/api/info', (req, res) => res.json({ accepted: ACCEPTED, fullAnswers: hasKey(), durable }));
app.use((req, res) => (req.path.startsWith('/api/') ? fail(res, 404, 'Not found.') : res.status(404).sendFile(path.join(ROOT, 'public', '404.html'))));

app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return fail(res, 413, 'That file is too big. The limit is 50 MB.');
  console.error(err);
  fail(res, 500, 'Something went wrong. Try again.');
});

app.listen(PORT, () => {
  console.log(`\n  Auto Q&A is running at ${HOSTED ? baseUrl() : 'http://localhost:' + PORT}\n`);
  if (!HOSTED) console.log(`  On your phone (same Wi-Fi): ${baseUrl()}\n`);
  if (!hasKey()) console.log('  Practice mode: no ANTHROPIC_API_KEY, so answers are simple word matches.\n');
  if (!durable) console.log('  No DATABASE_URL: data is kept in local files' + (HOSTED ? ' and will be lost on the next deploy.' : '.') + '\n');
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await flush(); process.exit(0); });
