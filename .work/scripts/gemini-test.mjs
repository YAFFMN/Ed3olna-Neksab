// Test the Google Gemini provider used by Nova.
// Run from Backend/server:  node ..\..\.work\scripts\gemini-test.mjs
// Uses GOOGLE_API_KEY from .env (or TEST_GOOGLE_KEY to try a key without saving it).
try { process.loadEnvFile('.env'); } catch { /* no .env in cwd */ }

const { chat, activeProvider, GOOGLE_ENDPOINT } = await import(
  'file:///C:/Users/Yassine/Desktop/Ed3olna%20Neksab/Backend/server/nova.js'
);

if (process.env.TEST_GOOGLE_KEY) process.env.GOOGLE_API_KEY = process.env.TEST_GOOGLE_KEY;
const ai = activeProvider();
console.log('provider:', ai.id, '| model:', ai.model, '| key:', ai.key ? `set (${ai.key.length} chars)` : 'MISSING');

const key = ai.id === 'google' ? ai.key : process.env.GOOGLE_API_KEY || 'no-key-configured';

// 1) Which models can this key use? (OpenAI-compatible /models)
try {
  const r = await fetch(GOOGLE_ENDPOINT.replace('/chat/completions', '/models'), { headers: { authorization: 'Bearer ' + key } });
  const t = await r.text();
  if (r.ok) {
    const ids = (JSON.parse(t).data || []).map((m) => String(m.id).replace(/^models\//, '')).filter((id) => /^gemini/.test(id));
    console.log('models available:', ids.length, ids.filter((id) => /flash|hydrogen|argon|carbon/.test(id)).slice(0, 25).join(', '));
  } else {
    console.log('models list: HTTP', r.status, t.slice(0, 200).replace(/\s+/g, ' '));
  }
} catch (e) {
  console.log('models list error:', e.message);
}

// 2) A real chat call through the same code path Nova uses.
const t0 = Date.now();
const res = await chat(
  {
    endpoint: GOOGLE_ENDPOINT,
    models: ai.id === 'google' ? ai.models : ['gemini-3.5-flash-lite'],
    messages: [
      { role: 'system', content: 'You are Nova, a calm crew companion. Use short sentences.' },
      { role: 'user', content: 'In one sentence: what is a solar particle event?' }
    ],
    reasoning_effort: 'low'
  },
  key,
  60000
);
console.log('chat:', Date.now() - t0, 'ms', JSON.stringify(res).slice(0, 400));
