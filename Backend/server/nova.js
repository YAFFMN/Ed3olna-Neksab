// Backend/server/nova.js
// AI for the RCPT companion ("Nova") and the alert messages.
// Talks to any OpenAI-compatible /chat/completions endpoint and returns { ok, text, toolCalls, model }
// or { ok:false, error } (same contract as the desktop shell's lib/chat.js).
//
// Providers configured from .env:
//   Google Gemini (default when GOOGLE_API_KEY is set)
//     GOOGLE_API_KEY=...            (GEMINI_API_KEY also accepted)
//     GOOGLE_MODEL=gemini-3.5-flash-lite
//     GOOGLE_REASONING_EFFORT=low   (minimal | low | medium | high; empty = model default)
//   NVIDIA NIM (previous provider)
//     NVIDIA_API_KEY=...  NVIDIA_MODEL=google/gemma-4-31b-it
//   AI_PROVIDER=google | nvidia     (optional; forces a provider)
// API keys stay in this process. They are never sent to the browser.

export const GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
export const NIM_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

const PROVIDERS = {
  google: {
    name: 'Google Gemini',
    endpoint: GOOGLE_ENDPOINT,
    keyEnv: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
    modelEnv: 'GOOGLE_MODEL',
    defaultModel: 'gemini-3.5-flash-lite',
    // Tried in order if the configured model is unavailable for this key (404) or out of quota (429).
    fallbackModels: ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3-flash-preview']
  },
  nvidia: {
    name: 'NVIDIA NIM',
    endpoint: NIM_ENDPOINT,
    keyEnv: ['NVIDIA_API_KEY'],
    modelEnv: 'NVIDIA_MODEL',
    defaultModel: 'google/gemma-4-31b-it',
    fallbackModels: []
  }
};

const envVal = (k) => (process.env[k] || '').trim();
const providerKey = (p) => p.keyEnv.map(envVal).find(Boolean) || null;

// Active provider, read from .env on every call (so editing .env + restart is all that is needed).
export function activeProvider() {
  const wanted = envVal('AI_PROVIDER').toLowerCase();
  let id = PROVIDERS[wanted] ? wanted : null;
  if (!id) id = providerKey(PROVIDERS.google) ? 'google' : providerKey(PROVIDERS.nvidia) ? 'nvidia' : 'google';
  const p = PROVIDERS[id];
  const model = envVal(p.modelEnv) || p.defaultModel;
  const extra = {};
  if (id === 'google') {
    const effort = process.env.GOOGLE_REASONING_EFFORT === undefined ? 'low' : envVal('GOOGLE_REASONING_EFFORT');
    if (effort) extra.reasoning_effort = effort;
  } else {
    extra.max_tokens = 700;
  }
  return {
    id,
    name: p.name,
    endpoint: p.endpoint,
    key: providerKey(p),
    model,
    models: [model, ...p.fallbackModels.filter((m) => m !== model)],
    extra
  };
}

export function validEndpoint(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'http:' || x.protocol === 'https:';
  } catch {
    return false;
  }
}

// Endpoints the server manages itself (key + model come from .env, not from the browser).
export function isManagedEndpoint(u) {
  if (!u) return true;
  try {
    const h = new URL(u).hostname;
    return h === 'integrate.api.nvidia.com' || h === 'generativelanguage.googleapis.com';
  } catch {
    return false;
  }
}

function cleanReply(text) {
  // Some Gemma builds prefix a reasoning channel marker; strip it.
  return String(text || '').replace(/^<\|channel>thought\s*/i, '').trim();
}

async function postOnce(endpoint, body, apiKey, timeoutMs) {
  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  if (apiKey) headers.authorization = 'Bearer ' + apiKey;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

async function errorText(res) {
  try { return (await res.text()).slice(0, 400); } catch { return ''; }
}

function shortError(text) {
  // Google returns [{ error: { message } }] or { error: { message } }; keep it readable.
  try {
    const j = JSON.parse(text);
    const e = Array.isArray(j) ? j[0] && j[0].error : j.error;
    if (e && e.message) return String(e.message).slice(0, 200);
  } catch { /* not JSON */ }
  return text.slice(0, 160);
}

// Last model that worked per endpoint, so fallbacks are not retried on every message.
const workingModel = new Map();

// req: { endpoint, model | models[], messages, tools?, max_tokens?, temperature?, reasoning_effort? }
export async function chat(req, apiKey, timeoutMs = 90000) {
  try {
    if (!req || !validEndpoint(req.endpoint)) return { ok: false, error: 'Invalid endpoint URL' };
    if (!Array.isArray(req.messages) || !req.messages.length) return { ok: false, error: 'No messages' };

    let models = (Array.isArray(req.models) && req.models.length ? req.models : [req.model]).map((m) => String(m || ''));
    const remembered = workingModel.get(req.endpoint);
    if (remembered && models.includes(remembered)) models = [remembered, ...models.filter((m) => m !== remembered)];

    const withTools = Array.isArray(req.tools) && req.tools.length > 0;
    let lastError = 'No response';

    for (const model of models) {
      const body = { model, messages: req.messages, stream: false };
      if (Number.isFinite(+req.max_tokens)) body.max_tokens = +req.max_tokens;
      if (Number.isFinite(+req.temperature)) body.temperature = +req.temperature;
      if (req.reasoning_effort) body.reasoning_effort = String(req.reasoning_effort);
      if (withTools) body.tools = req.tools;

      let res = await postOnce(req.endpoint, body, apiKey, timeoutMs);
      let errText = res.ok ? '' : await errorText(res);

      // Model rejects the thinking setting: retry once without it.
      if (!res.ok && res.status === 400 && body.reasoning_effort && /reasoning|thinking/i.test(errText)) {
        delete body.reasoning_effort;
        res = await postOnce(req.endpoint, body, apiKey, timeoutMs);
        errText = res.ok ? '' : await errorText(res);
      }
      // Model rejects the `tools` field: retry once without it so chat still works.
      if (!res.ok && withTools && res.status >= 400 && res.status < 500 && ![401, 403, 404, 429].includes(res.status)) {
        delete body.tools;
        res = await postOnce(req.endpoint, body, apiKey, timeoutMs);
        errText = res.ok ? '' : await errorText(res);
      }

      if (res.ok) {
        const j = await res.json();
        const m = j && j.choices && j.choices[0] && j.choices[0].message;
        if (!m) return { ok: false, error: 'Unexpected response format' };
        const toolCalls = (m.tool_calls || [])
          .map((c) => {
            let args = {};
            const raw = c.function && c.function.arguments;
            try { args = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {}); } catch { /* ignore */ }
            return { name: c.function && c.function.name, args };
          })
          .filter((c) => c.name);
        workingModel.set(req.endpoint, model);
        return { ok: true, text: typeof m.content === 'string' ? cleanReply(m.content) : '', toolCalls, model };
      }

      lastError = 'HTTP ' + res.status + (errText ? ' ' + shortError(errText) : '') + (models.length > 1 ? ` (model ${model})` : '');
      const modelProblem =
        res.status === 404 ||
        res.status === 429 ||
        (res.status === 400 && /model/i.test(errText) && /not found|not supported|unsupported|invalid|unknown/i.test(errText));
      if (!modelProblem) break; // bad key, bad request, server error: other models will fail the same way
    }
    return { ok: false, error: lastError };
  } catch (e) {
    return { ok: false, error: e && e.name === 'AbortError' ? 'Timed out' : String((e && e.message) || e) };
  }
}
