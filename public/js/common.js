export const $ = (sel, root = document) => root.querySelector(sel);
export const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
  return node;
};

export async function api(path, { method = 'GET', body, headers = {}, form } = {}) {
  const res = await fetch(path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Try again.'), { status: res.status });
  return data;
}

// How we address someone: "Maya Okafor" -> "Maya", "Dr. Ines Carvalho" -> "Dr. Carvalho" (never just "Dr.").
// Same rule as callName() in lib/ai.js, so the chat and the answers name the speaker the same way.
const TITLES = /^(dr|prof|professor|mr|mrs|ms|mx|sir|dame|rev)\.?$/i;
export const first = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1 && TITLES.test(parts[0])) {
    const title = /^professor/i.test(parts[0]) ? 'Professor' : parts[0][0].toUpperCase() + parts[0].slice(1).replace(/\.?$/, '.');
    return `${title} ${parts.length > 2 ? parts.slice(2).join(' ') : parts[1]}`;
  }
  return parts[0] || '';
};

// Where the speaker's private link lives on this device.
// The same key is also filed under the join code, so scanning your own code on this device opens a test seat.
export const keys = {
  get: (id) => { try { return localStorage.getItem('autoqa:key:' + id); } catch { return null; } },
  set: (id, key) => { try { localStorage.setItem('autoqa:key:' + id, key); } catch {} },
  byCode: (code) => { try { return localStorage.getItem('autoqa:code:' + code); } catch { return null; } },
  setCode: (code, key) => { try { localStorage.setItem('autoqa:code:' + code, key); } catch {} },
};

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Text that writes itself in: each word rises out of a soft cobalt blur into ink, a few at a time, at an even
   pace however unevenly the answer arrives. Call set(text) again and again as more text streams in, and
   set(text, true) when it's complete (that returns a promise for when the last word is in). Inline labels such
   as [Slide 4] become small buttons. With instant (a reload) or "reduce motion", the text is simply there. */
const INLINE = /\[((?:Slide|Page|Part|Notes)(?: \d+)?(?: · [^\[\]\n:"]{1,40})?)(?::\s*"[^"\]\n]*")?\]/g;
export function writer(node, { onChip, instant = false } = {}) {
  let target = [], shown = 0, timer = 0, finished = false, wait = null;
  const key = (t) => (t.chip ? '[' + t.chip : t.word);
  function tokens(text, final) {
    const out = [];
    text.split(INLINE).forEach((piece, i) => {
      if (i % 2) return out.push({ chip: piece });
      for (const w of piece.match(/\S+\s*|\s+/g) || []) out.push({ word: w });
    });
    if (!final) {
      while (out.length && out.at(-1).word && /\[[^\]]*$/.test(out.at(-1).word)) out.pop(); // half-written label
      if (out.length && out.at(-1).word && !/\s$/.test(out.at(-1).word)) out.pop(); // half-written word
    }
    return out;
  }
  function make(t, animate, delay) {
    const n = t.chip
      ? el('button', { class: 'chip', type: 'button', onclick: () => onChip?.(t.chip) }, t.chip)
      : el('span', { class: 'w' }, t.word);
    n.dataset.k = key(t);
    if (animate) { n.classList.add('in'); n.style.animationDelay = delay + 'ms'; }
    return n;
  }
  function step() {
    timer = 0;
    const backlog = target.length - shown;
    if (backlog <= 0) { if (finished) { node.classList.remove('writing'); wait?.(); } return; }
    const n = Math.max(1, Math.ceil(backlog / 8));
    for (let i = 0; i < n; i++) node.append(make(target[shown++], true, i * 28));
    timer = setTimeout(step, 55);
  }
  return {
    set(text, final = false) {
      target = tokens(text, final);
      finished = final;
      // If something earlier changed (rare: a label tidied at the end), redraw from there.
      let i = 0;
      while (i < shown && i < target.length && node.children[i]?.dataset.k === key(target[i])) i++;
      if (i < shown) { while (node.children.length > i) node.lastChild.remove(); shown = i; }
      if (instant || still()) {
        while (shown < target.length) node.append(make(target[shown++], false));
        if (final) node.classList.remove('writing');
        return Promise.resolve();
      }
      node.classList.add('writing');
      if (!timer) step();
      if (!final) return Promise.resolve();
      return new Promise((done) => { wait = done; if (shown >= target.length && !timer) { node.classList.remove('writing'); done(); } });
    },
  };
}

// A heading or line that writes itself in, word by word. Returns roughly when it's done (ms).
export function reveal(node, text, { gap = 45, start = 0 } = {}) {
  node.replaceChildren();
  const words = String(text).match(/\S+\s*/g) || [];
  if (still()) { node.textContent = text; return 0; }
  words.forEach((w, i) => { const s = el('span', { class: 'w in' }, w); s.style.animationDelay = start + i * gap + 'ms'; node.append(s); });
  return start + words.length * gap + 500;
}

// The room: curved rows of seats facing a stage. states = ['here' | 'answered' | 'waiting' | 'replied' | '']
export function room(svg, states, { min = 60 } = {}) {
  const total = Math.max(min, states.length);
  const rows = [];
  let left = total, n = 9;
  while (left > 0) { rows.push(Math.min(n, left)); left -= n; n += 2; }
  const W = 600, gap = 34, top = 64;
    // Fill from the middle of the room outwards so a few people don't look lost in a corner.
  const seats = [];
  rows.forEach((count, r) => {
    const radius = 150 + r * gap;
    const spread = Math.min(1.25, (count * 30) / radius);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
      seats.push({ x: W / 2 + Math.sin(t) * radius, y: top - 150 + Math.cos(t) * radius + 20, d: Math.abs(t) + r * 0.12 });
    }
  });
  const order = seats.map((s, i) => i).sort((a, b) => seats[a].d - seats[b].d);
  const cls = new Array(seats.length).fill('');
  states.forEach((s, i) => { if (order[i] != null) cls[order[i]] = s; });
  const xs = seats.map((s) => s.x), ys = seats.map((s) => s.y);
  const x0 = Math.min(...xs) - 14, x1 = Math.max(...xs) + 14, y1 = Math.max(...ys) + 14;
  svg.setAttribute('viewBox', `${x0.toFixed(0)} 0 ${(x1 - x0).toFixed(0)} ${y1.toFixed(0)}`);
  svg.setAttribute('class', 'room');
  svg.innerHTML = `<rect class="stage" x="${W / 2 - 70}" y="6" width="140" height="12" rx="6"/>` +
    seats.map((s, i) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="9" class="${cls[i]}"/>`).join('');
}

// Small icons for contact buttons. The LinkedIn mark is LinkedIn's own, used as they allow: to link to a profile.
const ICONS = {
  linkedin: '<rect width="24" height="24" rx="5" fill="#0a66c2"/><circle cx="7" cy="7.3" r="1.65" fill="#fff"/><rect x="5.6" y="9.6" width="2.8" height="8.6" fill="#fff"/><path d="M10.7 9.6h2.7v1.2c.4-.7 1.4-1.4 2.9-1.4 2.9 0 3.4 1.9 3.4 4.3v4.5h-2.8v-4c0-1-.1-2.2-1.4-2.2-1.4 0-1.6 1-1.6 2.1v4.1h-2.8z" fill="#fff"/>',
  web: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7.5 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  down: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  slide: '<rect x="3" y="5" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 17v3M8 20h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="6" y="8" width="5" height="5" rx="1" fill="currentColor"/>',
  out: '<path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
};
export function icon(name, size = 20) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'ico');
  s.innerHTML = ICONS[name] || '';
  return s;
}

// What someone typed in a LinkedIn field, as a link that opens. A handle, @handle or link → their profile;
// a name with spaces ("Ines Carvalho") → a LinkedIn search for that name, since we can't know their exact profile.
// Kept in step with linkedin() in server.js.
const LINKEDIN_IN = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^\/?#\s]+).*$/i;
export function linkedinUrl(v) {
  v = String(v || '').trim();
  if (!v) return '';
  if (/^[\p{L}.'’-]+(\s+[\p{L}.'’-]+)+$/u.test(v)) return 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(v);
  const m = v.match(LINKEDIN_IN);
  if (m) return 'https://www.linkedin.com/in/' + m[1];
  if (/linkedin\.com\//i.test(v)) return 'https://' + v.replace(/^https?:\/\//i, '').replace(/^linkedin/i, 'www.linkedin');
  return 'https://www.linkedin.com/in/' + v.replace(/^@/, '').replace(/^\/?in\//i, '').replace(/\s+/g, '');
}

// A LinkedIn field people can fill in any way they like: type their handle after the fixed "linkedin.com/in/",
// paste a whole link (trimmed to the handle for them), or just type their name. A line under it shows where
// the link will go, with a way to check it.
// Returns { box, input, value() }; value() is what to send to the server ('' when left empty).
export function linkedinField(current = '', hint = '') {
  let other = ''; // a LinkedIn link that is not a personal profile (a company page): kept whole
  const handleOf = (v) => {
    v = String(v || '').trim();
    if (/search\/results\/people\/\?keywords=/i.test(v)) { other = ''; try { return new URL(v).searchParams.get('keywords') || ''; } catch { return v; } }
    const m = v.match(LINKEDIN_IN);
    if (m) { other = ''; return decodeURIComponent(m[1]); }
    if (/linkedin\.com\//i.test(v)) { other = v; return v.replace(/^https?:\/\/(www\.)?/i, ''); }
    other = '';
    return v.replace(/^@/, '').replace(/^\/?in\//i, '');
  };
  const input = el('input', { inputmode: 'url', autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false', placeholder: 'your-name or a link', 'aria-label': 'LinkedIn profile, optional' });
  input.value = handleOf(current);
  const prefix = el('span', { class: 'li-prefix', 'aria-hidden': 'true' }, 'linkedin.com/in/');
  const check = el('a', { class: 'li-check', target: '_blank', rel: 'noopener' }, 'Check', icon('out', 14));
  const note = el('span', { class: 'li-note' });
  const preview = el('small', { class: 'li-preview', 'aria-live': 'polite' }, note, check);
  const paint = () => {
    const v = input.value.trim(), named = /\s/.test(v);
    prefix.hidden = Boolean(other) || named;
    const url = other ? linkedinUrl(other) : linkedinUrl(v);
    preview.hidden = !url;
    check.href = url || '#';
    note.textContent = named ? 'Opens a LinkedIn search for this name. A profile link is better.' : 'Opens ' + url.replace(/^https:\/\/www\./, '').replace(/\?.*$/, '');
  };
  const tidy = () => { const h = handleOf(input.value); if (h !== input.value) input.value = h; paint(); };
  input.addEventListener('paste', () => setTimeout(tidy));
  input.addEventListener('blur', tidy);
  input.addEventListener('input', paint);
  tidy();
  const box = el('label', { class: 'li' },
    el('span', { class: 'li-top' }, 'LinkedIn', el('em', {}, 'optional')),
    el('span', { class: 'li-field' }, icon('linkedin', 22), prefix, input),
    preview,
    hint && el('small', {}, hint));
  return { box, input, value: () => { tidy(); const v = input.value.trim(); return other || (/\s/.test(v) ? linkedinUrl(v) : v); } };
}

// A panel over the page. Closes on the backdrop, on Escape and with its own button; focus returns where it was.
export function sheet(...content) {
  const before = document.activeElement;
  const close = () => { wrap.remove(); removeEventListener('keydown', onKey); before?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const panel = el('div', { role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }, ...content);
  const wrap = el('div', { class: 'sheet', onclick: (e) => { if (e.target === wrap) close(); } }, panel);
  addEventListener('keydown', onKey);
  document.body.append(wrap);
  panel.focus();
  return { close, panel };
}
