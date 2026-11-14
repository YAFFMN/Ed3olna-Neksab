import { fixed, num } from '../utils/format.js';

const RADIUS = 64;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DoseGauge({ dose, limit }) {
  const currentDose = num(dose) ?? 0;
  const safeLimit = num(limit) ?? 50;
  const ratio = safeLimit > 0 ? (currentDose / safeLimit) * 100 : 0;
  const clampedRatio = Math.min(100, Math.max(0, ratio));

  const isCritical = ratio >= 90;
  const isWarning = ratio >= 60 && ratio < 90;

  const strokeColor = isCritical ? '#ff5d4d' : isWarning ? '#ffb224' : '#17a9f0';
  const textColor = isCritical ? 'text-[#ff5d4d]' : isWarning ? 'text-[#ffb224]' : 'text-[#17a9f0]';
  const offset = CIRCUMFERENCE - (clampedRatio / 100) * CIRCUMFERENCE;

  return (
    <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
      {/* Background radial glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(23,169,240,0.08)_0%,transparent_70%)]" />

      {/* SVG Ring */}
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 160 160">
        {/* Track circle */}
        <circle
          cx="80"
          cy="80"
          r={RADIUS}
          fill="none"
          stroke="#16222f"
          strokeWidth="8"
        />
        {/* Dotted scale ring */}
        <circle
          cx="80"
          cy="80"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease',
            filter: `drop-shadow(0 0 8px ${strokeColor})`,
          }}
        />
      </svg>

      {/* Center Value */}
      <div className="relative z-10 text-center">
        <p className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${textColor}`}>
          {Math.round(ratio)}<span className="text-base font-normal">%</span>
        </p>
        <p className="mt-1 font-mono text-[8px] font-semibold tracking-widest text-[#8fa0b4]">
          SAFE DOSE ACCRUED
        </p>
        <p className="mt-0.5 font-mono text-[9px] text-slate-400">
          {fixed(currentDose, 2)} / {fixed(safeLimit, 1)} mSv
        </p>
      </div>
    </div>
  );
}
