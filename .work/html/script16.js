/* Optical / Image Assessment (v1.5): camera or file input, on-device image analysis, automatic cue tags and an inline protocol.
   HONEST SCOPE: this is classical image processing (colour statistics, segmentation, focus and exposure checks), NOT a trained
   medical AI and NOT a diagnosis. Thresholds are ASSUMED screening cues and depend on lighting and white balance. Images are
   processed in memory and never saved or sent anywhere; only text findings can be added to the History. */
(function () {
  'use strict';
  var U = window.RCPTUI, esc = U.esc, RC = window.RCPT;
  var L = function (k, p) { return window.V15 ? window.V15.L(k, p) : k; };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var IRIS_MM = 11.7;     // typical horizontal visible iris diameter (about 11-12 mm); used only to give a rough pupil size

  /* ---------------- image helpers ---------------- */
  function toWork(src, maxW) {
    var w0 = src.videoWidth || src.naturalWidth || src.width, h0 = src.videoHeight || src.naturalHeight || src.height, sc = Math.min(1, (maxW || 320) / w0), w = Math.max(8, Math.round(w0 * sc)), h = Math.max(8, Math.round(h0 * sc));
    var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h); return { w: w, h: h, d: x.getImageData(0, 0, w, h).data };
  }
  function gray(im) { var g = new Float32Array(im.w * im.h), d = im.d; for (var i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]; return g; }
  function blur(g, w, h, r) {
    var t = new Float32Array(g.length), o = new Float32Array(g.length), n = 2 * r + 1, x, y, k, s;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { s = 0; for (k = -r; k <= r; k++) s += g[y * w + clamp(x + k, 0, w - 1)]; t[y * w + x] = s / n; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { s = 0; for (k = -r; k <= r; k++) s += t[clamp(y + k, 0, h - 1) * w + x]; o[y * w + x] = s / n; }
    return o;
  }
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lab(r, g, b) {
    var R = lin(r), G = lin(g), B = lin(b), X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    var f = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  }
  function median(a) { if (!a.length) return 0; var s = Array.prototype.slice.call(a).sort(function (p, q) { return p - q; }); return s[s.length >> 1]; }
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : 0; }
  function pct(a, p) { var s = Array.prototype.slice.call(a).sort(function (x, y) { return x - y; }); return s[clamp(Math.floor(p * (s.length - 1)), 0, s.length - 1)]; }
  function lapVar(g, w, h) { var v = [], x, y; for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) { var i = y * w + x; v.push(g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i]); } var m = mean(v), s = 0; for (var k = 0; k < v.length; k++) s += (v[k] - m) * (v[k] - m); return s / v.length; }
  function ccl(mask, w, h) {
    var lab_ = new Int32Array(w * h), comps = [], id = 0, st = [], x, y;
    for (var i = 0; i < mask.length; i++) {
      if (!mask[i] || lab_[i]) continue; id++; var c = { id: id, area: 0, minx: w, maxx: 0, miny: h, maxy: 0, sx: 0, sy: 0 }; st.length = 0; st.push(i); lab_[i] = id;
      while (st.length) { var p = st.pop(); x = p % w; y = (p / w) | 0; c.area++; c.sx += x; c.sy += y; if (x < c.minx) c.minx = x; if (x > c.maxx) c.maxx = x; if (y < c.miny) c.miny = y; if (y > c.maxy) c.maxy = y;
        if (x > 0 && mask[p - 1] && !lab_[p - 1]) { lab_[p - 1] = id; st.push(p - 1); } if (x < w - 1 && mask[p + 1] && !lab_[p + 1]) { lab_[p + 1] = id; st.push(p + 1); } if (y > 0 && mask[p - w] && !lab_[p - w]) { lab_[p - w] = id; st.push(p - w); } if (y < h - 1 && mask[p + w] && !lab_[p + w]) { lab_[p + w] = id; st.push(p + w); } }
      c.cx = c.sx / c.area; c.cy = c.sy / c.area; comps.push(c);
    }
    return { labels: lab_, comps: comps };
  }

  /* ---------------- quality gate ---------------- */
  function quality(im, g) {
    var w = im.w, h = im.h, n = g.length, m = mean(g), clipHi = 0, clipLo = 0; for (var i = 0; i < n; i++) { if (g[i] > 250) clipHi++; else if (g[i] < 5) clipLo++; }
    var bl = blur(g, w, h, 1), lv = lapVar(bl, w, h), issues = [];
    if (m < 55) issues.push('dark'); if (m > 215 || clipHi / n > 0.12) issues.push('bright'); if (lv < 4) issues.push('blur'); if (Math.min(im.w, im.h) < 60) issues.push('small');
    return { mean: Math.round(m), clipHi: +(clipHi / n * 100).toFixed(1), clipLo: +(clipLo / n * 100).toFixed(1), focus: +lv.toFixed(1), issues: issues, ok: !issues.length };
  }

  /* ---------------- EYE v2: pupil / limbus / sclera ----------------
     Geometry-driven sclera segmentation (port of eye_analyzer.py). No bounding boxes:
       1. glare is detected and filled before geometry is fitted
       2. pupil = dark blob, refined by a radial-edge RANSAC circle
       3. limbus = fitted from LATERAL rays only (lids hide 12 and 6 o'clock), so it cannot overflow into the lids
       4. eyelid aperture = per-column scan outward from the limbus, stopping at the lash line / lid margin / skin hue
       5. sclera mask = aperture - iris - limbal ring - lid margin - glare - eyelash/shadow pixels
       5b. v2.1: ROI polygon is a hard mask; skin-gamut pixels removed before colour stats; sampling limited to two paralimbal convex hulls
       6. L*a*b* mean and red fraction over those pixels only (glare L*>90 / V>240 removed first; red = a*>12 AND R/(G+B)>0.60)                                               */
  var EC = {
    focusMin: 4, clipMaxFrac: 0.25, occlMaxFrac: 0.5, scleraMinFrac: 0.15,
    glareV: 242, glareS: 40 / 255, glareTop: 12, glareTopV: 200, glareDil: 2, glareBlobFrac: 0.01, glareAbove: 5,
    pupilPct: [2, 4, 7, 10, 14], pupilMinA: 0.0002, pupilMaxA: 0.15, pupilMinFill: 0.6, pupilMinContrast: 8,
    latDeg: 35, irisMinR: 1.35, irisMaxR: 6.5, irisMaxOff: 0.30, irisMinInl: 12, irisMinInlRatio: 0.4, limbMinContrast: 6,
    seedIn: 1.12, seedOut: 1.5, seedHalfH: 0.18, seedMinL: 30, scanStart: 1.05, scanEnd: 2.1, scanMaxHalf: 1.3,
    lidDrop: 16, chromaStop: 16, vesselW: 0.06, skinHueMin: 35, skinHueMax: 80, scanRedDa: 15, lashGap: 4, minColH: 0.08,
    limbalMargin: 0.10, lidMargin: 0.07, darkK: 2.5, darkMin: 10, lashBH: 8, vesselDa: 6, minCompFrac: 0.01, minValidFrac: 0.05,
    /* red fraction (absolute rule): a pixel is red only if a* > redA AND R/(G+B) > redRatio. White sclera sits near a* 0-6, R/(G+B) 0.50-0.57.
       Pixels with L* > hiL or HSV V > hiV are glare / blown-out: removed BEFORE colour classification. If more than hiMaxFrac of the sclera is that bright the red check is skipped. */
    redA: 12.0, redRatio: 0.60, hiL: 90, hiV: 242, hiMaxFrac: 0.6,   /* v2.3: glare = L* > 90 or V > 250 (spec). v2.2 had relaxed L* to 98 - raise hiL if bright, healthy sclera is being flagged */
     /* v2.3 robust rules: sclera pixels need L* >= darkLMin (filtered BEFORE any statistic); if valid pixels < validFracMin of the sclera search area the colour check is skipped (overexposed);
        landmark hull is rejected (fitted-lid fallback) when Area(hull) < hullIrisMinRatio * Area(iris) or > hullIrisMaxCover of it lies inside the iris; white-balance reference uses only near-achromatic pixels (Lab chroma <= wbNeutralChroma) so a red sclera cannot be 'corrected' away */
     validFracMin: 0.05, darkLMin: 40, hullIrisMinRatio: 2.5, hullIrisMaxCover: 0.85, wbNeutralChroma: 18,
    /* v2.1 ROI hard mask: eroded inward by roiMargin * iris radius so the lid margin itself is never sampled.
       Paralimbal hulls: the last canthTrim fraction toward each canthus is dropped (caruncle / plica are red and not sclera). */
    roiMargin: 0.06, canthTrim: 0.10,
    /* final polish: pull the hull's lower boundary up by this fraction of the local lid gap (5-10 %) so the lower palpebral conjunctiva / lid skin is never clipped */
    hullLowerPull: 0.075,
    /* final polish: gray-world white balance before any colour measurement. Gains are clamped, and clipped / near-black pixels are excluded from the channel means. */
    /* redness cue: BOTH conditions must hold (AND). Severity tiers are also AND-gated, so a tier can never fire on one condition alone. */
    cueRedA: 5.0, cueRedPct: 15.0, cueRedNotableA: 14, cueRedNotablePct: 25,
    wbOn: true, wbMode: 'white', wbPatchPct: 0.98, wbMinGain: 0.7, wbMaxGain: 1.4, wbVLo: 15, wbVHi: 250,   /* wbMode: 'white' (default: top-2% white patch per channel) | 'gray' (whole-frame mean; over-corrects skin-heavy crops to negative a* and b* values) | 'both' (geometric mean) */
    /* v2.1 skin gamut: a pixel is a skin CANDIDATE only if BOTH the YCbCr box and the HSV box agree. */
    skinCb: [77, 127], skinCr: [133, 173], skinH: [5, 50], skinS: [0.10, 0.68], skinV: 60,
    skinBand: [0.12, 0.45], skinMinN: 40, skinLw: 0.35, skinFbDb: 8
  };
  function eOdd(v) { v = Math.round(v); return v % 2 ? v : v + 1; }
  function eRng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function eMed(a) { if (!a.length) return 0; var s = Float32Array.from(a).sort(); return s[s.length >> 1]; }
  function ePct(a, p) { var s = Float32Array.from(a).sort(); return s[clamp(Math.floor(p * (s.length - 1)), 0, s.length - 1)]; }
  function eBlur(a, w, h, r) { return blur(blur(a, w, h, r), w, h, r); }
  /* separable square min / max filter (building block for open / close / top-hat / black-hat) */
  function eMM(a, w, h, r, isMax) {
    var t = new Float32Array(a.length), o = new Float32Array(a.length), x, y, k, v, q, lo, hi;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { lo = Math.max(0, x - r); hi = Math.min(w - 1, x + r); v = a[y * w + lo]; for (k = lo + 1; k <= hi; k++) { q = a[y * w + k]; if (isMax ? q > v : q < v) v = q; } t[y * w + x] = v; }
    for (y = 0; y < h; y++) { lo = Math.max(0, y - r); hi = Math.min(h - 1, y + r); for (x = 0; x < w; x++) { v = t[lo * w + x]; for (k = lo + 1; k <= hi; k++) { q = t[k * w + x]; if (isMax ? q > v : q < v) v = q; } o[y * w + x] = v; } }
    return o;
  }
  function eBinMM(m, w, h, r, isMax) { var f = eMM(Float32Array.from(m), w, h, r, isMax), o = new Uint8Array(m.length); for (var i = 0; i < o.length; i++) o[i] = f[i] > 0.5 ? 1 : 0; return o; }
  function eOpenB(m, w, h, r) { return eBinMM(eBinMM(m, w, h, r, false), w, h, r, true); }
  function eCloseB(m, w, h, r) { return eBinMM(eBinMM(m, w, h, r, true), w, h, r, false); }
  function eSamp(a, w, h, x, y) { x = clamp(x, 0, w - 1); y = clamp(y, 0, h - 1); var x0 = x | 0, y0 = y | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0; return a[y0 * w + x0] * (1 - fx) * (1 - fy) + a[y0 * w + x1] * fx * (1 - fy) + a[y1 * w + x0] * (1 - fx) * fy + a[y1 * w + x1] * fx * fy; }
  function eUnwrap(a, w, h, cx, cy, r0, r1) {
    var nth = 360, nr = Math.max(1, Math.floor(r1 - r0)), P = new Float32Array(nth * nr), t, k, c, s;
    for (t = 0; t < nth; t++) { c = Math.cos(t * Math.PI / 180); s = Math.sin(t * Math.PI / 180); for (k = 0; k < nr; k++) P[t * nr + k] = eSamp(a, w, h, cx + (r0 + k) * c, cy + (r0 + k) * s); }
    return { P: P, nth: nth, nr: nr, r0: r0 };
  }
  /* radial gradient (positive = dark -> bright going outward), lightly smoothed across angle */
  function eRadGrad(P, nth, nr) {
    var d = new Float32Array(nth * nr), o = new Float32Array(nth * nr), t, k, b, tm, tp;
    for (t = 0; t < nth; t++) { b = t * nr; for (k = 2; k < nr - 2; k++) d[b + k] = 2 * (P[b + k + 1] - P[b + k - 1]) + (P[b + k + 2] - P[b + k - 2]); }
    for (t = 0; t < nth; t++) { tm = ((t + nth - 1) % nth) * nr; tp = ((t + 1) % nth) * nr; b = t * nr; for (k = 0; k < nr; k++) o[b + k] = (d[tm + k] + 2 * d[b + k] + d[tp + k]) / 4; }
    return o;
  }
  function eSolve(M, b) {
    var n = b.length, i, j, k, p, t, f, x, s;
    for (i = 0; i < n; i++) {
      p = i; for (j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j; if (Math.abs(M[p][i]) < 1e-9) return null;
      t = M[i]; M[i] = M[p]; M[p] = t; t = b[i]; b[i] = b[p]; b[p] = t;
      for (j = i + 1; j < n; j++) { f = M[j][i] / M[i][i]; for (k = i; k < n; k++) M[j][k] -= f * M[i][k]; b[j] -= f * b[i]; }
    }
    x = new Array(n); for (i = n - 1; i >= 0; i--) { s = b[i]; for (j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; } return x;
  }
  function eLS(rows, rhs) {
    var n = rows[0].length, M = [], v = [], i, j, k; for (i = 0; i < n; i++) { M.push(new Array(n).fill(0)); v.push(0); }
    for (k = 0; k < rows.length; k++) for (i = 0; i < n; i++) { v[i] += rows[k][i] * rhs[k]; for (j = 0; j < n; j++) M[i][j] += rows[k][i] * rows[k][j]; }
    return eSolve(M, v);
  }
  function eCirc3(p, q, s) {
    var d = 2 * (p[0] * (q[1] - s[1]) + q[0] * (s[1] - p[1]) + s[0] * (p[1] - q[1])); if (Math.abs(d) < 1e-6) return null;
    var a = p[0] * p[0] + p[1] * p[1], b = q[0] * q[0] + q[1] * q[1], c = s[0] * s[0] + s[1] * s[1],
      ux = (a * (q[1] - s[1]) + b * (s[1] - p[1]) + c * (p[1] - q[1])) / d, uy = (a * (s[0] - q[0]) + b * (p[0] - s[0]) + c * (q[0] - p[0])) / d;
    return [ux, uy, Math.hypot(p[0] - ux, p[1] - uy)];
  }
  function eFitCircle(pts, inl) {
    var rows = [], rhs = [], i; for (i = 0; i < pts.length; i++) if (inl[i]) { rows.push([2 * pts[i][0], 2 * pts[i][1], 1]); rhs.push(pts[i][0] * pts[i][0] + pts[i][1] * pts[i][1]); }
    var s = rows.length >= 3 ? eLS(rows, rhs) : null; if (!s) return null; return [s[0], s[1], Math.sqrt(Math.max(s[2] + s[0] * s[0] + s[1] * s[1], 0))];
  }
  function eInl(pts, c, tol) { var o = new Uint8Array(pts.length), k = 0; for (var i = 0; i < pts.length; i++) if (Math.abs(Math.hypot(pts[i][0] - c[0], pts[i][1] - c[1]) - c[2]) < tol) { o[i] = 1; k++; } o.n = k; return o; }
  function eRansacCircle(pts, tol, r0, r1, rng) {
    var n = pts.length, best = null, bn = 0, it, a, b, c, m, inl, f; if (n < 6) return null;
    for (it = 0; it < 300; it++) {
      a = (rng() * n) | 0; b = (rng() * n) | 0; c = (rng() * n) | 0; if (a === b || b === c || a === c) continue;
      m = eCirc3(pts[a], pts[b], pts[c]); if (!m || m[2] < r0 || m[2] > r1) continue; inl = eInl(pts, m, tol); if (inl.n > bn) { best = inl; bn = inl.n; }
    }
    if (!best || bn < 6) return null;
    for (it = 0; it < 3; it++) { f = eFitCircle(pts, best); if (!f) break; inl = eInl(pts, f, tol); if (inl.n < 4) break; best = inl; }
    f = eFitCircle(pts, best); return f ? { cx: f[0], cy: f[1], r: f[2], inl: best } : null;
  }
  /* circle with fixed cy: (x-cx)^2 + (y-cy)^2 = r^2 is linear in (cx, k = r^2 - cx^2) */
  function eLimbSolve(pts, ids, cy) {
    var rows = [], rhs = [], i; ids.forEach(function (i) { rows.push([2 * pts[i][0], 1]); rhs.push(pts[i][0] * pts[i][0] + (pts[i][1] - cy) * (pts[i][1] - cy)); });
    var s = rows.length >= 2 ? eLS(rows, rhs) : null; if (!s) return null; var r2 = s[1] + s[0] * s[0]; return r2 > 0 ? [s[0], Math.sqrt(r2)] : null;
  }
  function eLimbInl(pts, m, cy, tol) { var o = [], i; for (i = 0; i < pts.length; i++) if (Math.abs(Math.hypot(pts[i][0] - m[0], pts[i][1] - cy) - m[1]) < tol) o.push(i); return o; }
  function eRansacLimb(pts, cy, tol, r0, r1, rng) {
    var n = pts.length, best = null, it, a, b, m, inl, all = []; if (n < 6) return null;
    for (it = 0; it < 300; it++) {
      a = (rng() * n) | 0; b = (rng() * n) | 0; if (a === b) continue; m = eLimbSolve(pts, [a, b], cy); if (!m || m[1] < r0 || m[1] > r1) continue;
      inl = eLimbInl(pts, m, cy, tol); if (!best || inl.length > best.length) best = inl;
    }
    if (!best || best.length < 6) return null;
    for (it = 0; it < 3; it++) { m = eLimbSolve(pts, best, cy); if (!m) return null; inl = eLimbInl(pts, m, cy, tol); if (inl.length < 4) break; best = inl; }
    m = eLimbSolve(pts, best, cy); return m ? { cx: m[0], r: m[1], inl: best } : null;
  }
  function eGlare(V, S, L, w, h, k, maxBlob, lFloor) {
    var n = w * h, sat = new Uint8Array(n), i, r = (k - 1) >> 1;
    for (i = 0; i < n; i++) sat[i] = (V[i] >= EC.glareV && S[i] <= EC.glareS) ? 1 : 0;
    var cc = ccl(sat, w, h); cc.comps.forEach(function (c) { if (c.area > maxBlob) for (var j = 0; j < n; j++) if (cc.labels[j] === c.id) sat[j] = 0; });
    var top = eMM(eMM(L, w, h, r, false), w, h, r, true), m = new Uint8Array(n);       /* white top-hat = L - opening(L) */
    for (i = 0; i < n; i++) m[i] = (sat[i] || ((L[i] - top[i]) > EC.glareTop && V[i] >= EC.glareTopV && (lFloor == null || L[i] > lFloor))) ? 1 : 0;
    return eBinMM(m, w, h, EC.glareDil, true);
  }
  /* fill masked pixels from neighbours: used ONLY for geometry detection, never for colour measurement */
  function eFill(a, mask, w, h) {
    var o = Float32Array.from(a), m = Uint8Array.from(mask), n = w * h, pass, i, x, y, dx, dy, j, s, c, upd, k;
    for (pass = 0; pass < 4; pass++) {
      upd = [];
      for (i = 0; i < n; i++) if (m[i]) { x = i % w; y = (i / w) | 0; s = 0; c = 0; for (dy = -4; dy <= 4; dy++) for (dx = -4; dx <= 4; dx++) { var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; j = yy * w + xx; if (!m[j]) { s += o[j]; c++; } } if (c) upd.push(i, s / c); }
      if (!upd.length) break; for (k = 0; k < upd.length; k += 2) { o[upd[k]] = upd[k + 1]; m[upd[k]] = 0; }
    }
    return o;
  }
  function eRingContrast(g, w, h, cx, cy, r) {
    var x0 = Math.max(0, Math.floor(cx - 2.2 * r)), x1 = Math.min(w - 1, Math.ceil(cx + 2.2 * r)), y0 = Math.max(0, Math.floor(cy - 2.2 * r)), y1 = Math.min(h - 1, Math.ceil(cy + 2.2 * r)), si = 0, ni = 0, sr = 0, nr = 0, x, y, d;
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { d = Math.hypot(x - cx, y - cy); if (d <= 0.9 * r) { si += g[y * w + x]; ni++; } else if (d > 1.3 * r && d < 1.9 * r) { sr += g[y * w + x]; nr++; } }
    return ni && nr ? sr / nr - si / ni : 0;
  }
  function ePupil(Lg, w, h, hint, rng) {
    var n = w * h, gb = eBlur(Lg, w, h, 1), best = null, bs = -1, minA = EC.pupilMinA * n, maxA = EC.pupilMaxA * n;
    EC.pupilPct.forEach(function (p) {
      var thr = ePct(gb, p / 100), m = new Uint8Array(n), i; for (i = 0; i < n; i++) m[i] = gb[i] <= thr ? 1 : 0;
      m = eCloseB(eOpenB(m, w, h, 1), w, h, 2);
      ccl(m, w, h).comps.forEach(function (c) {
        var bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1, fill = c.area / (bw * bh), asp = bw / bh; if (c.area < minA || c.area > maxA || fill < EC.pupilMinFill || asp < 0.6 || asp > 1.7) return;
        var req = Math.sqrt(c.area / Math.PI), ct = eRingContrast(gb, w, h, c.cx, c.cy, req); if (ct < EC.pupilMinContrast) return;
        var dc = Math.hypot((c.cx - w / 2) / w, (c.cy - h / 2) / h), s = Math.min(1, fill / 0.785) * Math.min(ct, 60) / 60 * (1 - 0.6 * dc) * Math.pow(c.area, 0.25);
        if (hint) s /= 1 + Math.hypot(c.cx - hint.x, c.cy - hint.y) / Math.max(req, 1); if (s > bs) { bs = s; best = { cx: c.cx, cy: c.cy, r: req }; }
      });
    });
    if (!best) return null;
    if (hint) { /* the user pointed at the pupil: keep the candidate nearest to it */ }
    var u = eUnwrap(gb, w, h, best.cx, best.cy, 0.5 * best.r, 1.8 * best.r), P = eBlur(u.P, u.nr, u.nth, 1), g = eRadGrad(P, u.nth, u.nr), pts = [], str = [], idx = [], t, k, mx, mk, pos = [];
    for (t = 0; t < u.nth; t++) { mx = -1e9; mk = 0; for (k = 0; k < u.nr; k++) if (g[t * u.nr + k] > mx) { mx = g[t * u.nr + k]; mk = k; } str.push(mx); idx.push(mk); if (mx > 0) pos.push(mx); }
    var thrS = 0.5 * eMed(pos);
    for (t = 0; t < u.nth; t++) if (str[t] > thrS && str[t] > 0) { var rr = u.r0 + idx[t], a = t * Math.PI / 180; pts.push([best.cx + rr * Math.cos(a), best.cy + rr * Math.sin(a)]); }
    var f = eRansacCircle(pts, Math.max(1.5, 0.05 * best.r), 0.6 * best.r, 1.6 * best.r, rng);
    return (f && f.inl.n >= 12) ? { cx: f.cx, cy: f.cy, r: f.r } : best;
  }
  /* limbus from LATERAL rays only; returns null when there is no credible iris/sclera edge */
  function eLimbus(Lp, Ap, Bp, w, h, pup, rng) {
    var rp = pup.r, n = w * h, rMin = EC.irisMinR * rp, rMax = Math.min(EC.irisMaxR * rp, 0.5 * Math.max(w, h)), i, t, k;
    if (rMax - rMin < 6) return null;
    var Lb = eBlur(Lp, w, h, 1), Cp = new Float32Array(n); for (i = 0; i < n; i++) Cp[i] = Math.hypot(Ap[i], Bp[i]); var Cb = eBlur(Cp, w, h, 1);
    var uL = eUnwrap(Lb, w, h, pup.cx, pup.cy, rMin, rMax), uC = eUnwrap(Cb, w, h, pup.cx, pup.cy, rMin, rMax), nr = uL.nr, gL = eRadGrad(uL.P, 360, nr), gC = eRadGrad(uC.P, 360, nr), E = new Float32Array(gL.length);
    for (i = 0; i < E.length; i++) E[i] = gL[i] - 0.5 * gC[i];                       /* iris -> sclera: L* rises, chroma falls */
    var lat = []; for (t = 0; t < 360; t++) if (t <= EC.latDeg || t >= 360 - EC.latDeg || Math.abs(t - 180) <= EC.latDeg) lat.push(t);
    var s1 = [], r1 = [], pos = []; lat.forEach(function (t) { var mx = -1e9, mk = 0; for (k = 0; k < nr; k++) if (E[t * nr + k] > mx) { mx = E[t * nr + k]; mk = k; } s1.push(mx); r1.push(uL.r0 + mk); if (mx > 0) pos.push(mx); });
    if (!pos.length) return null;
    var medS = eMed(pos), strongR = []; for (i = 0; i < s1.length; i++) if (s1[i] >= medS) strongR.push(r1[i]); var rMed = eMed(strongR);
    var s2 = [], r2 = [], pos2 = []; lat.forEach(function (t) { var mx = -1e9, mk = -1; for (k = 0; k < nr; k++) { var rr = uL.r0 + k; if (rr >= 0.8 * rMed && rr <= 1.25 * rMed && E[t * nr + k] > mx) { mx = E[t * nr + k]; mk = k; } } s2.push(mx); r2.push(mk < 0 ? 0 : uL.r0 + mk); if (mx > 0) pos2.push(mx); });
    if (!pos2.length) return null;
    var thr2 = Math.max(0.4 * eMed(pos2), 1e-3), pts = []; lat.forEach(function (t, i) { if (s2[i] >= thr2 && r2[i] > 0) { var a = t * Math.PI / 180; pts.push([pup.cx + r2[i] * Math.cos(a), pup.cy + r2[i] * Math.sin(a)]); } });
    if (pts.length < EC.irisMinInl) return null;
    var fit = eRansacLimb(pts, pup.cy, Math.max(1.5, 0.03 * rMed), EC.irisMinR * rp, EC.irisMaxR * rp, rng), uncertain = false, sides = { left: 0, right: 0 }, cxi, ri, inlRatio;
    if (fit) {
      cxi = fit.cx; ri = fit.r; inlRatio = fit.inl.length / pts.length; fit.inl.forEach(function (i) { if (pts[i][0] < pup.cx) sides.left++; else sides.right++; });
      if (Math.min(sides.left, sides.right) < 5 || Math.abs(cxi - pup.cx) > EC.irisMaxOff * ri) { var ds = fit.inl.map(function (i) { return Math.hypot(pts[i][0] - pup.cx, pts[i][1] - pup.cy); }); ri = eMed(ds); cxi = pup.cx; uncertain = true; }
    } else { ri = eMed(pts.map(function (p) { return Math.hypot(p[0] - pup.cx, p[1] - pup.cy); })); cxi = pup.cx; inlRatio = 0; uncertain = true; }
    if (inlRatio < EC.irisMinInlRatio || inlRatio * pts.length < EC.irisMinInl) return null;
    /* absolute sanity: just outside the limbus must be brighter / less chromatic than just inside (noise averages to ~0) */
    var vL = eUnwrap(Lb, w, h, cxi, pup.cy, 0.8 * ri, 1.2 * ri), vC = eUnwrap(Cb, w, h, cxi, pup.cy, 0.8 * ri, 1.2 * ri), sI = 0, sO = 0, cI = 0, cO = 0, kI = 0, kO = 0;
    lat.forEach(function (t) { for (var k2 = 0; k2 < vL.nr; k2++) { var rr = vL.r0 + k2; if (rr <= 0.93 * ri) { sI += vL.P[t * vL.nr + k2]; cI += vC.P[t * vL.nr + k2]; kI++; } else if (rr >= 1.07 * ri) { sO += vL.P[t * vL.nr + k2]; cO += vC.P[t * vL.nr + k2]; kO++; } } });
    if (!kI || !kO || (sO / kO - sI / kI) + 0.5 * (cI / kI - cO / kO) < EC.limbMinContrast) return null;
    if (ri < EC.irisMinR * rp) return null;
    return { cx: cxi, cy: pup.cy, r: ri, inlRatio: inlRatio, sides: sides, uncertain: uncertain || inlRatio * pts.length < EC.irisMinInl };
  }
  function eMed1(a, k) { if (a.length < 3) return a; k = Math.min(k, a.length | 1); var o = [], h = k >> 1, i, j, w; for (i = 0; i < a.length; i++) { w = []; for (j = -h; j <= h; j++) w.push(a[clamp(i + j, 0, a.length - 1)]); w.sort(function (p, q) { return p - q; }); o.push(w[h]); } return o; }
  function ePoly(xs, ys, deg, x0, sc) { var rows = xs.map(function (x) { var u = (x - x0) / sc, r = []; for (var d = 0; d <= deg; d++) r.push(Math.pow(u, d)); return r; }); var c = eLS(rows, ys); return c ? function (x) { var u = (x - x0) / sc, v = 0; for (var d = 0; d <= deg; d++) v += c[d] * Math.pow(u, d); return v; } : null; }
  /* ---------------- v2.1: landmark ROI hard mask, skin-colour filter, paralimbal convex hulls ---------------- */
  /* MediaPipe FaceMesh (468/478-pt) eye contours. 'right' / 'left' = the subject's own eye. */
  var MP_EYE = {
    right: { upper: [246, 161, 160, 159, 158, 157, 173], lower: [7, 163, 144, 145, 153, 154, 155], outer: 33, inner: 133 },
    left: { upper: [466, 388, 387, 386, 385, 384, 398], lower: [249, 390, 373, 374, 380, 381, 382], outer: 263, inner: 362 }
  };
  /* mesh = array of {x, y} normalised 0-1 (what FaceLandmarker returns). Returns the landmark set analyzeEye() accepts as opt.landmarks. */
  function eyeFromMesh(mesh, side) {
    var m = MP_EYE[side === 'left' ? 'left' : 'right'], pt = function (k) { return [mesh[k].x, mesh[k].y]; };
    return { upper: m.upper.map(pt), lower: m.lower.map(pt), outer: pt(m.outer), inner: pt(m.inner) };
  }
  function eByX(a, b) { return a[0] - b[0]; }
  function ePathPoly(x, p, sx, sy) { x.beginPath(); p.forEach(function (q, k) { if (k) x.lineTo(q[0] * sx, q[1] * sy); else x.moveTo(q[0] * sx, q[1] * sy); }); x.closePath(); }
  /* convex hull (monotone chain) */
  function eHullPts(pts) {
    var p = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }), lo = [], up = [], i;
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    for (i = 0; i < p.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop(); up.push(p[i]); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  /* even-odd scanline polygon fill (pixel centres) -> Uint8Array(w*h) */
  function ePolyFill(P, w, h) {
    var m = new Uint8Array(w * h), n = P.length, y, i, j, k, xs, yc, a, b, xa, xb, x, ymin = 1e9, ymax = -1e9;
    if (n < 3) return m;
    for (i = 0; i < n; i++) { if (P[i][1] < ymin) ymin = P[i][1]; if (P[i][1] > ymax) ymax = P[i][1]; }
    for (y = Math.max(0, Math.floor(ymin)); y <= Math.min(h - 1, Math.ceil(ymax)); y++) {
      yc = y + 0.5; xs = [];
      for (i = 0, j = n - 1; i < n; j = i++) { a = P[i]; b = P[j]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      xs.sort(function (p, q) { return p - q; });
      for (k = 0; k + 1 < xs.length; k += 2) { xa = Math.max(0, Math.ceil(xs[k] - 0.5)); xb = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5)); for (x = xa; x <= xb; x++) m[y * w + x] = 1; }
    }
    return m;
  }
  /* ROI polygon = closed contour: upper lid -> inner/outer canthus -> lower lid. Uses landmarks (opt.landmarks, normalised 0-1) when given;
     otherwise it is rebuilt from the lid curves the aperture scan fitted, pinched shut at both canthi. mask = polygon eroded by roiMargin. */
  /* v2.3 landmark-collapse guardrail: returns { ratio, bad } - bad is null when the hull is plausible, else 'area' | 'collapse' | 'centre' */
  function eHullGuard(P, ir, w, h) {
    var a = 0, i, j, n = P.length, x, y, f, tot = 0, inI = 0, r2 = ir.r * ir.r, ai = Math.PI * r2;
    for (i = 0, j = n - 1; i < n; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1];
    a = Math.abs(a) / 2; var ratio = ai > 0 ? a / ai : 0;
    if (!(a >= EC.hullIrisMinRatio * ai)) return { ratio: ratio, bad: 'area' };
    f = ePolyFill(P, w, h);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (f[y * w + x]) { tot++; if ((x - ir.cx) * (x - ir.cx) + (y - ir.cy) * (y - ir.cy) <= r2) inI++; }
    if (!tot || inI / tot > EC.hullIrisMaxCover) return { ratio: ratio, bad: 'collapse' };
    var cxi = Math.min(w - 1, Math.max(0, Math.round(ir.cx))), cyi = Math.min(h - 1, Math.max(0, Math.round(ir.cy)));
    if (!f[cyi * w + cxi]) return { ratio: ratio, bad: 'centre' };
    return { ratio: ratio, bad: null };
  }
  function eRoiPoly(opt, ap, w, h, ir) {
    var lm = opt && opt.landmarks, P = null, src = 'geometry', k, guard = null, sc = function (p) { return [p[0] * w, p[1] * h]; };
    if (lm && lm.upper && lm.lower && lm.upper.length >= 3 && lm.lower.length >= 3 && lm.outer && lm.inner) {
      var up = lm.upper.map(sc).sort(eByX), lo = lm.lower.map(sc).sort(eByX).reverse(), c0 = sc(lm.outer), c1 = sc(lm.inner),
        cl = c0[0] <= c1[0] ? c0 : c1, cr = c0[0] <= c1[0] ? c1 : c0, inX = function (p) { return p[0] > cl[0] && p[0] < cr[0]; };
      P = [cl].concat(up.filter(inX), [cr], lo.filter(inX)); src = 'landmarks';
      guard = eHullGuard(P, ir, w, h); if (guard.bad) { P = null; src = 'geometry'; }     /* collapsed / too-small landmark hull -> fitted-lid fallback below */
    }
    if (!P) {
      var c = ap.curves, x0 = c.x0, x1 = c.x1, xm = 0.5 * (x0 + x1), hw = Math.max(1, 0.5 * (x1 - x0)), top = [], bot = [], x, u, t, yt, yb, ym, nst = Math.max(12, Math.round(x1 - x0));
      for (k = 0; k <= nst; k++) {
        x = x0 + (x1 - x0) * k / nst; yt = c.pt(x); yb = c.pb(x); if (!(yb > yt)) { yt = yb = 0.5 * (yt + yb); }
        u = Math.abs(x - xm) / hw; t = u < 0.8 ? 1 : Math.sqrt(Math.max(0, (1 - u * u) / (1 - 0.64))); ym = 0.5 * (yt + yb);
        top.push([x, ym + (yt - ym) * t]); bot.push([x, ym + (yb - ym) * t]);
      }
      P = top.concat(bot.reverse());
    }
    var fill = ePolyFill(P, w, h), r = Math.max(1, Math.round(EC.roiMargin * ir.r));
    return { poly: P, fill: fill, mask: eBinMM(fill, w, h, r, false), source: src, guard: guard };
  }
  /* y-extent of a polygon along the vertical line at x (null if the line misses it) */
  function eVSpan(P, x) {
    var ys = [], i, j, a, b, n = P.length;
    for (i = 0, j = n - 1; i < n; j = i++) { a = P[i]; b = P[j]; if ((a[0] <= x) !== (b[0] <= x)) ys.push(a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0])); }
    return ys.length >= 2 ? [Math.min.apply(null, ys), Math.max.apply(null, ys)] : null;
  }
  /* two paralimbal regions, one per side of the iris: convex hull of {ROI vertices on that side + the iris-centre vertical chord},
     clipped to the ROI hard mask, minus the iris disc + limbal margin, minus the last canthTrim of the span toward the canthus. */
  function eParaHulls(P, roiMask, ir, w, h) {
    var out = new Uint8Array(w * h), polys = [], cx = ir.cx, cy = ir.cy, lim = (1 + EC.limbalMargin) * ir.r, v0 = eVSpan(P, cx);
    if (!v0) return { mask: out, polys: polys };
    [-1, 1].forEach(function (s) {
      var pts = P.filter(function (p) { return s * (p[0] - cx) >= 0; }), ext = 0, hull, fill, xmax, x, y, i, dx, sp;
      pts.forEach(function (p) { ext = Math.max(ext, s * (p[0] - cx)); });
      if (pts.length < 2 || ext < 0.25 * ir.r) return;
      pts = pts.map(function (p) { var sp = eVSpan(P, p[0]), mid = sp ? 0.5 * (sp[0] + sp[1]) : null; return (sp && p[1] > mid) ? [p[0], p[1] - EC.hullLowerPull * (sp[1] - sp[0])] : p; });   /* lower-lid vertices pulled up */
      hull = eHullPts(pts.concat([[cx, v0[0]], [cx, v0[1] - EC.hullLowerPull * (v0[1] - v0[0])]])); if (hull.length < 3) return;
      fill = ePolyFill(hull, w, h); xmax = ext * (1 - EC.canthTrim); polys.push(hull);
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = y * w + x; if (!fill[i] || !roiMask[i]) continue; dx = s * (x - cx); if (dx < 0 || dx > xmax || Math.hypot(x - cx, y - cy) <= lim) continue;
        sp = eVSpan(P, x); if (sp && y > sp[1] - EC.hullLowerPull * (sp[1] - sp[0])) continue;      /* lower boundary pulled up along the lower lid line */
        out[i] = 1; }
    });
    return { mask: out, polys: polys };
  }
  /* skin candidates: YCbCr box AND HSV box must agree (hue wraps are excluded, so saturated red vessels are not candidates) */
  function eSkinGamut(d, n) {
    var m = new Uint8Array(n), i, j, R, G, B, mx, mn, dl, hh, cb, cr;
    for (i = 0; i < n; i++) {
      j = i * 4; R = d[j]; G = d[j + 1]; B = d[j + 2];
      cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B; cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
      if (cb < EC.skinCb[0] || cb > EC.skinCb[1] || cr < EC.skinCr[0] || cr > EC.skinCr[1]) continue;
      mx = Math.max(R, G, B); mn = Math.min(R, G, B); dl = mx - mn; if (!dl || mx < EC.skinV || dl / mx < EC.skinS[0] || dl / mx > EC.skinS[1]) continue;
      hh = mx === R ? 60 * (((G - B) / dl) % 6) : mx === G ? 60 * ((B - R) / dl + 2) : 60 * ((R - G) / dl + 4); if (hh < 0) hh += 360;
      if (hh >= EC.skinH[0] && hh <= EC.skinH[1]) m[i] = 1;
    }
    return m;
  }
  /* periocular skin reference [L*, a*, b*]: median of skin-candidate pixels in a band just OUTSIDE the lid polygon (null if too few) */
  function eSkinRef(L, A, B, cand, fill, w, h, ri) {
    var r1 = Math.max(2, Math.round(EC.skinBand[0] * ri)), r2 = Math.max(r1 + 2, Math.round(EC.skinBand[1] * ri)), dIn = eBinMM(fill, w, h, r1, true), dOut = eBinMM(fill, w, h, r2, true), l = [], a = [], b = [], i;
    for (i = 0; i < fill.length; i++) if (dOut[i] && !dIn[i] && cand[i]) { l.push(L[i]); a.push(A[i]); b.push(B[i]); }
    return l.length >= EC.skinMinN ? [eMed(l), eMed(a), eMed(b)] : null;
  }

  /* eyelid aperture: for each column beyond the limbus walk up / down from the sclera until it stops looking like sclera */
  function eAperture(Ls, As, Bs, g0, w, h, ir) {
    var cx = ir.cx, cy = ir.cy, ri = ir.r, n = w * h, seeds = {}, S = [-1, 1], cols = {}, i, x, y;
    S.forEach(function (s) {
      var xa = Math.round(cx + s * EC.seedIn * ri), xb = Math.round(cx + s * EC.seedOut * ri), t; if (xa > xb) { t = xa; xa = xb; xb = t; }
      xa = Math.max(xa, 0); xb = Math.min(xb, w); var ya = Math.max(Math.floor(cy - EC.seedHalfH * ri), 0), yb = Math.min(Math.floor(cy + EC.seedHalfH * ri) + 1, h); if (xb - xa < 2 || yb - ya < 2) return;
      var a1 = [], a2 = [], a3 = []; for (y = ya; y < yb; y++) for (x = xa; x < xb; x++) if (!g0[y * w + x]) { a1.push(Ls[y * w + x]); a2.push(As[y * w + x]); a3.push(Bs[y * w + x]); }
      if (a1.length >= 20) seeds[s] = [eMed(a1), eMed(a2), eMed(a3)];
    });
    S.forEach(function (s) { var d = seeds[s]; if (d && (d[0] < EC.seedMinL || Math.hypot(d[1], d[2]) > 40)) delete seeds[s]; });
    if (seeds[-1] && seeds[1]) {
      var ref = seeds[-1][0] >= seeds[1][0] ? -1 : 1, oth = -ref;
      if (seeds[ref][0] - seeds[oth][0] > 30 || Math.hypot(seeds[oth][1], seeds[oth][2]) - Math.hypot(seeds[ref][1], seeds[ref][2]) > 12) delete seeds[oth];
    }
    if (!seeds[-1] && !seeds[1]) throw { eye: 'sclera' };
    var sclRef = [0, 1, 2].map(function (q) { return mean([seeds[-1], seeds[1]].filter(Boolean).map(function (r_) { return r_[q]; })); });   /* clean sclera colour next to the limbus */
    S.forEach(function (s) { if (seeds[s]) cols[s] = eScanSide(Ls, As, Bs, g0, w, h, seeds[s], cx, cy, ri, s); });
    S.forEach(function (s) { if (cols[s] && cols[s].xs.length < 5) delete cols[s]; });
    var keys = Object.keys(cols); if (!keys.length) throw { eye: 'sclera' };
    var lateral = new Uint8Array(n), ap = new Uint8Array(n), mg = Math.max(1, Math.round(EC.lidMargin * ri)), X = [], T = [], Bt = [];
    keys.forEach(function (s) { var c = cols[s], top = eMed1(c.top, 7), bot = eMed1(c.bot, 7); c.xs.forEach(function (x, j) { var y0 = Math.round(top[j]) + mg, y1 = Math.round(bot[j]) - mg; for (var yy = y0; yy <= y1; yy++) lateral[yy * w + x] = 1; X.push(x); T.push(top[j]); Bt.push(bot[j]); }); });
    var xlo = Math.floor(Math.min(Math.min.apply(null, X), cx - ri)), xhi = Math.ceil(Math.max(Math.max.apply(null, X), cx + ri)), pt, pb;
    if (keys.length === 2 && X.length >= 12) { pt = ePoly(X, T, 2, cx, ri); pb = ePoly(X, Bt, 2, cx, ri); }      /* both sides: lid curves are interpolated across the iris */
    else {                                                                                            /* one side: hold the lid height seen next to the limbus (no wild extrapolation) */
      var near = X.map(function (x, i) { return [Math.abs(x - cx), T[i], Bt[i]]; }).sort(function (p, q) { return p[0] - q[0]; }).slice(0, 8), tt = mean(near.map(function (p) { return p[1]; })), bb = mean(near.map(function (p) { return p[2]; }));
      pt = function () { return tt; }; pb = function () { return bb; };
    }
    if (!pt || !pb) throw { eye: 'sclera' };
    for (x = Math.max(xlo, 0); x <= Math.min(xhi, w - 1); x++) { var t0 = Math.round(clamp(pt(x), 0, h - 1)), b0 = Math.round(clamp(pb(x), 0, h - 1)); for (y = t0; y <= b0; y++) ap[y * w + x] = 1; }
    var xc = clamp(Math.round(cx), 0, w - 1), openH = pb(xc) - pt(xc);
    return { aperture: ap, lateral: lateral, openRatio: openH / (2 * ri), sides: keys.length, curves: { pt: pt, pb: pb, x0: Math.max(xlo, 0), x1: Math.min(xhi, w - 1) }, ref: sclRef };
  }
  function eScanSide(Ls, As, Bs, g0, w, h, seed, cx, cy, ri, side) {
    var sL = seed[0], sa = seed[1], sb = seed[2], drop = Math.max(EC.lidDrop, 0.2 * sL), n = w * h, i;
    /* skin deviates toward yellow-orange (hue 35-80 deg); vessels / inflamed conjunctiva are red-dominant and never end a scan */
    var skin = new Uint8Array(n), red = new Uint8Array(n); for (i = 0; i < n; i++) { var da = As[i] - sa, db = Bs[i] - sb, hue = Math.atan2(db, da) * 180 / Math.PI; skin[i] = (Math.hypot(da, db) > EC.chromaStop && hue > EC.skinHueMin && hue < EC.skinHueMax) ? 1 : 0; red[i] = da > EC.scanRedDa ? 1 : 0; }
    skin = eOpenB(skin, w, h, Math.max(1, (eOdd(Math.max(3, EC.vesselW * ri)) - 1) >> 1));
    function ok(y, x, strict) { var j = y * w + x; if (g0[j]) return true; if (skin[j]) return false; return !((sL - Ls[j]) > (strict ? 0.5 : 1) * drop && !red[j]); }
    function scan(x, y0, dir) {
      var last = y0, lim = Math.floor(EC.scanMaxHalf * ri), st, y, g, rec;
      for (st = 1; st <= lim; st++) {
        y = y0 + dir * st; if (y < 0 || y >= h) return last; if (ok(y, x, false)) { last = y; continue; }
        rec = false; for (g = 1; g <= EC.lashGap; g++) { var y2 = y + dir * g; if (y2 >= 0 && y2 < h && ok(y2, x, true)) { rec = true; break; } } if (rec) continue; return last;
      }
      return last;
    }
    var xs = [], top = [], bot = [], mid = cy, fails = 0, minH = Math.max(3, EC.minColH * ri), d0 = Math.round(EC.scanStart * ri), d1 = Math.round(EC.scanEnd * ri), d;
    for (d = d0; d < d1; d++) {
      var x = Math.round(cx + side * d); if (x < 0 || x >= w) break; var y0 = Math.round(clamp(mid, 0, h - 1));
      if (!ok(y0, x, false)) { if (++fails >= 3) break; continue; }
      var t = scan(x, y0, -1), b = scan(x, y0, 1); if (b - t < minH) { if (++fails >= 3) break; continue; }
      fails = 0; xs.push(x); top.push(t); bot.push(b); mid = 0.7 * mid + 0.3 * 0.5 * (t + b);
    }
    return { xs: xs, top: top, bot: bot };
  }
  /* Camera-style white balance, applied BEFORE the CIELAB conversion: sRGB -> linear light, von Kries gains from the gray-world estimate
     (referenced to green, as camera WB gains are), -> sRGB. Doing it in linear light is what a camera / RAW converter does; scaling gamma-encoded
     values shifts mid-tones and highlights unevenly. Clipped / near-black pixels are left out of the means. Returns a corrected copy + the gains. */
  var E_LIN = null, E_SRGB = null;
  function eWBTables() {
    if (E_LIN) return;
    E_LIN = new Float32Array(256); E_SRGB = new Uint8Array(4096);
    for (var i = 0; i < 256; i++) { var c = i / 255; E_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    for (var k = 0; k < 4096; k++) { var l = k / 4095, v = l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055; E_SRGB[k] = Math.round(255 * v); }
  }
  /* box = optional {x0,y0,x1,y1} (pixels): gain statistics are taken only inside it; the gains are still applied to the whole image */
  function eGrayWorld(src, n, mode, w, box) {
    eWBTables(); mode = mode || EC.wbMode;
    var sr = 0, sg = 0, sb = 0, c = 0, i, j, R, G, B, mx, hr = new Uint32Array(256), hg = new Uint32Array(256), hb = new Uint32Array(256);
    for (i = 0; i < n; i++) { if (box) { var px = i % w, py = (i / w) | 0; if (px < box.x0 || px > box.x1 || py < box.y0 || py > box.y1) continue; } j = i * 4; R = src[j]; G = src[j + 1]; B = src[j + 2]; mx = Math.max(R, G, B); if (mx < EC.wbVLo || mx > EC.wbVHi) continue; var wlc = lab(R, G, B); if (Math.hypot(wlc[1], wlc[2]) > EC.wbNeutralChroma) continue; sr += E_LIN[R]; sg += E_LIN[G]; sb += E_LIN[B]; hr[R]++; hg[G]++; hb[B]++; c++; }
    if (c < 0.05 * (box ? Math.max(1, (box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1)) : n) || !sr || !sg || !sb) return { d: src, gains: [1, 1, 1], applied: false };
    var pct = function (h) { var t = EC.wbPatchPct * c, k = 0, v; for (v = 0; v < 256; v++) { k += h[v]; if (k >= t) break; } return E_LIN[Math.min(v, 255)]; };
    var grG = sg / sr, gbG = sg / sb, pr = pct(hr), pg = pct(hg), pb = pct(hb), grW = pr > 0 ? pg / pr : 1, gbW = pb > 0 ? pg / pb : 1, gr, gb;
    if (mode === 'gray') { gr = grG; gb = gbG; } else if (mode === 'white') { gr = grW; gb = gbW; } else { gr = Math.sqrt(grG * grW); gb = Math.sqrt(gbG * gbW); }
    gr = clamp(gr, EC.wbMinGain, EC.wbMaxGain); gb = clamp(gb, EC.wbMinGain, EC.wbMaxGain);
    var o = new Uint8ClampedArray(src.length), q;
    for (i = 0; i < n; i++) {
      j = i * 4;
      q = E_LIN[src[j]] * gr; o[j] = E_SRGB[q >= 1 ? 4095 : (q * 4095 + 0.5) | 0];
      o[j + 1] = src[j + 1];
      q = E_LIN[src[j + 2]] * gb; o[j + 2] = E_SRGB[q >= 1 ? 4095 : (q * 4095 + 0.5) | 0];
      o[j + 3] = src[j + 3];
    }
    return { d: o, gains: [gr, 1, gb], applied: true };
  }
  /* v2.4 artifact / overlay filter: thin straight strokes (pointer lines, arrows, frames) and rows of small text-like glyphs (labels, watermarks) are masked out of the sclera statistics. Lightweight Hough-style run scan, no OCR model. */
  function eOverlay(im, w, h) {
    var n = w * h, g = gray(im), bl = blur(g, w, h, 3), ln = new Uint8Array(n), ov = new Uint8Array(n), i, x, y, k, minL = Math.max(12, Math.round(0.2 * Math.min(w, h)));
    for (i = 0; i < n; i++) ln[i] = Math.abs(g[i] - bl[i]) > 45 ? 1 : 0;
    [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(function (dr) {
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        if (!ln[y * w + x]) continue; var px = x - dr[0], py = y - dr[1]; if (px >= 0 && px < w && py >= 0 && py < h && ln[py * w + px]) continue;
        var len = 0, cx = x, cy = y; while (cx >= 0 && cx < w && cy >= 0 && cy < h && ln[cy * w + cx]) { len++; cx += dr[0]; cy += dr[1]; }
        if (len >= minL) { cx = x; cy = y; for (k = 0; k < len; k++) { ov[cy * w + cx] = 1; cx += dr[0]; cy += dr[1]; } }
      }
    });
    var cc = ccl(ln, w, h), lim = 0.08 * Math.min(w, h), bands = {};
    cc.comps.forEach(function (c) { var bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1; if (c.area >= 3 && bw <= lim && bh <= lim) { var b = Math.round(c.cy / Math.max(4, 0.05 * h)); (bands[b] = bands[b] || []).push(c); } });
    Object.keys(bands).forEach(function (b) {
      var a = bands[b]; if (a.length < 5) return; var hs = a.map(function (c) { return c.maxy - c.miny + 1; }), mh = mean(hs), sd = Math.sqrt(mean(hs.map(function (v) { return (v - mh) * (v - mh); })));
      var xs = a.map(function (c) { return c.cx; }), span = Math.max.apply(null, xs) - Math.min.apply(null, xs);
      if (sd / mh < 0.35 && span >= 0.25 * w) a.forEach(function (c) { for (y = c.miny; y <= c.maxy; y++) for (x = c.minx; x <= c.maxx; x++) ov[y * w + x] = 1; });
    });
    var o2 = new Uint8Array(n); for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (ov[y * w + x]) for (var yy = Math.max(0, y - 2); yy <= Math.min(h - 1, y + 2); yy++) for (var xx = Math.max(0, x - 2); xx <= Math.min(w - 1, x + 2); xx++) o2[yy * w + xx] = 1;
    return o2;
  }
  function eyeCore(im, opt, out) {
    var w = im.w, h = im.h, n = w * h, d = im.d, i, rng = eRng(7);
    if (EC.wbOn && opt.whiteBalance !== false) { var lmk = opt.landmarks, box = null;
      if (lmk && lmk.upper && lmk.lower && lmk.outer && lmk.inner) {          /* eye-ROI crop: landmark bounding box + 50 % padding (keeps periocular skin in the reference) */
        var lp = lmk.upper.concat(lmk.lower, [lmk.outer, lmk.inner]), bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
        lp.forEach(function (p) { bx0 = Math.min(bx0, p[0] * w); bx1 = Math.max(bx1, p[0] * w); by0 = Math.min(by0, p[1] * h); by1 = Math.max(by1, p[1] * h); });
        var pad = 0.5 * (bx1 - bx0); box = { x0: Math.max(0, Math.floor(bx0 - pad)), x1: Math.min(w - 1, Math.ceil(bx1 + pad)), y0: Math.max(0, Math.floor(by0 - pad)), y1: Math.min(h - 1, Math.ceil(by1 + pad)) };
        if (box.x1 - box.x0 < 8 || box.y1 - box.y0 < 8) box = null;
      }
      var wb = eGrayWorld(d, n, null, w, box); d = wb.d; out.meas.wbBasis = box ? 'eye-roi' : 'frame'; out.meas.wbApplied = wb.applied; out.meas.wbGains = wb.gains.map(function (g) { return +g.toFixed(3); }); }
    var L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n), V = new Float32Array(n), S = new Float32Array(n);
    for (i = 0; i < n; i++) { var j = i * 4, R = d[j], G = d[j + 1], Bl = d[j + 2], c = lab(R, G, Bl), mx = Math.max(R, G, Bl), mn = Math.min(R, G, Bl); L[i] = c[0]; A[i] = c[1]; B[i] = c[2]; V[i] = mx; S[i] = mx ? (mx - mn) / mx : 0; }
    var g0 = eGlare(V, S, L, w, h, eOdd(Math.max(9, 0.05 * Math.min(w, h))), EC.glareBlobFrac * n, null), g0n = 0; for (i = 0; i < n; i++) g0n += g0[i];
    var Lp = L, Ap = A, Bp = B; if (g0n > 0 && g0n < 0.25 * n) { Lp = eFill(L, g0, w, h); Ap = eFill(A, g0, w, h); Bp = eFill(B, g0, w, h); }
    var pup = ePupil(Lp, w, h, opt.cx != null ? { x: opt.cx, y: opt.cy } : null, rng); if (!pup) throw { eye: 'pupil' };
    var ir = eLimbus(Lp, Ap, Bp, w, h, pup, rng); if (!ir) throw { eye: 'limbus' };
    var g_ = gray(im), cr = Math.round(1.3 * ir.r), cx0 = clamp(Math.round(ir.cx) - cr, 0, w - 3), cy0 = clamp(Math.round(ir.cy) - cr, 0, h - 3), cw = Math.min(w - cx0, 2 * cr + 1), ch = Math.min(h - cy0, 2 * cr + 1), gc = new Float32Array(cw * ch), yy_, xx_;
    for (yy_ = 0; yy_ < ch; yy_++) for (xx_ = 0; xx_ < cw; xx_++) gc[yy_ * cw + xx_] = g_[(cy0 + yy_) * w + cx0 + xx_];
    out.meas.focus = +lapVar(blur(gc, cw, ch, 1), cw, ch).toFixed(1);   /* variance of Laplacian over the eye crop, not the whole frame */
    if (cw > 4 && ch > 4 && out.meas.focus < EC.focusMin) throw { eye: 'retake', id: 'eye_rt_blur' };
    out.found = true; out.cx = pup.cx; out.cy = pup.cy; out.rp = pup.r; out.icx = ir.cx; out.icy = ir.cy; out.ri = ir.r; out.irisUncertain = ir.uncertain;
    var ratio = pup.r / ir.r; out.meas.ratio = +ratio.toFixed(2); out.meas.pupilMm = +(ratio * IRIS_MM).toFixed(1);
    /* sclera */
    var Ls = eBlur(Lp, w, h, 1), As = eBlur(Ap, w, h, 1), Bs = eBlur(Bp, w, h, 1), ap = eAperture(Ls, As, Bs, g0, w, h, ir);
    out.aperture = ap.aperture; out.openRatio = +ap.openRatio.toFixed(2);
    if (ap.aperture) { var dN = 0, dIn = 0, dy_, dx_; for (dy_ = Math.max(0, Math.floor(ir.cy - ir.r)); dy_ <= Math.min(h - 1, Math.ceil(ir.cy + ir.r)); dy_++) for (dx_ = Math.max(0, Math.floor(ir.cx - ir.r)); dx_ <= Math.min(w - 1, Math.ceil(ir.cx + ir.r)); dx_++) if (Math.hypot(dx_ - ir.cx, dy_ - ir.cy) <= ir.r) { dN++; if (ap.aperture[dy_ * w + dx_]) dIn++; }
      out.meas.irisVisPct = dN ? +(100 * dIn / dN).toFixed(0) : 100;
      if (dN && (1 - dIn / dN) > EC.occlMaxFrac) { out.found = false; throw { eye: 'retake', id: 'eye_rt_occl' }; } }   /* lids / lashes cover > 50 % of the iris-pupil region */
    /* v2.1: ROI polygon (landmarks or fitted lids) is a HARD mask; sclera is sampled only in the two paralimbal hulls inside it */
    var roi = eRoiPoly(opt, ap, w, h, ir), hulls = eParaHulls(roi.poly, roi.mask, ir, w, h);
    out.roiPoly = roi.poly; out.roiSource = roi.source; out.hulls = hulls.polys;
    if (roi.guard && roi.guard.bad) { out.meas.hullGuard = roi.guard.bad; out.meas.hullIrisRatio = +roi.guard.ratio.toFixed(2); out.cues.push({ id: 'eye_hullfb', sev: 'info', p: { r: roi.guard.ratio.toFixed(2) } }); }
    var s0 = new Uint8Array(n), n0 = 0, x, y, lim = (1 + EC.limbalMargin) * ir.r;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (ap.lateral[y * w + x] && roi.mask[y * w + x] && hulls.mask[y * w + x] && Math.hypot(x - ir.cx, y - ir.cy) > lim) { s0[y * w + x] = 1; n0++; }
    if (!n0) throw { eye: 'sclera' };
    var ovm = eOverlay(im, w, h), ovN = 0, clipN = 0, s0N = 0, idat = im.d;
    for (i = 0; i < n; i++) { if (ovm[i]) ovN++; if (s0[i] && !ovm[i]) { s0N++; var q4 = i * 4, mx_ = Math.max(idat[q4], idat[q4 + 1], idat[q4 + 2]), mn_ = Math.min(idat[q4], idat[q4 + 1], idat[q4 + 2]); if (mn_ >= 250 || mx_ <= 5) clipN++; } }
    out.meas.overlayPct = +(100 * ovN / n).toFixed(1); out.meas.clipPct = s0N ? +(100 * clipN / s0N).toFixed(1) : 0;
    if (ovN) out.cues.push({ id: 'eye_overlay', sev: 'info', p: { v: out.meas.overlayPct } });
    if (s0N && clipN / s0N > EC.clipMaxFrac) { out.meas.colorSkip = true; out.cues.push({ id: 'eye_rt_exp', sev: 'info', p: { v: out.meas.clipPct } }); return; }   /* > 25 % of the sclera clipped at 255 or 0 */
    var lv = []; for (i = 0; i < n; i++) if (s0[i]) lv.push(L[i]); var Lref = eMed(lv);
    var glare = eGlare(V, S, L, w, h, eOdd(Math.max(5, 0.25 * ir.r)), 0.5 * ir.r * ir.r, Lref + EC.glareAbove), valid = new Uint8Array(n), nv = 0;  /* judged against the sclera's own brightness */
    /* v2.1 skin filter, applied BEFORE any sclera colour statistic. The fixed YCbCr+HSV gamut also catches pink / bloodshot sclera, so a candidate is dropped
       only when it is nearer the periocular skin colour than the sclera seed colour (fallback without a skin reference: yellow-orange shifted, not red-dominant). */
    var cand = eSkinGamut(d, n), sref = eSkinRef(L, A, B, cand, roi.fill, w, h, ir.r), sr = ap.ref, skinN = 0;
    var cdist = function (i, q) { return Math.hypot(A[i] - q[1], B[i] - q[2], EC.skinLw * (L[i] - q[0])); };
    var isSkin = function (i) { return cand[i] && (sref ? cdist(i, sref) < cdist(i, sr) : ((B[i] - sr[2]) > EC.skinFbDb && (A[i] - sr[1]) < 0.9 * (B[i] - sr[2]))); };
    var hiN = 0, hgN = 0; for (i = 0; i < n; i++) if (s0[i]) { var hi = L[i] > EC.hiL || V[i] > EC.hiV; if (hi) hiN++; if (ovm[i]) continue; if (isSkin(i)) { skinN++; continue; } if (hi || glare[i]) hgN++; if (!glare[i] && !hi && L[i] >= EC.darkLMin) { valid[i] = 1; nv++; } }   /* dark (L* < darkLMin) pixels are dropped BEFORE any mean */
    out.meas.skinPct = +(100 * skinN / n0).toFixed(1);
    out.meas.hiPct = +(100 * hiN / n0).toFixed(1);
    /* overexposed: < validFracMin of the sclera survives AND glare/blow-out (not skin/dark) is the main reason -> colour check skipped, ratio kept */
    out.meas.redUnreliable = nv < EC.validFracMin * n0 && hgN >= (n0 - hgN - nv);
    if (out.meas.redUnreliable) return;
    if (nv < 20) throw { eye: 'sclera' };
    var vl = [], va = []; for (i = 0; i < n; i++) if (valid[i]) { vl.push(L[i]); va.push(A[i]); } var Lm = eMed(vl), am = eMed(va), dv = vl.map(function (v) { return Math.abs(v - Lm); }), mad = eMed(dv) * 1.4826;
    var bhK = eOdd(Math.max(5, 0.12 * ir.r)), bhr = (bhK - 1) >> 1, cl = eMM(eMM(L, w, h, bhr, true), w, h, bhr, false), bad = new Uint8Array(n), fl = Math.max(EC.darkK * mad, EC.darkMin);
    for (i = 0; i < n; i++) { var notV = (A[i] - am) < EC.vesselDa;                    /* red pixels are vessels: never removed as lash / shadow */
      bad[i] = (notV && (L[i] < Lm - fl || (cl[i] - L[i]) > EC.lashBH)) ? 1 : 0; }
    bad = eBinMM(bad, w, h, 1, true);
    var keep = new Uint8Array(n), nk = 0; for (i = 0; i < n; i++) if (valid[i] && !bad[i]) keep[i] = 1;
    keep = eOpenB(keep, w, h, 1); var cc = ccl(keep, w, h), minA = EC.minCompFrac * ir.r * ir.r; cc.comps.forEach(function (c) { if (c.area < minA) for (var q = 0; q < n; q++) if (cc.labels[q] === c.id) keep[q] = 0; });
    for (i = 0; i < n; i++) if (keep[i]) { var kx = i % w, ky = (i / w) | 0;          /* final hard mask: nothing outside the ROI / hulls, and nothing within iris + 10 % margin or the pupil, can survive */
      if (!(roi.mask[i] && hulls.mask[i]) || Math.hypot(kx - ir.cx, ky - ir.cy) <= lim || Math.hypot(kx - pup.cx, ky - pup.cy) <= 1.1 * pup.r) keep[i] = 0; }
    var Lv = [], Av = [], Bv = []; for (i = 0; i < n; i++) if (keep[i]) { Lv.push(L[i]); Av.push(A[i]); Bv.push(B[i]); }
    out.meas.scleraN = Lv.length; out.meas.glarePct = +(100 * (1 - nv / n0)).toFixed(1); out.meas.lashPct = +(100 * (1 - Lv.length / Math.max(1, nv))).toFixed(1); out.openRatio = out.openRatio;
    if (Lv.length < Math.max(30, EC.minValidFrac * ir.r * ir.r)) throw { eye: 'sclera' };
    out.scleraMask = keep;
    var eyeA = 0, ea_ = ap.aperture || roi.mask; for (i = 0; i < n; i++) if (ea_[i]) eyeA++;
    out.meas.scleraPct = eyeA ? +(100 * Lv.length / eyeA).toFixed(1) : 0;
    if (eyeA && Lv.length / eyeA < EC.scleraMinFrac) { out.meas.colorSkip = true; out.cues.push({ id: 'eye_scl15', sev: 'info', p: { v: out.meas.scleraPct } }); return; }   /* squinting: tag, never compute false colour metrics */
    var mL = mean(Lv), mA = mean(Av), mB = mean(Bv), red = 0;
    for (i = 0; i < n; i++) if (keep[i]) { var j4 = i * 4; if (A[i] > EC.redA && d[j4] / Math.max(1, d[j4 + 1] + d[j4 + 2]) > EC.redRatio) red++; }
    out.meas.L = +mL.toFixed(0); out.meas.a = +mA.toFixed(1); out.meas.b = +mB.toFixed(1); out.meas.redFrac = +(red / Av.length).toFixed(3);
    if (mA <= 0) { out.meas.redFrac = 0; out.meas.redBaseline = true; }   /* mean a* <= 0 (cool cast / washed sclera): red fraction forced to normal baseline, never a redness input */
  }
  var QCIDS = ['eye_nosclera', 'eye_rt_blur', 'eye_rt_occl', 'eye_rt_exp', 'eye_scl15', 'eye_overlay', 'eye_overexp', 'eye_darkcolor', 'eye_irisunc', 'eye_hullfb', 'eye_nopupil'];
  function tipP() { return { s: Math.round(EC.scleraMinFrac * 100), c: Math.round(EC.clipMaxFrac * 100), o: Math.round(EC.occlMaxFrac * 100), f: EC.focusMin, g: Math.round(EC.validFracMin * 100) }; }
  function analyzeEye(im, opt) {
    opt = opt || {}; var g = gray(im), q = quality(im, g), out = { mode: 'eye', q: q, cues: [], meas: {}, w: im.w, h: im.h, found: false };
    try { eyeCore(im, opt, out); }
    catch (e) {
      if (e && e.eye === 'sclera') out.cues.push({ id: 'eye_nosclera', sev: 'info' });
      else if (e && e.eye === 'retake') { out.found = false; out.cues.push({ id: e.id, sev: 'info' }); }
      else if (e && e.eye === 'limbus') { out.found = false; out.cues.push({ id: 'eye_irisunc', sev: 'info' }); }   /* pupil seen, iris edge not credible: no guessed ratio */
      else { out.found = false; out.cues.push({ id: 'eye_nopupil', sev: 'info' }); if (!(e && e.eye)) out.err = String(e && e.message || e); }
      if (out.found && out.meas.ratio != null) addRatioCues(out);
      return finishEye(out);
    }
    var m = out.meas, Lm = m.L, A = m.a, Bm = m.b;
    /* only a truly dark / underexposed sclera skips the colour cues; a bloodshot sclera is legitimately darker (L* ~45-60) */
    if (m.redUnreliable) out.cues.push({ id: 'eye_overexp', sev: 'info' });   /* colour check skipped entirely (not just redness) */
    else if (m.colorSkip) { /* cue already added */ }
    else if (Lm < 30) out.cues.push({ id: 'eye_darkcolor', sev: 'info' });
    else {
      if (Bm >= 24) out.cues.push({ id: 'eye_yellow', sev: 'notable', p: { v: Bm.toFixed(1) } }); else if (Bm >= 17) out.cues.push({ id: 'eye_yellow', sev: 'mild', p: { v: Bm.toFixed(1) } });
      {
        var redPct = m.redFrac * 100, isRed = (A > EC.cueRedA) && (redPct > EC.cueRedPct);       /* mean a* AND red fraction: no OR */
        if (isRed) out.cues.push({ id: 'eye_red', sev: (A >= EC.cueRedNotableA && redPct >= EC.cueRedNotablePct) ? 'notable' : 'mild', p: { v: A.toFixed(1), f: Math.round(redPct) } });
        /* else: no redness cue */
      }
    }
    addRatioCues(out);
    return finishEye(out);
  }
  function addRatioCues(out) {
    var ratio = out.meas.ratio, mm = out.meas.pupilMm;
    if (ratio > 0.6) out.cues.push({ id: 'eye_dilated', sev: 'notable', p: { r: ratio.toFixed(2), mm: mm } }); else if (ratio > 0.45) out.cues.push({ id: 'eye_large', sev: 'mild', p: { r: ratio.toFixed(2), mm: mm } }); else if (ratio < 0.18) out.cues.push({ id: 'eye_small', sev: 'mild', p: { r: ratio.toFixed(2), mm: mm } });
    if (out.irisUncertain) out.cues.push({ id: 'eye_irisunc', sev: 'info' });
  }
  function finishEye(o) { if (!o.cues.some(function (c) { return c.sev !== 'info'; }) && o.found) o.cues.unshift({ id: 'eye_clear', sev: 'ok', p: { r: o.meas.ratio } }); return o; }


  /* ---------------- SKIN: colour difference from surrounding skin ---------------- */
  function analyzeSkin(im, opt) {
    opt = opt || {}; var w = im.w, h = im.h, g = gray(im), q = quality(im, g), out = { mode: 'skin', q: q, cues: [], meas: {}, w: w, h: h }, n = w * h, Lc = new Float32Array(n), Ac = new Float32Array(n), Bc = new Float32Array(n), i, x, y;
    for (i = 0; i < n; i++) { var c = lab(im.d[i * 4], im.d[i * 4 + 1], im.d[i * 4 + 2]); Lc[i] = c[0]; Ac[i] = c[1]; Bc[i] = c[2]; }
    var bl = [], ba = [], bb = [], mx = Math.round(w * 0.12), my = Math.round(h * 0.12);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (x < mx || x >= w - mx || y < my || y >= h - my) { var k = y * w + x; bl.push(Lc[k]); ba.push(Ac[k]); bb.push(Bc[k]); }
    var L0 = median(bl), A0 = median(ba), B0 = median(bb); out.meas.baseL = Math.round(L0); out.meas.baseA = +A0.toFixed(1);
    var red = new Uint8Array(n), les = new Uint8Array(n), inner = 0, redN = 0, dark = 0;
    for (y = my; y < h - my; y++) for (x = mx; x < w - mx; x++) { i = y * w + x; inner++; var dA = Ac[i] - A0, dL = Lc[i] - L0, dB = Bc[i] - B0, dE = Math.sqrt(dA * dA + dL * dL + dB * dB);
      if (dA >= 7) { red[i] = 1; redN++; } var dk = dL <= -15 && dE >= 12; if (dk) dark++; if (dA >= 7 || dk) les[i] = 1; }
    out.meas.redFrac = +(redN / inner).toFixed(3); out.meas.darkFrac = +(dark / inner).toFixed(3);
    var cc = ccl(les, w, h), big = null; cc.comps.forEach(function (c) { if (!big || c.area > big.area) big = c; });
    if (big && big.area >= 0.004 * inner) {
      var P = 0, sL = 0, sA = 0, sB = 0, s2L = 0, s2A = 0, s2B = 0, hit = 0, cnt = 0;
      for (y = big.miny; y <= big.maxy; y++) for (x = big.minx; x <= big.maxx; x++) { i = y * w + x; if (cc.labels[i] !== big.id) continue; cnt++;
        var edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || cc.labels[i - 1] !== big.id || cc.labels[i + 1] !== big.id || cc.labels[i - w] !== big.id || cc.labels[i + w] !== big.id; if (edge) P++;
        sL += Lc[i]; sA += Ac[i]; sB += Bc[i]; s2L += Lc[i] * Lc[i]; s2A += Ac[i] * Ac[i]; s2B += Bc[i] * Bc[i];
        var rx = Math.round(2 * big.cx - x), ry = Math.round(2 * big.cy - y); if (rx >= 0 && rx < w && ry >= 0 && ry < h && cc.labels[ry * w + rx] === big.id) hit++; }
      var vL = s2L / cnt - Math.pow(sL / cnt, 2), vA = s2A / cnt - Math.pow(sA / cnt, 2), vB = s2B / cnt - Math.pow(sB / cnt, 2);
      var circ = clamp(4 * Math.PI * cnt / (P * P), 0, 1.2), asym = 1 - hit / cnt, colVar = Math.sqrt(Math.max(0, vL + vA + vB));
      out.lesion = { area: cnt, frac: +(cnt / inner).toFixed(3), cx: big.cx, cy: big.cy, bbox: [big.minx, big.miny, big.maxx, big.maxy], circ: +circ.toFixed(2), asym: +asym.toFixed(2), colVar: +colVar.toFixed(1), dA: +((sA / cnt) - A0).toFixed(1) };
      if (opt.widthCm > 0) { var pxCm = opt.widthCm / w; out.lesion.cm2 = +(cnt * pxCm * pxCm).toFixed(1); out.lesion.cm = +(Math.max(big.maxx - big.minx, big.maxy - big.miny) * pxCm).toFixed(1); }
      var fr = out.meas.redFrac;
      if (fr >= 0.6) out.cues.push({ id: 'skin_diffuse', sev: 'mild', p: { f: Math.round(fr * 100) } });
      else if (fr >= 0.25) out.cues.push({ id: 'skin_red', sev: 'notable', p: { f: Math.round(fr * 100), d: out.lesion.dA } });
      else if (fr >= 0.05) out.cues.push({ id: 'skin_red', sev: 'mild', p: { f: Math.round(fr * 100), d: out.lesion.dA } });
      if (dark / inner >= 0.01) out.cues.push({ id: 'skin_dark', sev: 'mild', p: { f: Math.round(dark / inner * 100) } });
      if (out.lesion.frac >= 0.01 && circ < 0.5) out.cues.push({ id: 'skin_border', sev: 'mild', p: { c: out.lesion.circ } });
      if (out.lesion.frac >= 0.01 && colVar > 14) out.cues.push({ id: 'skin_multi', sev: 'mild', p: { v: out.lesion.colVar } });
      if (out.lesion.frac >= 0.01 && asym > 0.4) out.cues.push({ id: 'skin_asym', sev: 'info', p: { a: out.lesion.asym } });
    }
    if (!out.cues.some(function (c) { return c.sev !== 'info'; })) out.cues.unshift({ id: 'skin_clear', sev: 'ok' });
    return out;
  }

  /* ---------------- SCAN: ultrasound-style frame (quality and gross-pattern cues only, no anatomy interpretation) ---------------- */
  function analyzeScan(im) {
    var w = im.w, h = im.h, g = gray(im), q = quality(im, g), out = { mode: 'scan', q: q, cues: [], meas: {}, w: w, h: h }, mx = Math.round(w * 0.08), my = Math.round(h * 0.08), vals = [], x, y, i;
    for (y = my; y < h - my; y++) for (x = mx; x < w - mx; x++) vals.push(g[y * w + x]);
    var m = mean(vals), s = 0; vals.forEach(function (v) { s += (v - m) * (v - m); }); var sd = Math.sqrt(s / vals.length);
    var mask = new Uint8Array(w * h), dk = 0; for (y = my; y < h - my; y++) for (x = mx; x < w - mx; x++) { i = y * w + x; if (g[i] < 26) { mask[i] = 1; dk++; } }
    var fl = blur(g, w, h, 2), mk2 = new Uint8Array(w * h); for (y = my; y < h - my; y++) for (x = mx; x < w - mx; x++) { i = y * w + x; if (fl[i] < 30) mk2[i] = 1; }
    var cc = ccl(mk2, w, h), big = null; cc.comps.forEach(function (c) { if (!big || c.area > big.area) big = c; });
    var inner = vals.length, bands = [], nb = 8; for (var b = 0; b < nb; b++) { var y0 = my + Math.round((h - 2 * my) * b / nb), y1 = my + Math.round((h - 2 * my) * (b + 1) / nb), t = 0, c = 0; for (y = y0; y < y1; y++) for (x = mx; x < w - mx; x++) { t += g[y * w + x]; c++; } bands.push(c ? t / c : 0); }
    out.meas = { mean: Math.round(m), sd: Math.round(sd), contrast: +(sd / (m + 1)).toFixed(2), darkFrac: +(dk / inner).toFixed(3), bands: bands.map(function (v) { return Math.round(v); }) };
    if (big) { out.region = { cx: big.cx, cy: big.cy, bbox: [big.minx, big.miny, big.maxx, big.maxy], frac: +(big.area / inner).toFixed(3) }; }
    if (sd < 8) out.cues.push({ id: 'scan_flat', sev: 'mild' });
    if (m < 35) out.cues.push({ id: 'scan_lowgain', sev: 'mild', p: { m: Math.round(m) } }); else if (m > 170) out.cues.push({ id: 'scan_highgain', sev: 'mild', p: { m: Math.round(m) } });
    if (bands[0] > 20 && bands[nb - 1] < bands[0] * 0.25 && bands[nb - 1] < 25) out.cues.push({ id: 'scan_atten', sev: 'info' });
    if (big && big.area / inner >= 0.04 && (big.maxx - big.minx) > 8 && (big.maxy - big.miny) > 8 && big.area / ((big.maxx - big.minx + 1) * (big.maxy - big.miny + 1)) > 0.5) out.cues.push({ id: 'scan_dark', sev: 'notable', p: { f: Math.round(big.area / inner * 100) } });
    if (!out.cues.some(function (c) { return c.sev !== 'info'; })) out.cues.unshift({ id: 'scan_clear', sev: 'ok' });
    return out;
  }

  /* ---------------- protocol (illustrative; never a diagnosis) ---------------- */
  var PROTO = {
    eye_red: ['op_p_red1', 'op_p_red2', 'op_p_red3'], eye_yellow: ['op_p_yel1', 'op_p_yel2', 'op_p_yel3'], eye_dilated: ['op_p_dil1', 'op_p_dil2', 'op_p_dil3'], eye_large: ['op_p_dil1'], eye_small: ['op_p_sm1', 'op_p_dil2'],
    skin_red: ['op_p_sk1', 'op_p_sk2', 'op_p_sk3'], skin_diffuse: ['op_p_sk1', 'op_p_sk4'], skin_dark: ['op_p_sk5', 'op_p_sk2'], skin_border: ['op_p_sk5'], skin_multi: ['op_p_sk5'],
    scan_dark: ['op_p_sc1', 'op_p_sc2'], scan_lowgain: ['op_p_sc3'], scan_highgain: ['op_p_sc3'], scan_flat: ['op_p_sc3']
  };
  function recommend(r) {
    var seen = {}, out = []; r.cues.slice().sort(function (a, b) { return sevRank(b.sev) - sevRank(a.sev); }).forEach(function (c) { (PROTO[c.id] || []).forEach(function (k) { if (!seen[k]) { seen[k] = 1; out.push(k); } }); });
    if (r.q && !r.q.ok) out.unshift('op_p_q'); if (!out.length) out.push(r.mode === 'scan' ? 'op_p_scan_ok' : 'op_p_ok');
    return out;
  }
  var sevRank = function (s) { return s === 'notable' ? 3 : s === 'mild' ? 2 : s === 'info' ? 1 : 0; };
  function contextLine(r) {
    var s = RC.getState(), parts = [], q = window.RCPTLink && window.RCPTLink.autonomous();
    var worst = r.cues.reduce(function (m, c) { return Math.max(m, sevRank(c.sev)); }, 0);
    if (worst >= 2 && s && (s.tier !== 'nominal' || s.d >= 2)) parts.push(L('op_ctx_dose', { t: s.tier, d: s.d.toFixed(1) }));
    if (worst >= 2 && s && s.s >= 6) parts.push(L('op_ctx_sleep', { s: s.s.toFixed(1) }));
    if (worst >= 2 && q) parts.push(L('op_ctx_aut'));
    return parts.join(' ');
  }
  function summaryTag(r) {
    var top = r.cues.slice().sort(function (a, b) { return sevRank(b.sev) - sevRank(a.sev); })[0]; if (!top) return '';
    return L('oc_' + top.id, top.p || {}) + (top.sev === 'mild' || top.sev === 'notable' ? ' (' + L('op_sev_' + top.sev) + ')' : '');
  }

  /* ---------------- synthetic sample images (clearly labelled illustrations) ---------------- */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* procedural close-up eye: skin texture, brow, lid crease, almond opening, shaded sclera, caruncle, fibrous iris with limbal ring,
     pupil, window highlight, lid shadow and lashes. Synthetic sample for testing the analysis, not a photograph. */
  function realEye(x, W, H, R, redYellow) {
    var cx = W / 2, cy = H / 2 + 6, pr = redYellow ? 56 : 30, ir = 100, k, i, a;
    var sk = x.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, 'rgb(196,146,116)'); sk.addColorStop(0.35, 'rgb(222,176,146)'); sk.addColorStop(1, 'rgb(212,162,132)'); x.fillStyle = sk; x.fillRect(0, 0, W, H);
    for (k = 0; k < 5200; k++) { x.fillStyle = 'rgba(' + (R() < 0.5 ? '120,70,50' : '255,225,200') + ',' + (0.04 + R() * 0.06) + ')'; x.fillRect(R() * W, R() * H, 1 + R() * 1.4, 1 + R() * 1.4); }
    // brow hairs
    for (k = 0; k < 420; k++) { var bx = 40 + R() * (W - 80), by = 8 + R() * 48 + Math.sin(bx / W * 3.1) * -14, ln = 14 + R() * 14, an = -0.35 + R() * 0.3 - (bx < W / 2 ? 0.2 : -0.15); x.strokeStyle = 'rgba(' + (40 + R() * 25 | 0) + ',' + (24 + R() * 18 | 0) + ',16,' + (0.55 + R() * 0.4) + ')'; x.lineWidth = 1 + R() * 1.4; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(an) * ln, by + Math.sin(an) * ln); x.stroke(); }
    // socket shading and lid crease
    var sh = x.createRadialGradient(cx, cy, 60, cx, cy, 330); sh.addColorStop(0, 'rgba(120,70,55,0)'); sh.addColorStop(1, 'rgba(120,70,55,.28)'); x.fillStyle = sh; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(110,60,45,.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 270, cy - 40); x.bezierCurveTo(cx - 140, cy - 150, cx + 120, cy - 160, cx + 280, cy - 55); x.stroke();
    x.strokeStyle = 'rgba(255,225,200,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 262, cy - 34); x.bezierCurveTo(cx - 140, cy - 140, cx + 120, cy - 150, cx + 272, cy - 49); x.stroke();
    function opening() { x.beginPath(); x.moveTo(cx - 285, cy + 8); x.bezierCurveTo(cx - 190, cy - 112, cx + 150, cy - 128, cx + 290, cy - 6); x.bezierCurveTo(cx + 170, cy + 96, cx - 160, cy + 104, cx - 285, cy + 8); x.closePath(); }
    x.save(); opening(); x.clip();
    var sc = x.createRadialGradient(cx, cy, 70, cx, cy, 300); var wh = redYellow ? [238, 214, 150] : [247, 244, 240]; sc.addColorStop(0, 'rgb(' + wh.join(',') + ')'); sc.addColorStop(0.75, 'rgb(' + wh.map(function (v) { return v - 12; }).join(',') + ')'); sc.addColorStop(1, 'rgb(' + wh.map(function (v) { return v - 48; }).join(',') + ')'); x.fillStyle = sc; x.fillRect(0, 0, W, H);
    x.strokeStyle = redYellow ? 'rgba(185,35,35,.6)' : 'rgba(205,130,130,.09)'; x.lineCap = 'round';
    for (k = 0; k < (redYellow ? 40 : 2); k++) { var sd = R() < 0.5 ? -1 : 1, sx = cx + sd * (150 + R() * 130), sy = cy + (R() - 0.5) * 130; x.lineWidth = 0.8 + R() * 1.4; x.beginPath(); x.moveTo(sx, sy); x.bezierCurveTo(sx - sd * 40, sy + (R() - 0.5) * 50, sx - sd * 80, sy + (R() - 0.5) * 60, sx - sd * (110 + R() * 40), sy + (R() - 0.5) * 70); x.stroke(); }
    var cr = x.createRadialGradient(cx - 280, cy + 10, 2, cx - 280, cy + 10, 22); cr.addColorStop(0, 'rgba(205,110,105,.5)'); cr.addColorStop(1, 'rgba(205,110,105,0)'); x.fillStyle = cr; x.fillRect(cx - 310, cy - 30, 80, 80);
    // iris
    var ig = x.createRadialGradient(cx, cy, pr, cx, cy, ir); ig.addColorStop(0, 'rgb(176,122,62)'); ig.addColorStop(0.5, 'rgb(128,84,44)'); ig.addColorStop(0.9, 'rgb(84,54,34)'); ig.addColorStop(1, 'rgb(34,24,20)'); x.fillStyle = ig; x.beginPath(); x.arc(cx, cy, ir, 0, 7); x.fill();
    for (k = 0; k < 520; k++) { a = R() * 6.2832; var r0 = pr + 2 + R() * 12, r1 = r0 + 20 + R() * (ir - r0 - 12); x.strokeStyle = R() < 0.5 ? 'rgba(' + (200 + R() * 40 | 0) + ',' + (150 + R() * 40 | 0) + ',80,' + (0.12 + R() * 0.28) + ')' : 'rgba(40,22,12,' + (0.12 + R() * 0.3) + ')'; x.lineWidth = 0.8 + R() * 1.6; x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a + (R() - 0.5) * 0.08) * r1, cy + Math.sin(a + (R() - 0.5) * 0.08) * r1); x.stroke(); }
    x.strokeStyle = 'rgba(214,170,110,.45)'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, pr + 16, 0, 7); x.stroke();
    x.strokeStyle = 'rgba(14,10,10,.9)'; x.lineWidth = 7; x.beginPath(); x.arc(cx, cy, ir - 2, 0, 7); x.stroke();
    x.fillStyle = 'rgb(6,6,8)'; x.beginPath(); x.arc(cx, cy, pr, 0, 7); x.fill();
    var hl = x.createRadialGradient(cx - 38, cy - 36, 2, cx - 38, cy - 36, 40); hl.addColorStop(0, 'rgba(255,255,255,.55)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = hl; x.fillRect(cx - 80, cy - 80, 90, 90);
    x.fillStyle = 'rgba(255,255,255,.95)'; x.fillRect(cx - 34, cy - 32, 11, 11); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(cx + 30, cy + 34, 4, 0, 7); x.fill();
    var ls = x.createLinearGradient(0, cy - 125, 0, cy - 25); ls.addColorStop(0, 'rgba(60,40,36,.32)'); ls.addColorStop(1, 'rgba(30,14,10,0)'); x.fillStyle = ls; x.fillRect(0, cy - 130, W, 110);
    x.restore();
    x.strokeStyle = 'rgba(70,38,30,.95)'; x.lineWidth = 5; x.beginPath(); x.moveTo(cx - 285, cy + 8); x.bezierCurveTo(cx - 190, cy - 112, cx + 150, cy - 128, cx + 290, cy - 6); x.stroke();
    x.strokeStyle = 'rgba(200,120,115,.3)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 270, cy + 22); x.bezierCurveTo(cx - 160, cy + 94, cx + 170, cy + 86, cx + 276, cy + 4); x.stroke();
    // lashes
    for (k = 0; k < 120; k++) { var t = k / 119, px = cx - 280 + t * 568, py = cy + 8 - Math.sin(t * Math.PI) * 112 - Math.sin(t * Math.PI * 2) * 4 * (1 - t) - (t > 0.5 ? 16 * (t - 0.5) : 0), ang = -Math.PI / 2 + (t - 0.5) * 1.5 + (R() - 0.5) * 0.3, ln2 = 22 + R() * 22; x.strokeStyle = 'rgba(' + (22 + R() * 14 | 0) + ',14,10,' + (0.7 + R() * 0.3) + ')'; x.lineWidth = 1.3 + R() * 1.2; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(ang) * ln2 * 0.5 + 6 * (t - 0.5), py + Math.sin(ang) * ln2 * 0.6, px + Math.cos(ang + 0.5 * (t - 0.5)) * ln2, py + Math.sin(ang) * ln2); x.stroke(); }
    for (k = 0; k < 40; k++) { var t2 = 0.12 + k / 39 * 0.76, px2 = cx - 270 + t2 * 548, py2 = cy + 24 + Math.sin(t2 * Math.PI) * 74 - 2; x.strokeStyle = 'rgba(60,34,24,.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px2, py2); x.lineTo(px2 + (t2 - 0.5) * 8, py2 + 8 + R() * 8); x.stroke(); }
  }

  function sample(kind) {
    var c = document.createElement('canvas'), x, W = 640, H = 420; c.width = W; c.height = H; x = c.getContext('2d'); var R = rng(7);
    if (kind === 'eye' || kind === 'eye2') {
      realEye(x, W, H, R, kind === 'eye2');
    } else if (kind === 'skin') {
      var id = x.createImageData(W, H), d = id.data; for (var i = 0; i < W * H; i++) { var px = i % W, py = (i / W) | 0, n = (R() - 0.5) * 10, dx = (px - 330) / 120, dy = (py - 210) / 85, rr = Math.sqrt(dx * dx + dy * dy + 0.25 * Math.sin(px / 17) * Math.sin(py / 13)), k = clamp(1.25 - rr, 0, 1); k = k > 0 ? Math.min(1, k * 1.8) : 0;
        d[i * 4] = clamp(222 + n - 20 * k, 0, 255); d[i * 4 + 1] = clamp(178 + n - 100 * k, 0, 255); d[i * 4 + 2] = clamp(152 + n - 85 * k, 0, 255); d[i * 4 + 3] = 255; } x.putImageData(id, 0, 0);
    } else {
      var id2 = x.createImageData(W, H), d2 = id2.data; for (var j = 0; j < W * H; j++) { var qx = j % W, qy = (j / W) | 0, depth = qy / H, base = 120 * Math.exp(-depth * 1.4), sp = base * (0.55 + 0.9 * R()), ex = (qx - 330) / 85, ey = (qy - 230) / 55, inEll = ex * ex + ey * ey < 1; var v2 = inEll ? 6 + 10 * R() : sp + 6; d2[j * 4] = d2[j * 4 + 1] = d2[j * 4 + 2] = clamp(v2, 0, 255); d2[j * 4 + 3] = 255; } x.putImageData(id2, 0, 0);
    }
    return c;
  }

  /* ---------------- UI ---------------- */
  var St = { mode: 'eye', src: 'upload', result: null, img: null, stream: null, last: lsGet('rcpt.optic.last', null), widthCm: 0, forced: null, landmarks: null };
  var panel = null, cur = null;
  function curCrew() { var c = window.RCPTCrew && window.RCPTCrew.crew(), id = window.RCPTQuests && window.RCPTQuests.sel(); return (c || []).filter(function (k) { return k.id === id; })[0] || (c || [])[0] || { id: 'c1', name: 'Commander' }; }
  function stopCam() { if (St.stream) { St.stream.getTracks().forEach(function (t) { t.stop(); }); St.stream = null; } var v = cur && cur.querySelector('#opVid'); if (v) v.srcObject = null; }
  /* eye options for the next analysis; landmarks (set via RCPTOptic.setLandmarks) belong to ONE image and are consumed here */
  function eyeOpt() { var o = {}, k; if (St.forced) for (k in St.forced) o[k] = St.forced[k]; if (St.landmarks) { o.landmarks = St.landmarks; St.landmarks = null; } return o; }
  function analyze(src) {
    var im = toWork(src, St.mode === 'eye' ? 480 : 320), r = St.mode === 'eye' ? analyzeEye(im, eyeOpt()) : St.mode === 'skin' ? analyzeSkin(im, { widthCm: St.widthCm }) : analyzeScan(im);
    r.recs = recommend(r); r.ctx = contextLine(r); r.tag = summaryTag(r); r.ts = Date.now(); r.crew = curCrew().id; St.result = r; St.imgSrc = src;
    var key = 'rcpt.optic.base.' + r.crew + '.' + r.mode, base = lsGet(key, null); r.base = base;
    var worst = r.cues.reduce(function (m, c) { return Math.max(m, sevRank(c.sev)); }, 0);
    St.last = { ts: r.ts, mode: r.mode, tag: r.tag, worst: worst, crew: curCrew().name }; lsSet('rcpt.optic.last', St.last); updateCard();
    if (window.RCPTLink && window.RCPTLink.autonomous() && worst >= 2) window.RCPTLink.log(L('op_q', { m: L('op_m_' + r.mode), t: r.tag }), 'image');
    document.dispatchEvent(new CustomEvent('rcpt:image-done', { detail: { crew: r.crew, mode: r.mode, tag: r.tag, worst: worst } }));
    return r;
  }
  /* eye overlay: thin pupil + iris contours and a translucent fill/outline of the exact sclera pixels that were sampled (no boxes) */
  function eyeOverlay(x, cv, r, sx, sy) {
    var w = r.w, h = r.h, i, a;
    if (r.scleraMask) {
      var oc = document.createElement('canvas'); oc.width = w; oc.height = h; var ox = oc.getContext('2d'), id = ox.createImageData(w, h), m = r.scleraMask, p, xx, yy, edge;
      for (i = 0; i < m.length; i++) if (m[i]) { xx = i % w; yy = (i / w) | 0; edge = xx === 0 || yy === 0 || xx === w - 1 || yy === h - 1 || !m[i - 1] || !m[i + 1] || !m[i - w] || !m[i + w]; p = i * 4; id.data[p] = 53; id.data[p + 1] = 208; id.data[p + 2] = 138; id.data[p + 3] = edge ? 235 : 85; }
      ox.putImageData(id, 0, 0); x.drawImage(oc, 0, 0, cv.width, cv.height);
    }
    if (r.roiPoly) { x.lineWidth = 1; x.setLineDash([3, 3]); x.strokeStyle = '#a78bfa'; ePathPoly(x, r.roiPoly, sx, sy); x.stroke(); x.setLineDash([]); }
    (r.hulls || []).forEach(function (hp) { x.lineWidth = 1; x.strokeStyle = '#ffd54a'; ePathPoly(x, hp, sx, sy); x.stroke(); });
    x.lineWidth = 1.25; x.setLineDash([]);
    x.strokeStyle = '#ff5d4d'; x.beginPath(); x.arc(r.cx * sx, r.cy * sy, r.rp * sx, 0, 7); x.stroke();
    var icx = r.icx != null ? r.icx : r.cx, icy = r.icy != null ? r.icy : r.cy, run = false;
    x.strokeStyle = r.irisUncertain ? '#ffb224' : '#17a9f0'; x.setLineDash(r.irisUncertain ? [5, 4] : []); x.beginPath();
    for (a = 0; a <= 360; a++) {                       /* draw the limbus only where it lies inside the open eyelids */
      var px = icx + r.ri * Math.cos(a * Math.PI / 180), py = icy + r.ri * Math.sin(a * Math.PI / 180), ix = Math.round(px), iy = Math.round(py),
        ok = !r.aperture || (ix >= 0 && ix < w && iy >= 0 && iy < h && r.aperture[iy * w + ix]);
      if (ok) { if (!run) { x.moveTo(px * sx, py * sy); run = true; } else x.lineTo(px * sx, py * sy); } else run = false;
    }
    x.stroke(); x.setLineDash([]);
  }
  function overlay(cv, r) {
    var x = cv.getContext('2d'), sx = cv.width / r.w, sy = cv.height / r.h; x.lineWidth = 2;
    if (r.mode === 'eye' && r.found) eyeOverlay(x, cv, r, sx, sy);
    if (r.mode === 'skin' && r.lesion) { var b = r.lesion.bbox; x.strokeStyle = '#ffd54a'; x.strokeRect(b[0] * sx, b[1] * sy, (b[2] - b[0]) * sx, (b[3] - b[1]) * sy); }
    if (r.mode === 'scan' && r.region && r.cues.some(function (c) { return c.id === 'scan_dark'; })) { var q = r.region.bbox; x.strokeStyle = '#ffd54a'; x.strokeRect(q[0] * sx, q[1] * sy, (q[2] - q[0]) * sx, (q[3] - q[1]) * sy); }
  }
  function showImage(el, src) {
    var cv = el.querySelector('#opCv'), w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height, sc = Math.min(1, 560 / w); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height); St.img = src; var r = analyze(src); overlay(cv, r); renderResult(el);
  }
  function renderResult(el) {
    var r = St.result, box = el.querySelector('#opRes'); if (!r) { box.innerHTML = '<p class="fine">' + esc(L('op_empty')) + '</p>'; return; }
    var qb = r.q.ok ? '<span class="badge2 bd-pass">' + esc(L('op_q_ok')) + '</span>' : r.q.issues.map(function (i) { return '<span class="badge2 bd-info">' + esc(L('op_q_' + i)) + '</span>'; }).join(' ');
    var M = r.meas, rows = [];
    if (r.mode === 'eye') { if (r.found) rows.push([L('op_m_ratio'), M.ratio + (M.pupilMm ? ' (≈ ' + M.pupilMm + ' mm)' : '')]); if (M.a != null) { rows.push([L('op_m_scl'), 'L* ' + M.L + ' · a* ' + M.a + ' · b* ' + M.b]); rows.push([L('op_m_redf'), Math.round(M.redFrac * 100) + ' %']); } }
    else if (r.mode === 'skin') { rows.push([L('op_m_redarea'), Math.round(M.redFrac * 100) + ' %']); if (r.lesion) { rows.push([L('op_m_les'), Math.round(r.lesion.frac * 1000) / 10 + ' % · ' + L('op_m_circ') + ' ' + r.lesion.circ + ' · ' + L('op_m_asym') + ' ' + r.lesion.asym]); if (r.lesion.cm2 != null) rows.push([L('op_m_size'), r.lesion.cm + ' cm · ' + r.lesion.cm2 + ' cm²']); } }
    else { rows.push([L('op_m_bright'), M.mean + ' / 255']); rows.push([L('op_m_dark'), Math.round(M.darkFrac * 1000) / 10 + ' %']); rows.push([L('op_m_speck'), M.contrast]); }
    var bandbars = r.mode === 'scan' ? '<div class="op-bands" aria-label="' + esc(L('op_m_depth')) + '">' + M.bands.map(function (v) { return '<i style="height:' + Math.max(3, Math.round(v / 255 * 46)) + 'px"></i>'; }).join('') + '</div>' : '';
    var base = r.base && r.mode === 'eye' && r.found ? '<p class="fine">' + esc(L('op_base_cmp', { b: r.base.ratio, d: (r.meas.ratio - r.base.ratio >= 0 ? '+' : '') + (r.meas.ratio - r.base.ratio).toFixed(2) })) + '</p>' : '';
    box.innerHTML = '<div class="row"><b>' + esc(L('op_quality')) + '</b> ' + qb + ' <span class="fine">' + esc(L('op_qs', { m: r.q.mean, f: r.q.focus })) + '</span></div>' +
      '<h4>' + esc(L('op_tags')) + ' <span class="badge2 bd-assumed">' + esc(L('op_rule')) + '</span></h4><div class="op-legend"><span class="k1">&#9888; <b>' + esc(L('op_qc')) + '</b> ' + esc(L('op_leg_qc')) + '</span><span class="k2">&#9679; <b>' + esc(L('op_leg_fd_t')) + '</b> ' + esc(L('op_leg_fd')) + '</span></div><div class="op-tags" id="opTags">' + r.cues.map(function (c) { var qc = QCIDS.indexOf(c.id) >= 0, tip = qc ? L('ot_' + c.id, tipP()) : '', has = tip && tip !== 'ot_' + c.id;
        return '<span class="op-tag ' + (qc ? 'qc' : c.sev) + '"' + (has ? ' tabindex="0" role="note" data-tip="' + esc(tip) + '" aria-label="' + esc(L('oc_' + c.id, c.p || {}) + '. ' + tip) + '"' : '') + '>' + esc(L('oc_' + c.id, c.p || {})) + (qc ? ' <i>' + esc(L('op_qc')) + '</i>' : (c.sev === 'mild' || c.sev === 'notable' ? ' <i>' + esc(L('op_sev_' + c.sev)) + '</i>' : '')) + '</span>'; }).join('') + '</div>' +
      '<table><tbody>' + rows.map(function (q) { return '<tr><td>' + esc(q[0]) + '</td><td class="num"><b>' + esc(String(q[1])) + '</b></td></tr>'; }).join('') + '</tbody></table>' + bandbars + base +
      '<h4>' + esc(L('op_proto')) + ' <button type="button" class="exb" data-explain="v15_optic" aria-label="?">?</button>' + '</h4><ul id="opRecs">' + r.recs.map(function (k) { return '<li>' + esc(L(k)) + '</li>'; }).join('') + '</ul>' + (r.ctx ? '<p class="op-ctx">' + esc(r.ctx) + '</p>' : '') +
      '<div class="row"><button type="button" class="b go" id="opAdd">' + esc(L('op_add')) + '</button>' + (r.mode === 'eye' && r.found ? '<button type="button" class="b" id="opBase">' + esc(L('op_setbase')) + '</button>' : '') + '<button type="button" class="b" id="opRetake">' + esc(L('op_retake')) + '</button></div><div class="fine" id="opMsg" role="status"></div>' +
      '<p class="fine">' + esc(L('op_disc')) + '</p>';
    box.querySelector('#opAdd').onclick = function () { if (window.RCPTHist) { window.RCPTHist.add({ kind: 'image', title: L('op_m_' + r.mode) + ' · ' + curCrew().name, maxR: null, dose: null, note: r.tag + ' (' + L('op_rule') + ')' }); } box.querySelector('#opMsg').textContent = L('op_added'); };
    var bb = box.querySelector('#opBase'); if (bb) bb.onclick = function () { lsSet('rcpt.optic.base.' + r.crew + '.' + r.mode, { ratio: r.meas.ratio, a: r.meas.a, b: r.meas.b, ts: Date.now() }); box.querySelector('#opMsg').textContent = L('op_based'); };
    box.querySelector('#opRetake').onclick = function () { St.result = null; St.forced = null; tabAssess(el); };
  }
  function tabAssess(el) {
    cur = el; var crew = (window.RCPTCrew && window.RCPTCrew.crew()) || [], c = curCrew();
    el.innerHTML = '<div class="op-wrap"><div class="op-left"><div class="row"><b class="fine">' + esc(L('op_mode')) + '</b>' + ['eye', 'skin', 'scan'].map(function (m) { return '<button type="button" class="b' + (St.mode === m ? ' go' : '') + '" data-mode="' + m + '" aria-pressed="' + (St.mode === m) + '">' + esc(L('op_m_' + m)) + '</button>'; }).join('') +
      '<label class="fine" for="opCrew">' + esc(L('q_crew')) + '</label><select id="opCrew">' + crew.map(function (k) { return '<option value="' + k.id + '"' + (k.id === c.id ? ' selected' : '') + '>' + esc(k.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="card op-guide"><p>' + esc(L('op_g_' + St.mode)) + '</p>' + (St.mode === 'skin' ? '<div class="row"><label class="fine" for="opW">' + esc(L('op_width')) + '</label><input type="number" id="opW" min="0" max="60" step="0.5" value="' + (St.widthCm || '') + '" style="width:80px"></div>' : '') + '</div>' +
      '<div class="op-src"><b>' + esc(L('op_src_h')) + '</b><div class="op-src-b"><label class="b go op-big op-file" for="opFile">' + esc(L('op_src_up')) + '</label><input type="file" id="opFile" accept="image/*" hidden><button type="button" class="b go op-big" id="opCam">' + esc(L('op_src_cam')) + '</button><button type="button" class="b go op-big" id="opSnap" hidden>' + esc(L('op_snap')) + '</button></div><div class="op-src-s"><span class="fine">' + esc(L('op_src_drop')) + '</span><button type="button" class="b" id="opSample">' + esc(L('op_sample')) + '</button>' + (St.mode === 'eye' ? '<button type="button" class="b" id="opSample2">' + esc(L('op_sample2')) + '</button>' : '') + '</div><div class="fine" id="opCamMsg" role="status"></div></div>' +
      '<div class="op-cvw"><canvas id="opCv" width="560" height="380" role="img" aria-label="' + esc(L('op_alt')) + '"></canvas><video id="opVid" playsinline muted hidden></video></div>' +
 +
      '<p class="fine">' + esc(L('op_priv')) + '</p></div><div class="op-right"><div id="opRes"></div></div></div>';
    el.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { stopCam(); St.mode = b.getAttribute('data-mode'); St.result = null; St.forced = null; tabAssess(el); }; });
    el.querySelector('#opCrew').onchange = function () { if (window.RCPTQuests) window.RCPTQuests.select(this.value); tabAssess(el); };
    var wI = el.querySelector('#opW'); if (wI) wI.onchange = function () { St.widthCm = +this.value || 0; if (St.img) showImage(el, St.img); };
    var dz = el.querySelector('.op-cvw'); ['dragover', 'dragenter'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); }); }); dz.addEventListener('dragleave', function () { dz.classList.remove('drag'); }); dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('drag'); var fl = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (fl && /^image\//.test(fl.type)) { stopCam(); loadFile(el, fl); } });
    var f = el.querySelector('#opFile'); f.onchange = function () { var fl = f.files && f.files[0]; if (fl) loadFile(el, fl); };
    var cvw = el.querySelector('.op-cvw'); ['dragover', 'drop'].forEach(function (ev) { cvw.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) loadFile(el, e.dataTransfer.files[0]); }); });
    el.querySelector('#opSample').onclick = function () { stopCam(); var s = sample(St.mode === 'eye' ? 'eye' : St.mode === 'skin' ? 'skin' : 'scan'); showImage(el, s); };
    var s2 = el.querySelector('#opSample2'); if (s2) s2.onclick = function () { stopCam(); showImage(el, sample('eye2')); };
    el.querySelector('#opCam').onclick = function () { startCam(el); };
    el.querySelector('#opSnap').onclick = function () { var v = el.querySelector('#opVid'); if (v.videoWidth) { var c2 = document.createElement('canvas'); c2.width = v.videoWidth; c2.height = v.videoHeight; c2.getContext('2d').drawImage(v, 0, 0); stopCam(); el.querySelector('#opVid').hidden = true; el.querySelector('#opCv').hidden = false; el.querySelector('#opSnap').hidden = true; showImage(el, c2); } };
    var cv = el.querySelector('#opCv'); cv.addEventListener('click', function (e) { if (St.mode !== 'eye' || !St.img || !St.result) return; var r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * St.result.w, py = (e.clientY - r.top) / r.height * St.result.h; St.forced = { cx: px, cy: py }; showImage(el, St.img); });
    if (St.img && St.result) { showImage(el, St.img); } else renderResult(el);
  }
  function loadFile(el, file) {
    stopCam(); var done = function (src) { showImage(el, src); };
    if (window.createImageBitmap) createImageBitmap(file).then(done, function () { viaReader(); }); else viaReader();
    function viaReader() { var fr = new FileReader(); fr.onload = function () { var im = new Image(); im.onload = function () { done(im); }; im.src = fr.result; }; fr.readAsDataURL(file); }
  }
  function startCam(el) {
    var msg = el.querySelector('#opCamMsg'); if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = L('op_cam_na'); return; }
    msg.textContent = L('op_cam_wait');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (s) {
      St.stream = s; var v = el.querySelector('#opVid'); v.srcObject = s; v.hidden = false; el.querySelector('#opCv').hidden = true; v.play(); el.querySelector('#opSnap').hidden = false; msg.textContent = L('op_cam_on');
    }, function (e) { msg.textContent = L('op_cam_err', { e: (e && e.name) || 'error' }); });
  }
  function tabLog(el) {
    var h = window.RCPTHist ? window.RCPTHist.all().filter(function (x) { return x.kind === 'image'; }) : [];
    el.innerHTML = '<h3>' + esc(L('op_log_h')) + '</h3><p class="fine">' + esc(L('op_log_p')) + '</p>' + (h.length ? '<table><thead><tr><th>' + esc(L('lk_when')) + '</th><th>' + esc(L('lk_what')) + '</th><th>' + esc(L('op_tags')) + '</th></tr></thead><tbody>' + h.map(function (x) { return '<tr><td class="fine" style="white-space:nowrap">' + esc(new Date(x.ts).toLocaleString()) + '</td><td>' + esc(x.title) + '</td><td>' + esc(x.note || '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="fine">' + esc(L('op_log_empty')) + '</p>');
  }
  panel = U.panel({ id: 'opticPanel', title: function () { return L('op_title'); }, tabs: [{ id: 'assess', key: 'op_tab', label: 'Assess', render: tabAssess }, { id: 'log', key: 'op_tab2', label: 'Findings', render: tabLog }] });
  var origClose = panel.close; panel.close = function () { stopCam(); origClose(); };
  panel.root.querySelector('.pn-x').addEventListener('click', stopCam);
  function open(mode) { if (mode && ['eye', 'skin', 'scan'].indexOf(mode) >= 0 && St.mode !== mode) { St.mode = mode; St.result = null; St.img = null; St.forced = null; } panel.open('assess'); }

  /* sidebar card */
  function updateCard() {
    var c = document.getElementById('optCard'); if (!c) return; var s = St.last;
    c.querySelector('#optLast').textContent = s ? (s.tag || L('op_clear')) + ' · ' + new Date(s.ts).toLocaleTimeString() : L('op_none');
    c.querySelector('#optLast').className = 'opt-last' + (s ? (s.worst >= 3 ? ' notable' : s.worst === 2 ? ' mild' : ' ok') : '');
  }
  function mount() {
    if (document.getElementById('optCard')) return; var sim = document.querySelector('.side .sim'); if (!sim) return;
    var d = document.createElement('div'); d.id = 'optCard'; d.className = 'opt-card';
    d.innerHTML = '<h4 id="optH"></h4><div class="opt-last" id="optLast"></div><div class="row opt-row"><button type="button" class="tb go" id="optEye" data-m="eye"></button><button type="button" class="tb go" id="optSkin" data-m="skin"></button><button type="button" class="tb go" id="optScan" data-m="scan"></button></div><div class="fine" id="optPriv"></div>';
    sim.parentNode.insertBefore(d, sim); d.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { open(b.getAttribute('data-m')); }; }); labels();
  }
  function labels() { var c = document.getElementById('optCard'); if (!c) return; c.querySelector('#optH').textContent = L('op_title'); c.querySelector('#optEye').textContent = L('op_m_eye'); c.querySelector('#optSkin').textContent = L('op_m_skin'); c.querySelector('#optScan').textContent = L('op_m_scan'); c.querySelector('#optPriv').textContent = L('op_priv_s'); updateCard(); }
  document.addEventListener('DOMContentLoaded', mount); document.addEventListener('rcpt:lang', labels); document.addEventListener('rcpt:launch', function () { mount(); labels(); });

  window.RCPTOptic = { open: open, close: panel.close, isOpen: panel.isOpen, analyzeEye: analyzeEye, setLandmarks: function (lm) { St.landmarks = lm || null; }, eyeFromMesh: eyeFromMesh, analyzeSkin: analyzeSkin, analyzeScan: analyzeScan, toWork: toWork, sample: sample, quality: quality, recommend: recommend, state: St, loadSample: function (kind) { var el = cur; if (!el || !el.isConnected) return null; showImage(el, sample(kind)); return St.result; }, last: function () { return St.last; }, lab: lab };
})();
