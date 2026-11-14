import { useEffect, useState } from 'react';
import {
  BedDouble,
  Bell,
  BellOff,
  Compass,
  Database,
  Eye,
  Globe,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Orbit,
  Radio,
  User,
  WifiOff,
} from 'lucide-react';
import { formatUtcTime } from '../utils/format.js';
import { useI18n } from '../lib/i18n.jsx';

const TABS = [
  { id: 'hud', key: 'nav_hud', icon: LayoutDashboard },
  { id: 'quarters', key: 'nav_quarters', icon: BedDouble },
  { id: 'organs', key: 'nav_organs', icon: User },
  { id: 'optical', key: 'nav_optical', icon: Eye },
  { id: 'mars', key: 'nav_mars', icon: Globe },
  { id: 'data', key: 'nav_data', icon: Database },
  { id: 'teach', key: 'nav_teach', icon: GraduationCap },
];

export default function Header({ connected, lastUpdated, muted, onToggleMute, activeTab, onSelectTab, onOpenTour }) {
  const { t, lang, setLang, languages } = useI18n();
  const [utcNow, setUtcNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setUtcNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[#1d2836] bg-[#070b14]/90 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-7">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#17a9f0]/40 bg-[#17a9f0]/10 text-[#17a9f0] shadow-[0_0_20px_rgba(23,169,240,0.2)]">
            <Orbit size={20} />
            <span className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_#17a9f0]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[8px] font-bold tracking-[0.2em] text-[#17a9f0]">{t('app_kicker')}</span>
              <span className="rounded bg-white/10 px-1 font-mono text-[7px] text-slate-300">RCPT v1.8</span>
            </div>
            <h1 className="text-sm font-bold tracking-wider text-slate-100">
              RCPT <span className="hidden font-normal text-slate-400 lg:inline">// {t('app_title')}</span>
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav
          data-tour="nav"
          className="order-3 flex w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-[#1d2836] bg-[#060d17] p-1 font-mono text-[9px] lg:order-none lg:w-auto"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={selected ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold transition ${
                  selected
                    ? 'border border-[#17a9f0]/50 bg-[#17a9f0] text-[#02050a] shadow-[0_0_12px_rgba(23,169,240,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={11} />
                <span className="whitespace-nowrap">{t(tab.key)}</span>
              </button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTour}
            title={t('tour')}
            className="flex items-center gap-1 rounded-lg border border-[#ffd54a]/40 bg-[#ffd54a]/10 px-2 py-1 font-mono text-[8px] font-bold text-[#ffe58a] transition hover:bg-[#ffd54a]/20"
          >
            <Compass size={11} />
            <span className="hidden xl:inline">{t('tour')}</span>
          </button>

          <label className="flex items-center gap-1 rounded-lg border border-[#1d2836] bg-[#0a0f16] px-1.5 py-1 text-[#8fa0b4]">
            <Languages size={11} />
            <span className="sr-only">{t('language')}</span>
            <select
              value={lang}
              onChange={(event) => setLang(event.target.value)}
              className="cursor-pointer bg-transparent font-mono text-[9px] font-semibold text-slate-200 outline-none"
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code} className="bg-[#0a0f16]">
                  {language.name}
                </option>
              ))}
            </select>
          </label>

          <div className="hidden items-center gap-1.5 font-mono md:flex">
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#35d08a]/30 bg-[#35d08a]/10 px-2 py-0.5 text-[8px] font-semibold text-[#35d08a]">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#35d08a]" />
                {t('link_nominal')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ff5d4d]/40 bg-[#ff5d4d]/10 px-2 py-0.5 text-[8px] font-semibold text-[#ff5d4d]">
                <WifiOff size={9} />
                {t('link_offline')}
              </span>
            )}
          </div>

          <div className="hidden text-right sm:block">
            <p className="flex items-center justify-end gap-1 font-mono text-[7px] tracking-wider text-[#8fa0b4]">
              <Radio size={8} className="text-[#17a9f0]" /> UTC
            </p>
            <time className="font-mono text-[11px] font-semibold tracking-wider text-slate-100 tabular-nums">
              {formatUtcTime(utcNow)}
            </time>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Unmute emergency audio' : 'Mute emergency audio'}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1d2836] bg-[#0a0f16] text-slate-300 transition hover:border-[#17a9f0]/50 hover:text-white"
          >
            {muted ? <BellOff size={12} className="text-[#ffb224]" /> : <Bell size={12} />}
          </button>
        </div>
      </div>
    </header>
  );
}
