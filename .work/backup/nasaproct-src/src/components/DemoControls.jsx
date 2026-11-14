import { useState } from 'react';
import { Activity, AlertTriangle, ChevronDown, ChevronUp, Moon, Radio, Sliders, Sun, Zap } from 'lucide-react';
import { createReading } from '../services/api.js';
import { num } from '../utils/format.js';

const SCENARIOS = [
  {
    id: 'calm',
    title: 'Calm Orbit (Nominal)',
    rate: 45.2,
    heart: 72,
    type: 'GCR',
    icon: Sun,
    style: 'border-[#35d08a]/30 bg-[#35d08a]/10 text-[#7be8a0] hover:bg-[#35d08a]/20',
    desc: 'Deep space GCR background, well-rested crew',
  },
  {
    id: 'fatigue',
    title: 'Sleep-Deprived Crew',
    rate: 310.5,
    heart: 88,
    type: 'GCR',
    icon: Moon,
    style: 'border-[#ffb224]/35 bg-[#ffb224]/10 text-[#ffd27a] hover:bg-[#ffb224]/20',
    desc: 'Compounding fatigue + elevated radiation stress',
  },
  {
    id: 'solar',
    title: 'Acute Solar Storm (SPE)',
    rate: 1450.0,
    heart: 118,
    type: 'SPE',
    icon: Zap,
    style: 'border-[#ff5d4d]/40 bg-[#ff5d4d]/15 text-[#ff8a7f] hover:bg-[#ff5d4d]/25',
    desc: 'Critical solar particle event spike, shelter required',
  },
];

export default function DemoControls({ latestReading, onRefresh, notify }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentDose = num(latestReading?.cumulative_dose_msv) ?? 12.4;

  async function handleInject(scenario) {
    if (submitting) return;
    setSubmitting(true);

    const nextDose = Number((currentDose + 0.05).toFixed(3));

    try {
      await createReading({
        radiation_rate_usv_hr: scenario.rate,
        cumulative_dose_msv: nextDose,
        radiation_type: scenario.type,
        heart_rate_bpm: scenario.heart,
        data_source: 'WEARABLE',
      }, 1);

      notify({
        type: 'success',
        title: `${scenario.title.toUpperCase()} INJECTED`,
        message: `${scenario.rate} µSv/hr · HR ${scenario.heart} bpm · Dose ${nextDose} mSv. Telemetry evaluated.`,
      });

      await onRefresh();
    } catch (err) {
      notify({
        type: 'error',
        title: 'INJECTION FAILED',
        message: err?.message || 'Could not inject test telemetry.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rcpt-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3.5 text-left transition hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#ffb224]/40 bg-[#ffb224]/10 text-[#ffd27a]">
            <Sliders size={14} />
          </div>
          <div>
            <span className="eyebrow-text">SCENARIO DEMO PRESETS</span>
            <p className="text-xs font-bold text-slate-100">Telemetry Simulator</p>
          </div>
        </div>

        {open ? <ChevronUp size={16} className="text-[#8fa0b4]" /> : <ChevronDown size={16} className="text-[#8fa0b4]" />}
      </button>

      {open && (
        <div className="border-t border-[#1d2836] bg-[#060d17]/50 p-3 space-y-2">
          <p className="text-[10px] text-[#8fa0b4]">
            Jump between mission scenarios to test how the Physiological Twin, active protocols, and Nova AI react to compounding stressors.
          </p>

          <div className="space-y-2 pt-1">
            {SCENARIOS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleInject(s)}
                  className={`flex w-full flex-col rounded-lg border p-2 text-left font-mono transition disabled:opacity-50 ${s.style}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={13} />
                      <span className="text-[10px] font-bold">{s.title}</span>
                    </div>
                    <span className="text-[9px] opacity-80">{s.rate} µSv/hr</span>
                  </div>
                  <p className="mt-1 text-[8px] opacity-70">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
