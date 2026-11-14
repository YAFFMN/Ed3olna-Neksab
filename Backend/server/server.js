import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { initKnowledgeBase, searchKnowledge } from './rag.js';
import * as swx from './swx.js';
import { chat as novaChat, activeProvider, isManagedEndpoint } from './nova.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
initKnowledgeBase(path.join(__dirname, 'knowledge'));

// The RCPT frontend is a single self-contained HTML app in /Frontend, served by this backend
// (same origin, so the page's strict Content-Security-Policy `default-src 'self'` allows the API calls).
const FRONTEND_DIR = process.env.FRONTEND_DIR
  ? path.resolve(process.env.FRONTEND_DIR)
  : path.resolve(__dirname, '..', '..', 'Frontend');
const DATA_DIR = path.join(__dirname, '.data');
const swxCache = swx.createCache(DATA_DIR);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Helper: ask the configured AI provider (Google Gemini by default, see nova.js) with an offline fallback.
// Used for the proactive alert messages and the older /api/chat route.
async function askSpaceAI(prompt) {
  const ai = activeProvider();
  const offline =
    'FLIGHT SURGEON AI (OFFLINE MODE): Radiation anomaly detected. Follow the active emergency protocol on your HUD, move to the storm shelter, and stay hydrated.';
  if (!ai.key) return offline; // no API key in .env: answer instantly instead of sending a request that must fail
  const result = await novaChat(
    {
      endpoint: ai.endpoint,
      models: ai.models,
      messages: [
        {
          role: 'system',
          content: 'You are Nova, an expert NASA Flight Surgeon AI. Answer strictly using the provided NASA/CSA Knowledge Base context and live astronaut telemetry. Cite the source section in brackets like [NASA HRP] or [CSA]. Keep answers clear, calm, and actionable.'
        },
        { role: 'user', content: prompt }
      ],
      ...ai.extra,
      // Gemini recommends its default temperature; NVIDIA keeps the previous settings.
      ...(ai.id === 'nvidia' ? { max_tokens: 512, temperature: 0.4 } : {})
    },
    ai.key,
    60000
  );
  if (result.ok && result.text) return result.text;
  console.error(`${ai.name} AI fallback:`, result.error || 'empty reply');
  return offline;
}

// Shared helper: evaluate reading against threshold limits and prevent duplicate active alerts
async function evaluateReadingAlert(astronautId, reading, astronaut) {
  let conditionCode = null;
  const safeLimit = Number(astronaut?.safe_dose_limit_msv) || 50;
  const cumulativeDose = Number(reading.cumulative_dose_msv);
  const rateUsvHr = Number(reading.radiation_rate_usv_hr);

  if (Number.isFinite(cumulativeDose) && cumulativeDose >= safeLimit) {
    conditionCode = 'DOSE_LIMIT_EXCEEDED';
  } else if (Number.isFinite(rateUsvHr) && rateUsvHr >= 1000) {
    conditionCode = 'SOLAR_FLARE_SPE';
  } else if (Number.isFinite(rateUsvHr) && rateUsvHr >= 250) {
    conditionCode = 'ELEVATED_RATE';
  }

  if (!conditionCode) return null;

  const protoRes = await pool.query('SELECT * FROM protocols WHERE condition_code = $1', [conditionCode]);
  const protocol = protoRes.rows[0];
  if (!protocol) return null;

  // Check if an alert for this protocol is already active to prevent alert flooding
  const existingAlert = await pool.query(
    `SELECT a.*, p.title, p.severity, p.action_steps, p.condition_code 
     FROM alerts a JOIN protocols p ON a.protocol_id = p.id 
     WHERE a.astronaut_id = $1 AND a.protocol_id = $2 AND a.status = 'ACTIVE' LIMIT 1`,
    [astronautId, protocol.id]
  );

  if (existingAlert.rows.length > 0) {
    // Same shape as a new alert (protocol details included), flagged so clients know it is not new.
    return { ...existingAlert.rows[0], protocol, alreadyActive: true };
  }

  // Create new active alert
  const alertRes = await pool.query(
    `INSERT INTO alerts (astronaut_id, reading_id, protocol_id) VALUES ($1, $2, $3) RETURNING *`,
    [astronautId, reading.id, protocol.id]
  );
  const triggeredAlert = { ...alertRes.rows[0], protocol };

  // Proactive AI message
  const aiPrompt = `You are an onboard NASA Spacecraft Medical AI speaking urgently to ${astronaut?.full_name || 'Commander'}. 
Alert: ${protocol.title} (${protocol.severity}). 
Current Radiation Rate: ${rateUsvHr} uSv/hr. Cumulative Dose: ${cumulativeDose}/${safeLimit} mSv.
Protocol Steps: ${protocol.action_steps}.
Give a short, calm, 2-sentence immediate instruction telling the astronaut what to do right now.`;

  const aiReply = await askSpaceAI(aiPrompt);
  await pool.query(
    `INSERT INTO ai_chat_logs (astronaut_id, alert_id, sender, message) VALUES ($1, $2, 'AI', $3)`,
    [astronautId, triggeredAlert.id, aiReply]
  );

  return triggeredAlert;
}

// 1. GET DASHBOARD: Frontend polls this to show vitals, active alerts & chat
app.get('/api/dashboard/:astronautId', async (req, res) => {
  const { astronautId } = req.params;
  try {
    const astroRes = await pool.query('SELECT * FROM astronauts WHERE id = $1', [astronautId]);
    const readingRes = await pool.query(
      'SELECT * FROM sensor_readings WHERE astronaut_id = $1 ORDER BY recorded_at DESC LIMIT 10',
      [astronautId]
    );
    const alertRes = await pool.query(
      `SELECT a.*, p.title, p.severity, p.action_steps, p.condition_code 
       FROM alerts a JOIN protocols p ON a.protocol_id = p.id 
       WHERE a.astronaut_id = $1 AND a.status = 'ACTIVE' ORDER BY a.triggered_at DESC`,
      [astronautId]
    );
    const chatRes = await pool.query(
      // Latest 30 messages, returned oldest-first (the old query returned the first 30 ever written).
      'SELECT * FROM (SELECT * FROM ai_chat_logs WHERE astronaut_id = $1 ORDER BY sent_at DESC, id DESC LIMIT 30) t ORDER BY sent_at ASC, id ASC',
      [astronautId]
    );

    res.json({
      astronaut: astroRes.rows[0] || null,
      latestReading: readingRes.rows[0] || null,
      recentHistory: [...readingRes.rows].reverse(),
      activeAlerts: alertRes.rows,
      chatHistory: chatRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST SENSOR READING: Receives wearable data & checks for radiation danger
app.post('/api/readings', async (req, res) => {
  const {
    astronaut_id = 1,
    radiation_rate_usv_hr,
    cumulative_dose_msv,
    radiation_type = 'GCR',
    heart_rate_bpm = 75,
    data_source = 'WEARABLE'
  } = req.body;

  try {
    const astroRes = await pool.query('SELECT * FROM astronauts WHERE id = $1', [astronaut_id]);
    const astronaut = astroRes.rows[0];
    if (!astronaut) {
      return res.status(404).json({ error: `Astronaut with ID ${astronaut_id} not found` });
    }

    // Determine cumulative dose: use provided value or calculate incrementally from previous reading
    let finalDose = cumulative_dose_msv;
    if (finalDose === undefined || finalDose === null || !Number.isFinite(Number(finalDose))) {
      const prev = await pool.query(
        'SELECT cumulative_dose_msv FROM sensor_readings WHERE astronaut_id = $1 ORDER BY recorded_at DESC LIMIT 1',
        [astronaut_id]
      );
      const prevDose = prev.rows[0] ? Number(prev.rows[0].cumulative_dose_msv) : 12.4;
      const rate = Number(radiation_rate_usv_hr) || 0;
      finalDose = +(prevDose + (rate / 1000 / 3600 * 2.5)).toFixed(4);
    }

    // Save reading
    const newReading = await pool.query(
      `INSERT INTO sensor_readings (astronaut_id, radiation_rate_usv_hr, cumulative_dose_msv, radiation_type, heart_rate_bpm, data_source)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [astronaut_id, radiation_rate_usv_hr, finalDose, radiation_type, heart_rate_bpm, data_source]
    );
    const reading = newReading.rows[0];

    const triggeredAlert = await evaluateReadingAlert(astronaut_id, reading, astronaut);

    res.status(201).json({ reading, alert: triggeredAlert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST CHAT: Astronaut asks the AI for help during a problem
app.post('/api/chat', async (req, res) => {
  const { astronaut_id = 1, message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    // 1. Save astronaut's question
    const userMsgRes = await pool.query(
      `INSERT INTO ai_chat_logs (astronaut_id, sender, message) VALUES ($1, 'ASTRONAUT', $2) RETURNING *`,
      [astronaut_id, message.trim()]
    );

    // 2. Fetch live context (latest reading + latest active alert)
    const readingRes = await pool.query(
      'SELECT * FROM sensor_readings WHERE astronaut_id = $1 ORDER BY recorded_at DESC LIMIT 1',
      [astronaut_id]
    );
    const alertRes = await pool.query(
      `SELECT p.title, p.action_steps FROM alerts a JOIN protocols p ON a.protocol_id = p.id 
       WHERE a.astronaut_id = $1 AND a.status = 'ACTIVE' ORDER BY a.triggered_at DESC LIMIT 1`,
      [astronaut_id]
    );

    const latest = readingRes.rows[0];
    const activeAlert = alertRes.rows[0];

    // 3. Retrieve matching NASA/CSA sections from your RAG knowledge base
    const ragContext = searchKnowledge(message, 3);

    // 4. Combine RAG Knowledge + Live Telemetry + Active Alert
    const contextPrompt = `You are Nova, an onboard NASA Flight Surgeon AI assistant.

VERIFIED NASA/CSA KNOWLEDGE BASE:
${ragContext}

LIVE TELEMETRY:
${latest ? `Rate ${latest.radiation_rate_usv_hr} uSv/hr, Total Dose ${latest.cumulative_dose_msv} mSv, Heart Rate ${latest.heart_rate_bpm} bpm, NOAA Scale S${latest.noaa_s_scale ?? 0}` : 'Normal'}.

ACTIVE EMERGENCY:
${activeAlert ? `${activeAlert.title} | Steps: ${activeAlert.action_steps}` : 'None'}.

Astronaut asks: "${message}"
Reply clearly and concisely with actionable spaceflight medical advice, citing the relevant [NASA HRP] or [CSA] section when applicable.`;

    const aiReply = await askSpaceAI(contextPrompt);

    const savedAi = await pool.query(
      `INSERT INTO ai_chat_logs (astronaut_id, sender, message) VALUES ($1, 'AI', $2) RETURNING *`,
      [astronaut_id, aiReply]
    );

    res.json({
      reply: savedAi.rows[0],
      userMessage: userMsgRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PATCH RESOLVE ALERT: Astronaut confirms they followed the protocol
app.patch('/api/alerts/:alertId/resolve', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE alerts SET status = 'RESOLVED' WHERE id = $1 RETURNING *`,
      [req.params.alertId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Alert with ID ${req.params.alertId} not found` });
    }
    res.json({ resolvedAlert: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared helper: store a NOAA GOES proton-flux record as a sensor reading and evaluate alerts.
// Uses the same ASSUMED flux -> dose mapping as the frontend (swx.assumedDose).
async function storeNoaaReading(astronautId, rec) {
  const flux10 = Number(rec.flux10) || 0;
  const flux100 = Number(rec.flux100) || 0;
  const sScale = swx.sScale(flux10);
  const doseMsvHr = swx.assumedDose(flux10);
  const rateUsvHr = doseMsvHr * 1000;

  const prev = await pool.query(
    'SELECT cumulative_dose_msv FROM sensor_readings WHERE astronaut_id = $1 ORDER BY recorded_at DESC LIMIT 1',
    [astronautId]
  );
  const prevDose = prev.rows[0] ? Number(prev.rows[0].cumulative_dose_msv) : 12.4;
  const newCumulative = +(prevDose + (doseMsvHr / 60)).toFixed(4);

  const saved = await pool.query(
    `INSERT INTO sensor_readings 
     (astronaut_id, radiation_rate_usv_hr, cumulative_dose_msv, radiation_type, heart_rate_bpm, proton_flux_10mev, proton_flux_100mev, noaa_s_scale, data_source)
     VALUES ($1, $2, $3, 'NOAA_PROTON', 74, $4, $5, $6, 'NOAA_LIVE') RETURNING *`,
    [astronautId, rateUsvHr, newCumulative, flux10, flux100, sScale]
  );
  const reading = saved.rows[0];

  const astroRes = await pool.query('SELECT * FROM astronauts WHERE id = $1', [astronautId]);
  const triggeredAlert = await evaluateReadingAlert(astronautId, reading, astroRes.rows[0]);
  return { reading, alert: triggeredAlert, sScale };
}

// 5. LIVE NOAA SATELLITE SYNC: Fetches real GOES proton flux & logs it to PostgreSQL
app.get('/api/space-weather/sync', async (req, res) => {
  const astronautId = req.query.astronautId ? parseInt(req.query.astronautId, 10) : 1;
  try {
    const live = await swx.fetchLive();
    const rec = { ...live, kind: 'live', fetchedAt: new Date().toISOString() };
    swxCache.write(rec);
    const { reading, alert, sScale } = await storeNoaaReading(astronautId, rec);
    res.json({
      source: 'NOAA GOES Primary Satellite',
      observedAt: rec.observedAt,
      sScale,
      sScaleText: `S${sScale}`,
      reading,
      alert
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// RCPT frontend bridge (replaces the desktop shell's window.novaBridge IPC).
// ---------------------------------------------------------------------------

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), ms))
  ]);
}

let novaSessionKey = null; // key typed into Nova Settings; memory only, never sent back to the browser

function aiInfo() {
  const ai = activeProvider();
  return { available: !!(novaSessionKey || ai.key), provider: ai.id, name: ai.name, endpoint: ai.endpoint, model: ai.model };
}

// Only the RCPT page served by this backend may use the Nova key/chat routes.
// (cors() is open for the older API, so without this any website could spend the API key.)
const allowedOrigins = new Set(
  [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, ...(process.env.ALLOWED_ORIGINS || '').split(',')]
    .map((s) => s.trim())
    .filter(Boolean)
);
function novaGuard(req, res, next) {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  }
  next();
}

// 6. BOOTSTRAP: tiny script loaded by the page before the companion starts (crew names, AI availability).
app.get('/api/bootstrap.js', async (req, res) => {
  const wanted = parseInt(req.query.astronautId, 10) || 1;
  const boot = {
    ok: true,
    astronautId: wanted,
    db: false,
    astronaut: null,
    crew: [],
    ai: aiInfo(),
    serverTime: new Date().toISOString()
  };
  try {
    const r = await withTimeout(
      pool.query('SELECT id, full_name, mission_role, blood_type, safe_dose_limit_msv FROM astronauts ORDER BY id LIMIT 8'),
      2500
    );
    boot.db = true;
    boot.crew = r.rows;
    boot.astronaut = r.rows.find((a) => a.id === wanted) || r.rows[0] || null;
    if (boot.astronaut) boot.astronautId = boot.astronaut.id;
  } catch (err) {
    boot.dbError = err.message;
  }
  res.set('Content-Type', 'application/javascript; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(`window.RCPT_BACKEND=${JSON.stringify(boot).replace(/</g, '\\u003c')};`);
});

// 7. HEALTH
app.get('/api/health', async (req, res) => {
  let db = false;
  try {
    await withTimeout(pool.query('SELECT 1'), 2000);
    db = true;
  } catch { /* offline */ }
  res.json({ ok: true, db, ai: aiInfo(), frontend: fs.existsSync(path.join(FRONTEND_DIR, 'index.html')) });
});

// 8. NOVA KEY STORE (session memory). The provider key in .env (GOOGLE_API_KEY / NVIDIA_API_KEY) is used by default.
app.get('/api/nova/key', novaGuard, (req, res) => {
  const envKey = activeProvider().key;
  res.json({
    has: !!(novaSessionKey || envKey),
    encrypted: false,
    source: novaSessionKey ? 'session' : envKey ? 'server-env' : null
  });
});
app.post('/api/nova/key', novaGuard, (req, res) => {
  const key = String((req.body && req.body.key) || '').trim().slice(0, 512);
  if (!key) return res.json({ ok: false });
  novaSessionKey = key;
  res.json({ ok: true });
});
app.delete('/api/nova/key', novaGuard, (req, res) => {
  novaSessionKey = null;
  res.json({ ok: true });
});

// 9. NOVA CHAT: OpenAI-compatible proxy + NASA/CSA knowledge base + habitat database context.
app.post('/api/nova/chat', novaGuard, async (req, res) => {
  const body = req.body || {};
  const ai = activeProvider();
  const requested = String(body.endpoint || '').trim();
  // Google/NVIDIA endpoints (or none) -> the server's configured provider decides endpoint, model and key,
  // even if the browser still has older NVIDIA settings saved. Any other URL (e.g. local Ollama) is used as given.
  const managed = isManagedEndpoint(requested);
  const endpoint = managed ? ai.endpoint : requested;
  const astronautId = parseInt(body.astronautId, 10) || 1;

  // Only plain text turns are forwarded (Gemini rejects empty or unknown-role messages).
  let messages = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-24)
    : [];
  const companionChat = messages.length > 0 && messages[0].role === 'system';
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  if (companionChat && lastUser) {
    const extra = [];
    const rag = searchKnowledge(lastUser.content, 3, 1);
    if (rag) {
      extra.push(
        'VERIFIED NASA/CSA KNOWLEDGE BASE (from the habitat server; prefer it for astronaut-health questions and cite the section in brackets, e.g. [NASA HRP] or [CSA]):\n' + rag
      );
    }
    try {
      const [readingRes, alertRes] = await withTimeout(
        Promise.all([
          pool.query('SELECT * FROM sensor_readings WHERE astronaut_id = $1 ORDER BY recorded_at DESC LIMIT 1', [astronautId]),
          pool.query(
            `SELECT p.title, p.severity, p.action_steps FROM alerts a JOIN protocols p ON a.protocol_id = p.id
             WHERE a.astronaut_id = $1 AND a.status = 'ACTIVE' ORDER BY a.triggered_at DESC LIMIT 1`,
            [astronautId]
          )
        ]),
        1500
      );
      const r = readingRes.rows[0];
      const a = alertRes.rows[0];
      if (r || a) {
        extra.push(
          'HABITAT DATABASE (latest stored reading; separate from the simulated twin in LIVE STATE): ' +
            (r
              ? `rate ${r.radiation_rate_usv_hr} uSv/hr, cumulative ${r.cumulative_dose_msv} mSv, heart rate ${r.heart_rate_bpm} bpm, source ${r.data_source}, NOAA S${r.noaa_s_scale ?? 0}, at ${new Date(r.recorded_at).toISOString()}. `
              : '') +
            (a ? `Active habitat alert: ${a.title} (${a.severity}). Steps: ${a.action_steps}` : 'No active habitat alert.')
        );
      }
    } catch { /* database optional for chat */ }
    if (extra.length) {
      messages = [{ role: 'system', content: messages[0].content + '\n' + extra.join('\n') }, ...messages.slice(1)];
    }
  }

  const apiKey = novaSessionKey || (managed ? ai.key : null);
  if (managed && !apiKey) {
    return res.json({ ok: false, error: `No ${ai.name} API key: add it to Backend/server/.env and restart the server` });
  }
  const result = await novaChat(
    managed
      ? { endpoint, models: ai.models, messages, tools: body.tools, ...ai.extra }
      : { endpoint, model: String(body.model || '').trim(), messages, tools: body.tools },
    apiKey
  );

  if (result.ok && companionChat && lastUser) {
    try {
      await withTimeout(
        (async () => {
          await pool.query(`INSERT INTO ai_chat_logs (astronaut_id, sender, message) VALUES ($1, 'ASTRONAUT', $2)`, [astronautId, lastUser.content.slice(0, 4000)]);
          const reply = result.text || (result.toolCalls || []).map((c) => `[tool ${c.name}]`).join(' ');
          if (reply) await pool.query(`INSERT INTO ai_chat_logs (astronaut_id, sender, message) VALUES ($1, 'AI', $2)`, [astronautId, reply.slice(0, 4000)]);
        })(),
        2000
      );
    } catch { /* logging is best-effort */ }
  }

  res.json(result);
});

// 10. SPACE WEATHER for the Data & Validation panel (same record shape as the desktop shell).
//     refresh=0 -> cached/bundled only (no network). refresh=1 -> fetch NOAA now, cache it, log it to the database.
app.get('/api/space-weather', async (req, res) => {
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
  const astronautId = parseInt(req.query.astronautId, 10) || 1;
  const cache = swxCache.read();
  if (!refresh) {
    return res.json(cache ? { ...cache, kind: 'cache' } : { ...swx.BUNDLED });
  }
  try {
    const live = await swx.fetchLive();
    const rec = { ...live, kind: 'live', fetchedAt: new Date().toISOString() };
    swxCache.write(rec);
    storeNoaaReading(astronautId, rec).catch((err) => console.warn('NOAA reading not stored:', err.message));
    res.json(rec);
  } catch (e) {
    const err = String((e && e.message) || e);
    res.json(cache ? { ...cache, kind: 'cache', error: err } : { ...swx.BUNDLED, error: err });
  }
});

// 11. FRONTEND: the RCPT single-page app.
app.get('/favicon.ico', (req, res) => res.status(204).end()); // the page uses an inline SVG logo
app.use(
  express.static(FRONTEND_DIR, {
    index: 'index.html',
    setHeaders: (res, filePath) => {
      if (/\.(html|js)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

app.listen(PORT, () => {
  console.log(`Space Health Backend running on http://localhost:${PORT}`);
  console.log(`RCPT dashboard: open http://localhost:${PORT}/ in your browser`);
  if (!fs.existsSync(path.join(FRONTEND_DIR, 'index.html'))) {
    console.warn(`Frontend not found at ${FRONTEND_DIR}`);
  }
});
