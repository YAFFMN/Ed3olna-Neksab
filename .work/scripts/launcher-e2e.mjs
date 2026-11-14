// End-to-end test for run-all.mjs: start -> "s" (simulator) -> "q" (quit) -> port released.
// Run from the project root. Uses port 5055 and the throwaway database rcpt_launcher_test.
import { spawn } from 'node:child_process';
import net from 'node:net';

const PORT = 5055;
const env = { ...process.env, DB_NAME: 'rcpt_launcher_test', GOOGLE_API_KEY: ' ', NVIDIA_API_KEY: ' ', NO_COLOR: '1' };
const child = spawn(process.execPath, ['run-all.mjs', '--port', String(PORT), '--no-browser'], { env, stdio: ['pipe', 'pipe', 'pipe'] });

let out = '';
const seen = (s) => out.includes(s);
const log = (d) => { const t = d.toString(); out += t; process.stdout.write(t); };
child.stdout.on('data', log);
child.stderr.on('data', log);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(cond, ms, what) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (cond()) return; await sleep(200); }
  throw new Error('timeout waiting for ' + what);
}
const portFree = () => new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(PORT, () => s.close(() => res(true))); });

const t0 = Date.now();
const results = [];
try {
  await until(() => seen('RCPT is running'), 60000, 'start-up');
  results.push(`started in ${Date.now() - t0} ms`);
  child.stdin.write('s\n');
  const t1 = Date.now();
  await until(() => seen('Simulator finished'), 60000, 'simulator');
  results.push(`simulator finished in ${Date.now() - t1} ms`);
  results.push('offline AI text used instantly: ' + !/AI fallback/.test(out));
  results.push('dotenv banners hidden: ' + !/injected env/.test(out));
  child.stdin.write('q\n');
  await until(() => child.exitCode !== null, 15000, 'quit');
  results.push('launcher exit code: ' + child.exitCode);
  results.push('false crash warning: ' + /The server stopped/.test(out));
  await sleep(500);
  results.push('port released (no orphan server): ' + (await portFree()));
} catch (e) {
  results.push('ERROR ' + e.message);
  child.kill();
}
console.log('\n==== RESULTS\n' + results.join('\n'));
