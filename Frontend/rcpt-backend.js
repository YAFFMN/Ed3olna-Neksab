/* RCPT backend bridge.
   The RCPT page was built for a desktop shell that exposed `window.novaBridge` over IPC.
   This file provides the same bridge over HTTP to the Express backend (Backend/server),
   and feeds the page the variable data the backend owns:
     - Nova companion: chat (NVIDIA NIM + NASA/CSA knowledge base), API-key store
     - Space weather: NOAA GOES proton flux (live / cache / bundled), logged to PostgreSQL
     - Crew: astronaut names and roles from the `astronauts` table
     - Habitat Link panel: latest stored wearable/NOAA reading, cumulative dose vs limit,
       active database alerts (resolve), push the twin's state as a reading.
   Must load AFTER window.NOVA_CONFIG and BEFORE the companion script (it reads novaBridge once). */
(function () {
  'use strict';

  var BOOT = window.RCPT_BACKEND || { ok: false, crew: [], ai: { available: false } };
  var AID = BOOT.astronautId || 1;
  var BASE = location.protocol === 'file:' ? 'http://localhost:5000' : '';

  /* ---------------- HTTP helper ---------------- */
  function api(method, url, body, timeoutMs) {
    var ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ac ? setTimeout(function () { ac.abort(); }, timeoutMs || 15000) : null;
    var opt = { method: method, headers: { accept: 'application/json' } };
    if (ac) opt.signal = ac.signal;
    if (body !== undefined && body !== null) {
      opt.headers['content-type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    return fetch(BASE + url, opt)
      .then(function (res) {
        return res.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
          if (!res.ok) {
            var err = new Error((data && data.error) || ('HTTP ' + res.status));
            err.status = res.status;
            throw err;
          }
          return data;
        });
      }, function (e) {
        throw new Error(e && e.name === 'AbortError' ? 'Timed out' : 'Habitat server unreachable');
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  /* ---------------- 1. window.novaBridge (same contract as the desktop preload) ---------------- */
  window.novaBridge = Object.freeze({
    chat: function (req) {
      var payload = Object.assign({}, req || {}, { astronautId: AID });
      return api('POST', '/api/nova/chat', payload, 100000).catch(function (e) {
        return { ok: false, error: String((e && e.message) || e) };
      });
    },
    hasKey: function () {
      return api('GET', '/api/nova/key').catch(function () { return { has: false, encrypted: false }; });
    },
    saveKey: function (k) {
      return api('POST', '/api/nova/key', { key: String(k || '') }).then(function (r) { return !!(r && r.ok); });
    },
    clearKey: function () {
      return api('DELETE', '/api/nova/key').then(function () { return true; });
    },
    spaceWeather: function (refresh) {
      return api('GET', '/api/space-weather?refresh=' + (refresh ? 1 : 0) + '&astronautId=' + AID, null, 25000);
    }
  });

  /* ---------------- 2. Companion defaults from the database / server ---------------- */
  var CFG = window.NOVA_CONFIG;
  var ASTRO = BOOT.astronaut || null;
  if (CFG) {
    if (ASTRO && ASTRO.full_name) CFG.userTitle = String(ASTRO.full_name).slice(0, 40);
    if (BOOT.ai && BOOT.ai.endpoint) {
      CFG.defaultEndpoint = BOOT.ai.endpoint;
      CFG.defaultModel = BOOT.ai.model || CFG.defaultModel;
    }
  }
  try {
    // First visit: if the server has an AI key, start Nova in Enhanced mode (user can switch back in Settings).
    if (BOOT.ai && BOOT.ai.available && localStorage.getItem('nova.mode') == null) {
      localStorage.setItem('nova.mode', JSON.stringify('enhanced'));
    }
    // Saved settings that point at a server-managed provider (old NVIDIA or Google) follow the server's
    // current provider, so switching the provider in .env also updates Nova's Settings screen.
    if (BOOT.ai && BOOT.ai.endpoint) {
      var savedEp = null;
      try { savedEp = JSON.parse(localStorage.getItem('nova.endpoint') || 'null'); } catch (e) { savedEp = null; }
      if (typeof savedEp === 'string' && /\/\/(integrate\.api\.nvidia\.com|generativelanguage\.googleapis\.com)\//.test(savedEp)) {
        localStorage.setItem('nova.endpoint', JSON.stringify(BOOT.ai.endpoint));
        localStorage.setItem('nova.model', JSON.stringify(BOOT.ai.model || ''));
      }
    }
  } catch (e) { /* storage blocked */ }

  /* ---------------- 3. Crew roster from the `astronauts` table ---------------- */
  var DEF_CREW = [
    { id: 'c1', name: 'Commander', role: 'Commander', hrvOff: -3, sleepOff: 0.5, loc: 'hab' },
    { id: 'c2', name: 'Pilot', role: 'Pilot', hrvOff: 4, sleepOff: -0.5, loc: 'hab' },
    { id: 'c3', name: 'Engineer', role: 'Flight engineer', hrvOff: 0, sleepOff: 1.5, loc: 'eva' },
    { id: 'c4', name: 'Scientist', role: 'Mission specialist', hrvOff: -8, sleepOff: 3, loc: 'hab' }
  ];
  try {
    var crewDb = Array.isArray(BOOT.crew) ? BOOT.crew : [];
    if (crewDb.length) {
      var raw = localStorage.getItem('rcpt.crew');
      var stored = null;
      try { stored = raw ? JSON.parse(raw) : null; } catch (e) { stored = null; }
      if (!Array.isArray(stored) || !stored.length) {
        var seeded = crewDb.slice(0, 8).map(function (a, i) {
          var slot = DEF_CREW[i % DEF_CREW.length];
          return {
            id: 'db' + a.id,
            name: String(a.full_name || ('Crew ' + a.id)).slice(0, 40),
            role: String(a.mission_role || slot.role).slice(0, 40),
            hrvOff: slot.hrvOff, sleepOff: slot.sleepOff, loc: slot.loc
          };
        });
        for (var i = seeded.length; i < DEF_CREW.length; i++) seeded.push(Object.assign({}, DEF_CREW[i]));
        localStorage.setItem('rcpt.crew', JSON.stringify(seeded));
      } else {
        var changed = false;
        crewDb.forEach(function (a) {
          stored.forEach(function (c) {
            if (c && c.id === 'db' + a.id) {
              var n = String(a.full_name || c.name).slice(0, 40);
              var r = String(a.mission_role || c.role).slice(0, 40);
              if (c.name !== n || c.role !== r) { c.name = n; c.role = r; changed = true; }
            }
          });
        });
        if (changed) localStorage.setItem('rcpt.crew', JSON.stringify(stored));
      }
    }
  } catch (e) { /* storage blocked */ }

  /* ---------------- 4. Strings (English / Arabic / Spanish) ---------------- */
  var STR = {
    en: {
      hb_title: 'Habitat Link',
      hb_on: 'HABITAT DATABASE ONLINE',
      hb_off: 'HABITAT SERVER OFFLINE',
      hb_rate: 'Wearable rate',
      hb_cum: 'Cumulative dose',
      hb_hr: 'Heart rate',
      hb_src: 'Last reading',
      hb_none: 'No readings stored yet.',
      hb_alerts: 'Database alerts',
      hb_noalert: 'No active alerts.',
      hb_resolve: 'Resolve',
      hb_follow: 'Drive dose slider from habitat',
      hb_push: 'Push twin to habitat',
      hb_sync: 'NOAA sync',
      hb_pushed: 'Twin state stored as reading {id}.',
      hb_alert_new: 'Habitat alert: {t}',
      hb_resolved: 'Alert {id} resolved.',
      hb_synced: 'NOAA S{s} stored as reading {id}.',
      hb_err: 'Habitat link error: {e}',
      hb_now: 'just now',
      hb_ago: '{m} min ago',
      hb_agoh: '{h} h ago',
      hb_note: 'Stored readings come from the backend database (wearable simulator, NOAA sync or this twin). The twin itself stays simulated.'
    },
    ar: {
      hb_title: 'رابط الموئل',
      hb_on: 'قاعدة بيانات الموئل متصلة',
      hb_off: 'خادم الموئل غير متصل',
      hb_rate: 'معدل الجهاز القابل للارتداء',
      hb_cum: 'الجرعة التراكمية',
      hb_hr: 'معدل ضربات القلب',
      hb_src: 'آخر قراءة',
      hb_none: 'لا توجد قراءات مخزنة بعد.',
      hb_alerts: 'تنبيهات قاعدة البيانات',
      hb_noalert: 'لا توجد تنبيهات نشطة.',
      hb_resolve: 'حل',
      hb_follow: 'اربط شريط الجرعة ببيانات الموئل',
      hb_push: 'أرسل حالة التوأم إلى الموئل',
      hb_sync: 'مزامنة NOAA',
      hb_pushed: 'تم حفظ حالة التوأم كقراءة رقم {id}.',
      hb_alert_new: 'تنبيه الموئل: {t}',
      hb_resolved: 'تم حل التنبيه {id}.',
      hb_synced: 'تم حفظ NOAA S{s} كقراءة رقم {id}.',
      hb_err: 'خطأ في رابط الموئل: {e}',
      hb_now: 'الآن',
      hb_ago: 'منذ {m} دقيقة',
      hb_agoh: 'منذ {h} ساعة',
      hb_note: 'القراءات المخزنة تأتي من قاعدة بيانات الخادم (محاكي الجهاز القابل للارتداء أو مزامنة NOAA أو هذا التوأم). يبقى التوأم نفسه محاكاة.'
    },
    es: {
      hb_title: 'Enlace del hábitat',
      hb_on: 'BASE DE DATOS DEL HÁBITAT EN LÍNEA',
      hb_off: 'SERVIDOR DEL HÁBITAT SIN CONEXIÓN',
      hb_rate: 'Tasa del wearable',
      hb_cum: 'Dosis acumulada',
      hb_hr: 'Frecuencia cardiaca',
      hb_src: 'Última lectura',
      hb_none: 'Aún no hay lecturas guardadas.',
      hb_alerts: 'Alertas de la base de datos',
      hb_noalert: 'Sin alertas activas.',
      hb_resolve: 'Resolver',
      hb_follow: 'Usar la dosis del hábitat en el control',
      hb_push: 'Enviar gemelo al hábitat',
      hb_sync: 'Sincronizar NOAA',
      hb_pushed: 'Estado del gemelo guardado como lectura {id}.',
      hb_alert_new: 'Alerta del hábitat: {t}',
      hb_resolved: 'Alerta {id} resuelta.',
      hb_synced: 'NOAA S{s} guardado como lectura {id}.',
      hb_err: 'Error del enlace del hábitat: {e}',
      hb_now: 'ahora',
      hb_ago: 'hace {m} min',
      hb_agoh: 'hace {h} h',
      hb_note: 'Las lecturas guardadas vienen de la base de datos del servidor (simulador del wearable, sincronización NOAA o este gemelo). El gemelo sigue siendo simulado.'
    }
  };
  var I = window.RCPTi18n;
  if (I && I.extend) Object.keys(STR).forEach(function (code) { I.extend(code, STR[code]); });
  function T(k, p) {
    if (I && I.t) return I.t(k, STR.en[k], p);
    var s = STR.en[k] || k;
    if (p) s = s.replace(/\{(\w+)\}/g, function (m, n) { return p[n] != null ? p[n] : m; });
    return s;
  }

  /* ---------------- 5. Habitat Link panel ---------------- */
  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var num = function (v, k) { var n = Number(v); return isFinite(n) ? n.toFixed(k == null ? 1 : k) : '—'; };
  function toast(text) {
    if (window.V15 && window.V15.toast) window.V15.toast(text);
    else if (window.console) console.info('[RCPT]', text);
  }
  function ago(iso) {
    if (!iso) return '';
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return T('hb_now');
    if (m < 90) return T('hb_ago', { m: m });
    return T('hb_agoh', { h: Math.round(m / 60) });
  }

  var st = {
    online: false, err: null, dash: null, busy: false,
    lastReadingId: null, alertIds: null, lastAiId: null,
    follow: false
  };
  try { st.follow = localStorage.getItem('rcpt.habitat.follow') === '1'; } catch (e) { /* ignore */ }

  var CSS =
    '.hb{display:grid;gap:8px;border-top:1px solid var(--line);padding-top:14px}' +
    '.hb-head{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '.hb-dot{width:8px;height:8px;border-radius:50%;background:var(--bad);box-shadow:0 0 8px var(--bad);flex:none}' +
    '.hb.on .hb-dot{background:var(--good);box-shadow:0 0 8px var(--good)}' +
    '.hb-status{font:700 .66rem ui-monospace,Consolas,monospace;letter-spacing:.06em;color:var(--bad)}' +
    '.hb.on .hb-status{color:var(--good)}' +
    '.hb-crew{font-size:.8rem;line-height:1.35}.hb-crew span{display:block;color:var(--muted);font-size:.7rem}' +
    '.hb-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}' +
    '.hb-cell{background:rgba(12,24,42,.55);border:1px solid var(--line);border-radius:8px;padding:6px 8px;min-width:0}' +
    '.hb-cell small{display:block;font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.hb-cell b{font:700 .86rem ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}' +
    '.hb-cell em{display:block;font-style:normal;font-size:.62rem;color:var(--muted);direction:ltr;unicode-bidi:isolate}' +
    '.hb-bar{height:5px;border-radius:99px;background:#0c182a;overflow:hidden}.hb-bar i{display:block;height:100%;width:0;background:var(--good);transition:width .4s}' +
    '.hb-crew b{color:var(--aqua,#A0E0EF)}' +
    '.hb-sub{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}' +
    '.hb-alert{display:flex;gap:8px;align-items:center;justify-content:space-between;border-radius:8px;padding:7px 9px;background:rgba(255,178,36,.12);border:1px solid rgba(255,178,36,.45);font-size:.74rem}' +
    '.hb-alert.crit{background:rgba(255,93,77,.14);border-color:rgba(255,93,77,.55)}' +
    '.hb-alert b{display:block;font-size:.62rem;letter-spacing:.06em;color:var(--warn)}.hb-alert.crit b{color:var(--bad)}' +
    '.hb-chk{display:flex;align-items:center;gap:6px;font-size:.76rem;color:var(--muted);cursor:pointer}' +
    '.hb-row{display:flex;flex-wrap:wrap;gap:6px}.hb .tb[disabled]{opacity:.5;cursor:wait}';

  var root = null;
  function $(id) { return document.getElementById(id); }

  function mount() {
    var side = document.querySelector('#app .side') || document.querySelector('.side');
    if (!side || $('hb')) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    root = document.createElement('section');
    root.className = 'hb';
    root.id = 'hb';
    root.setAttribute('aria-label', T('hb_title'));
    root.innerHTML =
      '<div class="hb-head"><h4 data-i18n="hb_title">' + esc(T('hb_title')) + '</h4><span class="hb-dot" aria-hidden="true"></span></div>' +
      '<div class="hb-status" id="hbStatus" role="status"></div>' +
      '<div class="hb-crew" id="hbCrew"></div>' +
      '<div class="hb-grid" id="hbGrid"></div>' +
      '<div class="hb-bar" aria-hidden="true"><i id="hbBar"></i></div>' +
      '<div class="hb-sub" data-i18n="hb_alerts">' + esc(T('hb_alerts')) + '</div>' +
      '<div id="hbAlerts" style="display:grid;gap:6px"></div>' +
      '<label class="hb-chk"><input type="checkbox" id="hbFollow"> <span data-i18n="hb_follow">' + esc(T('hb_follow')) + '</span></label>' +
      '<div class="hb-row"><button class="tb" type="button" id="hbPush" data-i18n="hb_push">' + esc(T('hb_push')) + '</button>' +
      '<button class="tb" type="button" id="hbSync" data-i18n="hb_sync">' + esc(T('hb_sync')) + '</button></div>' +
      '<p class="fine" style="margin:0" data-i18n="hb_note">' + esc(T('hb_note')) + '</p>';
    side.appendChild(root);

    $('hbFollow').checked = st.follow;
    $('hbFollow').addEventListener('change', function () {
      st.follow = this.checked;
      try { localStorage.setItem('rcpt.habitat.follow', st.follow ? '1' : '0'); } catch (e) { /* ignore */ }
      if (st.follow && st.dash) applyDose(st.dash.latestReading);
    });
    $('hbPush').addEventListener('click', pushTwin);
    $('hbSync').addEventListener('click', syncNoaa);
    $('hbAlerts').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-alert]');
      if (b) resolveAlert(b.getAttribute('data-alert'), b);
    });
    document.addEventListener('rcpt:lang', render);
    render();
  }

  function render() {
    if (!root) return;
    root.classList.toggle('on', st.online);
    var d = st.dash || {};
    var a = d.astronaut || ASTRO;
    var r = d.latestReading;
    var limit = Number(a && a.safe_dose_limit_msv) || 50;

    $('hbStatus').textContent = st.online ? T('hb_on') : T('hb_off');
    $('hbStatus').title = st.err || '';
    $('hbCrew').innerHTML = a
      ? '<b>' + esc(a.full_name) + '</b><span>' + esc([a.mission_role, a.blood_type ? 'Blood ' + a.blood_type : ''].filter(Boolean).join(' · ')) + '</span>'
      : '';

    if (r) {
      var rate = Number(r.radiation_rate_usv_hr);
      var cum = Number(r.cumulative_dose_msv);
      $('hbGrid').innerHTML =
        '<div class="hb-cell"><small>' + esc(T('hb_rate')) + '</small><b>' + num(rate, 1) + '</b> <em>µSv/hr · ' + num(rate / 1000, 2) + ' mSv/hr</em></div>' +
        '<div class="hb-cell"><small>' + esc(T('hb_cum')) + '</small><b>' + num(cum, 2) + '</b> <em>/ ' + num(limit, 0) + ' mSv</em></div>' +
        '<div class="hb-cell"><small>' + esc(T('hb_hr')) + '</small><b>' + esc(r.heart_rate_bpm != null ? r.heart_rate_bpm : '—') + '</b> <em>bpm</em></div>' +
        '<div class="hb-cell"><small>' + esc(T('hb_src')) + '</small><b style="font-size:.7rem">' + esc(r.data_source || '—') + '</b><em>' + esc(ago(r.recorded_at)) +
        (r.noaa_s_scale ? ' · S' + esc(r.noaa_s_scale) : '') + '</em></div>';
      var pct = isFinite(cum) ? Math.max(0, Math.min(100, (cum / limit) * 100)) : 0;
      var bar = $('hbBar');
      bar.style.width = pct + '%';
      bar.style.background = pct >= 100 ? 'var(--bad)' : pct >= 80 ? 'var(--warn)' : 'var(--good)';
    } else {
      $('hbGrid').innerHTML = '<p class="fine" style="grid-column:1/-1;margin:0">' + esc(st.online ? T('hb_none') : '—') + '</p>';
      $('hbBar').style.width = '0';
    }

    var alerts = d.activeAlerts || [];
    $('hbAlerts').innerHTML = alerts.length
      ? alerts.map(function (al) {
          var crit = String(al.severity || '').toUpperCase() === 'CRITICAL';
          return '<div class="hb-alert' + (crit ? ' crit' : '') + '"><div><b>' + esc(al.severity || 'ACTIVE') + '</b>' + esc(al.title) +
            '</div><button class="tb" type="button" data-alert="' + esc(al.id) + '">' + esc(T('hb_resolve')) + '</button></div>';
        }).join('')
      : '<p class="fine" style="margin:0">' + esc(st.online ? T('hb_noalert') : '—') + '</p>';

    $('hbPush').disabled = st.busy || !st.online;
    $('hbSync').disabled = st.busy || !st.online;
  }

  function demoActive() {
    var hud = $('nv-demo');
    return !!(hud && !hud.hidden);
  }
  function applyDose(r) {
    if (!r || !window.RCPT) return;
    var mSv = Number(r.radiation_rate_usv_hr) / 1000;
    if (!isFinite(mSv)) return;
    if ((window.RCPT.isRunning && window.RCPT.isRunning()) || demoActive()) return;
    window.RCPT.setInputs({ d: mSv });
  }

  function handle(d) {
    var first = st.dash === null;
    st.dash = d || {};
    var r = st.dash.latestReading;
    if (r && r.id !== st.lastReadingId) {
      st.lastReadingId = r.id;
      if (st.follow) applyDose(r);
    }

    var ids = (st.dash.activeAlerts || []).map(function (a) { return String(a.id); });
    if (!first && st.alertIds) {
      (st.dash.activeAlerts || []).forEach(function (a) {
        if (st.alertIds.indexOf(String(a.id)) < 0) toast(T('hb_alert_new', { t: a.title }));
      });
    }
    st.alertIds = ids;

    // Proactive AI instructions the backend writes when a database alert fires: let Nova say them.
    var logs = (st.dash.chatHistory || []).filter(function (m) { return m.sender === 'AI' && m.alert_id; });
    var maxId = logs.reduce(function (mx, m) { return Math.max(mx, Number(m.id) || 0); }, 0);
    if (st.lastAiId === null) {
      st.lastAiId = maxId;
    } else if (maxId > st.lastAiId) {
      logs.filter(function (m) { return Number(m.id) > st.lastAiId; }).forEach(function (m) {
        if (window.NovaAPI && window.NovaAPI.say) window.NovaAPI.say(String(m.message), { mood: 'alert', queue: true });
        else toast(String(m.message).slice(0, 140));
      });
      st.lastAiId = maxId;
    }
  }

  function fetchDash() {
    return api('GET', '/api/dashboard/' + AID, null, 8000).then(function (d) {
      st.online = true;
      st.err = null;
      handle(d);
    }, function (e) {
      st.online = false;
      st.err = e.message;
    }).then(render);
  }

  var pollTimer = null;
  var polling = false;
  function loop() {
    clearTimeout(pollTimer);
    if (polling) return; // a request is already in flight; it will schedule the next one
    polling = true;
    fetchDash().then(function () {
      polling = false;
      pollTimer = setTimeout(loop, document.hidden ? 20000 : st.online ? 5000 : 10000);
    });
  }

  function busy(on) { st.busy = on; render(); }

  function pushTwin() {
    var s = window.RCPT && window.RCPT.getState();
    if (!s || st.busy) return;
    var lr = st.dash && st.dash.latestReading;
    busy(true);
    api('POST', '/api/readings', {
      astronaut_id: AID,
      radiation_rate_usv_hr: Math.round(s.d * 1000 * 10) / 10,
      radiation_type: s.d >= 10 ? 'SPE' : 'GCR',
      heart_rate_bpm: lr && lr.heart_rate_bpm != null ? Number(lr.heart_rate_bpm) : 75,
      data_source: 'RCPT_TWIN'
    }, 60000).then(function (res) {
      toast(T('hb_pushed', { id: res && res.reading ? res.reading.id : '?' }));
    }, function (e) {
      toast(T('hb_err', { e: e.message }));
    }).then(function () { busy(false); return fetchDash(); });
  }

  function syncNoaa() {
    if (st.busy) return;
    busy(true);
    api('GET', '/api/space-weather/sync?astronautId=' + AID, null, 60000).then(function (res) {
      toast(T('hb_synced', { s: res.sScale, id: res.reading ? res.reading.id : '?' }));
    }, function (e) {
      toast(T('hb_err', { e: e.message }));
    }).then(function () { busy(false); return fetchDash(); });
  }

  function resolveAlert(id, btn) {
    if (btn) btn.disabled = true;
    api('PATCH', '/api/alerts/' + encodeURIComponent(id) + '/resolve', {}).then(function () {
      toast(T('hb_resolved', { id: id }));
    }, function (e) {
      toast(T('hb_err', { e: e.message }));
    }).then(fetchDash);
  }

  function init() {
    mount();
    loop();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loop(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.RCPTHabitat = { refresh: fetchDash, state: function () { return st; }, boot: BOOT };
})();
