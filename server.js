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
import { svgLines, findLines } from './lib/slidetext.js';
import { renderPptx } from './lib/pptx-render.js';
import { qrSvg, qrJson, QR_STYLES } from './lib/qr.js';
import { prepare, answer, nextQuestion, hasKey, overlap, lastModelError, noteError, toTalkLanguage } from './lib/ai.js';

const PORT = +process.env.PORT || 4321;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// Behind a hosting service's front door, the visitor's real address is one hop back.
const HOSTED = Boolean(process.env.RENDER || process.env.PUBLIC_URL || process.env.TRUST_PROXY);
app.set('trust proxy', HOSTED ? 1 : 'loopback');
app.disable('x-powered-by'); // don't advertise what the server is built with

// Protection headers on every response. The content policy only lets the page load its own scripts, styles,
// fonts and pictures: no outside scripts can run even if someone manages to inject markup.
const CONTENT_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",   // our own files; the PDF reader uses WebAssembly for some pictures
  "style-src 'self' 'unsafe-inline'",       // small style attributes set from our own scripts
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': CONTENT_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // The microphone is allowed for our own pages only (the speaker can answer setup questions by voice).
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()',
  });
  if (HOSTED) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // always use https
  next();
});

// Requests that change something must come from our own pages. A browser on another site can't forge them:
// it always says where the request came from (Origin / Sec-Fetch-Site), and we refuse anything that isn't us.
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.get('origin');
  let foreign = req.get('sec-fetch-site') === 'cross-site';
  if (origin) { try { foreign ||= new URL(origin).host !== req.get('host'); } catch { foreign = true; } }
  if (foreign) return res.status(403).json({ error: 'That request came from another site.' });
  next();
});
app.use(express.json({ limit: '200kb' }));

/* ---------- Visits, counted without cookies ----------
   Each page sends a small beacon (public/js/t.js) when it opens and when it is left: which kind of page, the other
   site's name if one sent the visitor, a screen width (phone or computer), and on leaving how long the page was on
   screen and how far it was scrolled. A visitor is a one-way hash of today's random salt + a shortened IP address
   + the browser, so nobody can be recognised from one day to the next; yesterday's salt is thrown away.
   No IP address is stored, nothing is stored on the visitor's device, and browsers that send Global Privacy
   Control or Do Not Track are not counted at all. */
const PAGES = [[/^\/$/, 'home'], [/^\/signup$/, 'signup'], [/^\/signin$/, 'signin'], [/^\/talks$/, 'talks'], [/^\/new$/, 'setup'], [/^\/s\//, 'speaker'], [/^\/present\//, 'present'], [/^\/j\//, 'audience'], [/^\/privacy$/, 'privacy'], [/^\/terms$/, 'terms'], [/^\/how-answers-work$/, 'how'], [/^\/why$/, 'why'], [/^\/how-it-works$/, 'howitworks']];
const today = () => new Date().toISOString().slice(0, 10);
function dailySalt() {
  if (db.salts?.day !== today()) { db.salts = { day: today(), salt: id(16) }; delete db.salt; save(); }
  return db.salts.salt;
}
function shortIp(ip = '') {
  ip = ip.replace(/^::ffff:/, '');
  return ip.includes('.') ? ip.split('.').slice(0, 3).join('.') + '.0' : ip.split(':').slice(0, 3).join(':') + '::';
}
const visitorOf = (req) => crypto.createHash('sha256').update(dailySalt() + shortIp(req.ip) + (req.get('user-agent') || '')).digest('base64url').slice(0, 12);
const optedOut = (req) => req.get('sec-gpc') === '1' || req.get('dnt') === '1';
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python-requests|headlesschrome/i;
function deviceOf(ua = '', width = 0) {
  const dev = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) || (width && width < 700) ? 'mobile' : 'desktop';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Other';
  return { dev, br, os };
}
app.post('/api/t', express.text({ type: '*/*', limit: '2kb' }), (req, res) => {
  res.status(204).end();
  if (optedOut(req) || BOT.test(req.get('user-agent') || '') || over('beacon', req.ip, 600)) return;
  let b; try { b = JSON.parse(req.body || '{}'); } catch { return; }
  const hit = PAGES.find(([re]) => re.test(String(b.p || '')));
  if (!hit) return;
  const v = visitorOf(req), page = hit[1];
  if (b.e === 'view') {
    let ref = '';
    try { const h = new URL(String(b.r || '')).hostname.replace(/^www\./, ''); if (h && h !== req.hostname) ref = h.slice(0, 60); } catch {}
    track('view', null, { page, v, ...deviceOf(req.get('user-agent'), +b.w || 0), ref, utm: String(b.u || '').replace(/[^\w.-]/g, '').slice(0, 40) });
  } else if (b.e === 'leave') {
    const ms = Math.max(0, Math.min(+b.d || 0, 4 * 3600e3)), scroll = Math.max(0, Math.min(100, Math.round(+b.s || 0)));
    if (ms > 300) track('leave', null, { page, v, ms: Math.round(ms), scroll });
  }
});

// Limits. over('what', who, max, ms) is true once `who` has done `what` more than `max` times in `ms`.
// A whole room often shares one network address (venue Wi-Fi), so limits on questions are per seat and per talk,
// and the per-address limits are set high enough for a full hall.
const counters = new Map();
function over(what, who, max, ms = 60_000) {
  const key = what + ':' + who, now = Date.now();
  const list = (counters.get(key) || []).filter((t) => now - t < ms);
  list.push(now); counters.set(key, list);
  return list.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, list] of counters) if (!list.length || now - list.at(-1) > 3_600_000) counters.delete(k); }, 600_000).unref();
const LIMITS = {
  questionsPerSeat: 8,        // per minute, one person
  questionsPerTalk: 300,      // per minute, the whole room
  questionsPerTalkDay: 4000,  // per day: keeps one talk from running up the model bill
  questionsPerAddress: 900,   // per minute
  writesPerAddress: 1200,     // per minute, anything that changes data
  seatsPerAddress: 1500,      // new audience seats per hour
  seatsPerTalk: 10_000,
  talksPerAccount: 200,
  uploadsPerAccount: 60,      // files per hour
};
function tooFast(req, asker, talk) {
  return over('q-seat', asker.id, LIMITS.questionsPerSeat) || over('q-talk', talk.id, LIMITS.questionsPerTalk)
    || over('q-day', talk.id, LIMITS.questionsPerTalkDay, 864e5) || over('q-ip', req.ip, LIMITS.questionsPerAddress);
}
app.use((req, res, next) => {
  if (req.method !== 'GET' && over('write', req.ip, LIMITS.writesPerAddress)) return res.status(429).json({ error: 'Too much at once. Give it a minute.' });
  next();
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 3 } });

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
// A LinkedIn link, however it was typed: a full address, "linkedin.com/in/maya", "in/maya", "@maya" or just "maya".
// Always comes out as a clean https://www.linkedin.com/... address, or '' when it isn't LinkedIn.
function linkedin(v) {
  v = text(v, 200).trim();
  if (!v) return '';
  // A name rather than a handle: a LinkedIn search for that name (we can't know their exact profile).
  if (/^[\p{L}.'’-]+(\s+[\p{L}.'’-]+)+$/u.test(v)) return 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(v.replace(/\s+/g, ' '));
  v = v.replace(/\s+/g, '');
  if (/^@?[\p{L}\p{N}_%-]{2,100}$/u.test(v)) return 'https://www.linkedin.com/in/' + v.replace(/^@/, '');
  if (/^\/?(in|company|school)\//i.test(v)) v = 'linkedin.com/' + v.replace(/^\//, '');
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, '');
  try {
    const u = new URL(v);
    if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return '';
    if (/^\/search\/results\/people\/?$/.test(u.pathname) && u.searchParams.get('keywords')) return 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(u.searchParams.get('keywords').slice(0, 100));
    return 'https://www.linkedin.com' + u.pathname.replace(/\/+$/, '');
  } catch { return ''; }
}
// Any other web address a speaker adds to their profile: https only, no scripts.
function website(v) {
  v = text(v, 200).replace(/\s+/g, '');
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return u.protocol === 'https:' && u.hostname.includes('.') ? u.href : ''; } catch { return ''; }
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
// Sign-in tokens are stored scrambled (hashed), so a copy of the database can't be used to sign in as someone.
const scramble = (token) => crypto.createHash('sha256').update(String(token)).digest('base64url');
function currentUser(req) {
  const token = cookie(req, COOKIE);
  const hash = token && scramble(token);
  // s.token === token: sign-ins from before tokens were scrambled keep working until they expire.
  const session = token && db.sessions.find((s) => (s.hash === hash || s.token === token) && Date.now() - s.createdAt < 30 * 864e5);
  return session ? db.users.find((u) => u.id === session.userId) || null : null;
}
function startSession(req, res, user) {
  const token = id(24);
  db.sessions = db.sessions.filter((s) => Date.now() - s.createdAt < 30 * 864e5);
  db.sessions.push({ hash: scramble(token), userId: user.id, createdAt: Date.now() });
  save();
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 30 * 864e5, path: '/' });
}
const publicUser = (u) => ({ name: u.name, email: u.email, linkedin: u.linkedin || '', headline: u.headline || '', bio: u.bio || '', website: u.website || '', contactEmail: u.contactEmail || '' });
// What the audience may see about the speaker: only what the speaker chose to put on their profile.
function speakerProfile(talk) {
  const u = db.users.find((x) => x.id === talk.userId) || {};
  return { name: talk.speaker.name, linkedin: u.linkedin || talk.speaker.linkedin || '', headline: u.headline || '', bio: u.bio || '', website: u.website || '', email: u.contactEmail || '' };
}

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
// What the person typed just before this answer: the model rewords a question differently each time
// ("the Rooftop Rain approach" vs "the 8 cm storage layer"), but people asking the same thing type alike.
function typedBefore(msg) {
  const mine = db.messages.filter((m) => m.askerId === msg.askerId);
  return mine.slice(0, mine.indexOf(msg)).reverse().find((m) => m.role === 'user')?.text || '';
}
function twinOf(talk, msg) {
  const inTalkLanguage = (x) => x.translated || x.handoffForSpeaker || x.question || x.handoff;
  const typed = typedBefore(msg);
  return talkEscalations(talk).find((e) => e.status === 'open' && Math.max(overlap(e.question, msg.handoff), overlap(inTalkLanguage(e), inTalkLanguage(msg)),
    e.typed && typed ? overlap(e.typed, typed) : 0) >= 0.75);
}

// Suggested questions for the audience: the ones written when the talk was prepared, topped up with one per slide
// title, so when someone taps one there is always another to take its place (older talks only have three).
function suggestions(talk) {
  const out = [...(talk.suggested || [])];
  const seen = new Set(out.map((q) => q.toLowerCase()));
  for (const s of talk.sources) for (const u of s.units) {
    if (out.length >= 12 || !/^Slide /.test(u.label) || u.n === 1) continue; // slide 1 is usually the title
    const title = u.text.split('\n')[0].replace(/^[•\-–\s]+/, '').trim();
    if (title.length < 4 || title.length > 48 || /^\d+$/.test(title) || /^speaker notes/i.test(title)) continue;
    const q = `Explain “${title}”`;
    if (!seen.has(q.toLowerCase()) && !out.some((x) => x.toLowerCase().includes(title.toLowerCase()))) { out.push(q); seen.add(q.toLowerCase()); }
  }
  return out;
}

function speakerView(talk) {
  return {
    id: talk.id, code: talk.code, title: talk.title, speaker: talk.speaker, status: talk.status,
    summary: talk.summary, interview: talk.interview, suggested: talk.suggested,
    sources: talk.sources.map((s) => ({ id: s.id, name: s.name, count: s.units.length, kind: s.units[0]?.label.split(' ')[0] || 'Part', pdf: /\.pdf$/i.test(s.name), deck: /\.pptx$/i.test(s.name), images: (s.images || []).length, drawn: s.drawn || [] })),
    joinUrl: joinUrl(talk), fullAnswers: hasKey(), key: talk.key, profile: speakerProfile(talk),
    corrections: (talk.corrections || []).map((c) => ({ id: c.id, q: c.q, fix: c.fix, createdAt: c.createdAt })),
  };
}

/* ---------- accounts ---------- */

const DUMMY_PASS = hashPassword(id(12));
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
  // Check a password even when there is no such account, so the time taken doesn't reveal which emails exist.
  const ok = checkPassword(String(req.body.password || '').slice(0, 200), user ? user.pass : DUMMY_PASS);
  if (!user || !ok) return fail(res, 401, "That email and password don't match.");
  startSession(req, res, user); track('signed_in');
  res.json({ me: publicUser(user) });
});

app.post('/api/signout', (req, res) => {
  const token = cookie(req, COOKIE);
  db.sessions = db.sessions.filter((s) => s.token !== token && s.hash !== scramble(token || '')); save();
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
  if ('headline' in req.body) user.headline = text(req.body.headline, 120);
  if ('bio' in req.body) user.bio = text(req.body.bio, 600);
  if ('website' in req.body) user.website = website(req.body.website);
  if ('contactEmail' in req.body) { const e = text(req.body.contactEmail, 160); user.contactEmail = isEmail(e) ? e : ''; }
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
  if (db.talks.filter((t) => t.userId === user.id).length >= LIMITS.talksPerAccount) return fail(res, 429, 'You have a lot of talks. Delete one you no longer need first.');
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
  // The speaker's public profile, editable from the talk page (also on their phone, via the private link).
  const owner = db.users.find((u) => u.id === talk.userId);
  if (owner) {
    if ('headline' in req.body) owner.headline = text(req.body.headline, 120);
    if ('bio' in req.body) owner.bio = text(req.body.bio, 600);
    if ('website' in req.body) owner.website = website(req.body.website);
    if ('contactEmail' in req.body) { const e = text(req.body.contactEmail, 160); owner.contactEmail = isEmail(e) ? e : ''; }
  }
  save(); res.json(speakerView(talk));
});

// Check who is asking BEFORE accepting the upload, so strangers can't make the server swallow large files.
const ownTalkFirst = (req, res, next) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  if (over('upload', talk.userId || talk.id, LIMITS.uploadsPerAccount, 3_600_000)) return fail(res, 429, 'That is a lot of files. Try again in an hour.');
  next();
};
app.post('/api/talks/:id/files', ownTalkFirst, upload.array('files'), async (req, res) => {
  const talk = db.talks.find((t) => t.id === req.params.id);
  const problems = [], before = talk.sources.length;
  for (const f of req.files || []) {
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    try {
      const units = await parseFile(name, f.buffer);
      if (!units.length) { problems.push(`${name} has no text we can read. If it's all images, export it with speaker notes or add a text file.`); continue; }
      const src = { id: id(6), name, units };
      talk.sources.push(src); tagSource(talk, src);
      if (/\.pptx$/i.test(name)) await drawSlides(talk, src, f.buffer);
      track('material_added', talk.id, { kind: name.split('.').pop().toLowerCase() });
    } catch (e) {
      problems.push(e.message.startsWith("Can't read") ? `${name}: ${e.message}` : `We couldn't open ${name}. Try exporting it as a PDF.`);
    }
  }
  // A file that couldn't be read changes nothing: a talk that is already open stays open.
  if (talk.sources.length !== before) talk.status = 'draft';
  save();
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
const slideKey = (talk, sid, n = '', ext = 'jpg') => `slides/${talk.id}/${sid}/${n ? n + '.' + ext : ''}`;

// PowerPoint slides are drawn here as SVG pictures. The speaker's browser then turns each into a small JPEG
// (as with PDFs); until it has, the audience is shown the SVG itself.
async function drawSlides(talk, src, buffer) {
  try {
    const drawn = [];
    for (const { n, svg } of await renderPptx(buffer)) {
      if (svg.length > 15_000_000) continue;
      await putBlob(slideKey(talk, src.id, n, 'svg'), Buffer.from(svg));
      drawn.push(n);
      // Where each line sits, so answers can mark the words on this slide (kept after the picture becomes a JPEG).
      const unit = src.units.find((u) => u.n === n);
      if (unit) unit.boxes = svgLines(svg);
    }
    src.drawn = drawn;
  } catch (e) { console.error('slide drawing failed:', e.message); }
}
// Our own drawing of a slide, served with rules that stop it from ever running anything.
function sendSvg(res, data) {
  res.set({ 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'; sandbox", 'Cache-Control': 'private, max-age=3600' }).type('image/svg+xml').send(data);
}
app.get('/api/talks/:id/files/:sid/drawn/:n', async (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const src = talk.sources.find((x) => x.id === req.params.sid), n = parseInt(req.params.n, 10);
  if (!src || !(src.drawn || []).includes(n)) return res.sendStatus(404);
  const svg = await getBlob(slideKey(talk, src.id, n, 'svg'));
  return svg ? sendSvg(res, svg) : res.sendStatus(404);
});
app.post('/api/talks/:id/files/:sid/pages/:n', express.raw({ type: 'image/jpeg', limit: '3mb' }), async (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const src = talk.sources.find((x) => x.id === req.params.sid), n = +req.params.n;
  if (!src || !Number.isInteger(n) || n < 1 || n > 500 || !Buffer.isBuffer(req.body) || !req.body.length) return fail(res, 400, "That slide picture didn't arrive.");
  await putBlob(slideKey(talk, src.id, n), req.body);
  src.images = [...new Set([...(src.images || []), n])];
  // The JPEG replaces our SVG drawing of the same slide: keep storage small.
  if ((src.drawn || []).includes(n)) { await dropBlobs(slideKey(talk, src.id, n, 'svg')); src.drawn = src.drawn.filter((x) => x !== n); }
  save(); res.json({ ok: true });
});
app.get('/j/:code/slide/:sid/:n', async (req, res) => {
  const talk = db.talks.find((t) => t.code === req.params.code.toUpperCase());
  const src = talk?.sources.find((x) => x.id === req.params.sid), n = parseInt(req.params.n, 10);
  if (src && !(src.images || []).includes(n) && (src.drawn || []).includes(n)) {
    const svg = await getBlob(slideKey(talk, src.id, n, 'svg'));
    return svg ? sendSvg(res, svg) : res.sendStatus(404);
  }
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
    talk.summary = prep.summary;
    // The questions for the speaker now come one at a time from /interview; keep any real answers already given.
    talk.interview = (talk.interview || []).filter((x) => x.a?.trim());
    talk.suggested = prep.suggested;
    if (prep.usage) track('model_call', talk.id, { kind: 'prepare', ...prep.usage });
    save(); res.json(speakerView(talk));
  } catch (e) {
    console.error('prepare failed:', e.message);
    fail(res, 502, "We couldn't read your material just now. Try again in a moment.");
  }
});

// The setup conversation. The browser sends the speaker's answer to the question on screen (or nothing, to start);
// we keep the pair and come back with the next question, or done. Stored in talk.interview as { q, a } pairs,
// the same shape the answering instructions already read as the speaker's notes.
app.post('/api/talks/:id/interview', async (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  talk.interview ||= [];
  if (req.body.restart) talk.interview = [];
  const pending = talk.interview.at(-1);
  if (pending && pending.a == null && 'answer' in req.body) {
    pending.a = text(req.body.answer, 4000);
    if (req.body.voice) pending.voice = true;
  }
  // Drop a question left unanswered (for example after a reload) so it can be asked again cleanly.
  if (talk.interview.at(-1)?.a == null) talk.interview.pop();
  const next = await nextQuestion(talk);
  if (next.usage) track('model_call', talk.id, { kind: 'interview', ...next.usage });
  if (!next.done) talk.interview.push({ q: next.question, a: null });
  save();
  res.json({ question: next.question, why: next.why || '', note: next.note, done: next.done, asked: talk.interview.filter((x) => x.a != null).length });
});

app.post('/api/talks/:id/ready', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  talk.interview.forEach((x, i) => { if (answers[i] != null) x.a = text(answers[i], 1200); });
  // A question still open when the speaker pressed "That's enough" is not part of the notes.
  talk.interview = talk.interview.filter((x) => x.a != null);
  if (talk.status !== 'ready') track('talk_ready', talk.id, { answered: talk.interview.filter((x) => x.a).length, asked: talk.interview.length });
  talk.status = 'ready'; save();
  res.json(speakerView(talk));
});

app.get('/api/talks/:id/qr.svg', async (req, res) => {
  const talk = db.talks.find((t) => t.id === req.params.id);
  if (!talk) return res.sendStatus(404);
  // The speaker's private link stays a plain black code, so it can never be mistaken for the audience's one.
  if (req.query.inbox && req.query.key === talk.key) {
    const svg = await QRCode.toString(`${baseUrl()}/s/${talk.id}#${talk.key}`, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: '#000000', light: '#ffffff' } });
    return res.type('image/svg+xml').send(svg);
  }
  // ?style= picks one of the Auto Q&A code styles (lib/qr.js); anything else gets the default.
  const style = QR_STYLES.includes(req.query.style) ? req.query.style : 'autoqa';
  res.set('Cache-Control', 'public, max-age=300').type('image/svg+xml').send(qrSvg(joinUrl(talk), style));
});

/* ---------- the Auto Q&A code as data (for the animated code drawn in the browser) ---------- */
// Public, like qr.svg: which modules are dark, the corner and alignment squares, and the hole for the mark.
app.get('/api/talks/:id/qr.json', (req, res) => {
  const talk = db.talks.find((t) => t.id === req.params.id);
  if (!talk) return res.sendStatus(404);
  res.set('Cache-Control', 'public, max-age=300').json({ url: joinUrl(talk), ...qrJson(joinUrl(talk)) });
});

/* ---------- speaker: during and after the talk ---------- */

app.get('/api/talks/:id/inbox', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  // The speaker's own test seats are left out of every number here.
  const askers = db.askers.filter((a) => a.talkId === talk.id && !a.test);
  const real = new Set(askers.map((a) => a.id));
  const byId = new Map(askers.map((a) => [a.id, a]));
  const escalations = talkEscalations(talk);
  const waiting = new Set(), heard = new Set();
  for (const e of escalations) for (const a of [...e.askers, ...(e.backers || [])]) (e.status === 'open' ? waiting : heard).add(a);
  const mine = db.messages.filter((m) => m.talkId === talk.id && real.has(m.askerId));
  const asked = new Set(mine.filter((m) => m.role === 'user').map((m) => m.askerId));
  const replies = mine.filter((m) => m.role === 'assistant');
  const feedback = mine.filter((m) => m.role === 'feedback');
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
      straightAway: replies.length ? Math.round((replies.filter((m) => !m.handoff && !m.missing).length / replies.length) * 100) : null,
      feedback: feedback.length,
    },
    trend: trendOf(mine, escalations),
    feedback: feedback.reverse().map((m) => ({ id: m.id, text: m.text, createdAt: m.createdAt })),
    top: [...tally.values()].sort((a, b) => b.n - a.n).slice(0, 5),
    seats: askers.map((a) => (waiting.has(a.id) ? 'waiting' : heard.has(a.id) ? 'replied' : asked.has(a.id) ? 'answered' : 'here')),
    items: escalations.sort((a, b) => b.createdAt - a.createdAt).map((e) => ({
      id: e.id, question: e.question, translated: e.translated || '', status: e.status, answer: e.answer || '', createdAt: e.createdAt,
      backers: (e.backers || []).length,
      people: e.askers.map((aid) => byId.get(aid)).filter(Boolean).map((a) => (e.anonymous || []).includes(a.id)
        ? { name: 'Someone', anonymous: true, email: '', linkedin: '' }
        : { name: a.name, email: a.email, linkedin: a.linkedin }),
    })),
  });
});

// How it went: questions over time in up to 12 even steps (at least 5 minutes each), the slide shown most,
// how many people wanted the speaker instead of the answer. Nothing more: the speaker wants a glance, not a report.
function trendOf(mine, escalations) {
  const qs = mine.filter((m) => m.role === 'user'), replies = mine.filter((m) => m.role === 'assistant');
  if (!qs.length) return null;
  const t0 = qs[0].createdAt, t1 = qs.at(-1).createdAt;
  const step = Math.max(5 * 60e3, Math.ceil((t1 - t0 + 1) / 12 / 60e3) * 60e3);
  const n = Math.min(12, Math.floor((t1 - t0) / step) + 1);
  const at = (t) => Math.min(n - 1, Math.max(0, Math.floor((t - t0) / step)));
  const buckets = Array.from({ length: n }, (_, i) => ({ t: t0 + i * step, asked: 0, straight: 0 }));
  for (const m of qs) buckets[at(m.createdAt)].asked++;
  for (const m of replies) if (!m.handoff && !m.missing) buckets[at(m.createdAt)].straight++;
  const shown = new Map();
  for (const m of replies) { const l = m.text.match(/^\s*\[([^\]:]+)/)?.[1]?.trim(); if (l) shown.set(l, (shown.get(l) || 0) + 1); }
  return {
    step: step / 60e3, buckets,
    slides: [...shown].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, k]) => ({ label, n: k })),
    notSatisfied: replies.filter((m) => m.unhappy).length,
    replied: escalations.filter((e) => e.status === 'answered').length,
  };
}

// Teaching: after testing their own code, the speaker corrects an answer. Used for everyone from then on.
app.post('/api/talks/:id/corrections', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  const q = text(req.body.q, 600), fix = text(req.body.fix, 2000);
  if (!q || !fix) return fail(res, 400, 'Write the right answer first.');
  if ((talk.corrections || []).length >= 200) return fail(res, 429, 'That is a lot of fixes. Add a note to your slides instead.');
  const c = { id: id(6), q, fix, wrong: text(req.body.wrong, 2000), createdAt: Date.now() };
  talk.corrections = [...(talk.corrections || []).filter((x) => x.q.toLowerCase() !== q.toLowerCase()), c];
  const m = db.messages.find((x) => x.id === req.body.messageId && x.talkId === talk.id);
  if (m) m.fixed = true;
  track('correction_added', talk.id);
  save(); res.json(speakerView(talk));
});
app.delete('/api/talks/:id/corrections/:cid', (req, res) => {
  const talk = speakerTalk(req, res); if (!talk) return;
  talk.corrections = (talk.corrections || []).filter((c) => c.id !== req.params.cid);
  save(); res.json(speakerView(talk));
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
  // The speaker trying their own code (signed in, or holding the talk's key): a test seat, left out of every number,
  // where answers can be fixed instead of sent to themselves.
  const me = talk.userId && currentUser(req);
  const isSpeaker = (me && me.id === talk.userId) || (req.get('x-key') && req.get('x-key') === talk.key);
  let entry = askerFrom(req.get('x-token'));
  if (entry.talk?.id === talk.id && isSpeaker && !entry.asker.test) { entry.asker.test = true; save(); }
  if (entry.talk?.id !== talk.id) {
    if (over('seat', req.ip, LIMITS.seatsPerAddress, 3_600_000) || db.askers.filter((a) => a.talkId === talk.id).length >= LIMITS.seatsPerTalk) return fail(res, 429, 'This talk is full right now. Try again in a little while.');
    const asker = { id: id(8), token: id(18), talkId: talk.id, name: '', email: '', linkedin: '', test: Boolean(isSpeaker), createdAt: Date.now() };
    db.askers.push(asker); save(); track('joined', talk.id, isSpeaker ? { test: true } : {});
    entry = { asker, talk };
  }
  const a = entry.asker;
  res.json({
    token: a.token, title: talk.title, speaker: speakerProfile(talk), test: Boolean(a.test), talkId: a.test ? talk.id : undefined,
    suggested: suggestions(talk), me: { name: a.name, email: a.email, linkedin: a.linkedin },
    messages: db.messages.filter((m) => m.askerId === a.id).map(publicMessage),
    waiting: waitingList(talk, a),
  });
});

const publicMessage = (m) => ({ id: m.id, role: m.role, text: m.text, about: m.about, replyTo: m.replyTo, handoff: m.handoff, alsoAnswered: m.alsoAnswered, sent: m.sent, unhappy: m.unhappy, missing: m.missing, fixed: m.fixed, createdAt: m.createdAt });

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
  const quote = String(req.query.quote || '').slice(0, 300); // the words the answer rests on, to mark on the slide
  if (tagAll(talk)) save();
  for (const s of talk.sources) {
    const u = s.units.find((x) => labelOf(s, x).toLowerCase() === want);
    if (!u) continue;
    const lines = u.text.split('\n\nSpeaker notes:')[0].split('\n').map((l) => l.replace(/^[•\-–\s]+/, '').trim()).filter(Boolean);
    const image = [...(s.images || []), ...(s.drawn || [])].includes(u.n) ? `/j/${talk.code}/slide/${s.id}/${u.n}` : null;
    const shown = lines.slice(1, 7).map((l) => l.slice(0, 160));
    // marks: boxes on the slide picture (0-1 of its size); mark: line numbers of the laid-out text (-1 = title).
    let marks = [], mark = [];
    if (quote && image && u.boxes?.length) marks = findLines(u.boxes.map((b) => b.t), quote).map((i) => { const { x, y, w, h } = u.boxes[i]; return { x, y, w, h }; });
    else if (quote) mark = findLines([lines[0] || '', ...shown], quote).map((i) => i - 1);
    return res.json({ label: labelOf(s, u), image, title: lines[0]?.slice(0, 120) || u.label, lines: shown, marks, mark });
  }
  fail(res, 404, 'Not found.');
});

const CLIENT_EVENTS = new Set(['slide_opened', 'connect_tapped', 'suggestion_tapped', 'email_tapped', 'website_tapped', 'profile_opened', 'feedback_opened']);
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
  if (tooFast(req, asker, talk)) return fail(res, 429, 'Too many questions at once. Give it a minute.');
  const mine = db.messages.filter((m) => m.askerId === asker.id);
  if (mine.filter((m) => m.role === 'user').length >= 40) return fail(res, 429, "That's a lot of questions. Catch the speaker after the talk for more.");

  db.messages.push({ id: id(8), talkId: talk.id, askerId: asker.id, role: 'user', text: question, createdAt: Date.now() });
  save();
  const history = [...mine.filter((m) => m.role === 'user' || m.role === 'assistant'), { role: 'user', text: question }]
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));

  res.set({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
  const send = (o) => res.write(JSON.stringify(o) + '\n');
  const started = Date.now(), test = asker.test ? { test: true } : {};
  let firstWord = 0;
  track('question', talk.id, test);
  try {
    const out = await answer(talk, talkEscalations(talk), history, (d) => { firstWord ||= Date.now() - started; send({ t: 'delta', text: d }); });
    // The speaker's own test seat never sends questions to the speaker: there, a missing answer is fixed instead.
    const h = asker.test ? null : out.handoff;
    const msg = { id: id(8), talkId: talk.id, askerId: asker.id, role: 'assistant', text: out.text, handoff: h?.question, handoffForSpeaker: h?.forSpeaker || undefined, alsoAnswered: h?.general || undefined, missing: out.handoff && !out.handoff.general ? true : undefined, createdAt: Date.now() };
    db.messages.push(msg); save();
    const slide = /^\s*\[(?:Slide|Page|Part)/.test(out.text);
    track(out.handoff ? 'not_covered' : 'answered', talk.id, { ms: Date.now() - started, first: firstWord, slide, ...test });
    if (out.usage) track('model_call', talk.id, { kind: 'answer', ...out.usage, ...test });
    // If others already sent the same question, say so: it is a reason to add yours.
    const twin = msg.handoff && twinOf(talk, msg);
    send({ t: 'done', message: publicMessage(msg), others: twin && !twin.askers.includes(asker.id) ? demand(twin) : 0 });
  } catch (e) {
    track('answer_failed', talk.id, test);
    noteError('answer', e);
    const msg = { id: id(8), talkId: talk.id, askerId: asker.id, role: 'assistant', text: "Something went wrong on our side.", handoff: question, createdAt: Date.now() };
    db.messages.push(msg); save();
    send({ t: 'done', message: publicMessage(msg) });
  }
  res.end();
});

// "Not what you needed? Ask the speaker": turn an answer the person wasn't happy with into a question for the speaker.
app.post('/api/unhappy', (req, res) => {
  const { asker, talk } = askerFrom(req.get('x-token'));
  if (!asker) return fail(res, 404, 'Scan the code again to rejoin.');
  if (asker.test) return fail(res, 400, 'This is your own test seat. Use "Fix this answer" instead.');
  const mine = db.messages.filter((m) => m.askerId === asker.id);
  const i = mine.findIndex((m) => m.id === req.body.messageId && m.role === 'assistant');
  if (i < 0) return fail(res, 400, "We can't find that answer.");
  const msg = mine[i], asked = mine.slice(0, i).reverse().find((m) => m.role === 'user');
  if (!msg.handoff) { msg.handoff = asked?.text || 'Question'; msg.unhappy = true; track('unhappy', talk.id); save(); }
  res.json({ message: publicMessage(msg) });
});

// Feedback for the speaker. It isn't a question, so nothing answers it: it goes to the speaker, without a name.
app.post('/api/feedback', (req, res) => {
  const { asker, talk } = askerFrom(req.get('x-token'));
  if (!asker) return fail(res, 404, 'Scan the code again to rejoin.');
  const body = text(req.body.text, 1000);
  if (body.length < 3) return fail(res, 400, 'Write a little more first.');
  if (over('feedback', asker.id, 5)) return fail(res, 429, 'Too much at once. Give it a minute.');
  if (db.messages.filter((m) => m.askerId === asker.id && m.role === 'feedback').length >= 10) return fail(res, 429, "That's plenty of feedback. Thank you!");
  const msg = { id: id(8), talkId: talk.id, askerId: asker.id, role: 'feedback', text: body, createdAt: Date.now() };
  db.messages.push(msg); save();
  track('feedback_sent', talk.id, asker.test ? { test: true } : {});
  res.json({ message: publicMessage(msg) });
});

// The asker chooses to send an unanswered question to the speaker, and says who they are.
app.post('/api/handoff', (req, res) => {
  const { asker, talk } = askerFrom(req.get('x-token'));
  if (!asker) return fail(res, 404, 'Scan the code again to rejoin.');
  const msg = db.messages.find((m) => m.id === req.body.messageId && m.askerId === asker.id && m.handoff);
  if (!msg) return fail(res, 400, "We can't find that question.");
  if (asker.test) return fail(res, 400, 'This is your own test seat. Use "Fix this answer" instead.');
  // Anonymous: the speaker sees the question but no name or email. The reply still reaches this person,
  // because it appears in their own chat on this phone.
  const anonymous = req.body.anonymous === true;
  if (!anonymous) {
    const name = text(req.body.name, 80) || asker.name, email = text(req.body.email, 160) || asker.email;
    if (!name) return fail(res, 400, 'Add your name.');
    if (!isEmail(email)) return fail(res, 400, "That email doesn't look right.");
    Object.assign(asker, { name, email });
    if ('linkedin' in req.body) asker.linkedin = linkedin(req.body.linkedin);
  }

  if (!msg.sent) {
    const twin = twinOf(talk, msg);
    if (twin) {
      if (!twin.askers.includes(asker.id)) twin.askers.push(asker.id);
      if (anonymous) twin.anonymous = [...new Set([...(twin.anonymous || []), asker.id])];
      if (twin.backers) twin.backers = twin.backers.filter((a) => a !== asker.id); // sent it themselves now
      msg.escalationId = twin.id;
    } else {
      // shared: the form now says others here see the question (never the name), so the room can back it.
      const e = { id: id(8), talkId: talk.id, question: msg.handoff, translated: msg.handoffForSpeaker, typed: typedBefore(msg).slice(0, 600) || undefined, askers: [asker.id], anonymous: anonymous ? [asker.id] : [], backers: [], shared: true, status: 'open', createdAt: Date.now() };
      db.escalations.push(e); msg.escalationId = e.id;
      // No line in the talk's language yet: add one in the background if the question needs it (lib/ai.js says why).
      if (!e.translated) toTalkLanguage(talk, e.question).then((t) => { if (t) { e.translated = t; save(); } });
    }
    msg.sent = true;
    track('sent_to_speaker', talk.id, { merged: Boolean(twin), anonymous, unhappy: Boolean(msg.unhappy) });
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
const median = (a) => { a = [...a].sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
const pct = (a, p) => { a = [...a].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null; };
const share = (n, d) => (d ? Math.round((n / d) * 100) : null);
const tallyBy = (list, key, top = 8) => {
  const m = new Map();
  for (const x of list) { const k = typeof key === 'function' ? key(x) : x[key]; if (k != null && k !== '') m.set(k, (m.get(k) || 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, top).map(([name, n]) => ({ name, n }));
};
const STARTED = Date.now();

// The founder portal (/admin). Everything here comes from the cookie-free counts above and the talks themselves.
app.get('/api/admin/metrics', (req, res) => {
  if (!adminOk(req)) return fail(res, 403, 'Sign in with the founder account, or open this on the computer running Auto Q&A.');
  const days = Math.min(KEEP_COUNTS_DAYS, Math.max(1, +req.query.days || 7)), now = Date.now(), since = now - days * 864e5;
  const all = db.events.filter((e) => e.t >= since);
  const ev = all.filter((e) => !e.test); // speakers' own tests never count
  const named = (n) => ev.filter((e) => e.name === n);
  const count = (n) => named(n).length;

  // Visits: one visitor's page views with less than 30 minutes between them (the usual definition).
  const hits = ev.filter((e) => (e.name === 'view' || e.name === 'leave') && e.v).sort((a, b) => a.t - b.t);
  const byVisitor = new Map();
  for (const e of hits) (byVisitor.get(e.v) || byVisitor.set(e.v, []).get(e.v)).push(e);
  const visits = [];
  for (const list of byVisitor.values()) {
    let cur = null;
    for (const e of list) {
      if (!cur || e.t - cur.last > 30 * 60e3) { cur = { views: 0, ms: 0, first: null, last: e.t }; visits.push(cur); }
      cur.last = e.t;
      if (e.name === 'view') { cur.views++; cur.first ||= e; } else cur.ms += e.ms || 0;
    }
  }
  const real = visits.filter((x) => x.first);
  const views = named('view'), leaves = named('leave');
  const perDay = [];
  for (let i = Math.min(days, 90) - 1; i >= 0; i--) {
    const d = new Date(now - i * 864e5).toISOString().slice(0, 10);
    const day = ev.filter((e) => new Date(e.t).toISOString().slice(0, 10) === d);
    perDay.push({
      day: d, visitors: new Set(day.filter((e) => e.name === 'view').map((e) => e.v)).size,
      questions: day.filter((e) => e.name === 'question').length, talks: day.filter((e) => e.name === 'talk_ready').length,
      cost: +day.filter((e) => e.name === 'model_call').reduce((sum, e) => sum + (costOf(e) || 0), 0).toFixed(4),
    });
  }
  const pages = [...new Set(views.map((e) => e.page))].map((page) => {
    const pl = leaves.filter((e) => e.page === page), pv = views.filter((e) => e.page === page);
    return { page, views: pv.length, visitors: new Set(pv.map((e) => e.v)).size,
      avgSec: pl.length ? Math.round(pl.reduce((a, e) => a + e.ms, 0) / pl.length / 1000) : null,
      scroll: pl.length ? Math.round(pl.reduce((a, e) => a + (e.scroll || 0), 0) / pl.length) : null };
  }).sort((a, b) => b.views - a.views);

  const answered = count('answered'), missed = count('not_covered'), asked = count('question');
  const answers = [...named('answered'), ...named('not_covered')];
  const calls = named('model_call');
  const byModel = [...new Set(calls.map((c) => c.model))].map((model) => {
    const list = calls.filter((c) => c.model === model), sum = (k) => list.reduce((a, c) => a + (c[k] || 0), 0);
    return { model, calls: list.length, input: sum('input'), output: sum('output'), cacheRead: sum('cacheRead'), cacheWrite: sum('cacheWrite'), cost: +list.reduce((a, c) => a + (costOf(c) || 0), 0).toFixed(4) };
  });
  const totalCost = byModel.reduce((a, m) => a + m.cost, 0), promptTokens = byModel.reduce((a, m) => a + m.input + m.cacheRead + m.cacheWrite, 0);
  const costByTalk = new Map();
  for (const c of calls) costByTalk.set(c.talkId, (costByTalk.get(c.talkId) || 0) + (costOf(c) || 0));
  // Audience funnel in people, not events, from the seats themselves (names are wiped after a while; seats stay).
  const seats = db.askers.filter((a) => !a.test && a.createdAt >= since), seatIds = new Set(seats.map((a) => a.id));
  const seatMsgs = db.messages.filter((m) => seatIds.has(m.askerId));
  const people = (fn) => new Set(seatMsgs.filter(fn).map((m) => m.askerId)).size;

  res.json({
    days,
    overview: {
      visitors: new Set(views.map((e) => e.v)).size, visits: real.length, pageviews: views.length,
      viewsPerVisit: real.length ? +(views.length / real.length).toFixed(1) : null,
      bounce: share(real.filter((x) => x.views === 1).length, real.length),
      avgVisitSec: real.length ? Math.round(real.reduce((a, x) => a + x.ms, 0) / real.length / 1000) : null,
      live: new Set(all.filter((e) => (e.name === 'view' || e.name === 'leave') && e.t > now - 5 * 60e3).map((e) => e.v)).size,
    },
    perDay, pages,
    sources: tallyBy(real, (x) => x.first.ref || (x.first.utm ? 'utm: ' + x.first.utm : x.first.page === 'audience' ? 'QR code or typed link' : 'Direct'), 10),
    entries: tallyBy(real, (x) => x.first.page, 8),
    devices: { type: tallyBy(views, 'dev'), browser: tallyBy(views, 'br'), os: tallyBy(views, 'os') },
    funnels: {
      speaker: [
        ['Saw the home page or setup', new Set(views.filter((e) => e.page === 'home' || e.page === 'setup').map((e) => e.v)).size],
        ['Started a talk', count('talk_started')],
        ['Added slides', new Set(named('material_added').map((e) => e.talkId)).size],
        ['Finished setup', count('talk_ready')],
        ['Had an audience', new Set(named('joined').map((e) => e.talkId)).size],
      ],
      audience: [
        ['Joined', seats.length],
        ['Asked something', people((m) => m.role === 'user')],
        ['Got an answer straight away', people((m) => m.role === 'assistant' && !m.handoff && !m.missing)],
        ['Sent a question to the speaker', people((m) => m.sent)],
        ['Got a reply', people((m) => m.role === 'speaker')],
      ],
    },
    product: {
      questions: asked, straightAway: share(answered, answered + missed), notCovered: missed,
      withSlide: share(answers.filter((e) => e.slide).length, answers.length),
      unhappy: count('unhappy'), unhappyShare: share(count('unhappy'), answers.length),
      sent: count('sent_to_speaker'), meToo: count('me_too'), replies: count('reply_sent'), feedback: count('feedback_sent'),
      corrections: count('correction_added'), slidesOpened: count('slide_opened'), connects: count('connect_tapped'),
    },
    speed: {
      answerMedianSec: median(answers.filter((e) => e.ms).map((e) => e.ms / 1000)), answerP90Sec: pct(answers.filter((e) => e.ms).map((e) => e.ms / 1000), 0.9),
      firstWordMedianSec: median(answers.filter((e) => e.first).map((e) => e.first / 1000)), firstWordP90Sec: pct(answers.filter((e) => e.first).map((e) => e.first / 1000), 0.9),
      replyMedianMin: median(named('reply_sent').map((e) => e.minutes)),
    },
    cost: {
      total: +totalCost.toFixed(4), perQuestion: asked ? +(totalCost / asked).toFixed(5) : null, byModel,
      cacheShare: share(byModel.reduce((a, m) => a + m.cacheRead, 0), promptTokens),
      longPrompts: calls.filter((c) => c.input + c.cacheRead + c.cacheWrite > 100_000).length,
      topTalks: [...costByTalk].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tid, c]) => ({ title: db.talks.find((t) => t.id === tid)?.title || '(deleted)', cost: +c.toFixed(4) })),
    },
    health: {
      uptimeHours: +((now - STARTED) / 3600e3).toFixed(1), node: process.version, version: (process.env.RENDER_GIT_COMMIT || '').slice(0, 7),
      memoryMb: Math.round(process.memoryUsage().rss / 1e6), durable, fullAnswers: hasKey(), lastModelError,
      records: { talks: db.talks.length, people: db.askers.length, messages: db.messages.length, events: db.events.length },
      failedAnswers: count('answer_failed'),
    },
    talks: db.talks.slice(-20).reverse().map((t) => {
      const ppl = db.askers.filter((a) => a.talkId === t.id && !a.test), ids = new Set(ppl.map((a) => a.id));
      const msgs = db.messages.filter((m) => m.talkId === t.id && ids.has(m.askerId)), rep = msgs.filter((m) => m.role === 'assistant');
      return { title: t.title, speaker: t.speaker.name, status: t.status, created: t.createdAt, people: ppl.length,
        questions: msgs.filter((m) => m.role === 'user').length, straightAway: share(rep.filter((m) => !m.handoff && !m.missing).length, rep.length),
        feedback: msgs.filter((m) => m.role === 'feedback').length, cost: +(costByTalk.get(t.id) || 0).toFixed(4) };
    }),
  });
});

/* ---------- keeping only what is needed ---------- */

// The privacy page promises this, so the code does it: 90 days after someone gave their name, email or LinkedIn
// to a speaker, those details are wiped (the question stays, without the person). Visit counts go after a year.
const KEEP_DETAILS_DAYS = 90, KEEP_COUNTS_DAYS = 365;
function tidyUp() {
  const now = Date.now(); let changed = false;
  for (const a of db.askers) {
    if ((a.name || a.email || a.linkedin) && now - a.createdAt > KEEP_DETAILS_DAYS * 864e5) { a.name = ''; a.email = ''; a.linkedin = ''; a.wiped = true; changed = true; }
  }
  const before = db.events.length;
  db.events = db.events.filter((e) => now - e.t < KEEP_COUNTS_DAYS * 864e5);
  if (changed || db.events.length !== before) save();
}
tidyUp(); setInterval(tidyUp, 6 * 3_600_000).unref();

/* ---------- pages ---------- */

// Public facts the legal pages need. The contact address comes from a setting, never from the code.
app.get('/api/site', (req, res) => res.json({ contact: process.env.CONTACT_EMAIL || '', operator: process.env.OPERATOR_NAME || '', keepDetailsDays: KEEP_DETAILS_DAYS, keepCountsDays: KEEP_COUNTS_DAYS }));
app.get('/sitemap.xml', (req, res) => {
  const base = baseUrl();
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/why', '/how-it-works', '/how-answers-work', '/privacy', '/terms'].map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
});
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /s/\nDisallow: /j/\nDisallow: /present/\nDisallow: /api/\nDisallow: /admin\nDisallow: /talks\nDisallow: /new\n\nSitemap: ${baseUrl()}/sitemap.xml\n`));
// A standard place for security researchers to find out how to report a problem.
app.get('/.well-known/security.txt', (req, res) => res.type('text/plain').send(`Contact: ${process.env.CONTACT_EMAIL ? 'mailto:' + process.env.CONTACT_EMAIL : 'https://github.com/VamsiYerramsetti/autoqa/security/advisories/new'}\nPreferred-Languages: en, nl\nPolicy: ${baseUrl()}/privacy#security\n`));


app.use('/vendor/pdfjs', express.static(path.join(ROOT, 'node_modules/pdfjs-dist/build'), { maxAge: '7d' }));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));
const page = (name) => (req, res) => res.sendFile(path.join(ROOT, 'public', name));
app.get('/new', page('new.html'));
app.get('/signup', page('account.html'));
app.get('/signin', page('account.html'));
app.get('/talks', page('talks.html'));
app.get('/terms', page('terms.html'));
app.get('/why', page('why.html'));
app.get('/how-it-works', page('how-it-works.html'));
app.get('/how-answers-work', page('how-answers-work.html'));
app.get('/s/:id', page('speaker.html'));
app.get('/present/:id', page('present.html'));
app.get('/j/', (req, res) => res.redirect(302, '/j/' + String(req.query.code || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8)));
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
