import { useEffect, useRef, useState } from 'react';
import { Cloud, Loader2, Play, RotateCcw, Square, Upload } from 'lucide-react';
import { INPUT_LIMITS, SCENARIOS } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';

function Sparkline({ values }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width: W, height: H } = canvas;
    ctx.clearRect(0, 0, W, H);

    [[35, '#ffb224'], [70, '#ff5d4d']].forEach(([level, color]) => {
      const y = H - (level / 100) * H;
      ctx.strokeStyle = color;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    });

    ctx.setLineDash([]);
    ctx.strokeStyle = '#17a9f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const data = values.length ? values : [0];
    data.forEach((v, i) => {
      const px = (i / Math.max(1, data.length - 1)) * W;
      const py = H - (v / 100) * H;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.stroke();
  }, [values]);

  return <canvas ref={ref} width={260} height={90} className="w-full rounded-lg border border-[#1d2836] bg-[#060d17]" />;
}

function Slider({ id, label, value, unit, limit, onChange, explain }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[10px] text-slate-300">
          {label} {explain}
        </label>
        <span className="font-mono text-[11px] font-bold text-[#5cc8ff] tabular-nums">
          {value.toFixed(limit.step < 1 ? 1 : 0)}
          <span className="ml-0.5 text-[8px] font-normal text-[#8fa0b4]">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={limit.min}
        max={limit.max}
        step={limit.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[#16222f] accent-[#17a9f0]"
        style={{
          background: `linear-gradient(90deg, #17a9f0 ${((value - limit.min) / (limit.max - limit.min)) * 100}%, #16222f ${
            ((value - limit.min) / (limit.max - limit.min)) * 100
          }%)`,
        }}
      />
    </div>
  );
}

export default function SimulatorPanel({ twin, onPush, notify }) {
  const { t } = useI18n();
  const [pushing, setPushing] = useState(false);
  const { inputs, setInput, scenarioId, applyScenario, running, clock, history, toggleSim, reset } = twin;

  async function handlePush() {
    if (pushing || !onPush) return;
    setPushing(true);
    try {
      await onPush();
      notify?.({
        type: 'success',
        title: 'TELEMETRY PUSHED',
        message: t('pushed'),
      });
    } catch (error) {
      notify?.({
        type: 'error',
        title: 'HABITAT LINK ERROR',
        message: error?.message || 'Could not reach the habitat server.',
      });
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="rcpt-panel overflow-hidden" data-tour="simulator">
      <div className="flex items-center justify-between border-b border-[#1d2836] px-3.5 py-2.5">
        <div>
          <span className="eyebrow-text">{t('sensor')}</span>
          <p className="text-xs font-bold text-slate-100">{t('scenario')}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#35d08a]/30 bg-[#35d08a]/10 px-2 py-0.5 font-mono text-[7px] font-bold tracking-wider text-[#7be8a0]">
          <span className="h-1 w-1 rounded-full bg-[#35d08a]" />
          {t('offline')}
        </span>
      </div>

      <div className="space-y-3 p-3.5">
        <div className="grid grid-cols-3 gap-1.5">
          {SCENARIOS.map((sc) => {
            const active = scenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => applyScenario(sc.id)}
                title={sc.desc}
                className={`rounded-lg border px-1.5 py-2 text-center font-mono text-[8px] font-bold leading-tight transition ${
                  active
                    ? 'border-[#17a9f0] bg-[#17a9f0]/15 text-[#5cc8ff] shadow-[0_0_12px_rgba(23,169,240,0.25)]'
                    : 'border-[#1d2836] bg-[#060d17] text-[#8fa0b4] hover:border-[#2b3f57] hover:text-white'
                }`}
              >
                {sc.id === 'nominal' ? t('sc_nominal') : sc.id === 'sleep' ? t('sc_sleep') : t('sc_spe')}
              </button>
            );
          })}
        </div>

        <Slider
          id="sim-dose"
          label={t('lbl_d')}
          value={inputs.d}
          unit="mSv/hr"
          limit={INPUT_LIMITS.d}
          onChange={(v) => setInput('d', v)}
        />
        <Slider
          id="sim-hrv"
          label={t('lbl_h')}
          value={inputs.h}
          unit="ms"
          limit={INPUT_LIMITS.h}
          onChange={(v) => setInput('h', v)}
        />
        <Slider
          id="sim-sleep"
          label={t('lbl_s')}
          value={inputs.s}
          unit="h"
          limit={INPUT_LIMITS.s}
          onChange={(v) => setInput('s', v)}
        />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleSim}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 font-mono text-[9px] font-bold transition ${
              running
                ? 'border-[#ff5d4d]/50 bg-[#ff5d4d]/15 text-[#ff8a7f] hover:bg-[#ff5d4d]/25'
                : 'border-[#17a9f0]/45 bg-[#17a9f0]/15 text-[#5cc8ff] hover:bg-[#17a9f0]/25'
            }`}
          >
            {running ? <Square size={10} /> : <Play size={10} />}
            {running ? t('stop_sim') : t('run_sim')}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              applyScenario(SCENARIOS[0].id);
            }}
            title={t('reset')}
            className="flex h-[26px] w-7 items-center justify-center rounded-lg border border-[#1d2836] bg-[#060d17] text-[#8fa0b4] transition hover:text-white"
          >
            <RotateCcw size={11} />
          </button>
        </div>

        <p className="font-mono text-[8px] text-[#8fa0b4]">
          {running || clock > 0
            ? `${t('clock_h', { h: clock.toFixed(1) })}${clock >= 12 ? t('clock_onset') : ''}`
            : t('clock_manual')}
        </p>

        <Sparkline values={history} />

        <button
          type="button"
          onClick={() => void handlePush()}
          disabled={pushing}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#1d2836] bg-[#0a0f16] px-2 py-1.5 font-mono text-[9px] font-semibold text-slate-300 transition hover:border-[#17a9f0]/50 hover:text-white disabled:opacity-50"
        >
          {pushing ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          {t('push_habitat')}
        </button>

        <p className="flex items-start gap-1 font-mono text-[7.5px] leading-relaxed text-[#5f7186]">
          <Cloud size={9} className="mt-[1px] shrink-0" />
          Simulated inputs. No sensor hardware is connected in this build.
        </p>
      </div>
    </div>
  );
}
