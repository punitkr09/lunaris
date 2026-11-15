import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  GitCompare,
  ShieldCheck,
} from 'lucide-react';
import {
  CommHardwareConfig,
  LunarCoordinates,
  MissionScenarioData,
  SolarHardwareConfig,
  UserExperienceMode,
} from './types/navigation';
import {
  DEFAULT_COMM_HARDWARE,
  DEFAULT_SOLAR_HARDWARE,
  areLunarCoordinatesEquivalent,
} from './science/lunarMath';
import { ILunarNavigationProvider } from './services/LunarDataProvider';
import { SimulatedLunarProvider } from './services/SimulatedLunarProvider';
import { NasaHorizonsSpiceAdapterStub } from './services/NasaHorizonsSpiceAdapterStub';
import {
  ActiveWorkspaceTab,
  HeaderTelemetryBar,
  SINGLE_SCROLL_CHAPTERS,
} from './components/HeaderTelemetryBar';
import { LandingSiteSelector } from './components/LandingSiteSelector';
import { EpochTimeControls } from './components/EpochTimeControls';
import { LandingWindowScanner } from './components/LandingWindowScanner';
import {
  CameraChoreographyRequest,
  CameraPreset,
  Moon3DViewport,
  MoonViewMode,
} from './components/Moon3DViewport';
import { MissionTimelinePanel } from './components/MissionTimelinePanel';
import { LunarExpeditionRibbon } from './components/LunarExpeditionRibbon';
import {
  SavedScenarioSnapshot,
  ScenarioComparisonView,
} from './components/ScenarioComparisonView';
import { DataArchitectureView } from './components/DataArchitectureView';
import { ScientificValidationView } from './components/ScientificValidationView';
import { NasaSiteQuestionRail } from './components/NasaSiteQuestionRail';
import { NasaQuestionDrawerCard } from './components/NasaQuestionDrawerCard';
import { LocalTemporalSkyView } from './components/LocalTemporalSkyView';
import { MissionFeasibilitySummary } from './components/MissionFeasibilitySummary';
import { MissionExtensionsLab } from './components/MissionExtensionsLab';
import { NasaMissionGallerySection } from './components/NasaMissionGallerySection';
import {
  ScientificValidationReport,
  runScientificValidationSuite,
} from './science/validationSuite';
import {
  ScrollReveal,
  SmoothScrollProvider,
  useSmoothScroll,
} from './motion/SmoothScrollProvider';
import { BigTextChapterTransition } from './motion/BigTextChapterTransition';
import { HeroBigTextStage } from './motion/HeroBigTextStage';
import {
  ScenarioPermalinkState,
  buildShareUrl,
  decodeScenarioPermalink,
  encodeScenarioPermalink,
} from './utils/scenarioPermalink';

const simulatedProvider = new SimulatedLunarProvider();
const nasaAdapterStub = new NasaHorizonsSpiceAdapterStub();

const SNAPSHOT_STORAGE_KEY = 'lunaris.savedSnapshots.v1';
const MAX_PERSISTED_SNAPSHOTS = 12;

const DEFAULT_PERMALINK_STATE: ScenarioPermalinkState = {
  alphaCoords: { latitudeDeg: -89.46, longitudeDeg: -137.8 },
  alphaEpochUtc: '2026-11-15T12:00:00Z',
  alphaDurationDays: 14,
  bravoCoords: { latitudeDeg: -85.98, longitudeDeg: 0.45 },
  bravoEpochUtc: '2026-11-15T12:00:00Z',
  bravoDurationDays: 14,
  bravoRelayEnabled: false,
  elapsedHours: 24,
  uxMode: 'EDUCATOR',
};

/** Reads the URL hash once at startup and merges any valid permalink fields over the defaults. */
function readInitialState(): ScenarioPermalinkState {
  if (typeof window === 'undefined') return DEFAULT_PERMALINK_STATE;
  const decoded = decodeScenarioPermalink(window.location.hash);
  const merged = { ...DEFAULT_PERMALINK_STATE, ...decoded };
  merged.elapsedHours = Math.min(merged.elapsedHours, merged.alphaDurationDays * 24);
  return merged;
}

function readPersistedSnapshots(): SavedScenarioSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is SavedScenarioSnapshot =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as SavedScenarioSnapshot).id === 'string' &&
          typeof (s as SavedScenarioSnapshot).savedAtUtc === 'string' &&
          typeof (s as SavedScenarioSnapshot).scenario === 'object' &&
          (s as SavedScenarioSnapshot).scenario !== null &&
          typeof (s as SavedScenarioSnapshot).scenario.coordinates?.latitudeDeg === 'number'
      )
      .slice(0, MAX_PERSISTED_SNAPSHOTS);
  } catch {
    return [];
  }
}

/** True when a keyboard event originates from a text-entry control the user is typing into. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

interface ContinuousScrollBodyProps {
  provider: ILunarNavigationProvider;
  primaryScenario: MissionScenarioData;
  comparisonScenario: MissionScenarioData;
  globeComparisonScenarios: MissionScenarioData[];
  candidateSites: ReturnType<ILunarNavigationProvider['getCandidateLandingSites']>;
  providerKey: 'SIMULATED' | 'NASA_STUB';
  metadata: ReturnType<ILunarNavigationProvider['getMetadata']>;
  activeTab: ActiveWorkspaceTab;
  uxMode: UserExperienceMode;
  expandAllData: boolean;
  alphaCoords: LunarCoordinates;
  alphaEpochUtc: string;
  isPlaying: boolean;
  playbackSpeed: number;
  solarHardware: SolarHardwareConfig;
  commHardware: CommHardwareConfig;
  comparisonCoordsList: LunarCoordinates[];
  savedSnapshots: SavedScenarioSnapshot[];
  externalCameraRequest: CameraChoreographyRequest | null;
  validationReport: ScientificValidationReport;
  onSelectTab: (tab: ActiveWorkspaceTab) => void;
  onToggleUxMode: () => void;
  onChangeUxMode: (mode: UserExperienceMode) => void;
  onToggleExpandAllData: () => void;
  onCopyShareLink: () => Promise<string>;
  onSelectAlphaCoords: (coords: LunarCoordinates) => void;
  onSelectBravoCoords: (coords: LunarCoordinates) => void;
  onChangeAlphaEpoch: (iso: string) => void;
  onChangeBravoEpoch: (iso: string) => void;
  onChangeAlphaDuration: (days: number) => void;
  onChangeBravoDuration: (days: number) => void;
  onChangeElapsedHours: (h: number) => void;
  onTogglePlay: () => void;
  onChangePlaybackSpeed: (spd: number) => void;
  onShiftLunarLocalHour: (h: number) => void;
  onChangeSolarHardware: (cfg: SolarHardwareConfig) => void;
  onChangeCommHardware: (cfg: CommHardwareConfig) => void;
  onToggleComparisonSite: (coords: LunarCoordinates) => void;
  onSelectSiteWithCamera: (
    coords: LunarCoordinates,
    preset: CameraPreset,
    viewMode?: MoonViewMode
  ) => void;
  onToggleBravoRelay: () => void;
  onSwapScenarios: () => void;
  onSaveSnapshot: (s: MissionScenarioData) => void;
  onDeleteSnapshot: (id: string) => void;
  onLoadSnapshotToBravo: (snap: SavedScenarioSnapshot) => void;
  onSelectProviderKey: (k: 'SIMULATED' | 'NASA_STUB') => void;
}

const ContinuousScrollBody: React.FC<ContinuousScrollBodyProps> = ({
  provider,
  primaryScenario,
  comparisonScenario,
  globeComparisonScenarios,
  candidateSites,
  providerKey,
  metadata,
  activeTab,
  uxMode,
  expandAllData,
  alphaCoords,
  alphaEpochUtc,
  isPlaying,
  playbackSpeed,
  solarHardware,
  commHardware,
  comparisonCoordsList,
  savedSnapshots,
  externalCameraRequest,
  validationReport,
  onSelectTab,
  onToggleUxMode,
  onChangeUxMode,
  onToggleExpandAllData,
  onCopyShareLink,
  onSelectAlphaCoords,
  onSelectBravoCoords,
  onChangeAlphaEpoch,
  onChangeBravoEpoch,
  onChangeAlphaDuration,
  onChangeBravoDuration,
  onChangeElapsedHours,
  onTogglePlay,
  onChangePlaybackSpeed,
  onShiftLunarLocalHour,
  onChangeSolarHardware,
  onChangeCommHardware,
  onToggleComparisonSite,
  onSelectSiteWithCamera,
  onToggleBravoRelay,
  onSwapScenarios,
  onSaveSnapshot,
  onDeleteSnapshot,
  onLoadSnapshotToBravo,
  onSelectProviderKey,
}) => {
  const { scrollTo, refreshScrollTriggers } = useSmoothScroll();
  const validationSummary = {
    passedCount: validationReport.passedCount,
    totalCount: validationReport.totalCount,
  };

  // Individual question drawer states (kept closed by default so user isn't overwhelmed until they click a question)
  const [openDrawers, setOpenDrawers] = useState<Record<string, boolean>>({
    CONTROLS: false,
    TIMELINE: false,
    COMPARISON: false,
    ARCHITECTURE: false,
    VALIDATION: false,
  });

  const toggleDrawer = (key: string) => {
    setOpenDrawers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    window.setTimeout(() => {
      refreshScrollTriggers();
    }, 100);
  };

  // When user clicks a chapter in the header nav, automatically open that question drawer so they see the answer & data
  const handleSelectTabFromNav = (tab: ActiveWorkspaceTab) => {
    onSelectTab(tab);
    if (tab in openDrawers) {
      setOpenDrawers((prev) => ({ ...prev, [tab]: true }));
      window.setTimeout(() => {
        refreshScrollTriggers();
      }, 120);
    }
  };

  // Automatically highlight the active navigation chapter pill while scrolling the single page
  useEffect(() => {
    const elements = SINGLE_SCROLL_CHAPTERS.map((ch) => ({
      id: ch.id,
      el: document.querySelector(ch.targetSelector),
    })).filter((item): item is { id: ActiveWorkspaceTab; el: Element } => Boolean(item.el));

    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const matched = elements.find((item) => item.el === entry.target);
            if (matched) {
              onSelectTab(matched.id);
              break;
            }
          }
        }
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: 0.01,
      }
    );

    for (const item of elements) {
      observer.observe(item.el);
    }

    return () => observer.disconnect();
  }, [onSelectTab]);

  const handleJump = (selector: string) => {
    if (selector === '#stage-comparison') {
      setOpenDrawers((prev) => ({ ...prev, COMPARISON: true }));
    }
    scrollTo(selector);
  };

  return (
    <div className="min-h-screen bg-black text-lunar-100 flex flex-col">
      {/* Keyboard users can bypass the hero and header straight to the 3D explorer */}
      <a
        href="#stage-globe"
        onClick={(e) => {
          e.preventDefault();
          handleJump('#stage-globe');
        }}
        className="sr-only-focusable fixed top-3 left-3 z-[60] px-4 py-2 rounded-full bg-sky-500 text-space-950 text-xs font-semibold"
      >
        Skip to 3D Moon explorer
      </a>

      {/* Sticky NASA.gov-Inspired Top Navigation Bar */}
      <HeaderTelemetryBar
        primaryScenario={primaryScenario}
        metadata={metadata}
        activeTab={activeTab}
        uxMode={uxMode}
        expandAllData={expandAllData}
        onSelectTab={handleSelectTabFromNav}
        onToggleUxMode={onToggleUxMode}
        onChangeUxMode={onChangeUxMode}
        onToggleExpandAllData={onToggleExpandAllData}
        onCopyShareLink={onCopyShareLink}
      />

      {/* Continuous Single-Scroll Experience */}
      <main className="flex-1 w-full">
        {/* OPENING HERO: NASA Featured Mission Banner + 3 Clickable Curiosity Questions */}
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6">
          <HeroBigTextStage
            scenario={primaryScenario}
            onJumpToSection={handleJump}
          />
        </div>

        {/* BIG-TEXT TRANSITION 01 -> 3D MOON & QUESTION-DRIVEN SITE Q&A */}
        <BigTextChapterTransition
          id="chapter-01-transition"
          chapterNumber="01"
          eyebrow="INTERACTIVE 3D LUNAR RECONNAISSANCE"
          primaryTitle="EXPLORE THE"
          accentTitle="LIVING MOON."
          kineticBackdropText="NASA LRO LROC WAC + LOLA 4K DIGITAL ELEVATION"
          subtitle="Spin the Moon, click any crater or ridge on the 3D surface, and click a question on the right to see if astronauts could survive there."
          telemetryTag={`ACTIVE SITE: ${primaryScenario.matchedPresetSite?.code || 'CUSTOM'} · ${primaryScenario.coordinates.latitudeDeg.toFixed(2)}°`}
          backgroundVariant="LOLA_LASER_ALTIMETRY"
        />

        {/* STAGE 01: 3D Moon Viewport (7 cols) + Question-First Site Q&A Rail (5 cols) */}
        <section
          id="stage-globe"
          aria-label="3D Moon Explorer and Question-Driven Site Q&A"
          className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <Moon3DViewport
                scenario={primaryScenario}
                comparisonScenarios={globeComparisonScenarios}
                candidateSites={candidateSites}
                externalCameraRequest={externalCameraRequest}
                onSelectCoordinates={onSelectAlphaCoords}
              />

              {/* Compact Curiosity Prompt Bar Below Globe */}
              <div className="nasa-card rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="nasa-eyebrow">
                    <span>WONDERING HOW THIS SITE COMPARES TO ANOTHER?</span>
                  </div>
                  <div className="text-lunar-200 font-medium truncate mt-1">
                    Compare <strong className="text-white">{primaryScenario.matchedPresetSite?.name || 'Active Site'}</strong> against{' '}
                    <strong className="text-amber-300">
                      {comparisonScenario.matchedPresetSite?.name || 'Comparison Site'}
                    </strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleJump('#stage-comparison')}
                  className="px-4 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Ask: Which Site Is Better? ↓</span>
                </button>
              </div>
            </div>

            {/* Right Rail: Clickable Questions Instead of Overwhelming Raw Data */}
            <div className="lg:col-span-5 xl:col-span-4">
              <NasaSiteQuestionRail
                scenario={primaryScenario}
                solarHardware={solarHardware}
                commHardware={commHardware}
                uxMode={uxMode}
                expandAllGlobal={expandAllData}
                onChangeSolarHardware={onChangeSolarHardware}
                onChangeCommHardware={onChangeCommHardware}
              />
            </div>
          </div>

          {/* SIGNATURE FEATURE: Local 360° Horizon Sky View + Temporal Sky View */}
          <div className="mt-10">
            <LocalTemporalSkyView
              scenario={primaryScenario}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              uxMode={uxMode}
              onTogglePlay={onTogglePlay}
              onChangePlaybackSpeed={onChangePlaybackSpeed}
              onChangeElapsedHours={onChangeElapsedHours}
              onShiftLunarLocalHour={onShiftLunarLocalHour}
            />
          </div>

          {/* PHASE 6: Multi-Domain Mission Feasibility & Constraint Matrix */}
          <div className="mt-8">
            <MissionFeasibilitySummary
              scenario={primaryScenario}
              uxMode={uxMode}
            />
          </div>

          {/* PHASE 7: Optional Rover & Lander Compatibility What-If Lab */}
          {uxMode !== 'EDUCATOR' && (
            <MissionExtensionsLab scenario={primaryScenario} />
          )}
        </section>

        {/* BIG-TEXT TRANSITION 02 -> GUIDED SELENOGRAPHIC EXPEDITION TOUR */}
        <BigTextChapterTransition
          id="chapter-02-transition"
          chapterNumber="02"
          eyebrow="NASA LRO REGIONAL SPOTLIGHT"
          primaryTitle="FOUR EXTREME"
          accentTitle="WORLDS ON ONE MOON."
          kineticBackdropText="SHACKLETON RIDGE — MALAPERT MASSIF — MONS MOUTON — VON KARMAN"
          subtitle="Why do four locations on the same Moon have completely different sunlight, temperatures, and Earth visibility? Click any region's question to find out."
          telemetryTag="4 CURATED NASA LANDING ZONES"
          backgroundVariant="MONS_MOUTON_PLATEAU"
        />

        {/* STAGE 02: Guided Selenographic Tour with NASA Imagery & Clickable Questions */}
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-16">
          <ScrollReveal>
            <LunarExpeditionRibbon
              candidateSites={candidateSites}
              activeScenario={primaryScenario}
              onSelectSiteWithCamera={onSelectSiteWithCamera}
            />
          </ScrollReveal>
        </div>

        {/* NASA.GOV ARCHIVAL MULTIMEDIA & PHOTO ESSAY SHOWCASE */}
        <ScrollReveal>
          <NasaMissionGallerySection onJumpToSection={handleJump} />
        </ScrollReveal>

        {/* BIG-TEXT TRANSITION 03 -> LOCATION & EPOCH QUESTION */}
        <BigTextChapterTransition
          id="chapter-03-transition"
          chapterNumber="03"
          eyebrow="WHERE & WHEN YOU LAND MATTERS"
          primaryTitle="ONE DEGREE."
          accentTitle="TWO WEEKS OF NIGHT."
          kineticBackdropText="MOON_ME SELENOGRAPHIC LATITUDE LONGITUDE & JULIAN DATE"
          subtitle="On the Moon, moving just a few kilometers—or landing two weeks later—can mean the difference between continuous solar power and a 300-hour freeze."
          telemetryTag={`LOCAL LUNAR TIME: ${primaryScenario.timeConfig.lunarLocalSolarHour.toFixed(1)}H LTST`}
          backgroundVariant="SYNODIC_SOLAR_CYCLE"
        />

        {/* STAGE 03: Question Drawer for Location Selection & Mission Time Controls */}
        <section
          id="stage-controls"
          aria-label="Location Selection and Mission Time Question"
          className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-16"
        >
          <ScrollReveal>
            <NasaQuestionDrawerCard
              questionNumber="Question 04"
              topicTag="Location & Launch Date"
              question="What happens if we pick a different crater—or land on a different date?"
              shortAnswerTeaser="Because one lunar day-night cycle lasts 29.53 Earth days, the exact date you land and your latitude/longitude determine whether you arrive at lunar dawn, noon, or a multi-day eclipse."
              detailedAnswer={`At ${primaryScenario.matchedPresetSite?.name || 'your selected coordinates'} (${primaryScenario.coordinates.latitudeDeg.toFixed(2)}°, ${primaryScenario.coordinates.longitudeDeg.toFixed(2)}°), the local lunar solar time is currently ${primaryScenario.timeConfig.lunarLocalSolarHour.toFixed(1)}:00 LTST (where 12:00 LTST is local solar noon). Use the interactive controls below to test all ${candidateSites.length} reference sites, enter custom coordinates, scrub time forward to watch shadows sweep across the 3D Moon, or let the Landing Window Scanner rank the next 30 landing dates for you.`}
              keyTakeawayLabel="Current Window"
              keyTakeawayValue={`${primaryScenario.timeConfig.missionDurationDays} Days · T+${primaryScenario.timeConfig.elapsedHours}h`}
              imageVariant="SYNODIC_SOLAR_CYCLE"
              isOpen={expandAllData || openDrawers.CONTROLS}
              onToggle={() => toggleDrawer('CONTROLS')}
              openButtonLabel="Click to Choose Landing Site & Scrub Mission Time"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-6">
                    <LandingSiteSelector
                      candidateSites={candidateSites}
                      scenario={primaryScenario}
                      comparisonCoordsList={comparisonCoordsList}
                      uxMode={uxMode}
                      onSelectCoordinates={onSelectAlphaCoords}
                      onToggleComparisonSite={onToggleComparisonSite}
                    />
                  </div>
                  <div className="lg:col-span-6">
                    <EpochTimeControls
                      scenario={primaryScenario}
                      isPlaying={isPlaying}
                      playbackSpeed={playbackSpeed}
                      uxMode={uxMode}
                      onTogglePlay={onTogglePlay}
                      onChangePlaybackSpeed={onChangePlaybackSpeed}
                      onChangeEpochUtc={onChangeAlphaEpoch}
                      onChangeElapsedHours={onChangeElapsedHours}
                      onChangeDurationDays={onChangeAlphaDuration}
                      onShiftLunarLocalHour={onShiftLunarLocalHour}
                    />
                  </div>
                </div>

                {/* NEW: Landing Window Scanner — "WHEN should we land here?" */}
                <LandingWindowScanner
                  provider={provider}
                  siteName={primaryScenario.matchedPresetSite?.name || 'the selected coordinates'}
                  coordinates={alphaCoords}
                  currentEpochIsoUtc={alphaEpochUtc}
                  missionDurationDays={primaryScenario.timeConfig.missionDurationDays}
                  solarHardware={solarHardware}
                  commHardware={commHardware}
                  uxMode={uxMode}
                  onApplyEpoch={onChangeAlphaEpoch}
                />
              </div>
            </NasaQuestionDrawerCard>
          </ScrollReveal>
        </section>

        {/* BIG-TEXT TRANSITION 04 -> TEMPORAL TIMELINE QUESTION */}
        <BigTextChapterTransition
          id="chapter-04-transition"
          chapterNumber="04"
          eyebrow="SURVIVING THE LUNAR NIGHT"
          primaryTitle="WHEN DO THE"
          accentTitle="SHADOWS FALL?"
          kineticBackdropText="SOLAR ILLUMINATION DUTY & DIRECT-TO-EARTH RF CLEARANCE"
          subtitle="Before NASA commits astronauts to a surface stay, flight controllers map every single hour of sunlight, shadow, and radio blackout."
          telemetryTag={`MAX CONTINUOUS DARKNESS: ${primaryScenario.summary.maxContinuousDarknessHours} HRS`}
          backgroundVariant="ARTEMIS_ASTRONAUT_EVA"
        />

        {/* STAGE 04: Question Drawer for Interactive Mission Timeline */}
        <section
          id="stage-timeline"
          aria-label="Synchronized Mission Timeline Question"
          className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-16"
        >
          <ScrollReveal>
            <NasaQuestionDrawerCard
              questionNumber="Question 05"
              topicTag="14-Day Surface Forecast"
              question={`When will ${primaryScenario.matchedPresetSite?.name || 'this site'} lose sunlight or Earth contact over ${primaryScenario.timeConfig.missionDurationDays} days?`}
              shortAnswerTeaser={`Over this ${primaryScenario.timeConfig.missionDurationDays}-day window, the site is illuminated ${primaryScenario.summary.solarAvailabilityPct}% of the time (${primaryScenario.summary.totalIlluminatedHours} hours) with a longest continuous shadow period of ${primaryScenario.summary.maxContinuousDarknessHours} hours.`}
              detailedAnswer={`Any hour where the Sun or Earth drops below 0° ridge clearance means surrounding lunar mountains block the line of sight. Click any point along the readiness bar or elevation chart below to jump the 3D Moon to that exact hour.`}
              keyTakeawayLabel="Total Energy Generated"
              keyTakeawayValue={`${primaryScenario.summary.cumulativeEnergyKwh} kWh (${primaryScenario.summary.solarAvailabilityPct}% Sun)`}
              imageVariant="LOLA_SLOPE_TERRAIN"
              isOpen={expandAllData || openDrawers.TIMELINE}
              onToggle={() => toggleDrawer('TIMELINE')}
              openButtonLabel="Click to Open Hour-by-Hour Forecast & Chart"
            >
              <MissionTimelinePanel
                scenario={primaryScenario}
                uxMode={uxMode}
                onSelectHourOffset={onChangeElapsedHours}
              />
            </NasaQuestionDrawerCard>
          </ScrollReveal>
        </section>

        {/* BIG-TEXT TRANSITION 05 -> SITE TRADE-OFFS QUESTION */}
        <BigTextChapterTransition
          id="chapter-05-transition"
          chapterNumber="05"
          eyebrow="ARTEMIS SITE SELECTION TRADE-OFFS"
          primaryTitle="WHICH LANDING"
          accentTitle="SITE WINS?"
          kineticBackdropText="SIDE-BY-SIDE QUANTITATIVE LANDING SITE COMPARISON"
          subtitle="No single lunar site is perfect: one ridge may have more sunlight while another has better Earth radio contact or flatter ground. Compare two sites head-to-head."
          telemetryTag={`ALPHA ${primaryScenario.summary.overallViabilityScore}/100 VS BRAVO ${comparisonScenario.summary.overallViabilityScore}/100`}
          backgroundVariant="MALAPERT_EARTH_LINE_OF_SIGHT"
        />

        {/* STAGE 05: Question Drawer for Side-by-Side Scenario Comparison View */}
        <section
          id="stage-comparison"
          aria-label="Candidate Landing Site Trade-Study Question"
          className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-16"
        >
          <ScrollReveal>
            <NasaQuestionDrawerCard
              questionNumber="Question 06"
              topicTag="Site Comparison"
              question={`How does ${primaryScenario.matchedPresetSite?.name || 'Scenario Alpha'} compare against ${comparisonScenario.matchedPresetSite?.name || 'Scenario Bravo'}?`}
              shortAnswerTeaser={`Right now, ${
                primaryScenario.summary.overallViabilityScore >=
                comparisonScenario.summary.overallViabilityScore
                  ? `${primaryScenario.matchedPresetSite?.name || 'Scenario Alpha'} leads with a screening score of ${primaryScenario.summary.overallViabilityScore}/100 vs. ${comparisonScenario.summary.overallViabilityScore}/100.`
                  : `${comparisonScenario.matchedPresetSite?.name || 'Scenario Bravo'} leads with a screening score of ${comparisonScenario.summary.overallViabilityScore}/100 vs. ${primaryScenario.summary.overallViabilityScore}/100.`
              }`}
              detailedAnswer="Mission planners weigh four competing factors: solar illumination duty (45%), communication availability (30%), landing slope safety (15%), and darkness resilience (10%). Open the comparison matrix below to swap sites, enable an NRHO relay satellite, or export a full trade-study report."
              keyTakeawayLabel="Screening Comparison"
              keyTakeawayValue={`Alpha ${primaryScenario.summary.overallViabilityScore} vs Bravo ${comparisonScenario.summary.overallViabilityScore}`}
              imageVariant="MALAPERT_EARTH_LINE_OF_SIGHT"
              isOpen={expandAllData || openDrawers.COMPARISON}
              onToggle={() => toggleDrawer('COMPARISON')}
              openButtonLabel="Click to Compare Sites Side-by-Side"
            >
              <ScenarioComparisonView
                alphaScenario={primaryScenario}
                bravoScenario={comparisonScenario}
                candidateSites={candidateSites}
                savedSnapshots={savedSnapshots}
                onChangeAlphaSite={onSelectAlphaCoords}
                onChangeBravoSite={onSelectBravoCoords}
                onChangeAlphaEpoch={onChangeAlphaEpoch}
                onChangeBravoEpoch={onChangeBravoEpoch}
                onChangeAlphaDuration={onChangeAlphaDuration}
                onChangeBravoDuration={onChangeBravoDuration}
                onToggleBravoRelay={onToggleBravoRelay}
                onSwapScenarios={onSwapScenarios}
                onSaveSnapshot={onSaveSnapshot}
                onDeleteSnapshot={onDeleteSnapshot}
                onLoadSnapshotToBravo={onLoadSnapshotToBravo}
              />
            </NasaQuestionDrawerCard>
          </ScrollReveal>
        </section>

        {/* BIG-TEXT TRANSITION 06 -> DATA PROVENANCE QUESTION */}
        <BigTextChapterTransition
          id="chapter-06-transition"
          chapterNumber="06"
          eyebrow="OPEN SCIENCE & TRANSPARENCY"
          primaryTitle="WHERE DOES THE"
          accentTitle="DATA COME FROM?"
          kineticBackdropText="NASA LRO LROC + LOLA SVS #4720 & ANALYTICAL EPHEMERIDES"
          subtitle="Scientific integrity means never confusing real spacecraft measurements with synthetic approximations. Explore every dataset and NASA API powering LUNARIS."
          telemetryTag={`ENGINE: ${metadata.providerId}`}
          backgroundVariant="GATEWAY_NRHO_RELAY"
        />

        {/* STAGE 06: Question Drawer for Data Architecture & Provenance Catalog */}
        <section
          id="stage-architecture"
          aria-label="Modular Scientific Data Pipeline and Provenance Question"
          className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-16"
        >
          <ScrollReveal>
            <NasaQuestionDrawerCard
              questionNumber="Question 07"
              topicTag="NASA Data Sources"
              question="Which parts of LUNARIS use real NASA spacecraft data, and which use a synthetic model?"
              shortAnswerTeaser="Global 3D Moon imagery & elevation come directly from NASA's Lunar Reconnaissance Orbiter (LROC WAC + LOLA 4K DEM), and Sun/Earth positions use validated analytical orbital math—while local 360° ridge horizons use a clearly labeled parametric proxy."
              detailedAnswer="Full-resolution 5-meter LRO LOLA polar DEM tiles are ~1.8 GB in size. To run instantaneously in your browser, LUNARIS pairs real analytical selenographic ephemerides and 4K NASA SVS #4720 global maps with a deterministic synthetic horizon mask, and provides a live NASA JPL Horizons REST API query builder below."
              keyTakeawayLabel="Registered Datasets"
              keyTakeawayValue={`${metadata.datasets.length} Documented Sources`}
              imageVariant="LOLA_LASER_ALTIMETRY"
              isOpen={expandAllData || openDrawers.ARCHITECTURE}
              onToggle={() => toggleDrawer('ARCHITECTURE')}
              openButtonLabel="Click to Inspect NASA Datasets & JPL Horizons API"
            >
              <DataArchitectureView
                activeProviderKey={providerKey}
                metadata={metadata}
                currentCoords={alphaCoords}
                currentEpochUtc={alphaEpochUtc}
                onSelectProviderKey={onSelectProviderKey}
              />
            </NasaQuestionDrawerCard>
          </ScrollReveal>
        </section>

        {/* BIG-TEXT TRANSITION 07 -> SCIENTIFIC VALIDATION QUESTION */}
        <BigTextChapterTransition
          id="chapter-07-transition"
          chapterNumber="07"
          eyebrow="VERIFIED PHYSICS ENGINE"
          primaryTitle="HOW DO WE KNOW"
          accentTitle="THE MATH IS RIGHT?"
          kineticBackdropText={`${validationSummary.totalCount} AUTOMATED ORBITAL & RADIOMETRIC VALIDATION TESTS`}
          subtitle="Every coordinate conversion, Julian Date epoch, solar grazing limb equation, and Ka-Band radio path-loss formula is tested live against reference benchmarks."
          telemetryTag={`${validationSummary.passedCount} / ${validationSummary.totalCount} BENCHMARKS PASSING`}
          backgroundVariant="VIPER_POLAR_ROVER"
        />

        {/* STAGE 07: Question Drawer for Automated Scientific Validation Suite */}
        <section
          id="stage-validation"
          aria-label="Scientific Validation and Reference Benchmarks Question"
          className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-20"
        >
          <ScrollReveal>
            <NasaQuestionDrawerCard
              questionNumber="Question 08"
              topicTag="Physics Verification"
              question="Can we verify LUNARIS's orbital mechanics and solar/radio equations against reference standards?"
              shortAnswerTeaser={
                validationReport.allPassed
                  ? `Yes—all ${validationSummary.passedCount} of ${validationSummary.totalCount} automated scientific validation benchmarks execute live in your browser across orbital, topographic, and RF domains and pass within strict numerical tolerances.`
                  : `Partially—${validationSummary.passedCount} of ${validationSummary.totalCount} automated benchmarks pass in your browser; open the table below to see exactly which reference checks are currently failing.`
              }
              detailedAnswer="Click below to inspect the exact expected reference values, computed outputs, and numerical error tolerances for MOON_ME coordinate round-trips, J2000 Julian Dates, sub-solar zenith geometry, libration sign conventions, the circular-segment solar disc model, polar vertical-mast vs. flat-panel cosine efficiency, and 32 GHz Ka-Band Free-Space Path Loss."
              keyTakeawayLabel="Verification Status"
              keyTakeawayValue={`${validationSummary.passedCount} / ${validationSummary.totalCount} Benchmarks Passed`}
              imageVariant="SHACKLETON_RIDGE_SUNLIGHT"
              isOpen={expandAllData || openDrawers.VALIDATION}
              onToggle={() => toggleDrawer('VALIDATION')}
              openButtonLabel={`Click to View All ${validationSummary.totalCount} Physics Benchmarks`}
            >
              <ScientificValidationView report={validationReport} />
            </NasaQuestionDrawerCard>
          </ScrollReveal>
        </section>
      </main>

      {/* Architectural NASA-Inspired Footer */}
      <footer className="border-t border-white/[0.12] bg-black px-4 sm:px-6 pt-12 pb-8 text-xs text-lunar-400 overflow-hidden">
        <div className="max-w-[1680px] mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="font-display font-bold text-white tracking-wider text-sm">
                  LUNARIS · The Next Landing Starts With You.
                </span>
              </div>
              <div className="text-[11px] text-lunar-400">
                Imagery &amp; Elevation Credit: NASA / GSFC / Arizona State University (LRO LROC &amp; LOLA SVS #4720) · Reference Frame: MOON_ME (1,737.4 km Mean Radius)
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpenDrawers((prev) => ({ ...prev, VALIDATION: true }));
                  handleJump('#stage-validation');
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-mono text-[11px] transition-colors ${
                  validationReport.allPassed
                    ? 'bg-emerald-500/10 border-emerald-400/35 text-emerald-300 hover:border-emerald-400/60'
                    : 'bg-rose-500/10 border-rose-400/35 text-rose-300 hover:border-rose-400/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {validationSummary.passedCount}/{validationSummary.totalCount} Physics Benchmarks{' '}
                {validationReport.allPassed ? 'Verified' : 'Passing'}
              </button>
              <button
                type="button"
                onClick={() => scrollTo(0)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold font-mono text-xs transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                Back to Top
              </button>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="font-display font-bold uppercase tracking-tightest leading-[0.82] text-[clamp(3.2rem,13vw,13.5rem)] text-white/[0.04] select-none text-center"
          >
            LUNARIS 90°S
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  const [providerKey, setProviderKey] = useState<'SIMULATED' | 'NASA_STUB'>('SIMULATED');
  const activeProvider: ILunarNavigationProvider =
    providerKey === 'SIMULATED' ? simulatedProvider : nasaAdapterStub;

  // Hydrate the full trade-study configuration from a shared permalink (if present) exactly once.
  const initialState = useMemo(readInitialState, []);

  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('CONSOLE');
  const [uxMode, setUxMode] = useState<UserExperienceMode>(initialState.uxMode);
  const [expandAllData, setExpandAllData] = useState<boolean>(false);

  // Primary Scenario (Alpha) state
  const [alphaCoords, setAlphaCoords] = useState<LunarCoordinates>(initialState.alphaCoords);
  const [alphaEpochUtc, setAlphaEpochUtc] = useState<string>(initialState.alphaEpochUtc);
  const [elapsedHours, setElapsedHours] = useState<number>(initialState.elapsedHours);
  const [alphaDurationDays, setAlphaDurationDays] = useState<number>(
    initialState.alphaDurationDays
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2);

  // External 3D camera choreography requests triggered by Expedition cards
  const [cameraRequest, setCameraRequest] = useState<CameraChoreographyRequest | null>(null);
  const cameraNonceRef = useRef(0);

  // Configurable Solar & RF Communication Hardware Assumptions
  const [solarHardware, setSolarHardware] = useState<SolarHardwareConfig>(
    DEFAULT_SOLAR_HARDWARE
  );
  const [commHardware, setCommHardware] = useState<CommHardwareConfig>(
    DEFAULT_COMM_HARDWARE
  );

  // Secondary Scenario (Bravo) state for Side-by-Side Comparison
  const [bravoCoords, setBravoCoords] = useState<LunarCoordinates>(initialState.bravoCoords);
  const [bravoEpochUtc, setBravoEpochUtc] = useState<string>(initialState.bravoEpochUtc);
  const [bravoDurationDays, setBravoDurationDays] = useState<number>(
    initialState.bravoDurationDays
  );
  const [bravoRelayEnabled, setBravoRelayEnabled] = useState<boolean>(
    initialState.bravoRelayEnabled
  );

  // Additional pinned comparison coordinates on the 3D Globe (Bravo is always shown separately)
  const [comparisonCoordsList, setComparisonCoordsList] = useState<LunarCoordinates[]>([
    initialState.bravoCoords,
  ]);

  // Saved Scenario Snapshots (persisted across reloads)
  const [savedSnapshots, setSavedSnapshots] = useState<SavedScenarioSnapshot[]>(
    readPersistedSnapshots
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SNAPSHOT_STORAGE_KEY,
        JSON.stringify(savedSnapshots.slice(0, MAX_PERSISTED_SNAPSHOTS))
      );
    } catch (err) {
      // Quota exceeded or storage disabled: the in-memory list still works for this session.
      console.warn('LUNARIS: could not persist snapshots to localStorage.', err);
    }
  }, [savedSnapshots]);

  const candidateSites = useMemo(
    () => activeProvider.getCandidateLandingSites(),
    [activeProvider]
  );

  const metadata = useMemo(() => activeProvider.getMetadata(), [activeProvider]);

  const primaryScenario = useMemo(
    () =>
      activeProvider.computeScenario({
        scenarioId: 'SCENARIO-ALPHA',
        scenarioLabel: 'Primary Mission Scenario (Alpha)',
        coordinates: alphaCoords,
        epochIsoUtc: alphaEpochUtc,
        elapsedHours,
        missionDurationDays: alphaDurationDays,
        solarHardware,
        commHardware,
      }),
    [
      activeProvider,
      alphaCoords,
      alphaEpochUtc,
      elapsedHours,
      alphaDurationDays,
      solarHardware,
      commHardware,
    ]
  );

  const bravoCommHardware = useMemo(
    () => ({ ...commHardware, relaySatelliteEnabled: bravoRelayEnabled }),
    [commHardware, bravoRelayEnabled]
  );

  const comparisonScenario = useMemo(
    () =>
      activeProvider.computeScenario({
        scenarioId: 'SCENARIO-BRAVO',
        scenarioLabel: 'BRAVO',
        coordinates: bravoCoords,
        epochIsoUtc: bravoEpochUtc,
        elapsedHours,
        missionDurationDays: bravoDurationDays,
        solarHardware,
        commHardware: bravoCommHardware,
      }),
    [
      activeProvider,
      bravoCoords,
      bravoEpochUtc,
      elapsedHours,
      bravoDurationDays,
      solarHardware,
      bravoCommHardware,
    ]
  );

  // Globe beacons: the real Bravo scenario first, then any additional pinned sites that are
  // not Alpha or Bravo. Previously the globe only showed the pin list, so it silently drifted
  // from the Bravo scenario after a swap, a snapshot load, or a comparison-view site change.
  const globeComparisonScenarios = useMemo(() => {
    const extras = comparisonCoordsList.filter(
      (c) =>
        !areLunarCoordinatesEquivalent(c, bravoCoords) &&
        !areLunarCoordinatesEquivalent(c, alphaCoords)
    );
    return [
      comparisonScenario,
      ...extras.map((coords, i) =>
        activeProvider.computeScenario({
          scenarioId: `PIN-${i + 1}`,
          scenarioLabel: `PIN ${i + 1}`,
          coordinates: coords,
          epochIsoUtc: bravoEpochUtc,
          elapsedHours,
          missionDurationDays: bravoDurationDays,
          solarHardware,
          commHardware,
        })
      ),
    ];
  }, [
    activeProvider,
    comparisonScenario,
    comparisonCoordsList,
    bravoCoords,
    alphaCoords,
    bravoEpochUtc,
    elapsedHours,
    bravoDurationDays,
    solarHardware,
    commHardware,
  ]);

  // Simulation playback loop with configurable speed multiplier
  useEffect(() => {
    if (!isPlaying) return;
    const totalHours = alphaDurationDays * 24;
    const timer = window.setInterval(() => {
      setElapsedHours((prev) => {
        const next = prev + playbackSpeed;
        if (next > totalHours) return 0;
        return next;
      });
    }, 350);
    return () => window.clearInterval(timer);
  }, [isPlaying, alphaDurationDays, playbackSpeed]);

  // Keep the URL hash in sync (debounced) so the current view is always a shareable permalink.
  // Skipped during playback to avoid hammering history.replaceState several times a second.
  const permalinkState: ScenarioPermalinkState = useMemo(
    () => ({
      alphaCoords,
      alphaEpochUtc,
      alphaDurationDays,
      bravoCoords,
      bravoEpochUtc,
      bravoDurationDays,
      bravoRelayEnabled,
      elapsedHours,
      uxMode,
    }),
    [
      alphaCoords,
      alphaEpochUtc,
      alphaDurationDays,
      bravoCoords,
      bravoEpochUtc,
      bravoDurationDays,
      bravoRelayEnabled,
      elapsedHours,
      uxMode,
    ]
  );

  useEffect(() => {
    if (isPlaying || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      const encoded = `#${encodeScenarioPermalink(permalinkState)}`;
      if (window.location.hash !== encoded) {
        window.history.replaceState(null, '', encoded);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [permalinkState, isPlaying]);

  const copyShareLink = useCallback(async () => {
    const url = buildShareUrl(permalinkState);
    if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(url);
    return url;
  }, [permalinkState]);

  // Global keyboard shortcuts for the time scrubber (ignored while typing in a form control
  // or when a button has focus so Space/Enter keep their native behaviour).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const active = document.activeElement;
      const bodyHasFocus = !active || active === document.body;
      const totalHours = alphaDurationDays * 24;
      const step = e.shiftKey ? 24 : 1;

      if (e.key === ' ' && bodyHasFocus) {
        e.preventDefault();
        setIsPlaying((v) => !v);
      } else if (e.key === 'ArrowRight' && bodyHasFocus) {
        e.preventDefault();
        setElapsedHours((h) => Math.min(totalHours, h + step));
      } else if (e.key === 'ArrowLeft' && bodyHasFocus) {
        e.preventDefault();
        setElapsedHours((h) => Math.max(0, h - step));
      } else if (e.key === 'Home' && bodyHasFocus) {
        e.preventDefault();
        setElapsedHours(0);
      } else if (e.key === 'End' && bodyHasFocus) {
        e.preventDefault();
        setElapsedHours(totalHours);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [alphaDurationDays]);

  const handleShiftLunarLocalHour = (targetLunarHour: number) => {
    const currentLunarHour = primaryScenario.timeConfig.lunarLocalSolarHour;
    let deltaLunarHours = targetLunarHour - currentLunarHour;
    if (deltaLunarHours < -12) deltaLunarHours += 24;
    if (deltaLunarHours > 12) deltaLunarHours -= 24;
    // One lunar hour (1/24 of a synodic day) lasts 29.53 Earth hours.
    const earthHourShift = Math.round(deltaLunarHours * 29.53);
    const totalHours = alphaDurationDays * 24;
    const nextElapsed = Math.max(0, Math.min(totalHours, elapsedHours + earthHourShift));
    setElapsedHours(nextElapsed);
  };

  // Pin/unpin a comparison site. Pinning also makes it Bravo; UNPINNING leaves Bravo alone
  // (previously un-pinning a site paradoxically turned it into the active Bravo scenario).
  const handleToggleComparisonSite = (coords: LunarCoordinates) => {
    const exists = comparisonCoordsList.some((c) => areLunarCoordinatesEquivalent(c, coords));
    if (exists) {
      setComparisonCoordsList((prev) =>
        prev.filter((c) => !areLunarCoordinatesEquivalent(c, coords))
      );
      return;
    }
    setBravoCoords(coords);
    setComparisonCoordsList((prev) => [...prev, coords]);
  };

  const handleSwapScenarios = () => {
    const tempCoords = alphaCoords;
    const tempEpoch = alphaEpochUtc;
    const tempDur = alphaDurationDays;
    const alphaRelay = commHardware.relaySatelliteEnabled;
    setAlphaCoords(bravoCoords);
    setAlphaEpochUtc(bravoEpochUtc);
    setAlphaDurationDays(bravoDurationDays);
    setBravoCoords(tempCoords);
    setBravoEpochUtc(tempEpoch);
    setBravoDurationDays(tempDur);
    // Relay assumption travels with its scenario.
    setCommHardware((prev) => ({ ...prev, relaySatelliteEnabled: bravoRelayEnabled }));
    setBravoRelayEnabled(alphaRelay);
    if (elapsedHours > bravoDurationDays * 24) {
      setElapsedHours(bravoDurationDays * 24);
    }
  };

  const handleSaveSnapshot = (scenario: MissionScenarioData) => {
    setSavedSnapshots((prev) =>
      [
        {
          id: `snap-${Date.now()}`,
          savedAtUtc: new Date().toISOString(),
          scenario,
        },
        ...prev,
      ].slice(0, MAX_PERSISTED_SNAPSHOTS)
    );
  };

  const handleLoadSnapshotToBravo = (snap: SavedScenarioSnapshot) => {
    setBravoCoords(snap.scenario.coordinates);
    setBravoEpochUtc(snap.scenario.timeConfig.epochIsoUtc);
    setBravoDurationDays(snap.scenario.timeConfig.missionDurationDays);
    setBravoRelayEnabled(snap.scenario.commHardware.relaySatelliteEnabled);
  };

  const handleSelectSiteWithCamera = (
    coords: LunarCoordinates,
    preset: CameraPreset,
    viewMode: MoonViewMode = 'GLOBAL_SPHERE'
  ) => {
    setAlphaCoords(coords);
    cameraNonceRef.current += 1;
    setCameraRequest({ preset, viewMode, nonce: cameraNonceRef.current });
  };

  // Run the scientific validation suite once per session and share the report with the UI.
  const validationReport = useMemo(() => runScientificValidationSuite(), []);

  return (
    <SmoothScrollProvider>
      <ContinuousScrollBody
        provider={activeProvider}
        primaryScenario={primaryScenario}
        comparisonScenario={comparisonScenario}
        globeComparisonScenarios={globeComparisonScenarios}
        candidateSites={candidateSites}
        providerKey={providerKey}
        metadata={metadata}
        activeTab={activeTab}
        uxMode={uxMode}
        expandAllData={expandAllData}
        alphaCoords={alphaCoords}
        alphaEpochUtc={alphaEpochUtc}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        solarHardware={solarHardware}
        commHardware={commHardware}
        comparisonCoordsList={comparisonCoordsList}
        savedSnapshots={savedSnapshots}
        externalCameraRequest={cameraRequest}
        validationReport={validationReport}
        onSelectTab={setActiveTab}
        onToggleUxMode={() =>
          setUxMode((m) =>
            m === 'EDUCATOR'
              ? 'EXPLORER'
              : m === 'EXPLORER'
                ? 'MISSION_PLANNER'
                : 'EDUCATOR'
          )
        }
        onChangeUxMode={setUxMode}
        onToggleExpandAllData={() => setExpandAllData((v) => !v)}
        onCopyShareLink={copyShareLink}
        onSelectAlphaCoords={setAlphaCoords}
        onSelectBravoCoords={setBravoCoords}
        onChangeAlphaEpoch={setAlphaEpochUtc}
        onChangeBravoEpoch={setBravoEpochUtc}
        onChangeAlphaDuration={(days) => {
          setAlphaDurationDays(days);
          if (elapsedHours > days * 24) {
            setElapsedHours(days * 24);
          }
        }}
        onChangeBravoDuration={setBravoDurationDays}
        onChangeElapsedHours={setElapsedHours}
        onTogglePlay={() => setIsPlaying((v) => !v)}
        onChangePlaybackSpeed={setPlaybackSpeed}
        onShiftLunarLocalHour={handleShiftLunarLocalHour}
        onChangeSolarHardware={setSolarHardware}
        onChangeCommHardware={setCommHardware}
        onToggleComparisonSite={handleToggleComparisonSite}
        onSelectSiteWithCamera={handleSelectSiteWithCamera}
        onToggleBravoRelay={() => setBravoRelayEnabled((v) => !v)}
        onSwapScenarios={handleSwapScenarios}
        onSaveSnapshot={handleSaveSnapshot}
        onDeleteSnapshot={(id) =>
          setSavedSnapshots((prev) => prev.filter((s) => s.id !== id))
        }
        onLoadSnapshotToBravo={handleLoadSnapshotToBravo}
        onSelectProviderKey={setProviderKey}
      />
    </SmoothScrollProvider>
  );
};

export default App;
