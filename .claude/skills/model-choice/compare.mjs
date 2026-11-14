// Same questions, several models, answers + time + cost side by side. Costs money: needs --run.
// Usage: node compare.mjs --talk <id> --models a,b [--data path] --run
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(ROOT);
await import('dotenv/config');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const models = String(arg('models', 'claude-haiku-5-5')).split(',');
if (!process.argv.includes('--run')) { console.log(`This calls the API (${models.length} models x up to 12 questions). Add --run to go ahead.`); process.exit(0); }
const { loadDb } = await import('../model-spend/load.mjs');
const { db } = await loadDb();
const talk = db.talks.find((t) => t.id === arg('talk'));
if (!talk) { console.log('No talk with that id. Talks:', db.talks.map((t) => `${t.id} ${t.title}`).join('\n  ')); process.exit(1); }
const { costOf } = await import(pathToFileURL(path.join(ROOT, 'lib/prices.js')).href);
const QUESTIONS = [
  ...(talk.suggested || []).slice(0, 2),
  'Can you explain the main idea simply? I am new to this.',
  'Who funded this work?',
  'Is it worth it?',
  'Was ist das wichtigste Ergebnis?',
  'What is the capital of France?',
].slice(0, 12);
for (const model of models) {
  process.env.AUTOQA_CHAT_MODEL = model;
  const ai = await import(pathToFileURL(path.join(ROOT, 'lib/ai.js')).href + '?m=' + model); // fresh module so the model setting is read
  console.log(`\n===== ${model}`);
  let total = 0;
  for (const q of QUESTIONS) {
    const out = await ai.answer(talk, db.escalations.filter((e) => e.talkId === talk.id), [{ role: 'user', text: q }], () => {});
    const c = out.usage ? costOf(out.usage) || 0 : 0; total += c;
    console.log(`\nQ: ${q}\nA: ${out.text}${out.handoff ? '\n   [hand-off]' : ''}\n   ${out.usage?.ms ?? '-'} ms, $${c.toFixed(5)}`);
  }
  console.log(`\n${model}: $${total.toFixed(4)} for ${QUESTIONS.length} questions`);
}
