// Visit counting without cookies or storage. Sends where you are (page type only), where you came from
// (the other site's name only) and, when you leave, how long the page was actually on screen and how far
// you scrolled. Skipped entirely if the browser asks not to be tracked.
(() => {
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  const send = (body) => {
    const data = JSON.stringify({ ...body, p: location.pathname });
    if (!(navigator.sendBeacon && navigator.sendBeacon('/api/t', new Blob([data], { type: 'text/plain' })))) fetch('/api/t', { method: 'POST', body: data, keepalive: true }).catch(() => {});
  };
  const utm = new URLSearchParams(location.search).get('utm_source') || '';
  send({ e: 'view', r: document.referrer, w: innerWidth, u: utm });
  let seen = 0, since = document.visibilityState === 'visible' ? performance.now() : 0, deepest = 0, sent = false;
  addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    deepest = Math.max(deepest, h > 0 ? (scrollY / h) * 100 : 100);
  }, { passive: true });
  const pause = () => {
    if (since) { seen += performance.now() - since; since = 0; }
    if (document.documentElement.scrollHeight <= innerHeight + 2) deepest = 100; // nothing to scroll: all of it was seen
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { pause(); if (!sent) { send({ e: 'leave', d: Math.round(seen), s: deepest }); sent = true; } }
    else { since = performance.now(); sent = false; seen = 0; }
  });
  addEventListener('pagehide', () => { pause(); if (!sent) { send({ e: 'leave', d: Math.round(seen), s: deepest }); sent = true; } });
})();
