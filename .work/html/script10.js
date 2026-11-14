/* Crew & Missions panel: multi-crew tracking, scenario files (JSON), saved mission history, language packs. */
(function () {
  'use strict';
  var U = window.RCPTUI, T = U.T, esc = U.esc, fmt = U.fmt, RC = window.RCPT;
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  var CFG = window.NOVA_CONFIG || {};
  /* ASSUMED location dose factors relative to the ambient rate on the dashboard. */
  var LOC = { eva: { f: 1.0, label: 'EVA / outside' }, hab: { f: 0.6, label: 'Habitat' }, shelter: { f: CFG.shelterFactor || 0.2, label: 'Storm shelter' } };

  /* ---------------- crew ---------------- */
  var DEFAULT_CREW = [
    { id: 'c1', name: 'Commander', role: 'Commander', hrvOff: -3, sleepOff: 0.5, loc: 'hab' },
    { id: 'c2', name: 'Pilot', role: 'Pilot', hrvOff: 4, sleepOff: -0.5, loc: 'hab' },
    { id: 'c3', name: 'Engineer', role: 'Flight engineer', hrvOff: 0, sleepOff: 1.5, loc: 'eva' },
    { id: 'c4', name: 'Scientist', role: 'Mission specialist', hrvOff: -8, sleepOff: 3, loc: 'hab' }
  ];
  var crew = lsGet('rcpt.crew', null); if (!Array.isArray(crew) || !crew.length) crew = JSON.parse(JSON.stringify(DEFAULT_CREW));
  var track = {};   // id -> {dose,maxR}
  var lastClock = null;
  function saveCrew() { lsSet('rcpt.crew', crew); }
  function eff(c, st) {
    var d = st.d * LOC[c.loc].f, h = clamp(st.h + c.hrvOff, 10, 100), s = clamp(st.s + c.sleepOff, 0, 10), m = RC.M(d, h, s);
    return { d: d, h: h, s: s, R: m.R, tier: RC.tierOf(d, m.R) };
  }
  function resetTrack() { track = {}; crew.forEach(function (c) { track[c.id] = { dose: 0, maxR: 0 }; }); lastClock = null; }
  resetTrack();
  var runMax = 0, wasRunning = false, runStart = null;
  RC.onUpdate(function (st) {
    crew.forEach(function (c) {
      var e = eff(c, st), t = track[c.id] || (track[c.id] = { dose: 0, maxR: 0 });
      t.maxR = Math.max(t.maxR, e.R);
      if (st.running && st.clock != null && lastClock != null && st.clock > lastClock) t.dose += e.d * (st.clock - lastClock);
    });
    if (st.running && st.clock != null) { if (lastClock == null || st.clock < lastClock) { resetTrack(); runMax = 0; } lastClock = st.clock; runMax = Math.max(runMax, st.R); }
    wasRunning = st.running;
    if (panel.isOpen() && panel.tab() === 'crew') liveCrew();
  });
  setInterval(function () {
    var r = RC.isRunning();
    if (wasRunning && !r && lastClock != null && lastClock >= 39) {
      hist.add({ kind: 'sim', title: '40 h simulated SPE', maxR: runMax, dose: Math.max.apply(null, crew.map(function (c) { return track[c.id].dose; })), crew: crewSummary(), note: 'Per-crew mission dose in mSv, assumed location factors.' });
      lastClock = null;
    }
    wasRunning = r;
  }, 300);
  function crewSummary() { return crew.map(function (c) { return { name: c.name, maxR: +fmt(track[c.id].maxR), dose: +fmt(track[c.id].dose, 1) }; }); }

  /* ---------------- history ---------------- */
  var hist = {
    all: function () { return lsGet('rcpt.history', []); },
    add: function (e) {
      var a = hist.all(); e = Object.assign({ id: 'h' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), ts: new Date().toISOString() }, e);
      if (e.maxR != null) e.maxR = +(+e.maxR).toFixed(1); if (e.dose != null) e.dose = +(+e.dose).toFixed(1);
      a.unshift(e); lsSet('rcpt.history', a.slice(0, 60)); document.dispatchEvent(new CustomEvent('rcpt:history', { detail: e })); if (panel.isOpen() && panel.tab() === 'hist') panel.refresh(); return e;
    },
    remove: function (id) { lsSet('rcpt.history', hist.all().filter(function (x) { return x.id !== id; })); },
    clear: function () { lsSet('rcpt.history', []); }
  };
  window.RCPTHist = hist;

  /* ---------------- scenarios ---------------- */
  var BUILTIN = [
    { format: 'rcpt-scenario/1', id: 'quiet-cruise', title: 'Quiet cruise day', description: 'Low radiation, healthy sleep. A baseline to compare against.', duration_s: 12, steps: [{ t: 0, d: 0.3, h: 68, s: 0.5 }, { t: 1, d: 0.4, h: 66, s: 1 }] },
    { format: 'rcpt-scenario/1', id: 'late-night-eva', title: 'Late-night EVA, tired crew', description: 'Moderate radiation, falling HRV and growing sleep debt. R climbs without any storm.', duration_s: 16, steps: [{ t: 0, d: 0.5, h: 60, s: 2 }, { t: 0.5, d: 1.5, h: 45, s: 5 }, { t: 1, d: 2.5, h: 36, s: 8 }] },
    { format: 'rcpt-scenario/1', id: 'storm-with-warning', title: 'Storm with early shelter', description: 'A storm arrives but the crew shelters in time (assumed 80% dose reduction).', duration_s: 20, steps: [{ t: 0, d: 0.5, h: 65, s: 1 }, { t: 0.25, d: 18.5, h: 55, s: 1.5 }, { t: 0.4, d: 3.7, h: 55, s: 2 }, { t: 1, d: 1.5, h: 60, s: 2 }] },
    { format: 'rcpt-scenario/1', id: 'storm-no-shelter', title: 'Storm, no shelter, no sleep', description: 'The same storm, but the crew stays out and keeps working. Compare the peak with the sheltered run.', duration_s: 20, steps: [{ t: 0, d: 0.5, h: 65, s: 1 }, { t: 0.25, d: 18.5, h: 50, s: 3 }, { t: 0.6, d: 14, h: 38, s: 6 }, { t: 1, d: 8, h: 34, s: 9 }] }
  ];
  var custom = lsGet('rcpt.scenarios', []);
  function validateScenario(o) {
    if (!o || typeof o !== 'object') throw new Error('Scenario must be a JSON object.');
    if (o.format !== 'rcpt-scenario/1') throw new Error('"format" must be "rcpt-scenario/1".');
    if (typeof o.title !== 'string' || !o.title.trim() || o.title.length > 80) throw new Error('"title" is required (max 80 characters).');
    if (!Array.isArray(o.steps) || o.steps.length < 2 || o.steps.length > 200) throw new Error('"steps" needs 2 to 200 entries.');
    var dur = o.duration_s == null ? 20 : +o.duration_s; if (!(dur >= 3 && dur <= 300)) throw new Error('"duration_s" must be between 3 and 300.');
    var lim = RC.limits(), prev = -1;
    o.steps.forEach(function (st, i) {
      ['t', 'd', 'h', 's'].forEach(function (k) { if (typeof st[k] !== 'number' || !isFinite(st[k])) throw new Error('Step ' + (i + 1) + ': "' + k + '" must be a number.'); });
      if (st.t < 0 || st.t > 1) throw new Error('Step ' + (i + 1) + ': "t" must be between 0 and 1 (fraction of the run).');
      if (st.t < prev) throw new Error('Step ' + (i + 1) + ': "t" must not go backwards.'); prev = st.t;
      if (st.d < lim.d[0] || st.d > lim.d[1]) throw new Error('Step ' + (i + 1) + ': dose "d" must be ' + lim.d[0] + ' to ' + lim.d[1] + ' mSv/hr.');
      if (st.h < lim.h[0] || st.h > lim.h[1]) throw new Error('Step ' + (i + 1) + ': HRV "h" must be ' + lim.h[0] + ' to ' + lim.h[1] + ' ms.');
      if (st.s < lim.s[0] || st.s > lim.s[1]) throw new Error('Step ' + (i + 1) + ': sleep debt "s" must be ' + lim.s[0] + ' to ' + lim.s[1] + ' h.');
    });
    if (o.steps[0].t !== 0 || o.steps[o.steps.length - 1].t !== 1) throw new Error('First step must have t = 0 and last step t = 1.');
    return { format: o.format, id: String(o.id || o.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40), title: o.title.trim(), description: String(o.description || '').slice(0, 300), duration_s: dur, steps: o.steps.map(function (s) { return { t: s.t, d: s.d, h: s.h, s: s.s }; }) };
  }
  var play = null;
  function playScenario(sc) {
    stopPlay(); resetTrack(); var t0 = performance.now(), mx = 0, dose = 0, last = t0, totalH = 40;
    play = { sc: sc, raf: null };
    function at(u) { var S = sc.steps, i = 1; while (i < S.length - 1 && u > S[i].t) i++; var a = S[i - 1], b = S[i], k = b.t === a.t ? 1 : clamp((u - a.t) / (b.t - a.t), 0, 1); return { d: a.d + (b.d - a.d) * k, h: a.h + (b.h - a.h) * k, s: a.s + (b.s - a.s) * k }; }
    (function f(now) {
      if (!play) return; var u = clamp((now - t0) / (sc.duration_s * 1000), 0, 1), v = at(u);
      var st = RC.setInputs(v, { silent: true }), dh = ((now - last) / 1000 / sc.duration_s) * 8; mx = Math.max(mx, st.R); dose += st.d * dh; last = now;
      crew.forEach(function (c) { var t = track[c.id]; if (t) t.dose += eff(c, st).d * dh; });  // scenario spans an assumed 8 h of mission time
      document.dispatchEvent(new CustomEvent('rcpt:scenario-tick', { detail: { u: u, title: sc.title } }));
      if (u < 1) play.raf = requestAnimationFrame(f); else { var fin = hist.add({ kind: 'scenario', title: sc.title, maxR: mx, dose: dose, crew: crewSummary(), note: 'Scenario file run; dose assumes the scenario spans 8 h.' }); play = null; document.dispatchEvent(new CustomEvent('rcpt:scenario-end', { detail: fin })); if (panel.isOpen() && panel.tab() === 'scen') panel.refresh(); }
    })(t0);
  }
  function stopPlay() { if (play) { cancelAnimationFrame(play.raf); play = null; } }

  /* ---------------- panel views ---------------- */
  var panel;
  function tierCls(t) { return t === 'emergency' ? 't-x' : t === 'elevated' ? 't-e' : 't-n'; }
  function liveCrew() {
    var st = RC.getState(), tb = document.getElementById('crewLive'); if (!tb || !st) return;
    tb.innerHTML = crew.map(function (c) { var e = eff(c, st), t = track[c.id] || { dose: 0, maxR: 0 }; return '<tr><td><b>' + esc(c.name) + '</b><div class="fine">' + esc(c.role) + '</div></td><td>' + esc(LOC[c.loc].label) + '</td><td class="num">' + fmt(e.d, 2) + '</td><td class="num">' + Math.round(e.h) + '</td><td class="num">' + fmt(e.s) + '</td><td class="num ' + tierCls(e.tier) + '"><b>' + fmt(e.R) + '</b><div class="bar-in"><i style="width:' + e.R + '%;background:' + (e.tier === 'emergency' ? '#ff5d4d' : e.tier === 'elevated' ? '#ffb224' : '#35d08a') + '"></i></div></td><td class="' + tierCls(e.tier) + '">' + e.tier + '</td><td class="num">' + fmt(t.dose, 1) + '</td><td class="num">' + fmt(t.maxR) + '</td></tr>'; }).join('');
  }
  function tabCrew(el) {
    var st = RC.getState() || { d: 0.5, h: 65, s: 1 };
    el.innerHTML = '<h3>' + T('tab_crew', 'Crew') + '</h3><p>Everyone shares the dashboard\'s ambient dose, HRV and sleep inputs, adjusted for where they are and their personal offsets. Each person gets their own R. Run the 40 h simulation or a scenario and the table tracks each person\'s dose and peak risk.</p>' +
      '<table><thead><tr><th>Crew</th><th>Location</th><th>Dose mSv/hr</th><th>HRV</th><th>Sleep debt</th><th>R</th><th>Tier</th><th>Mission dose mSv</th><th>Peak R</th></tr></thead><tbody id="crewLive"></tbody></table>' +
      '<p class="fine">Location factors are assumptions: outside ×1.0, habitat ×' + LOC.hab.f + ', storm shelter ×' + LOC.shelter.f + '. Offsets are illustrative. All simulated.</p>' +
      '<h4>Edit crew</h4><table><thead><tr><th>Name</th><th>Role</th><th>Location</th><th>HRV offset (ms)</th><th>Sleep offset (h)</th><th></th></tr></thead><tbody>' + crew.map(function (c, i) {
        return '<tr data-i="' + i + '"><td><input type="text" data-f="name" value="' + esc(c.name) + '" maxlength="24" aria-label="Name" style="width:110px"></td><td><input type="text" data-f="role" value="' + esc(c.role) + '" maxlength="30" aria-label="Role" style="width:130px"></td><td><select data-f="loc" aria-label="Location">' + Object.keys(LOC).map(function (k) { return '<option value="' + k + '"' + (c.loc === k ? ' selected' : '') + '>' + LOC[k].label + '</option>'; }).join('') + '</select></td><td><input type="number" data-f="hrvOff" value="' + c.hrvOff + '" min="-30" max="30" step="1" style="width:70px" aria-label="HRV offset"></td><td><input type="number" data-f="sleepOff" value="' + c.sleepOff + '" min="-5" max="5" step="0.5" style="width:70px" aria-label="Sleep offset"></td><td><button type="button" class="b" data-act="focus" title="Set the dashboard sliders to this person\'s values">Focus</button><button type="button" class="b red" data-act="del" aria-label="Remove ' + esc(c.name) + '">×</button></td></tr>';
      }).join('') + '</tbody></table><div class="row"><button type="button" class="b go" id="crewAdd"' + (crew.length >= 8 ? ' disabled' : '') + '>+ ' + T('add', 'Add') + '</button><button type="button" class="b" id="crewReset">' + T('reset', 'Reset') + '</button><button type="button" class="b" id="crewTrk">Reset mission dose tracking</button></div>';
    liveCrew();
    el.querySelectorAll('tbody tr[data-i] [data-f]').forEach(function (inp) {
      inp.addEventListener('change', function () { var c = crew[+inp.closest('tr').getAttribute('data-i')], f = inp.getAttribute('data-f'); c[f] = (f === 'hrvOff' || f === 'sleepOff') ? clamp(+inp.value || 0, f === 'hrvOff' ? -30 : -5, f === 'hrvOff' ? 30 : 5) : String(inp.value).slice(0, 30); saveCrew(); liveCrew(); });
    });
    el.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.closest('tr').getAttribute('data-i'), c = crew[i];
        if (b.getAttribute('data-act') === 'del') { if (crew.length > 1) { crew.splice(i, 1); saveCrew(); resetTrack(); panel.refresh(); } }
        else { var e = eff(c, RC.getState()); RC.setInputs({ d: e.d, h: e.h, s: e.s }); }
      });
    });
    el.querySelector('#crewAdd').onclick = function () { if (crew.length < 8) { crew.push({ id: 'c' + Date.now().toString(36), name: 'Crew ' + (crew.length + 1), role: 'Crew', hrvOff: 0, sleepOff: 0, loc: 'hab' }); saveCrew(); resetTrack(); panel.refresh(); } };
    el.querySelector('#crewReset').onclick = function () { crew = JSON.parse(JSON.stringify(DEFAULT_CREW)); saveCrew(); resetTrack(); panel.refresh(); };
    el.querySelector('#crewTrk').onclick = function () { resetTrack(); liveCrew(); };
  }
  function tabScen(el) {
    var all = BUILTIN.concat(custom);
    el.innerHTML = '<h3>' + T('tab_scen', 'Scenarios') + '</h3><p>A scenario is a small JSON file that moves the dose, HRV and sleep-debt inputs over time. Play one, share it, or write your own for a class or a what-if.</p>' +
      '<table><tbody>' + all.map(function (s, i) { return '<tr><td><b>' + esc(s.title) + '</b><div class="fine">' + esc(s.description) + ' · ' + s.duration_s + ' s</div></td><td style="white-space:nowrap"><button type="button" class="b go" data-play="' + i + '">▶ ' + T('play', 'Play') + '</button><button type="button" class="b" data-copy="' + i + '">JSON</button>' + (i >= BUILTIN.length ? '<button type="button" class="b red" data-del="' + (i - BUILTIN.length) + '" aria-label="Delete ' + esc(s.title) + '">×</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="row"><button type="button" class="b" id="scStop">■ ' + T('stopb', 'Stop') + '</button></div>' +
      '<h4>Import or edit JSON</h4><textarea id="scJson" spellcheck="false" aria-label="Scenario JSON">' + esc(JSON.stringify(BUILTIN[2], null, 1)) + '</textarea>' +
      '<div class="row"><input type="file" id="scFile" accept="application/json,.json"><button type="button" class="b go" id="scAdd">' + T('import', 'Import') + ' / ' + T('save', 'Save') + '</button></div><div id="scMsg" class="fine" role="status"></div>' +
      '<p class="fine">Format <code>rcpt-scenario/1</code>: <code>{title, description, duration_s, steps:[{t:0..1, d, h, s}]}</code>. Values are linearly interpolated. Dose 0–50 mSv/hr, HRV 10–100 ms, sleep debt 0–10 h. Invalid files are rejected with a message; nothing is executed.</p>';
    var msg = el.querySelector('#scMsg'), ta = el.querySelector('#scJson');
    el.querySelectorAll('[data-play]').forEach(function (b) { b.onclick = function () { var s = all[+b.getAttribute('data-play')]; panel.close(); playScenario(s); }; });
    el.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { ta.value = JSON.stringify(all[+b.getAttribute('data-copy')], null, 1); msg.textContent = 'Loaded into the editor below.'; }; });
    el.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { custom.splice(+b.getAttribute('data-del'), 1); lsSet('rcpt.scenarios', custom); panel.refresh(); }; });
    el.querySelector('#scStop').onclick = stopPlay;
    el.querySelector('#scFile').onchange = function () { var f = this.files[0]; if (!f) return; if (f.size > 200000) { msg.textContent = 'File too large.'; return; } var r = new FileReader(); r.onload = function () { ta.value = String(r.result); msg.textContent = 'Loaded. Press Import / Save.'; }; r.readAsText(f); };
    el.querySelector('#scAdd').onclick = function () {
      try { var sc = validateScenario(JSON.parse(ta.value)); custom = custom.filter(function (x) { return x.id !== sc.id; }); if (BUILTIN.some(function (b) { return b.id === sc.id; })) sc.id += '-custom'; custom.push(sc); lsSet('rcpt.scenarios', custom); panel.refresh(); }
      catch (e) { msg.textContent = 'Not saved: ' + e.message; msg.className = 't-x fine'; }
    };
  }
  function tabHist(el) {
    var a = hist.all();
    el.innerHTML = '<h3>' + T('tab_hist', 'History') + '</h3><p>Finished simulations, scenario runs and Orion expeditions are saved on this computer only. Nothing is uploaded.</p>' +
      '<div class="row"><button type="button" class="b go" id="hSnap">Save a snapshot of the current state</button><button type="button" class="b" id="hExp">' + T('export', 'Export') + ' JSON</button><button type="button" class="b red" id="hClr">' + T('clear', 'Clear') + '</button></div>' +
      (a.length ? '<table><thead><tr><th>When</th><th>What</th><th>Peak R</th><th>Dose mSv</th><th>Notes</th><th></th></tr></thead><tbody>' + a.map(function (h) { return '<tr><td class="fine" style="white-space:nowrap">' + esc(new Date(h.ts).toLocaleString()) + '</td><td><b>' + esc(h.title) + '</b><div class="fine">' + esc(h.kind) + '</div></td><td class="num">' + (h.maxR != null ? fmt(h.maxR) : '–') + '</td><td class="num">' + (h.dose != null ? fmt(h.dose, 1) : '–') + '</td><td class="fine">' + esc(h.note || '') + (h.crew ? '<br>' + h.crew.map(function (c) { return esc(c.name) + ' ' + c.maxR + '/' + c.dose; }).join(' · ') : '') + '</td><td><button type="button" class="b red" data-rm="' + h.id + '" aria-label="Delete entry">×</button></td></tr>'; }).join('') + '</tbody></table><p class="fine">Per-crew format: name peak R / mission dose mSv.</p>' : '<p class="fine">Nothing saved yet. Run the 40 h simulation to the end, play a scenario, or finish an Orion expedition.</p>') +
      '<textarea id="hOut" hidden spellcheck="false" aria-label="Exported history"></textarea>';
    el.querySelector('#hSnap').onclick = function () { var s = RC.getState(); hist.add({ kind: 'snapshot', title: 'Snapshot', maxR: s.R, dose: null, note: 'dose ' + fmt(s.d) + ' mSv/hr, HRV ' + Math.round(s.h) + ' ms, sleep debt ' + fmt(s.s) + ' h, ' + s.tier, crew: crewSummary() }); };
    el.querySelector('#hExp').onclick = function () { var o = el.querySelector('#hOut'); o.hidden = false; o.value = JSON.stringify({ format: 'rcpt-history/1', exported: new Date().toISOString(), entries: hist.all() }, null, 1); o.select(); };
    el.querySelector('#hClr').onclick = function () { if (confirm('Delete all saved history?')) { hist.clear(); panel.refresh(); } };
    el.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { hist.remove(b.getAttribute('data-rm')); panel.refresh(); }; });
  }
  function tabLang(el) {
    var I = window.RCPTi18n;
    el.innerHTML = '<h3>' + T('tab_lang', 'Languages') + '</h3><div class="row">' + I.langs().map(function (l) { return '<button type="button" class="b' + (l[0] === I.get() ? ' go' : '') + '" data-lang="' + l[0] + '">' + esc(l[1]) + '</button>'; }).join('') + '</div>' +
      '<p>The dashboard, panels, explanations and teaching missions are translated. Arabic switches the layout to right-to-left. Orion\'s site briefings and Nova\'s free-form answers are still English; Nova understands a set of Arabic phrases (try «ما هي الحالة؟» or «شغّل العاصفة»).</p>' +
      '<h4>Add a language pack</h4><p class="fine">Paste JSON <code>{"code":"fr","name":"Français","rtl":false,"strings":{…}}</code> using the same keys as English. Missing keys fall back to English. Download the English key list to start from:</p><div class="row"><button type="button" class="b" id="lKeys">Show English strings (JSON)</button></div>' +
      '<textarea id="lJson" spellcheck="false" aria-label="Language pack JSON" placeholder=\'{"code":"fr","name":"Français","rtl":false,"strings":{"launch":"Lancer la mission"}}\'></textarea><div class="row"><button type="button" class="b go" id="lAdd">' + T('add', 'Add') + '</button></div><div id="lMsg" class="fine" role="status"></div>';
    el.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { I.set(b.getAttribute('data-lang')); }; });
    el.querySelector('#lKeys').onclick = function () { el.querySelector('#lJson').value = JSON.stringify({ code: 'xx', name: 'Language name', rtl: false, strings: I.dict('en') }, null, 1); };
    el.querySelector('#lAdd').onclick = function () { var m = el.querySelector('#lMsg'); try { var code = I.addPack(JSON.parse(el.querySelector('#lJson').value)); m.textContent = 'Added "' + code + '". Choose it from the language menu.'; m.className = 't-n fine'; var sl = document.getElementById('langSel'); if (sl) { sl.innerHTML = I.langs().map(function (l) { return '<option value="' + l[0] + '">' + esc(l[1]) + '</option>'; }).join(''); sl.value = I.get(); } } catch (e) { m.textContent = 'Not added: ' + e.message; m.className = 't-x fine'; } };
  }
  panel = U.panel({ id: 'crewPanel', title: function () { return T('b_crew', 'Crew & Missions'); }, tabs: [{ id: 'crew', key: 'tab_crew', label: 'Crew', render: tabCrew }, { id: 'scen', key: 'tab_scen', label: 'Scenarios', render: tabScen }, { id: 'hist', key: 'tab_hist', label: 'History', render: tabHist }, { id: 'lang', key: 'tab_lang', label: 'Languages', render: tabLang }] });
  document.getElementById('crewBtn').addEventListener('click', function () { panel.open(); });
  window.RCPTCrew = { open: function (t) { panel.open(t); }, close: panel.close, isOpen: panel.isOpen, crew: function () { return crew; }, eff: eff, play: playScenario, stop: stopPlay, validate: validateScenario, builtin: BUILTIN, track: function () { return track; }, panelTab: panel.tab };
})();
