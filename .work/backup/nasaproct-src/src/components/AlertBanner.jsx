import { useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { formatUtcDateTime, parseActionSteps } from '../utils/format.js';

function AlertCard({ alert, onResolve, resolving }) {
  const [expanded, setExpanded] = useState(true);
  const critical = String(alert.severity || '').toUpperCase() === 'CRITICAL';
  const Icon = critical ? AlertOctagon : AlertTriangle;
  const steps = parseActionSteps(alert.action_steps);

  const containerStyle = critical
    ? 'border-[#ff5d4d]/50 bg-[#ff5d4d]/10 shadow-[0_0_25px_rgba(255,93,77,0.2)]'
    : 'border-[#ffb224]/50 bg-[#ffb224]/10 shadow-[0_0_20px_rgba(255,178,36,0.15)]';

  const stripeColor = critical ? 'bg-[#ff5d4d]' : 'bg-[#ffb224]';

  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 ${containerStyle}`}>
      {/* Accent left line */}
      <div className={`absolute inset-y-0 left-0 w-1.5 ${stripeColor}`} />

      <div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              critical ? 'border-[#ff5d4d]/40 bg-[#ff5d4d]/20 text-[#ff8a7f]' : 'border-[#ffb224]/40 bg-[#ffb224]/20 text-[#ffd27a]'
            }`}>
              <Icon size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-mono text-[9px] font-bold tracking-widest ${critical ? 'text-[#ff8a7f]' : 'text-[#ffd27a]'}`}>
                  {String(alert.severity || 'WARNING').toUpperCase()} // PROTOCOL ACTIVE
                </span>
                {alert.condition_code && (
                  <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-[8px] text-slate-300">
                    {alert.condition_code}
                  </span>
                )}
              </div>

              <h3 className="mt-1 text-sm font-bold leading-snug text-slate-100">
                {alert.title || 'Radiation Safety Protocol Triggered'}
              </h3>
              <p className="mt-1 font-mono text-[9px] text-[#8fa0b4]">
                TRIGGERED: {formatUtcDateTime(alert.triggered_at)}
              </p>
            </div>
          </div>

          {/* Action Checklist */}
          <div className="ml-12 mt-3">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-slate-400 hover:text-white"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              IMMEDIATE ACTION CHECKLIST
            </button>

            {expanded && (
              <div className="mt-2 space-y-1.5">
                {steps.length > 0 ? (
                  steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                      <span className={`mt-0.5 font-mono text-[10px] font-bold ${critical ? 'text-[#ff8a7f]' : 'text-[#ffd27a]'}`}>
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span>{step}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Refer to NASA Emergency Flight Rules.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Resolve Button */}
        <button
          type="button"
          onClick={() => onResolve(alert.id)}
          disabled={resolving}
          className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2.5 font-mono text-[10px] font-bold tracking-wider transition disabled:opacity-50 ${
            critical
              ? 'border-[#ff5d4d]/40 bg-[#ff5d4d]/20 text-white hover:bg-[#ff5d4d]/30'
              : 'border-[#ffb224]/40 bg-[#ffb224]/20 text-white hover:bg-[#ffb224]/30'
          }`}
        >
          {resolving ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {resolving ? 'RESOLVING…' : 'ACKNOWLEDGE / RESOLVE'}
        </button>
      </div>
    </div>
  );
}

export default function AlertBanner({ alerts = [], onResolve, resolvingIds = new Set() }) {
  if (!alerts.length) return null;

  const criticalCount = alerts.filter(
    (a) => String(a.severity || '').toUpperCase() === 'CRITICAL'
  ).length;

  return (
    <section aria-live="assertive" className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className={criticalCount > 0 ? 'text-[#ff5d4d]' : 'text-[#ffb224]'} />
          <span className={`font-mono text-[10px] font-bold tracking-widest ${
            criticalCount > 0 ? 'text-[#ff8a7f]' : 'text-[#ffd27a]'
          }`}>
            {criticalCount > 0 ? 'EMERGENCY ACTION REQUIRED' : 'ELEVATED ALERT'} // {alerts.length} ACTIVE
          </span>
        </div>
        <span className="font-mono text-[9px] text-[#8fa0b4]">
          {criticalCount} CRITICAL
        </span>
      </div>

      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onResolve={onResolve}
          resolving={resolvingIds.has(alert.id)}
        />
      ))}
    </section>
  );
}
