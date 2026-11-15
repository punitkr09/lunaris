import React, { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeftRight,
  Award,
  BookmarkPlus,
  Calculator,
  FileJson,
  FileText,
  GitCompare,
  Radio,
  Satellite,
  Sun,
  Trash2,
} from 'lucide-react';
import {
  LandingSitePreset,
  LunarCoordinates,
  MissionScenarioData,
  TimelinePoint,
} from '../types/navigation';
import { areLunarCoordinatesEquivalent } from '../science/lunarMath';
import { ScrollReveal } from '../motion/SmoothScrollProvider';
import { STATE_COLORS } from './MissionTimelinePanel';

export interface SavedScenarioSnapshot {
  id: string;
  savedAtUtc: string;
  scenario: MissionScenarioData;
}

interface ScenarioComparisonViewProps {
  alphaScenario: MissionScenarioData;
  bravoScenario: MissionScenarioData;
  candidateSites: LandingSitePreset[];
  savedSnapshots: SavedScenarioSnapshot[];
  onChangeAlphaSite: (coords: LunarCoordinates) => void;
  onChangeBravoSite: (coords: LunarCoordinates) => void;
  onChangeAlphaEpoch: (isoUtc: string) => void;
  onChangeBravoEpoch: (isoUtc: string) => void;
  onChangeAlphaDuration: (days: number) => void;
  onChangeBravoDuration: (days: number) => void;
  onToggleBravoRelay: () => void;
  onSwapScenarios: () => void;
  onSaveSnapshot: (scenario: MissionScenarioData) => void;
  onDeleteSnapshot: (id: string) => void;
  onLoadSnapshotToBravo: (snapshot: SavedScenarioSnapshot) => void;
}

export const ScenarioComparisonView: React.FC<ScenarioComparisonViewProps> = ({
  alphaScenario,
  bravoScenario,
  candidateSites,
  savedSnapshots,
  onChangeAlphaSite,
  onChangeBravoSite,
  onChangeAlphaEpoch,
  onChangeBravoEpoch,
  onChangeAlphaDuration,
  onChangeBravoDuration,
  onToggleBravoRelay,
  onSwapScenarios,
  onSaveSnapshot,
  onDeleteSnapshot,
  onLoadSnapshotToBravo,
}) => {
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Merge the two timelines BY HOUR (not by array index): Alpha and Bravo may use different
  // sample steps (2 h for ≤7-day stays, 3 h otherwise), so index-aligned merging would plot
  // Bravo's T+3h sample at Alpha's T+2h position.
  const mergedChartData = (() => {
    const byHour = new Map<
      number,
      {
        hourOffset: number;
        alphaSunClearance: number | null;
        bravoSunClearance: number | null;
        alphaEarthClearance: number | null;
        bravoEarthClearance: number | null;
      }
    >();
    const ensure = (h: number) => {
      let row = byHour.get(h);
      if (!row) {
        row = {
          hourOffset: h,
          alphaSunClearance: null,
          bravoSunClearance: null,
          alphaEarthClearance: null,
          bravoEarthClearance: null,
        };
        byHour.set(h, row);
      }
      return row;
    };
    for (const pt of alphaScenario.timeline) {
      const row = ensure(pt.hourOffset);
      row.alphaSunClearance = pt.sunClearanceDeg;
      row.alphaEarthClearance = pt.earthClearanceDeg;
    }
    for (const pt of bravoScenario.timeline) {
      const row = ensure(pt.hourOffset);
      row.bravoSunClearance = pt.sunClearanceDeg;
      row.bravoEarthClearance = pt.earthClearanceDeg;
    }
    return Array.from(byHour.values()).sort((a, b) => a.hourOffset - b.hourOffset);
  })();
  const chartMaxHour = Math.max(
    alphaScenario.timeConfig.missionDurationDays,
    bravoScenario.timeConfig.missionDurationDays
  ) * 24;

  const alphaWins =
    alphaScenario.summary.overallViabilityScore >=
    bravoScenario.summary.overallViabilityScore;

  // Operational breakdowns and horizon transition counts come from the provider summary so
  // this view agrees exactly with the Feasibility Matrix and Timeline panels for the same site.
  const summarizeEvents = (s: MissionScenarioData) => ({
    nominalHours: s.summary.nominalOpsHours,
    sunRise: s.summary.sunriseCount,
    sunSet: s.summary.sunsetCount,
    earthRise: s.summary.earthriseCount,
    earthSet: s.summary.earthsetCount,
  });
  const alphaEvents = summarizeEvents(alphaScenario);
  const bravoEvents = summarizeEvents(bravoScenario);

  const readinessTitle = (pt: TimelinePoint) =>
    `T+${pt.hourOffset}h (${pt.timestampUtc}) — ${STATE_COLORS[pt.operationalState].label} | Sun ${pt.sunClearanceDeg.toFixed(1)}°, Earth ${pt.earthClearanceDeg.toFixed(1)}°`;

  // Helper to shift Alpha's epoch by N days and apply to Bravo
  const applyBravoEpochOffsetDays = (offsetDays: number) => {
    const baseMs = Date.parse(alphaScenario.timeConfig.epochIsoUtc);
    if (Number.isNaN(baseMs)) return;
    const targetMs = baseMs + offsetDays * 86400 * 1000;
    const iso = new Date(targetMs).toISOString().slice(0, 16) + ':00Z';
    onChangeBravoSite(alphaScenario.coordinates);
    onChangeBravoEpoch(iso);
    onChangeBravoDuration(alphaScenario.timeConfig.missionDurationDays);
  };

  // Same date, alternate candidate site
  const applyDifferentSiteSameDate = () => {
    const altSite =
      candidateSites.find((s) => s.id !== alphaScenario.matchedPresetSite?.id) ??
      candidateSites[1] ??
      candidateSites[0];
    if (altSite) {
      onChangeBravoSite(altSite.coordinates);
    }
    onChangeBravoEpoch(alphaScenario.timeConfig.epochIsoUtc);
    onChangeBravoDuration(alphaScenario.timeConfig.missionDurationDays);
  };

  // Different site AND +14d date shift
  const applyDifferentSiteAndDate = () => {
    const altSite =
      candidateSites.find((s) => s.id !== alphaScenario.matchedPresetSite?.id) ??
      candidateSites[1] ??
      candidateSites[0];
    if (altSite) {
      onChangeBravoSite(altSite.coordinates);
    }
    const baseMs = Date.parse(alphaScenario.timeConfig.epochIsoUtc);
    if (!Number.isNaN(baseMs)) {
      const iso = new Date(baseMs + 14 * 86400 * 1000).toISOString().slice(0, 16) + ':00Z';
      onChangeBravoEpoch(iso);
    }
  };

  // Natural-language mission environment delta explanation
  const sameSite = areLunarCoordinatesEquivalent(
    alphaScenario.coordinates,
    bravoScenario.coordinates,
    0.75
  );
  const epochDiffDays = Number(
    (
      (Date.parse(bravoScenario.timeConfig.epochIsoUtc) -
        Date.parse(alphaScenario.timeConfig.epochIsoUtc)) /
      (86400 * 1000)
    ).toFixed(1)
  );
  const sunHoursDiff =
    bravoScenario.summary.totalIlluminatedHours - alphaScenario.summary.totalIlluminatedHours;
  const dteHoursDiff =
    bravoScenario.summary.totalDteCommHours - alphaScenario.summary.totalDteCommHours;
  const darkHoursDiff =
    bravoScenario.summary.maxContinuousDarknessHours -
    alphaScenario.summary.maxContinuousDarknessHours;

  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportSuccessMsg(`Exported ${filename}`);
    setTimeout(() => setExportSuccessMsg(null), 4000);
  };

  const handleExportJson = () => {
    const payload = {
      reportTitle: 'LUNARIS Mission Trade-Study Comparison Report',
      generatedAtUtc: new Date().toISOString(),
      dataProvenanceDisclaimer: alphaScenario.metadata.disclaimer,
      scenarioAlpha: alphaScenario,
      scenarioBravo: bravoScenario,
      savedSnapshotsCount: savedSnapshots.length,
    };
    triggerDownload(
      `lunaris-comparison-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  };

  const handleExportMarkdownReport = () => {
    const md = `# LUNARIS — Lunar Mission Planning & Trade-Study Report
Generated UTC: ${new Date().toISOString()}

> **Data Provenance Notice**: ${alphaScenario.metadata.disclaimer}

## 1. Scenario Configurations

| Attribute | Scenario Alpha | Scenario Bravo |
| :--- | :--- | :--- |
| **Site Designation** | ${alphaScenario.matchedPresetSite?.name || 'Custom Coordinates'} (${alphaScenario.matchedPresetSite?.code || 'CUSTOM'}) | ${bravoScenario.matchedPresetSite?.name || 'Custom Coordinates'} (${bravoScenario.matchedPresetSite?.code || 'CUSTOM'}) |
| **Coordinates (MOON_ME)** | ${alphaScenario.coordinates.latitudeDeg.toFixed(3)}°, ${alphaScenario.coordinates.longitudeDeg.toFixed(3)}° | ${bravoScenario.coordinates.latitudeDeg.toFixed(3)}°, ${bravoScenario.coordinates.longitudeDeg.toFixed(3)}° |
| **Landing Epoch (UTC)** | ${alphaScenario.timeConfig.epochIsoUtc} | ${bravoScenario.timeConfig.epochIsoUtc} |
| **Surface Stay Duration** | ${alphaScenario.timeConfig.missionDurationDays} Earth Days | ${bravoScenario.timeConfig.missionDurationDays} Earth Days |
| **NRHO Relay Satellite** | ${alphaScenario.commHardware.relaySatelliteEnabled ? 'ENABLED' : 'DISABLED (DTE Only)'} | ${bravoScenario.commHardware.relaySatelliteEnabled ? 'ENABLED' : 'DISABLED (DTE Only)'} |

## 2. Quantitative Performance Comparison

| Metric | Scenario Alpha | Scenario Bravo | Delta (A - B) |
| :--- | :--- | :--- | :--- |
| **Solar Illumination Duty (%)** | ${alphaScenario.summary.solarAvailabilityPct}% (${alphaScenario.summary.totalIlluminatedHours}h) | ${bravoScenario.summary.solarAvailabilityPct}% (${bravoScenario.summary.totalIlluminatedHours}h) | ${(alphaScenario.summary.solarAvailabilityPct - bravoScenario.summary.solarAvailabilityPct).toFixed(1)}% |
| **Cumulative Electrical Energy** | ${alphaScenario.summary.cumulativeEnergyKwh} kWh (Mean ${alphaScenario.summary.meanElectricalPowerWatts}W) | ${bravoScenario.summary.cumulativeEnergyKwh} kWh (Mean ${bravoScenario.summary.meanElectricalPowerWatts}W) | ${(alphaScenario.summary.cumulativeEnergyKwh - bravoScenario.summary.cumulativeEnergyKwh).toFixed(1)} kWh |
| **Direct-to-Earth (DTE) Comm (%)** | ${alphaScenario.summary.earthVisibilityPct}% (${alphaScenario.summary.totalDteCommHours}h) | ${bravoScenario.summary.earthVisibilityPct}% (${bravoScenario.summary.totalDteCommHours}h) | ${(alphaScenario.summary.earthVisibilityPct - bravoScenario.summary.earthVisibilityPct).toFixed(1)}% |
| **Effective Comm (DTE + Relay)** | ${alphaScenario.summary.effectiveCommAvailabilityPct}% | ${bravoScenario.summary.effectiveCommAvailabilityPct}% | ${(alphaScenario.summary.effectiveCommAvailabilityPct - bravoScenario.summary.effectiveCommAvailabilityPct).toFixed(1)}% |
| **Longest Continuous Darkness** | ${alphaScenario.summary.maxContinuousDarknessHours} hrs | ${bravoScenario.summary.maxContinuousDarknessHours} hrs | ${alphaScenario.summary.maxContinuousDarknessHours - bravoScenario.summary.maxContinuousDarknessHours} hrs |
| **Reference Slope / Elevation** | ${alphaScenario.summary.localSlopeDeg}° / ${alphaScenario.summary.siteElevationMeters}m | ${bravoScenario.summary.localSlopeDeg}° / ${bravoScenario.summary.siteElevationMeters}m | ${(alphaScenario.summary.localSlopeDeg - bravoScenario.summary.localSlopeDeg).toFixed(1)}° |
| **Composite Viability Score** | **${alphaScenario.summary.overallViabilityScore} / 100** | **${bravoScenario.summary.overallViabilityScore} / 100** | **${alphaScenario.summary.overallViabilityScore - bravoScenario.summary.overallViabilityScore} pts** |

## 3. Score Methodology & Breakdown
Formula: \`${alphaScenario.summary.scoreBreakdown.formulaExplanation}\`
- **Alpha Breakdown**: Solar=${alphaScenario.summary.scoreBreakdown.solarScoreComponent}, Comm=${alphaScenario.summary.scoreBreakdown.commScoreComponent}, Slope=${alphaScenario.summary.scoreBreakdown.slopeSafetyComponent}, DarknessResilience=${alphaScenario.summary.scoreBreakdown.darknessResilienceComponent}
- **Bravo Breakdown**: Solar=${bravoScenario.summary.scoreBreakdown.solarScoreComponent}, Comm=${bravoScenario.summary.scoreBreakdown.commScoreComponent}, Slope=${bravoScenario.summary.scoreBreakdown.slopeSafetyComponent}, DarknessResilience=${bravoScenario.summary.scoreBreakdown.darknessResilienceComponent}
`;
    triggerDownload(
      `lunaris-mission-report-${Date.now()}.md`,
      md,
      'text/markdown'
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Editorial Hero & Action Toolbar */}
      <ScrollReveal className="lunaris-surface-elevated rounded-3xl p-6 sm:p-8 flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="lunaris-index-pill">
            <span>02 // MISSION TRADE-STUDY</span>
            <span>•</span>
            <span>SIDE-BY-SIDE ANALYSIS</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-lunar-50">
            Candidate Landing Site Trade-Study
          </h2>
          <p className="text-sm text-lunar-300 leading-relaxed">
            Compare solar illumination duty cycles, electrical energy generation, Direct-to-Earth
            radio clearance, and local terrain slope across two independent mission configurations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {exportSuccessMsg && (
            <span className="text-emerald-300 px-3 py-1.5 bg-emerald-500/10 border border-emerald-400/35 rounded-full">
              ✓ {exportSuccessMsg}
            </span>
          )}
          <button
            type="button"
            onClick={() => onSaveSnapshot(alphaScenario)}
            className="px-3.5 py-2 rounded-full bg-space-850 hover:bg-space-800 border border-white/10 text-lunar-100 inline-flex items-center gap-1.5 transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
            Save Alpha Snapshot
          </button>
          <button
            type="button"
            onClick={handleExportMarkdownReport}
            className="px-3.5 py-2 rounded-full bg-space-850 hover:bg-space-800 border border-white/10 text-lunar-100 inline-flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-lunar-300" />
            Export MD
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-space-950 font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <FileJson className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </ScrollReveal>

      {/* Rapid Comparison Mode Presets & Natural-Language Environment Delta Banner */}
      <ScrollReveal className="lunaris-surface rounded-3xl p-5 sm:p-6 space-y-4 border border-sky-400/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-sky-300">
              Rapid Trade-Study Presets · &ldquo;If my landing location or date changes, how does my mission environment change?&rdquo;
            </div>
            <p className="text-xs text-lunar-300 mt-0.5">
              Configure Scenario Bravo relative to Scenario Alpha with one click to test site swaps, launch slips, or lunar cycle shifts:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={applyDifferentSiteSameDate}
              className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 transition-colors"
            >
              1. Different Site · Same Date
            </button>
            <button
              type="button"
              onClick={() => applyBravoEpochOffsetDays(7)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 transition-colors"
            >
              2. Same Site · +7d Delay
            </button>
            <button
              type="button"
              onClick={() => applyBravoEpochOffsetDays(14)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 transition-colors"
            >
              3. Same Site · +14d Lunar Flip
            </button>
            <button
              type="button"
              onClick={() => applyBravoEpochOffsetDays(29.5)}
              className="px-3 py-1.5 rounded-xl bg-space-850 hover:bg-space-800 border border-white/15 text-lunar-100 transition-colors"
            >
              4. Same Site · +29.5d Next Cycle
            </button>
            <button
              type="button"
              onClick={applyDifferentSiteAndDate}
              className="px-3 py-1.5 rounded-xl bg-space-850 hover:bg-space-800 border border-white/15 text-lunar-100 transition-colors"
            >
              5. Alt Site &amp; +14d Shift
            </button>
          </div>
        </div>

        {/* Data-Driven Natural-Language Mission Environment Delta Explanation */}
        <div className="rounded-2xl bg-space-950/85 border border-white/[0.08] p-4 text-xs sm:text-sm text-lunar-100 leading-relaxed">
          <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 mr-2">
            {sameSite
              ? epochDiffDays === 0
                ? 'Identical Site & Epoch'
                : `Schedule Shift Analysis (${epochDiffDays > 0 ? `+${epochDiffDays}d` : `${epochDiffDays}d`} at Same Site)`
              : epochDiffDays === 0
                ? 'Candidate Site Trade-Off (Same Landing Epoch)'
                : `Combined Site & Date Shift (${epochDiffDays > 0 ? `+${epochDiffDays}d` : `${epochDiffDays}d`})`}
          </span>
          <span>
            Moving from <strong>{alphaScenario.matchedPresetSite?.name || 'Scenario Alpha'}</strong> (
            {alphaScenario.timeConfig.epochIsoUtc.slice(0, 10)}) to{' '}
            <strong>{bravoScenario.matchedPresetSite?.name || 'Scenario Bravo'}</strong> (
            {bravoScenario.timeConfig.epochIsoUtc.slice(0, 10)}) changes sunlight availability by{' '}
            <strong className={sunHoursDiff >= 0 ? 'text-emerald-300 font-mono' : 'text-rose-300 font-mono'}>
              {sunHoursDiff >= 0 ? `+${sunHoursDiff}h` : `${sunHoursDiff}h`}
            </strong>{' '}
            ({alphaScenario.summary.solarAvailabilityPct}% → {bravoScenario.summary.solarAvailabilityPct}%), Direct-to-Earth communication by{' '}
            <strong className={dteHoursDiff >= 0 ? 'text-sky-300 font-mono' : 'text-amber-300 font-mono'}>
              {dteHoursDiff >= 0 ? `+${dteHoursDiff}h` : `${dteHoursDiff}h`}
            </strong>{' '}
            ({alphaScenario.summary.earthVisibilityPct}% → {bravoScenario.summary.earthVisibilityPct}%), and longest continuous darkness by{' '}
            <strong className={darkHoursDiff <= 0 ? 'text-emerald-300 font-mono' : 'text-rose-300 font-mono'}>
              {darkHoursDiff > 0 ? `+${darkHoursDiff}h` : `${darkHoursDiff}h`}
            </strong>{' '}
            ({alphaScenario.summary.maxContinuousDarknessHours}h → {bravoScenario.summary.maxContinuousDarknessHours}h).
          </span>
        </div>

        {/* Synchronized Operational Readiness Bars: Alpha vs Bravo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          {[
            { label: 'ALPHA TIMELINE READINESS', scen: alphaScenario, ev: alphaEvents, accent: 'text-amber-300' },
            { label: 'BRAVO TIMELINE READINESS', scen: bravoScenario, ev: bravoEvents, accent: 'text-sky-300' },
          ].map(({ label, scen, ev, accent }) => (
            <div key={label} className="rounded-2xl bg-space-950/75 border border-white/[0.07] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className={accent}>
                  {label} · {scen.matchedPresetSite?.code || 'CUSTOM'} ({scen.timeConfig.epochIsoUtc.slice(0, 10)})
                </span>
                <span className="text-lunar-300">
                  Sun+DTE: {ev.nominalHours}h · Sun {ev.sunRise}↑/{ev.sunSet}↓ · Earth {ev.earthRise}↑/{ev.earthSet}↓
                </span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden bg-space-900 flex border border-white/10">
                {scen.timeline.map((pt) => (
                  <div
                    key={pt.hourOffset}
                    className={`flex-1 ${STATE_COLORS[pt.operationalState].bg}`}
                    title={readinessTitle(pt)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-lunar-400">
                {Object.entries(STATE_COLORS).map(([key, cfg]) => (
                  <span key={key} className="inline-flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${cfg.bg}`} /> {cfg.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Scenario Configuration Cards: Alpha vs Bravo */}
      <ScrollReveal className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
        {/* SCENARIO ALPHA CARD */}
        <div className="lg:col-span-5 lunaris-surface-amber rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-0.5 bg-amber-500 text-space-950 font-mono text-[11px] font-bold rounded-full shrink-0">
                ALPHA
              </span>
              <h3 className="font-display text-base font-semibold text-lunar-50 truncate">
                {alphaScenario.matchedPresetSite?.name || 'Custom Coordinates'}
              </h3>
            </div>
            {alphaWins && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 rounded-full flex items-center gap-1 shrink-0">
                <Award className="w-3 h-3" /> HIGHER VIABILITY
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1.5">
                Landing Site
              </label>
              <select
                value={alphaScenario.matchedPresetSite?.id || ''}
                onChange={(e) => {
                  const found = candidateSites.find((s) => s.id === e.target.value);
                  if (found) onChangeAlphaSite(found.coordinates);
                }}
                className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-2 text-xs text-lunar-100 outline-none"
              >
                {!alphaScenario.matchedPresetSite && (
                  <option value="">Custom Coordinates</option>
                )}
                {candidateSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-lunar-400 mb-1.5">
                Landing Epoch (UTC)
              </label>
              <input
                type="datetime-local"
                value={alphaScenario.timeConfig.epochIsoUtc.slice(0, 16)}
                onChange={(e) =>
                  e.target.value && onChangeAlphaEpoch(`${e.target.value}:00Z`)
                }
                className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-2 text-xs font-mono text-lunar-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-lunar-400 mb-1.5">
                Stay Duration
              </label>
              <select
                value={alphaScenario.timeConfig.missionDurationDays}
                onChange={(e) => onChangeAlphaDuration(parseInt(e.target.value, 10))}
                className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-2 text-xs text-lunar-100 outline-none"
              >
                <option value={7}>7 Earth Days (168h)</option>
                <option value={14}>14 Earth Days (336h)</option>
                <option value={28}>28 Earth Days (672h)</option>
                <option value={30}>30 Earth Days (720h)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1 font-mono text-xs">
            <div className="p-3 bg-space-950/80 border border-white/[0.07] rounded-2xl">
              <div className="text-[10px] text-lunar-400 uppercase">Coordinates</div>
              <div className="text-lunar-100 font-semibold mt-1 tabular-nums">
                {alphaScenario.coordinates.latitudeDeg.toFixed(2)}°,{' '}
                {alphaScenario.coordinates.longitudeDeg.toFixed(1)}°
              </div>
            </div>
            <div className="p-3 bg-space-950/80 border border-white/[0.07] rounded-2xl">
              <div className="text-[10px] text-lunar-400 uppercase">Energy Output</div>
              <div className="text-amber-300 font-semibold mt-1 tabular-nums">
                {alphaScenario.summary.cumulativeEnergyKwh} kWh
              </div>
            </div>
            <div className="p-3 bg-space-950/80 border border-white/[0.07] rounded-2xl">
              <div className="text-[10px] text-lunar-400 uppercase">Viability</div>
              <div className="text-amber-300 font-bold mt-1 tabular-nums">
                {alphaScenario.summary.overallViabilityScore} / 100
              </div>
            </div>
          </div>
        </div>

        {/* CENTER SWAP ACTION */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={onSwapScenarios}
            className="px-4 py-3 rounded-2xl bg-space-900 hover:bg-space-800 border border-white/15 hover:border-amber-400/60 text-lunar-200 hover:text-amber-200 transition-all shadow-lg flex lg:flex-col items-center gap-1.5 font-mono text-[11px]"
            title="Swap Scenario Alpha and Scenario Bravo"
          >
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            <span>SWAP</span>
          </button>
        </div>

        {/* SCENARIO BRAVO CARD */}
        <div className="lg:col-span-5 lunaris-surface rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-0.5 bg-white/10 border border-white/20 text-lunar-100 font-mono text-[11px] font-bold rounded-full shrink-0">
                BRAVO
              </span>
              <h3 className="font-display text-base font-semibold text-lunar-50 truncate">
                {bravoScenario.matchedPresetSite?.name || 'Custom Coordinates'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleBravoRelay}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono border flex items-center gap-1 transition-colors ${
                  bravoScenario.commHardware.relaySatelliteEnabled
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-space-850 border-white/10 text-lunar-400 hover:text-white'
                }`}
                title="Toggle NRHO Relay Satellite exclusively for Scenario Bravo"
              >
                <Satellite className="w-3 h-3" />
                {bravoScenario.commHardware.relaySatelliteEnabled
                  ? 'RELAY ON'
                  : 'DTE ONLY'}
              </button>
              {!alphaWins && (
                <span className="text-[10px] font-mono px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 rounded-full flex items-center gap-1">
                  <Award className="w-3 h-3" /> HIGHER VIABILITY
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1.5">
                Landing Site
              </label>
              <select
                value={bravoScenario.matchedPresetSite?.id || ''}
                onChange={(e) => {
                  const found = candidateSites.find((s) => s.id === e.target.value);
                  if (found) onChangeBravoSite(found.coordinates);
                }}
                className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-2 text-xs text-lunar-100 outline-none"
              >
                {!bravoScenario.matchedPresetSite && (
                  <option value="">Custom Coordinates</option>
                )}
                {candidateSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-lunar-400 mb-1.5">
                Landing Epoch (UTC)
              </label>
              <input
                type="datetime-local"
                value={bravoScenario.timeConfig.epochIsoUtc.slice(0, 16)}
                onChange={(e) =>
                  e.target.value && onChangeBravoEpoch(`${e.target.value}:00Z`)
                }
                className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-2 text-xs font-mono text-lunar-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-lunar-400 mb-1.5">
                Stay Duration
              </label>
              <select
                value={bravoScenario.timeConfig.missionDurationDays}
                onChange={(e) => onChangeBravoDuration(parseInt(e.target.value, 10))}
                className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-2 text-xs text-lunar-100 outline-none"
              >
                <option value={7}>7 Earth Days (168h)</option>
                <option value={14}>14 Earth Days (336h)</option>
                <option value={28}>28 Earth Days (672h)</option>
                <option value={30}>30 Earth Days (720h)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1 font-mono text-xs">
            <div className="p-3 bg-space-950/80 border border-white/[0.07] rounded-2xl">
              <div className="text-[10px] text-lunar-400 uppercase">Coordinates</div>
              <div className="text-lunar-100 font-semibold mt-1 tabular-nums">
                {bravoScenario.coordinates.latitudeDeg.toFixed(2)}°,{' '}
                {bravoScenario.coordinates.longitudeDeg.toFixed(1)}°
              </div>
            </div>
            <div className="p-3 bg-space-950/80 border border-white/[0.07] rounded-2xl">
              <div className="text-[10px] text-lunar-400 uppercase">Energy Output</div>
              <div className="text-lunar-100 font-semibold mt-1 tabular-nums">
                {bravoScenario.summary.cumulativeEnergyKwh} kWh
              </div>
            </div>
            <div className="p-3 bg-space-950/80 border border-white/[0.07] rounded-2xl">
              <div className="text-[10px] text-lunar-400 uppercase">Viability</div>
              <div className="text-lunar-50 font-bold mt-1 tabular-nums">
                {bravoScenario.summary.overallViabilityScore} / 100
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Saved Scenario Snapshots Queue */}
      {savedSnapshots.length > 0 && (
        <ScrollReveal className="lunaris-surface rounded-2xl p-5 space-y-3">
          <div className="text-xs font-mono text-amber-300 uppercase tracking-wider font-semibold">
            Saved Mission Scenario Snapshots ({savedSnapshots.length}) — Click to Load into Bravo
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {savedSnapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 rounded-xl bg-space-950/80 border border-white/10 hover:border-amber-400/50 flex items-center justify-between gap-2 font-mono text-xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onLoadSnapshotToBravo(snap)}
                  className="text-left flex-1 truncate"
                >
                  <div className="text-lunar-100 font-semibold truncate">
                    {snap.scenario.matchedPresetSite?.name ||
                      `${snap.scenario.coordinates.latitudeDeg.toFixed(2)}°, ${snap.scenario.coordinates.longitudeDeg.toFixed(1)}°`}
                  </div>
                  <div className="text-[11px] text-lunar-400 mt-0.5">
                    {snap.scenario.timeConfig.epochIsoUtc.slice(0, 10)} ·{' '}
                    {snap.scenario.timeConfig.missionDurationDays}d · Score:{' '}
                    {snap.scenario.summary.overallViabilityScore}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSnapshot(snap.id)}
                  className="p-1.5 text-lunar-400 hover:text-rose-400 transition-colors"
                  aria-label="Delete snapshot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollReveal>
      )}

      {/* Quantitative Side-by-Side Trade Matrix Table */}
      <ScrollReveal className="lunaris-surface rounded-3xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <GitCompare className="w-4 h-4 text-amber-400" />
            <h3 className="font-display text-base font-semibold text-lunar-50">
              Quantitative Trade-Study Matrix &amp; Score Derivation
            </h3>
          </div>
          <span className="text-[11px] font-mono text-amber-300">
            ANALYTICAL EPHEMERIS + SYNTHETIC HORIZON MASK
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-space-950/60 text-[11px] text-lunar-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Mission Parameter</th>
                <th className="py-3.5 px-5 text-amber-300">
                  Scenario Alpha ({alphaScenario.matchedPresetSite?.code || 'CUSTOM'})
                </th>
                <th className="py-3.5 px-5 text-lunar-100">
                  Scenario Bravo ({bravoScenario.matchedPresetSite?.code || 'CUSTOM'})
                </th>
                <th className="py-3.5 px-5">Delta (Alpha − Bravo)</th>
                <th className="py-3.5 px-5">Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {[
                {
                  label: 'Solar Illumination Duty Cycle',
                  valA: `${alphaScenario.summary.solarAvailabilityPct}% (${alphaScenario.summary.totalIlluminatedHours}h)`,
                  valB: `${bravoScenario.summary.solarAvailabilityPct}% (${bravoScenario.summary.totalIlluminatedHours}h)`,
                  diff: Number(
                    (
                      alphaScenario.summary.solarAvailabilityPct -
                      bravoScenario.summary.solarAvailabilityPct
                    ).toFixed(1)
                  ),
                  unit: '%',
                  higherIsBetter: true,
                },
                {
                  label: 'Cumulative Electrical Energy Output',
                  valA: `${alphaScenario.summary.cumulativeEnergyKwh} kWh (Mean ${alphaScenario.summary.meanElectricalPowerWatts}W)`,
                  valB: `${bravoScenario.summary.cumulativeEnergyKwh} kWh (Mean ${bravoScenario.summary.meanElectricalPowerWatts}W)`,
                  diff: Number(
                    (
                      alphaScenario.summary.cumulativeEnergyKwh -
                      bravoScenario.summary.cumulativeEnergyKwh
                    ).toFixed(1)
                  ),
                  unit: ' kWh',
                  higherIsBetter: true,
                },
                {
                  label: 'Direct-to-Earth (DTE) Comm Availability',
                  valA: `${alphaScenario.summary.earthVisibilityPct}% (${alphaScenario.summary.totalDteCommHours}h)`,
                  valB: `${bravoScenario.summary.earthVisibilityPct}% (${bravoScenario.summary.totalDteCommHours}h)`,
                  diff: Number(
                    (
                      alphaScenario.summary.earthVisibilityPct -
                      bravoScenario.summary.earthVisibilityPct
                    ).toFixed(1)
                  ),
                  unit: '%',
                  higherIsBetter: true,
                },
                {
                  label: 'Effective Comm (DTE + NRHO Relay)',
                  valA: `${alphaScenario.summary.effectiveCommAvailabilityPct}%`,
                  valB: `${bravoScenario.summary.effectiveCommAvailabilityPct}%`,
                  diff: Number(
                    (
                      alphaScenario.summary.effectiveCommAvailabilityPct -
                      bravoScenario.summary.effectiveCommAvailabilityPct
                    ).toFixed(1)
                  ),
                  unit: '%',
                  higherIsBetter: true,
                },
                {
                  label: 'Longest Continuous Eclipse / Darkness',
                  valA: `${alphaScenario.summary.maxContinuousDarknessHours} hrs`,
                  valB: `${bravoScenario.summary.maxContinuousDarknessHours} hrs`,
                  diff:
                    alphaScenario.summary.maxContinuousDarknessHours -
                    bravoScenario.summary.maxContinuousDarknessHours,
                  unit: 'h',
                  higherIsBetter: false,
                },
                {
                  label: 'Mean Local Landing Slope Hazard',
                  valA: `${alphaScenario.summary.localSlopeDeg}°`,
                  valB: `${bravoScenario.summary.localSlopeDeg}°`,
                  diff: Number(
                    (
                      alphaScenario.summary.localSlopeDeg -
                      bravoScenario.summary.localSlopeDeg
                    ).toFixed(1)
                  ),
                  unit: '°',
                  higherIsBetter: false,
                },
                {
                  label: 'Reference Topographic Elevation',
                  valA: `${alphaScenario.summary.siteElevationMeters >= 0 ? '+' : ''}${alphaScenario.summary.siteElevationMeters} m`,
                  valB: `${bravoScenario.summary.siteElevationMeters >= 0 ? '+' : ''}${bravoScenario.summary.siteElevationMeters} m`,
                  diff:
                    alphaScenario.summary.siteElevationMeters -
                    bravoScenario.summary.siteElevationMeters,
                  unit: 'm',
                  higherIsBetter: true,
                },
                {
                  label: 'Simultaneous Sun + Direct-to-Earth Ops',
                  valA: `${alphaEvents.nominalHours} hrs`,
                  valB: `${bravoEvents.nominalHours} hrs`,
                  diff: alphaEvents.nominalHours - bravoEvents.nominalHours,
                  unit: 'h',
                  higherIsBetter: true,
                },
                {
                  label: 'Sunrise / Sunset Horizon Transitions',
                  valA: `${alphaEvents.sunRise} rise / ${alphaEvents.sunSet} set`,
                  valB: `${bravoEvents.sunRise} rise / ${bravoEvents.sunSet} set`,
                  diff:
                    alphaEvents.sunRise +
                    alphaEvents.sunSet -
                    (bravoEvents.sunRise + bravoEvents.sunSet),
                  unit: ' events',
                  higherIsBetter: false,
                },
                {
                  label: 'Earthrise / Earthset Horizon Transitions',
                  valA: `${alphaEvents.earthRise} rise / ${alphaEvents.earthSet} set`,
                  valB: `${bravoEvents.earthRise} rise / ${bravoEvents.earthSet} set`,
                  diff:
                    alphaEvents.earthRise +
                    alphaEvents.earthSet -
                    (bravoEvents.earthRise + bravoEvents.earthSet),
                  unit: ' events',
                  higherIsBetter: false,
                },
                {
                  label: 'Composite Mission Viability Score',
                  valA: `${alphaScenario.summary.overallViabilityScore} / 100`,
                  valB: `${bravoScenario.summary.overallViabilityScore} / 100`,
                  diff:
                    alphaScenario.summary.overallViabilityScore -
                    bravoScenario.summary.overallViabilityScore,
                  unit: ' pts',
                  higherIsBetter: true,
                },
              ].map((row) => {
                const alphaBetter = row.higherIsBetter ? row.diff > 0 : row.diff < 0;
                const tie = row.diff === 0;
                return (
                  <tr key={row.label} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 font-sans text-lunar-200 font-medium">
                      {row.label}
                    </td>
                    <td className="py-3.5 px-5 text-amber-200 tabular-nums">{row.valA}</td>
                    <td className="py-3.5 px-5 text-lunar-100 tabular-nums">{row.valB}</td>
                    <td className="py-3.5 px-5 tabular-nums text-lunar-300">
                      {row.diff > 0 ? `+${row.diff}` : row.diff}
                      {row.unit}
                    </td>
                    <td className="py-3.5 px-5">
                      {tie ? (
                        <span className="text-lunar-500">PARITY</span>
                      ) : alphaBetter ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-semibold">
                          ALPHA
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/25 text-lunar-100 text-[11px] font-semibold">
                          BRAVO
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Explicit Mathematical Score Derivation Box */}
        <div className="p-5 sm:p-6 bg-space-950/60 border-t border-white/[0.08] font-mono text-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <Calculator className="w-4 h-4" />
            <span>TRANSPARENT VIABILITY SCORE METHODOLOGY (SCREENING INDEX)</span>
          </div>
          <p className="text-xs text-lunar-300">
            <code>{alphaScenario.summary.scoreBreakdown.formulaExplanation}</code>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-space-900/90 border border-amber-500/30 rounded-2xl text-amber-200">
              <strong>ALPHA SCORE ({alphaScenario.summary.overallViabilityScore}/100):</strong>{' '}
              Solar ({alphaScenario.summary.scoreBreakdown.solarScoreComponent}) + Comm (
              {alphaScenario.summary.scoreBreakdown.commScoreComponent}) + Slope (
              {alphaScenario.summary.scoreBreakdown.slopeSafetyComponent}) + DarknessResilience (
              {alphaScenario.summary.scoreBreakdown.darknessResilienceComponent})
            </div>
            <div className="p-3.5 bg-space-900/90 border border-white/15 rounded-2xl text-lunar-200">
              <strong>BRAVO SCORE ({bravoScenario.summary.overallViabilityScore}/100):</strong>{' '}
              Solar ({bravoScenario.summary.scoreBreakdown.solarScoreComponent}) + Comm (
              {bravoScenario.summary.scoreBreakdown.commScoreComponent}) + Slope (
              {bravoScenario.summary.scoreBreakdown.slopeSafetyComponent}) + DarknessResilience (
              {bravoScenario.summary.scoreBreakdown.darknessResilienceComponent})
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Dual Overlaid Elevation Charts */}
      <ScrollReveal className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="lunaris-surface rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
            <span className="font-display text-sm font-semibold text-lunar-100 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              Solar Ridge Clearance Overlay (Alpha vs. Bravo)
            </span>
          </div>
          <div className="h-[240px] bg-space-950/80 p-3 rounded-2xl border border-white/[0.07]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedChartData}>
                <CartesianGrid stroke="#1d222d" strokeDasharray="3 3" />
                <XAxis
                  dataKey="hourOffset"
                  type="number"
                  domain={[0, chartMaxHour]}
                  tickCount={8}
                  tickFormatter={(v) => `T+${v}h`}
                  stroke="#7d8596"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  stroke="#7d8596"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v) => `${v}°`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090B0F',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                  labelFormatter={(label) => `T+${label}h`}
                />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="alphaSunClearance"
                  name="Alpha Sun Clearance (°)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="bravoSunClearance"
                  name="Bravo Sun Clearance (°)"
                  stroke="#e2e5ec"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lunaris-surface rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
            <span className="font-display text-sm font-semibold text-lunar-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-lunar-200" />
              Earth Ridge Clearance Overlay (Alpha vs. Bravo)
            </span>
          </div>
          <div className="h-[240px] bg-space-950/80 p-3 rounded-2xl border border-white/[0.07]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedChartData}>
                <CartesianGrid stroke="#1d222d" strokeDasharray="3 3" />
                <XAxis
                  dataKey="hourOffset"
                  type="number"
                  domain={[0, chartMaxHour]}
                  tickCount={8}
                  tickFormatter={(v) => `T+${v}h`}
                  stroke="#7d8596"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  stroke="#7d8596"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v) => `${v}°`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090B0F',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                  labelFormatter={(label) => `T+${label}h`}
                />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="alphaEarthClearance"
                  name="Alpha Earth Clearance (°)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="bravoEarthClearance"
                  name="Bravo Earth Clearance (°)"
                  stroke="#e2e5ec"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};
