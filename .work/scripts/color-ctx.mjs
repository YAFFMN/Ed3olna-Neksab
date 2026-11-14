// Print short contexts for given colour literals in the RCPT HTML.
import fs from 'fs';
const html = fs.readFileSync(process.argv[2], 'utf8');
const terms = process.argv.slice(3);
for (const t of terms) {
  const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/,/g, '\\s*,\\s*'), 'gi');
  const hits = [...html.matchAll(re)].slice(0, 6);
  console.log(`\n== ${t} (${[...html.matchAll(re)].length})`);
  for (const h of hits) {
    const s = Math.max(0, h.index - 90);
    console.log('  …' + html.slice(s, h.index + 70).replace(/\s+/g, ' ') + '…');
  }
}
