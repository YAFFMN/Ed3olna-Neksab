import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Crosshair, Radio } from 'lucide-react';
import Header from './components/Header.jsx';
import AlertBanner from './components/AlertBanner.jsx';
import AstronautProfile from './components/AstronautProfile.jsx';
import TriNodeSystem from './components/TriNodeSystem.jsx';
import RiskIndexCard from './components/RiskIndexCard.jsx';
import OrganAvatar from './components/OrganAvatar.jsx';
import ImageAssessment from './components/ImageAssessment.jsx';
import MarsAtlas from './components/MarsAtlas.jsx';
import TelemetryCards from './components/TelemetryCards.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import NoaaSyncButton from './components/NoaaSyncButton.jsx';
import Toast from './components/Toast.jsx';
import MetricStrip from './components/MetricStrip.jsx';
import SimulatorPanel from './components/SimulatorPanel.jsx';
import RiskDecomposition from './components/RiskDecomposition.jsx';
import MissionTimeline from './components/MissionTimeline.jsx';
import RiskSurface from './components/RiskSurface.jsx';
import ProtocolsCard from './components/ProtocolsCard.jsx';
import CrewQuarters from './components/CrewQuarters.jsx';
import DataValidation from './components/DataValidation.jsx';
import TeachPanel from './components/TeachPanel.jsx';
import ExplainPopup from './components/ExplainPopup.jsx';
import GuidedTour from './components/GuidedTour.jsx';
import { useDashboard } from './hooks/useDashboard.js';
import { useTwin } from './hooks/useTwin.js';
import { createReading, resolveAlert } from './services/api.js';
import { buildExplain } from './lib/explain.js';
import { TIER_META } from './lib/risk.js';
import { useI18n } from './lib/i18n.jsx';
import { UiContext } from './lib/ui.jsx';

function playBeep(muted) {
  if (muted) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(587.33, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Audio optional
  }
}

export default function App() {
  const { t } = useI18n();
  const { dashboard, loading, connected, lastUpdated, error, refresh } = useDashboard(1);
  const twin = useTwin();

  const [activeTab, setActiveTab] = useState('hud');
  const [explainTopic, setExplainTopic] = useState(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [dataTab, setDataTab] = useState('valid');
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState(null);
  const [resolvingIds, setResolvingIds] = useState(() => new Set());
  const seenAlertsRef = useRef(new Set());

  const notify = useCallback((toastData) => setToast(toastData), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const astronaut = dashboard?.astronaut || null;
  const latestReading = dashboard?.latestReading || null;
  const activeAlerts = useMemo(() => dashboard?.activeAlerts || [], [dashboard?.activeAlerts]);
  const chatHistory = useMemo(() => dashboard?.chatHistory || [], [dashboard?.chatHistory]);

  const model = twin.model;
  const tier = TIER_META[model.tier];

  const openExplain = useCallback(
    (topic) => {
      const content = buildExplain(topic, model);
      if (content) setExplainTopic(content);
    },
    [model]
  );

  const openData = useCallback((tab) => {
    if (tab) setDataTab(tab);
    setActiveTab('data');
  }, []);

  const ui = useMemo(
    () => ({ openExplain, openTour: () => setTourOpen(true), goToTab: setActiveTab, openPanel: openData }),
    [openExplain, openData]
  );

  // Critical alert audio
  useEffect(() => {
    const currentIds = new Set(activeAlerts.map((a) => String(a.id)));
    for (const alert of activeAlerts) {
      const isCritical = String(alert.severity || '').toUpperCase() === 'CRITICAL';
      if (isCritical && !seenAlertsRef.current.has(String(alert.id))) playBeep(muted);
    }
    seenAlertsRef.current = currentIds;
  }, [activeAlerts, muted]);

  async function handleResolveAlert(alertId) {
    setResolvingIds((prev) => new Set(prev).add(alertId));
    try {
      await resolveAlert(alertId);
      notify({
        type: 'success',
        title: 'PROTOCOL RESOLVED',
        message: `Alert ID ${alertId} resolved. Mission telemetry nominal.`,
      });
      await refresh();
    } catch (err) {
      notify({
        type: 'error',
        title: 'RESOLUTION ERROR',
        message: err?.message || 'Unable to resolve alert in database.',
      });
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }

  const pushToHabitat = useCallback(async () => {
    await twin.pushReading(createReading, 1);
    await refresh();
  }, [twin, refresh]);

  return (
    <UiContext.Provider value={ui}>
      <div className="relative min-h-screen text-[#f5f8fc]">
        <div className="bg-deepspace" />
        <div className="bg-stars" />

        <Header
          connected={connected}
          lastUpdated={lastUpdated}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenTour={() => setTourOpen(true)}
        />

        <main className="mx-auto max-w-[1800px] px-3 pb-8 pt-3 sm:px-5 lg:px-7">
          {/* Mission status strip */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#1d2836] pb-2">
            <div className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-[#8fa0b4]">
              <Crosshair size={12} className="text-[#17a9f0]" />
              DEEP-SPACE BIOASTRONAUTICS // FLIGHT SURGEON HUD
              <span className={`rounded-full border px-1.5 py-0.5 text-[7px] font-bold ${tier.border} ${tier.bg} ${tier.text}`}>
                {t(`tier_${model.tier}`).toUpperCase()} · R {model.R.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[8px] text-[#8fa0b4]">
              <span>ORION CREW 01</span>
              <span>/</span>
              <span>NOVA AI ENGINE: GEMMA-4-31B-IT</span>
            </div>
          </div>

          {activeAlerts.length > 0 && (
            <div className="mb-4">
              <AlertBanner alerts={activeAlerts} onResolve={handleResolveAlert} resolvingIds={resolvingIds} />
            </div>
          )}

          {!connected && !loading && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#ff5d4d]/30 bg-[#ff5d4d]/10 p-3.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#ff8a7f]" />
              <div>
                <p className="font-mono text-[9px] font-bold tracking-wider text-[#ff8a7f]">TELEMETRY LINK OFFLINE</p>
                <p className="mt-0.5 text-xs text-slate-300">
                  {error || 'Make sure the backend is running at http://localhost:5000'}
                </p>
              </div>
            </div>
          )}

          {/* TAB: Mission HUD */}
          {activeTab === 'hud' && (
            <div className="space-y-4">
              <MetricStrip model={model} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <aside className="space-y-4 lg:col-span-3">
                  <AstronautProfile astronaut={astronaut} latestReading={latestReading} />
                  <RiskIndexCard model={model} />
                  <SimulatorPanel twin={twin} onPush={pushToHabitat} notify={notify} />
                  <div className="rcpt-panel p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="eyebrow-text">SPACE WEATHER FEED</span>
                      <Radio size={13} className="text-[#17a9f0]" />
                    </div>
                    <NoaaSyncButton onRefresh={refresh} notify={notify} />
                  </div>
                </aside>

                <section className="space-y-4 lg:col-span-5">
                  <RiskDecomposition model={model} highlightInteraction={model.it > 1} />
                  <MissionTimeline clock={twin.clock} running={twin.running} />
                  <RiskSurface model={model} />
                </section>

                <aside className="space-y-4 lg:col-span-4">
                  <ChatPanel chatHistory={chatHistory} astronautId={1} onRefresh={refresh} notify={notify} />
                  <ProtocolsCard model={model} />
                </aside>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <TriNodeSystem latestReading={latestReading} riskScore={model.R} />
                </div>
                <div className="lg:col-span-5">
                  <TelemetryCards reading={latestReading} />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Crew Quarters */}
          {activeTab === 'quarters' && (
            <div className="space-y-4">
              <CrewQuarters model={model} astronaut={astronaut} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <RiskIndexCard model={model} />
                </div>
                <div className="lg:col-span-4">
                  <ProtocolsCard model={model} />
                </div>
                <div className="lg:col-span-4">
                  <SimulatorPanel twin={twin} onPush={pushToHabitat} notify={notify} />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Organ Twin */}
          {activeTab === 'organs' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-4">
                <RiskIndexCard model={model} />
                <AstronautProfile astronaut={astronaut} latestReading={latestReading} />
              </div>
              <div className="space-y-4 lg:col-span-8">
                <OrganAvatar model={model} />
                <RiskDecomposition model={model} />
              </div>
            </div>
          )}

          {/* TAB: Optical assessment */}
          {activeTab === 'optical' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <ImageAssessment />
              </div>
              <div className="space-y-4 lg:col-span-5">
                <ChatPanel chatHistory={chatHistory} astronautId={1} onRefresh={refresh} notify={notify} />
                <ProtocolsCard model={model} />
              </div>
            </div>
          )}

          {/* TAB: Mars atlas */}
          {activeTab === 'mars' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <MarsAtlas />
              </div>
              <div className="space-y-4 lg:col-span-4">
                <TelemetryCards reading={latestReading} />
                <div className="rcpt-panel p-3.5">
                  <span className="eyebrow-text">SWPC GOES LINK</span>
                  <div className="mt-2">
                    <NoaaSyncButton onRefresh={refresh} notify={notify} />
                  </div>
                </div>
                <ProtocolsCard model={model} />
              </div>
            </div>
          )}

          {/* TAB: Data & Validation */}
          {activeTab === 'data' && (
            <DataValidation
              model={model}
              tab={dataTab}
              onTabChange={setDataTab}
              onUseDose={(dose) => twin.setInput('d', Math.min(50, dose))}
              notify={notify}
            />
          )}

          {/* TAB: Teach */}
          {activeTab === 'teach' && (
            <TeachPanel
              twin={twin}
              goToTab={setActiveTab}
              openExplain={openExplain}
              openData={openData}
              openTour={() => setTourOpen(true)}
            />
          )}

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#1d2836] pt-3 font-mono text-[8px] tracking-wider text-[#8fa0b4]">
            <span className="flex items-center gap-1.5">
              <Radio size={10} className="text-[#17a9f0]" />
              RCPT DESKTOP SYSTEM // BUILD 1.8.0 // NASA SPACE APPS CAIRO
            </span>
            <span className="max-w-[720px] leading-relaxed">
              Weighted-interaction risk model with a fixed −4.2/+4.8 display band · All crew inputs are simulated, not mission
              measurements · Research prototype, not a medical device · Independent project, not affiliated with or endorsed by NASA.
            </span>
          </footer>
        </main>

        <ExplainPopup content={explainTopic} onClose={() => setExplainTopic(null)} />
        <GuidedTour open={tourOpen} onClose={() => setTourOpen(false)} goToTab={setActiveTab} />
        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </UiContext.Provider>
  );
}
