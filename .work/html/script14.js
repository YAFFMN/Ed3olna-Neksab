/* Daily Crew Wellness Quests (v1.5): a checklist on the main dashboard that awards mission points, raises readiness tiers,
   keeps streaks and unlocks badges. Per crew member, stored on this device only. Live-state quests appear when the model
   says they are relevant (storm, high sleep debt, low HRV). The point values, tiers and the morale index are game design
   ASSUMPTIONS, not clinical measures. */
(function () {
  'use strict';
  var U = window.RCPTUI, esc = U.esc, RC = window.RCPT;
  var L = function (k, p) { return window.V15 ? window.V15.L(k, p) : k; };
  var $ = function (i) { return document.getElementById(i); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var todayISO = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };

  var CORE = [
    { id: 'ex', pts: 30, ic: '🏋', key: 'q_ex' }, { id: 'bp', pts: 10, ic: '🩺', key: 'q_bp' }, { id: 'sleep', pts: 25, ic: '🌙', key: 'q_sleep' },
    { id: 'hyd', pts: 10, ic: '💧', key: 'q_hyd' }, { id: 'dose', pts: 15, ic: '☢', key: 'q_dose' }, { id: 'morale', pts: 15, ic: '🎲', key: 'q_morale' }
  ];
  var AUTO = [{ id: 'body', pts: 10, ic: '🫀', key: 'q_body', hint: 'q_body_h' }, { id: 'eye', pts: 10, ic: '👁', key: 'q_eye', hint: 'q_eye_h' }];
  var CTX = [
    { id: 'storm', pts: 50, ic: '⚡', key: 'q_storm', test: function (s) { return s.tier === 'emergency' || s.d >= 10; } },
    { id: 'rest', pts: 30, ic: '🛏', key: 'q_rest', test: function (s, e) { return e.s >= 6; } },
    { id: 'breath', pts: 15, ic: '🌬', key: 'q_breath', test: function (s, e) { return e.h < 40; } }
  ];
  var ALL = {}; CORE.concat(AUTO, CTX).forEach(function (q) { ALL[q.id] = q; });
  var LEVELS = [[0, 'lvl0'], [100, 'lvl1'], [300, 'lvl2'], [700, 'lvl3'], [1400, 'lvl4']];
  var FULL_BONUS = 20, STREAK_MIN = 5;   // 5 of 6 core quests keep a streak alive (ASSUMED)
  var BADGES = [
    { id: 'first', ic: '🌱', t: function (r) { return sum(r.tot) >= 1; } },
    { id: 'iron', ic: '🛡', t: function (r) { return (r.tot.ex || 0) >= 7; } },
    { id: 'sleeper', ic: '😴', t: function (r) { return (r.tot.sleep || 0) >= 5; } },
    { id: 'steady', ic: '🩺', t: function (r) { return (r.tot.bp || 0) >= 7; } },
    { id: 'morale', ic: '🎉', t: function (r) { return (r.tot.morale || 0) >= 5; } },
    { id: 'full', ic: '⭐', t: function (r) { return (r.full || 0) >= 1; } },
    { id: 's3', ic: '🔥', t: function (r) { return r.best >= 3; } },
    { id: 's7', ic: '🚀', t: function (r) { return r.best >= 7; } },
    { id: 'stormb', ic: '⚡', t: function (r) { return (r.tot.storm || 0) >= 1; } },
    { id: 'eyeb', ic: '👁', t: function (r) { return (r.tot.eye || 0) >= 1; } },
    { id: 'anat', ic: '🧍', t: function (r) { return (r.seen || []).length >= 7; } }
  ];
  function sum(o) { var n = 0; for (var k in o) n += o[k] || 0; return n; }

  var S = lsGet('rcpt.quests', null);
  if (!S || S.v !== 1) S = { v: 1, realDay: todayISO(), missionDay: 1, credit: false, sel: null, crew: {} };
  function save() { lsSet('rcpt.quests', S); }
  function crewList() { return (window.RCPTCrew && window.RCPTCrew.crew()) || [{ id: 'c1', name: 'Commander' }]; }
  function rec(id) {
    if (!S.crew[id]) S.crew[id] = { xp: 0, streak: 0, best: 0, badges: {}, today: {}, ctx: [], tot: {}, days: [], full: 0, bonus: false, seen: [] };
    return S.crew[id];
  }
  function selId() { var c = crewList(); if (!S.sel || !c.some(function (x) { return x.id === S.sel; })) S.sel = c[0].id; return S.sel; }
  function levelOf(xp) { var i = 0; LEVELS.forEach(function (l, k) { if (xp >= l[0]) i = k; }); return i; }
  function coreDone(r) { return CORE.filter(function (q) { return r.today[q.id]; }).length; }
  function list(r) { return CORE.concat(AUTO, (r.ctx || []).map(function (id) { return ALL[id]; }).filter(Boolean)); }

  /* ---- scoring ---- */
  function award(cid, delta) { var r = rec(cid), lv = levelOf(r.xp); r.xp = Math.max(0, r.xp + delta); var nl = levelOf(r.xp); if (nl > lv && delta > 0) { levelUp(cid, nl); } }
  function levelUp(cid, nl) {
    var nm = nameOf(cid), t = L('lvl_up', { n: nm, l: L(LEVELS[nl][1]) });
    if (window.V15) window.V15.toast('🎖 ' + t); if (window.NovaAPI) window.NovaAPI.say(t, { mood: 'happy' });
    if (window.RCPTHist) window.RCPTHist.add({ kind: 'quest', title: 'Level up: ' + L(LEVELS[nl][1]), note: nm });
  }
  function nameOf(cid) { var c = crewList().filter(function (x) { return x.id === cid; })[0]; return c ? c.name : cid; }
  function checkBadges(cid) {
    var r = rec(cid);
    BADGES.forEach(function (b) {
      if (!r.badges[b.id] && b.t(r)) {
        r.badges[b.id] = Date.now(); var t = L('badge_got', { n: nameOf(cid), b: L('bd_' + b.id) });
        if (window.V15) window.V15.toast(b.ic + ' ' + t); if (window.NovaAPI) window.NovaAPI.say(t, { mood: 'happy' });
        if (window.RCPTHist) window.RCPTHist.add({ kind: 'quest', title: 'Badge: ' + L('bd_' + b.id), note: nameOf(cid) });
      }
    });
  }
  function complete(qid, cid, on) {
    cid = cid || selId(); var q = ALL[qid]; if (!q) return false; var r = rec(cid), was = !!r.today[qid];
    if (on == null) on = !was; if (on === was) return was;
    if (on) {
      r.today[qid] = Date.now(); r.tot[qid] = (r.tot[qid] || 0) + 1; award(cid, q.pts);
      if (S.credit && (qid === 'sleep' || qid === 'rest') && RC.getState()) { RC.setInputs({ s: Math.max(0, RC.getState().s - (qid === 'sleep' ? 1 : 1.5)) }); }
      if (!r.bonus && coreDone(r) === CORE.length) { r.bonus = true; r.full = (r.full || 0) + 1; award(cid, FULL_BONUS); if (window.V15) window.V15.toast('⭐ ' + L('q_full', { n: nameOf(cid), p: FULL_BONUS })); }
    } else {
      delete r.today[qid]; r.tot[qid] = Math.max(0, (r.tot[qid] || 1) - 1); award(cid, -q.pts);
      if (r.bonus && coreDone(r) < CORE.length) { r.bonus = false; r.full = Math.max(0, (r.full || 1) - 1); award(cid, -FULL_BONUS); }
    }
    checkBadges(cid); save(); render(); document.dispatchEvent(new CustomEvent('rcpt:quest', { detail: { id: qid, crew: cid, on: on } })); return on;
  }
  function advanceDay(quiet) {
    crewList().forEach(function (c) {
      var r = rec(c.id), n = coreDone(r);
      r.days.push({ d: S.missionDay, done: Object.keys(r.today) }); r.days = r.days.slice(-14);
      r.streak = n >= STREAK_MIN ? r.streak + 1 : 0; r.best = Math.max(r.best, r.streak);
      r.today = {}; r.ctx = []; r.bonus = false; checkBadges(c.id);
    });
    S.missionDay++; S.realDay = todayISO(); save(); render();
    if (!quiet && window.V15) window.V15.toast('☀ ' + L('q_newday', { d: S.missionDay }));
    document.dispatchEvent(new CustomEvent('rcpt:quest-day', { detail: S.missionDay }));
  }
  function adherence(cid, qid, days) {
    days = days || 7; var r = rec(cid), n = 0, done = r.today[qid] ? 1 : 0, past = r.days.slice(-(days - 1));
    past.forEach(function (d) { if (d.done.indexOf(qid) >= 0) done++; }); n = Math.min(days, past.length + 1); return n ? done / n : 0;
  }
  function morale(cid) { return Math.round(100 * adherence(cid, 'morale', 7)); }

  /* ---- live-state quests ---- */
  var ctxSig = '';
  RC.onUpdate(function (s) {
    var changed = false;
    crewList().forEach(function (c) {
      var e = window.RCPTCrew ? window.RCPTCrew.eff(c, s) : { s: s.s, h: s.h }, r = rec(c.id);
      CTX.forEach(function (q) { if (!r.today[q.id] && r.ctx.indexOf(q.id) < 0 && q.test(s, e)) { r.ctx.push(q.id); changed = true; if (c.id === selId() && window.NovaAPI && q.id !== 'breath') window.NovaAPI.say(L('q_ctx_say', { q: L(q.key) }), { mood: 'alert' }); } });
    });
    if (changed) { save(); render(); }
  });

  /* ---- UI ---- */
  function render() {
    var el = $('quests'); if (!el) return; var cid = selId(), r = rec(cid), lv = levelOf(r.xp), nx = LEVELS[lv + 1], cr = crewList(), n = coreDone(r);
    var pct = nx ? Math.round(100 * (r.xp - LEVELS[lv][0]) / (nx[0] - LEVELS[lv][0])) : 100;
    var qs = list(r).map(function (q) {
      var on = !!r.today[q.id], isCtx = CTX.indexOf(q) >= 0, isAuto = AUTO.indexOf(q) >= 0;
      return '<label class="qs-q' + (on ? ' on' : '') + (isCtx ? ' ctx' : '') + '"><input type="checkbox" data-q="' + q.id + '"' + (on ? ' checked' : '') + '><span class="qs-ic" aria-hidden="true">' + q.ic + '</span><span class="qs-t">' + esc(L(q.key)) + (isCtx ? ' <i class="qs-tag">' + esc(L('q_live')) + '</i>' : '') + (isAuto ? ' <i class="qs-tag a">' + esc(L('q_auto')) + '</i>' : '') + (q.hint ? '<small>' + esc(L(q.hint)) + '</small>' : '') + '</span><b class="qs-p">+' + q.pts + '</b></label>';
    }).join('');
    var badges = BADGES.map(function (b) { var got = r.badges[b.id]; return '<span class="qs-b' + (got ? ' got' : '') + '" title="' + esc(L('bd_' + b.id) + ' · ' + L('bd_' + b.id + '_d')) + '" aria-label="' + esc(L('bd_' + b.id) + (got ? ' ✓' : ' 🔒')) + '">' + b.ic + '</span>'; }).join('');
    var team = cr.map(function (c) { var rr = rec(c.id), l = levelOf(rr.xp); return '<tr data-c="' + c.id + '" class="' + (c.id === cid ? 'sel' : '') + '"><td>' + esc(c.name) + '</td><td>' + esc(L(LEVELS[l][1])) + '</td><td class="num">' + rr.xp + '</td><td class="num">' + coreDone(rr) + '/' + CORE.length + '</td></tr>'; }).join('');
    var teamXp = cr.reduce(function (a, c) { return a + rec(c.id).xp; }, 0);
    el.innerHTML = '<div class="qs-h"><h5 id="qsH">' + esc(L('q_title')) + ' <button type="button" class="exb" data-explain="v15_quests" aria-label="?">?</button></h5><span class="qs-day" id="qsDay">' + esc(L('q_day', { d: S.missionDay })) + '</span><label class="sr" for="qsSel">' + esc(L('q_crew')) + '</label><select id="qsSel">' + cr.map(function (c) { return '<option value="' + c.id + '"' + (c.id === cid ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select><button type="button" class="tb" id="qsAdv">' + esc(L('q_adv')) + '</button></div>' +
      '<div class="qs-grid"><div class="qs-list" role="group" aria-labelledby="qsH"><div class="qs-prog"><span id="qsProg">' + esc(L('q_prog', { n: n, t: CORE.length })) + '</span><div class="bar-in"><i style="width:' + Math.round(100 * n / CORE.length) + '%;background:#35d08a"></i></div></div>' + qs + '<p class="fine">' + esc(L('q_note')) + '</p></div>' +
      '<div class="qs-side"><div class="qs-lv"><div class="qs-lvn" id="qsLv">' + esc(L(LEVELS[lv][1])) + '</div><div class="fine">' + r.xp + ' XP' + (nx ? ' · ' + esc(L('q_next', { x: nx[0] - r.xp, l: L(nx[1]) })) : ' · ' + esc(L('q_max'))) + '</div><div class="bar-in"><i style="width:' + pct + '%;background:#17a9f0"></i></div><div class="qs-st"><span>🔥 ' + esc(L('q_streak', { n: r.streak })) + '</span><span>🎉 ' + esc(L('q_moralev', { n: morale(cid) })) + '</span></div></div>' +
      '<div class="qs-bw" aria-label="' + esc(L('q_badges')) + '">' + badges + '</div>' +
      '<table class="qs-team"><thead><tr><th>' + esc(L('q_crew')) + '</th><th>' + esc(L('q_tier')) + '</th><th>XP</th><th>' + esc(L('q_done')) + '</th></tr></thead><tbody>' + team + '</tbody></table><div class="fine">' + esc(L('q_team', { x: teamXp })) + '</div>' +
      '<label class="qs-cr"><input type="checkbox" id="qsCr"' + (S.credit ? ' checked' : '') + '> ' + esc(L('q_credit')) + '</label></div></div>';
    el.querySelectorAll('[data-q]').forEach(function (b) { b.onchange = function () { complete(b.getAttribute('data-q'), cid, b.checked); }; });
    el.querySelector('#qsSel').onchange = function () { S.sel = this.value; save(); render(); };
    el.querySelector('#qsAdv').onclick = function () { advanceDay(); };
    el.querySelector('#qsCr').onchange = function () { S.credit = this.checked; save(); };
    el.querySelectorAll('.qs-team tr[data-c]').forEach(function (tr) { tr.onclick = function () { S.sel = tr.getAttribute('data-c'); save(); render(); }; });
  }
  function mount() {
    if ($('quests')) return; var f = $('footer'), sec = document.createElement('section'); sec.id = 'quests'; sec.className = 'quests'; sec.setAttribute('aria-label', 'Daily Crew Wellness Quests');
    f.parentNode.insertBefore(sec, f); render();
  }
  document.addEventListener('DOMContentLoaded', mount);
  document.addEventListener('rcpt:launch', function () { mount(); if (S.realDay !== todayISO()) advanceDay(true); render(); });
  document.addEventListener('rcpt:lang', render);
  document.addEventListener('rcpt:avatar-open', function (e) { complete('body', (e.detail && e.detail.crew) || selId(), true); });
  document.addEventListener('rcpt:avatar-view', function (e) { var cid = (e.detail && e.detail.crew) || selId(), r = rec(cid); if (r.seen.indexOf(e.detail.sys) < 0) { r.seen.push(e.detail.sys); checkBadges(cid); save(); render(); } });
  document.addEventListener('rcpt:image-done', function (e) { complete('eye', (e.detail && e.detail.crew) || selId(), true); });

  window.RCPTQuests = {
    complete: complete, advanceDay: advanceDay, render: render, adherence: adherence, morale: morale, sel: selId, select: function (id) { S.sel = id; save(); render(); },
    level: function (cid) { return levelOf(rec(cid || selId()).xp); }, xp: function (cid) { return rec(cid || selId()).xp; }, rec: function (cid) { return rec(cid || selId()); },
    missionDay: function () { return S.missionDay; }, setMissionDay: function (n) { S.missionDay = Math.max(1, Math.min(2000, Math.round(+n) || 1)); save(); render(); document.dispatchEvent(new CustomEvent('rcpt:quest-day', { detail: S.missionDay })); },
    reset: function () { S = { v: 1, realDay: todayISO(), missionDay: 1, credit: false, sel: null, crew: {} }; save(); render(); },
    quests: function () { return list(rec(selId())).map(function (q) { return q.id; }); }, LEVELS: LEVELS, BADGES: BADGES.map(function (b) { return b.id; }), coreCount: CORE.length,
    summary: function () { var cid = selId(), r = rec(cid); return { name: nameOf(cid), done: coreDone(r), total: CORE.length, xp: r.xp, level: L(LEVELS[levelOf(r.xp)][1]), streak: r.streak }; }
  };
})();
