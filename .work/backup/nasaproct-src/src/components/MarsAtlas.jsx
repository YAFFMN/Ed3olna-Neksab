import { useState } from 'react';
import { Compass, Globe, MapPin, Mountain, ShieldCheck, Waves } from 'lucide-react';

const SITES = [
  {
    id: 'gale',
    name: 'Gale Crater (Curiosity Baseline)',
    coords: '5.4°S 137.8°E',
    elevationKm: -4.5,
    pressurePa: 840,
    dailyDoseMsv: 0.64,
    notes: 'Calibrated against MSL Curiosity RAD instrument. Seasonal pressure swing causes ~16% dose variation.',
  },
  {
    id: 'jezero',
    name: 'Jezero Crater (Perseverance Site)',
    coords: '18.4°N 77.5°E',
    elevationKm: -2.5,
    pressurePa: 750,
    dailyDoseMsv: 0.68,
    notes: 'Moderate crater depth. Thinner atmospheric column increases ambient GCR by ~6% relative to Gale.',
  },
  {
    id: 'hellas',
    name: 'Hellas Planitia (Deep Basin)',
    coords: '42.7°S 70.0°E',
    elevationKm: -7.2,
    pressurePa: 1150,
    dailyDoseMsv: 0.57,
    notes: 'Deepest impact basin on Mars. Thickest CO2 column density offers maximum natural surface shielding.',
  },
  {
    id: 'olympus',
    name: 'Olympus Mons Summit',
    coords: '18.6°N 226.2°E',
    elevationKm: +21.3,
    pressurePa: 72,
    dailyDoseMsv: 1.42,
    notes: 'High volcanic peak above 90% of the atmosphere. Approaching unshielded interplanetary cruise dose (~1.8 mSv/day).',
  },
];

export default function MarsAtlas() {
  const [selectedId, setSelectedId] = useState('gale');
  const activeSite = SITES.find((s) => s.id === selectedId) || SITES[0];

  return (
    <div className="rcpt-panel p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-3">
        <div>
          <span className="eyebrow-text">MISSION PLANNING & TERRAIN DOSIMETRY</span>
          <h3 className="text-sm font-bold text-slate-100">Mars Surface Radiation Atlas</h3>
        </div>
        <span className="badge-rcpt badge-live">
          <Globe size={11} /> CURIOSITY RAD CALIBRATED
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[#8fa0b4]">
        Atmospheric column mass ($g/\text{cm}^2$) blocks secondary neutrons and cosmic rays. Compare expected surface radiation across Martian topography.
      </p>

      {/* Sites Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SITES.map((site) => {
          const isSelected = site.id === selectedId;
          return (
            <button
              key={site.id}
              type="button"
              onClick={() => setSelectedId(site.id)}
              className={`rounded-lg border p-2.5 text-left transition ${
                isSelected
                  ? 'border-[#17a9f0] bg-[#17a9f0]/15 text-white'
                  : 'border-[#1d2836] bg-[#060d17] text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                <MapPin size={11} className={isSelected ? 'text-[#17a9f0]' : 'text-slate-500'} />
                <span className="truncate">{site.name.split(' ')[0]}</span>
              </div>
              <p className="mt-1 font-mono text-xs font-bold text-slate-100">
                {site.dailyDoseMsv} <span className="text-[8px] font-normal text-slate-400">mSv/day</span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Site Details */}
      <div className="mt-4 rounded-xl border border-[#1d2836] bg-[#060d17] p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white">{activeSite.name}</h4>
          <span className="font-mono text-[9px] text-[#17a9f0]">{activeSite.coords}</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-center text-xs">
          <div className="rounded bg-black/40 p-2">
            <span className="block text-[8px] text-[#8fa0b4]">ELEVATION</span>
            <span className="font-bold text-white">{activeSite.elevationKm > 0 ? `+${activeSite.elevationKm}` : activeSite.elevationKm} km</span>
          </div>
          <div className="rounded bg-black/40 p-2">
            <span className="block text-[8px] text-[#8fa0b4]">SURFACE PRESSURE</span>
            <span className="font-bold text-white">{activeSite.pressurePa} Pa</span>
          </div>
          <div className="rounded bg-black/40 p-2">
            <span className="block text-[8px] text-[#8fa0b4]">DAILY DOSE RATE</span>
            <span className="font-bold text-[#35d08a]">{activeSite.dailyDoseMsv} mSv/d</span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-300">
          {activeSite.notes}
        </p>
      </div>
    </div>
  );
}
