// Survey colour usage in the RCPT HTML: :root variables and the most frequent literal colours.
import fs from 'fs';
const html = fs.readFileSync(process.argv[2], 'utf8');

const roots = [...html.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1].trim());
console.log('ROOT BLOCKS:', roots.length);
roots.forEach((r, i) => console.log(`  [${i}]`, r.slice(0, 600)));

const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
console.log('CSP:', csp ? csp[1] : 'none');

const count = (re) => {
  const m = new Map();
  for (const x of html.matchAll(re)) {
    const k = x[0].toLowerCase().replace(/\s+/g, '');
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const hex = count(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g).filter(([k]) => !/^#(\d{3})$/.test(k) || true);
console.log('\nTOP HEX:', hex.slice(0, 60).map(([k, n]) => `${k}:${n}`).join('  '));
const rgba = count(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)/g);
// group rgba by base colour
const base = new Map();
for (const [k, n] of rgba) {
  const b = k.replace(/^rgba?\((\d+),(\d+),(\d+).*$/, '$1,$2,$3');
  base.set(b, (base.get(b) || 0) + n);
}
console.log('\nTOP RGB BASES:', [...base.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => `(${k}):${n}`).join('  '));
console.log('\nVAR USES:', count(/var\(--[a-z0-9-]+\)/g).slice(0, 30).map(([k, n]) => `${k}:${n}`).join('  '));
