// RCPT core science: the multi-system risk model (R_MRP), 40 h SPE trajectory,
// sensitivity analysis, Mars dose validation and the published reference values.
// All formulas mirror the RCPT reference build so every number stays explainable.

export const ELEVATED_THRESHOLD = 35;
export const EMERGENCY_THRESHOLD = 70;
export const DOSE_EMERGENCY_RATE = 10; // mSv/hr
export const CI_LOW = 4.2;
export const CI_HIGH = 4.8;

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const DEFAULT_PARAMS = Object.freeze({
  wr: 0.4, // radiation weight
  wh: 0.35, // HRV weight
  ws: 0.25, // sleep weight
  g1: 0.05, // dose x sleep-debt coupling
  g2: 0.03, // dose x HRV-strain coupling
  k: 0.08, // radiation saturation rate
});

export const PARAM_LABELS = {
  wr: 'Radiation weight (0.40)',
  wh: 'HRV weight (0.35)',
  ws: 'Sleep weight (0.25)',
  g1: 'Dose × sleep-debt coupling (0.05)',
  g2: 'Dose × HRV-strain coupling (0.03)',
  k: 'Radiation saturation rate (0.08)',
};

export const SCENARIOS = [
  {
    id: 'nominal',
    name: 'Nominal Orbit',
    short: 'Calm orbit',
    d: 0.5,
    h: 65,
    s: 1,
    desc: 'Deep-space GCR background with a well-rested crew.',
  },
  {
    id: 'sleep',
    name: 'Sleep Deprived + High Workload',
    short: 'Sleep-deprived crew',
    d: 1.2,
    h: 38,
    s: 5.5,
    desc: 'Low HRV and five and a half hours of sleep debt at modest dose.',
  },
  {
    id: 'spe',
    name: 'Acute Solar Particle Event (SPE)',
    short: 'Acute solar storm',
    d: 18.5,
    h: 42,
    s: 4,
    desc: '18.5 mSv/hr stress test — shelter immediately, whatever the score.',
  },
];

export const INPUT_LIMITS = {
  d: { min: 0, max: 50, step: 0.1 },
  h: { min: 10, max: 100, step: 1 },
  s: { min: 0, max: 10, step: 0.5 },
};

export function tierOf(d, R) {
  if (d >= DOSE_EMERGENCY_RATE || R >= EMERGENCY_THRESHOLD) return 'emergency';
  if (R >= ELEVATED_THRESHOLD) return 'elevated';
  return 'nominal';
}

export const TIER_META = {
  nominal: { label: 'Nominal', tone: 'good', text: 'text-[#35d08a]', border: 'border-[#35d08a]/35', bg: 'bg-[#35d08a]/10', hex: '#35d08a' },
  elevated: { label: 'Elevated', tone: 'warn', text: 'text-[#ffb224]', border: 'border-[#ffb224]/40', bg: 'bg-[#ffb224]/10', hex: '#ffb224' },
  emergency: { label: 'Emergency', tone: 'bad', text: 'text-[#ff5d4d]', border: 'border-[#ff5d4d]/45', bg: 'bg-[#ff5d4d]/15', hex: '#ff5d4d' },
};

/**
 * The RCPT multi-system risk index.
 * R = clip( wr·f_rad + wh·f_hrv + ws·f_sleep + g1·d·s + g2·d·f_hrv , 0, 100 )
 */
export function riskModel(d, h, s, params = DEFAULT_PARAMS) {
  const dose = Number.isFinite(+d) ? +d : 0;
  const hrv = Number.isFinite(+h) ? +h : 70;
  const sleep = Number.isFinite(+s) ? +s : 0;

  const fr = 100 * (1 - Math.exp(-params.k * dose));
  const fh = 100 * Math.max(0, (70 - hrv) / 70);
  const fs = Math.min(100, 12.5 * sleep);

  const it1 = params.g1 * dose * sleep;
  const it2 = params.g2 * dose * fh;
  const it = it1 + it2;

  const R = clamp(params.wr * fr + params.wh * fh + params.ws * fs + it, 0, 100);
  const tier = tierOf(dose, R);

  return {
    d: dose,
    h: hrv,
    s: sleep,
    fr,
    fh,
    fs,
    it1,
    it2,
    it,
    bars: [params.wr * fr, params.wh * fh, params.ws * fs, it],
    R,
    lo: Math.max(0, R - CI_LOW),
    hi: Math.min(100, R + CI_HIGH),
    tier,
    overDoseRule: dose >= DOSE_EMERGENCY_RATE,
  };
}

export function protocolsFor(model) {
  if (!model) return { tier: 'nominal', title: 'Nominal operations', steps: [] };
  if (model.d >= DOSE_EMERGENCY_RATE) {
    return {
      tier: 'emergency',
      title: 'Action required: immediate radiation sheltering',
      steps: [
        'Move to the storm shelter (water wall / central module).',
        'Follow the crew antioxidant countermeasure plan set by the flight surgeon (illustrative).',
        'Halt non-essential EVA activity immediately.',
      ],
    };
  }
  if (model.R >= ELEVATED_THRESHOLD) {
    return {
      tier: 'elevated',
      title: 'Action required: workload reduction',
      steps: [
        'Schedule a mandatory 60-minute sleep extension.',
        'Increase fluid and electrolyte intake by +500 mL.',
        'Lower physical resistance training intensity by 20%.',
      ],
    };
  }
  return {
    tier: 'nominal',
    title: 'Nominal operations',
    steps: [
      'Continue the standard exercise routine (ARED / treadmill).',
      'Maintain the standard circadian light-cycle exposure.',
      'All data stays on this device; no ground link is needed.',
    ],
  };
}

export function systemChips(model) {
  if (!model) return [];
  return [
    { id: 'cv', name: 'Cardiovascular', bad: model.fh > 40, badLabel: 'High strain', okLabel: 'Stable' },
    { id: 'cns', name: 'Central nervous', bad: model.fs > 40, badLabel: 'Disrupted', okLabel: 'Nominal' },
    { id: 'cell', name: 'Cellular repair', bad: model.it > 2, badLabel: 'Compromised', okLabel: 'Optimal' },
  ];
}

/* ---------------------------------------------------------------- *
 * 40-hour simulated solar particle event (same assumptions as the
 * reference mission profile: onset at h 12, 10 h decay constant).
 * ---------------------------------------------------------------- */
export function speProfile(t) {
  const d = t < 12 ? 0.5 : 0.5 + 18 * Math.exp(-(t - 12) / 10);
  const k = t < 12 ? 0 : Math.min(1, (t - 12) / 6);
  const h = 65 - 23 * k + (t > 24 ? (t - 24) * 0.1 : 0);
  const s = t < 12 ? 1 : Math.min(4, 1 + (t - 12) * 0.5);
  return { d, h, s };
}

function seeded(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 40 h mission trajectory with measurement noise, for the telemetry chart. */
export function buildTrajectory() {
  const rnd = seeded(2026);
  const out = [];
  for (let i = 0; i <= 160; i += 1) {
    const t = i / 4;
    const p = speProfile(t);
    let base = p.d;
    if (t > 12 && t < 16) base *= 1 + 0.18 * Math.sin((t - 12) * 2.4); // flux fluctuations at onset
    const nz = 1 + (rnd() - 0.5) * 0.14;
    const d = Math.max(0.05, base * nz + (rnd() - 0.5) * 0.08);
    const circ = 3 * Math.sin((2 * Math.PI * t) / 24);
    const h = p.h + circ + (rnd() - 0.5) * 5;
    const s = Math.max(0, p.s + (rnd() - 0.5) * 0.08);
    const m = riskModel(d, h, s);
    out.push({ t, d, h, s, R: m.R, lo: m.lo, hi: m.hi });
  }
  return out;
}

export const TRAJECTORY = buildTrajectory();

/* ---------------------------------------------------------------- *
 * Sensitivity analysis (one-at-a-time tornado + Monte Carlo draws)
 * ---------------------------------------------------------------- */
export function selfCheck() {
  let worst = 0;
  for (let d = 0; d <= 50; d += 2.5) {
    for (let h = 10; h <= 100; h += 10) {
      for (let s = 0; s <= 10; s += 1) {
        worst = Math.max(worst, Math.abs(riskModel(d, h, s, DEFAULT_PARAMS).R - riskModel(d, h, s).R));
      }
    }
  }
  return worst;
}

export function sensitivity(span = 0.25, N = 4000) {
  const keys = Object.keys(DEFAULT_PARAMS);
  const out = { span, N, tornado: [], mc: [] };

  SCENARIOS.forEach((sc, pi) => {
    const base = riskModel(sc.d, sc.h, sc.s).R;
    const rows = keys
      .map((k) => {
        const lo = riskModel(sc.d, sc.h, sc.s, { ...DEFAULT_PARAMS, [k]: DEFAULT_PARAMS[k] * (1 - span) }).R - base;
        const hi = riskModel(sc.d, sc.h, sc.s, { ...DEFAULT_PARAMS, [k]: DEFAULT_PARAMS[k] * (1 + span) }).R - base;
        return { k, lo, hi };
      })
      .sort((a, b) => Math.max(Math.abs(b.lo), Math.abs(b.hi)) - Math.max(Math.abs(a.lo), Math.abs(a.hi)));
    out.tornado.push({ scenario: sc, base, rows });

    const rnd = seeded(1000 + pi);
    const vals = [];
    let flips = 0;
    const baseTier = tierOf(sc.d, base);
    for (let n = 0; n < N; n += 1) {
      const p = {};
      keys.forEach((k) => {
        p[k] = DEFAULT_PARAMS[k] * (1 - span + 2 * span * rnd());
      });
      const R = riskModel(sc.d, sc.h, sc.s, p).R;
      vals.push(R);
      if (tierOf(sc.d, R) !== baseTier) flips += 1;
    }
    vals.sort((a, b) => a - b);
    out.mc.push({
      name: sc.name,
      base,
      p5: vals[Math.floor(0.05 * N)],
      p95: vals[Math.floor(0.95 * N)],
      flip: flips / N,
      tier: baseTier,
    });
  });

  return out;
}

/* ---------------------------------------------------------------- *
 * Published reference values + Mars dose validation
 * ---------------------------------------------------------------- */
export const REFERENCE = {
  surfaceGale: {
    v: 0.64,
    sd: 0.12,
    src: 'Hassler et al. 2014, Science 343:1244797 (Curiosity RAD, GCR dose equivalent, ~300 sols from Aug 2012)',
  },
  annualGale: {
    v: 0.7,
    src: 'Guo et al. 2015, arXiv:1507.03473 (annual-average surface dose equivalent, quality factor 3.05)',
  },
  pressure: {
    p1: 700,
    p2: 970,
    dEq: 0.1,
    frac: 0.16,
    src: 'Guo et al. 2015: 700 → ~970 Pa changes the dose equivalent rate by about 0.1 mSv/day (~16% of the annual average)',
  },
  cruise: { v: 1.84, src: 'Zeitlin et al. 2013, Science 340:1080 (MSL RAD during cruise, inside the spacecraft)' },
  galeKm: -4.4,
};

export function columnDensity(hKm) {
  return 16.4 * Math.exp(-hKm / 11.1);
}

export function marsGcrDay(hKm) {
  const X = columnDensity(hKm);
  return 0.937 * (0.55 + 0.45 * Math.exp(-X / 20));
}

export function pressureToHeight(pa) {
  return -11.1 * Math.log(pa / 610);
}

export function validation() {
  const { p1, p2 } = REFERENCE.pressure;
  const gale = marsGcrDay(REFERENCE.galeKm);
  const g1 = marsGcrDay(pressureToHeight(p1));
  const g2 = marsGcrDay(pressureToHeight(p2));
  const dModel = g1 - g2;
  const top = marsGcrDay(40);
  return {
    gale,
    annualDiff: (gale - REFERENCE.annualGale.v) / REFERENCE.annualGale.v,
    withinSd: Math.abs(gale - REFERENCE.surfaceGale.v) <= REFERENCE.surfaceGale.sd,
    g1,
    g2,
    dModel,
    fracModel: dModel / ((g1 + g2) / 2),
    ratio: dModel / REFERENCE.pressure.dEq,
    top,
    cruiseEst: top * 2,
    cruiseRatio: (top * 2) / REFERENCE.cruise.v,
  };
}

export const SOURCES = [
  {
    id: 'hassler',
    cite: 'Hassler et al. (2014)',
    title: "Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover",
    journal: 'Science 343(6169):1244797',
    url: 'https://doi.org/10.1126/science.1244797',
    used: 'Surface GCR dose equivalent ≈ 0.64 mSv/day at Gale (calibration point).',
  },
  {
    id: 'zeitlin',
    cite: 'Zeitlin et al. (2013)',
    title: 'Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory',
    journal: 'Science 340:1080–1084',
    url: 'https://doi.org/10.1126/science.1235989',
    used: 'Cruise dose equivalent ≈ 1.84 mSv/day (plausibility check).',
  },
  {
    id: 'guo',
    cite: 'Guo et al. (2015)',
    title: 'Modeling the variations of dose rate measured by RAD during the first MSL Martian year: 2012–2014',
    journal: 'arXiv:1507.03473',
    url: 'https://arxiv.org/abs/1507.03473',
    used: 'Annual-average ≈ 0.7 mSv/day; dose falls with rising pressure (the held-out check).',
  },
  {
    id: 'noaa',
    cite: 'NOAA SWPC',
    title: 'GOES primary integral proton flux (JSON) and NOAA Space Weather Scales (S1–S5 solar radiation storms)',
    journal: 'services.swpc.noaa.gov',
    url: 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json',
    used: 'Live/cached storm input; S-scale thresholds 10 / 10² / 10³ / 10⁴ / 10⁵ pfu at ≥10 MeV.',
  },
  {
    id: 'smith',
    cite: 'Smith et al. (2001)',
    title: 'Mars Orbiter Laser Altimeter: experiment summary after the first year of global mapping of Mars',
    journal: 'J. Geophys. Res. 106(E10):23689–23722',
    url: 'https://doi.org/10.1029/2000JE001364',
    used: 'Reference for real Mars elevation (MOLA).',
  },
  {
    id: 'factsheet',
    cite: 'NASA Mars Fact Sheet',
    title: 'Mean surface pressure about 6.1 mbar (610 Pa), scale height about 11 km, gravity 3.71 m/s²',
    journal: 'nssdc.gsfc.nasa.gov',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    used: 'Pressure and column-density formulas.',
  },
];

export const OWN_ASSUMPTIONS = [
  'RCPT weights 0.40 / 0.35 / 0.25, couplings 0.05 and 0.03, saturation rate 0.08, 70 ms HRV reference, tier thresholds 35 / 70 / 10 mSv/hr.',
  'The fixed −4.2 / +4.8 display band — a display choice, not a statistical confidence interval.',
  'Shelter attenuation factor 0.2, habitat factor 0.6, sleep-repay ratio 1.0.',
  'Mapping from proton flux to crew dose rate; the 18.5 mSv/hr storm stress test.',
  'Shape constants of the Mars dose model (0.55 / 0.45 floor split, 20 g/cm² attenuation length).',
  'The stylised Mars terrain, temperatures and hazard index in the atlas.',
];

/* Organ-system indices derived from the same terms as the dashboard model. */
export function organSystems(model) {
  if (!model) return [];
  const R = model.R;
  const m = (v) => Math.round(clamp(v, 0, 100));
  return [
    {
      id: 'brain',
      name: 'Brain & neurological',
      index: m(18 + 0.55 * model.fs + 0.25 * model.fh),
      driver: 'Sleep debt (EEG alpha/beta) and autonomic arousal',
      note: 'Sleep debt is the dominant term here: cognitive latency and situational awareness degrade before the crew notices.',
    },
    {
      id: 'heart',
      name: 'Cardiovascular',
      index: m(16 + 0.9 * model.fh + 0.15 * model.it),
      driver: 'HRV-derived autonomic strain',
      note: 'Falling HRV means rising sympathetic drive and reduced parasympathetic modulation.',
    },
    {
      id: 'marrow',
      name: 'Hematopoietic & immune',
      index: m(12 + 0.75 * model.fr + 0.2 * model.it),
      driver: 'Ionising dose rate (GCR and solar protons)',
      note: 'Bone-marrow stem cells and DNA repair are the most dose-sensitive tissue in this model.',
    },
    {
      id: 'eyes',
      name: 'Ocular (SANS)',
      index: m(14 + 0.35 * R + 0.1 * model.fh),
      driver: 'Headward fluid shift plus general strain',
      note: 'Optic-disc oedema risk is a microgravity effect this model only represents indirectly.',
    },
    {
      id: 'lungs',
      name: 'Pulmonary',
      index: m(10 + 0.3 * R + 0.25 * model.fs),
      driver: 'Strain load and fatigue-driven breathing pattern',
      note: 'Gas exchange inside a suit is not modelled; the index is a strain proxy only.',
    },
    {
      id: 'gut',
      name: 'Gastrointestinal',
      index: m(12 + 0.45 * model.fs + 0.2 * model.fh),
      driver: 'Sleep debt and stress arousal',
      note: 'Microbiome and motility shifts are documented in flight but are not measured by the tri-node set.',
    },
  ];
}

export function sleepReadout(model) {
  const debt = model ? model.s : 0;
  const repayHours = Math.min(9, debt * 1.0);
  const projectedDebt = Math.max(0, debt - repayHours);
  const projected = model ? riskModel(model.d, model.h, projectedDebt) : null;
  return {
    debt,
    repayHours,
    projectedDebt,
    projected,
    delta: projected && model ? projected.R - model.R : 0,
    stages: [
      { name: 'N1 · light', pct: 5 },
      { name: 'N2 · light', pct: 45 },
      { name: 'N3 · deep', pct: debt > 4 ? 27 : 18 },
      { name: 'REM', pct: debt > 4 ? 23 : 22 },
    ],
  };
}
