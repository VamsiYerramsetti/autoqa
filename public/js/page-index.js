import { room } from '/js/common.js';
const svg = document.getElementById('room');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const total = 96, script = [];
// One short story on load: the room fills, questions get answered, a few wait for the speaker.
for (let i = 0; i < 58; i++) script.push('here');
const state = still ? script.map((_, i) => (i % 9 === 4 ? 'waiting' : i % 3 ? 'answered' : 'here')) : [];
room(svg, state, { min: total });
if (!still) {
  let i = 0;
  const fill = setInterval(() => {
    state.push('here'); room(svg, state, { min: total });
    if (++i >= script.length) { clearInterval(fill); ask(); }
  }, 22);
  function ask() {
    const order = [...state.keys()].sort(() => Math.random() - 0.5).slice(0, 40);
    let k = 0;
    const t = setInterval(() => {
      state[order[k]] = k % 8 === 5 ? 'waiting' : 'answered';
      room(svg, state, { min: total });
      if (++k >= order.length) clearInterval(t);
    }, 90);
  }
}
