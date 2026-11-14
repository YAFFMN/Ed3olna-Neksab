import { useState } from 'react';
import { CheckCircle2, Compass, GraduationCap, Play, RotateCcw } from 'lucide-react';
import { SCENARIOS } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';

function buildMissions({ twin, goToTab, openExplain, openData }) {
  return [
    {
      id: 'storm',
      title: 'Storm in three clicks',
      minutes: 3,
      goal: 'See how compounding stressors push the score past the emergency line.',
      steps: [
        {
          text: 'Start from the calm-orbit preset and note the risk index.',
          run: () => {
            twin.applyScenario('nominal');
            goToTab('hud');
          },
        },
        {
          text: 'Inject the acute solar particle event. Dose jumps to 18.5 mSv/hr and the tier goes to emergency on the dose rule alone.',
          run: () => twin.applyScenario('spe'),
        },
        {
          text: 'Now raise sleep debt to 9 h without touching the dose. Only the non-linear interaction bar moves — that is the whole thesis of RCPT.',
          run: () => twin.setInput('s', 9),
        },
        {
          text: 'Open the explanation for the interaction term to see both product terms with your numbers.',
          run: () => openExplain('inter'),
        },
      ],
    },
    {
      id: 'read',
      title: 'Read the score like a flight surgeon',
      minutes: 3,
      goal: 'Decompose R into its four parts and check what the interval really means.',
      steps: [
        {
          text: 'Load the sleep-deprived crew preset — low HRV, five and a half hours of debt.',
          run: () => {
            twin.applyScenario('sleep');
            goToTab('hud');
          },
        },
        {
          text: 'Explain the risk index itself: the table shows each weighted part and the total.',
          run: () => openExplain('R'),
        },
        {
          text: 'Open the interval explanation. It is a fixed display band, not a statistical confidence interval — an important honesty point.',
          run: () => openExplain('ci'),
        },
      ],
    },
    {
      id: 'sleep',
      title: 'Sleep, recovery and the organ map',
      minutes: 4,
      goal: 'Connect sleep debt to organ strain and to what a night of rest would buy back.',
      steps: [
        {
          text: 'Go to Crew Quarters and look at the sleeping crew member. Hotspot numbers are organ indices derived from the same model terms.',
          run: () => goToTab('quarters'),
        },
        {
          text: 'Set sleep debt to 6 h and watch the brain and gut indices rise before anything else changes.',
          run: () => twin.setInput('s', 6),
        },
        {
          text: 'Read the recovery forecast: it repays the debt and recomputes R. That difference is what rest is worth in this model.',
          run: () => twin.setInput('s', 6),
        },
      ],
    },
    {
      id: 'validate',
      title: 'Try to break the model',
      minutes: 4,
      goal: 'Check the radiation model against published data and stress-test every assumption.',
      steps: [
        {
          text: 'Open Data & Validation → Validation. The Gale crater calibration point agrees by construction; the seasonal pressure check is the real test.',
          run: () => openData('valid'),
        },
        {
          text: 'Switch to Sensitivity and move a parameter by ±25 %. The tornado chart shows which assumption moves the score most.',
          run: () => openData('sens'),
        },
        {
          text: 'Finish on Sources: every published number has a citation, and our own assumptions are listed separately.',
          run: () => openData('src'),
        },
      ],
    },
  ];
}

export default function TeachPanel(props) {
  const { t } = useI18n();
  const missions = buildMissions(props);
  const [activeId, setActiveId] = useState(null);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(() => new Set());

  const active = missions.find((m) => m.id === activeId);

  function begin(mission) {
    setActiveId(mission.id);
    setStep(0);
    mission.steps[0].run?.();
  }

  function advance() {
    if (!active) return;
    if (step + 1 >= active.steps.length) {
      setCompleted((prev) => new Set(prev).add(active.id));
      setActiveId(null);
      setStep(0);
      return;
    }
    const next = step + 1;
    setStep(next);
    active.steps[next].run?.();
  }

  return (
    <div className="space-y-4" data-tour="teach">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#a05bd8]/40 bg-[#a05bd8]/10 text-[#c792ff]">
            <GraduationCap size={15} />
          </div>
          <div>
            <span className="eyebrow-text">SIMULATED GUIDED TUTORIALS</span>
            <h2 className="text-sm font-bold text-slate-100">{t('teach_title')}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={props.openTour}
          className="flex items-center gap-1.5 rounded-lg border border-[#ffd54a]/50 bg-[#ffd54a]/10 px-3 py-1.5 font-mono text-[9px] font-bold text-[#ffe58a] transition hover:bg-[#ffd54a]/20"
        >
          <Compass size={11} /> {t('tour_start')}
        </button>
      </div>

      <p className="text-xs leading-relaxed text-[#8fa0b4]">{t('teach_note')}</p>

      {active && (
        <div className="rcpt-panel border-[#a05bd8]/40 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-mono text-[8px] uppercase tracking-wider text-[#c792ff]">
                {t('mission')} · {active.title}
              </span>
              <p className="mt-1 text-sm font-bold text-white">{active.steps[step].text}</p>
            </div>
            <button type="button" onClick={() => setActiveId(null)} className="text-[#8fa0b4] hover:text-white">
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-1">
            {active.steps.map((_, index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-[#c792ff]' : 'bg-[#1d2836]'}`}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[9px] text-[#8fa0b4]">
              {step + 1} / {active.steps.length}
            </span>
            <button
              type="button"
              onClick={advance}
              className="rounded-lg border border-[#a05bd8]/50 bg-[#a05bd8]/20 px-3 py-1.5 font-mono text-[9px] font-bold text-[#e0c2ff] transition hover:bg-[#a05bd8]/30"
            >
              {step + 1 >= active.steps.length ? t('done') : t('next')}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {missions.map((mission) => {
          const done = completed.has(mission.id);
          return (
            <div key={mission.id} className="rcpt-panel flex flex-col justify-between p-3.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-[#8fa0b4]">
                    {t('mission')} {missions.indexOf(mission) + 1} · {mission.minutes} {t('minutes')}
                  </span>
                  {done && (
                    <span className="flex items-center gap-1 font-mono text-[8px] font-bold text-[#7be8a0]">
                      <CheckCircle2 size={10} /> DONE
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-sm font-bold text-slate-100">{mission.title}</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-[#8fa0b4]">{mission.goal}</p>
                <p className="mt-1.5 font-mono text-[8px] text-[#5f7186]">{mission.steps.length} steps · drives the live dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => begin(mission)}
                className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-[#17a9f0]/45 bg-[#17a9f0]/15 px-2 py-1.5 font-mono text-[9px] font-bold text-[#5cc8ff] transition hover:bg-[#17a9f0]/25"
              >
                <Play size={10} /> {done ? 'REPLAY' : t('begin')}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-[#1d2836] bg-[#060d17] p-3">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#8fa0b4]">Teacher notes</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[10px] leading-relaxed text-slate-300">
          <li>Missions drive the real dashboard, so learners see the same numbers the app uses — nothing is faked for the tutorial.</li>
          <li>Start with "Storm in three clicks": it is the fastest way to show why compounding matters.</li>
          <li>Finish with "Try to break the model" so the honesty of the validation section is part of the lesson, not a footnote.</li>
          <li>All inputs are simulated. No hardware is connected in this build. The {SCENARIOS.length} presets are design choices, not measured states.</li>
        </ul>
      </div>
    </div>
  );
}
