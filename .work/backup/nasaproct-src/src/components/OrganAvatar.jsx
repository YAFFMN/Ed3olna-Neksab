import { useState } from 'react';
import { Brain, Droplets, Eye, Heart, Moon, Wind } from 'lucide-react';
import { organSystems } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';

const ICONS = { brain: Brain, heart: Heart, marrow: Droplets, eyes: Eye, lungs: Wind, gut: Moon };

export default function OrganAvatar({ model }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState('brain');

  const organs = organSystems(model);
  const active = organs.find((organ) => organ.id === selected) || organs[0];
  if (!active) return null;

  return (
    <div className="rcpt-panel p-4" data-tour="organs">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-2.5">
        <div>
          <span className="eyebrow-text">PHYSIOLOGICAL TWIN</span>
          <h3 className="text-sm font-bold text-slate-100">Organ system strain breakdown</h3>
        </div>
        <span className="font-mono text-[9px] text-[#8fa0b4]">{organs.length} SYSTEMS DERIVED</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-1.5 lg:col-span-7">
          {organs.map((organ) => {
            const Icon = ICONS[organ.id] || Heart;
            const critical = organ.index >= 65;
            const warn = organ.index >= 35 && organ.index < 65;
            const barColor = critical ? 'bg-[#ff5d4d]' : warn ? 'bg-[#ffb224]' : 'bg-[#35d08a]';
            const tone = critical ? 'text-[#ff8a7f]' : warn ? 'text-[#ffd27a]' : 'text-[#7be8a0]';
            const isSelected = selected === organ.id;

            return (
              <button
                key={organ.id}
                type="button"
                onClick={() => setSelected(organ.id)}
                className={`flex w-full flex-col rounded-lg border p-2 text-left transition ${
                  isSelected
                    ? 'border-[#17a9f0] bg-[#17a9f0]/10 shadow-[0_0_15px_rgba(23,169,240,0.1)]'
                    : 'border-[#1d2836] bg-[#060d17]/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} className={isSelected ? 'text-[#17a9f0]' : 'text-[#8fa0b4]'} />
                    <span className="text-[11px] font-semibold text-slate-200">{organ.name}</span>
                  </div>
                  <span className={`font-mono text-[11px] font-bold tabular-nums ${tone}`}>{Math.round(organ.index)}</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#16222f]">
                  <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${organ.index}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-[#1d2836] bg-[#060d17] p-3.5 lg:col-span-5">
          <div>
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = ICONS[active.id] || Heart;
                return <Icon size={16} className="text-[#17a9f0]" />;
              })()}
              <h4 className="text-xs font-bold text-white">{active.name}</h4>
            </div>

            <div className="mt-2.5">
              <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-[#8fa0b4]">STRAIN INDEX</span>
              <p className="font-mono text-2xl font-bold text-white tabular-nums">
                {Math.round(active.index)}
                <span className="text-sm font-normal text-slate-400"> / 100</span>
              </p>
            </div>

            <div className="mt-2.5 space-y-2 text-[10px]">
              <div>
                <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-[#8fa0b4]">PRIMARY DRIVERS</span>
                <p className="mt-0.5 text-slate-200">{active.driver}</p>
              </div>
              <div>
                <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-[#8fa0b4]">FLIGHT SURGEON NOTE</span>
                <p className="mt-0.5 leading-relaxed text-slate-300">{active.note}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#1d2836] pt-2 text-center font-mono text-[7.5px] text-[#8fa0b4]">
            DECISION SUPPORT // NON-DIAGNOSTIC TWIN
          </div>
        </div>
      </div>

      <p className="mt-2 font-mono text-[8px] text-[#5f7186]">
        Indices are derived from the same terms as the dashboard model — they are not organ measurements.
      </p>
    </div>
  );
}
