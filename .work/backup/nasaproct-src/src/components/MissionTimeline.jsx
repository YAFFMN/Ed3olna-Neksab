import { TRAJECTORY } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';

const W = 640;
const L = 48;
const R = 620;
const PW = R - L;

const PANELS = [
  { y: 16, h: 140, label: 'Risk index R_MRP', min: 0, max: 100, ticks: [0, 35, 70, 100] },
  { y: 176, h: 86, label: 'Dose rate (mSv/hr)', min: 0, max: 20, ticks: [0, 10, 20] },
  { y: 282, h: 86, label: 'HRV (ms) / sleep debt (h)', min: 20, max: 80, ticks: [20, 50, 80] },
];

export default function MissionTimeline({ clock = 0, running = false }) {
  const { t } = useI18n();
  const current = running || clock > 0 ? clock : -1;

  const sx = (time) => L + (time / 40) * PW;
  const sy = (panel, value) => panel.y + panel.h - ((value - panel.min) / (panel.max - panel.min)) * panel.h;

  const visible = TRAJECTORY.filter((q) => current < 0 || q.t <= current + 0.001);
  const path = (fn, panel) =>
    visible.map((q, i) => `${i ? 'L' : 'M'}${sx(q.t).toFixed(1)},${sy(panel, fn(q)).toFixed(1)}`).join('');

  const p0 = PANELS[0];
  const bottom = PANELS[2].y + PANELS[2].h;

  return (
    <div className="rcpt-panel p-3.5" data-tour="trajectory">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-2">
        <div>
          <span className="eyebrow-text">40 H SIMULATION</span>
          <h3 className="text-xs font-bold text-slate-100">{t('trajectory')}</h3>
        </div>
        <span className="font-mono text-[9px] text-[#8fa0b4]">h 0 → 40</span>
      </div>

      <svg viewBox={`0 0 ${W} 400`} className="mt-1 w-full" role="img" aria-label={t('trajectory')}>
        {PANELS.map((panel, index) => (
          <g key={panel.label}>
            <rect x={L} y={panel.y} width={PW} height={panel.h} fill="#0a0f16" />
            {panel.ticks.map((tick) => {
              const y = sy(panel, tick);
              return (
                <g key={tick}>
                  <line x1={L} x2={R} y1={y} y2={y} stroke="#1e2633" />
                  <text x={L - 5} y={y + 3} textAnchor="end" className="fill-[#5f7186] text-[8px]">
                    {tick}
                  </text>
                </g>
              );
            })}
            {[0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40].map((time) => (
              <line key={time} x1={sx(time)} x2={sx(time)} y1={panel.y} y2={panel.y + panel.h} stroke="#141b26" />
            ))}
            <text x={L + 4} y={panel.y + 11} className="fill-[#8fa0b4] text-[9px] font-semibold">
              {panel.label}
            </text>
            {index === 0 && null}
          </g>
        ))}

        {/* SPE onset + sheltering window */}
        <rect x={sx(12)} y={p0.y} width={sx(40) - sx(12)} height={bottom - p0.y} fill="#ff5d4d" opacity="0.05" />
        <line x1={sx(12)} x2={sx(12)} y1={p0.y} y2={bottom} stroke="#ff5d4d" strokeDasharray="4 3" />
        <text x={sx(12) + 4} y={bottom - 4} className="fill-[#ff9a8f] text-[8px]">
          SPE onset (h 12)
        </text>

        {/* thresholds */}
        {[[35, '#ffb224', 'Elevated 35'], [70, '#ff5d4d', 'Emergency 70']].map(([level, color, label]) => {
          const y = sy(p0, level);
          return (
            <g key={level}>
              <line x1={L} x2={R} y1={y} y2={y} stroke={color} strokeDasharray="5 4" opacity="0.8" />
              <text x={R - 3} y={y - 3} textAnchor="end" className="text-[8px]" style={{ fill: color }}>
                {label}
              </text>
            </g>
          );
        })}

        {visible.length > 1 && (
          <>
            <path
              d={`${visible
                .map((q, i) => `${i ? 'L' : 'M'}${sx(q.t).toFixed(1)},${sy(p0, q.hi).toFixed(1)}`)
                .join('')}${visible
                .slice()
                .reverse()
                .map((q) => `L${sx(q.t).toFixed(1)},${sy(p0, q.lo).toFixed(1)}`)
                .join('')}Z`}
              fill="#17a9f0"
              opacity="0.22"
            />
            <path d={path((q) => q.R, p0)} fill="none" stroke="#5cc8ff" strokeWidth="1.8" />
            <path d={path((q) => Math.min(q.d, 20), PANELS[1])} fill="none" stroke="#ffb224" strokeWidth="1.2" />
            <path d={path((q) => q.h, PANELS[2])} fill="none" stroke="#35d08a" strokeWidth="1.2" />
            <path
              d={path((q) => 20 + q.s * 10, PANELS[2])}
              fill="none"
              stroke="#c792ff"
              strokeWidth="1.4"
              strokeDasharray="3 2"
            />
            <text x={R - 3} y={PANELS[2].y + 11} textAnchor="end" className="fill-[#35d08a] text-[8px]">
              HRV
            </text>
            <text x={R - 34} y={PANELS[2].y + 11} textAnchor="end" className="fill-[#c792ff] text-[8px]">
              sleep debt (20+10·h)
            </text>
          </>
        )}

        {current >= 0 && (
          <line x1={sx(current)} x2={sx(current)} y1={p0.y} y2={bottom} stroke="#fff" opacity="0.7" />
        )}

        {[0, 8, 16, 24, 32, 40].map((time) => (
          <text key={time} x={sx(time)} y="386" textAnchor="middle" className="fill-[#5f7186] text-[8px]">
            {time}
          </text>
        ))}
        <text x={(L + R) / 2} y="398" textAnchor="middle" className="fill-[#8fa0b4] text-[8px]">
          Mission elapsed time (h)
        </text>
      </svg>

      <p className="mt-1 text-[9px] leading-relaxed text-[#8fa0b4]">{t('trajectory_note')}</p>
    </div>
  );
}
