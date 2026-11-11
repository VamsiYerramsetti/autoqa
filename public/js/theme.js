// Light or dark. Follows the device setting until the person picks one with the switch; the choice is
// remembered on this device only. Loaded (not deferred) in every page's <head> so the page never flashes
// the wrong colours.
(function () {
  var KEY = 'autoqa:theme';
  var root = document.documentElement;
  var forced = root.getAttribute('data-theme-lock'); // the big-screen code page always stays light
  try { var saved = localStorage.getItem(KEY); if (saved && !forced) root.setAttribute('data-theme', saved); } catch (e) {}

  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }

  var MOON = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z" fill="currentColor"/></svg>';
  var SUN = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.6" fill="currentColor"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 1.8v1.8M10 16.4v1.8M1.8 10h1.8M16.4 10h1.8M4.2 4.2l1.3 1.3M14.5 14.5l1.3 1.3M4.2 15.8l1.3-1.3M14.5 5.5l1.3-1.3"/></g></svg>';

  // A round button showing what you switch TO: a moon in the light theme, a sun in the dark one.
  function themeSwitch() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme';
    function paint() {
      var dark = isDark();
      b.innerHTML = dark ? SUN : MOON;
      b.setAttribute('aria-label', dark ? 'Light mode' : 'Dark mode');
      b.title = dark ? 'Light mode' : 'Dark mode';
    }
    b.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paint();
    });
    paint();
    return b;
  }
  window.themeSwitch = themeSwitch;

  // Pages with the usual top bar get the switch at its right-hand end.
  document.addEventListener('DOMContentLoaded', function () {
    var top = document.querySelector('.top');
    if (!top || forced) return;
    var right = document.createElement('div');
    right.className = 'top-end';
    if (top.children.length > 1) right.appendChild(top.lastElementChild);
    right.appendChild(themeSwitch());
    top.appendChild(right);
  });
})();
