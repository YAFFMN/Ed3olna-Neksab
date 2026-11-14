// Build Frontend/index.html from an RCPT single-file HTML export.
// Usage: node .work/scripts/build-frontend.mjs "<path to RCPT html>" "<Frontend dir>" [--no-theme]
// 1. Inserts two same-origin <script> tags right after the companion config (window.NOVA_CONFIG)
//    so the backend bridge exists before Nova starts.
// 2. Applies the main palette (#1B365D #005A9C #60C1E5 #A0E0EF): maps the original greys/cyan to palette
//    shades (CSS, canvas chart code and the inline SVG logo) and links rcpt-theme.css after the page styles.
import fs from 'fs';
import path from 'path';
import { applyPalette, recolorSvgDataUris } from './palette.mjs';

const args = process.argv.slice(2);
const theme = !args.includes('--no-theme');
const [src, outDir] = args.filter((a) => !a.startsWith('--'));
if (!src || !outDir) {
  console.error('usage: build-frontend.mjs <rcpt.html> <FrontendDir> [--no-theme]');
  process.exit(2);
}

let html = fs.readFileSync(src, 'utf8');
if (html.includes('rcpt-backend.js')) throw new Error('Input already contains the backend bridge; use the original export');

// --- palette ---
const stats = {};
if (theme) {
  html = recolorSvgDataUris(html, stats);
  html = applyPalette(html, stats);
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) throw new Error('</head> not found');
  html = html.slice(0, headEnd) + '<link rel="stylesheet" href="rcpt-theme.css">\n' + html.slice(headEnd);
}

// --- backend bridge ---
const MARK = 'window.NOVA_CONFIG = {';
const at = html.indexOf(MARK);
if (at < 0) throw new Error('NOVA_CONFIG block not found; is this an RCPT v1.8 export?');
const close = html.indexOf('</script>', at);
if (close < 0) throw new Error('Closing </script> for NOVA_CONFIG not found');
const inject =
  '\n<!-- Backend bridge (Express server in Backend/server): crew + AI bootstrap, then window.novaBridge over HTTP -->' +
  '\n<script src="/api/bootstrap.js"></script>' +
  '\n<script src="rcpt-backend.js"></script>';
const insertAt = close + '</script>'.length;
html = html.slice(0, insertAt) + inject + html.slice(insertAt);

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'index.html');
fs.writeFileSync(out, html, 'utf8');

// sanity checks
const scripts = (html.match(/<script\b/g) || []).length;
const cfgPos = html.indexOf(MARK);
const bridgePos = html.indexOf('rcpt-backend.js');
const novaPos = html.indexOf('var bridge=window.novaBridge');
const replaced = Object.values(stats).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ out, bytes: Buffer.byteLength(html), scripts, orderOk: cfgPos < bridgePos && bridgePos < novaPos, theme, replaced, svgRecoloured: stats.svg || 0 }));
if (theme) {
  const top = Object.entries(stats).filter(([k]) => k !== 'svg').sort((a, b) => b[1] - a[1]);
  console.log('colour replacements:', top.map(([k, n]) => `${k}×${n}`).join(' '));
}
