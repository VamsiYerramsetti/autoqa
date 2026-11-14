// Per-talk cache report. Usage: node cache.mjs [--days 7] [--data path]
import { loadDb, arg } from '../model-spend/load.mjs';
import { costOf } from '../../../lib/prices.js';

const days = +arg('days', 7);
const { db, where: file } = await loadDb();
const calls = db.events.filter((e) => e.name === 'model_call' && e.kind === 'answer' && e.t >= Date.now() - days * 864e5);
const byTalk = Object.groupBy ? Object.groupBy(calls, (c) => c.talkId) : calls.reduce((m, c) => ((m[c.talkId] ||= []).push(c), m), {});
console.log(`Prompt cache, answer calls, last ${days} days`);
for (const [id, list] of Object.entries(byTalk)) {
  const t = db.talks.find((x) => x.id === id);
  const writes = list.filter((c) => c.cacheWrite > 0).length, reads = list.filter((c) => c.cacheRead > 0).length;
  const promptTok = list.reduce((s, c) => s + c.input + c.cacheRead + c.cacheWrite, 0);
  const share = promptTok ? list.reduce((s, c) => s + c.cacheRead, 0) / promptTok : 0;
  const actual = list.reduce((s, c) => s + (costOf(c) || 0), 0);
  const uncached = list.reduce((s, c) => s + (costOf({ ...c, input: c.input + c.cacheRead + c.cacheWrite, cacheRead: 0, cacheWrite: 0 }) || 0), 0);
  const sorted = [...list].sort((a, b) => a.t - b.t);
  const gaps = sorted.slice(1).filter((c, i) => c.t - sorted[i].t > 5 * 60e3).length;
  console.log(`\n  ${(t?.title || '(deleted)').slice(0, 60)}`);
  console.log(`    ${list.length} calls, ${writes} wrote the cache, ${reads} read it, ${gaps} gaps over 5 min`);
  console.log(`    ${Math.round(share * 100)}% of prompt tokens from cache; cost $${actual.toFixed(4)} vs $${uncached.toFixed(4)} without caching`);
  if (list.length > 3 && writes > gaps + 2) console.log('    ! more cache writes than gaps explain: something in the cached block changes between questions');
}
if (!calls.length) console.log('  no answer calls in this period');
