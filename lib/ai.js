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
// Characters of material. Keeps a whole answer prompt under 100k tokens: above that, Haiku 5.5 bills the whole
// request at five times the price (see .claude/skills/long-prompt-guard).
const MAX_MATERIAL = 300_000;
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

// Token counts of one model call, kept (no text) for the cost numbers in the founder portal and the FinOps skills.
export const usageOf = (model, u = {}, started = Date.now()) => ({
  model, ms: Date.now() - started,
  input: u.input_tokens || 0, output: u.output_tokens || 0,
  cacheRead: u.cache_read_input_tokens || 0, cacheWrite: u.cache_creation_input_tokens || 0,
});
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

const PRACTICE_SUGGESTED = ['What is this talk about?', 'What is the main takeaway?', 'What comes next?', 'Who is this for?', 'What were the results?', 'How can I get involved?'];
const FALLBACK_INTERVIEW = [
  'Who is this talk for?',
  'What is the one thing people should remember?',
  'What will people ask that is not on the slides?',
  'Is there anything you would rather not be asked?',
];
// One short line under each standard question saying why it's asked.
const FALLBACK_WHY = ['So answers are pitched at the right level.', 'Used when people ask for the gist.', 'So those get answered straight away.', 'Those get a polite no.'];

export async function prepare(talk) {
  if (!hasKey()) {
    return {
      summary: '',
      interview: FALLBACK_INTERVIEW.map((q) => ({ q, a: '' })),
      suggested: PRACTICE_SUGGESTED,
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
            type: 'array', minItems: 6, maxItems: 8,
            description: 'Six to eight different questions an audience member would tap to ask, each under 9 words, all answerable from the material, the most interesting first. The audience sees three at a time; a new one appears when one is used.',
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
  let res = null, used = PREP_MODEL;
  const started = Date.now();
  for (const model of [PREP_MODEL, CHAT_MODEL]) {
    try { res = await request(model); used = model; break; } catch (e) { noteError('prepare', e); await new Promise((r) => setTimeout(r, 1500)); }
  }
  if (!res) return { summary: '', interview: FALLBACK_INTERVIEW.map((q) => ({ q, a: '' })), suggested: PRACTICE_SUGGESTED };
  const out = res.content.find((b) => b.type === 'tool_use')?.input || {};
  return {
    summary: out.summary || '',
    interview: (out.interview?.length ? out.interview.slice(0, 4) : FALLBACK_INTERVIEW).map((q) => ({ q, a: '' })),
    suggested: (out.suggested || []).slice(0, 8),
    usage: usageOf(used, res.usage, started),
  };
}

/* ---------- Getting to know the talk: a conversation with the speaker ---------- */

// The most questions we ask before wrapping up; the speaker can stop sooner.
export const MAX_INTERVIEW = 8;

// Given what the speaker has said so far, decide the next question (or that we know enough).
// Returns { question, note, done }. `note` is an optional half-sentence showing we understood the last answer.
export async function nextQuestion(talk) {
  const asked = (talk.interview || []).filter((x) => x.q);
  const turn = asked.length;
  if (turn >= MAX_INTERVIEW) return { question: '', note: '', done: true };
  if (!hasKey()) {
    const q = FALLBACK_INTERVIEW[turn];
    return q ? { question: q, why: FALLBACK_WHY[turn], note: '', done: false } : { question: '', note: '', done: true };
  }
  const first = callName(talk.speaker.name);
  const conversation = asked.length
    ? asked.map((x) => `You asked: ${x.q}\n${first} answered: ${x.a?.trim() || '(skipped)'}`).join('\n\n')
    : '(nothing yet: this is your first question)';
  const hasExtra = talk.sources.length > 1 || talk.sources.some((src) => /notes/i.test(src.name));
  const system = [{
    type: 'text',
    cache_control: { type: 'ephemeral' },
    text: `You are getting ready to answer audience questions about a talk on the speaker's behalf. Before the talk you
have a short conversation with the speaker, ${talk.speaker.name}, to become an expert on this material: what each
slide really claims, where the numbers come from, what the slides leave out, what people will ask, and what the
speaker would rather not be asked.

How to talk with ${first}:
- One question at a time, under 25 words, plain words, friendly and direct. No flattery, no "great answer".
- Build on what ${first} just said: follow up when an answer is vague, surprising or opens a likely audience question; move on when it's covered.
- Ask about what the slides cannot tell you: the reasoning behind a key number or chart, the method, limits and caveats, what's next, who it's for, how to get involved or get in touch, terms the audience may not know.
- Refer to slides by their label (e.g. "on Slide 7") when it helps.
- ${hasExtra ? 'They have already added more than one file or notes; only ask for more material if something clearly important is missing.' : 'Early on (your first or second question) ask whether they have more to add: a transcript or script of the talk, speaker notes, a paper, a report or links. They can attach a file or paste text right here, or say no.'}
- If ${first} skips a question, don't ask it again.
- Stop (done: true) when you understand the talk well enough to field most questions, or after ${MAX_INTERVIEW} questions. You have asked ${turn} so far.
- Use the language the slides are written in, unless ${first} answers in another language.

Talk title: ${talk.title}

<talk_material>
${material(talk)}
</talk_material>`,
  }];
  const tool = {
    name: 'next_step',
    description: 'Your next move in the conversation with the speaker.',
    input_schema: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Optional: at most 12 words showing you took in the last answer (e.g. "Got it, the 62% is the median across storms."). Empty for the first question or when nothing is worth saying.' },
        question: { type: 'string', description: 'The next question, under 25 words. Empty when done.' },
        why: { type: 'string', description: 'Why you ask it, under 10 words, about the audience (e.g. "Slide 6 shows savings but not the cost." or "People will ask how to try it."). Empty when done.' },
        done: { type: 'boolean', description: 'true when you know enough.' },
      },
      required: ['question', 'done'],
    },
  };
  try {
    const started = Date.now();
    const res = await api().messages.create({
      model: PREP_MODEL, max_tokens: PREP_TOKENS, system, tools: [tool],
      messages: [{ role: 'user', content: `The conversation so far:\n\n${conversation}\n\nCall next_step. Reply only with that call.` }],
    });
    const out = res.content.find((b) => b.type === 'tool_use')?.input || {};
    const question = String(out.question || '').trim().slice(0, 300), usage = usageOf(PREP_MODEL, res.usage, started);
    if (out.done || !question) return { question: '', note: String(out.note || '').slice(0, 160), done: true, usage };
    return { usage, question, why: String(out.why || '').trim().slice(0, 120), note: String(out.note || '').trim().slice(0, 160), done: false };
  } catch (e) {
    noteError('interview', e);
    // The model is unavailable: keep the speaker moving with the standard questions they haven't had yet.
    const left = FALLBACK_INTERVIEW.filter((q) => !asked.some((x) => x.q === q));
    return left.length && turn < 4 ? { question: left[0], why: FALLBACK_WHY[FALLBACK_INTERVIEW.indexOf(left[0])], note: '', done: false } : { question: '', note: '', done: true };
  }
}

/* ---------- Answering the audience ---------- */

function systemBlocks(talk, escalations) {
  const first = callName(talk.speaker.name);
  const rules = `You answer audience questions during a live talk, on behalf of the speaker, ${talk.speaker.name}.
Talk: "${talk.title}"

How to answer:
- Show a slide only when it helps the person: when the answer is right there on one slide (a number, a result, a list, a chart or a diagram they benefit from seeing). Then start your reply with that slide's label and the exact words on the slide that answer the question, like this: [Slide 4: "Peak runoff reduced by 62%"]. Copy the label character for character as the material prints it and never add a file name to it yourself; only when the material itself prints a label with a name after a dot (two files with the same slide numbers) does that name belong in it. Copy the quoted words exactly from that slide, at most 12 words, from one line or two neighbouring lines. At most two labels, most relevant first.
- No label when no single slide shows the answer: explanations of general ideas, "what is this talk about", the gist, small talk, answers from the speaker's notes or earlier replies, opinions, and anything the talk doesn't cover. Then start straight with the answer. Do not put labels anywhere else.
- Then answer in two to four short sentences, in plain words. People are reading on a phone while listening. When the question has a yes or a no, start with it. A short, casual question gets a short, casual answer.
- Answer what was asked and stop. Don't tack on warnings, conditions or gaps the person didn't ask about (a place the service doesn't reach, a detail a slide leaves out) unless it changes the answer for this person. Don't repeat their question back to them.
- Explain, don't recite. Put it in your own words, connect it to what the person asked, and add a little everyday background or an example when that helps someone new to the topic follow the slide. General background is fine for explaining ideas.
- Facts about ${first}'s work are different: results, numbers, dates, costs, plans, opinions and anything else specific to this talk must come from the material or the speaker's notes. Never guess or fill these in.
- When something comes from the speaker's notes or ${first}'s earlier replies, say "${first} says" or "according to ${first}", in the language you are answering in; don't mention notes or material files. What is printed on a slide is not "${first} says". Never give ${first} a view or an intention the material doesn't state.
- Speak about the speaker in the third person ("${first} found that..."). You are not ${first}.
- Questions the material doesn't cover come in two kinds. Tell them apart before you answer:
  1. General questions about the subject (what a term means, how a method works in general, common background, how this compares with the usual approach). Answer these from general knowledge, briefly and correctly, and say plainly in a few words that this part isn't from the talk ("This isn't in the slides, but in general ..."), every time, also when you explain a term printed on a slide. Keep it to what is widely accepted, and stop once the term or idea is explained: an extra supporting fact or "because" is where mistakes creep in. If you are not sure, say so. Never present general knowledge as ${first}'s view, data or result. If ${first}'s own take or specifics would add something real, call not_covered with in_general set to true, so the person can also ask ${first}; otherwise don't.
  2. Facts specific to this talk that the material doesn't give (${first}'s own numbers, results, plans, costs, opinions, what happened in their project). Do not improvise. Call not_covered with in_general set to false, and write one short sentence saying the talk doesn't cover it, for example "The talk doesn't say who funds the project." Stop there.
- Never say, in any language, that you asked, will ask, flagged, sent, noted or passed anything on to ${first} (not "I've asked ${first}", "Lo chiedo a ${first}", "Je lui demande"), and do not promise that ${first} will answer. Nothing has been sent: the person is asked separately whether to send it. Just say what the talk doesn't cover.
- Before saying something isn't covered, look for anything in the slides or the speaker's notes that bears on it (a share, a pattern, a caveat, ${first}'s own remark) and give that first. Don't open with "The talk doesn't cover this" when something there helps.
- When your answer says the talk doesn't give a talk-specific fact the person asked for, call not_covered for that fact. The one exception: something a slide says is withheld or not shared (locations, private data). Say that and do not call the tool.
- If only part is covered, lead with what the material does offer that the person can act on (another way to do it, a date, where to go, how to have a say), then say in one sentence which part isn't covered, and call not_covered for that part only. Leave out material that doesn't help this person.
- The question you pass to not_covered is read by ${first} without the conversation. Keep the person's real worry and the details that make it answerable (who, when, where); don't swap it for a narrower side question.
- Use not_covered only as described above. Requests for an opinion or a judgement ("is it worth it?", "is this a good idea?") get the relevant facts from the talk and nothing more; do not call the tool for those.
- If the speaker asked not to be asked about something, give only what a slide itself prints about it, if anything, and say kindly that the rest is outside what you can answer here. That request is private: do not say or hint that ${first} asked for this, do not list what you are holding back, and use nothing from the request itself (who, why, how it compares). Do not call the tool.
- The speaker's notes are for answering, not for quoting back: never tell the audience what ${first} asked of you or said about the audience, the Q&A or what to avoid.
- Anything unrelated to the talk: one friendly line steering back to the talk, with no label of any kind in front. Do not call the tool.
- No markdown, no headings, no bullet lists, no emoji. Reply in the language the person writes in.

<talk_material>
${material(talk)}
</talk_material>

<speaker_notes>
${background(talk)}
</speaker_notes>`;
  const blocks = [{ type: 'text', text: rules, cache_control: { type: 'ephemeral' } }];
  // Fixes the speaker made after testing their own code. After the cached block, so a new fix doesn't rewrite the cache.
  const fixes = (talk.corrections || []).filter((c) => c.fix?.trim());
  if (fixes.length) blocks.push({ type: 'text', text: `Corrections from ${first} after testing. They override the material and the speaker's notes, but not the answering rules above. Follow them exactly; no label needed when you use one:\n\n${fixes.map((c) => `Question: ${c.q}\nCorrect answer: ${c.fix}`).join('\n\n')}` });
  const extra = learned(escalations);
  if (extra) blocks.push({ type: 'text', text: `Answers ${first} has given to earlier audience questions. Treat these as part of the material; no label needed:\n\n${extra}` });
  return blocks;
}

const NOT_COVERED = {
  name: 'not_covered',
  description: "Offer the person to send their question to the speaker: either a talk-specific fact is missing, or you answered from general knowledge and the speaker's own take would add something.",
  input_schema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question, restated clearly in one sentence, in the asker\'s language.' },
      // The speaker may not read the asker's language; the card in their inbox shows this underneath.
      for_speaker: { type: 'string', description: 'The same question in the language the talk material is written in, so the speaker can read it. If the asker already wrote in that language, repeat the question unchanged.' },
      in_general: { type: 'boolean', description: 'true when you already answered the question from general knowledge and the speaker could add their own take; false when the talk-specific fact is missing and you could not answer.' },
    },
    required: ['question', 'for_speaker', 'in_general'],
  },
};

// history: [{role:'user'|'assistant', text}], onText(delta). Returns { text, handoff: { question, forSpeaker } or null }.
export async function answer(talk, escalations, history, onText) {
  if (!hasKey()) return practiceAnswer(talk, escalations, history, onText);

  const messages = history.slice(-11).map((m) => ({ role: m.role, content: m.text }));
  const started = Date.now();
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
  return { ...finishAnswer(final, text, history.at(-1).text, onText, allLabels(talk)), usage: usageOf(CHAT_MODEL, final.usage, started) };
}

// Every label the material really has, e.g. ["Slide 1", "Slide 2", ...].
export function allLabels(talk) {
  tagAll(talk);
  return talk.sources.flatMap((src) => src.units.map((u) => labelOf(src, u)));
}

// The chat shows a slide only for a label at the very start that really exists. The model sometimes writes the
// label at the end instead, or adds a file name to it ("[Slide 11 · deck.pdf]"), and then no slide appeared.
// This puts such labels right: a made-up file name is dropped when the plain label exists, a label that matches
// nothing is removed, and when the answer opens without a label, a label left at the very end moves to the front.
// A label may carry the words it rests on: [Slide 4: "Peak runoff reduced by 62%"]. The words are kept as written.
const ANY_LABEL = /\[((?:Slide|Page|Part|Notes)(?: \d+)?)((?: · [^\[\]\n:"]{1,40})?)(:\s*"[^"\]\n]{0,200}"?)?\]/g;
export function tidyLabels(text, labels) {
  if (!labels?.length) return text;
  const real = new Map(labels.map((l) => [l.toLowerCase(), l]));
  let out = text.replace(ANY_LABEL, (whole, base, tag, quote = '') => {
    const words = quote ? ': "' + quote.replace(/^:\s*"|"$/g, '').trim() + '"' : '';
    const exact = real.get((base + tag).toLowerCase());
    if (exact) return `[${exact}${words}]`;
    return tag && real.has(base.toLowerCase()) ? `[${real.get(base.toLowerCase())}${words}]` : '';
  });
  const tail = out.match(/\s*((?:\[[^\[\]\n]+\]\s*){1,2})$/);
  if (tail && !/^\s*\[/.test(out) && out.slice(0, tail.index).trim()) out = `${tail[1].trim()} ${out.slice(0, tail.index).trim()}`;
  // Opened with a label and left another after the last sentence (seen 2026-11-13): join it to the front, at most two.
  else if (tail && /^\s*\[/.test(out) && (/\n/.test(tail[0]) || /[.!?]$/.test(out.slice(0, tail.index)))) {
    const front = out.match(/^\s*((?:\[[^\[\]\n]+\]\s*){1,2})/)[1].trim(), body = out.slice(0, tail.index).trim().slice(front.length).trim();
    const labels = [...new Set([...front.match(/\[[^\]]+\]/g), ...tail[1].match(/\[[^\]]+\]/g)])].slice(0, 2);
    if (body) out = `${labels.join(' ')} ${body}`;
  }
  return out.replace(/[ \t]+([.,;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
}

// Turns the model's finished reply into what the audience sees: the text, and a hand-off offer when needed.
// Kept separate from answer() so the test can check it without a model.
export function finishAnswer(final, text, question, onText = () => {}, labels = []) {
  text = tidyLabels(text, labels);
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
  // Belt and braces: the hand-off card does the asking, so drop any "I'll pass this on" sentence.
  text = dropPromises(text);
  // No words and no hand-off means something went wrong, not that the talk is silent: never claim "not covered" then.
  if (!text) return { text: "We couldn't answer this one.", handoff: handoffFor(flagged, question) };
  return { text, handoff: flagged ? handoffFor(flagged, question) : null };
}

// A sentence in which the answer itself promises to pass the question on ("I'll pass this to Amara", "Vou encaminhar
// essa dúvida"). Nothing has been sent at that point: the person decides on the card below. Only first-person
// promises count, because a talk can be about things that are "flagged" or "sent" (2026-11-13: an older rule removed
// "about 1,300 are flagged ... 1." and turned "1.5 hours" into "5 hours").
const PROMISE = new RegExp(String.raw`(^|[^\p{L}])(I'll|I will|I've|I have|I'm going to|I can|Vou|Irei|Voy a|Le voy a|Je vais|Ich werde|Ik zal|Ik stuur|Ik vraag)\s+(\S+\s+){0,2}?` +
  String.raw`(pass|send|sent|forward|flag|ask|encaminh|envi|pergunt|repass|pregunt|transmet|demander|weiterleit|frag|stuur|vraag)`, 'iu');
export function dropPromises(text) {
  const lead = text.match(/^\s*(?:\[[^\[\]\n]+\]\s*){1,2}/)?.[0] || '';
  // Split only where a sentence really ends (a mark followed by a space), so "1.5" stays one number.
  const parts = text.slice(lead.length).split(/(?<=[.!?])(\s+)/);
  let out = '';
  for (let i = 0; i < parts.length; i += 2) if (!PROMISE.test(parts[i])) out += parts[i] + (parts[i + 1] || '');
  out = out.trim();
  return out ? (lead.trim() + ' ' + out).trim() : '';
}

// What goes to the speaker: the question in the asker's words, plus the same question in the talk's language when that differs.
function handoffFor(flagged, question) {
  const asked = flagged?.input?.question || question;
  const forSpeaker = String(flagged?.input?.for_speaker || '').trim();
  return { question: asked, forSpeaker: forSpeaker && forSpeaker !== asked ? forSpeaker.slice(0, 400) : '', general: flagged?.input?.in_general === true };
}

// The speaker's card needs the question in the talk's language. The answering model is asked for that, but it leaves
// the field out about one time in two (an Italian and a Portuguese card in the 2026-11-12 and -13 runs). So when a
// question is sent without it, one small extra call checks the language and translates if needed. '' = nothing to add.
export async function toTalkLanguage(talk, question) {
  if (!hasKey()) return '';
  try {
    const res = await api().messages.create({
      model: PREP_MODEL, max_tokens: 1500,
      system: 'You check the language of an audience question. If it is written in the same language as the slides, reply with exactly SAME. Otherwise reply with only its translation into the language of the slides, nothing else.',
      messages: [{ role: 'user', content: `Start of the slides:\n${material(talk).slice(0, 800)}\n\nQuestion:\n${question}` }],
    });
    return readTranslation(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''), question);
  } catch (e) { noteError('translate', e); return ''; }
}
export function readTranslation(reply, question) {
  const t = String(reply || '').trim().replace(/^["“]|["”]$/g, '').trim();
  if (!t || /^SAME\b/i.test(t) || t.toLowerCase() === String(question).trim().toLowerCase()) return '';
  return t.slice(0, 400);
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
  for (const c of talk.corrections || []) if (c.fix?.trim()) pool.push({ text: c.fix, match: c.q + ' ' + c.q + ' ' + c.fix });
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
    if (aboutTalk && talk.sources[0]?.units[0]) best = { text: talk.sources[0].units[0].text }; // the gist: no slide
    else {
      const text = "That isn't covered in the talk material.";
      await type(text, onText);
      return { text, handoff: { question } };
    }
  }
  let body = best.text.replace(/\s+/g, ' ').trim();
  if (body.length > 260) body = body.slice(0, 260).replace(/\s\S*$/, '') + '…';
  // Point at the line of the slide that shares the most words with the question.
  let quote = '', top = 0;
  if (best.label) for (const line of best.text.split('\n')) {
    const w = new Set(words(line)); let hit = 0;
    for (const t of q) if (w.has(t)) hit++;
    if (hit > top) { top = hit; quote = line.replace(/^[•\-–\s]+/, '').replace(/["\]]/g, '').trim().split(/\s+/).slice(0, 12).join(' '); }
  }
  const text = (best.label ? `[${best.label}${quote ? `: "${quote}"` : ''}] ` : '') + body;
  await type(text, onText);
  return { text, handoff: null };
}

async function type(text, onText) {
  for (const piece of text.match(/\S+\s*/g) || []) {
    onText(piece);
    await new Promise((r) => setTimeout(r, 18));
  }
}
