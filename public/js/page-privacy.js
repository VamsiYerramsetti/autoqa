import '/js/page-legal.js';
document.getElementById('forget').addEventListener('click', async () => {
  let n = 0;
  for (const k of Object.keys(localStorage).filter((k) => k.startsWith('autoqa:seat:'))) {
    await fetch('/api/forget', { method: 'POST', headers: { 'x-token': localStorage.getItem(k) } }).catch(() => {});
    localStorage.removeItem(k); n++;
  }
  document.getElementById('done').textContent = n ? 'Deleted.' : 'Nothing is stored for this browser.';
});
