// Everything that talks to the model lives here.
// With no ANTHROPIC_API_KEY the app still runs in a simple "practice mode"
// that looks answers up by matching words, so every screen can be tried out.
import Anthropic from '@anthropic-ai/sdk';
import { labelOf, tagAll } from './parse.js';

const CHAT_MODEL = process.env.AUTOQA_CHAT_MODEL || 'claude-haiku-5-5';
// Both default to the cheapest model. Set AUTOQA_PREP_MODEL to a stronger one if the speaker's questions get too generic.
const PREP_MODEL = process.env.AUTOQA_PREP_MODEL || CHAT_MODEL;

// The last time the model service refused or failed, for /healthz. No message text, no secrets.
export let lastModelError = null;
export const noteError = (where, e) => { lastModelError = { where, status: e?.status || null, type: e?.error?.error?.type || e?.name || 'error', at: new Date().toISOString() }; console.error(`${where} failed:`, e?.status || '', e?.message); };
const MAX_MATERIAL = 350_000; // characters; roughly 90k tokens

export const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY);
let client;
const api = () => (client ??= new Anthropic());

export function material(talk) {
  let out = '';
  tagAll(talk);
  for (const src of talk.sources) {
    out += `\n\n## File: ${src.name}\n`;
    for (const u of src.units) out += `\n[${labelOf(src, u)}]\n${u.text}\n`;
  }
  return out.slice(0, MAX_MATERIAL).trim();
}

function background(talk) {
  const qa = (talk.interview || []).filter((x) => x.a?.trim());
  return qa.length ? qa.map((x) => `Q: ${x.q}\nA: ${x.a}`).join('\n\n') : '(none)';
}

function learned(escalations) {
  const done = escalations.filter((e) => e.status === 'answered' && e.answer);
  return done.length ? done.map((e) => `Q: ${e.question}\nA: ${e.answer}`).join('\n\n') : '';
}

/* ---------- Preparing a talk ---------- */

const FALLBACK_INTERVIEW = [
  'Who is this talk for?',
  'What is the one thing people should remember?',
  'What will people ask that is not on the slides?',
  'Is there anything you would rather not be asked?',
];

export async function prepare(talk) {
  if (!hasKey()) {
    return {
      summary: '',
      interview: FALLBACK_INTERVIEW.map((q) => ({ q, a: '' })),
      suggested: ['What is this talk about?', 'What is the main takeaway?', 'What comes next?'],
    };
  }
  const request = (model) => api().messages.create({
    model,
    max_tokens: 1500,
    system:
      'You help a speaker get ready for audience questions. You read their talk material and work out ' +
      'what an audience would ask that the material does not answer. Write plainly, like a helpful colleague. ' +
      'No jargon, no flattery.',
    tools: [{
      name: 'save_prep',
      description: 'Save the preparation for this talk.',
      input_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'One plain sentence: what this talk is about.' },
          interview: {
            type: 'array', minItems: 3, maxItems: 4,
            description:
              'Short questions for the speaker about gaps an audience will likely ask about and the material ' +
              'does not cover (e.g. results, cost, next steps, who it is for, how to get involved). ' +
              'Each under 14 words, answerable in one or two sentences. Specific to this talk, never generic.',
            items: { type: 'string' },
          },
          suggested: {
            type: 'array', minItems: 3, maxItems: 3,
            description: 'Three questions an audience member would tap to ask, each under 9 words, all answerable from the material.',
            items: { type: 'string' },
          },
        },
        required: ['summary', 'interview', 'suggested'],
      },
    }],
    // Newer models don't accept a forced tool, so we ask for the call in the message instead.
    messages: [{ role: 'user', content: `Talk title: ${talk.title}\nSpeaker: ${talk.speaker.name}\n\nMaterial:\n${material(talk)}\n\nRead this and call save_prep. Reply only with that call.` }],
  });
  // Setting up a talk must never dead-end: try once more, then fall back to standard questions.
  let res = null;
  for (const model of [PREP_MODEL, CHAT_MODEL]) {
    try { res = await request(model); break; } catch (e) { noteError('prepare', e); await new Promise((r) => setTimeout(r, 1500)); }
  }
  if (!res) return { summary: '', interview: FALLBACK_INTERVIEW.map((q) => ({ q, a: '' })), suggested: ['What is this talk about?', 'What is the main takeaway?', 'What comes next?'] };
  const out = res.content.find((b) => b.type === 'tool_use')?.input || {};
  return {
    summary: out.summary || '',
    interview: (out.interview?.length ? out.interview.slice(0, 4) : FALLBACK_INTERVIEW).map((q) => ({ q, a: '' })),
    suggested: (out.suggested || []).slice(0, 3),
  };
}

/* ---------- Answering the audience ---------- */

function systemBlocks(talk, escalations) {
  const first = talk.speaker.name.split(' ')[0];
  const rules = `You answer audience questions during a live talk, on behalf of the speaker, ${talk.speaker.name}.
Talk: "${talk.title}"

How to answer:
- Start your reply with the label of the slide or page the answer mainly rests on, in square brackets exactly as it appears in the material, e.g. [Slide 4]. When two files have the same slide numbers, the later file's labels carry its name after a dot, e.g. [Slide 4 · appendix.pdf]; copy the whole label of the file you actually used. At most two labels, most relevant first. The person sees that slide next to your answer. If no particular slide applies (the answer comes from the speaker's notes or earlier replies, or it's small talk), start without a label. Do not put labels anywhere else.
- Then answer in two to four short sentences, in plain words. People are reading on a phone while listening.
- Explain, don't recite. Put it in your own words, connect it to what the person asked, and add a little everyday background or an example when that helps someone new to the topic follow the slide. General background is fine for explaining ideas.
- Facts about ${first}'s work are different: results, numbers, dates, costs, plans, opinions and anything else specific to this talk must come from the material or the speaker's notes. Never guess or fill these in.
- When something comes from the speaker's notes, say "${first} says" or "according to ${first}"; don't mention notes or material files.
- Speak about the speaker in the third person ("${first} found that..."). You are not ${first}.
- If the person asks for a fact about the talk that the material does not give, do not improvise. Call the not_covered tool with the question restated clearly, and write one short sentence saying the talk doesn't cover it, for example "The talk doesn't say who funds the project." Stop there. Never say you flagged, sent, noted or passed anything on, and do not promise that ${first} will answer; the person is asked separately whether to send it.
- If only part is covered, answer that part, say which part isn't covered, and call not_covered for that part only.
- Use not_covered for missing facts only. Requests for an opinion or a judgement ("is it worth it?", "is this a good idea?") get the relevant facts from the talk and nothing more; do not call the tool for those.
- If the speaker asked not to be asked about something, say kindly that it's outside what you can answer here. Do not call the tool.
- Anything unrelated to the talk: one friendly line steering back to the talk, with no label of any kind in front. Do not call the tool.
- No markdown, no headings, no bullet lists, no emoji. Reply in the language the person writes in.

<talk_material>
${material(talk)}
</talk_material>

<speaker_notes>
${background(talk)}
</speaker_notes>`;
  const blocks = [{ type: 'text', text: rules, cache_control: { type: 'ephemeral' } }];
  const extra = learned(escalations);
  if (extra) blocks.push({ type: 'text', text: `Answers ${first} has given to earlier audience questions. Treat these as part of the material; no label needed:\n\n${extra}` });
  return blocks;
}

const NOT_COVERED = {
  name: 'not_covered',
  description: "Flag a genuine question about the talk that the material and the speaker's notes do not answer.",
  input_schema: {
    type: 'object',
    properties: { question: { type: 'string', description: 'The question, restated clearly in one sentence, in the asker\'s language.' } },
    required: ['question'],
  },
};

// history: [{role:'user'|'assistant', text}], onText(delta). Returns { text, handoff }.
export async function answer(talk, escalations, history, onText) {
  if (!hasKey()) return practiceAnswer(talk, escalations, history, onText);

  const messages = history.slice(-11).map((m) => ({ role: m.role, content: m.text }));
  const stream = api().messages.stream({
    model: CHAT_MODEL,
    max_tokens: 600,
    system: systemBlocks(talk, escalations),
    tools: [NOT_COVERED],
    messages,
  });
  let text = '';
  stream.on('text', (d) => { text += d; onText(d); });
  const final = await stream.finalMessage();
  const flagged = final.content.find((b) => b.type === 'tool_use' && b.name === 'not_covered');
  if (flagged && !text.trim()) {
    text = "That isn't covered in the talk material.";
    onText(text);
  }
  // Belt and braces: the hand-off card does the asking, so drop any "I've flagged this" sentence.
  text = text.replace(/(?<=[.!?]\s|^)[^.!?]*\b(flagged|passed (it|this|that) on|forwarded)\b[^.!?]*[.!?]\s*/gi, '').trim() || "The talk doesn't cover that.";
  return { text: text.trim(), handoff: flagged ? { question: flagged.input.question || history.at(-1).text } : null };
}

/* ---------- Practice mode (no key) ---------- */

const STOP = new Set('a an and are as at be but by can do does for from has have how i if in is it its of on or so that the their there this to was what when where which who why will with you your about me my we our they he she them not no yes any more most much many'.split(' '));
const words = (s) => (s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter((w) => !STOP.has(w));

export function overlap(a, b) {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / Math.min(A.size, B.size);
}

async function practiceAnswer(talk, escalations, history, onText) {
  const question = history.at(-1).text;
  const q = new Set(words(question));
  const pool = [];
  for (const e of escalations) if (e.status === 'answered') pool.push({ text: e.answer, match: e.question + ' ' + e.answer });
  for (const x of talk.interview || []) if (x.a?.trim()) pool.push({ text: x.a, match: x.q + ' ' + x.a });
  tagAll(talk);
  for (const s of talk.sources) for (const u of s.units) pool.push({ text: u.text.split('\n\nSpeaker notes:')[0], match: u.text, label: labelOf(s, u) });

  let best = null, bestScore = 0;
  for (const p of pool) {
    const w = new Set(words(p.match));
    let hit = 0;
    for (const t of q) if (w.has(t)) hit++;
    const score = q.size ? hit / q.size : 0;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  const aboutTalk = /\b(about|main|takeaway|summary|overview)\b/i.test(question);
  if (!best || bestScore < 0.5) {
    if (aboutTalk && talk.sources[0]?.units[0]) best = { text: talk.sources[0].units[0].text, label: labelOf(talk.sources[0], talk.sources[0].units[0]) };
    else {
      const text = "That isn't covered in the talk material.";
      await type(text, onText);
      return { text, handoff: { question } };
    }
  }
  let body = best.text.replace(/\s+/g, ' ').trim();
  if (body.length > 260) body = body.slice(0, 260).replace(/\s\S*$/, '') + '…';
  const text = (best.label ? `[${best.label}] ` : '') + body;
  await type(text, onText);
  return { text, handoff: null };
}

async function type(text, onText) {
  for (const piece of text.match(/\S+\s*/g) || []) {
    onText(piece);
    await new Promise((r) => setTimeout(r, 18));
  }
}
