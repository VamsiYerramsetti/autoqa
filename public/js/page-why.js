// The Why page's strip of pictures. The person moves it (swipe, scroll, the arrow buttons or the arrow keys);
// nothing turns by itself, because pictures that move on their own get skipped and take control away.
const strip = document.getElementById('strip');
const frames = [...strip.querySelectorAll('.frame')];
const prev = document.getElementById('prev'), next = document.getElementById('next'), count = document.getElementById('count');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The frame whose left edge is nearest the strip's left edge is the current one.
function current() {
  const left = strip.getBoundingClientRect().left;
  let best = 0, bestGap = Infinity;
  frames.forEach((f, i) => { const gap = Math.abs(f.getBoundingClientRect().left - left); if (gap < bestGap) { best = i; bestGap = gap; } });
  return best;
}
function go(i) {
  const n = Math.max(0, Math.min(frames.length - 1, i));
  strip.scrollTo({ left: frames[n].offsetLeft - frames[0].offsetLeft, behavior: still ? 'auto' : 'smooth' });
}
function paint() {
  const i = current();
  const end = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
  count.textContent = `${i + 1} of ${frames.length}`;
  prev.disabled = i === 0 && strip.scrollLeft < 4;
  next.disabled = end;
}
prev.addEventListener('click', () => go(current() - 1));
next.addEventListener('click', () => go(current() + 1));
strip.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
});
let pending = 0;
strip.addEventListener('scroll', () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(paint); }, { passive: true });
addEventListener('resize', paint);
paint();
