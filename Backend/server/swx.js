// Backend/server/swx.js
// NOAA SWPC space-weather helpers. Ported 1:1 from the RCPT desktop shell (lib/swx.js)
// so the frontend's Data & Validation panel receives exactly the same record shape.
import fs from 'fs';
import path from 'path';

export const URL_PROTONS = 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json';

export const BUNDLED = Object.freeze({
  kind: 'bundled', fetchedAt: null, observedAt: null, satellite: null,
  flux10: 0.3, flux100: 0.02, flux10max24: 0.3, sScale: 0, sScaleMax24: 0,
  assumedDose: 0.5, series: []
});

export function sScale(pfu) {
  if (pfu >= 1e5) return 5;
  if (pfu >= 1e4) return 4;
  if (pfu >= 1e3) return 3;
  if (pfu >= 1e2) return 2;
  if (pfu >= 10) return 1;
  return 0;
}

// Transparent ASSUMED mapping used by the app: S1 (10 pfu) -> 0.5 mSv/hr, S4 (1e4 pfu) -> 18.5 mSv/hr, log-linear.
export function assumedDose(pfu) {
  const lg = Math.log10(Math.max(pfu, 0.01));
  const d = 0.5 + (lg - 1) * (18 / 3);
  return Math.max(0.05, Math.round(d * 10) / 10);
}

export function parse(rows) {
  if (!Array.isArray(rows)) throw new Error('Unexpected NOAA response');
  const norm = (e) => String(e || '').replace(/\s/g, '');
  const pick = (tag) => rows
    .filter((r) => norm(r.energy) === tag && Number.isFinite(+r.flux))
    .sort((a, b) => (a.time_tag < b.time_tag ? -1 : 1));
  const p10 = pick('>=10MeV');
  const p100 = pick('>=100MeV');
  if (!p10.length) throw new Error('No >=10 MeV data in NOAA response');
  const last = p10[p10.length - 1];
  const max24 = Math.max.apply(null, p10.map((r) => +r.flux));
  const l100 = p100.length ? +p100[p100.length - 1].flux : null;
  const step = Math.max(1, Math.floor(p10.length / 288));
  const series = p10
    .filter((_, i) => i % step === 0 || i === p10.length - 1)
    .map((r) => [r.time_tag, +r.flux]);
  return {
    observedAt: last.time_tag,
    satellite: last.satellite != null ? last.satellite : null,
    flux10: +last.flux,
    flux100: l100,
    flux10max24: max24,
    sScale: sScale(+last.flux),
    sScaleMax24: sScale(max24),
    assumedDose: assumedDose(+last.flux),
    series
  };
}

export async function fetchLive(timeoutMs = 15000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(URL_PROTONS, { signal: ac.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('NOAA HTTP ' + res.status);
    return parse(await res.json());
  } finally {
    clearTimeout(t);
  }
}

// Small JSON file cache so the panel still has the last live reading when offline.
export function createCache(dir) {
  const file = path.join(dir, 'swx-cache.json');
  return {
    read() {
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
    },
    write(rec) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(rec));
      } catch { /* cache is optional */ }
    }
  };
}
