// Smoke-test the RCPT backend routes used by the new frontend.
const B = process.env.RCPT_URL || 'http://localhost:5000';
const ORIGIN = B;
const out = [];
const log = (name, ok, info) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  - ' + info : ''}`);

async function j(path, opt = {}) {
  const res = await fetch(B + path, opt);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, text, headers: res.headers };
}

try {
  const home = await j('/');
  log('GET / serves RCPT index.html', home.status === 200 && home.text.includes('Radiation-Coupled Physiological Twin') && home.text.includes('rcpt-backend.js'), `${home.status}, ${home.text.length} chars`);

  const br = await j('/rcpt-backend.js');
  log('GET /rcpt-backend.js', br.status === 200 && br.text.includes('window.novaBridge'), `${br.status} ${br.headers.get('content-type')}`);

  const boot = await j('/api/bootstrap.js');
  const bootOk = boot.status === 200 && /^window\.RCPT_BACKEND=/.test(boot.text);
  let bootObj = null;
  if (bootOk) bootObj = JSON.parse(boot.text.replace(/^window\.RCPT_BACKEND=/, '').replace(/;$/, ''));
  log('GET /api/bootstrap.js', bootOk && bootObj.db === true, bootObj ? `astronaut=${bootObj.astronaut && bootObj.astronaut.full_name}, crew=${bootObj.crew.length}, ai=${bootObj.ai.available}` : boot.text.slice(0, 120));
  log('bootstrap does not leak API key', !/nvapi-|Bearer/i.test(boot.text));

  const sw0 = await j('/api/space-weather?refresh=0');
  log('GET /api/space-weather?refresh=0', sw0.status === 200 && ['bundled', 'cache'].includes(sw0.body.kind), `kind=${sw0.body.kind}`);

  const sw1 = await j('/api/space-weather?refresh=1');
  const s = sw1.body || {};
  log('GET /api/space-weather?refresh=1 (NOAA live)', sw1.status === 200 && s.kind === 'live' && Number.isFinite(s.flux10) && Array.isArray(s.series),
    `kind=${s.kind} flux10=${s.flux10} S${s.sScale} max24=S${s.sScaleMax24} dose=${s.assumedDose} series=${s.series && s.series.length} ${s.error || ''}`);

  const key = await j('/api/nova/key', { headers: { origin: ORIGIN } });
  log('GET /api/nova/key', key.status === 200 && typeof key.body.has === 'boolean', JSON.stringify(key.body));

  const evil = await j('/api/nova/chat', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ endpoint: 'https://evil.example/v1', messages: [{ role: 'user', content: 'hi' }] })
  });
  log('POST /api/nova/chat rejects foreign Origin', evil.status === 403, `${evil.status}`);

  const t0 = Date.now();
  const chat = await j('/api/nova/chat', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({
      endpoint: bootObj ? bootObj.ai.endpoint : 'https://integrate.api.nvidia.com/v1/chat/completions',
      model: bootObj ? bootObj.ai.model : '',
      messages: [{ role: 'user', content: 'Reply with the single word: ready' }], tools: []
    })
  });
  log('POST /api/nova/chat (NVIDIA NIM test)', chat.status === 200 && chat.body.ok === true && !!chat.body.text,
    `${Date.now() - t0} ms, ${JSON.stringify(chat.body).slice(0, 160)}`);

  const dash = await j('/api/dashboard/1');
  log('GET /api/dashboard/1', dash.status === 200 && dash.body.astronaut, `latest=${dash.body.latestReading && dash.body.latestReading.data_source} alerts=${(dash.body.activeAlerts || []).length} chat=${(dash.body.chatHistory || []).length}`);
} catch (e) {
  log('unexpected error', false, e.message);
}
console.log(out.join('\n'));
