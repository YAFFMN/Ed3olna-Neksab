/* v1.5 glue: toolbar buttons, keyboard shortcuts, "explain this number" topics and the companion's new intents.
   Loaded after the four v1.5 modules. */
(function () {
  'use strict';
  var V = window.V15, L = V.L, U = window.RCPTUI, esc = U.esc, RC = window.RCPT, fmt = U.fmt;
  var $ = function (i) { return document.getElementById(i); };

  /* ---- toolbar ---- */
  var on = function (id, fn) { var b = $(id); if (b) b.addEventListener('click', fn); };
  on('avBtn', function () { window.RCPTAvatar.open(); });
  on('imgBtn', function () { window.RCPTOptic.open(); });
  on('linkBtn', function () { window.RCPTScience.open('link'); });

  /* ---- keyboard: I image, A avatar, L ground link ---- */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (!$('app').classList.contains('on') || U.anyOpen()) return;
    var t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    var openM = document.querySelector('.nv-modal:not([hidden]),.nv-modal.open'); if (openM) return;
    if (document.body.classList.contains('orion-open')) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'i') window.RCPTOptic.open(); else if (k === 'a') window.RCPTAvatar.open(); else if (k === 'l') window.RCPTScience.open('link');
  });

  /* ---- explain topics ---- */
  var origBuild = window.RCPTExplain && window.RCPTExplain.build;
  function bl(a) { return '<ul>' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function explainV15(topic) {
    var m;
    if ((m = /^v15_av_(\w+)$/.exec(topic))) {
      var sys = m[1], x = window.RCPTAvatar.context(), s = x.m, eq = '', note = L('x_av_note');
      var f = function (n) { return fmt(n); };
      if (sys === 'cns') eq = 'index = 0.8·f_sleep + 0.1·f_rad + 2·(0.05·d·s)\n= 0.8·' + f(s.fs) + ' + 0.1·' + f(s.fr) + ' + 2·' + f(x.it1) + ' = ' + f(0.8 * s.fs + 0.1 * s.fr + 2 * x.it1);
      else if (sys === 'cardio') eq = 'index = 0.9·f_hrv + 2·(0.03·d·f_hrv)\n= 0.9·' + f(s.fh) + ' + 2·' + f(x.it2) + ' = ' + f(0.9 * s.fh + 2 * x.it2);
      else if (sys === 'resp') eq = 'index = 0.5·f_rad + 0.1·f_sleep\n= 0.5·' + f(s.fr) + ' + 0.1·' + f(s.fs) + ' = ' + f(0.5 * s.fr + 0.1 * s.fs);
      else if (sys === 'gi') eq = 'index = 0.6·f_rad + 0.1·f_sleep\n= 0.6·' + f(s.fr) + ' + 0.1·' + f(s.fs) + ' = ' + f(0.6 * s.fr + 0.1 * s.fs);
      else if (sys === 'skin') eq = 'index = 0.8·f_rad = 0.8·' + f(s.fr) + ' = ' + f(0.8 * s.fr);
      else if (sys === 'skel') eq = 'BMD loss % = 1.0 × (days / 30.4) × (1 − 0.5 × exercise adherence)\n= 1.0 × (' + x.days + ' / 30.4) × (1 − 0.5 × ' + f(x.adh) + ') = ' + f(x.bone) + ' %\nindex = loss / 8 % × 100 = ' + f(x.bone / 8 * 100);
      else if (sys === 'musc') eq = 'strength loss % = 30 × (1 − e^(−days/60)) × (1 − 0.5 × adherence)\n= 30 × (1 − e^(−' + x.days + '/60)) × (1 − 0.5 × ' + f(x.adh) + ') = ' + f(x.muscle) + ' %\nindex = loss / 15 % × 100 = ' + f(x.muscle / 15 * 100);
      return { title: L('av_' + sys) + ': ' + L('x_av_t'), html: '<div class="eq">' + esc(eq).replace(/\n/g, '<br>') + '</div><p>' + esc(L('x_av_p')) + '</p>' + bl([esc(L('x_av_b1')), esc(L('x_av_b2')), esc(L('x_av_b3'))]) + '<p class="fine">' + esc(note) + '</p>' };
    }
    if (topic === 'v15_link') {
      var g = window.RCPTLink.geometry(new Date()), cur = window.RCPTLink; var gg = (function () { try { return cur.geometry(new Date(document.getElementById('lkDate') && document.getElementById('lkDate').value ? document.getElementById('lkDate').value + 'T12:00:00Z' : Date.now())); } catch (e) { return g; } })();
      return { title: L('x_lk_t'), html: '<div class="eq">t = distance / c = ' + fmt(gg.km / 1e6, 1) + ' × 10⁶ km / 299 792 km/s = ' + window.RCPTLink.mmss(gg.sec) + ' min:s<br>round trip = 2t = ' + window.RCPTLink.mmss(gg.sec * 2) + '</div><p>' + esc(L('x_lk_p')) + '</p>' + bl([esc(L('x_lk_b1')), esc(L('x_lk_b2', { d: window.RCPTLink.BLACKOUT_DEG })), esc(L('x_lk_b3', { m: window.RCPTLink.GROUND_REVIEW_MIN }))]) };
    }
    if (topic === 'v15_quests') return { title: L('x_q_t'), html: '<p>' + esc(L('x_q_p')) + '</p>' + bl([esc(L('x_q_b1')), esc(L('x_q_b2')), esc(L('x_q_b3')), esc(L('x_q_b4'))]) };
    if (topic === 'v15_optic') return { title: L('x_op_t'), html: '<p>' + esc(L('x_op_p')) + '</p>' + bl([esc(L('x_op_b1')), esc(L('x_op_b2')), esc(L('x_op_b3')), esc(L('x_op_b4'))]) + '<p class="fine">' + esc(L('op_disc')) + '</p>' };
    return null;
  }
  if (window.RCPTExplain) window.RCPTExplain.build = function (topic) { return /^v15_/.test(topic) ? explainV15(topic) : origBuild(topic); };

  /* ---- companion intents (Nova calls RCPTv15.nova and RCPTv15.decorate) ---- */
  var QMAP = [[/exercise|workout|resistance|training|gym/, 'ex'], [/blood pressure|\bbp\b/, 'bp'], [/sleep/, 'sleep'], [/hydrat|water|fluid/, 'hyd'], [/dosimeter|badge reading|dose log/, 'dose'], [/morale|social|hobby/, 'morale']];
  function nova(t, s, text) {
    var ar = /[؀-ۿ]/.test(text), lg = ar ? 'ar' : null, X = function (k, p) { return L(k, p, lg); }, ok = function (x) { return { kind: 'cmd', text: x }; }, m;
    var Link = window.RCPTLink, Q = window.RCPTQuests, O = window.RCPTOptic, A = window.RCPTAvatar;
    /* ground link */
    if (Link) {
      if (/\b(go|switch|enter|turn)\b.*\b(autonom\w+|offline|blackout)\b|\b(lose|lost|drop|cut)\b.*\b(link|signal|comms?)\b|\blink (is )?down\b|autonomous mode on|^autonomous$/.test(t) || /انقطع|استقلال|ذاتي|قطع الاتصال/.test(text) && /اتصال|الرابط|استقلال|ذاتي/.test(text)) { Link.setMode('down'); return ok(X('nv_link_down')); }
      if (/\b(restore|reconnect|resume|re-?establish|bring back)\b.*\b(link|signal|comms?|ground)\b|\blink (is )?up\b|\bground[- ]assisted\b/.test(t) || /استعادة الاتصال|أعد الاتصال|اعد الاتصال/.test(text)) { Link.setMode('up'); return ok(X('nv_link_up', { n: Link.queue().length })); }
      if (/\b(auto(matic)? link|follow (the )?geometry|link auto)\b/.test(t)) { Link.setMode('auto'); return ok(X('nv_link_auto')); }
      if (/\b(ground link|comms?|communications?|latency|light[- ]?time|signal (delay|time)|mission control|conjunction|how far is (earth|mars)|earth.{0,12}mars.{0,12}(delay|distance))\b/.test(t) || /تأخير الإشارة|زمن الاتصال|الاتصال بالأرض|مركز التحكم|التحكم الأرضي/.test(text)) {
        var g = Link.geometry(new Date(document.getElementById('lkDate') && document.getElementById('lkDate').value ? document.getElementById('lkDate').value + 'T12:00:00Z' : Date.now()));
        if (/\b(open|show|details|panel)\b/.test(t) && window.RCPTScience) window.RCPTScience.open('link');
        return ok(X(Link.autonomous() ? 'nv_link_stat_down' : 'nv_link_stat_up', { d: Link.mmss(g.sec), r: Link.mmss(g.sec * 2), a: g.au.toFixed(2) }));
      }
    }
    /* quests */
    if (Q) {
      if (/\b(mark|log|logged|complete|completed|finish|finished|tick|i did|i had|i've done|i have done)\b/.test(t) && !/\b(why|what|how|if|when|sim|simulation|demo)\b/.test(t)) {
        for (var i = 0; i < QMAP.length; i++) if (QMAP[i][0].test(t)) { var id = QMAP[i][1]; Q.complete(id, null, true); var sm = Q.summary(); return ok(X('nv_q_done', { q: X('q_' + id), n: sm.done, t: sm.total, x: sm.xp })); }
      }
      if (/\b(quests?|checklist|wellness|daily tasks?|streak|badges?|xp|readiness)\b/.test(t) || /المهام اليومية|مهام العافية|السلسلة|الشارات/.test(text)) { var q = Q.summary(); try { document.getElementById('quests').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { } return ok(X('nv_q_sum', { n: q.name, d: q.done, t: q.total, l: q.level, x: q.xp, s: q.streak })); }
    }
    /* image assessment */
    if (O && (/\b(assess|analy[sz]e|inspect|check|scan|photo|picture|image|camera|upload|capture)\b.*\b(eye|eyes|pupil|sclera|skin|rash|lesion|ultrasound|image|photo|picture)\b/.test(t) || /\b(image|optical|photo) (assessment|check)\b/.test(t) || /فحص (العين|الجلد|صورة)|حلل صورة|تحليل صورة|صورة/.test(text))) {
      var mode = /skin|rash|lesion|جلد/.test(text.toLowerCase()) ? 'skin' : /ultrasound|scan|echo|موجات/.test(text.toLowerCase()) ? 'scan' : 'eye'; O.open(mode); return ok(X('nv_img', { m: L('op_m_' + mode, null, lg) }));
    }
    /* avatar */
    if (A && (/\b(avatar|anatomy|organs?|body (map|model|view)|3d body|bone density|show (me )?(my )?body)\b/.test(t) || /الأفاتار|التشريح|الأعضاء|جسم الطاقم|الجسم/.test(text))) {
      var sys = /\b(heart|cardio\w*)\b|القلب/.test(text.toLowerCase()) ? 'cardio' : /\b(brain|cns|nervous)\b|الدماغ|المخ/.test(text.toLowerCase()) ? 'cns' : /\b(bone|skeleton|skeletal)\b|العظام/.test(text.toLowerCase()) ? 'skel' : /\b(muscle)\b|العضلات/.test(text.toLowerCase()) ? 'musc' : /\b(lungs?)\b|الرئتين/.test(text.toLowerCase()) ? 'resp' : null; A.open(sys); return ok(X('nv_av', { s: sys ? L('av_' + sys, null, lg) : L('av_title', null, lg) }));
    }
    return null;
  }
  function decorate(r, text) {
    var Link = window.RCPTLink; if (!Link || !Link.autonomous() || !r || !r.text) return r;
    if (r.kind === 'medical') { r.text = L('nv_med_aut', null, /[؀-ۿ]/.test(text) ? 'ar' : null); Link.log(L('nv_q_med'), 'nova'); return r; }
    if (r.kind === 'cmd' || r.kind === 'whatif' || r.kind === 'crew') { r.text = r.text + ' ' + L('nv_aut_tag'); if (r.kind !== 'crew') Link.log('Nova: ' + r.text.slice(0, 130), 'nova'); }
    return r;
  }
  window.RCPTv15 = { nova: nova, decorate: decorate };
})();
