/* v1.5 shared helpers: translated string lookup (V15.L) and a small toast. Loaded before the v1.5 modules. */
(function () {
  'use strict';
  var IDX = { en: 0, ar: 1, es: 2 };
  function L(k, p, lang) {
    var tb = window.V15_STR && window.V15_STR[k], I = window.RCPTi18n, fb = typeof p === 'string' ? p : null;
    if (typeof p === 'string') p = null;
    if (!tb) return fb != null ? fb : (I ? I.t(k, k, p) : k);
    var out;
    if (lang && IDX[lang] != null) out = tb[IDX[lang]] || tb[0];
    else out = I ? I.t(k, tb[0], null) : tb[0];
    if (p) out = out.replace(/\{(\w+)\}/g, function (m, n) { return p[n] != null ? p[n] : m; });
    return out;
  }
  var toastEl = null, toastT = null;
  function toast(text) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'v15toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
    toastEl.textContent = text; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 4200);
  }
  window.V15 = { L: L, toast: toast, version: '1.5.0' };
})();
