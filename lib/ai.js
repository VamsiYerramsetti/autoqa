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
// The model thinks before it writes, and that thinking counts against max_tokens.
// At 600 a hard question used the whole allowance on thinking, so answers were cut mid-sentence or came back empty.
// We only pay for what is actually written, so a generous ceiling costs nothing on easy questions.
const ANSWER_TOKENS = 4000;
const PREP_TOKENS = 8000;

// How answers refer to the speaker. "Dr. Ines Carvalho" becomes "Dr. Carvalho" (it used to be just "Dr."); "Maya Okafor" becomes "Maya".
const TITLES = /^(dr|prof|professor|mr|mrs|ms|mx|sir|dame|rev)\.?$/i;
export function callName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'the speaker';
  if (TITLES.test(parts[0]) && parts.length > 1) {
    const title = parts[0].replace(/\.?$/, '.').replace(/^professor\.$/i, 'Professor');
    // Surname is everything after the given name, so "Prof. Jan de Vries" stays "Prof. de Vries".
    const surname = parts.length > 2 ? parts.slice(2).join(' ') : parts[1];
    return `${title[0].toUpperCase()}${title.slice(1)} ${surname}`;
  }
  return parts[0];
}

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
    max_tokens: PREP_TOKENS,
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
  const first = callName(talk.speaker.name);
  const rules = `You answer audience questions during a live talk, on behalf of the speaker, ${talk.speaker.name}.
Talk: "${talk.title}"

How to answer:
- Start your reply with the label of the slide or page the answer mainly rests on, in square brackets exactly as it appears in the material, e.g. [Slide 4]. When two files have the same slide numbers, the later file's labels carry its name after a dot, e.g. [Slide 4 · appendix.pdf]; copy the whole label of the file you actually used. At most two labels, most relevant first. The person sees that slide next to your answer. If no particular slide applies (the answer comes from the speaker's notes or earlier replies, or it's small talk), start without a label. Do not put labels anywhere else.
- Then answer in two to four short sentences, in plain words. People are reading on a phone while listening. When the question has a yes or a no, start with it. A short, casual question gets a short, casual answer.
- Answer what was asked and stop. Don't tack on warnings, conditions or gaps the person didn't ask about (a place the service doesn't reach, a detail a slide leaves out) unless it changes the answer for this person. Don't repeat their question back to them.
- Explain, don't recite. Put it in your own words, connect it to what the person asked, and add a little everyday background or an example when that helps someone new to the topic follow the slide. General background is fine for explaining ideas.
- Facts about ${first}'s work are different: results, numbers, dates, costs, plans, opinions and anything else specific to this talk must come from the material or the speaker's notes. Never guess or fill these in.
- When something comes from the speaker's notes or ${first}'s earlier replies, say "${first} says" or "according to ${first}", in the language you are answering in; don't mention notes or material files. What is printed on a slide is not "${first} says". Never give ${first} a view or an intention the material doesn't state.
- Speak about the speaker in the third person ("${first} found that..."). You are not ${first}.
- If the person asks for a fact about the talk that the material does not give, do not improvise. Call the not_covered tool with the question restated clearly, and write one short sentence saying the talk doesn't cover it, for example "The talk doesn't say who funds the project." Stop there. Never say you flagged, sent, noted or passed anything on, and do not promise that ${first} will answer; the person is asked separately whether to send it.
- If only part is covered, lead with what the material does offer that the person can act on (another way to do it, a date, where to go, how to have a say), then say in one sentence which part isn't covered, and call not_covered for that part only. Leave out material that doesn't help this person.
- The question you pass to not_covered is read by ${first} without the conversation. Keep the person's real worry and the details that make it answerable (who, when, where); don't swap it for a narrower side question.
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
    properties: {
      question: { type: 'string', description: 'The question, restated clearly in one sentence, in the asker\'s language.' },
      // The speaker may not read the asker's language; the card in their inbox shows this underneath.
      for_speaker: { type: 'string', description: 'The same question in the language the talk material is written in, so the speaker can read it. If the asker already wrote in that language, repeat the question unchanged.' },
    },
    required: ['question', 'for_speaker'],
  },
};

// history: [{role:'user'|'assistant', text}], onText(delta). Returns { text, handoff: { question, forSpeaker } or null }.
export async function answer(talk, escalations, history, onText) {
  if (!hasKey()) return practiceAnswer(talk, escalations, history, onText);

  const messages = history.slice(-11).map((m) => ({ role: m.role, content: m.text }));
  const stream = api().messages.stream({
    model: CHAT_MODEL,
    max_tokens: ANSWER_TOKENS,
    system: systemBlocks(talk, escalations),
    tools: [NOT_COVERED],
    messages,
  });
  let text = '';
  stream.on('text', (d) => { text += d; onText(d); });
  const final = await stream.finalMessage();
  return finishAnswer(final, text, history.at(-1).text, onText);
}

// Turns the model's finished reply into what the audience sees: the text, and a hand-off offer when needed.
// Kept separate from answer() so the test can check it without a model.
export function finishAnswer(final, text, question, onText = () => {}) {
  const flagged = final.content.find((b) => b.type === 'tool_use' && b.name === 'not_covered');
  // Ran out of room: keep only whole sentences, and offer the question to the speaker rather than show half an answer.
  if (final.stop_reason === 'max_tokens') {
    noteError('answer', { name: 'max_tokens', message: 'ran out of room before finishing' });
    const whole = wholeSentences(text);
    const note = whole ? '' : "We couldn't finish this answer.";
    if (note) onText(note);
    return { text: whole || note, handoff: handoffFor(flagged, question) };
  }
  if (flagged && !text.trim()) {
    text = "That isn't covered in the talk material.";
    onText(text);
  }
  // Belt and braces: the hand-off card does the asking, so drop any "I've flagged this" sentence.
  text = text.replace(/(?<=[.!?]\s|^)[^.!?]*\b(flagged|passed (it|this|that) on|forwarded)\b[^.!?]*[.!?]\s*/gi, '').trim();
  // No words and no hand-off means something went wrong, not that the talk is silent: never claim "not covered" then.
  if (!text) return { text: "We couldn't answer this one.", handoff: handoffFor(flagged, question) };
  return { text, handoff: flagged ? handoffFor(flagged, question) : null };
}

// What goes to the speaker: the question in the asker's words, plus the same question in the talk's language when that differs.
function handoffFor(flagged, question) {
  const asked = flagged?.input?.question || question;
  const forSpeaker = String(flagged?.input?.for_speaker || '').trim();
  return { question: asked, forSpeaker: forSpeaker && forSpeaker !== asked ? forSpeaker.slice(0, 400) : '' };
}

// Text up to the last full stop, question or exclamation mark (any closing quote kept). Empty if there is none.
export function wholeSentences(text) {
  const m = String(text).match(/^[\s\S]*[.!?…。]["'”’)]*/);
  return m ? m[0].trim() : '';
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
