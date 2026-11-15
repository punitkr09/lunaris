import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Mountain } from 'lucide-react';
import { MissionScenarioData } from '../types/navigation';

interface TerrainSummaryCardProps {
  scenario: MissionScenarioData;
}

export const TerrainSummaryCard: React.FC<TerrainSummaryCardProps> = ({ scenario }) => {
  const [expanded, setExpanded] = useState(false);
  const { matchedPresetSite, summary } = scenario;

  const slopeOk = summary.localSlopeDeg <= 10;
  const plainSummary = slopeOk
    ? `Estimated ${summary.localSlopeDeg}° mean slope is within typical 10° lander touchdown limits.`
    : `Estimated ${summary.localSlopeDeg}° mean slope exceeds typical 10° lander touchdown limits.`;

  return (
    <section className="lunaris-surface rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <Mountain className="w-4 h-4 text-lunar-200" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-lunar-100">Terrain</h3>
            <p className="text-[11px] text-lunar-400">Elevation &amp; surface relief</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">
          Synthetic Horizon
        </span>
      </div>

      <p className="text-xs text-lunar-300 leading-relaxed">{plainSummary}</p>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">Elevation</div>
          <div className="text-sm font-semibold text-lunar-100 font-mono tabular-nums mt-0.5">
            {summary.siteElevationMeters >= 0 ? '+' : ''}
            {summary.siteElevationMeters} m
          </div>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">Mean Slope</div>
          <div
            className={`text-sm font-semibold font-mono tabular-nums mt-0.5 ${
              slopeOk ? 'text-lunar-100' : 'text-amber-300'
            }`}
          >
            {summary.localSlopeDeg}°
          </div>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">Roughness</div>
          <div className="text-sm font-semibold text-lunar-200 mt-0.5 capitalize">
            {matchedPresetSite
              ? matchedPresetSite.terrainRoughnessLabel.toLowerCase()
              : 'estimated'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center justify-between text-xs text-lunar-400 hover:text-lunar-200 pt-1 border-t border-white/[0.06] transition-colors"
      >
        <span>Surface notes &amp; confidence</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2 text-xs text-lunar-300 leading-relaxed pt-1">
          {matchedPresetSite ? (
            <>
              <p>{matchedPresetSite.elevationExplanation}</p>
              <p className="text-lunar-400">{matchedPresetSite.slopeExplanation}</p>
              {matchedPresetSite.psrDistanceKm !== null && (
                <p className="text-amber-300/90 font-mono text-[11px]">
                  Nearest Permanently Shadowed Region: ~{matchedPresetSite.psrDistanceKm} km
                </p>
              )}
              <p className="text-[11px] text-lunar-400">
                Source: {matchedPresetSite.dataSourceAttribution}
              </p>
            </>
          ) : (
            <p className="text-lunar-400">
              Custom coordinates use a parametric elevation &amp; slope estimate (±1.5° horizon uncertainty). Mount LRO LOLA DEM tiles for site-specific terrain validation.
            </p>
          )}
        </div>
      )}
    </section>
  );
};
