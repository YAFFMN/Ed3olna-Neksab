import { useState } from 'react';
import { Loader2, Satellite } from 'lucide-react';
import { syncSpaceWeather } from '../services/api.js';
import { num } from '../utils/format.js';

export default function NoaaSyncButton({ onRefresh, notify }) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);

    try {
      const res = await syncSpaceWeather();
      const rawScale = res?.sScale ?? res?.reading?.noaa_s_scale;
      const scaleNum = num(rawScale);
      const scaleLabel = scaleNum !== null ? `S${Math.round(scaleNum)}` : 'S0';

      notify({
        type: 'success',
        title: 'NOAA SATELLITE SYNC COMPLETE',
        message: `${scaleLabel} Solar Radiation Storm Tier · Data source: ${res?.source || 'GOES Primary'}. Telemetry updated.`,
      });

      await onRefresh();
    } catch (err) {
      notify({
        type: 'error',
        title: 'NOAA SYNC FAILED',
        message: err?.message || 'Unable to contact SWPC satellites.',
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      className="group flex w-full items-center justify-center gap-2 rounded-lg border border-[#17a9f0]/40 bg-[#17a9f0]/10 px-3.5 py-2.5 font-mono text-[10px] font-bold tracking-wider text-[#5cc8ff] transition hover:border-[#17a9f0] hover:bg-[#17a9f0]/20 disabled:cursor-wait disabled:opacity-50"
    >
      {syncing ? (
        <Loader2 size={14} className="animate-spin text-[#17a9f0]" />
      ) : (
        <Satellite size={14} className="transition group-hover:rotate-12" />
      )}
      {syncing ? 'CONNECTING NOAA SWPC…' : 'SYNC NOAA GOES SATELLITE'}
    </button>
  );
}
