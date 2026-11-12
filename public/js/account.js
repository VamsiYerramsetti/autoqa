import { $, el, api } from '/js/common.js';

const view = $('#view');
const next = new URLSearchParams(location.search).get('next');
// Only ever go on to one of our own pages (a path like /new), never to an address someone slipped into the link.
const after = next && /^\/[a-z0-9]/i.test(next) && !next.includes('\\') ? next : '/talks';

// Already signed in? Go straight on.
const { me } = await api('/api/me');
if (me) location.replace(after);

function form(mode) {
  const joining = mode === 'signup';
  history.replaceState(null, '', (joining ? '/signup' : '/signin') + location.search);
  const err = el('p', { class: 'error', role: 'alert' });
  const button = el('button', { class: 'btn' }, joining ? 'Create account' : 'Sign in');
  const f = el('form', { class: 'stack', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    button.disabled = true; err.textContent = '';
    try {
      await api(joining ? '/api/signup' : '/api/signin', { method: 'POST', body: Object.fromEntries(new FormData(f)) });
      location.href = after;
    } catch (x) { err.textContent = x.message; button.disabled = false; }
  } },
    joining && el('label', { class: 'field' }, el('span', {}, 'Your name'), el('input', { name: 'name', required: true, autocomplete: 'name', autofocus: true })),
    el('label', { class: 'field' }, el('span', {}, 'Email'), el('input', { name: 'email', type: 'email', required: true, autocomplete: 'email', inputmode: 'email', autofocus: !joining })),
    el('label', { class: 'field' }, el('span', {}, 'Password'),
      el('input', { name: 'password', type: 'password', required: true, minlength: 8, autocomplete: joining ? 'new-password' : 'current-password' }),
      joining && el('small', { class: 'muted', style: 'display:block;margin-top:6px' }, 'At least 8 characters.')),
    err,
    el('div', { class: 'row', style: 'margin-top:8px' },
      el('button', { class: 'btn plain', type: 'button', style: 'padding-left:0', onclick: () => form(joining ? 'signin' : 'signup') }, joining ? 'I have an account' : 'Create an account'),
      button),
    joining && el('p', { class: 'small muted' }, 'By creating an account you agree to the ', el('a', { href: '/terms' }, 'Terms'), ' and the ', el('a', { href: '/privacy' }, 'Privacy notice'), ', and confirm you are 16 or older.'),
  );
  view.replaceChildren(el('h1', {}, joining ? 'Create your account' : 'Welcome back'), el('p', { class: 'sub' }, joining ? 'Free while we are in testing.' : 'Sign in to see your talks.'), f);
}
form(location.pathname === '/signin' ? 'signin' : 'signup');
