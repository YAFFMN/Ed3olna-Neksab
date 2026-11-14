import { Activity, Heart, Radio, Satellite, ShieldCheck, Zap } from 'lucide-react';
import {
  fixed,
  fluxStatus,
  heartStatus,
  num,
  radiationStatus,
  sScaleColor,
  statusTone,
} from '../utils/format.js';

function MetricTile({ icon: Icon, title, value, unit, status = 'nominal', subtext, pulse = false }) {
  const tone = statusTone(status);

  return (
    <div className={`rcpt-panel relative overflow-hidden p-3.5 transition-all ${tone.border} ${tone.glow}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className={tone.text} />
          <span className="font-mono text-[9px] font-semibold tracking-wider text-[#8fa0b4]">
            {title}
          </span>
        </div>
        <span className={`badge-rcpt ${tone.badge}`}>{tone.label}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <p className={`font-mono text-2xl font-bold tracking-tight tabular-nums ${tone.text} ${
          pulse ? 'animate-pulse' : ''
        }`}>
          {value}
        </p>
        {unit && <span className="font-mono text-[10px] text-slate-400">{unit}</span>}
      </div>

      {subtext && <p className="mt-1 truncate font-mono text-[9px] text-[#8fa0b4]">{subtext}</p>}
    </div>
  );
}

export default function TelemetryCards({ reading }) {
  const rate = num(reading?.radiation_rate_usv_hr);
  const heart = num(reading?.heart_rate_bpm);
  const flux10 = num(reading?.proton_flux_10mev);
  const flux100 = num(reading?.proton_flux_100mev);
  const sScaleVal = num(reading?.noaa_s_scale);

  const radTone = radiationStatus(rate);
  const heartTone = heartStatus(heart);
  const fluxTone = fluxStatus(sScaleVal);
  const scaleColor = sScaleColor(sScaleVal);

  const source = reading?.data_source || 'NO SIGNAL';
  const isNoaa = source === 'NOAA_LIVE';

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="eyebrow-text">LIVE SENSOR TELEMETRY</span>
        <span className="font-mono text-[9px] text-[#8fa0b4]">2.5s REFRESH WINDOW</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {/* Radiation Rate */}
        <MetricTile
          icon={Activity}
          title="RADIATION RATE"
          value={fixed(rate, 1)}
          unit="µSv/hr"
          status={radTone}
          subtext="Ambient ionizing dose rate"
        />

        {/* Heart Rate */}
        <MetricTile
          icon={Heart}
          title="CREW HEART RATE"
          value={heart !== null ? Math.round(heart) : '—'}
          unit="bpm"
          status={heartTone}
          pulse={heart !== null}
          subtext="Wearable biometric sensor"
        />

        {/* Proton Flux >=10 MeV */}
        <MetricTile
          icon={Zap}
          title="PROTON FLUX ≥10 MeV"
          value={fixed(flux10, 3)}
          unit="pfu"
          status={fluxTone}
          subtext="NOAA SWPC primary GOES"
        />

        {/* Proton Flux >=100 MeV */}
        <MetricTile
          icon={Zap}
          title="PROTON FLUX ≥100 MeV"
          value={fixed(flux100, 3)}
          unit="pfu"
          status={fluxTone}
          subtext="High-energy solar particles"
        />

        {/* NOAA S-Scale */}
        <div className="rcpt-panel p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite size={14} className="text-[#17a9f0]" />
              <span className="font-mono text-[9px] font-semibold tracking-wider text-[#8fa0b4]">
                NOAA S-SCALE
              </span>
            </div>
            <span className={`badge-rcpt ${fluxTone === 'critical' ? 'badge-bad' : fluxTone === 'warning' ? 'badge-warn' : 'badge-live'}`}>
              {scaleColor.label}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <span className={`inline-flex rounded-lg border px-3 py-1 font-mono text-xl font-bold tabular-nums ${scaleColor.text} ${scaleColor.border} ${scaleColor.bg}`}>
              {sScaleVal === null ? 'S—' : `S${Math.min(5, Math.max(0, Math.round(sScaleVal)))}`}
            </span>
            <p className="text-[10px] text-slate-300">Solar radiation storm tier</p>
          </div>
        </div>

        {/* Data Source */}
        <div className="rcpt-panel p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={14} className={isNoaa ? 'text-[#17a9f0]' : 'text-[#35d08a]'} />
              <span className="font-mono text-[9px] font-semibold tracking-wider text-[#8fa0b4]">
                DATA INGESTION
              </span>
            </div>
            <ShieldCheck size={14} className="text-[#35d08a]" />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className={`rounded-md border px-2.5 py-1 font-mono text-xs font-bold tracking-wider ${
              isNoaa
                ? 'border-[#17a9f0]/40 bg-[#17a9f0]/10 text-[#5cc8ff]'
                : 'border-[#35d08a]/40 bg-[#35d08a]/10 text-[#7be8a0]'
            }`}>
              {source}
            </span>
            <span className="font-mono text-[9px] text-[#8fa0b4]">
              {reading?.radiation_type || 'GCR'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
