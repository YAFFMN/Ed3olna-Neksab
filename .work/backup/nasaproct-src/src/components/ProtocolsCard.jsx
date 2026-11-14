import { AlertTriangle, CheckCircle2, Radio, ShieldAlert } from 'lucide-react';
import { protocolsFor, systemChips, TIER_META } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';

const CHIP_LABELS = {
  cv: 'hv_cv',
  cns: 'hv_cns',
  cell: 'hv_cell',
};

export default function ProtocolsCard({ model }) {
  const { t } = useI18n();
  if (!model) return null;

  const protocol = protocolsFor(model);
  const chips = systemChips(model);
  const tier = TIER_META[protocol.tier];
  const Icon = protocol.tier === 'emergency' ? ShieldAlert : protocol.tier === 'elevated' ? AlertTriangle : CheckCircle2;

  return (
    <div className="rcpt-panel p-3.5" data-tour="protocols">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-2">
        <div>
          <span className="eyebrow-text">DECISION SUPPORT</span>
          <h3 className="text-xs font-bold text-slate-100">{t('chips')}</h3>
        </div>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold ${tier.border} ${tier.bg} ${tier.text}`}>
          {t(`tier_${protocol.tier}`).toUpperCase()}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {chips.map((chip) => (
          <div
            key={chip.id}
            className="rounded-lg border border-[#1d2836] bg-[#060d17] p-1.5 text-center"
            title={chip.bad ? chip.badLabel : chip.okLabel}
          >
            <p className="font-mono text-[7.5px] uppercase tracking-wider text-[#8fa0b4]">{t(CHIP_LABELS[chip.id])}</p>
            <span className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${chip.bad ? 'bg-[#ff5d4d]' : 'bg-[#35d08a]'}`} />
            <p className={`font-mono text-[8px] font-bold ${chip.bad ? 'text-[#ff8a7f]' : 'text-[#7be8a0]'}`}>
              {chip.bad
                ? t(chip.id === 'cv' ? 'st_high' : chip.id === 'cns' ? 'st_disr' : 'st_comp')
                : t(chip.id === 'cv' ? 'st_stable' : chip.id === 'cns' ? 'st_nom' : 'st_opt')}
            </p>
          </div>
        ))}
      </div>

      <div className={`mt-2.5 rounded-lg border p-2.5 ${tier.border} ${tier.bg}`}>
        <div className="flex items-start gap-1.5">
          <Icon size={12} className={`mt-0.5 shrink-0 ${tier.text}`} />
          <div>
            <p className={`font-mono text-[9px] font-bold uppercase tracking-wider ${tier.text}`}>{protocol.title}</p>
            <ul className="mt-1 space-y-0.5">
              {protocol.steps.map((step) => (
                <li key={step} className="flex gap-1 text-[10px] leading-snug text-slate-300">
                  <span className="text-[#5f7186]">·</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-2 font-mono text-[7.5px] text-[#5f7186]">{t('protocols')}</p>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#1d2836] bg-[#060d17] p-2">
        <div>
          <p className="font-mono text-[7.5px] uppercase tracking-wider text-[#8fa0b4]">{t('latency')}</p>
          <p className="font-mono text-sm font-bold text-white">22:00</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 font-mono text-[8px] font-bold text-[#35d08a]">
            <Radio size={9} /> {t('latency_ok')}
          </p>
          <p className="mt-0.5 max-w-[180px] text-[8px] leading-snug text-[#8fa0b4]">{t('latency_note')}</p>
        </div>
      </div>
    </div>
  );
}
