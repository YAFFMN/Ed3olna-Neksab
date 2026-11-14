// RCPT palette (user's main palette):
//   NAVY #1B365D  BLUE #005A9C  SKY #60C1E5  AQUA #A0E0EF
// The original UI used near-black greys and a #17a9f0 cyan. Every neutral surface, line and blue accent
// is mapped to a shade of the palette. Safety colours (green nominal / amber elevated / red emergency)
// and the Mars terrain colours are deliberately NOT changed: they carry meaning.

export const PALETTE = { navy: '#1B365D', blue: '#005A9C', sky: '#60C1E5', aqua: '#A0E0EF' };

// Navy depth scale used for backgrounds (darkest -> lightest)
//   ink #0c182a  deep #0f1e33  panel #12233c  card #142946  raised #172e4f  navy #1B365D
//   line #24476f  line2 #2a5280  edge #2f5a8a  edge2 #35628f
export const HEX_MAP = {
  // backgrounds
  '#02050a': '#0c182a', '#03070d': '#0c182a', '#04080e': '#0c182a', '#060d17': '#12233c',
  '#0a0f16': '#12233c', '#0b131e': '#12233c', '#0c1521': '#12233c',
  '#0f1722': '#142946', '#0f1a28': '#142946', '#1b1d26': '#142946',
  '#12202f': '#172e4f', '#15202e': '#172e4f', '#16222f': '#172e4f',
  '#1b2634': '#1b365d',
  // lines and borders
  '#1d2836': '#24476f', '#1d2b3d': '#24476f', '#2a2d3a': '#24476f',
  '#243246': '#2a5280', '#243449': '#2a5280',
  '#2a3a50': '#2f5a8a', '#2b3f57': '#2f5a8a', '#3a3e4c': '#2f5a8a',
  '#2f3b4d': '#35628f', '#33445c': '#35628f',
  // dark text on bright buttons
  '#02131f': '#0c182a',
  // accents
  '#17a9f0': '#60c1e5', '#29b5e8': '#60c1e5',
  '#29d3ff': '#a0e0ef', '#9fdcff': '#a0e0ef', '#a8d4fb': '#a0e0ef', '#9be3ff': '#a0e0ef',
  '#bfe6ff': '#c6ecf5', '#cfe9fb': '#d3f1f8',
  '#2a78cd': '#005a9c', '#0a1e3c': '#1b365d',
  // muted text (grey -> blue-grey)
  '#a9b3c1': '#a9c3d6', '#a9b8c9': '#a9c3d6', '#8fa0b4': '#8fb0c8', '#a3a8b8': '#a3bccf'
};

export const RGB_MAP = {
  '2,5,10': '12,24,42', '3,7,12': '12,24,42', '2,6,12': '12,24,42', '3,10,20': '12,24,42', '5,9,15': '12,24,42',
  '8,13,20': '15,30,51', '7,12,19': '15,30,51',
  '10,15,22': '18,35,60', '14,17,23': '18,35,60',
  '23,32,45': '27,54,93', '38,39,48': '27,54,93',
  '23,169,240': '96,193,229',
  '120,215,255': '160,224,239',
  '42,120,205': '0,90,156', '61,157,243': '0,90,156'
};

export function applyPalette(text, stats = {}) {
  const bump = (k) => { stats[k] = (stats[k] || 0) + 1; };
  let out = text.replace(/#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g, (m, h) => {
    const to = HEX_MAP['#' + h.toLowerCase()];
    if (!to) return m;
    bump('#' + h.toLowerCase());
    return to;
  });
  // URL-encoded SVG colours: %23rrggbb
  out = out.replace(/%23([0-9a-fA-F]{6})(?![0-9a-fA-F])/g, (m, h) => {
    const to = HEX_MAP['#' + h.toLowerCase()];
    if (!to) return m;
    bump('%23' + h.toLowerCase());
    return '%23' + to.slice(1);
  });
  out = out.replace(/(rgba?\()\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(\s*[,)])/gi, (m, p, r, g, b, rest) => {
    const key = `${+r},${+g},${+b}`;
    const to = RGB_MAP[key];
    if (!to) return m;
    bump('rgb(' + key + ')');
    return p + to + rest;
  });
  return out;
}

// Inline SVG images (logo etc.) are base64-encoded, so recolour them by decoding and re-encoding.
export function recolorSvgDataUris(html, stats = {}) {
  return html.replace(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/g, (m, b64) => {
    const svg = Buffer.from(b64, 'base64').toString('utf8');
    const s = {};
    const next = applyPalette(svg, s);
    if (next === svg) return m;
    stats.svg = (stats.svg || 0) + 1;
    return 'data:image/svg+xml;base64,' + Buffer.from(next, 'utf8').toString('base64');
  });
}
