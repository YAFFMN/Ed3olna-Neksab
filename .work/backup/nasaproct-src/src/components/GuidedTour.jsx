import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useI18n } from '../lib/i18n.jsx';

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to the Physiological Twin',
    text: 'Three simulated sensor inputs — radiation dose rate, heart-rate variability and sleep debt — drive every number in this app. This tour takes about a minute.',
  },
  {
    id: 'metrics',
    target: 'metric-R',
    title: 'One score, fully explained',
    text: 'The risk index R runs from 0 to 100 and is the only headline number. Every tile has a "?" button that opens the exact formula and the current values behind it.',
  },
  {
    id: 'simulator',
    target: 'simulator',
    title: 'Scenarios and the 40-hour storm',
    text: 'Pick a preset — calm orbit, a sleep-deprived crew, or an acute solar particle event — or move the sliders yourself. "Run 40 h" plays a full storm timeline hour by hour.',
  },
  {
    id: 'decomposition',
    target: 'decomposition',
    title: 'Stressors compound',
    text: 'The first three bars are the weighted stressors. The fourth is the non-linear interaction: a tired crew is hit harder by the same dose. Raise sleep debt in a storm and watch that bar grow.',
  },
  {
    id: 'trajectory',
    target: 'trajectory',
    title: 'Trajectory and tiers',
    text: 'Risk climbs after the storm onset at hour 12 and crosses the elevated (35) and emergency (70) lines. The shaded band is a fixed display interval, not a statistical one.',
  },
  {
    id: 'surface',
    target: 'surface',
    title: 'The whole risk surface',
    text: 'This heatmap shows R for every combination of dose rate and HRV at the current sleep debt. The white contours are the 35 and 70 thresholds; the dot is where the crew is now.',
  },
  {
    id: 'quarters',
    target: 'nav',
    tab: 'quarters',
    title: 'Crew quarters',
    text: 'The sleeping crew member and their organ systems in one scene, with the sleep debt that accumulates overnight and what a night of recovery would do to the score.',
  },
  {
    id: 'data',
    target: 'nav',
    tab: 'data',
    title: 'Show the working',
    text: 'Validation against published Curiosity data, a sensitivity analysis of every assumption, the source list and a model card with the honest limits.',
  },
  {
    id: 'done',
    title: 'That is the whole system',
    text: 'Everything runs locally, offline, with no ground link needed. Use Teach to run the short guided missions, or press "?" on any number you want explained.',
  },
];

export default function GuidedTour({ open, onClose, goToTab }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = TOUR_STEPS[index];

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const element = document.querySelector(`[data-tour="${step.target}"]`);
    if (!element) {
      setRect(null);
      return;
    }
    const box = element.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [step]);

  useEffect(() => {
    if (!open) return;
    if (step?.tab && goToTab) goToTab(step.tab);
  }, [open, step, goToTab]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      if (step?.target) {
        const element = document.querySelector(`[data-tour="${step.target}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      measure();
    }, 220);
    return () => window.clearTimeout(id);
  }, [open, index, step, measure]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    function onKey(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  if (!open || !step) return null;

  const last = index === TOUR_STEPS.length - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {rect ? (
        <div
          className="absolute rounded-lg border-2 border-[#ffd54a] transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(2,5,10,0.72), 0 0 24px rgba(255,213,74,0.35)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#02050a]/80" />
      )}

      <div className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(760px,calc(100vw-24px))] -translate-x-1/2 rounded-xl border border-[#ffd54a]/70 bg-[#03070c]/97 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#ffd54a]">
              {t('tour')} · {t('tour_step', { n: index + 1, total: TOUR_STEPS.length })}
            </p>
            <h3 className="mt-1 text-sm font-bold text-white">{step.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} className="text-slate-400 transition hover:text-white">
            <X size={16} />
          </button>
        </div>

        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{step.text}</p>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#1d2b3d]">
            <div
              className="h-full rounded-full bg-[#ffd54a] transition-all"
              style={{ width: `${((index + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-1 rounded-lg border border-[#1d2836] bg-[#0a0f16] px-2 py-1 font-mono text-[9px] text-slate-300 transition hover:text-white disabled:opacity-40"
          >
            <ChevronLeft size={11} /> {t('back')}
          </button>
          <button
            type="button"
            onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
            className="flex items-center gap-1 rounded-lg border border-[#ffd54a]/60 bg-[#ffd54a]/15 px-2.5 py-1 font-mono text-[9px] font-bold text-[#ffe58a] transition hover:bg-[#ffd54a]/25"
          >
            {last ? t('done') : t('next')} {!last && <ChevronRight size={11} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 font-mono text-[9px] text-[#8fa0b4] transition hover:text-white"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
