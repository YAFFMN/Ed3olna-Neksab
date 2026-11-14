import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, CloudDownload, Database, ExternalLink, FlaskConical, Loader2, Radio } from 'lucide-react';
import {
  DEFAULT_PARAMS,
  ELEVATED_THRESHOLD,
  EMERGENCY_THRESHOLD,
  OWN_ASSUMPTIONS,
  PARAM_LABELS,
  REFERENCE,
  SCENARIOS,
  SOURCES,
  TIER_META,
  riskModel,
  selfCheck,
  sensitivity,
  validation,
} from '../lib/risk.js';
import { syncSpaceWeather } from '../services/api.js';
import { useI18n } from '../lib/i18n.jsx';

const fmt = (v, d = 2) => (Number.isFinite(+v) ? (+v).toFixed(d) : '—');
const pct = (v, d = 0) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;

const TABS = [
  { id: 'valid', key: 'tab_valid' },
  { id: 'sens', key: 'tab_sens' },
  { id: 'space', key: 'tab_space' },
  { id: 'src', key: 'tab_src' },
  { id: 'model', key: 'tab_model' },
];

function StatusBadge({ status, cls }) {
  return <span className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider ${cls}`}>{status}</span>;
}

function ValidationTab() {
  const v = validation();
  const rows = [
    {
      name: 'Surface dose at Gale, GCR',
      pub: `${fmt(REFERENCE.surfaceGale.v)} ± ${fmt(REFERENCE.surfaceGale.sd)} mSv/day`,
      model: `${fmt(v.gale)} mSv/day`,
      status: 'CALIBRATED',
      cls: 'border-[#17a9f0]/40 bg-[#17a9f0]/10 text-[#5cc8ff]',
      note: "The model's scale constant is set to hit this number, so agreement here proves nothing.",
    },
    {
      name: 'Annual-average dose at Gale',
      pub: `≈ ${fmt(REFERENCE.annualGale.v)} mSv/day`,
      model: `${fmt(v.gale)} (${pct(v.annualDiff)})`,
      status: v.withinSd ? 'CONSISTENT' : 'OFF',
      cls: v.withinSd
        ? 'border-[#35d08a]/40 bg-[#35d08a]/10 text-[#7be8a0]'
        : 'border-[#ffb224]/40 bg-[#ffb224]/10 text-[#ffd27a]',
      note: 'Different analysis of the same instrument; the difference sits inside the stated ±0.12 uncertainty.',
    },
    {
      name: `Dose change over the seasonal pressure swing (${REFERENCE.pressure.p1}→${REFERENCE.pressure.p2} Pa)`,
      pub: `≈ −${fmt(REFERENCE.pressure.dEq)} mSv/day (−16%)`,
      model: `−${fmt(v.dModel, 3)} (−${fmt(Math.abs(v.fracModel) * 100, 0)}%)`,
      status: 'HELD-OUT: UNDERESTIMATES',
      cls: 'border-[#ffb224]/40 bg-[#ffb224]/10 text-[#ffd27a]',
      note: 'Not used to tune anything. The one genuine test of the atmosphere term.',
    },
    {
      name: 'Cruise (deep-space transit) dose',
      pub: `${fmt(REFERENCE.cruise.v)} mSv/day inside the spacecraft`,
      model: `${fmt(v.cruiseEst)} (${fmt(v.top)} at Mars top-of-atmosphere × 2)`,
      status: 'PLAUSIBILITY ONLY',
      cls: 'border-[#17a9f0]/40 bg-[#17a9f0]/10 text-[#5cc8ff]',
      note: `Not fitted, but the shape constants were hand-picked with the answer in mind, so treat the ${pct(v.cruiseRatio - 1, 1)} match as a sanity check, not a validation.`,
    },
    {
      name: 'RCPT physiological risk R (weights, interaction, tiers)',
      pub: 'none',
      model: '—',
      status: 'NOT VALIDATED',
      cls: 'border-[#ff5d4d]/40 bg-[#ff5d4d]/10 text-[#ff8a7f]',
      note: 'There is no published dataset behind the weights or couplings. They are assumptions. The ±CI band is a fixed display band, not a statistical interval.',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#17a9f0]/30 bg-[#17a9f0]/10 p-3">
        <p className="text-xs leading-relaxed text-slate-200">
          <b className="text-white">Honest headline.</b> Over Gale crater's seasonal pressure swing ({REFERENCE.pressure.p1} →{' '}
          {REFERENCE.pressure.p2} Pa) the published Curiosity-based analysis finds the dose equivalent falls by about{' '}
          <b>{fmt(REFERENCE.pressure.dEq)} mSv/day (~16%)</b>. This model, which was <i>not</i> tuned to that number, predicts a fall of{' '}
          <b>{fmt(v.dModel, 3)} mSv/day ({fmt(Math.abs(v.fracModel) * 100, 0)}%)</b>: right direction, about{' '}
          <b>{fmt(v.ratio * 100, 0)}%</b> of the published size. It <b>underestimates</b> how much the atmosphere matters.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#1d2836]">
        <table className="w-full text-left text-[10px]">
          <thead className="bg-[#060d17] font-mono text-[8px] uppercase tracking-wider text-[#8fa0b4]">
            <tr>
              <th className="px-2.5 py-2 font-semibold">Check</th>
              <th className="px-2.5 py-2 font-semibold">Published</th>
              <th className="px-2.5 py-2 font-semibold">This model</th>
              <th className="px-2.5 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1d2836]">
            {rows.map((row) => (
              <tr key={row.name} className="align-top">
                <td className="px-2.5 py-2">
                  <p className="font-semibold text-slate-200">{row.name}</p>
                  <p className="mt-0.5 text-[9px] leading-snug text-[#5f7186]">{row.note}</p>
                </td>
                <td className="px-2.5 py-2 font-mono text-[9px] text-slate-300">{row.pub}</td>
                <td className="px-2.5 py-2 font-mono text-[9px] font-bold text-white">{row.model}</td>
                <td className="px-2.5 py-2">
                  <StatusBadge status={row.status} cls={row.cls} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            tone: 'text-[#7be8a0]',
            title: 'The radiation part is anchored',
            text: 'The Mars dose model is anchored to Curiosity and gets the order of magnitude and the ranking of sites right, but it is too forgiving about atmosphere. Use it for relative comparison and teaching.',
          },
          {
            icon: FlaskConical,
            tone: 'text-[#5cc8ff]',
            title: 'The physiology is a concept model',
            text: 'Its value is that every number can be inspected and stress-tested, not that it predicts a real astronaut\'s health.',
          },
          {
            icon: AlertTriangle,
            tone: 'text-[#ffd27a]',
            title: 'What validation would need',
            text: 'Validating R_MRP needs paired radiation, HRV and sleep data from analogue crews or ISS studies. That is the main next step.',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-lg border border-[#1d2836] bg-[#060d17] p-2.5">
              <p className={`flex items-center gap-1 font-mono text-[9px] font-bold ${card.tone}`}>
                <Icon size={11} /> {card.title}
              </p>
              <p className="mt-1 text-[9.5px] leading-relaxed text-[#8fa0b4]">{card.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tornado({ data }) {
  const W = 560;
  const rh = 26;
  const H = data.rows.length * rh + 30;
  const mid = 300;
  const max = Math.max(1, ...data.rows.map((r) => Math.max(Math.abs(r.lo), Math.abs(r.hi))));
  const scale = 170 / max;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tornado chart of sensitivity of R to each parameter">
      <line x1={mid} x2={mid} y1="6" y2={H - 18} stroke="#4a5b70" />
      {data.rows.map((row, index) => {
        const y = 10 + index * rh;
        const a = Math.min(row.lo, row.hi);
        const b = Math.max(row.lo, row.hi);
        return (
          <g key={row.k}>
            <text x="4" y={y + 14} className="fill-[#8fa0b4] text-[9px]">
              {PARAM_LABELS[row.k]}
            </text>
            <rect
              x={mid + a * scale}
              y={y}
              width={Math.max(1, (b - a) * scale)}
              height="16"
              fill="#17a9f0"
              opacity="0.85"
              rx="2"
            />
            <text x={mid + a * scale - 4} y={y + 12} textAnchor="end" className="fill-[#5f7186] text-[8px]">
              {a >= 0 ? '+' : ''}
              {fmt(a, 1)}
            </text>
            <text x={mid + b * scale + 4} y={y + 12} className="fill-[#5f7186] text-[8px]">
              {b >= 0 ? '+' : ''}
              {fmt(b, 1)}
            </text>
          </g>
        );
      })}
      <text x={mid} y={H - 4} textAnchor="middle" className="fill-[#5f7186] text-[8px]">
        change in R (points) when the parameter moves −/+ 25%
      </text>
    </svg>
  );
}

function SensitivityTab() {
  const [sel, setSel] = useState(0);
  const result = useMemo(() => sensitivity(0.25, 2000), []);
  const check = useMemo(() => selfCheck(), []);
  const data = result.tornado[sel];
  const top = data.rows[0];
  const mc = result.mc;

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-300">
        The weights and couplings in R_MRP are assumptions. How much do the results depend on them? Each parameter is moved by ±25 %,
        first one at a time, then all together (2,000 random draws, fixed seed so the results repeat).
      </p>
      <p className="font-mono text-[9px] text-[#5f7186]">
        Self-check: this analysis uses its own parameterised copy of the model. At the default parameters it matches the app's model to
        within {check.toExponential(1)} R points over a 3,000-point grid{check < 1e-9 ? ' (identical).' : '.'}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {SCENARIOS.map((sc, index) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => setSel(index)}
            className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold transition ${
              sel === index
                ? 'border-[#17a9f0] bg-[#17a9f0]/15 text-[#5cc8ff]'
                : 'border-[#1d2836] bg-[#060d17] text-[#8fa0b4] hover:text-white'
            }`}
          >
            {sc.short} (R = {fmt(result.tornado[index].base, 1)})
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-[#1d2836] bg-[#060d17] p-2">
        <Tornado data={data} />
      </div>

      <p className="text-xs text-slate-300">
        Largest driver here: <b className="text-white">{PARAM_LABELS[top.k]}</b>, moving R by about{' '}
        <b className="text-white">{fmt(Math.max(Math.abs(top.lo), Math.abs(top.hi)), 1)}</b> points for a 25 % change.
      </p>

      <div className="overflow-x-auto rounded-lg border border-[#1d2836]">
        <table className="w-full text-left text-[10px]">
          <thead className="bg-[#060d17] font-mono text-[8px] uppercase tracking-wider text-[#8fa0b4]">
            <tr>
              <th className="px-2.5 py-2">Scenario</th>
              <th className="px-2.5 py-2">Baseline R</th>
              <th className="px-2.5 py-2">5th–95th percentile</th>
              <th className="px-2.5 py-2">Tier changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1d2836]">
            {mc.map((row) => (
              <tr key={row.name}>
                <td className="px-2.5 py-1.5 text-slate-200">{row.name}</td>
                <td className="px-2.5 py-1.5 font-mono text-white">
                  {fmt(row.base, 1)} <span className={TIER_META[row.tier].text}>({row.tier})</span>
                </td>
                <td className="px-2.5 py-1.5 font-mono text-slate-300">
                  {fmt(row.p5, 1)} – {fmt(row.p95, 1)}
                </td>
                <td className="px-2.5 py-1.5 font-mono text-slate-300">{(row.flip * 100).toFixed(0)}% of draws</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] leading-relaxed text-[#8fa0b4]">
        The <b className="text-slate-200">nominal</b> case stays nominal in {((1 - mc[0].flip) * 100).toFixed(0)}% of draws. The{' '}
        <b className="text-slate-200">sleep-deprived</b> case is the fragile one: its tier changes in {(mc[1].flip * 100).toFixed(0)}% of
        draws (R spans {fmt(mc[1].p5, 1)}–{fmt(mc[1].p95, 1)} around the {ELEVATED_THRESHOLD} threshold). The{' '}
        <b className="text-slate-200">acute storm</b> stays an emergency in {((1 - mc[2].flip) * 100).toFixed(0)}% of draws, partly because
        the dose ≥ 10 mSv/hr rule triggers it independently of the weights.
      </p>
      <p className="font-mono text-[9px] text-[#5f7186]">
        This tests structural sensitivity of the concept model to its own assumed numbers. It does not say the model is right. The ±25 %
        range is a stated choice.
      </p>
    </div>
  );
}

function SpaceWeatherTab({ onUseDose, notify }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  async function fetchNow() {
    setBusy(true);
    try {
      const result = await syncSpaceWeather();
      setData(result);
      notify?.({ type: 'success', title: 'NOAA SYNC COMPLETE', message: `S${result.sScale} · ${result.reading?.radiation_rate_usv_hr?.toFixed?.(1) ?? '—'} µSv/hr` });
    } catch (error) {
      notify?.({ type: 'error', title: 'NOAA LINK ERROR', message: error?.message || 'Could not reach NOAA SWPC.' });
    } finally {
      setBusy(false);
    }
  }

  const rate = data?.reading ? Number(data.reading.radiation_rate_usv_hr) / 1000 : null;

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-300">
        Proton flux at ≥10 MeV from the NOAA Space Weather Prediction Center (GOES, public JSON). This is the quantity NOAA uses for its
        S-scale of solar radiation storms.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'S-scale now', value: data ? `S${data.sScale}` : '—', tone: data?.sScale >= 2 ? 'text-[#ff8a7f]' : 'text-[#7be8a0]' },
          { label: '≥10 MeV flux', value: data ? `${Number(data.reading?.proton_flux_10mev ?? 0).toFixed(1)} pfu` : '—', tone: 'text-white' },
          { label: 'Observed', value: data?.observedAt ? data.observedAt.slice(11, 16) : '—', tone: 'text-white' },
          { label: 'Assumed dose', value: rate ? `${rate.toFixed(2)} mSv/hr` : '—', tone: 'text-[#5cc8ff]' },
        ].map((cell) => (
          <div key={cell.label} className="rounded-lg border border-[#1d2836] bg-[#060d17] p-2 text-center">
            <p className="font-mono text-[8px] uppercase tracking-wider text-[#8fa0b4]">{cell.label}</p>
            <p className={`mt-0.5 font-mono text-sm font-bold ${cell.tone}`}>{cell.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void fetchNow()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-[#17a9f0]/45 bg-[#17a9f0]/15 px-3 py-1.5 font-mono text-[9px] font-bold text-[#5cc8ff] transition hover:bg-[#17a9f0]/25 disabled:opacity-50"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <CloudDownload size={11} />}
          FETCH LATEST FROM NOAA
        </button>
        <button
          type="button"
          disabled={!rate}
          onClick={() => {
            onUseDose(rate);
            notify?.({ type: 'success', title: 'DOSE RATE SET', message: `${rate.toFixed(2)} mSv/hr from the live NOAA feed.` });
          }}
          className="flex items-center gap-1.5 rounded-lg border border-[#1d2836] bg-[#0a0f16] px-3 py-1.5 font-mono text-[9px] font-semibold text-slate-300 transition hover:border-[#17a9f0]/50 hover:text-white disabled:opacity-40"
        >
          <Radio size={11} /> USE AS DOSE RATE
        </button>
      </div>

      <div className="rounded-lg border border-[#ffb224]/30 bg-[#ffb224]/10 p-3">
        <p className="font-mono text-[9px] font-bold text-[#ffd27a]">ASSUMED MAPPING — NOT A DOSIMETRY CONVERSION</p>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
          Proton flux is not a crew dose rate. To let real conditions drive the demo, the app uses a transparent log-linear mapping: S1
          (10 pfu) → 0.5 mSv/hr baseline, S4 (10,000 pfu) → 18.5 mSv/hr (the acute SPE stress test). The mapping is an assumption.
        </p>
      </div>

      <p className="font-mono text-[9px] leading-relaxed text-[#5f7186]">
        Only services.swpc.noaa.gov is contacted, and only when you press the button. No personal data is sent.
      </p>
    </div>
  );
}

function SourcesTab() {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-[#1d2836]">
        <table className="w-full text-left text-[10px]">
          <thead className="bg-[#060d17] font-mono text-[8px] uppercase tracking-wider text-[#8fa0b4]">
            <tr>
              <th className="px-2.5 py-2">Source</th>
              <th className="px-2.5 py-2">Used for</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1d2836]">
            {SOURCES.map((source) => (
              <tr key={source.id} className="align-top">
                <td className="px-2.5 py-2">
                  <p className="font-semibold text-slate-200">{source.cite}</p>
                  <p className="mt-0.5 text-[9px] leading-snug text-[#8fa0b4]">
                    {source.title}. <i>{source.journal}</i>.{' '}
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-0.5 text-[#5cc8ff] hover:underline"
                    >
                      {source.url.replace(/^https?:\/\//, '')} <ExternalLink size={8} />
                    </a>
                  </p>
                </td>
                <td className="px-2.5 py-2 text-[9px] leading-snug text-slate-300">{source.used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-[#1d2836] bg-[#060d17] p-3">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#8fa0b4]">Assumptions that are ours, not from a source</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[10px] leading-relaxed text-slate-300">
          {OWN_ASSUMPTIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="font-mono text-[9px] leading-relaxed text-[#5f7186]">
        Published numbers were checked against the cited papers' abstracts or coverage of them; the full tables were not independently
        re-derived. Independent project. Not affiliated with, endorsed by or produced by NASA, NOAA or USGS. Research prototype, not a
        medical device.
      </p>
    </div>
  );
}

function ModelCardTab({ model }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#17a9f0]/30 bg-[#17a9f0]/10 p-3 font-mono text-[11px] leading-relaxed text-[#5cc8ff]">
        R = clip( 0.40·f_rad + 0.35·f_hrv + 0.25·f_sleep + 0.05·d·s + 0.03·d·f_hrv , 0, 100 )
        <br />
        f_rad = 100·(1 − e^(−0.08·d)) · f_hrv = 100·max(0, (70 − HRV)/70) · f_sleep = min(100, 12.5·s)
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-[#1d2836] bg-[#060d17] p-3">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#8fa0b4]">Current state</p>
          <ul className="mt-1 space-y-1 font-mono text-[10px] text-slate-300">
            <li>dose = {model.d.toFixed(2)} mSv/hr</li>
            <li>HRV = {Math.round(model.h)} ms</li>
            <li>sleep debt = {model.s.toFixed(1)} h</li>
            <li className="text-white">R = {model.R.toFixed(1)} ({model.tier})</li>
          </ul>
        </div>
        <div className="rounded-lg border border-[#1d2836] bg-[#060d17] p-3">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#8fa0b4]">Parameters</p>
          <ul className="mt-1 space-y-0.5 font-mono text-[9px] text-[#8fa0b4]">
            {Object.entries(DEFAULT_PARAMS).map(([key, value]) => (
              <li key={key}>
                {key} = {value}
              </li>
            ))}
            <li>thresholds = {ELEVATED_THRESHOLD} / {EMERGENCY_THRESHOLD} / 10 mSv/hr</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { tag: 'SIMULATED', cls: 'border-[#8fa0b4]/40 bg-[#8fa0b4]/10 text-[#b7c5d6]', text: 'Dose rate, HRV and sleep debt are inputs you set or a scenario sets. No sensor hardware is connected.' },
          { tag: 'DERIVED', cls: 'border-[#ffb224]/40 bg-[#ffb224]/10 text-[#ffd27a]', text: 'R, the organ indices, the tier and the protocols are computed from those inputs.' },
          { tag: 'CALIBRATED', cls: 'border-[#17a9f0]/40 bg-[#17a9f0]/10 text-[#5cc8ff]', text: 'The Mars dose model is anchored to Curiosity RAD at Gale crater.' },
        ].map((card) => (
          <div key={card.tag} className="rounded-lg border border-[#1d2836] bg-[#060d17] p-2.5">
            <StatusBadge status={card.tag} cls={card.cls} />
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#8fa0b4]">{card.text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#ff5d4d]/30 bg-[#ff5d4d]/10 p-3">
        <p className="flex items-center gap-1 font-mono text-[9px] font-bold text-[#ff8a7f]">
          <AlertTriangle size={11} /> LIMITS
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[10px] leading-relaxed text-slate-300">
          <li>Decision support, not diagnosis. It flags risk and explains it; it does not replace medical judgement.</li>
          <li>The weights, couplings and thresholds are design choices, not fitted parameters.</li>
          <li>One reference HRV value is used for everyone; real HRV varies widely between people.</li>
          <li>No individual medical history, medication or countermeasure effects are modelled.</li>
        </ul>
      </div>
    </div>
  );
}

export default function DataValidation({ model, onUseDose, notify, tab: controlledTab, onTabChange }) {
  const { t } = useI18n();
  const [innerTab, setInnerTab] = useState('valid');
  const tab = controlledTab || innerTab;
  const setTab = (next) => {
    setInnerTab(next);
    onTabChange?.(next);
  };

  return (
    <div className="space-y-3" data-tour="data">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#17a9f0]/40 bg-[#17a9f0]/10 text-[#17a9f0]">
            <Database size={15} />
          </div>
          <div>
            <span className="eyebrow-text">OPEN SCIENCE</span>
            <h2 className="text-sm font-bold text-slate-100">{t('data_title')}</h2>
          </div>
        </div>
        <span className="font-mono text-[9px] text-[#8fa0b4]">every number recomputed live from the model</span>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-[#1d2836] bg-[#060d17] p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-2.5 py-1.5 font-mono text-[9px] font-bold transition ${
              tab === item.id ? 'bg-[#17a9f0] text-[#02050a]' : 'text-[#8fa0b4] hover:text-white'
            }`}
          >
            {t(item.key)}
          </button>
        ))}
      </div>

      <div className="rcpt-panel p-4">
        {tab === 'valid' && <ValidationTab />}
        {tab === 'sens' && <SensitivityTab />}
        {tab === 'space' && <SpaceWeatherTab onUseDose={onUseDose} notify={notify} />}
        {tab === 'src' && <SourcesTab />}
        {tab === 'model' && <ModelCardTab model={model} />}
      </div>

      <p className="flex items-center gap-1 font-mono text-[8px] text-[#5f7186]">
        <ArrowUpRight size={9} /> Reference values are typed in once with citations; everything else is computed from the live model.
      </p>
    </div>
  );
}
