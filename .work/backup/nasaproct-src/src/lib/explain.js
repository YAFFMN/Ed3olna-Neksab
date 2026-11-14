// "Explain this number" content. Every value is recomputed from the live model,
// so the popup can never disagree with the dashboard.

const fmt = (v, d = 1) => (Number.isFinite(+v) ? (+v).toFixed(d) : '—');

export const EXPLAIN_TOPICS = [
  { id: 'R', label: 'Risk index R' },
  { id: 'rad', label: 'Radiation impact' },
  { id: 'hrv', label: 'Autonomic strain' },
  { id: 'sleep', label: 'Sleep debt' },
  { id: 'inter', label: 'Non-linear interaction' },
  { id: 'ci', label: 'Interval' },
  { id: 'tier', label: 'Tiers' },
];

export function buildExplain(topic, model) {
  if (!model) return null;
  const { d, h, s, R, fr, fh, fs, it, it1, it2, lo, hi, tier } = model;

  const contribution = {
    type: 'table',
    head: ['Part', 'Formula', 'Value'],
    rows: [
      ['Radiation', `0.40 × f_rad = 0.40 × ${fmt(fr)}`, fmt(0.4 * fr)],
      ['HRV strain', `0.35 × f_hrv = 0.35 × ${fmt(fh)}`, fmt(0.35 * fh)],
      ['Sleep debt', `0.25 × f_sleep = 0.25 × ${fmt(fs)}`, fmt(0.25 * fs)],
      ['Interaction', '0.05·d·s + 0.03·d·f_hrv', fmt(it)],
    ],
  };

  if (topic === 'R') {
    return {
      title: 'Multi-system risk index (R_MRP)',
      blocks: [
        {
          type: 'p',
          text: 'R is a single 0–100 number computed from three inputs: radiation dose rate, heart-rate variability (HRV) and sleep debt. It adds three weighted stress scores plus a term for how they make each other worse.',
        },
        { type: 'eq', text: 'R = clip( 0.40·f_rad + 0.35·f_hrv + 0.25·f_sleep + 0.05·d·s + 0.03·d·f_hrv , 0, 100 )' },
        { type: 'p', text: `With the current inputs (dose ${fmt(d)} mSv/hr, HRV ${Math.round(h)} ms, sleep debt ${fmt(s)} h):` },
        contribution,
        { type: 'p', text: `Total: R = ${fmt(R)} (tier: ${tier}). Elevated starts at 35; emergency at 70, or whenever dose ≥ 10 mSv/hr.` },
        {
          type: 'fine',
          text: 'The weights (0.40 / 0.35 / 0.25) and couplings are modelling assumptions chosen for this prototype. They have not been fitted to crew data. Data & Validation → Sensitivity shows how far the result moves if they change.',
        },
      ],
    };
  }

  if (topic === 'rad') {
    return {
      title: 'Radiation: dose rate and its impact',
      blocks: [
        {
          type: 'p',
          text: 'The dose rate is how fast the crew is absorbing radiation, in millisieverts per hour. It is an input you set (or a scenario sets); this app has no radiation sensor.',
        },
        { type: 'eq', text: `f_rad = 100 · (1 − e^(−0.08·d)) = 100 · (1 − e^(−0.08 × ${fmt(d)})) = ${fmt(fr)}` },
        { type: 'p', text: `The curve saturates: the first few mSv/hr matter a lot, and very high rates add less and less. Its contribution to R is 0.40 × ${fmt(fr)} = ${fmt(0.4 * fr)}.` },
        {
          type: 'p',
          text: `For scale: Curiosity measured about 0.64 mSv/day on the Martian surface (${fmt(0.64 / 24, 3)} mSv/hr) and about 1.84 mSv/day in transit (${fmt(1.84 / 24, 3)} mSv/hr). The current setting is about ${fmt(d / (0.64 / 24), 0)}× the measured Mars-surface rate. The 18.5 mSv/hr storm is a deliberate stress test, not a forecast.`,
        },
      ],
    };
  }

  if (topic === 'hrv') {
    return {
      title: 'Heart-rate variability (HRV) and autonomic strain',
      blocks: [
        { type: 'p', text: 'HRV is the small beat-to-beat variation in heart rate. Lower HRV is commonly used as a rough sign of physiological stress. Here it is a simulated input.' },
        { type: 'eq', text: `f_hrv = 100 · max(0, (70 − HRV) / 70) = 100 · max(0, (70 − ${Math.round(h)}) / 70) = ${fmt(fh)}` },
        { type: 'p', text: `70 ms is the assumed "relaxed" reference: at or above it the strain score is 0, and it rises as HRV falls. Contribution to R: 0.35 × ${fmt(fh)} = ${fmt(0.35 * fh)}. It also feeds the interaction term (0.03·d·f_hrv = ${fmt(it2)}).` },
        { type: 'fine', text: 'Real HRV differs a lot between people; a single reference value is a simplification.' },
      ],
    };
  }

  if (topic === 'sleep') {
    return {
      title: 'Sleep debt',
      blocks: [
        { type: 'p', text: 'Sleep debt is the cumulative hours of sleep the crew member owes compared with what they need.' },
        { type: 'eq', text: `f_sleep = min(100, 12.5 · s) = min(100, 12.5 × ${fmt(s)}) = ${fmt(fs)}` },
        { type: 'p', text: `It reaches its maximum at 8 hours of debt. Contribution to R: 0.25 × ${fmt(fs)} = ${fmt(0.25 * fs)}. Sleep debt also multiplies the radiation term: 0.05 · d · s = 0.05 × ${fmt(d)} × ${fmt(s)} = ${fmt(it1)}.` },
      ],
    };
  }

  if (topic === 'inter') {
    return {
      title: 'Non-linear interaction',
      blocks: [
        { type: 'p', text: 'The idea behind RCPT: radiation, poor sleep and low HRV are not just added up; together they are assumed to be worse than the sum. Two product terms capture that.' },
        { type: 'eq', text: `interaction = 0.05·d·s + 0.03·d·f_hrv\n= 0.05 × ${fmt(d)} × ${fmt(s)} + 0.03 × ${fmt(d)} × ${fmt(fh)}\n= ${fmt(it1)} + ${fmt(it2)} = ${fmt(it)}` },
        { type: 'p', text: 'Try it: in a storm (dose high), raise sleep debt and watch this bar grow while nothing else changes. At zero dose the interaction is exactly 0.' },
        { type: 'fine', text: 'The coupling constants 0.05 and 0.03 are assumptions that illustrate the concept, not measured interaction effects.' },
      ],
    };
  }

  if (topic === 'ci') {
    return {
      title: 'The interval around R',
      blocks: [
        { type: 'p', text: `The shaded band and the "CI" text show R − 4.2 to R + 4.8 (currently ${fmt(lo)} to ${fmt(hi)}).` },
        { type: 'p', text: 'Important: this is a fixed display band. It is not recomputed from data and is not a statistical confidence interval. A real interval would need real data and an uncertainty model; the Sensitivity tab shows how R actually moves when the model\'s own weights are uncertain.' },
      ],
    };
  }

  if (topic === 'tier') {
    return {
      title: 'Tiers: nominal, elevated, emergency',
      blocks: [
        {
          type: 'list',
          items: [
            'Nominal: R below 35.',
            'Elevated: R from 35 up to 70.',
            'Emergency: R of 70 or more, or a dose rate of 10 mSv/hr or more regardless of R — a storm needs shelter even if the person feels fine.',
          ],
        },
        { type: 'p', text: `Currently ${tier} (R = ${fmt(R)}, dose = ${fmt(d)} mSv/hr). Thresholds are illustrative design choices.` },
      ],
    };
  }

  return null;
}
