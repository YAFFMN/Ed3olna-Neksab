import { HelpCircle } from 'lucide-react';
import { useI18n } from '../lib/i18n.jsx';
import { useUi } from '../lib/ui.jsx';

const BAR_KEYS = [
  { id: 'rad', label: 'Radiation', sub: 'impact' },
  { id: 'hrv', label: 'Autonomic', sub: 'strain (HRV)' },
  { id: 'sleep', label: 'Sleep', sub: 'debt' },
  { id: 'inter', label: 'Non-linear', sub: 'interaction' },
];

export default function RiskDecomposition({ model, highlightInteraction = false }) {
  const { t } = useI18n();
  const { openExplain } = useUi();
  if (!model) return null;

  const bars = model.bars;
  const max = Math.max(10, Math.ceil((Math.max(...bars) * 1.15) / 5) * 5);
  const color = model.R > 50 ? '#ff4b4b' : '#29B5E8';
  const W = 400;
  const H = 210;
  const baseY = 150;
  const scale = 130 / max;

  return (
    <div className="rcpt-panel p-3.5" data-tour="decomposition">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-2">
        <div>
          <span className="eyebrow-text">R_MRP TERMS</span>
          <h3 className="text-xs font-bold text-slate-100">{t('decomposition')}</h3>
        </div>
        <span className="font-mono text-[9px] text-[#8fa0b4]">Σ = {model.R.toFixed(1)}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={t('decomposition')}>
        <line x1="36" y1="20" x2="392" y2="20" stroke="#2a2d3a" />
        <line x1="36" y1={baseY} x2="392" y2={baseY} stroke="#2a2d3a" />
        <text x="30" y="24" textAnchor="end" className="fill-[#8fa0b4] text-[9px]">
          {max}
        </text>
        <text x="30" y={baseY + 4} textAnchor="end" className="fill-[#8fa0b4] text-[9px]">
          0
        </text>
        {bars.map((value, index) => {
          const x = 52 + index * 88;
          const height = Math.max(0, value * scale);
          const isInter = index === 3;
          return (
            <g key={BAR_KEYS[index].id}>
              <rect
                x={x}
                y={baseY - height}
                width="56"
                height={height}
                fill={isInter && highlightInteraction ? '#ffb224' : color}
                opacity={isInter ? 0.95 : 0.8}
                rx="2"
              />
              <text x={x + 28} y={baseY - height - 5} textAnchor="middle" className="fill-slate-200 text-[10px] font-bold">
                {value.toFixed(1)}
              </text>
              <text x={x + 28} y="168" textAnchor="middle" className="fill-[#8fa0b4] text-[9px]">
                {BAR_KEYS[index].label}
              </text>
              <text x={x + 28} y="181" textAnchor="middle" className="fill-[#5f7186] text-[8px]">
                {BAR_KEYS[index].sub}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-[9px] leading-relaxed text-[#8fa0b4]">{t('decomposition_note')}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {['R', 'rad', 'hrv', 'sleep', 'inter', 'ci'].map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => openExplain(topic)}
            className="flex items-center gap-1 rounded border border-[#1d2836] bg-[#060d17] px-1.5 py-0.5 font-mono text-[8px] text-[#8fa0b4] transition hover:border-[#17a9f0]/50 hover:text-white"
          >
            <HelpCircle size={8} />
            {topic === 'R' ? t('risk_short') : topic === 'ci' ? `±CI` : topic}
          </button>
        ))}
      </div>
    </div>
  );
}
