/* Space-weather data layer (runs in the Electron main process; the renderer has no network).
   Source: NOAA SWPC public JSON, GOES primary integral proton flux, 1-day.
   Record format (verified against the live feed): {time_tag, satellite, flux, energy:">=10 MeV"} with energies >=1,5,10,30,50,60,100,500 MeV.
   Offline behaviour: last good response is cached on disk; if there is no cache a small bundled reference is returned. Every result says which one it is. */
'use strict';
const fs = require('fs');
const path = require('path');

const HOST = 'services.swpc.noaa.gov';
const URL_P = 'https://' + HOST + '/json/goes/primary/integral-protons-1-day.json';
const MAX_BYTES = 6 * 1024 * 1024;

/* One real record seen on the live feed (GOES-18, 2026-10-09T08:25Z, >=10 MeV = 0.378 pfu). Used only when there is no cache and no network. */
const BUNDLED = {
  kind: 'bundled', fetchedAt: null, observedAt: '2026-10-09T08:25:00Z', satellite: 18,
  flux10: 0.3779, flux10max24: 0.3779, flux100: 0.2174, series: [],
  note: 'Bundled reference: a single quiet-Sun reading from the NOAA feed (2026-10-09). Not live.'
};

/* NOAA Space Weather Scales, S-scale for solar radiation storms: flux of >=10 MeV protons (pfu). */
const S_LEVELS = [[1e5, 5], [1e4, 4], [1e3, 3], [1e2, 2], [10, 1]];
function sScale(f) { for (const [v, s] of S_LEVELS) if (f >= v) return s; return 0; }

/* ASSUMED mapping from >=10 MeV flux to the app's simulated crew dose rate (mSv/hr).
   Log-linear between S1 (10 pfu -> baseline 0.5) and S4 (1e4 pfu -> 18.5, the app's Acute SPE stress test). Not a dosimetry conversion. */
function assumedDose(f10) {
  const x = Math.min(1, Math.max(0, (Math.log10(Math.max(f10, 1e-6)) - 1) / 3));
  return +(0.5 + 18 * x).toFixed(2);
}

function parse(json) {
  if (!Array.isArray(json)) throw new Error('unexpected feed format');
  const rows = json.filter(r => r && r.energy === '>=10 MeV' && isFinite(r.flux) && r.time_tag)
    .sort((a, b) => a.time_tag < b.time_tag ? -1 : 1);
  if (!rows.length) throw new Error('no >=10 MeV records in feed');
  const last = rows[rows.length - 1];
  const r100 = json.filter(r => r && r.energy === '>=100 MeV' && r.time_tag === last.time_tag)[0];
  const step = Math.max(1, Math.ceil(rows.length / 96));
  const series = rows.filter((_, i) => i % step === 0 || i === rows.length - 1).map(r => [r.time_tag, +(+r.flux).toPrecision(4)]);
  return {
    kind: 'live', observedAt: last.time_tag, satellite: last.satellite,
    flux10: +last.flux, flux10max24: Math.max.apply(null, rows.map(r => +r.flux)),
    flux100: r100 ? +r100.flux : null, series
  };
}

function decorate(d, kind, fetchedAt) {
  const o = Object.assign({}, d, { kind, fetchedAt });
  o.sScale = sScale(o.flux10); o.sScaleMax24 = sScale(o.flux10max24); o.assumedDose = assumedDose(o.flux10);
  o.source = 'NOAA SWPC GOES integral protons (>=10 MeV)';
  return o;
}

function create(dir, fetchImpl) {
  const file = path.join(dir, 'swpc-cache.json');
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  function readCache() { try { const c = JSON.parse(fs.readFileSync(file, 'utf8')); if (c && c.data && c.savedAt) return c; } catch (e) { } return null; }
  function writeCache(data) { try { fs.mkdirSync(dir, { recursive: true }); const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ savedAt: new Date().toISOString(), data })); fs.renameSync(tmp, file); } catch (e) { } }
  /* get({refresh}) never throws: it returns live data, else cache, else bundled, plus an `error` string when a refresh failed. */
  async function get(opt) {
    const refresh = !!(opt && opt.refresh), c = readCache();
    if (!refresh) return c ? decorate(c.data, 'cache', c.savedAt) : decorate(BUNDLED, 'bundled', null);
    let err = null;
    try {
      if (!doFetch) throw new Error('no network API');
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null, to = ac && setTimeout(() => ac.abort(), 15000);
      const res = await doFetch(URL_P, { signal: ac ? ac.signal : undefined, headers: { 'User-Agent': 'RCPT-desktop (research prototype)' } });
      if (to) clearTimeout(to);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const txt = await res.text();
      if (txt.length > MAX_BYTES) throw new Error('response too large');
      const d = parse(JSON.parse(txt));
      writeCache(d);
      return decorate(d, 'live', new Date().toISOString());
    } catch (e) { err = String(e && e.message || e); }
    const out = c ? decorate(c.data, 'cache', c.savedAt) : decorate(BUNDLED, 'bundled', null);
    out.error = err; return out;
  }
  return { get, file };
}

module.exports = { create, parse, sScale, assumedDose, URL: URL_P, HOST, BUNDLED };
