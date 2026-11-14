// The Auto Q&A octopus: a friendly cobalt octopus wearing glasses whose left lens is a Q and right lens an A.
// One drawing, used for the logo (public/logo.svg is generated from it), the mascot that swims around the
// home page, and the middle of the QR code. Plain strings, no DOM, so the server can use it too.
// Drawn on a 64-unit square. Parts carry class names so the mascot can blink and wave.

export const OCTO = {
  body: '#2f3ced', shade: '#2430c9', light: '#6d76ff', ink: '#1d1b2e', lens: '#ffffff', cheek: '#ff9db0', yellow: '#ffc83d',
};

// tentacles: five soft strokes that curl at the tips
const TENTACLES = [
  'M17 39 C12 45 8 47 7 52 C6 56 10 58 12 55',
  'M24 42 C22 49 18 53 20 58 C21 61 25 61 25 58',
  'M32 43 C32 50 30 55 32 60 C33 62 36 61 35 59',
  'M40 42 C42 49 46 53 44 58 C43 61 39 61 39 58',
  'M47 39 C52 45 56 47 57 52 C58 56 54 58 52 55',
];

export function octopusSvg({ size = 64, id = 'o', title = '', parts = false } = {}) {
  const c = OCTO;
  const cls = (n) => (parts ? ` class="${n}"` : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"${title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'}>`
    // tentacles behind the head
    + `<g${cls('arms')} fill="none" stroke="${c.body}" stroke-width="5.4" stroke-linecap="round">${TENTACLES.map((d, i) => `<path${cls('arm arm' + i)} d="${d}"/>`).join('')}</g>`
    // head: a soft dome
    + `<path d="M10 33 C10 15 20 4 32 4 C44 4 54 15 54 33 C54 40 47 44 32 44 C17 44 10 40 10 33Z" fill="${c.body}"/>`
    + `<path d="M17 13 C20 9 25 7 29 7" fill="none" stroke="${c.light}" stroke-width="3" stroke-linecap="round" opacity=".9"/>`
    + `<circle cx="47" cy="14" r="1.6" fill="${c.light}"/><circle cx="50.5" cy="19" r="1.1" fill="${c.light}"/>`
    // cheeks and smile
    + `<ellipse cx="14.5" cy="36.5" rx="3" ry="1.8" fill="${c.cheek}" opacity=".85"/><ellipse cx="49.5" cy="37.5" rx="3" ry="1.8" fill="${c.cheek}" opacity=".85"/>`
    + `<path d="M29.5 40 Q33 42.6 36.5 40" fill="none" stroke="${c.ink}" stroke-width="2" stroke-linecap="round"/>`
    // glasses: the Q lens (a ring with a tail) and the A lens (a rounded A whose crossbar is the yellow bar)
    + `<g${cls('glasses')}>`
    + `<circle cx="21" cy="25" r="9.2" fill="${c.lens}" stroke="${c.ink}" stroke-width="3"/>`
    + `<path d="M25.8 30 L29.4 33.8" stroke="${c.ink}" stroke-width="3.2" stroke-linecap="round"/>`
    + `<path d="M43 14.2 C44.2 14.2 44.9 15 45.5 16.3 L52.3 33.2 C52.8 34.6 51.9 35.8 50.5 35.8 L35.5 35.8 C34.1 35.8 33.2 34.6 33.7 33.2 L40.5 16.3 C41.1 15 41.8 14.2 43 14.2Z" fill="${c.lens}" stroke="${c.ink}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M37.6 29.4 H48.4" stroke="${c.yellow}" stroke-width="2.6" stroke-linecap="round"/>`
    + `<path d="M30.2 23.5 Q33.5 21 37.3 23.2" fill="none" stroke="${c.ink}" stroke-width="2.6" stroke-linecap="round"/>`
    + `</g>`
    // eyes behind the lenses; the mascot squashes these to blink
    + `<g${cls('eyes')} fill="${c.ink}"><ellipse${cls('eye')} cx="21.6" cy="25.4" rx="2.9" ry="3.4"/><ellipse${cls('eye')} cx="43" cy="24.6" rx="2.7" ry="3.2"/></g>`
    + `<circle cx="22.6" cy="24.2" r="1" fill="#fff"/><circle cx="43.9" cy="23.4" r=".9" fill="#fff"/>`
    + `</svg>`;
}
