import { Activity, BatteryCharging, Cpu, Heart, Radio, Shield, Waves, Wind } from 'lucide-react';

export default function TriNodeSystem({ latestReading, riskScore }) {
  const heart = latestReading?.heart_rate_bpm ?? 72;
  const hrv = Math.max(25, Math.round(110 - (heart - 50) * 0.9 - (riskScore * 0.4)));
  const alphaRatio = Math.max(20, Math.round(75 - riskScore * 0.45));
  const betaRatio = 100 - alphaRatio;

  return (
    <div className="rcpt-panel p-4">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-2.5">
        <div>
          <span className="eyebrow-text">TRI-NODE BIOMETRIC HARDWARE</span>
          <h3 className="text-sm font-bold text-slate-100">Wearable Sensor Network</h3>
        </div>
        <span className="badge-rcpt badge-live">
          <Radio size={10} className="animate-pulse" /> BLE 5.2 SYNCED
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {/* Node 1: Head */}
        <div className="rounded-lg border border-[#1d2836] bg-[#060d17]/80 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold text-[#17a9f0]">① HEAD NODE</span>
            <span className="font-mono text-[8px] text-[#35d08a]">98% BAT</span>
          </div>
          <p className="mt-1 font-mono text-[8px] text-[#8fa0b4]">EEG Comb Electrodes</p>

          <div className="mt-2 space-y-1 font-mono">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">EEG Band (α/β):</span>
              <span className="font-bold text-slate-200">12.4 Hz</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-slate-400">α Alertness:</span>
              <span className="font-semibold text-[#35d08a]">{alphaRatio}%</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-slate-400">β Fatigue Load:</span>
              <span className="font-semibold text-[#ffb224]">{betaRatio}%</span>
            </div>
          </div>
        </div>

        {/* Node 2: Chest */}
        <div className="rounded-lg border border-[#1d2836] bg-[#060d17]/80 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold text-[#17a9f0]">② CHEST PATCH</span>
            <span className="font-mono text-[8px] text-[#35d08a]">95% BAT</span>
          </div>
          <p className="mt-1 font-mono text-[8px] text-[#8fa0b4]">ECG / Resp / GSR</p>

          <div className="mt-2 space-y-1 font-mono">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">HRV (RMSSD):</span>
              <span className="font-bold text-[#35d08a]">{hrv} ms</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-slate-400">Respiration:</span>
              <span className="font-semibold text-slate-200">15 br/min</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-slate-400">GSR Stress:</span>
              <span className="font-semibold text-slate-200">{riskScore > 50 ? 'ELEVATED' : 'NOMINAL'}</span>
            </div>
          </div>
        </div>

        {/* Node 3: Wrist Master Hub */}
        <div className="rounded-lg border border-[#1d2836] bg-[#060d17]/80 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold text-[#17a9f0]">③ WRIST HUB</span>
            <span className="font-mono text-[8px] text-[#35d08a]">UWB / Wi-Fi</span>
          </div>
          <p className="mt-1 font-mono text-[8px] text-[#8fa0b4]">Optical PPG & In-Suit</p>

          <div className="mt-2 space-y-1 font-mono">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Blood Pressure:</span>
              <span className="font-bold text-slate-200">118/76</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-slate-400">SpO2 Oxygen:</span>
              <span className="font-semibold text-[#35d08a]">98%</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-slate-400">Suit Pressure:</span>
              <span className="font-semibold text-slate-200">0.98 atm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
