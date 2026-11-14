import { Activity, Droplet, Shield, User } from 'lucide-react';
import DoseGauge from './DoseGauge.jsx';
import { fixed, num } from '../utils/format.js';

const FALLBACK_ASTRONAUT = {
  full_name: 'Commander Yassine',
  mission_role: 'Mission Specialist',
  blood_type: 'O+',
  safe_dose_limit_msv: '50.000',
};

export default function AstronautProfile({ astronaut, latestReading }) {
  const profile = { ...FALLBACK_ASTRONAUT, ...(astronaut || {}) };
  const dose = num(latestReading?.cumulative_dose_msv) ?? 12.4;
  const limit = num(profile.safe_dose_limit_msv) ?? 50.0;

  return (
    <div className="rcpt-panel p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-3">
        <div>
          <span className="eyebrow-text">PHYSIOLOGICAL TWIN</span>
          <h2 className="text-sm font-bold tracking-wide text-slate-100">Astronaut Profile</h2>
        </div>
        <span className="badge-rcpt badge-nominal">ACTIVE CREW</span>
      </div>

      {/* Profile Card */}
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#1d2836] bg-[#060d17]/80 p-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#17a9f0]/30 bg-[#17a9f0]/10 text-[#17a9f0]">
          <User size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-100">{profile.full_name}</p>
          <p className="truncate text-xs text-[#8fa0b4]">{profile.mission_role}</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[#1d2836] bg-[#060d17]/60 p-2.5">
          <div className="flex items-center gap-1.5 text-[#8fa0b4]">
            <Droplet size={12} className="text-[#ff5d4d]" />
            <span className="font-mono text-[8px] font-semibold tracking-wider">BLOOD TYPE</span>
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-slate-200">{profile.blood_type || 'O+'}</p>
        </div>

        <div className="rounded-lg border border-[#1d2836] bg-[#060d17]/60 p-2.5">
          <div className="flex items-center gap-1.5 text-[#8fa0b4]">
            <Shield size={12} className="text-[#17a9f0]" />
            <span className="font-mono text-[8px] font-semibold tracking-wider">DOSE LIMIT</span>
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-slate-200">
            {fixed(limit, 1)} <span className="text-[9px] font-normal text-slate-400">mSv</span>
          </p>
        </div>
      </div>

      {/* Circular Gauge */}
      <div className="mt-4 pt-2">
        <DoseGauge dose={dose} limit={limit} />
      </div>
    </div>
  );
}
