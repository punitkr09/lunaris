import React, { useEffect, useState } from 'react';
import {
  Compass,
  Database,
  Eye,
  GitCompare,
  Info,
  Link2,
  MapPin,
  Menu,
  ShieldAlert,
  Sliders,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import {
  DataProviderMetadata,
  MissionScenarioData,
  UserExperienceMode,
} from '../types/navigation';
import { useSmoothScroll } from '../motion/SmoothScrollProvider';

export type ActiveWorkspaceTab =
  | 'CONSOLE'
  | 'TOUR'
  | 'CONTROLS'
  | 'TIMELINE'
  | 'COMPARISON'
  | 'ARCHITECTURE'
  | 'VALIDATION';

interface HeaderTelemetryBarProps {
  primaryScenario: MissionScenarioData;
  metadata: DataProviderMetadata;
  activeTab: ActiveWorkspaceTab;
  uxMode: UserExperienceMode;
  expandAllData: boolean;
  onSelectTab: (tab: ActiveWorkspaceTab) => void;
  onToggleUxMode: () => void;
  onChangeUxMode?: (mode: UserExperienceMode) => void;
  onToggleExpandAllData: () => void;
  /** Copies a reproducible permalink of the current trade study; resolves to the copied URL. */
  onCopyShareLink?: () => Promise<string>;
}

export const SINGLE_SCROLL_CHAPTERS: {
  id: ActiveWorkspaceTab;
  targetSelector: string;
  label: string;
  code: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'CONSOLE',
    targetSelector: '#stage-globe',
    label: '3D Moon',
    code: '01',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'TOUR',
    targetSelector: '#stage-expedition',
    label: 'Polar Regions',
    code: '02',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: 'CONTROLS',
    targetSelector: '#stage-controls',
    label: 'Where & When',
    code: '03',
    icon: <MapPin className="w-3.5 h-3.5" />,
  },
  {
    id: 'TIMELINE',
    targetSelector: '#stage-timeline',
    label: 'Forecast',
    code: '04',
    icon: <Timer className="w-3.5 h-3.5" />,
  },
  {
    id: 'COMPARISON',
    targetSelector: '#stage-comparison',
    label: 'Compare Sites',
    code: '05',
    icon: <GitCompare className="w-3.5 h-3.5" />,
  },
  {
    id: 'ARCHITECTURE',
    targetSelector: '#stage-architecture',
    label: 'NASA Sources',
    code: '06',
    icon: <Database className="w-3.5 h-3.5" />,
  },
  {
    id: 'VALIDATION',
    targetSelector: '#stage-validation',
    label: 'Accuracy',
    code: '07',
    icon: <Sliders className="w-3.5 h-3.5" />,
  },
];

export const HeaderTelemetryBar: React.FC<HeaderTelemetryBarProps> = ({
  primaryScenario,
  metadata,
  activeTab,
  uxMode,
  expandAllData,
  onSelectTab,
  onToggleUxMode,
  onChangeUxMode,
  onToggleExpandAllData,
  onCopyShareLink,
}) => {
  const [showProvenanceModal, setShowProvenanceModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareState, setShareState] = useState<'IDLE' | 'COPIED' | 'FAILED'>('IDLE');
  const { scrollTo } = useSmoothScroll();

  const durationDays = primaryScenario.timeConfig.missionDurationDays;

  const handleJumpToChapter = (
    chapter: (typeof SINGLE_SCROLL_CHAPTERS)[number]
  ) => {
    setMobileMenuOpen(false);
    onSelectTab(chapter.id);
    scrollTo(chapter.targetSelector);
  };

  const chapterLabel = (chapter: (typeof SINGLE_SCROLL_CHAPTERS)[number]) =>
    chapter.id === 'TIMELINE' ? `${durationDays}-Day Forecast` : chapter.label;

  const handleShare = async () => {
    if (!onCopyShareLink) return;
    try {
      await onCopyShareLink();
      setShareState('COPIED');
    } catch {
      setShareState('FAILED');
    }
    window.setTimeout(() => setShareState('IDLE'), 2600);
  };

  // Escape closes the provenance dialog and the mobile menu.
  useEffect(() => {
    if (!showProvenanceModal && !mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProvenanceModal(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showProvenanceModal, mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.11] bg-[#04070E]/92 backdrop-blur-xl">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: LUNARIS Brand Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                onSelectTab('CONSOLE');
                scrollTo(0);
              }}
              className="flex items-center gap-3 text-left group"
            >
              {/* Lunar South Pole Orbital Insignia */}
              <div className="relative w-10 h-10 rounded-full bg-[#09152B] border border-sky-400/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(56,189,248,0.28)]">
                <span className="absolute inset-0 rounded-full border border-sky-400/75 rotate-[-24deg] scale-x-110 scale-y-75 pointer-events-none" />
                <span className="font-display font-bold text-[10px] tracking-widest text-sky-200">
                  90°S
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base sm:text-lg font-bold tracking-[0.18em] text-white">
                    LUNARIS
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/45 font-mono text-[10px] font-bold text-sky-200 uppercase tracking-wider">
                    CAN WE LAND HERE?
                  </span>
                </div>
                <p className="text-[11px] text-lunar-300 truncate hidden 2xl:block">
                  The Next Landing Starts With You · Lunar South Pole Evaluation
                </p>
              </div>
            </button>
          </div>

          {/* Center: Continuous One-Scroll Topic Navigation */}
          <nav
            aria-label="Continuous Scroll Topics"
            className="hidden xl:flex items-center gap-0.5 p-1 rounded-full bg-[#090E18] border border-white/[0.11]"
          >
            {SINGLE_SCROLL_CHAPTERS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleJumpToChapter(item)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-sky-500 text-space-950 font-semibold shadow-sm'
                      : 'text-lunar-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] ${
                      isActive ? 'text-space-950/80' : 'text-lunar-400'
                    }`}
                  >
                    {item.code}
                  </span>
                  <span>{chapterLabel(item)}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: 3-Level Experience Switcher, Q&A vs Open All & Provenance */}
          <div className="flex items-center gap-2">
            {/* Three Experience Levels: Guided / Explorer / Planner */}
            <div
              role="group"
              aria-label="User Experience Level"
              className="hidden md:flex items-center p-0.5 rounded-full bg-[#090E18] border border-white/15 text-[11px] font-mono"
            >
              {(
                [
                  { id: 'EDUCATOR', label: 'Guided', title: 'Beginner / Educator: Simple answers & guided explanations' },
                  { id: 'EXPLORER', label: 'Explorer', title: 'Explorer: Interactive site, date & timeline comparison' },
                  { id: 'MISSION_PLANNER', label: 'Planner', title: 'Mission Planner: Full solar/RF parameters & validation' },
                ] as { id: UserExperienceMode; label: string; title: string }[]
              ).map((modeOption) => {
                const isSelected = uxMode === modeOption.id;
                return (
                  <button
                    key={modeOption.id}
                    type="button"
                    onClick={() =>
                      onChangeUxMode ? onChangeUxMode(modeOption.id) : onToggleUxMode()
                    }
                    title={modeOption.title}
                    className={`px-2.5 py-1 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-sky-500 text-space-950 font-semibold'
                        : 'text-lunar-300 hover:text-white'
                    }`}
                  >
                    {modeOption.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onToggleExpandAllData}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                expandAllData
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                  : 'bg-[#090E18] border-white/15 text-lunar-200 hover:text-white hover:border-sky-400/40'
              }`}
              title="Toggle between Question-First Curiosity Mode and All Telemetry Open"
            >
              <Eye className="w-3.5 h-3.5 text-sky-300" />
              <span className="hidden sm:inline">
                {expandAllData ? 'All Data Open' : 'Q&A Mode'}
              </span>
            </button>

            {onCopyShareLink && (
              <button
                type="button"
                onClick={handleShare}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  shareState === 'COPIED'
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : shareState === 'FAILED'
                      ? 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                      : 'bg-[#090E18] border-white/15 text-lunar-200 hover:border-sky-400/45 hover:text-white'
                }`}
                title="Copy a shareable permalink that reproduces this exact Alpha/Bravo trade study"
              >
                <Link2 className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden sm:inline">
                  {shareState === 'COPIED'
                    ? 'Link Copied'
                    : shareState === 'FAILED'
                      ? 'Copy Failed'
                      : 'Share'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowProvenanceModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#090E18] border border-white/15 text-xs font-medium text-lunar-200 hover:border-sky-400/45 hover:text-white transition-colors"
              title="About LUNARIS & NASA Data Provenance"
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Provenance</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="xl:hidden p-2 rounded-xl bg-[#090E18] border border-white/15 text-lunar-200 hover:text-white"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tablet/Mobile Horizontal Chapter Strip */}
        <div className="xl:hidden border-t border-white/[0.08] px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {SINGLE_SCROLL_CHAPTERS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleJumpToChapter(item)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-sky-500 text-space-950 font-semibold'
                    : 'bg-[#090E18] text-lunar-300 border border-white/[0.08]'
                }`}
              >
                <span className="font-mono text-[10px] opacity-75">{item.code}</span>
                <span>{chapterLabel(item)}</span>
              </button>
            );
          })}
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-white/[0.1] bg-[#060911] px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-lunar-400">
                Experience Level
              </span>
              <div className="flex items-center gap-1 font-mono text-xs">
                {(
                  [
                    { id: 'EDUCATOR', label: 'Guided' },
                    { id: 'EXPLORER', label: 'Explorer' },
                    { id: 'MISSION_PLANNER', label: 'Planner' },
                  ] as { id: UserExperienceMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      onChangeUxMode ? onChangeUxMode(m.id) : onToggleUxMode()
                    }
                    className={`px-2.5 py-1 rounded-lg border ${
                      uxMode === m.id
                        ? 'bg-sky-500 text-space-950 border-sky-400 font-semibold'
                        : 'bg-[#090E18] border-white/10 text-lunar-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-lunar-400">
              Explore Chapters (01 – 07)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SINGLE_SCROLL_CHAPTERS.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => handleJumpToChapter(chapter)}
                  className="px-3 py-2 rounded-xl bg-[#090E18] border border-white/10 text-left text-xs font-mono text-lunar-200 hover:border-sky-400 flex items-center justify-between"
                >
                  <span>
                    <strong className="text-sky-300 mr-1.5">{chapter.code}</strong>
                    {chapterLabel(chapter)}
                  </span>
                  <span>→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* About & Scientific Data Provenance Modal */}
      {showProvenanceModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provenance-modal-title"
          data-lenis-prevent
          onClick={() => setShowProvenanceModal(false)}
        >
          <div
            className="nasa-card max-w-2xl w-full p-6 rounded-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E4002B]/15 border border-[#E4002B]/40 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-[#ff4d6d]" />
                </div>
                <div>
                  <h2
                    id="provenance-modal-title"
                    className="font-display font-semibold text-base text-white"
                  >
                    Scientific Integrity &amp; NASA Data Provenance
                  </h2>
                  <p className="text-xs font-mono text-amber-300 mt-0.5">
                    ENGINE MODE: {metadata.mode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProvenanceModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-lunar-300 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-lunar-300 leading-relaxed">
              <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-100/95">
                {metadata.disclaimer}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-black/80 border border-white/[0.08] rounded-xl">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-lunar-400">
                    Active Provider
                  </div>
                  <div className="text-white font-medium mt-1">
                    {metadata.providerName}
                  </div>
                </div>
                <div className="p-3.5 bg-black/80 border border-white/[0.08] rounded-xl">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-lunar-400">
                    Coordinate Reference System
                  </div>
                  <div className="text-white font-mono mt-1">{metadata.referenceFrame}</div>
                </div>
                <div className="p-3.5 bg-black/80 border border-white/[0.08] rounded-xl">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-lunar-400">
                    Local Horizon Mask Source
                  </div>
                  <div className="text-amber-300 font-mono mt-1">{metadata.terrainSourceLabel}</div>
                </div>
                <div className="p-3.5 bg-black/80 border border-white/[0.08] rounded-xl">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-lunar-400">
                    Ephemeris &amp; Link Math
                  </div>
                  <div className="text-emerald-300 font-mono mt-1">
                    {metadata.ephemerisSourceLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
