// Where everything is kept.
// With DATABASE_URL set (any Postgres), data lives in the database and survives restarts and redeploys.
// Without it, data lives in a JSON file plus a folder of slide pictures: fine on your own computer,
// but hosting services wipe local files on every deploy.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FILE = path.resolve(process.env.AUTOQA_DATA || 'data/db.json');
const DATA_DIR = path.dirname(FILE);
const empty = () => ({ talks: [], askers: [], messages: [], escalations: [], events: [], users: [], sessions: [] });
const db = empty();
export default db;

let pool = null;
if (process.env.DATABASE_URL) {
  const { default: pg } = await import('pg');
  const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
  // Encrypted, and the database's certificate is checked, so nobody in between can read or alter the data.
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4, ssl: local ? false : { rejectUnauthorized: true } });
  await pool.query('create table if not exists autoqa_state (id int primary key, doc jsonb not null, updated_at timestamptz default now())');
  await pool.query('create table if not exists autoqa_blobs (key text primary key, data bytea not null)');
  const { rows } = await pool.query('select doc from autoqa_state where id = 1');
  if (rows[0]) Object.assign(db, rows[0].doc);
} else {
  try { Object.assign(db, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch { /* first run */ }
}
for (const [k, v] of Object.entries(empty())) db[k] ??= v;
export const durable = Boolean(pool);

let timer = null, writing = Promise.resolve();
async function write() {
  const doc = JSON.stringify(db);
  if (pool) {
    await pool.query('insert into autoqa_state (id, doc) values (1, $1) on conflict (id) do update set doc = excluded.doc, updated_at = now()', [doc]);
  } else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE + '.tmp', doc);
    fs.renameSync(FILE + '.tmp', FILE);
  }
}
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => { writing = writing.then(write).catch((e) => console.error('save failed:', e.message)); }, pool ? 400 : 150);
}
export async function flush() { clearTimeout(timer); await writing; await write().catch(() => {}); }

/* Slide pictures and other files, by key ("slides/<talk>/<file>/<n>.jpg"). */
const blobPath = (key) => path.join(DATA_DIR, key);
export async function putBlob(key, data) {
  if (pool) return void (await pool.query('insert into autoqa_blobs (key, data) values ($1, $2) on conflict (key) do update set data = excluded.data', [key, data]));
  fs.mkdirSync(path.dirname(blobPath(key)), { recursive: true });
  fs.writeFileSync(blobPath(key), data);
}
export async function getBlob(key) {
  if (pool) return (await pool.query('select data from autoqa_blobs where key = $1', [key])).rows[0]?.data || null;
  try { return fs.readFileSync(blobPath(key)); } catch { return null; }
}
export async function dropBlobs(prefix) {
  if (pool) return void (await pool.query('delete from autoqa_blobs where key like $1', [prefix.replace(/[%_\\]/g, '\\$&') + '%']));
  fs.rmSync(blobPath(prefix), { recursive: true, force: true });
}

export const id = (n = 12) => crypto.randomBytes(n).toString('base64url');

// Join codes people can type from a slide: no look-alike characters.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function joinCode() {
  for (;;) {
    const code = Array.from(crypto.randomBytes(5), (b) => ALPHABET[b % ALPHABET.length]).join('');
    if (!db.talks.some((t) => t.code === code)) return code;
  }
}

// What happened, for the numbers pages. No names or emails in here.
export function track(name, talkId = null, extra = {}) {
  db.events.push({ t: Date.now(), name, talkId, ...extra });
  if (db.events.length > 50_000) db.events.splice(0, 5_000);
  save();
}

/* Passwords: salted scrypt, never stored in the clear. */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return salt.toString('base64url') + ':' + crypto.scryptSync(password, salt, 32).toString('base64url');
}
export function checkPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const a = crypto.scryptSync(password, Buffer.from(salt, 'base64url'), 32), b = Buffer.from(hash, 'base64url');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
