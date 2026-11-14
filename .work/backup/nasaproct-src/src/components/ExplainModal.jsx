import { Calculator, CheckCircle2, ShieldAlert, X } from 'lucide-react';

export default function ExplainModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="rcpt-panel max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1d2836] pb-3">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-[#17a9f0]" />
            <h3 className="text-base font-bold text-white">How the Live Risk Index (R) is Computed</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
          <div className="rounded-lg border border-[#17a9f0]/30 bg-[#17a9f0]/10 p-3 font-mono text-[11px] text-[#5cc8ff]">
            R = 0.40 × (Radiation Strain) + 0.35 × (HRV Autonomic Strain) + 0.25 × (Sleep Debt) + Compounding Factor
          </div>

          <div>
            <h4 className="font-bold text-white">1. Multiplicative Compounding Interaction</h4>
            <p className="mt-1">
              Biological stressors in deep space do not merely add arithmetically. When an astronaut experiences acute sleep deprivation, cellular DNA double-strand break (DSB) repair pathways are down-regulated, and resting autonomic sympathetic tone spikes. Consequently, an identical ionizing dose triggers greater physiological strain in an exhausted astronaut than in a well-rested crew member.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white">2. Input Stressor Normalization</h4>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>
                <b>Radiation Strain (40%):</b> Instantaneous dose rate normalized against 1000 µSv/hr (SPE emergency threshold) plus cumulative dose accrued against 50.0 mSv mission safety limit.
              </li>
              <li>
                <b>HRV Autonomic Strain (35%):</b> RMSSD vagal tone derived from chest patch ECG. Lower RMSSD signifies elevated sympathetic drive and physiological distress.
              </li>
              <li>
                <b>Sleep Debt & Cognitive Strain (25%):</b> Head node EEG alpha/beta power ratio coupled with 48-hour cumulative sleep tracking.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white">3. Honest Scientific Labelling</h4>
            <div className="mt-1 grid grid-cols-3 gap-2 font-mono text-[10px]">
              <div className="rounded border border-[#1d2836] bg-[#060d17] p-2 text-center">
                <span className="block font-bold text-[#35d08a]">MEASURED</span>
                <span className="text-[8px] text-slate-400">ECG, HR, EEG bands</span>
              </div>
              <div className="rounded border border-[#1d2836] bg-[#060d17] p-2 text-center">
                <span className="block font-bold text-[#ffb224]">DERIVED</span>
                <span className="text-[8px] text-slate-400">HRV RMSSD, Risk R</span>
              </div>
              <div className="rounded border border-[#1d2836] bg-[#060d17] p-2 text-center">
                <span className="block font-bold text-[#17a9f0]">CALIBRATED</span>
                <span className="text-[8px] text-slate-400">Curiosity Gale RAD</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-[#1d2836] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#17a9f0]/40 bg-[#17a9f0]/20 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-[#17a9f0]/30"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
