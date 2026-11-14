// Model prices in US dollars per million tokens, from https://platform.claude.com/docs/en/about-claude/pricing
// (checked 13 Nov 2026). Used only to estimate spend in the founder portal and the FinOps skills.
// If prices change, edit this table; nothing else needs to change.
export const PRICES = {
  'claude-haiku-5-5': {
    input: 0.10, output: 0.50, cacheWrite: 0.125, cacheRead: 0.01,
    // Haiku 5.5 bills a whole request at these prices when its prompt is over 100,000 tokens
    // (input + cache reads + cache writes).
    long: { over: 100_000, input: 0.50, output: 2.50, cacheWrite: 0.625, cacheRead: 0.05 },
  },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheWrite: 2.50, cacheRead: 0.10 },
  'claude-opus-5-5': { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.20 },
};

// usage: { model, input, output, cacheRead, cacheWrite } -> dollars (null if the model isn't in the table)
export function costOf(u) {
  const p = PRICES[u.model];
  if (!p) return null;
  const prompt = (u.input || 0) + (u.cacheRead || 0) + (u.cacheWrite || 0);
  const r = p.long && prompt > p.long.over ? p.long : p;
  return ((u.input || 0) * r.input + (u.output || 0) * r.output + (u.cacheRead || 0) * r.cacheRead + (u.cacheWrite || 0) * r.cacheWrite) / 1e6;
}
