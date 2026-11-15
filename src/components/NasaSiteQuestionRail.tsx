import React, { useState } from 'react';
import { ChevronDown, Mountain, Radio, Sun } from 'lucide-react';
import {
  CommHardwareConfig,
  MissionScenarioData,
  SolarHardwareConfig,
  UserExperienceMode,
} from '../types/navigation';
import { SunElevationPanel } from './SunElevationPanel';
import { EarthVisibilityPanel } from './EarthVisibilityPanel';
import { TerrainSummaryCard } from './TerrainSummaryCard';

interface NasaSiteQuestionRailProps {
  scenario: MissionScenarioData;
  solarHardware: SolarHardwareConfig;
  commHardware: CommHardwareConfig;
  uxMode: UserExperienceMode;
  expandAllGlobal: boolean;
  onChangeSolarHardware: (cfg: SolarHardwareConfig) => void;
  onChangeCommHardware: (cfg: CommHardwareConfig) => void;
}

export const NasaSiteQuestionRail: React.FC<NasaSiteQuestionRailProps> = ({
  scenario,
  solarHardware,
  commHardware,
  uxMode,
  expandAllGlobal,
  onChangeSolarHardware,
  onChangeCommHardware,
}) => {
  const [openKey, setOpenKey] = useState<'SUN' | 'EARTH' | 'TERRAIN' | null>(null);

  const isSunOpen = expandAllGlobal || openKey === 'SUN';
  const isEarthOpen = expandAllGlobal || openKey === 'EARTH';
  const isTerrainOpen = expandAllGlobal || openKey === 'TERRAIN';

  const { instantaneousSun, instantaneousEarth, summary } = scenario;

  return (
    <div id="stage-questions" className="space-y-4">
      {/* Clean Header Card */}
      <div className="nasa-card rounded-2xl p-5 sm:p-6 space-y-2">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-xs font-medium text-sky-300">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Site Questions
        </span>
        <h3 className="text-lg sm:text-xl font-bold text-white leading-snug pt-1">
          Explore{' '}
          <span className="text-sky-300">
            {scenario.matchedPresetSite?.name || 'Selected Site'}
          </span>
        </h3>
        <p className="text-sm text-lunar-300 leading-relaxed">
          Select any question below to inspect sunlight, Earth communication, and surface slope for this landing zone.
        </p>
      </div>

      {/* QUESTION 1: SUNLIGHT & SOLAR POWER */}
      <div
        className={`group nasa-card-interactive rounded-2xl overflow-hidden transition-all ${
          isSunOpen ? 'ring-1 ring-amber-400/50' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setOpenKey(openKey === 'SUN' ? null : 'SUN')}
          aria-expanded={isSunOpen}
          className="w-full p-5 sm:p-6 text-left flex flex-col gap-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/12 border border-amber-400/30 text-xs font-medium text-amber-300">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Sunlight &amp; Power
            </span>

            <span className="nasa-red-circle w-8 h-8 shrink-0">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  isSunOpen ? 'rotate-180' : ''
                }`}
              />
            </span>
          </div>

          <h4 className="text-base sm:text-lg font-semibold text-white leading-snug">
            Does this site get enough sunlight to power the lander?
          </h4>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-medium text-amber-300">
              {instantaneousSun.status === 'ILLUMINATED'
                ? `Sunlit now (${instantaneousSun.elevationDeg.toFixed(1)}° · ${instantaneousSun.estimatedElectricalPowerWatts}W)`
                : instantaneousSun.status === 'GRAZING_PENUMBRA'
                ? `Grazing sun (${instantaneousSun.estimatedElectricalPowerWatts}W)`
                : 'Currently in shadow (0W)'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-lunar-200">
              {summary.solarAvailabilityPct}% sunlight over mission
            </span>
          </div>
        </button>

        {isSunOpen && (
          <div className="p-4 pt-0 border-t border-white/10 bg-black/40">
            <SunElevationPanel
              scenario={scenario}
              solarHardware={solarHardware}
              uxMode={uxMode}
              onChangeSolarHardware={onChangeSolarHardware}
            />
          </div>
        )}
      </div>

      {/* QUESTION 2: EARTH RADIO CONTACT */}
      <div
        className={`group nasa-card-interactive rounded-2xl overflow-hidden transition-all ${
          isEarthOpen ? 'ring-1 ring-sky-400/50' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setOpenKey(openKey === 'EARTH' ? null : 'EARTH')}
          aria-expanded={isEarthOpen}
          className="w-full p-5 sm:p-6 text-left flex flex-col gap-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/12 border border-sky-400/30 text-xs font-medium text-sky-300">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              Earth Communication
            </span>

            <span className="nasa-red-circle w-8 h-8 shrink-0">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  isEarthOpen ? 'rotate-180' : ''
                }`}
              />
            </span>
          </div>

          <h4 className="text-base sm:text-lg font-semibold text-white leading-snug">
            Can astronauts communicate directly with Earth from here?
          </h4>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${
                instantaneousEarth.isDteOperational
                  ? 'bg-emerald-500/12 border-emerald-400/30 text-emerald-300'
                  : instantaneousEarth.isRelayOperational
                  ? 'bg-amber-500/12 border-amber-400/30 text-amber-300'
                  : 'bg-rose-500/12 border-rose-400/30 text-rose-300'
              }`}
            >
              {instantaneousEarth.isDteOperational
                ? `Direct link active (${instantaneousEarth.elevationDeg.toFixed(1)}° El)`
                : instantaneousEarth.isRelayOperational
                ? 'Relay satellite active'
                : 'Blocked by mountain ridge'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-lunar-200">
              {summary.earthVisibilityPct}% Earth visibility
            </span>
          </div>
        </button>

        {isEarthOpen && (
          <div className="p-4 pt-0 border-t border-white/10 bg-black/40">
            <EarthVisibilityPanel
              scenario={scenario}
              commHardware={commHardware}
              uxMode={uxMode}
              onChangeCommHardware={onChangeCommHardware}
            />
          </div>
        )}
      </div>

      {/* QUESTION 3: TERRAIN SLOPE & ELEVATION */}
      <div
        className={`group nasa-card-interactive rounded-2xl overflow-hidden transition-all ${
          isTerrainOpen ? 'ring-1 ring-white/40' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setOpenKey(openKey === 'TERRAIN' ? null : 'TERRAIN')}
          aria-expanded={isTerrainOpen}
          className="w-full p-5 sm:p-6 text-left flex flex-col gap-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.07] border border-white/15 text-xs font-medium text-lunar-100">
              <Mountain className="w-3.5 h-3.5 text-sky-300" />
              Terrain &amp; Safety
            </span>

            <span className="nasa-red-circle w-8 h-8 shrink-0">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  isTerrainOpen ? 'rotate-180' : ''
                }`}
              />
            </span>
          </div>

          <h4 className="text-base sm:text-lg font-semibold text-white leading-snug">
            Is the ground flat and safe enough for a lunar lander?
          </h4>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${
                summary.localSlopeDeg <= 10
                  ? 'bg-emerald-500/12 border-emerald-400/30 text-emerald-300'
                  : 'bg-amber-500/12 border-amber-400/30 text-amber-300'
              }`}
            >
              {summary.localSlopeDeg}° slope ({summary.localSlopeDeg <= 10 ? 'Safe <10° limit' : 'Steep terrain'})
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-lunar-200">
              Elevation {summary.siteElevationMeters >= 0 ? '+' : ''}
              {summary.siteElevationMeters} m
            </span>
          </div>
        </button>

        {isTerrainOpen && (
          <div className="p-4 pt-0 border-t border-white/10 bg-black/40">
            <TerrainSummaryCard scenario={scenario} />
          </div>
        )}
      </div>
    </div>
  );
};
