/* Shared UI helpers: full-screen tabbed panel, "explain this number" popup. Plain DOM, no frameworks. */
(function () {
  var T = function (k, f, p) { return window.RCPTi18n ? window.RCPTi18n.t(k, f, p) : f; };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (n, k) { return (+n).toFixed(k == null ? 1 : k); };
  var openPanels = [];

  /* panel({id,title,tabs:[{id,label,render(el,api)}]}) -> {open(tabId),close,isOpen,tab(),refresh()} */
  function panel(o) {
    var root = document.createElement('div'); root.className = 'pn'; root.id = o.id; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', o.title);
    root.innerHTML = '<header class="pn-h"><div class="pn-t"></div><div class="pn-tabs" role="tablist"></div><button type="button" class="pn-x"></button></header><div class="pn-b" aria-live="polite"></div>';
    document.body.appendChild(root);
    var tabsEl = root.querySelector('.pn-tabs'), body = root.querySelector('.pn-b'), cur = o.tabs[0].id, isOpen = false, lastFocus = null;
    var api = { el: body, root: root };
    function build() {
      root.querySelector('.pn-t').textContent = typeof o.title === 'function' ? o.title() : o.title;
      root.querySelector('.pn-x').textContent = T('close', 'Close') + ' · Esc';
      tabsEl.innerHTML = o.tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t.id + '" aria-selected="' + (t.id === cur) + '">' + esc(T(t.key, t.label)) + '</button>'; }).join('');
    }
    function render() { build(); var t = o.tabs.filter(function (x) { return x.id === cur; })[0]; body.innerHTML = ''; t.render(body, api); }
    function open(tab) { if (tab) cur = tab; lastFocus = document.activeElement; root.hidden = false; isOpen = true; if (openPanels.indexOf(api) < 0) openPanels.push(api); render(); var x = root.querySelector('.pn-x'); x.focus(); document.dispatchEvent(new CustomEvent('rcpt:panel', { detail: { id: o.id, tab: cur } })); }
    function close() { root.hidden = true; isOpen = false; openPanels = openPanels.filter(function (p) { return p !== api; }); if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { } }
    tabsEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { cur = b.getAttribute('data-tab'); render(); } });
    root.querySelector('.pn-x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (isOpen && e.key === 'Escape' && document.getElementById('xp').hidden) { close(); e.stopPropagation(); } });
    document.addEventListener('rcpt:lang', function () { if (isOpen) render(); });
    api.open = open; api.close = close; api.isOpen = function () { return isOpen; }; api.tab = function () { return cur; }; api.refresh = function () { if (isOpen) render(); };
    return api;
  }

  /* ---- explain popup ---- */
  var xp = document.createElement('div'); xp.id = 'xp'; xp.className = 'xp'; xp.hidden = true; xp.setAttribute('role', 'dialog'); xp.setAttribute('aria-modal', 'true');
  xp.innerHTML = '<div class="xp-c"><div id="xp-body"></div><div style="margin-top:14px"><button type="button" class="pn-x" id="xp-x"></button></div></div>';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(xp); });
  if (document.body) document.body.appendChild(xp);
  var xpLast = null;
  function showExplain(topic) {
    var ex = window.RCPTExplain && window.RCPTExplain.build(topic); if (!ex) return false;
    xpLast = document.activeElement; xp.querySelector('#xp-body').innerHTML = '<h3>' + esc(ex.title) + '</h3>' + ex.html + '<div class="own">' + esc(T('x_note', 'Simulated values. Research prototype, not a medical device. Weights and thresholds are assumptions, not clinical findings.')) + '</div>';
    xp.querySelector('#xp-x').textContent = T('close', 'Close') + ' · Esc'; xp.hidden = false; xp.querySelector('#xp-x').focus();
    document.dispatchEvent(new CustomEvent('rcpt:explain', { detail: topic })); return true;
  }
  function hideExplain() { xp.hidden = true; if (xpLast && xpLast.focus) try { xpLast.focus(); } catch (e) { } }
  xp.addEventListener('click', function (e) { if (e.target === xp || e.target.id === 'xp-x') hideExplain(); });
  document.addEventListener('keydown', function (e) { if (!xp.hidden && e.key === 'Escape') { hideExplain(); e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-explain]'); if (b) { e.preventDefault(); showExplain(b.getAttribute('data-explain')); } });

  window.RCPTUI = { panel: panel, esc: esc, fmt: fmt, T: T, explain: showExplain, closeExplain: hideExplain, anyOpen: function () { return openPanels.length > 0 || !xp.hidden; } };
})();
