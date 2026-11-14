import { useMemo, useState } from 'react';
import { BedDouble, Brain, Eye, Heart, Moon, Sun, Wind } from 'lucide-react';
import { organSystems, sleepReadout } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';

const ORGAN_ICONS = { brain: Brain, heart: Heart, marrow: BedDouble, eyes: Eye, lungs: Wind, gut: Moon };

// Organ hotspots on the sleeping figure (viewBox 0 0 560 330).
const HOTSPOTS = {
  brain: { x: 132, y: 158, r: 13 },
  eyes: { x: 108, y: 176, r: 9 },
  lungs: { x: 205, y: 196, r: 15 },
  heart: { x: 222, y: 208, r: 11 },
  gut: { x: 268, y: 216, r: 13 },
  marrow: { x: 332, y: 220, r: 12 },
};

function tone(index) {
  if (index >= 65) return { hex: '#ff5d4d', cls: 'text-[#ff8a7f]', border: 'border-[#ff5d4d]/45', bg: 'bg-[#ff5d4d]/10' };
  if (index >= 35) return { hex: '#ffb224', cls: 'text-[#ffd27a]', border: 'border-[#ffb224]/45', bg: 'bg-[#ffb224]/10' };
  return { hex: '#35d08a', cls: 'text-[#7be8a0]', border: 'border-[#35d08a]/40', bg: 'bg-[#35d08a]/10' };
}

export default function CrewQuarters({ model, astronaut }) {
  const { t } = useI18n();
  const [asleep, setAsleep] = useState(true);
  const [selected, setSelected] = useState('brain');

  const organs = useMemo(() => organSystems(model), [model]);
  const sleep = useMemo(() => sleepReadout(model), [model]);
  const active = organs.find((o) => o.id === selected) || organs[0];

  if (!model || !active) return null;

  const totalStage = sleep.stages.reduce((sum, stage) => sum + stage.pct, 0);
  const worst = [...organs].sort((a, b) => b.index - a.index)[0];

  return (
    <div className="space-y-4" data-tour="quarters">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Scene */}
        <div className="rcpt-panel overflow-hidden xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1d2836] px-4 py-2.5">
            <div>
              <span className="eyebrow-text">HABITAT DECK 2 // BUNK 1</span>
              <h2 className="text-sm font-bold text-slate-100">{t('quarters_title')}</h2>
            </div>
            <button
              type="button"
              onClick={() => setAsleep((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[9px] font-bold transition ${
                asleep
                  ? 'border-[#17a9f0]/45 bg-[#17a9f0]/15 text-[#5cc8ff] hover:bg-[#17a9f0]/25'
                  : 'border-[#ffb224]/45 bg-[#ffb224]/15 text-[#ffd27a] hover:bg-[#ffb224]/25'
              }`}
            >
              {asleep ? <Moon size={11} /> : <Sun size={11} />}
              {asleep ? t('asleep') : t('awake')}
            </button>
          </div>

          <div className="relative">
            <svg viewBox="0 0 560 330" className="w-full" role="img" aria-label={t('quarters_title')}>
              <defs>
                <linearGradient id="bunkGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b1a2a" />
                  <stop offset="100%" stopColor="#050b14" />
                </linearGradient>
                <radialGradient id="porthole" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#17a9f0" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#02050a" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="blanket" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#12283f" />
                  <stop offset="100%" stopColor="#1b3448" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="560" height="330" fill="url(#bunkGlow)" />

              {/* stars */}
              {[
                [40, 34], [86, 62], [130, 28], [190, 52], [250, 30], [318, 58], [380, 34], [440, 62], [500, 40], [520, 96],
                [70, 104], [350, 96], [470, 120], [214, 96], [30, 70],
              ].map(([cx, cy], index) => (
                <circle key={index} cx={cx} cy={cy} r={index % 3 === 0 ? 1.4 : 1} fill="#cfe9ff" opacity={0.45} />
              ))}

              {/* porthole with Mars */}
              <g opacity="0.9">
                <circle cx="470" cy="150" r="46" fill="url(#porthole)" />
                <circle cx="470" cy="150" r="38" fill="none" stroke="#1d2836" strokeWidth="3" />
                <circle cx="470" cy="150" r="26" fill="#b4552f" opacity="0.55" />
                <circle cx="462" cy="142" r="7" fill="#8f3f22" opacity="0.7" />
                <circle cx="480" cy="158" r="4" fill="#8f3f22" opacity="0.6" />
              </g>

              {/* bunk frame */}
              <rect x="34" y="196" width="470" height="86" rx="10" fill="#0a121c" stroke="#1d2836" strokeWidth="2" />
              <rect x="44" y="206" width="450" height="52" rx="8" fill="#0d1a26" />
              <rect x="44" y="258" width="450" height="10" rx="4" fill="#101f2d" />
              <line x1="34" y1="196" x2="34" y2="120" stroke="#1d2836" strokeWidth="3" />
              <line x1="504" y1="196" x2="504" y2="120" stroke="#1d2836" strokeWidth="3" />

              {/* pillow */}
              <rect x="62" y="176" width="82" height="34" rx="14" fill="#16283a" stroke="#22384e" />

              {/* body */}
              <g>
                {/* head */}
                <circle cx="118" cy="176" r="24" fill="#e8c9a8" opacity="0.92" />
                <path d="M96 172a22 22 0 0 1 44 0" fill="#2b3b4c" opacity="0.9" />
                {asleep ? (
                  <path d="M104 180q6 4 12 0" stroke="#3b2f28" strokeWidth="2" fill="none" strokeLinecap="round" />
                ) : (
                  <circle cx="108" cy="178" r="2.6" fill="#1b2530" />
                )}
                {asleep && (
                  <g className="sleep-z">
                    <text x="150" y="132" className="fill-[#5cc8ff] text-[13px] font-bold">
                      z
                    </text>
                    <text x="164" y="116" className="fill-[#5cc8ff] text-[16px] font-bold opacity-70">
                      z
                    </text>
                    <text x="182" y="100" className="fill-[#5cc8ff] text-[19px] font-bold opacity-45">
                      z
                    </text>
                  </g>
                )}

                {/* torso */}
                <path
                  d="M140 186c18-8 54-10 84-6 24 3 38 12 42 26 4 14-4 24-18 26l-96 4c-16 0-24-8-24-20 0-14 4-24 12-30z"
                  fill="#20303f"
                  stroke="#2b3f57"
                />
                {/* legs under blanket */}
                <path d="M246 214h150c16 0 24 10 24 22v14H232v-20c0-10 6-16 14-16z" fill="#16283a" stroke="#22384e" />
                <path d="M232 250h192" stroke="#22384e" strokeWidth="2" />
                <path d="M300 214v36M350 214v36M400 214v36" stroke="#1b2c3d" strokeWidth="1.5" />

                {/* arm */}
                <path d="M156 208c14 10 34 14 52 12" stroke="#e8c9a8" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.85" />
              </g>

              {/* organ hotspots */}
              {organs.map((organ) => {
                const spot = HOTSPOTS[organ.id];
                if (!spot) return null;
                const t2 = tone(organ.index);
                const isActive = selected === organ.id;
                return (
                  <g
                    key={organ.id}
                    onClick={() => setSelected(organ.id)}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setSelected(organ.id);
                    }}
                    aria-label={organ.name}
                  >
                    <circle cx={spot.x} cy={spot.y} r={spot.r + 8} fill={t2.hex} opacity={isActive ? 0.18 : 0.06}>
                      {asleep && (
                        <animate
                          attributeName="r"
                          values={`${spot.r + 6};${spot.r + 12};${spot.r + 6}`}
                          dur={`${3.4 - (organ.index / 100) * 1.6}s`}
                          repeatCount="indefinite"
                        />
                      )}
                    </circle>
                    <circle
                      cx={spot.x}
                      cy={spot.y}
                      r={spot.r}
                      fill={t2.hex}
                      fillOpacity={0.28}
                      stroke={t2.hex}
                      strokeWidth={isActive ? 2.2 : 1.2}
                    />
                    <text x={spot.x} y={spot.y + 3} textAnchor="middle" className="fill-white text-[9px] font-bold">
                      {Math.round(organ.index)}
                    </text>
                  </g>
                );
              })}

              {/* labels */}
              <text x="118" y="212" textAnchor="middle" className="fill-[#8fa0b4] text-[8px]">
                {astronaut?.full_name || 'CDR. A. HASSAN'}
              </text>
              <text x="34" y="316" className="fill-[#5f7186] text-[8px] font-mono">
                AMBIENT 21.4 °C · pO₂ 21.3 kPa · 1.62 kPa CO₂ · 0.38 g
              </text>
              <text x="504" y="316" textAnchor="end" className="fill-[#5f7186] text-[8px] font-mono">
                {asleep ? 'SLEEP CYCLE ACTIVE' : 'WAKE CYCLE'}
              </text>
            </svg>
          </div>

          <p className="border-t border-[#1d2836] px-4 py-2 text-[10px] leading-relaxed text-[#8fa0b4]">{t('quarters_note')}</p>
        </div>

        {/* Sleep + recovery */}
        <div className="space-y-4 xl:col-span-4">
          <div className="rcpt-panel p-3.5">
            <div className="flex items-center justify-between border-b border-[#1d2836] pb-2">
              <div>
                <span className="eyebrow-text">SLEEP LEDGER</span>
                <h3 className="text-xs font-bold text-slate-100">{t('sleep_cycle')}</h3>
              </div>
              <span className="font-mono text-lg font-extrabold text-[#c792ff] tabular-nums">{model.s.toFixed(1)}<span className="text-[9px] text-[#8fa0b4]"> h</span></span>
            </div>

            <div className="mt-2.5 flex h-3 w-full overflow-hidden rounded-full bg-[#16222f]">
              {sleep.stages.map((stage, index) => (
                <div
                  key={stage.name}
                  style={{ width: `${(stage.pct / totalStage) * 100}%` }}
                  className={['bg-[#1f6fb2]', 'bg-[#2b8ed6]', 'bg-[#5b6ee1]', 'bg-[#a05bd8]'][index]}
                  title={`${stage.name} ${stage.pct}%`}
                />
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {sleep.stages.map((stage, index) => (
                <div key={stage.name} className="text-center">
                  <span className={`mx-auto block h-1 w-4 rounded ${['bg-[#1f6fb2]', 'bg-[#2b8ed6]', 'bg-[#5b6ee1]', 'bg-[#a05bd8]'][index]}`} />
                  <p className="mt-0.5 font-mono text-[7px] text-[#8fa0b4]">{stage.name}</p>
                  <p className="font-mono text-[9px] font-bold text-slate-200">{stage.pct}%</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-[#1d2836] bg-[#060d17] p-2.5">
              <p className="font-mono text-[8px] uppercase tracking-wider text-[#8fa0b4]">{t('recovery')}</p>
              <p className="mt-1 text-[10px] text-slate-300">{t('repay', { h: sleep.repayHours.toFixed(1) })}</p>
              <div className="mt-1.5 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[8px] text-[#8fa0b4]">{t('projected_risk')}</p>
                  <p className="font-mono text-lg font-bold text-[#7be8a0] tabular-nums">
                    {sleep.projected ? sleep.projected.R.toFixed(1) : '—'}
                    <span className="ml-1 font-mono text-[9px] text-[#8fa0b4]">
                      ({sleep.delta <= 0 ? '' : '+'}
                      {sleep.delta.toFixed(1)})
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[8px] text-[#8fa0b4]">now</p>
                  <p className="font-mono text-sm font-bold text-slate-200 tabular-nums">{model.R.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Selected organ */}
          <div className="rcpt-panel p-3.5">
            <div className="flex items-center justify-between border-b border-[#1d2836] pb-2">
              <div className="flex items-center gap-1.5">
                {(() => {
                  const Icon = ORGAN_ICONS[active.id] || Heart;
                  return <Icon size={14} className={tone(active.index).cls} />;
                })()}
                <h3 className="text-xs font-bold text-slate-100">{active.name}</h3>
              </div>
              <span className={`font-mono text-sm font-extrabold tabular-nums ${tone(active.index).cls}`}>{Math.round(active.index)}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#16222f]">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${active.index}%`, background: tone(active.index).hex }} />
            </div>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-wider text-[#8fa0b4]">PRIMARY DRIVER</p>
            <p className="text-[10px] text-slate-200">{active.driver}</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#8fa0b4]">{active.note}</p>
            <p className="mt-2 border-t border-[#1d2836] pt-1.5 font-mono text-[7.5px] text-[#5f7186]">
              MOST STRAINED: {worst.name.toUpperCase()} ({Math.round(worst.index)})
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {organs.map((organ) => {
              const t2 = tone(organ.index);
              return (
                <button
                  key={organ.id}
                  type="button"
                  onClick={() => setSelected(organ.id)}
                  className={`rounded-lg border p-1.5 text-left transition ${
                    selected === organ.id ? `${t2.border} ${t2.bg}` : 'border-[#1d2836] bg-[#060d17] hover:border-[#2b3f57]'
                  }`}
                >
                  <p className="truncate font-mono text-[7px] uppercase tracking-wider text-[#8fa0b4]">{organ.name.split(' ')[0]}</p>
                  <p className={`font-mono text-[11px] font-bold tabular-nums ${t2.cls}`}>{Math.round(organ.index)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
