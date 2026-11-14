/* Ground Communications Link (v1.5): Earth-Mars light time from real orbital geometry, link up/down, autonomous Nova mode,
   store-and-forward queue and a message-delay simulator. Positions use the JPL "Keplerian elements for approximate positions"
   (valid 1800-2050, planetary position errors of a few arc-minutes). Everything else (ground response time, the 3 degree
   conjunction blackout cone, queue behaviour) is an ASSUMPTION and is labelled as such in the UI. */
(function () {
  'use strict';
  var U = window.RCPTUI, esc = U.esc, RC = window.RCPT;
  var L = function (k, p) { return window.V15 ? window.V15.L(k, p) : k; };
  var $ = function (i) { return document.getElementById(i); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var RAD = Math.PI / 180, AU_S = 499.004784, AU_KM = 149597870.7;
  var BLACKOUT_DEG = 3;           // ASSUMED solar-conjunction communication blackout cone (Sun-Earth-Mars angle)
  var GROUND_REVIEW_MIN = 5;      // ASSUMED time Mission Control needs to read a query and answer

  /* ---------- orbital geometry ---------- */
  var EL = {
    E: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], O: [0, 0] },
    M: { a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], w: [-23.94362959, 0.44441088], O: [49.55953891, -0.29257343] }
  };
  function helio(p, T) {
    var el = {}; ['a', 'e', 'I', 'L', 'w', 'O'].forEach(function (k) { el[k] = p[k][0] + p[k][1] * T; });
    var om = (el.w - el.O) * RAD, Om = el.O * RAD, I = el.I * RAD, e = el.e;
    var M = (((el.L - el.w) % 360) + 540) % 360 - 180; M *= RAD;
    var E = M + e * Math.sin(M); for (var i = 0; i < 12; i++) E = M + e * Math.sin(E);
    var xp = el.a * (Math.cos(E) - e), yp = el.a * Math.sqrt(1 - e * e) * Math.sin(E);
    var cw = Math.cos(om), sw = Math.sin(om), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
    return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp, (sw * sI) * xp + (cw * sI) * yp];
  }
  function jd(date) { return date.getTime() / 86400000 + 2440587.5; }
  function geometry(date) {
    date = date || new Date();
    var T = (jd(date) - 2451545.0) / 36525, E = helio(EL.E, T), M = helio(EL.M, T);
    var v = [M[0] - E[0], M[1] - E[1], M[2] - E[2]], dist = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    var sun = [-E[0], -E[1], -E[2]], dot = (v[0] * sun[0] + v[1] * sun[1] + v[2] * sun[2]) / (dist * Math.sqrt(sun[0] * sun[0] + sun[1] * sun[1] + sun[2] * sun[2]));
    var sep = Math.acos(Math.max(-1, Math.min(1, dot))) / RAD;
    return { date: date, au: dist, km: dist * AU_KM, sec: dist * AU_S, sep: sep, conj: sep < BLACKOUT_DEG };
  }
  var mmss = function (s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  var iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var parseISO = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : null; };

  /* ---------- state ---------- */
  var st = lsGet('rcpt.link', { mode: 'auto', date: null });
  if (!st || typeof st !== 'object') st = { mode: 'auto', date: null };
  var queue = lsGet('rcpt.link.q', []); if (!Array.isArray(queue)) queue = [];
  var sent = [], flights = [];
  function save() { lsSet('rcpt.link', st); lsSet('rcpt.link.q', queue.slice(0, 50)); }
  function curDate() { return st.date ? (parseISO(st.date) || new Date()) : new Date(); }
  function geo() { return geometry(curDate()); }
  function linkUp() { var g = geo(); return st.mode === 'up' ? true : st.mode === 'down' ? false : !g.conj; }
  function autonomous() { return !linkUp(); }
  var prevAuto = null;

  function log(text, src) {
    if (!text) return;
    queue.unshift({ ts: Date.now(), text: String(text).slice(0, 240), src: src || 'manual' }); queue = queue.slice(0, 50); save();
    if (panelEl) renderTab(panelEl);
  }

  /* ---------- dashboard widget ---------- */
  function widgetHTML() {
    return '<div class="lk-h"><span class="lk-t" id="lkT"></span><span class="lk-led" id="lkLed"></span><span class="lk-st" id="lkSt"></span></div>' +
      '<div class="lk-row"><div><span class="lk-s" id="lkS1"></span><b id="latT">22:00</b></div><div><span class="lk-s" id="lkS2"></span><span class="lk-v" id="lkRtt"></span></div><div><span class="lk-s" id="lkS3"></span><span class="lk-v" id="lkDist"></span></div></div>' +
      '<span class="sub" id="latS"></span><div class="nogr" id="lkNogr"></div>' +
      '<div class="lk-seg" role="radiogroup" id="lkSeg"><button type="button" role="radio" data-lk="auto" id="lkMode-auto"></button><button type="button" role="radio" data-lk="up" id="lkMode-up"></button><button type="button" role="radio" data-lk="down" id="lkMode-down"></button></div>' +
      '<div class="lk-nova" id="lkNova" role="status"></div>' +
      '<div class="lk-act"><label class="lk-s" for="lkDate" id="lkDl"></label><input type="date" id="lkDate"><button type="button" class="tb" id="lkToday"></button><button type="button" class="tb" id="lkMore"></button></div>';
  }
  function wrap() {
    var w = $('lat'); if (!w || w.getAttribute('data-lk')) return; w.setAttribute('data-lk', '1'); w.innerHTML = widgetHTML();
    w.querySelector('#lkSeg').addEventListener('click', function (e) { var b = e.target.closest('button[data-lk]'); if (b) setMode(b.getAttribute('data-lk')); });
    w.querySelector('#lkDate').addEventListener('change', function () { st.date = this.value || null; save(); refresh(); });
    w.querySelector('#lkToday').addEventListener('click', function () { st.date = null; save(); refresh(); });
    w.querySelector('#lkMore').addEventListener('click', function () { if (window.RCPTScience) window.RCPTScience.open('link'); });
  }
  function setMode(m) {
    if (['auto', 'up', 'down'].indexOf(m) < 0) return false; st.mode = m; save(); refresh(); return true;
  }
  function refresh() {
    var w = $('lat'); if (!w) return; wrap();
    var g = geo(), up = linkUp(), au = !up, dem = w.classList.contains('demo');
    w.classList.toggle('lk-down', au);
    $('lkT').textContent = L('lk_title'); $('lkS1').textContent = L('lk_oneway'); $('lkS2').textContent = L('lk_rtt'); $('lkS3').textContent = L('lk_dist');
    if (!dem) $('latT').textContent = mmss(g.sec);
    $('lkRtt').textContent = mmss(g.sec * 2); $('lkDist').textContent = g.au.toFixed(2) + ' AU';
    $('lkLed').className = 'lk-led ' + (up ? 'up' : 'down'); $('lkLed').setAttribute('data-s', up ? 'up' : 'down');
    $('lkSt').textContent = up ? L('lk_up') : (st.mode === 'auto' && g.conj ? L('lk_conj') : L('lk_down'));
    $('latS').textContent = au ? L('lk_sub_down') : L('lk_sub_up', { m: mmss(g.sec * 2) });
    var ng = $('lkNogr'); ng.textContent = L('lk_ok'); ng.style.display = dem ? 'block' : 'none';
    [['auto', 'lk_m_auto'], ['up', 'lk_m_up'], ['down', 'lk_m_down']].forEach(function (p) { var b = $('lkMode-' + p[0]); b.textContent = L(p[1]); b.setAttribute('aria-checked', String(st.mode === p[0])); b.classList.toggle('on', st.mode === p[0]); });
    var nv = $('lkNova'); nv.className = 'lk-nova ' + (au ? 'auto' : 'asst'); nv.textContent = au ? L('lk_nova_auto') : L('lk_nova_asst');
    $('lkDl').textContent = L('lk_date'); $('lkToday').textContent = L('lk_today'); $('lkMore').textContent = L('lk_details');
    var di = $('lkDate'); if (di.value !== iso(curDate())) di.value = iso(curDate());
    if (prevAuto !== null && prevAuto !== au) {
      document.dispatchEvent(new CustomEvent('rcpt:link', { detail: { autonomous: au } }));
      if (window.NovaAPI) window.NovaAPI.say(au ? L('lk_say_down') : L('lk_say_up', { n: queue.length }), { mood: au ? 'alert' : 'happy' });
      if (au) { flights.forEach(function (f) { if (!f.done) { f.done = true; f.lost = true; queue.unshift({ ts: Date.now(), text: f.text + ' (interrupted)', src: 'manual' }); } }); save(); }
    }
    prevAuto = au;
    if (panelEl) renderTab(panelEl);
  }

  /* protocol card: add the autonomy line (the dashboard rebuilds #proto on every update) */
  RC.onUpdate(function (s) {
    if (autonomous()) { var pe = $('proto'); if (pe && !pe.querySelector('.lk-aut')) { var ul = pe.querySelector('ul'); if (ul) ul.insertAdjacentHTML('beforeend', '<li class="lk-aut">' + esc(L('lk_proto_aut')) + '</li>'); } }
    if (lastTier !== null && s.tier !== lastTier && (s.tier === 'elevated' || s.tier === 'emergency') && autonomous()) log(L('lk_q_tier', { t: s.tier, r: s.R.toFixed(1), d: s.d.toFixed(1) }), 'tier');
    lastTier = s.tier;
  });
  var lastTier = null;

  /* ---------- detailed tab ---------- */
  var panelEl = null;
  function chartSVG(g) {
    var d0 = curDate(), n = 220, step = 5, pts = [], mx = 0, mn = 1e9, conj = [];
    for (var i = 0; i < n; i++) { var dt = new Date(d0.getTime() + (i - n / 2) * step * 86400000), gg = geometry(dt); pts.push([dt, gg.sec / 60, gg.conj]); }
    var W = 700, H = 200, pl = 36, pr = 8, pt = 10, pb = 22, x = function (i) { return pl + (W - pl - pr) * i / (n - 1); }, y = function (m) { return pt + (H - pt - pb) * (1 - m / 24); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(L('lk_chart_alt')) + '">';
    [0, 6, 12, 18, 24].forEach(function (m) { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(m) + '" y2="' + y(m) + '" stroke="#1d2b3d"/><text x="' + (pl - 5) + '" y="' + (y(m) + 3) + '" text-anchor="end">' + m + '</text>'; });
    var run = null; pts.forEach(function (p, i) { if (p[2]) { if (run === null) run = i; } else if (run !== null) { s += '<rect x="' + x(run) + '" y="' + pt + '" width="' + Math.max(2, x(i) - x(run)) + '" height="' + (H - pt - pb) + '" fill="rgba(255,93,77,.22)"/>'; run = null; } });
    if (run !== null) s += '<rect x="' + x(run) + '" y="' + pt + '" width="' + (x(n - 1) - x(run)) + '" height="' + (H - pt - pb) + '" fill="rgba(255,93,77,.22)"/>';
    s += '<polyline fill="none" stroke="#17a9f0" stroke-width="2" points="' + pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p[1]).toFixed(1); }).join(' ') + '"/>';
    s += '<line x1="' + x(n / 2) + '" x2="' + x(n / 2) + '" y1="' + pt + '" y2="' + (H - pb) + '" stroke="#ffd54a" stroke-dasharray="4 3"/><circle cx="' + x(n / 2) + '" cy="' + y(g.sec / 60) + '" r="4.5" fill="#ffd54a"/>';
    [0, 55, 110, 165, 219].forEach(function (i) { var dt = pts[i][0]; s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + dt.getUTCFullYear() + '-' + ('0' + (dt.getUTCMonth() + 1)).slice(-2) + '</text>'; });
    return s + '</svg>';
  }
  function renderTab(el) {
    panelEl = el; if (!el.isConnected) { panelEl = null; return; }
    var g = geo(), up = linkUp(), s = RC.getState();
    var h = '<h3>' + esc(L('lk_title')) + ' <button type="button" class="exb" data-explain="v15_link" aria-label="?">?</button> <span class="badge2 ' + (up ? 'bd-pass' : 'bd-warn') + '" id="lkTabSt">' + esc(up ? L('lk_up') : (st.mode === 'auto' && g.conj ? L('lk_conj') : L('lk_down'))) + '</span></h3>' +
      '<p>' + esc(L('lk_intro')) + '</p>' +
      '<div class="kv"><div><b>' + mmss(g.sec) + '</b><span>' + esc(L('lk_oneway')) + '</span></div><div><b>' + mmss(g.sec * 2) + '</b><span>' + esc(L('lk_rtt')) + '</span></div><div><b>' + g.au.toFixed(3) + ' AU</b><span>' + esc(L('lk_dist')) + ' (' + Math.round(g.km / 1e6) + ' ' + esc(L('lk_mkm')) + ')</span></div><div><b>' + g.sep.toFixed(1) + '°</b><span>' + esc(L('lk_sep')) + '</span></div></div>' +
      '<div class="row"><span class="fine">' + esc(L('lk_modeh')) + '</span><button type="button" class="b' + (st.mode === 'auto' ? ' go' : '') + '" data-lkm="auto">' + esc(L('lk_m_auto')) + '</button><button type="button" class="b' + (st.mode === 'up' ? ' go' : '') + '" data-lkm="up">' + esc(L('lk_m_up')) + '</button><button type="button" class="b' + (st.mode === 'down' ? ' go' : '') + '" data-lkm="down">' + esc(L('lk_m_down')) + '</button>' +
      '<label class="fine" for="lkDate2">' + esc(L('lk_date')) + '</label><input type="date" id="lkDate2" value="' + iso(curDate()) + '"><button type="button" class="b" id="lkNow">' + esc(L('lk_today')) + '</button><button type="button" class="b" id="lkNear">' + esc(L('lk_near')) + '</button><button type="button" class="b" id="lkFar">' + esc(L('lk_far')) + '</button></div>' +
      '<h4>' + esc(L('lk_chart_h')) + '</h4><div class="card">' + chartSVG(g) + '<p class="fine">' + esc(L('lk_chart_n')) + '</p></div>' +
      '<div class="card ' + (up ? '' : 'lk-card-aut') + '"><h4 style="margin-top:0">' + esc(up ? L('lk_asst_h') : L('lk_aut_h')) + '</h4>' +
      '<p>' + esc(up ? L('lk_asst_p', { m: mmss(g.sec * 2), r: GROUND_REVIEW_MIN }) : L('lk_aut_p')) + '</p>' +
      (s ? '<ul>' + (s.actions || []).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
      (up ? '' : '<p class="fine">' + esc(L('lk_aut_esc')) + '</p>') + '</div>' +
      '<h4>' + esc(L('lk_sim_h')) + '</h4><div class="card"><div class="row"><select id="lkMsg" aria-label="' + esc(L('lk_msg')) + '"><option value="query">' + esc(L('lk_msg_q')) + '</option><option value="report">' + esc(L('lk_msg_r')) + '</option><option value="tele">' + esc(L('lk_msg_t')) + '</option></select><button type="button" class="b go" id="lkSend">' + esc(L('lk_send')) + '</button><span class="fine">' + esc(L('lk_speed')) + '</span></div><div id="lkFlights">' + flightsHTML() + '</div><p class="fine">' + esc(L('lk_sim_n', { r: GROUND_REVIEW_MIN })) + '</p></div>' +
      '<h4>' + esc(L('lk_q_h')) + ' (' + queue.length + ')</h4><div class="card"><div class="row"><button type="button" class="b" id="lkFlush"' + (up && queue.length ? '' : ' disabled') + '>' + esc(L('lk_flush')) + '</button><button type="button" class="b red" id="lkClr"' + (queue.length ? '' : ' disabled') + '>' + esc(L('clear', 'Clear')) + '</button></div>' +
      (queue.length ? '<table><thead><tr><th>' + esc(L('lk_when')) + '</th><th>' + esc(L('lk_what')) + '</th></tr></thead><tbody>' + queue.slice(0, 12).map(function (q) { return '<tr><td class="fine" style="white-space:nowrap">' + new Date(q.ts).toLocaleTimeString() + '</td><td>' + esc(q.text) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="fine">' + esc(L('lk_q_empty')) + '</p>') +
      '<p class="fine">' + esc(L('lk_q_n')) + '</p></div>' +
      '<p class="fine">' + esc(L('lk_src')) + '</p>';
    el.innerHTML = h;
    el.querySelectorAll('[data-lkm]').forEach(function (b) { b.onclick = function () { setMode(b.getAttribute('data-lkm')); }; });
    el.querySelector('#lkDate2').onchange = function () { st.date = this.value || null; save(); refresh(); };
    el.querySelector('#lkNow').onclick = function () { st.date = null; save(); refresh(); };
    el.querySelector('#lkNear').onclick = function () { st.date = iso(extreme(curDate(), true)); save(); refresh(); };
    el.querySelector('#lkFar').onclick = function () { st.date = iso(extreme(curDate(), false)); save(); refresh(); };
    el.querySelector('#lkSend').onclick = function () { send(el.querySelector('#lkMsg').value); };
    el.querySelector('#lkFlush').onclick = function () { flush(); };
    el.querySelector('#lkClr').onclick = function () { queue = []; save(); renderTab(el); };
  }
  /* next closest approach (min=true) or next solar conjunction (min=false) after the current date, scanning 5-day steps over 3 years */
  function extreme(d0, min) {
    var best = null, bd = null;
    for (var i = 0; i <= 220; i++) { var dt = new Date(d0.getTime() + i * 5 * 86400000), g = geometry(dt); var v = min ? g.au : -g.au; if (best === null || v < best) { best = v; bd = dt; } if (i > 40 && best !== null && ((min && g.au > best + 0.15) || (!min && -g.au > best + 0.15))) break; }
    return bd;
  }
  function flightsHTML() {
    if (!flights.length) return '<p class="fine">' + esc(L('lk_noflights')) + '</p>';
    return '<table><thead><tr><th>' + esc(L('lk_what')) + '</th><th>' + esc(L('lk_status')) + '</th><th></th></tr></thead><tbody>' + flights.slice(0, 5).map(function (f) {
      var p = Math.min(1, f.t / f.total);
      return '<tr><td>' + esc(f.text) + '</td><td>' + esc(f.lost ? L('lk_f_lost') : f.stage) + '</td><td style="min-width:140px"><div class="bar-in"><i style="width:' + Math.round(p * 100) + '%;background:' + (f.lost ? '#ff5d4d' : '#17a9f0') + '"></i></div></td></tr>';
    }).join('') + '</tbody></table>';
  }
  function send(kind) {
    var text = kind === 'query' ? L('lk_msg_q') : kind === 'report' ? L('lk_msg_r') : L('lk_msg_t');
    if (!linkUp()) { log(text, 'manual'); return; }
    var g = geo(), sec = g.sec / 60;   // minutes, 1 simulated minute = 1 real second
    var total = 2 * sec + GROUND_REVIEW_MIN;
    flights.unshift({ text: text, t: 0, total: total, oneway: sec, stage: L('lk_f_up'), done: false });
    flights = flights.slice(0, 6); if (!tm) tm = setInterval(tick, 250);
    if (panelEl) renderTab(panelEl);
  }
  var tm = null;
  function tick() {
    var any = false;
    flights.forEach(function (f) {
      if (f.done) return; f.t += 0.25; any = true;
      f.stage = f.t < f.oneway ? L('lk_f_up') : f.t < f.oneway + GROUND_REVIEW_MIN ? L('lk_f_gr') : f.t < f.total ? L('lk_f_dn') : L('lk_f_ok');
      if (f.t >= f.total) { f.done = true; f.stage = L('lk_f_ok'); if (window.NovaAPI) window.NovaAPI.say(L('lk_say_reply', { t: f.text }), { mood: 'happy' }); }
    });
    var box = panelEl && panelEl.querySelector('#lkFlights'); if (box) box.innerHTML = flightsHTML();
    if (!any) { clearInterval(tm); tm = null; }
  }
  function flush() {
    if (!linkUp() || !queue.length) return; var n = queue.length, g = geo();
    sent.unshift({ ts: Date.now(), n: n }); queue = []; save();
    if (window.NovaAPI) window.NovaAPI.say(L('lk_say_flush', { n: n, m: mmss(g.sec) }), { mood: 'happy' });
    if (panelEl) renderTab(panelEl);
  }

  document.addEventListener('rcpt:launch', function () { wrap(); refresh(); });
  document.addEventListener('rcpt:lang', refresh);
  setInterval(function () { var w = $('lat'); if (w && w.getAttribute('data-lk') && !st.date && !w.classList.contains('demo')) refresh(); }, 60000);
  document.addEventListener('DOMContentLoaded', function () { if ($('lat')) { wrap(); } });

  window.RCPTLink = {
    geometry: geometry, autonomous: autonomous, linkUp: linkUp, setMode: setMode, mode: function () { return st.mode; }, setDate: function (s) { st.date = s || null; save(); refresh(); },
    log: log, queue: function () { return queue.slice(); }, flush: flush, render: renderTab, refresh: refresh, send: send, flights: function () { return flights; },
    BLACKOUT_DEG: BLACKOUT_DEG, GROUND_REVIEW_MIN: GROUND_REVIEW_MIN, extreme: extreme, mmss: mmss
  };
})();
