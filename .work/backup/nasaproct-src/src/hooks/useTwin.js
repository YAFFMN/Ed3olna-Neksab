import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PARAMS,
  INPUT_LIMITS,
  SCENARIOS,
  clamp,
  riskModel,
  speProfile,
} from '../lib/risk.js';

const SIM_TICK_MS = 120;
const SIM_STEP_H = 0.25;
const SIM_END_H = 40;

/**
 * Single source of truth for the physiological twin.
 * The three simulated sensor inputs (dose rate, HRV, sleep debt) drive every
 * number in the app: risk index, organ systems, protocols, crew quarters.
 */
export function useTwin() {
  const [inputs, setInputs] = useState(() => {
    const s = SCENARIOS[0];
    return { d: s.d, h: s.h, s: s.s };
  });
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [running, setRunning] = useState(false);
  const [clock, setClock] = useState(0);
  const [history, setHistory] = useState([]);
  const timerRef = useRef(null);
  const clockRef = useRef(0);

  const model = useMemo(() => riskModel(inputs.d, inputs.h, inputs.s, DEFAULT_PARAMS), [inputs]);

  const stopSim = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }, []);

  const setInput = useCallback((key, value) => {
    const limit = INPUT_LIMITS[key];
    if (!limit) return;
    setInputs((prev) => ({ ...prev, [key]: clamp(Number(value), limit.min, limit.max) }));
    setScenarioId('manual');
  }, []);

  const applyScenario = useCallback(
    (id) => {
      const sc = SCENARIOS.find((s) => s.id === id);
      if (!sc) return null;
      stopSim();
      setClock(0);
      clockRef.current = 0;
      setInputs({ d: sc.d, h: sc.h, s: sc.s });
      setScenarioId(sc.id);
      setHistory([]);
      return sc;
    },
    [stopSim]
  );

  const startSim = useCallback(() => {
    if (timerRef.current) return;
    setRunning(true);
    setHistory([]);
    clockRef.current = 0;
    setClock(0);
    setScenarioId('spe');
    timerRef.current = window.setInterval(() => {
      const next = +(clockRef.current + SIM_STEP_H).toFixed(2);
      if (next > SIM_END_H) {
        stopSim();
        return;
      }
      clockRef.current = next;
      setClock(next);
      const p = speProfile(next);
      setInputs({ d: p.d, h: p.h, s: p.s });
      const m = riskModel(p.d, p.h, p.s);
      setHistory((prev) => [...prev.slice(-159), m.R]);
    }, SIM_TICK_MS);
  }, [stopSim]);

  const toggleSim = useCallback(() => {
    if (timerRef.current) stopSim();
    else startSim();
  }, [startSim, stopSim]);

  useEffect(() => () => stopSim(), [stopSim]);

  // Push the current simulated state to the habitat server so the alerting,
  // protocols and Nova RAG all see the same numbers.
  const pushReading = useCallback(
    async (createReading, astronautId = 1) => {
      const reading = await createReading(
        {
          radiation_rate_usv_hr: Math.round(inputs.d * 1000 * 10) / 10,
          cumulative_dose_msv: Math.round((12.4 + inputs.d * 0.05) * 1000) / 1000,
          radiation_type: inputs.d >= 10 ? 'SPE' : 'GCR',
          heart_rate_bpm: Math.round(clamp(72 + (70 - inputs.h) * 0.8 + inputs.s * 1.5, 48, 160)),
          data_source: 'WEARABLE',
        },
        astronautId
      );
      return reading;
    },
    [inputs]
  );

  return {
    inputs,
    model,
    scenarioId,
    scenario: SCENARIOS.find((s) => s.id === scenarioId) || null,
    running,
    clock,
    history,
    setInput,
    applyScenario,
    startSim,
    stopSim,
    toggleSim,
    pushReading,
  };
}
