#!/usr/bin/env node
// run-all.mjs - starts the whole RCPT project with one command.
//
//   node run-all.mjs              start everything and open the website
//   node run-all.mjs --demo       ... and also run the wearable simulator once (radiation alerts demo)
//   node run-all.mjs --dev        restart the server automatically when you edit backend code (nodemon)
//   node run-all.mjs --port 5050  use another port
//   node run-all.mjs --no-browser / --skip-db / --help
//
// Steps: check Node.js -> create .env if missing -> npm install if needed -> check PostgreSQL and create
// the database/tables if missing -> start the backend (it also serves the website) -> wait until healthy
// -> open the browser -> keep running. Type s / o / r / q + Enter while it runs. Ctrl+C stops everything.
// Uses only Node.js built-in modules, so it works before `npm install`.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(ROOT, 'Backend', 'server');
const FRONTEND_INDEX = path.join(ROOT, 'Frontend', 'index.html');
const ENV_FILE = path.join(SERVER_DIR, '.env');
const ENV_EXAMPLE = path.join(SERVER_DIR, '.env.example');
const IS_WIN = process.platform === 'win32';

// ---------- command line ----------
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
if (flag('--help') || flag('-h')) {
  console.log(`RCPT launcher

  node run-all.mjs              start everything and open the website
  node run-all.mjs --demo       also run the wearable simulator once (radiation alerts demo)
  node run-all.mjs --dev        auto-restart the server when backend code changes (nodemon)
  node run-all.mjs --port 5050  use another port (default: PORT in .env, else 5000)
  node run-all.mjs --no-browser do not open the browser
  node run-all.mjs --skip-db    do not check or create the database

While running, type a letter and press Enter:
  s  run the wearable simulator     o  open the website
  r  restart the server             q  quit`);
  process.exit(0);
}
const DEV = flag('--dev');
const DEMO = flag('--demo');
const NO_BROWSER = flag('--no-browser');
const SKIP_DB = flag('--skip-db');

// ---------- output helpers ----------
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const cyan = (s) => paint('96', s);
const green = (s) => paint('92', s);
const yellow = (s) => paint('93', s);
const red = (s) => paint('91', s);
const dim = (s) => paint('2', s);
const bold = (s) => paint('1', s);
const step = (s) => console.log(cyan('>> ') + s);
const ok = (s) => console.log(green('   OK ') + s);
const warn = (s) => console.log(yellow('   !  ') + s);
const fail = (s) => console.log(red('   X  ') + s);

function fatal(msg, hint) {
  fail(msg);
  if (hint) console.log('      ' + hint);
  process.exit(1);
}

function prefixOutput(child, label, color) {
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    readline.createInterface({ input: stream }).on('line', (line) => console.log(color(`[${label}]`) + ' ' + line));
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- .env (read here only for display/checks; the server reads .env itself) ----------
function readEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    out[m[1]] = v;
  }
  return out;
}
let fileEnv = {};
// Same priority as dotenv: a variable already set in the environment wins over .env.
const setting = (key, fallback = '') => {
  const v = process.env[key] !== undefined ? process.env[key] : fileEnv[key];
  return v === undefined || String(v).trim() === '' ? fallback : String(v).trim();
};

// ---------- network helpers ----------
async function getJson(url, timeoutMs = 2000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function canConnect(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    const done = (v) => {
      s.destroy();
      resolve(v);
    };
    s.setTimeout(timeoutMs, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, () => srv.close(() => resolve(true)));
  });
}

// ---------- 1. Node.js ----------
const nodeMajor = Number(process.versions.node.split('.')[0]);
console.log(bold('\nRCPT - Radiation-Coupled Physiological Twin') + dim(`  (launcher, Node.js ${process.versions.node})\n`));
if (nodeMajor < 18) fatal(`Node.js ${process.versions.node} is too old.`, 'Install Node.js 20 or newer from https://nodejs.org and run this again.');

// ---------- 2. project files ----------
step('Checking project files');
if (!fs.existsSync(path.join(SERVER_DIR, 'server.js'))) fatal(`Backend not found: ${SERVER_DIR}`, 'Run this file from the project folder (it must contain Backend and Frontend).');
if (fs.existsSync(FRONTEND_INDEX)) ok('Backend and Frontend found');
else warn(`Frontend/index.html is missing. The API will run but the website will not load.`);

if (!fs.existsSync(ENV_FILE)) {
  if (fs.existsSync(ENV_EXAMPLE)) {
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    warn(`Created Backend/server/.env from .env.example. Open it and set DB_PASSWORD and GOOGLE_API_KEY.`);
  } else {
    warn('Backend/server/.env is missing. Database and AI settings will use defaults.');
  }
} else ok('Settings file Backend/server/.env found');
fileEnv = readEnvFile(ENV_FILE);

const PORT = Number(option('--port') || setting('PORT', '5000'));
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) fatal(`Invalid port: ${option('--port') || setting('PORT')}`);
const URL_BASE = `http://localhost:${PORT}`;

// ---------- 3. npm packages ----------
step('Checking backend packages');
{
  const pkg = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'package.json'), 'utf8'));
  const wanted = [...Object.keys(pkg.dependencies || {}), ...(DEV ? Object.keys(pkg.devDependencies || {}) : [])];
  const missing = wanted.filter((d) => !fs.existsSync(path.join(SERVER_DIR, 'node_modules', d, 'package.json')));
  if (missing.length) {
    warn(`Installing packages (${missing.join(', ')}). This needs internet and runs only once...`);
    const r = spawnSync('npm', ['install', '--no-fund', '--no-audit'], { cwd: SERVER_DIR, stdio: 'inherit', shell: true });
    if (r.status !== 0) fatal('npm install failed.', `Open a terminal in ${SERVER_DIR} and run: npm install`);
    ok('Packages installed');
  } else ok('All packages installed');
}

// ---------- 4. is RCPT already running? ----------
step(`Checking port ${PORT}`);
let attached = false; // true = a server started outside this launcher is already serving RCPT
{
  const health = await getJson(`${URL_BASE}/api/health`);
  if (health && health.ok && 'frontend' in health) {
    attached = true;
    warn(`RCPT is already running on port ${PORT} (started in another window). This launcher will use it.`);
    console.log('      To run it from here instead, close the other server window (or press Ctrl+C in it) and start this again.');
  } else if (!(await portIsFree(PORT))) {
    fatal(`Port ${PORT} is used by another program.`, `Close that program, or start with another port: node run-all.mjs --port ${PORT + 1}`);
  } else ok(`Port ${PORT} is free`);
}

// ---------- 5. PostgreSQL + database ----------
let dbReady = false;
if (SKIP_DB) {
  step('Database check skipped (--skip-db)');
} else {
  const host = setting('DB_HOST', 'localhost');
  const dbPort = Number(setting('DB_PORT', '5432'));
  step(`Checking PostgreSQL at ${host}:${dbPort}`);
  let up = await canConnect(host, dbPort);
  if (!up && IS_WIN && (host === 'localhost' || host === '127.0.0.1')) {
    // Try to start the Windows service (works when this window has administrator rights).
    const q = spawnSync('sc', ['query', 'state=', 'all'], { encoding: 'utf8' });
    const names = [...String(q.stdout || '').matchAll(/SERVICE_NAME:\s*(postgresql\S*)/gi)].map((m) => m[1]);
    for (const name of names) {
      warn(`PostgreSQL is not running. Trying to start the "${name}" service...`);
      spawnSync('net', ['start', name], { encoding: 'utf8' });
      for (let i = 0; i < 10 && !up; i++) {
        await sleep(500);
        up = await canConnect(host, dbPort);
      }
      if (up) break;
    }
    if (!up && names.length) {
      warn(`Could not start it from here. Open "Services" from the Start menu, find "${names[0]}" and click Start,`);
      console.log('      or run this launcher as administrator.');
    }
  }
  if (!up) {
    warn('PostgreSQL is not reachable. The website still works, but Habitat Link will show "HABITAT SERVER OFFLINE".');
  } else {
    ok('PostgreSQL is running');
    const r = spawnSync(process.execPath, ['setup-db.js'], { cwd: SERVER_DIR, encoding: 'utf8' });
    const out = (String(r.stdout || '') + String(r.stderr || '')).trim();
    if (r.status === 0) {
      ok(out || 'Database ready');
      dbReady = true;
    } else {
      warn(out || 'Database setup failed.');
      console.log('      The website still works; Habitat Link will be offline until the database is fixed.');
    }
  }
}

// ---------- 6. backend server ----------
let server = null;
let stopping = false;
let simulator = null;

function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (IS_WIN) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

function waitExit(child, ms) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve();
    const t = setTimeout(resolve, ms);
    child.once('exit', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

function startServer() {
  const nodemon = path.join(SERVER_DIR, 'node_modules', 'nodemon', 'bin', 'nodemon.js');
  const useNodemon = DEV && fs.existsSync(nodemon);
  const argv = useNodemon ? [nodemon, '--no-stdin', 'server.js'] : ['server.js'];
  const child = spawn(process.execPath, argv, {
    cwd: SERVER_DIR,
    env: { ...process.env, PORT: String(PORT), DOTENV_CONFIG_QUIET: 'true' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  prefixOutput(child, 'server', (s) => paint('94', s));
  child.on('exit', (code, signal) => {
    if (server === child) server = null;
    // Short delay: when the window is closed or Ctrl+C is pressed, the server can exit a moment
    // before the launcher's own shutdown starts; that is not a crash.
    setTimeout(() => {
      if (stopping || server) return;
      fail(`The server stopped (${signal || 'exit code ' + code}). Read the [server] lines above for the reason.`);
      console.log('      Type r and press Enter to start it again, or q to quit.');
    }, 400);
  });
  server = child;
  return child;
}

async function waitHealthy(child, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (child && (child.exitCode !== null || child.signalCode !== null)) return null;
    const h = await getJson(`${URL_BASE}/api/health`, 1500);
    if (h && h.ok) return h;
    await sleep(500);
  }
  return null;
}

function printStatus(h) {
  const ai = (h && h.ai) || {};
  const line = (k, v) => console.log('   ' + bold(k.padEnd(10)) + v);
  console.log('\n' + green(bold('RCPT is running')));
  line('Website', cyan(`${URL_BASE}/`));
  line('Database', h && h.db ? green('online') : yellow('offline (Habitat Link disabled)'));
  if (ai.available) line('Nova AI', green(`${ai.name || ai.provider} - ${ai.model}`));
  else line('Nova AI', yellow('no API key - Nova uses its offline answers'));
  if (ai.provider !== 'google') {
    console.log(dim('             To use Google Gemini: put your key after GOOGLE_API_KEY= in Backend\\server\\.env, then type r.'));
  }
  if (h && h.frontend === false) line('Frontend', yellow('Frontend/index.html missing'));
  console.log(`
   Type a letter and press Enter:
     ${bold('s')}  run the wearable simulator (3 radiation readings -> alerts in Habitat Link)
     ${bold('o')}  open the website
     ${bold('r')}  restart the server (after editing .env)
     ${bold('q')}  quit (or press Ctrl+C)
`);
}

// ---------- 7. browser + simulator ----------
function openBrowser() {
  const url = `${URL_BASE}/`;
  try {
    const opts = { stdio: 'ignore', detached: true };
    const p = IS_WIN
      ? spawn('cmd.exe', ['/c', 'start', '', url], opts)
      : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], opts);
    p.on('error', () => warn(`Could not open the browser. Open ${url} yourself.`));
    p.unref();
  } catch {
    warn(`Could not open the browser. Open ${url} yourself.`);
  }
}

function runSimulator() {
  if (simulator) return warn('The simulator is already running.');
  if (!server && !attached) return warn('Start the server first (type r).');
  console.log(cyan('>> ') + 'Wearable simulator: sending 3 readings (normal, elevated, solar flare). Watch Habitat Link on the website.');
  if (!dbReady) warn('The database looked offline at start-up, so the readings may be rejected.');
  const child = spawn(process.execPath, ['simulator.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, RCPT_API_URL: `${URL_BASE}/api/readings`, DOTENV_CONFIG_QUIET: 'true' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  prefixOutput(child, 'simulator', (s) => paint('95', s));
  simulator = child;
  child.on('exit', (code) => {
    simulator = null;
    if (!stopping) (code === 0 ? ok : warn)(`Simulator finished${code === 0 ? '' : ' with exit code ' + code}.`);
  });
}

// ---------- 8. shutdown ----------
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log('\n' + cyan('>> ') + 'Stopping RCPT...');
  killTree(simulator);
  killTree(server);
  await Promise.all([waitExit(simulator, 3000), waitExit(server, 3000)]);
  console.log(attached ? 'Launcher closed (the server in the other window is still running).' : 'Stopped. Bye.');
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('SIGHUP', () => shutdown(0));

// ---------- 9. go ----------
let health;
if (attached) {
  health = await getJson(`${URL_BASE}/api/health`);
} else {
  step(DEV ? 'Starting the server (auto-restart on code changes)' : 'Starting the server');
  const child = startServer();
  health = await waitHealthy(child, 45000);
  if (!health) {
    if (server) {
      fail(`The server did not answer on ${URL_BASE} within 45 seconds.`);
      await shutdown(1);
    } else {
      fatal('The server could not start. Read the [server] lines above for the reason.', 'Fix the problem, then run this again.');
    }
  }
}
printStatus(health);
if (!NO_BROWSER) openBrowser();
if (DEMO) {
  console.log(dim('   Demo: the simulator starts in 6 seconds (time for the page to load; click "Launch Mission").'));
  setTimeout(() => !stopping && runSimulator(), 6000);
}

const input = readline.createInterface({ input: process.stdin });
input.on('line', async (raw) => {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return;
  if (cmd === 'q' || cmd === 'quit' || cmd === 'exit') return shutdown(0);
  if (cmd === 'o') return openBrowser();
  if (cmd === 's') return runSimulator();
  if (cmd === 'r') {
    if (attached) return warn('The server was started in another window; restart it there.');
    step('Restarting the server');
    stopping = true;
    killTree(server);
    await waitExit(server, 4000);
    stopping = false;
    fileEnv = readEnvFile(ENV_FILE);
    const child = startServer();
    const h = await waitHealthy(child, 45000);
    if (h) printStatus(h);
    return;
  }
  if (cmd === 'h' || cmd === 'help' || cmd === '?') return printStatus(await getJson(`${URL_BASE}/api/health`));
  warn(`Unknown command "${cmd}". Use s, o, r or q.`);
});
// If there is no keyboard (stdin closed), keep running until Ctrl+C.
