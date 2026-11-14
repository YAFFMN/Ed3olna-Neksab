/* Data & Validation panel + "Explain this number" content.
   Everything numeric here is computed live from the same functions the app uses; published reference values are typed in once, with citations. */
(function () {
  'use strict';
  var U = window.RCPTUI, T = U.T, esc = U.esc, fmt = U.fmt, RC = window.RCPT;
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };

  /* ---------- published reference values (see Sources tab) ---------- */
  var REF = {
    surfaceGale: { v: 0.64, sd: 0.12, unit: 'mSv/day', src: 'Hassler et al. 2014, Science 343:1244797 (Curiosity RAD, GCR dose equivalent, ~300 sols from Aug 2012)' },
    annualGale: { v: 0.7, src: 'Guo et al. 2015, arXiv:1507.03473 (annual-average surface dose equivalent, quality factor 3.05)' },
    pressure: { p1: 700, p2: 970, dEq: 0.10, frac: 0.16, src: 'Guo et al. 2015: 700 to ~970 Pa changes the dose equivalent rate by about 0.1 mSv/day (about 16% of the annual average)' },
    cruise: { v: 1.84, unit: 'mSv/day', src: 'Zeitlin et al. 2013, Science 340:1080 (MSL RAD during cruise, inside the spacecraft)' },
    galeKm: -4.4
  };

  /* ---------- parameterised copy of the RCPT model, for sensitivity ---------- */
  var BASE = { wr: 0.40, wh: 0.35, ws: 0.25, g1: 0.05, g2: 0.03, k: 0.08 };
  var PNAME = { wr: 'Radiation weight (0.40)', wh: 'HRV weight (0.35)', ws: 'Sleep weight (0.25)', g1: 'Dose × sleep-debt coupling (0.05)', g2: 'Dose × HRV-strain coupling (0.03)', k: 'Radiation saturation rate (0.08)' };
  var PRESETS = [['Nominal Orbit', 0.5, 65, 1], ['Sleep Deprived + High Workload', 1.2, 38, 5.5], ['Acute SPE', 18.5, 42, 4]];
  function Mp(d, h, s, p) {
    var fr = 100 * (1 - Math.exp(-p.k * d)), fh = 100 * Math.max(0, (70 - h) / 70), fs = Math.min(100, 12.5 * s);
    return clamp(p.wr * fr + p.wh * fh + p.ws * fs + p.g1 * d * s + p.g2 * d * fh, 0, 100);
  }
  var tierOf = function (d, R) { return d >= 10 || R >= 70 ? 2 : R >= 35 ? 1 : 0; };
  var TN = ['nominal', 'elevated', 'emergency'];
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function selfCheck() {
    var worst = 0; for (var d = 0; d <= 50; d += 2.5) for (var h = 10; h <= 100; h += 10) for (var s = 0; s <= 10; s += 1) worst = Math.max(worst, Math.abs(Mp(d, h, s, BASE) - RC.M(d, h, s).R));
    return worst;
  }
  function sensitivity(span, N) {
    span = span || 0.25; N = N || 4000; var keys = Object.keys(BASE), out = { span: span, N: N, tornado: {}, mc: [] };
    PRESETS.forEach(function (pr, pi) {
      var base = Mp(pr[1], pr[2], pr[3], BASE), tor = keys.map(function (k) {
        var lo = Object.assign({}, BASE), hi = Object.assign({}, BASE); lo[k] *= 1 - span; hi[k] *= 1 + span;
        return { k: k, lo: Mp(pr[1], pr[2], pr[3], lo) - base, hi: Mp(pr[1], pr[2], pr[3], hi) - base };
      }).sort(function (a, b) { return Math.max(Math.abs(b.lo), Math.abs(b.hi)) - Math.max(Math.abs(a.lo), Math.abs(a.hi)); });
      out.tornado[pi] = { base: base, rows: tor };
      var r = rng(1000 + pi), vals = [], flips = 0, bt = tierOf(pr[1], base);
      for (var n = 0; n < N; n++) { var p = {}; keys.forEach(function (k) { p[k] = BASE[k] * (1 - span + 2 * span * r()); }); var R = Mp(pr[1], pr[2], pr[3], p); vals.push(R); if (tierOf(pr[1], R) !== bt) flips++; }
      vals.sort(function (a, b) { return a - b; });
      out.mc.push({ name: pr[0], base: base, p5: vals[Math.floor(0.05 * N)], p95: vals[Math.floor(0.95 * N)], flip: flips / N, tier: TN[bt] });
    });
    return out;
  }

  /* ---------- Mars dose validation (uses Orion's own physics) ---------- */
  function validation() {
    var M = window.Orion && window.Orion._debug && window.Orion._debug.model; if (!M) return null;
    var hOfP = function (P) { return -11.1 * Math.log(P / 610); };
    var gale = M.gcrDay(REF.galeKm), g1 = M.gcrDay(hOfP(REF.pressure.p1)), g2 = M.gcrDay(hOfP(REF.pressure.p2)), dModel = g1 - g2;
    var top = M.gcrDay(40);  // essentially no atmosphere overhead
    return {
      gale: gale, annualDiff: (gale - REF.annualGale.v) / REF.annualGale.v, withinSd: Math.abs(gale - REF.surfaceGale.v) <= REF.surfaceGale.sd,
      g1: g1, g2: g2, dModel: dModel, fracModel: dModel / ((g1 + g2) / 2), ratio: dModel / REF.pressure.dEq,
      top: top, cruiseEst: top * 2, cruiseRatio: top * 2 / REF.cruise.v
    };
  }

  /* ---------- explain content ---------- */
  function bulletList(a) { return '<ul>' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  var Explain = {
    build: function (topic) {
      var s = RC.getState(); if (!s) return null;
      var d = s.d, h = s.h, sl = s.s, E = {};
      var contrib = '<table><tr><th>' + 'Part' + '</th><th>Formula</th><th>Value</th></tr>' +
        '<tr><td>Radiation</td><td><code>0.40 × f_rad</code> = 0.40 × ' + fmt(s.fr) + '</td><td class="num">' + fmt(0.4 * s.fr) + '</td></tr>' +
        '<tr><td>HRV strain</td><td><code>0.35 × f_hrv</code> = 0.35 × ' + fmt(s.fh) + '</td><td class="num">' + fmt(0.35 * s.fh) + '</td></tr>' +
        '<tr><td>Sleep debt</td><td><code>0.25 × f_sleep</code> = 0.25 × ' + fmt(s.fs) + '</td><td class="num">' + fmt(0.25 * s.fs) + '</td></tr>' +
        '<tr><td>Interaction</td><td><code>0.05·d·s + 0.03·d·f_hrv</code></td><td class="num">' + fmt(s.it) + '</td></tr></table>';
      if (topic === 'R') E = { title: T('x_R', 'Multi-System Risk index (R_MRP)'), html: '<p>R is a single 0–100 number the app computes from three inputs: radiation dose rate, heart-rate variability (HRV) and sleep debt. It adds three weighted stress scores and a term for how they make each other worse.</p><div class="eq">R = clip( 0.40·f_rad + 0.35·f_hrv + 0.25·f_sleep + 0.05·d·s + 0.03·d·f_hrv , 0, 100 )</div><p>With your current inputs (dose <b>' + fmt(d) + '</b> mSv/hr, HRV <b>' + Math.round(h) + '</b> ms, sleep debt <b>' + fmt(sl) + '</b> h):</p>' + contrib + '<p>Total: <b>R = ' + fmt(s.R) + '</b> (tier: <b>' + s.tier + '</b>). Elevated starts at 35; emergency at 70, or whenever dose ≥ 10 mSv/hr.</p><p class="fine">The weights (0.40 / 0.35 / 0.25) and couplings are modelling assumptions chosen for this prototype. They have not been fitted to crew data. See Data &amp; Validation → Sensitivity for how much the result moves if they change.</p>' };
      else if (topic === 'rad' || topic === 'dose') E = { title: T('x_rad', 'Radiation: dose rate and its impact'), html: '<p>The dose rate is how fast the crew is absorbing radiation, in millisieverts per hour. It is an <b>input</b> you set (or a scenario sets); this app has no radiation sensor.</p><div class="eq">f_rad = 100 · (1 − e^(−0.08·d)) = 100 · (1 − e^(−0.08 × ' + fmt(d) + ')) = ' + fmt(s.fr) + '</div><p>The curve saturates: the first few mSv/hr matter a lot, and very high rates add less and less. Its contribution to R is 0.40 × ' + fmt(s.fr) + ' = <b>' + fmt(0.4 * s.fr) + '</b>.</p><p>For scale: Curiosity measured about 0.64 mSv/<i>day</i> on the Martian surface, which is ' + fmt(0.64 / 24, 3) + ' mSv/hr, and about 1.84 mSv/day on the way to Mars (' + fmt(1.84 / 24, 3) + ' mSv/hr). Your current setting is about <b>' + (d / (0.64 / 24) < 10 ? fmt(d / (0.64 / 24), 1) : Math.round(d / (0.64 / 24))) + '×</b> the measured Mars-surface rate. The 18.5 mSv/hr storm is a deliberate stress test, not a forecast.</p>' };
      else if (topic === 'hrv') E = { title: T('x_hrv', 'Heart-rate variability (HRV) and autonomic strain'), html: '<p>HRV is the small beat-to-beat variation in heart rate. Lower HRV is commonly used as a rough sign of physiological stress. Here it is a simulated input.</p><div class="eq">f_hrv = 100 · max(0, (70 − HRV) / 70) = 100 · max(0, (70 − ' + Math.round(h) + ') / 70) = ' + fmt(s.fh) + '</div><p>70 ms is the assumed "relaxed" reference: at or above it the strain score is 0, and it rises as HRV falls. Contribution to R: 0.35 × ' + fmt(s.fh) + ' = <b>' + fmt(0.35 * s.fh) + '</b>. It also feeds the interaction term (0.03·d·f_hrv = ' + fmt(s.it2) + ').</p><p class="fine">Real HRV differs a lot between people; a single reference value is a simplification.</p>' };
      else if (topic === 'sleep') E = { title: T('x_sleep', 'Sleep debt'), html: '<p>Sleep debt is the cumulative hours of sleep the crew member owes compared with what they need.</p><div class="eq">f_sleep = min(100, 12.5 · s) = min(100, 12.5 × ' + fmt(sl) + ') = ' + fmt(s.fs) + '</div><p>It reaches its maximum at 8 hours of debt. Contribution to R: 0.25 × ' + fmt(s.fs) + ' = <b>' + fmt(0.25 * s.fs) + '</b>. Sleep debt also multiplies the radiation term: 0.05 · d · s = 0.05 × ' + fmt(d) + ' × ' + fmt(sl) + ' = <b>' + fmt(s.it1) + '</b>.</p>' };
      else if (topic === 'inter' || topic === 'it') E = { title: T('x_int', 'Non-linear interaction'), html: '<p>The idea behind RCPT: radiation, poor sleep and low HRV are not just added up; together they are assumed to be worse than the sum. Two product terms capture that:</p><div class="eq">interaction = 0.05·d·s + 0.03·d·f_hrv<br>= 0.05 × ' + fmt(d) + ' × ' + fmt(sl) + ' + 0.03 × ' + fmt(d) + ' × ' + fmt(s.fh) + '<br>= ' + fmt(s.it1) + ' + ' + fmt(s.it2) + ' = ' + fmt(s.it) + '</div><p>Try it: in a storm (dose high), raise sleep debt and watch this bar grow while nothing else changes. At zero dose the interaction is exactly 0.</p><p class="fine">The coupling constants 0.05 and 0.03 are assumptions to illustrate the concept, not measured interaction effects.</p>' };
      else if (topic === 'ci') E = { title: T('x_ci', 'The interval around R'), html: '<p>The shaded band and the "CI" text show R − 4.2 to R + 4.8 (currently <b>' + fmt(s.lo) + '</b> to <b>' + fmt(s.hi) + '</b>).</p><p><b>Important:</b> this is a fixed display band. It is not recomputed from data and is not a statistical confidence interval. A real interval would need real data and an uncertainty model; the Sensitivity tab shows how R actually moves if the model\'s own weights are uncertain.</p>' };
      else if (topic === 'tier') E = { title: T('x_tier', 'Tiers: nominal, elevated, emergency'), html: bulletList(['<b>Nominal</b>: R below 35.', '<b>Elevated</b>: R from 35 up to 70.', '<b>Emergency</b>: R of 70 or more, <i>or</i> a dose rate of 10 mSv/hr or more regardless of R (a storm needs shelter even if the person feels fine).']) + '<p>You are currently <b>' + s.tier + '</b> (R = ' + fmt(s.R) + ', dose = ' + fmt(d) + ' mSv/hr). Thresholds are illustrative design choices.</p>' };
      else if (/^o_/.test(topic)) return orionExplain(topic);
      else return null;
      return E;
    }
  };
  function orionExplain(topic) {
    var O = window.Orion, c = O && O.current && O.current(), M = O && O._debug && O._debug.model; if (!c || !M) return { title: 'Orion', html: '<p>Select a place on the map first.</p>' };
    var e = c.e, col = M.column(e.h);
    if (topic === 'o_gcr') return { title: T('x_ogcr', 'Everyday radiation at this spot'), html: '<p>Galactic cosmic rays (fast particles from outside the solar system) hit Mars all the time. Mars has almost no magnetic field, so the only shielding is the thin atmosphere overhead, plus the planet itself blocking half the sky.</p><div class="eq">dose = 0.937 · (0.55 + 0.45·e^(−X/20))<br>X = air overhead = ' + fmt(col) + ' g/cm² (elevation ' + fmt(e.h) + ' km)<br>dose = <b>' + fmt(e.gcr, 2) + ' mSv/day</b></div><p>Lower ground has more air overhead, so a lower dose. The constant 0.937 was set so that Gale crater (−4.4 km) gives Curiosity\'s measured 0.64 mSv/day, so Gale is a calibration point, not a test. The 20 g/cm² attenuation length is a hand-chosen shape parameter. See Data &amp; Validation for how the model does on checks it was not tuned to.</p>' };
    if (topic === 'o_press') return { title: T('x_opress', 'Air pressure'), html: '<div class="eq">P = 610 · e^(−h / 11.1 km) = 610 · e^(−' + fmt(e.h) + ' / 11.1) = <b>' + Math.round(e.P) + ' Pa</b></div><p>610 Pa is the reference pressure and 11.1 km the scale height (the height over which pressure falls by a factor e). Earth\'s sea-level pressure is about 101,300 Pa, so this is about ' + fmt(e.P / 1013, 1) + '% of that. Real pressure also changes with season (a few tens of percent) and dust, which this simple formula ignores.</p>' };
    if (topic === 'o_col') return { title: T('x_ocol', 'Column density (air overhead)'), html: '<div class="eq">X = 16.4 · e^(−h / 11.1) = <b>' + fmt(col) + ' g/cm²</b></div><p>Think of it as the mass of all the air in a 1 cm² column above you. Earth\'s is about 1,000 g/cm². Mars\'s is roughly 60 times less, which is why Mars gives so little protection from cosmic rays.</p>' };
    if (topic === 'o_spe') return { title: T('x_ospe', 'Storm stress-test rate'), html: '<p>The dashboard\'s "Acute SPE" stress test uses 18.5 mSv/hr in open space. Here it is thinned by the atmosphere overhead:</p><div class="eq">rate = 18.5 · e^(−X/20) = 18.5 · e^(−' + fmt(col) + ' / 20) = <b>' + fmt(e.spe, 1) + ' mSv/hr</b></div><p>This is an assumed stress test used to rehearse decisions, <b>not a forecast and not a validated dose calculation</b>.</p>' };
    if (topic === 'o_budget') return { title: T('x_obud', 'The dose budget in the game'), html: '<p>The expedition game gives you a budget of <b>60 mSv</b> over the 30 sols. This number is an <b>assumption chosen for gameplay</b>, not an official limit. Going over costs score. Real agencies set career and mission limits using detailed risk models; this app does not.</p>' };
    return null;
  }
  window.RCPTExplain = Explain;

  /* ---------- Data & Validation panel ---------- */
  var swx = null, swxBusy = false;
  var bridge = function () { return window.novaBridge && window.novaBridge.spaceWeather ? window.novaBridge : null; };
  function ago(iso) { if (!iso) return ''; var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'just now' : m < 90 ? m + ' min ago' : m < 2880 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; }
  function loadSwx(refresh) {
    var b = bridge(); if (!b) { swx = null; return Promise.resolve(null); }
    return b.spaceWeather(!!refresh).then(function (r) { swx = r; document.dispatchEvent(new CustomEvent('rcpt:swx', { detail: r })); return r; }).catch(function (e) { swx = { kind: 'bundled', error: String(e && e.message || e) }; return swx; });
  }
  function spark(series) {
    if (!series || series.length < 2) return '<p class="fine">No time series available (bundled reference has a single point).</p>';
    var W = 560, H = 120, L = 40, mx = Math.max.apply(null, series.map(function (q) { return q[1]; })), lg = function (v) { return Math.log10(Math.max(v, 0.01)); }, lo = -1, hi = Math.max(1.2, Math.ceil(lg(mx)));
    var sx = function (i) { return L + i / (series.length - 1) * (W - L - 6); }, sy = function (v) { return H - 18 - (lg(v) - lo) / (hi - lo) * (H - 30); };
    var path = series.map(function (q, i) { return (i ? 'L' : 'M') + sx(i).toFixed(1) + ',' + sy(q[1]).toFixed(1); }).join('');
    var thr = '<line x1="' + L + '" x2="' + (W - 6) + '" y1="' + sy(10) + '" y2="' + sy(10) + '" stroke="#ffb224" stroke-dasharray="4 3"/><text x="' + (W - 8) + '" y="' + (sy(10) - 3) + '" text-anchor="end" style="fill:#ffb224">S1 = 10 pfu</text>';
    var ticks = [-1, 0, 1, 2, 3, 4].filter(function (e) { return e <= hi; }).map(function (e) { return '<text x="' + (L - 4) + '" y="' + (sy(Math.pow(10, e)) + 3) + '" text-anchor="end">' + Math.pow(10, e) + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Proton flux over the last 24 hours, log scale"><rect x="' + L + '" y="4" width="' + (W - L - 6) + '" height="' + (H - 22) + '" fill="#0a0f16"/>' + ticks + thr + '<path d="' + path + '" fill="none" stroke="#5cc8ff" stroke-width="1.6"/><text x="' + L + '" y="' + (H - 4) + '">' + esc(series[0][0].replace('T', ' ').slice(0, 16)) + ' UTC</text><text x="' + (W - 6) + '" y="' + (H - 4) + '" text-anchor="end">' + esc(series[series.length - 1][0].replace('T', ' ').slice(0, 16)) + ' UTC</text></svg>';
  }
  function tabSpace(el) {
    var b = bridge(), auto = false; try { auto = localStorage.getItem('rcpt.swx.auto') === '1'; } catch (e) { }
    function paint() {
      var r = swx, badge, cls;
      if (!b) { el.innerHTML = '<h3>' + T('tab_space', 'Space weather') + '</h3><p>The live NOAA feed is fetched by the desktop app. In this view there is no desktop bridge, so no live or cached data is available.</p>'; return; }
      if (!r) { el.innerHTML = '<p>Loading…</p>'; return; }
      cls = r.kind === 'live' ? 'bd-live' : r.kind === 'cache' ? 'bd-cache' : 'bd-bundled';
      badge = r.kind === 'live' ? 'LIVE · fetched ' + ago(r.fetchedAt) : r.kind === 'cache' ? 'CACHED · saved ' + ago(r.fetchedAt) : 'BUNDLED REFERENCE · not live';
      var sColor = r.sScale >= 3 ? 't-x' : r.sScale >= 1 ? 't-e' : 't-n';
      el.innerHTML = '<h3>' + T('tab_space', 'Space weather') + ' <span class="badge2 ' + cls + '" id="swBadge">' + esc(badge) + '</span></h3>' +
        '<p>Proton flux at ≥10 MeV from the NOAA Space Weather Prediction Center (GOES, public JSON). This is the quantity NOAA uses for its S-scale of solar radiation storms.</p>' +
        '<div class="kv"><div><b>' + fmt(r.flux10, r.flux10 < 10 ? 2 : 0) + ' pfu</b><span>≥10 MeV flux, latest</span></div><div><b class="' + sColor + '">S' + r.sScale + '</b><span>NOAA scale now (max 24 h: S' + r.sScaleMax24 + ')</span></div><div><b>' + fmt(r.flux10max24, r.flux10max24 < 10 ? 2 : 0) + '</b><span>≥10 MeV max, last 24 h</span></div><div><b>' + (r.flux100 != null ? fmt(r.flux100, 2) : 'n/a') + '</b><span>≥100 MeV, latest</span></div></div>' +
        '<p class="fine">Observed ' + esc((r.observedAt || '').replace('T', ' ').replace('Z', ' UTC')) + (r.satellite ? ' · GOES-' + r.satellite : '') + '. pfu = particles per cm² per second per steradian.</p>' + spark(r.series) +
        (r.error ? '<p class="t-e">Could not refresh (' + esc(r.error) + '). Showing ' + (r.kind === 'cache' ? 'the last saved copy.' : 'the bundled reference.') + '</p>' : '') +
        '<div class="card"><h4 style="margin-top:0">Use it as a simulated storm input <span class="badge2 bd-assumed">ASSUMED MAPPING</span></h4><p>Proton flux is not a crew dose rate. To let real conditions drive the demo, the app uses a transparent, <b>assumed</b> log-linear mapping: S1 (10 pfu) → 0.5 mSv/hr baseline, S4 (10,000 pfu) → 18.5 mSv/hr (the Acute SPE stress test). Right now that gives <b>' + fmt(r.assumedDose, 1) + ' mSv/hr</b>. It is not a dosimetry conversion.</p><button type="button" class="b go" id="swUse">Set dose rate to ' + fmt(r.assumedDose, 1) + ' mSv/hr</button></div>' +
        '<div class="row"><button type="button" class="b go" id="swFetch">Fetch latest from NOAA now</button><label><input type="checkbox" id="swAuto"' + (auto ? ' checked' : '') + '> Refresh automatically every 15 min while the app is open</label></div>' +
        '<p class="fine">Offline by default: nothing is fetched until you press the button or tick the box. Each successful fetch is saved on this computer, so the app keeps working from the cached copy with no internet. Only the NOAA host ' + 'services.swpc.noaa.gov' + ' is contacted, and only by the app\'s main process. No personal data is sent.</p>';
      el.querySelector('#swUse').onclick = function () { RC.setInputs({ d: r.assumedDose }); U.toast && U.toast('ok'); };
      el.querySelector('#swFetch').onclick = function () { el.querySelector('#swFetch').disabled = true; el.querySelector('#swFetch').textContent = 'Fetching…'; loadSwx(true).then(paint); };
      el.querySelector('#swAuto').onchange = function () { try { localStorage.setItem('rcpt.swx.auto', this.checked ? '1' : '0'); } catch (e) { } schedAuto(); };
    }
    paint(); if (!swx) loadSwx(false).then(paint);
  }
  var autoT = null;
  function schedAuto() { clearInterval(autoT); autoT = null; var on = false; try { on = localStorage.getItem('rcpt.swx.auto') === '1'; } catch (e) { } if (on && bridge()) { loadSwx(true); autoT = setInterval(function () { loadSwx(true); }, 15 * 60000); } }

  function row(name, pub, model, status, cls, note) { return '<tr><td><b>' + name + '</b><div class="fine">' + note + '</div></td><td>' + pub + '</td><td>' + model + '</td><td><span class="badge2 ' + cls + '">' + status + '</span></td></tr>'; }
  function tabValid(el) {
    var v = validation(); if (!v) { el.innerHTML = '<p>Orion physics is not loaded.</p>'; return; }
    var pct = function (x) { return (x >= 0 ? '+' : '') + fmt(x * 100, 0) + '%'; };
    el.innerHTML = '<h3>' + T('tab_valid', 'Validation') + '</h3>' +
      '<div class="card"><p style="margin:0"><b>Honest headline.</b> Over Gale crater\'s seasonal pressure swing (' + REF.pressure.p1 + ' → ' + REF.pressure.p2 + ' Pa) the published Curiosity-based analysis finds the dose equivalent falls by about <b>' + fmt(REF.pressure.dEq, 2) + ' mSv/day (~16%)</b>. This model, which was <i>not</i> tuned to that number, predicts a fall of <b>' + fmt(v.dModel, 3) + ' mSv/day (' + fmt(Math.abs(v.fracModel) * 100, 0) + '%)</b>: right direction, about <b>' + fmt(v.ratio * 100, 0) + '%</b> of the published size. It <b>underestimates</b> how much the atmosphere matters.</p></div>' +
      '<table><tr><th>Check</th><th>Published</th><th>This model</th><th>Status</th></tr>' +
      row('Surface dose at Gale, GCR', fmt(REF.surfaceGale.v, 2) + ' ± ' + fmt(REF.surfaceGale.sd, 2) + ' mSv/day', fmt(v.gale, 2) + ' mSv/day', 'CALIBRATED', 'bd-info', 'The model\'s scale constant is set to hit this number, so agreement here proves nothing.') +
      row('Annual-average dose at Gale', '≈ ' + fmt(REF.annualGale.v, 2) + ' mSv/day', fmt(v.gale, 2) + ' (' + pct(v.annualDiff) + ')', v.withinSd ? 'CONSISTENT' : 'OFF', v.withinSd ? 'bd-pass' : 'bd-warn', 'Different analysis of the same instrument; difference sits inside the stated ±0.12 uncertainty.') +
      row('Dose change over seasonal pressure swing (' + REF.pressure.p1 + '→' + REF.pressure.p2 + ' Pa)', '≈ −' + fmt(REF.pressure.dEq, 2) + ' mSv/day (−16%)', '−' + fmt(v.dModel, 3) + ' (−' + fmt(Math.abs(v.fracModel) * 100, 0) + '%)', 'HELD-OUT: UNDERESTIMATES', 'bd-warn', 'Not used to tune anything. The one genuine test of the atmosphere term.') +
      row('Cruise (deep-space transit) dose', fmt(REF.cruise.v, 2) + ' mSv/day inside the spacecraft', fmt(v.cruiseEst, 2) + ' (' + fmt(v.top, 2) + ' at Mars top-of-atmosphere × 2 for the planet-blocked half-sky)', 'PLAUSIBILITY ONLY', 'bd-info', 'Not fitted, but the shape constants were hand-picked with the answer in mind, so treat the match (' + pct(v.cruiseRatio - 1) + ') as a sanity check, not a validation.') +
      row('RCPT physiological risk R (weights, interaction, tiers)', 'none', '—', 'NOT VALIDATED', 'bd-warn', 'There is no published dataset behind the weights or couplings. They are assumptions. The ±CI band is a fixed display band, not a statistical interval.') + '</table>' +
      '<h4>What this means</h4>' + bulletList(['The Mars <b>radiation</b> part is anchored to Curiosity and gets the order of magnitude and the ranking of sites right, but is too forgiving about atmosphere. Use it for relative comparison and teaching.', 'The <b>physiological</b> part is a transparent concept model. Its value is that every number can be inspected (see "Explain this number") and stress-tested (see Sensitivity), not that it predicts a real astronaut\'s health.', 'Validating R_MRP would need paired radiation, HRV and sleep data from analogue crews or ISS studies; that is the main next step.']) +
      '<p class="fine">All values above are recomputed from the live model code when this tab opens. Reference numbers are typed in once in rcpt.science.js with their citations (Sources tab).</p>';
  }
  function tornadoSvg(t) {
    var rows = t.rows, W = 560, rh = 26, H = rows.length * rh + 30, mid = 330, mx = Math.max(1, Math.max.apply(null, rows.map(function (r) { return Math.max(Math.abs(r.lo), Math.abs(r.hi)); }))), sc = 190 / mx;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tornado chart of sensitivity of R to each parameter">';
    o += '<line x1="' + mid + '" x2="' + mid + '" y1="6" y2="' + (H - 18) + '" stroke="#4a5b70"/>';
    rows.forEach(function (r, i) {
      var y = 10 + i * rh, a = Math.min(r.lo, r.hi), b = Math.max(r.lo, r.hi);
      o += '<text x="8" y="' + (y + 14) + '">' + esc(PNAME[r.k]) + '</text><rect x="' + (mid + a * sc) + '" y="' + y + '" width="' + Math.max(1, (b - a) * sc) + '" height="16" fill="#17a9f0" opacity=".85"/><text x="' + (mid + a * sc - 4) + '" y="' + (y + 12) + '" text-anchor="end">' + (a >= 0 ? '+' : '') + fmt(a) + '</text><text x="' + (mid + b * sc + 4) + '" y="' + (y + 12) + '">' + (b >= 0 ? '+' : '') + fmt(b) + '</text>';
    });
    return o + '<text x="' + mid + '" y="' + (H - 4) + '" text-anchor="middle">change in R (points) when the parameter moves −/+ ' + Math.round(100 * 0.25) + '%</text></svg>';
  }
  var sensSel = 1;
  function tabSens(el) {
    var S = sensitivity(0.25, 4000), chk = selfCheck();
    function paint() {
      var t = S.tornado[sensSel], top = t.rows[0];
      el.innerHTML = '<h3>' + T('tab_sens', 'Sensitivity') + '</h3><p>The weights and couplings in R_MRP are assumptions. How much do the results depend on them? Each parameter is moved by ±25 %, first one at a time, then all together (4,000 random draws, fixed seed so results repeat).</p>' +
        '<p class="fine">Self-check: this analysis uses its own parameterised copy of the model. At the default parameters it matches the app\'s model to within ' + chk.toExponential(1) + ' R points over a 3,000-point grid' + (chk < 1e-9 ? ' (identical).' : '.') + '</p>' +
        '<div class="row"><label>One-at-a-time view for: <select id="sSel">' + PRESETS.map(function (p, i) { return '<option value="' + i + '"' + (i === sensSel ? ' selected' : '') + '>' + esc(p[0]) + ' (R = ' + fmt(S.tornado[i].base) + ')</option>'; }).join('') + '</select></label></div>' +
        tornadoSvg(t) + '<p>Largest driver here: <b>' + esc(PNAME[top.k]) + '</b>, moving R by about ' + fmt(Math.max(Math.abs(top.lo), Math.abs(top.hi))) + ' points for a 25% change.</p>' +
        '<h4>All parameters varied together</h4><table><tr><th>Scenario</th><th>Baseline R</th><th>5th–95th percentile</th><th>Tier changes in</th></tr>' + S.mc.map(function (m) { return '<tr><td>' + esc(m.name) + '</td><td class="num">' + fmt(m.base) + ' (' + m.tier + ')</td><td class="num">' + fmt(m.p5) + ' – ' + fmt(m.p95) + '</td><td class="num">' + fmt(m.flip * 100, 0) + '% of draws</td></tr>'; }).join('') + '</table>' +
        '<h4>Reading it</h4><p>' + sensTakeaway(S) + '</p><p class="fine">This tests <i>structural</i> sensitivity of the concept model to its own assumed numbers. It does not say the model is right. Ranges (±25%) are a stated choice.</p>';
      el.querySelector('#sSel').onchange = function () { sensSel = +this.value; paint(); };
    }
    paint();
  }
  function sensTakeaway(S) {
    var a = S.mc[0], b = S.mc[1], c = S.mc[2], parts = [];
    parts.push('The <b>nominal</b> case stays ' + a.tier + ' in ' + fmt((1 - a.flip) * 100, 0) + '% of draws.');
    parts.push('The <b>sleep-deprived</b> case is the fragile one: its tier changes in ' + fmt(b.flip * 100, 0) + '% of draws (R spans ' + fmt(b.p5) + '–' + fmt(b.p95) + ' around the 35 threshold).');
    parts.push('The <b>acute storm</b> stays an emergency in ' + fmt((1 - c.flip) * 100, 0) + '% of draws, partly because the dose ≥ 10 mSv/hr rule triggers it independently of the weights.');
    return parts.join(' ');
  }

  function tabTerr(el) {
    var src = window.Orion && window.Orion.terrainSource ? window.Orion.terrainSource() : 'stylised';
    el.innerHTML = '<h3>' + T('tab_terr', 'Terrain') + ' <span class="badge2 ' + (src === 'imported' ? 'bd-live' : 'bd-bundled') + '">' + (src === 'imported' ? 'IMPORTED GRID' : 'STYLISED MODEL') + '</span></h3>' +
      '<p>Orion\'s default terrain is a <b>stylised model</b> built from known feature positions. It is not NASA MOLA data, and no real elevation grid is bundled with the app. You can replace it with a real one:</p>' +
      bulletList(['Get an <b>8-bit greyscale, equirectangular (2:1)</b> image of Mars MOLA elevation, for example from USGS Astrogeology or NASA Mars Trek. Black = lowest, white = highest.', 'Enter the elevation range the image covers (MOLA spans roughly −8.2 to +21.2 km).', 'Most Mars global maps start at 0° east; keep that box ticked unless the image starts at −180°.', 'Orion then recomputes the radiation, storm and hazard layers from the real heights. The grid is stored on this computer.']) +
      '<div class="card"><div class="row"><input type="file" id="demFile" accept="image/png,image/jpeg"><label>min km <input type="number" id="demMin" value="-8.2" step="0.1" style="width:80px"></label><label>max km <input type="number" id="demMax" value="21.2" step="0.1" style="width:80px"></label><label><input type="checkbox" id="demShift" checked> image starts at 0° E</label></div><div class="row"><button type="button" class="b go" id="demApply">Import and apply</button><button type="button" class="b red" id="demReset">Back to stylised model</button></div><div id="demMsg" class="fine" role="status"></div></div>' +
      '<p class="fine">8-bit images give about 115 m vertical steps over this range. The importer resamples to 1024×512. The accuracy of the result depends entirely on the file you supply.</p>';
    var msg = el.querySelector('#demMsg');
    el.querySelector('#demApply').onclick = function () {
      var f = el.querySelector('#demFile').files[0]; if (!f) { msg.textContent = 'Choose an image first.'; return; }
      var mn = +el.querySelector('#demMin').value, mx = +el.querySelector('#demMax').value, sh = el.querySelector('#demShift').checked;
      if (!(mx > mn)) { msg.textContent = 'Max must be greater than min.'; return; }
      var fr = new FileReader(); fr.onerror = function () { msg.textContent = 'Could not read that file.'; };
      fr.onload = function () {
        var im = new Image(); im.onerror = function () { msg.textContent = 'That is not a readable PNG/JPEG.'; };
        im.onload = function () {
          try {
            var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; var x = cv.getContext('2d'); x.drawImage(im, 0, 0, 1024, 512);
            var px = x.getImageData(0, 0, 1024, 512).data, u8 = new Uint8Array(1024 * 512);
            for (var i = 0; i < u8.length; i++) u8[i] = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]);
            window.Orion.importDEM(u8, mn, mx, sh);
            var bin = ''; for (var k = 0; k < u8.length; k += 8192) bin += String.fromCharCode.apply(null, u8.subarray(k, k + 8192));
            var saved = true; try { localStorage.setItem('orion.dem', JSON.stringify({ b64: btoa(bin), min: mn, max: mx, shift: sh })); } catch (e) { saved = false; }
            msg.textContent = 'Applied. ' + (saved ? 'Saved for next launch.' : 'Could not save it for next launch (storage full); it will reset when the app restarts.') + ' Open Orion to see it.'; document.dispatchEvent(new CustomEvent('rcpt:dem'));
            setTimeout(function () { tabTerr(el); }, 1200);
          } catch (e) { msg.textContent = 'Import failed: ' + e.message; }
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(f);
    };
    el.querySelector('#demReset').onclick = function () { window.Orion.restoreStylised(); msg.textContent = 'Back to the stylised model.'; setTimeout(function () { tabTerr(el); }, 600); };
  }

  var SOURCES = [
    ['Hassler et al. (2014)', 'Mars’ surface radiation environment measured with the Mars Science Laboratory’s Curiosity rover. <i>Science</i> 343(6169):1244797.', 'https://doi.org/10.1126/science.1244797', 'Surface GCR dose equivalent ≈ 0.64 mSv/day at Gale (calibration point).'],
    ['Zeitlin et al. (2013)', 'Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory. <i>Science</i> 340:1080–1084.', 'https://doi.org/10.1126/science.1235989', 'Cruise dose equivalent ≈ 1.84 mSv/day (plausibility check).'],
    ['Guo et al. (2015)', 'Modeling the variations of dose rate measured by RAD during the first MSL Martian year: 2012–2014. arXiv:1507.03473.', 'https://arxiv.org/abs/1507.03473', 'Annual-average ≈ 0.7 mSv/day; dose falls with rising pressure (the held-out check).'],
    ['NOAA SWPC', 'GOES primary integral proton flux (JSON) and NOAA Space Weather Scales (S1–S5 solar radiation storms).', 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json', 'Live/cached storm input; S-scale thresholds 10 / 10² / 10³ / 10⁴ / 10⁵ pfu at ≥10 MeV.'],
    ['Smith et al. (2001)', 'Mars Orbiter Laser Altimeter: experiment summary after the first year of global mapping of Mars. <i>J. Geophys. Res.</i> 106(E10):23689–23722.', 'https://doi.org/10.1029/2000JE001364', 'Reference for real Mars elevation (MOLA). Not bundled; import path in Terrain tab.'],
    ['NASA Mars Fact Sheet', 'Mean surface pressure about 6.1 mbar (610 Pa), scale height about 11 km, gravity 3.71 m/s².', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html', 'Pressure and column-density formulas.']
  ];
  function tabSrc(el) {
    el.innerHTML = '<h3>' + T('tab_src', 'Sources') + '</h3><table><tr><th>Source</th><th>Used for</th></tr>' + SOURCES.map(function (s) { return '<tr><td><b>' + esc(s[0]) + '</b><div class="fine">' + s[1] + ' <a href="' + s[2] + '" target="_blank" rel="noopener">' + esc(s[2]) + '</a></div></td><td>' + esc(s[3]) + '</td></tr>'; }).join('') + '</table>' +
      '<h4>Assumptions that are ours, not from a source</h4>' + bulletList(['RCPT weights 0.40 / 0.35 / 0.25, couplings 0.05 and 0.03, saturation rate 0.08, 70 ms HRV reference, tier thresholds 35 / 70 / 10 mSv/hr.', 'The fixed −4.2 / +4.8 display band.', 'Shelter attenuation factor 0.2, hab factor 0.6 (crew view), sleep-repay ratio 1.0.', 'Mapping from proton flux to crew dose rate; the 18.5 mSv/hr storm stress test; the 60 mSv game budget.', 'Shape constants of the Mars dose model (0.55 / 0.45 floor split, 20 g/cm² attenuation length).', 'Orion\'s stylised terrain, temperatures and hazard index.']) +
      '<p class="fine">Published numbers were checked against the cited papers\' abstracts or coverage of them; the full tables were not independently re-derived. Independent project. Not affiliated with, endorsed by or produced by NASA, NOAA or USGS. Research prototype, not a medical device.</p>';
  }

  var panel = U.panel({
    id: 'dataPanel', title: function () { return T('b_data', 'Data & Validation'); },
    tabs: [{ id: 'space', key: 'tab_space', label: 'Space weather', render: tabSpace }, { id: 'valid', key: 'tab_valid', label: 'Validation', render: tabValid }, { id: 'sens', key: 'tab_sens', label: 'Sensitivity', render: tabSens }, { id: 'terr', key: 'tab_terr', label: 'Terrain', render: tabTerr }, { id: 'src', key: 'tab_src', label: 'Sources', render: tabSrc }, { id: 'link', key: 'tab_link', label: 'Ground link', render: function (el) { if (window.RCPTLink) window.RCPTLink.render(el); } }]
  });
  document.getElementById('dataBtn').addEventListener('click', function () { panel.open(); });
  document.addEventListener('rcpt:launch', schedAuto);
  window.RCPTScience = { open: function (t) { panel.open(t); }, isOpen: panel.isOpen, close: panel.close, validation: validation, sensitivity: sensitivity, selfCheck: selfCheck, sweepRef: REF, swx: function () { return swx; }, loadSwx: loadSwx, panelTab: panel.tab };
})();
