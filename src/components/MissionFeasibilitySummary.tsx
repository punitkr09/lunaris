import React from 'react';
import {
  Sun,
  Radio,
  Mountain,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { MissionScenarioData, UserExperienceMode } from '../types/navigation';
import { HORIZON_MASK_UNCERTAINTY_DEG } from '../science/lunarMath';
import { NasaLunarImagePlate } from './NasaLunarImagePlate';

interface MissionFeasibilitySummaryProps {
  scenario: MissionScenarioData;
  uxMode?: UserExperienceMode;
}

type ConstraintVerdict = 'FAVORABLE' | 'MARGINAL' | 'CHALLENGING';

function badgeForVerdict(verdict: ConstraintVerdict) {
  if (verdict === 'FAVORABLE') {
    return {
      label: 'FAVORABLE',
      cls: 'border-emerald-500/35 bg-emerald-500/12 text-emerald-300',
    };
  }
  if (verdict === 'MARGINAL') {
    return {
      label: 'MARGINAL · REQUIRES MITIGATION',
      cls: 'border-amber-500/35 bg-amber-500/12 text-amber-300',
    };
  }
  return {
    label: 'CHALLENGING · HIGH RISK',
    cls: 'border-rose-500/35 bg-rose-500/12 text-rose-300',
  };
}

export const MissionFeasibilitySummary: React.FC<MissionFeasibilitySummaryProps> = ({
  scenario,
  uxMode = 'MISSION_PLANNER',
}) => {
  const {
    matchedPresetSite,
    coordinates,
    instantaneousSun,
    instantaneousEarth,
    summary,
    timeConfig,
    solarHardware,
  } = scenario;

  const siteName = matchedPresetSite?.name || 'Custom Selenographic Site';
  const totalWindowHours = timeConfig.missionDurationDays * 24;
  const isGuided = uxMode === 'EDUCATOR';

  // 1. Power Feasibility Assessment
  const powerVerdict: ConstraintVerdict =
    summary.solarAvailabilityPct >= 75 && summary.maxContinuousDarknessHours <= 36
      ? 'FAVORABLE'
      : summary.solarAvailabilityPct >= 45 && summary.maxContinuousDarknessHours <= 96
        ? 'MARGINAL'
        : 'CHALLENGING';

  // 2. Communication Feasibility Assessment
  const commVerdict: ConstraintVerdict =
    summary.earthVisibilityPct >= 75
      ? 'FAVORABLE'
      : summary.earthVisibilityPct >= 35
        ? 'MARGINAL'
        : 'CHALLENGING';

  // 3. Terrain Constraint Assessment
  const terrainVerdict: ConstraintVerdict =
    summary.localSlopeDeg <= 7
      ? 'FAVORABLE'
      : summary.localSlopeDeg <= 12
        ? 'MARGINAL'
        : 'CHALLENGING';

  // 4. Temporal Operational Window Assessment
  const nominalPct =
    totalWindowHours > 0 ? (summary.nominalOpsHours / totalWindowHours) * 100 : 0;
  const temporalVerdict: ConstraintVerdict =
    nominalPct >= 65 && summary.criticalBlackoutHours <= 12
      ? 'FAVORABLE'
      : nominalPct >= 30 && summary.criticalBlackoutHours <= 72
        ? 'MARGINAL'
        : 'CHALLENGING';

  // Determine Primary Limiting Factor transparently without opaque universal score
  const limitingFactors: { domain: string; reason: string; severity: number }[] = [];
  if (summary.maxContinuousDarknessHours > 48) {
    limitingFactors.push({
      domain: 'Eclipse Energy Storage',
      reason: `Max continuous shadow lasts ${summary.maxContinuousDarknessHours}h (${(summary.maxContinuousDarknessHours / 24).toFixed(1)} Earth days), requiring high-capacity battery or radioisotope thermal survival.`,
      severity: summary.maxContinuousDarknessHours > 96 ? 3 : 2,
    });
  }
  if (summary.earthVisibilityPct < 60) {
    limitingFactors.push({
      domain: 'Direct-to-Earth RF Line-of-Sight',
      reason: `Direct Earth visibility is available for ${summary.earthVisibilityPct.toFixed(1)}% of the ${timeConfig.missionDurationDays}-day window (${summary.totalDteCommHours}h / ${totalWindowHours}h); local topographic ridges or far-side geometry require an orbital relay during occultation.`,
      severity: summary.earthVisibilityPct < 25 ? 3 : 2,
    });
  }
  if (summary.localSlopeDeg > 8) {
    limitingFactors.push({
      domain: 'Touchdown Slope Envelope',
      reason: `Local slope is ${summary.localSlopeDeg.toFixed(1)}°, approaching typical 10°–12° lander touchdown stability limits.`,
      severity: summary.localSlopeDeg > 12 ? 3 : 2,
    });
  }
  if (limitingFactors.length === 0) {
    limitingFactors.push({
      domain: 'Low Grazing Solar Incidence Angle',
      reason: `Site meets baseline illumination (${summary.solarAvailabilityPct.toFixed(1)}%), DTE visibility (${summary.earthVisibilityPct.toFixed(1)}%), and slope (${summary.localSlopeDeg.toFixed(1)}°) criteria; primary operational discipline is vertical mast-array alignment for ${instantaneousSun.elevationDeg.toFixed(2)}° solar elevation.`,
      severity: 1,
    });
  }
  limitingFactors.sort((a, b) => b.severity - a.severity);
  const primaryLimiter = limitingFactors[0];

  const powerBadge = badgeForVerdict(powerVerdict);
  const commBadge = badgeForVerdict(commVerdict);
  const terrainBadge = badgeForVerdict(terrainVerdict);
  const temporalBadge = badgeForVerdict(temporalVerdict);

  return (
    <section
      id="stage-feasibility"
      aria-label="Mission Feasibility and Constraint Summary"
      className="lunaris-glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08]"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.07]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-400/30">
              <Compass className="w-3.5 h-3.5" />
              Core Mission Question · CAN WE LAND HERE?
            </span>
            <span className="text-xs font-mono text-slate-400">
              {siteName} ({coordinates.latitudeDeg.toFixed(2)}°, {coordinates.longitudeDeg.toFixed(2)}°) · Epoch {timeConfig.epochIsoUtc.slice(0, 16).replace('T', ' ')} UTC
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Multi-Domain Mission Feasibility &amp; Constraint Matrix
          </h3>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl">
            {isGuided
              ? 'Lunar landing decisions cannot be reduced to a single magic score. Engineers evaluate sunlight for power, Earth visibility for radio contact, surface slope for safe touchdown, and how those windows overlap over time.'
              : 'Transparent subsystem constraint breakdown separating Power, Direct-to-Earth RF, Topographic Slope, Temporal Overlap, and Data Provenance confidence across the selected mission window.'}
          </p>
        </div>

        {/* Primary Limiting Factor Callout */}
        <div className="rounded-2xl bg-slate-950/90 border border-amber-400/30 px-4 py-3 lg:max-w-md shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-amber-300 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Primary Limiting Factor · {primaryLimiter.domain}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{primaryLimiter.reason}</p>
        </div>
      </div>

      {/* 4 Core Feasibility Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {/* 1. Power Feasibility */}
        <div className="group rounded-2xl bg-slate-900/65 border border-white/[0.07] overflow-hidden flex flex-col justify-between">
          <NasaLunarImagePlate
            variant="SHACKLETON_RIDGE_SUNLIGHT"
            className="h-28 w-full"
            overlayTag="SOLAR POWER · GRAZING SUN"
          />
          <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-amber-300">
                <Sun className="w-4 h-4 text-amber-400" />
                1. Power Feasibility
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${powerBadge.cls}`}>
                {powerBadge.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/[0.05]">
                <div className="text-[11px] text-slate-400">Sunlit Window</div>
                <div className="text-base font-mono font-semibold text-white mt-0.5">
                  {summary.solarAvailabilityPct.toFixed(1)}%
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {summary.totalIlluminatedHours}h / {totalWindowHours}h
                </div>
              </div>
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/[0.05]">
                <div className="text-[11px] text-slate-400">Max Darkness</div>
                <div className="text-base font-mono font-semibold text-white mt-0.5">
                  {summary.maxContinuousDarknessHours}h
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Cumulative {summary.cumulativeEnergyKwh.toFixed(0)} kWh
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed border-t border-white/[0.06] pt-2.5">
            Instantaneous array output: <span className="font-mono text-white">{instantaneousSun.estimatedElectricalPowerWatts.toFixed(0)} W</span> ({solarHardware.trackingMode.replace(/_/g, ' ')}). Sunrise/Sunset transitions: <span className="font-mono text-amber-300">{summary.sunriseCount} rise / {summary.sunsetCount} set</span>.
          </p>
          </div>
        </div>

        {/* 2. Communication Feasibility */}
        <div className="group rounded-2xl bg-slate-900/65 border border-white/[0.07] overflow-hidden flex flex-col justify-between">
          <NasaLunarImagePlate
            variant="HERO_SOUTH_POLE_HORIZON"
            className="h-28 w-full"
            overlayTag="EARTH RF LINK · LRO EARTHRISE"
          />
          <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-300">
                <Radio className="w-4 h-4 text-sky-400" />
                2. Comm Feasibility
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${commBadge.cls}`}>
                {commBadge.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/[0.05]">
                <div className="text-[11px] text-slate-400">Direct-to-Earth</div>
                <div className="text-base font-mono font-semibold text-white mt-0.5">
                  {summary.earthVisibilityPct.toFixed(1)}%
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {summary.totalDteCommHours}h / {totalWindowHours}h
                </div>
              </div>
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/[0.05]">
                <div className="text-[11px] text-slate-400">Earth Clearance</div>
                <div className="text-base font-mono font-semibold text-white mt-0.5">
                  {instantaneousEarth.horizonClearanceDeg >= 0 ? '+' : ''}
                  {instantaneousEarth.horizonClearanceDeg.toFixed(2)}°
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Az {instantaneousEarth.azimuthDeg.toFixed(1)}°
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed border-t border-white/[0.06] pt-2.5">
            Optical libration: <span className="font-mono text-white">({instantaneousEarth.librationLongitudeDeg.toFixed(1)}°, {instantaneousEarth.librationLatitudeDeg.toFixed(1)}°)</span>. Earthrise/Earthset transitions: <span className="font-mono text-sky-300">{summary.earthriseCount} rise / {summary.earthsetCount} set</span>.
          </p>
          </div>
        </div>

        {/* 3. Terrain Constraints */}
        <div className="group rounded-2xl bg-slate-900/65 border border-white/[0.07] overflow-hidden flex flex-col justify-between">
          <NasaLunarImagePlate
            variant="LOLA_SLOPE_TERRAIN"
            className="h-28 w-full"
            overlayTag="TOPOGRAPHY · LRO NAC SCARP"
          />
          <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-200">
                <Mountain className="w-4 h-4 text-slate-300" />
                3. Terrain Constraints
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${terrainBadge.cls}`}>
                {terrainBadge.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/[0.05]">
                <div className="text-[11px] text-slate-400">Surface Slope</div>
                <div className="text-base font-mono font-semibold text-white mt-0.5">
                  {summary.localSlopeDeg.toFixed(1)}°
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Touchdown Limit ≤10°
                </div>
              </div>
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/[0.05]">
                <div className="text-[11px] text-slate-400">
                  {matchedPresetSite ? 'Elevation (Published Ref.)' : 'Elevation (Estimated)'}
                </div>
                <div className="text-base font-mono font-semibold text-white mt-0.5">
                  {summary.siteElevationMeters >= 0 ? '+' : ''}
                  {summary.siteElevationMeters} m
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  MOON_ME 1737.4 km
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed border-t border-white/[0.06] pt-2.5">
            Local horizon ridge at Sun azimuth blocks below <span className="font-mono text-white">{instantaneousSun.localHorizonMaskDeg.toFixed(2)}°</span> (synthetic mask, ±{HORIZON_MASK_UNCERTAINTY_DEG}° uncertainty).
          </p>
          </div>
        </div>

        {/* 4. Temporal Operational Windows */}
        <div className="group rounded-2xl bg-slate-900/65 border border-white/[0.07] overflow-hidden flex flex-col justify-between">
          <NasaLunarImagePlate
            variant="SYNODIC_SOLAR_CYCLE"
            className="h-28 w-full"
            overlayTag="TEMPORAL WINDOWS · HLS OPS"
          />
          <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-300">
                <Clock className="w-4 h-4 text-emerald-400" />
                4. Temporal Windows
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${temporalBadge.cls}`}>
                {temporalBadge.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/[0.05]">
                <div className="text-[11px] text-slate-400">Simultaneous Sun+DTE</div>
                <div className="text-base font-mono font-semibold text-emerald-300 mt-0.5">
                  {summary.nominalOpsHours}h
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {nominalPct.toFixed(1)}% of mission
                </div>
              </div>
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/[0.05]">
                <div className="text-[11px] text-slate-400">Dual Blackout</div>
                <div className="text-base font-mono font-semibold text-rose-300 mt-0.5">
                  {summary.criticalBlackoutHours}h
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  No Sun &amp; No DTE
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed border-t border-white/[0.06] pt-2.5">
            Solar-Only (Relay Required): <span className="font-mono text-amber-300">{summary.solarOnlyHours}h</span> · Eclipse w/ DTE Comm: <span className="font-mono text-sky-300">{summary.eclipseDteHours}h</span>.
          </p>
          </div>
        </div>
      </div>

      {/* 5. Scientific Data Confidence & Provenance Strip */}
      <div className="mt-5 rounded-2xl bg-slate-950/80 border border-white/[0.06] p-4 flex flex-col gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-sky-300">
              5. Scientific Data Confidence &amp; Epistemic Provenance
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              LUNARIS separates measured topographic inputs from analytical orbital mechanics and engineering assumptions so mission planners know the exact epistemic confidence of every constraint.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            {matchedPresetSite
              ? 'PUBLISHED: NASA/IAU site coordinates & reference elevation'
              : 'MEASURED (GLOBAL): LRO LROC + LOLA 4K maps on 3D Moon'}
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/25">
            COMPUTED: Analytical Selenographic Sun &amp; Earth Libration
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/25">
            ASSUMED: {solarHardware.arrayAreaM2}m² Array ({Math.round(solarHardware.cellEfficiencyPct)}% eff)
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/25">
            PROXY: 72-Bin Parametric Horizon (±{HORIZON_MASK_UNCERTAINTY_DEG}° band)
          </span>
        </div>
      </div>
    </section>
  );
};
