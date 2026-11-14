// Spend report from the app's own records. Usage: node spend.mjs [--days 30] [--data path] [--json]
import { loadDb, arg } from './load.mjs';
import { costOf } from '../../../lib/prices.js';


const days = +arg('days', 30);
const { db, where: file } = await loadDb();
const since = Date.now() - days * 864e5;
const calls = db.events.filter((e) => e.name === 'model_call' && e.t >= since).map((e) => ({ ...e, cost: costOf(e) ?? 0 }));
const questions = db.events.filter((e) => e.name === 'question' && e.t >= since && !e.test).length;
const sum = (l, k) => l.reduce((s, x) => s + (x[k] || 0), 0);
const group = (l, key) => Object.entries(l.reduce((m, x) => { const k = typeof key === 'function' ? key(x) : x[key]; (m[k] ||= []).push(x); return m; }, {}))
  .map(([k, v]) => ({ key: k, calls: v.length, cost: sum(v, 'cost'), input: sum(v, 'input'), output: sum(v, 'output'), cacheRead: sum(v, 'cacheRead'), cacheWrite: sum(v, 'cacheWrite') }))
  .sort((a, b) => b.cost - a.cost);
const prompt = (x) => x.input + x.cacheRead + x.cacheWrite;
const title = (id) => db.talks.find((t) => t.id === id)?.title || '(deleted)';
const answers = calls.filter((c) => c.kind === 'answer');
const report = {
  days, file, calls: calls.length, total: sum(calls, 'cost'), questions,
  perQuestion: questions ? sum(answers.filter((c) => !c.test), 'cost') / questions : null,
  cacheShareAnswers: answers.length ? sum(answers, 'cacheRead') / Math.max(1, answers.reduce((s, c) => s + prompt(c), 0)) : null,
  over100k: calls.filter((c) => prompt(c) > 100_000).length,
  testCost: sum(calls.filter((c) => c.test), 'cost'),
  byDay: group(calls, (c) => new Date(c.t).toISOString().slice(0, 10)).sort((a, b) => a.key.localeCompare(b.key)),
  byModel: group(calls, 'model'), byKind: group(calls, 'kind'),
  topTalks: group(calls, 'talkId').slice(0, 10).map((g) => ({ ...g, key: title(g.key) })),
};
if (process.argv.includes('--json')) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
const $ = (v) => '$' + (v < 0.01 ? v.toFixed(5) : v.toFixed(3));
const pct = (v) => (v == null ? '-' : Math.round(v * 100) + '%');
console.log(`Model spend, last ${days} days (${file})`);
console.log(`  total ${$(report.total)} over ${report.calls} calls; ${questions} audience questions; per question ${report.perQuestion == null ? '-' : $(report.perQuestion)}`);
console.log(`  cache share on answers ${pct(report.cacheShareAnswers)}; calls over 100K prompt tokens: ${report.over100k}; speaker tests cost ${$(report.testCost)}`);
const show = (name, rows) => { console.log(`\n${name}`); for (const r of rows) console.log(`  ${String(r.key).slice(0, 40).padEnd(40)} ${String(r.calls).padStart(5)} calls  ${$(r.cost).padStart(10)}  in ${r.input} / cache ${r.cacheRead}+${r.cacheWrite} / out ${r.output}`); };
show('By model', report.byModel); show('By kind', report.byKind); show('By day', report.byDay); show('Top talks', report.topTalks);
