import { HelpCircle } from 'lucide-react';
import { TIER_META } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';
import { useUi } from '../lib/ui.jsx';

export default function RiskIndexCard({ model }) {
  const { t } = useI18n();
  const { openExplain } = useUi();
  if (!model) return null;

  const tier = TIER_META[model.tier];
  const score = model.R;
  const parts = [
    { label: 'Radiation', value: 0.4 * model.fr, pct: 40, color: '#ffb224' },
    { label: 'HRV strain', value: 0.35 * model.fh, pct: 35, color: '#35d08a' },
    { label: 'Sleep debt', value: 0.25 * model.fs, pct: 25, color: '#c792ff' },
    { label: 'Interaction', value: model.it, pct: null, color: '#17a9f0' },
  ];

  return (
    <div className="rcpt-panel p-3.5" data-tour="risk-card">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-2">
        <div>
          <span className="eyebrow-text">PHYSIOLOGICAL TWIN</span>
          <h3 className="text-sm font-bold text-slate-100">{t('risk_short')}</h3>
        </div>
        <button
          type="button"
          onClick={() => openExplain('R')}
          className="flex items-center gap-1 rounded border border-[#17a9f0]/30 bg-[#17a9f0]/10 px-1.5 py-0.5 font-mono text-[8px] text-[#5cc8ff] transition hover:bg-[#17a9f0]/20"
        >
          <HelpCircle size={9} /> {t('explain_short').toUpperCase()}
        </button>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <div>
          <span className="font-mono text-3xl font-extrabold tracking-tight text-white tabular-nums">{score.toFixed(1)}</span>
          <span className="font-mono text-[10px] text-[#8fa0b4]"> / 100</span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold tracking-wider ${tier.border} ${tier.bg} ${tier.text}`}>
          {t(`tier_${model.tier}`).toUpperCase()}
        </span>
      </div>

      <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#16222f]">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${score}%`, background: tier.hex }} />
        <span className="absolute inset-y-0 left-[35%] w-px bg-[#ffb224]/70" />
        <span className="absolute inset-y-0 left-[70%] w-px bg-[#ff5d4d]/80" />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[7.5px] text-[#5f7186]">
        <span>0</span>
        <span className="text-[#ffb224]">35</span>
        <span className="text-[#ff5d4d]">70</span>
        <span>100</span>
      </div>

      <p className="mt-1.5 font-mono text-[8px] text-[#8fa0b4]">
        {t('ci')}: {model.lo.toFixed(1)} – {model.hi.toFixed(1)}
        {model.overDoseRule && <span className="ml-1 text-[#ff8a7f]">· dose rule active</span>}
      </p>

      <div className="mt-2.5 space-y-1.5 rounded-lg border border-[#1d2836] bg-[#060d17]/80 p-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-[#8fa0b4]">COMPOUNDING STRESSORS</span>
          <button
            type="button"
            onClick={() => openExplain('inter')}
            className="font-mono text-[7.5px] text-[#17a9f0] hover:underline"
          >
            NON-LINEAR MODEL
          </button>
        </div>
        {parts.map((part) => (
          <div key={part.label} className="flex items-center gap-1.5">
            <span className="w-16 shrink-0 font-mono text-[8px] text-[#8fa0b4]">{part.label}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#16222f]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, part.value * 2)}%`, background: part.color }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[8px] font-bold text-slate-200 tabular-nums">
              {part.value.toFixed(1)}
            </span>
            <span className="w-6 shrink-0 text-right font-mono text-[7px] text-[#5f7186]">{part.pct ? `${part.pct}%` : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
