const fs = require('fs');
const p = process.argv[2];
const html = fs.readFileSync(p, 'utf8');
const lines = html.split(/\r?\n/);
console.log('lines', lines.length, 'bytes', html.length);

// style blocks
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
console.log('style blocks', styles.length, styles.map(s => s[1].length).join(','));
fs.mkdirSync('.work/html', { recursive: true });
styles.forEach((s, i) => fs.writeFileSync(`.work/html/style${i}.css`, s[1]));

// scripts
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
console.log('script blocks', scripts.length, scripts.map(s => s[1].length).join(','));
scripts.forEach((s, i) => fs.writeFileSync(`.work/html/script${i}.js`, s[1]));

// body without scripts
let body = html.replace(/<script[\s\S]*?<\/script>/gi, '');
const bi = body.indexOf('<body');
body = body.slice(bi);
fs.writeFileSync('.work/html/body.html', body);
console.log('body bytes', body.length);

// ids with line numbers
const idRe = /<[a-zA-Z][^>]*\sid="([^"]+)"/g;
let m, seen = new Set();
while ((m = idRe.exec(html))) {
  if (seen.has(m[1])) continue;
  seen.add(m[1]);
  const line = html.slice(0, m.index).split(/\r?\n/).length;
  console.log(`L${line}\t#${m[1]}`);
}
