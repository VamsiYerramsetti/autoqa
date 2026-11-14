// Reads the app's saved data, read-only, for the FinOps scripts.
// --data <file>: a JSON file (local runs). Otherwise DATABASE_URL (the live Postgres) if set, else data/db.json.
// Never prints the database address or any key.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const arg = (name, d) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : d; };
export async function loadDb() {
  const file = arg('data');
  if (!file && process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: local ? false : { rejectUnauthorized: true } });
    await client.connect();
    try { const { rows } = await client.query('select doc from autoqa_state where id = 1'); return { db: rows[0]?.doc || {}, where: 'the database' }; }
    finally { await client.end(); }
  }
  const f = file || process.env.AUTOQA_DATA || path.join(ROOT, 'data/db.json');
  return { db: JSON.parse(fs.readFileSync(f, 'utf8')), where: f };
}
