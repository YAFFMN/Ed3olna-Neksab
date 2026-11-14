// Drive headless Edge over the DevTools protocol: open the RCPT page, press "Launch Mission",
// collect console errors/exceptions, and save screenshots. Node >= 22 (global WebSocket).
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.env.RCPT_URL || 'http://localhost:5000/';
const OUT = process.argv[2] || '.';
const PORT = 9300 + Math.floor(Math.random() * 400);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'rcptcdp'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  '--headless=new', '--in-process-gpu', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--user-data-dir=${prof}`, `--remote-debugging-port=${PORT}`, '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(500);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    target = list.find((t) => t.type === 'page');
  } catch { /* not up yet */ }
}
if (!target) { console.log('CDP not available'); edge.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const problems = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    problems.push('EXCEPTION ' + ((d.exception && d.exception.description) || d.text).split('\n')[0] + ' @' + (d.url || '') + ':' + d.lineNumber);
  }
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
    problems.push(m.params.type.toUpperCase() + ' ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
  }
  if (m.method === 'Log.entryAdded' && (m.params.entry.level === 'error')) {
    problems.push('LOG ' + m.params.entry.source + ': ' + m.params.entry.text.slice(0, 200) + ' ' + (m.params.entry.url || ''));
  }
});
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64'));
};

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL });
await sleep(6000);
await shot('01-splash.png');

await evalJs("document.getElementById('launch') && document.getElementById('launch').click()");
await sleep(5000);
await shot('02-dashboard.png');

const info = await evalJs(`JSON.stringify({
  bridge: !!window.novaBridge, boot: window.RCPT_BACKEND && window.RCPT_BACKEND.astronaut && window.RCPT_BACKEND.astronaut.full_name,
  novaUser: window.NovaAPI && window.NovaAPI.user && window.NovaAPI.user(),
  novaMode: (window.NovaDebug && window.NovaDebug.S && window.NovaDebug.S.mode),
  endpoint: (window.NovaDebug && window.NovaDebug.S && window.NovaDebug.S.endpoint),
  hb: document.getElementById('hbStatus') && document.getElementById('hbStatus').textContent,
  crew: localStorage.getItem('rcpt.crew'),
  R: window.RCPT && window.RCPT.getState() && window.RCPT.getState().R
})`);
console.log('STATE', info);

// Space weather via the page's own bridge (Data & Validation panel path)
const swx = await evalJs("window.novaBridge.spaceWeather(false).then(r => JSON.stringify({kind:r.kind, flux10:r.flux10, s:r.sScale, n:(r.series||[]).length}))");
console.log('SWX', swx);

// Arabic switch: habitat strings must follow the language
await evalJs("window.RCPTi18n && window.RCPTi18n.set('ar')");
await sleep(1200);
console.log('AR', await evalJs("document.documentElement.dir + ' | ' + document.querySelector('#hb h4').textContent + ' | ' + document.getElementById('hbStatus').textContent"));
await shot('03-arabic.png');
await evalJs("window.RCPTi18n && window.RCPTi18n.set('en')");

console.log('PROBLEMS', problems.length ? '\n' + problems.join('\n') : 'none');
ws.close();
edge.kill();
