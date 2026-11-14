// Prompt size per talk. Usage: node size.mjs [--data path]
import { loadDb, arg } from '../model-spend/load.mjs';
import { costOf } from '../../../lib/prices.js';
const { db, where: file } = await loadDb();
const RULES = 3500; // tokens for the answering rules, roughly
console.log('Estimated prompt per answer (material / 3.6 chars per token + rules). Over 100K costs 5x on Haiku 5.5.\n');
for (const t of db.talks) {
  const chars = t.sources.reduce((s, src) => s + src.units.reduce((a, u) => a + u.text.length + 20, 0), 0);
  const est = Math.round(Math.min(chars, 300_000) / 3.6) + RULES;
  const seen = db.events.filter((e) => e.name === 'model_call' && e.kind === 'answer' && e.talkId === t.id).map((e) => e.input + e.cacheRead + e.cacheWrite);
  const max = seen.length ? Math.max(...seen) : null;
  const flag = (max ?? est) > 100_000 ? 'OVER' : (max ?? est) > 85_000 ? 'near' : 'ok';
  console.log(`${flag.padEnd(5)} ${String(est).padStart(7)} est${max ? `, ${max} seen` : ''}${chars > 300_000 ? ' (material cut at 300K chars)' : ''}  ${t.title.slice(0, 60)}`);
}
