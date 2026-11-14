/* Enhanced-mode LLM call. Runs in the Electron main process so the API key never reaches page code
   and the page CSP can stay closed (no network from the renderer). Pure Node: unit-testable. */
async function chat(req, key, fetchImpl) {
  const f = fetchImpl || fetch;
  let url;
  try { url = new URL(req.endpoint); } catch (e) { return { ok: false, error: 'Invalid endpoint URL' }; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, error: 'Endpoint must be http or https' };
  const messages = Array.isArray(req.messages) ? req.messages.slice(-14) : [];
  const body = { model: String(req.model || ''), messages, stream: false, temperature: 0.4, max_tokens: 300 };
  if (Array.isArray(req.tools) && req.tools.length) body.tools = req.tools;
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = 'Bearer ' + key;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);
  try {
    const res = await f(url.toString(), { method: 'POST', headers, body: JSON.stringify(body), signal: ac.signal });
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    const m = j && j.choices && j.choices[0] && j.choices[0].message;
    if (!m) return { ok: false, error: 'Unexpected response shape' };
    const toolCalls = [];
    (m.tool_calls || []).forEach((c) => {
      const fn = c && c.function; if (!fn || !fn.name) return;
      let args = fn.arguments;
      if (typeof args === 'string') { try { args = JSON.parse(args || '{}'); } catch (e) { args = {}; } }
      toolCalls.push({ name: fn.name, args: args || {} });
    });
    return { ok: true, text: typeof m.content === 'string' ? m.content : '', toolCalls };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Timed out' : 'Could not reach endpoint' };
  } finally { clearTimeout(timer); }
}
module.exports = { chat };
