import { HelpCircle } from 'lucide-react';
import { TIER_META } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';
import { useUi } from '../lib/ui.jsx';

function Tag({ children, tone = 'cyan' }) {
  const tones = {
    cyan: 'border-[#17a9f0]/35 bg-[#17a9f0]/10 text-[#5cc8ff]',
    amber: 'border-[#ffb224]/35 bg-[#ffb224]/10 text-[#ffd27a]',
    green: 'border-[#35d08a]/35 bg-[#35d08a]/10 text-[#7be8a0]',
    slate: 'border-[#1d2836] bg-[#0a0f16] text-[#8fa0b4]',
  };
  return (
    <span className={`rounded border px-1 py-[1px] font-mono text-[7px] font-bold tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function MetricStrip({ model }) {
  const { t } = useI18n();
  const { openExplain } = useUi();
  if (!model) return null;

  const tier = TIER_META[model.tier];

  const metrics = [
    {
      id: 'R',
      label: t('risk'),
      value: model.R.toFixed(1),
      unit: '/ 100',
      note: `${t('ci')}: ${model.lo.toFixed(1)} – ${model.hi.toFixed(1)}`,
      tag: <Tag tone="amber">{t('derived')}</Tag>,
      accent: tier.text,
      bar: model.R,
      barColor: tier.hex,
    },
    {
      id: 'rad',
      label: t('dose_rate'),
      value: model.d.toFixed(1),
      unit: 'mSv/hr',
      note: `${(model.d / (0.64 / 24)).toFixed(0)}× Mars surface`,
      tag: <Tag tone="slate">{t('simulated')}</Tag>,
      accent: 'text-[#f5f8fc]',
      bar: Math.min(100, (model.d / 20) * 100),
      barColor: '#ffb224',
    },
    {
      id: 'hrv',
      label: t('hrv'),
      value: Math.round(model.h).toString(),
      unit: 'ms',
      note: `f_hrv = ${model.fh.toFixed(1)}`,
      tag: <Tag tone="slate">{t('simulated')}</Tag>,
      accent: 'text-[#f5f8fc]',
      bar: Math.min(100, (model.h / 100) * 100),
      barColor: '#35d08a',
    },
    {
      id: 'sleep',
      label: t('sleep_debt'),
      value: model.s.toFixed(1),
      unit: 'h',
      note: `f_sleep = ${model.fs.toFixed(1)}`,
      tag: <Tag tone="slate">{t('simulated')}</Tag>,
      accent: 'text-[#f5f8fc]',
      bar: Math.min(100, (model.s / 10) * 100),
      barColor: '#c792ff',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.id} className="rcpt-panel p-3" data-tour={`metric-${metric.id}`}>
          <div className="flex items-start justify-between gap-1">
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-[#8fa0b4]">
              {metric.label}
            </span>
            <button
              type="button"
              onClick={() => openExplain(metric.id)}
              title={`${t('explain')}: ${metric.label}`}
              aria-label={`${t('explain')}: ${metric.label}`}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#2b3f57] text-[#8fa0b4] transition hover:border-[#17a9f0] hover:text-[#17a9f0]"
            >
              <HelpCircle size={10} />
            </button>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className={`font-mono text-2xl font-extrabold tabular-nums ${metric.accent}`}>{metric.value}</span>
            <span className="font-mono text-[9px] text-[#8fa0b4]">{metric.unit}</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#16222f]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${metric.bar}%`, background: metric.barColor }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-1">
            <span className="font-mono text-[8px] text-[#8fa0b4]">{metric.note}</span>
            {metric.tag}
          </div>
        </div>
      ))}
    </div>
  );
}
