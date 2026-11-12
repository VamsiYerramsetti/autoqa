// Fills in the facts the legal pages share: who runs the service, how to reach them, how long things are kept.
// They come from the server's settings, so the pages never go out of date and no address lives in the code.
const set = (selector, value) => { if (value) document.querySelectorAll(selector).forEach((n) => { n.textContent = value; }); };
try {
  const site = await (await fetch('/api/site')).json();
  set('[data-operator]', site.operator);
  if (site.contact) document.querySelectorAll('[data-contact]').forEach((n) => { const a = document.createElement('a'); a.href = 'mailto:' + site.contact; a.textContent = site.contact; n.replaceChildren(a); });
  set('[data-keep-details]', site.keepDetailsDays);
  set('[data-keep-counts]', site.keepCountsDays);
} catch { /* the page still reads fine with its defaults */ }
