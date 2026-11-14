// Direct NVIDIA NIM call (no server, no nova.js) to separate provider latency from code changes.
try { process.loadEnvFile('.env'); } catch { /* run from Backend/server */ }
const t0 = Date.now();
const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), 150000);
try {
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    signal: ac.signal,
    headers: { authorization: 'Bearer ' + process.env.NVIDIA_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ model: process.env.NVIDIA_MODEL, messages: [{ role: 'user', content: 'Reply with the single word: ready' }], max_tokens: 700, stream: false })
  });
  const t = await r.text();
  console.log('direct NVIDIA:', r.status, Date.now() - t0, 'ms', t.slice(0, 160).replace(/\s+/g, ' '));
} catch (e) {
  console.log('direct NVIDIA error after', Date.now() - t0, 'ms:', e.name, e.message);
} finally {
  clearTimeout(timer);
}
