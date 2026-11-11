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
export const keys = {
  get: (id) => { try { return localStorage.getItem('autoqa:key:' + id); } catch { return null; } },
  set: (id, key) => { try { localStorage.setItem('autoqa:key:' + id, key); } catch {} },
};

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
