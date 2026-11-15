import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Settings2,
  Sun,
  Sunrise,
  Sunset,
  Zap,
} from 'lucide-react';
import {
  MissionScenarioData,
  SolarHardwareConfig,
  UserExperienceMode,
} from '../types/navigation';

interface SunElevationPanelProps {
  scenario: MissionScenarioData;
  solarHardware: SolarHardwareConfig;
  uxMode: UserExperienceMode;
  onChangeSolarHardware: (cfg: SolarHardwareConfig) => void;
}

export const SunElevationPanel: React.FC<SunElevationPanelProps> = ({
  scenario,
  solarHardware,
  uxMode,
  onChangeSolarHardware,
}) => {
  const [showHardwareConfig, setShowHardwareConfig] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { instantaneousSun, horizonProfile360, summary } = scenario;

  const isIlluminated = instantaneousSun.status === 'ILLUMINATED';
  const isGrazing = instantaneousSun.status === 'GRAZING_PENUMBRA';

  const plainLanguageStatus = isIlluminated
    ? `Full sunlight — the Sun is ${instantaneousSun.horizonClearanceDeg.toFixed(1)}° above the local horizon.`
    : isGrazing
    ? `Partial grazing light — ${(instantaneousSun.visibleSolarDiscFraction * 100).toFixed(0)}% of the solar disc clears the ridge.`
    : instantaneousSun.elevationDeg <= 0
    ? `In lunar night — the Sun is ${Math.abs(instantaneousSun.elevationDeg).toFixed(1)}° below the horizon.`
    : `In terrain shadow — the Sun is blocked by a ${instantaneousSun.localHorizonMaskDeg.toFixed(1)}° surrounding ridge.`;

  // Build SVG path for 360° Local Topographic Horizon Mask vs Sun Position
  const svgWidth = 340;
  const svgHeight = 86;
  const minEl = -6;
  const maxEl = 14;

  const mapAzToX = (az: number) => (az / 360) * svgWidth;
  const mapElToY = (el: number) => {
    const clamped = Math.max(minEl, Math.min(maxEl, el));
    return svgHeight - ((clamped - minEl) / (maxEl - minEl)) * svgHeight;
  };

  const horizonPolygonPoints = [
    `0,${svgHeight}`,
    ...horizonProfile360.map(
      (s) => `${mapAzToX(s.azimuthDeg).toFixed(1)},${mapElToY(s.horizonElevationDeg).toFixed(1)}`
    ),
    `${svgWidth},${mapElToY(horizonProfile360[0]?.horizonElevationDeg ?? 0).toFixed(1)}`,
    `${svgWidth},${svgHeight}`,
  ].join(' ');

  const horizonLinePoints = [
    ...horizonProfile360.map(
      (s) => `${mapAzToX(s.azimuthDeg).toFixed(1)},${mapElToY(s.horizonElevationDeg).toFixed(1)}`
    ),
    `${svgWidth},${mapElToY(horizonProfile360[0]?.horizonElevationDeg ?? 0).toFixed(1)}`,
  ].join(' ');

  const sunX = mapAzToX(instantaneousSun.azimuthDeg);
  const sunY = mapElToY(instantaneousSun.elevationDeg);
  const zeroHorizonY = mapElToY(0);

  return (
    <section className="lunaris-surface rounded-2xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-center">
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-lunar-100">Sunlight</h3>
            <p className="text-[11px] text-lunar-400">Solar illumination &amp; power</p>
          </div>
        </div>

        <span
          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
            isIlluminated
              ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
              : isGrazing
              ? 'bg-amber-500/15 border-amber-400/35 text-amber-300'
              : 'bg-white/[0.05] border-white/15 text-lunar-300'
          }`}
        >
          {isIlluminated ? 'Illuminated' : isGrazing ? 'Grazing Light' : 'In Shadow'}
        </span>
      </div>

      {/* Plain-Language Summary */}
      <p className="text-xs text-lunar-200 leading-relaxed">{plainLanguageStatus}</p>

      {uxMode === 'EDUCATOR' && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
          At the South Pole, the Sun skims horizontally near the horizon. Vertical solar masts capture far more light than flat rooftop panels.
        </div>
      )}

      {/* Primary Key Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">Sun Elevation</div>
          <div className="text-sm font-semibold text-amber-300 font-mono tabular-nums mt-0.5">
            {instantaneousSun.elevationDeg > 0 ? '+' : ''}
            {instantaneousSun.elevationDeg.toFixed(1)}°
          </div>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">Est. Power</div>
          <div className="text-sm font-semibold text-lunar-100 font-mono tabular-nums mt-0.5">
            {instantaneousSun.estimatedElectricalPowerWatts} W
          </div>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">Window Duty</div>
          <div className="text-sm font-semibold text-lunar-100 font-mono tabular-nums mt-0.5">
            {summary.solarAvailabilityPct}%
          </div>
        </div>
      </div>

      {/* Transition & Mean Energy Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-lunar-400 px-3 py-2 rounded-xl bg-space-950/60 border border-white/[0.06]">
        <span className="inline-flex items-center gap-1.5">
          {instantaneousSun.nextTransitionType === 'SUNSET_OCCULTATION' ? (
            <Sunset className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Sunrise className="w-3.5 h-3.5 text-amber-300" />
          )}
          Next {instantaneousSun.nextTransitionType === 'SUNSET_OCCULTATION' ? 'shadow' : 'sunlight'}:{' '}
          <strong className="text-lunar-200 font-mono">
            {instantaneousSun.transitionWithinWindow
              ? `~${instantaneousSun.hoursToNextTransition}h`
              : 'none in window'}
          </strong>
        </span>
        <span className="inline-flex items-center gap-1 font-mono">
          <Zap className="w-3 h-3 text-amber-400" />
          {summary.cumulativeEnergyKwh} kWh window
        </span>
      </div>

      {/* Expandable Technical Details + Array Hardware Config */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="inline-flex items-center gap-1.5 text-xs text-lunar-400 hover:text-lunar-200 transition-colors"
        >
          <span>Horizon &amp; solar details</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => setShowHardwareConfig((v) => !v)}
          aria-expanded={showHardwareConfig}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            showHardwareConfig
              ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
              : 'bg-space-850 border-white/10 text-lunar-300 hover:text-white'
          }`}
        >
          <Settings2 className="w-3 h-3" />
          Array Config
        </button>
      </div>

      {showHardwareConfig && (
        <div className="p-3 rounded-xl bg-space-950/80 border border-white/10 space-y-3 text-xs">
          <div>
            <div className="text-[11px] text-lunar-400 mb-1.5">Tracking Mode</div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'VERTICAL_1AXIS_AZIMUTH', label: '1-Axis Mast' },
                { id: 'DUAL_AXIS_SUN_TRACKING', label: '2-Axis Track' },
                { id: 'FIXED_ORIENTATION', label: 'Fixed' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onChangeSolarHardware({
                      ...solarHardware,
                      trackingMode: m.id as SolarHardwareConfig['trackingMode'],
                    })
                  }
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                    solarHardware.trackingMode === m.id
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                      : 'bg-space-900 border-white/10 text-lunar-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1">
                Panel Tilt ({solarHardware.panelTiltDeg}°)
              </label>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={solarHardware.panelTiltDeg}
                onChange={(e) =>
                  onChangeSolarHardware({
                    ...solarHardware,
                    panelTiltDeg: parseInt(e.target.value, 10),
                  })
                }
                className="w-full cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1">
                Fixed Azimuth ({solarHardware.panelAzimuthDeg}°)
              </label>
              <input
                type="range"
                min={0}
                max={355}
                step={5}
                disabled={solarHardware.trackingMode !== 'FIXED_ORIENTATION'}
                value={solarHardware.panelAzimuthDeg}
                onChange={(e) =>
                  onChangeSolarHardware({
                    ...solarHardware,
                    panelAzimuthDeg: parseInt(e.target.value, 10),
                  })
                }
                className="w-full cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1">Area (m²)</label>
              <input
                type="number"
                min={1}
                max={200}
                step={1}
                value={solarHardware.arrayAreaM2}
                onChange={(e) =>
                  onChangeSolarHardware({
                    ...solarHardware,
                    arrayAreaM2: Math.max(1, parseFloat(e.target.value) || 12),
                  })
                }
                className="w-full bg-space-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-lunar-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1">Eff (%)</label>
              <input
                type="number"
                min={10}
                max={45}
                step={1}
                value={solarHardware.cellEfficiencyPct}
                onChange={(e) =>
                  onChangeSolarHardware({
                    ...solarHardware,
                    cellEfficiencyPct: Math.max(5, Math.min(50, parseFloat(e.target.value) || 30)),
                  })
                }
                className="w-full bg-space-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-lunar-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1">Derating</label>
              <input
                type="number"
                min={0.5}
                max={1.0}
                step={0.02}
                value={solarHardware.systemDeratingFactor}
                onChange={(e) =>
                  onChangeSolarHardware({
                    ...solarHardware,
                    systemDeratingFactor: Math.max(
                      0.4,
                      Math.min(1, parseFloat(e.target.value) || 0.86)
                    ),
                  })
                }
                className="w-full bg-space-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-lunar-100 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {showDetails && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-xl bg-space-950/70 border border-white/[0.06]">
              <span className="text-lunar-400 block">Azimuth / Mask</span>
              <span className="text-lunar-200">
                {instantaneousSun.azimuthDeg.toFixed(1)}° / {instantaneousSun.localHorizonMaskDeg.toFixed(1)}°
              </span>
            </div>
            <div className="p-2 rounded-xl bg-space-950/70 border border-white/[0.06]">
              <span className="text-lunar-400 block">Disc / Cosine</span>
              <span className="text-lunar-200">
                {(instantaneousSun.visibleSolarDiscFraction * 100).toFixed(0)}% /{' '}
                {instantaneousSun.cosineProjectionFactor.toFixed(2)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-space-950/70 border border-white/[0.06]">
              <span className="text-lunar-400 block">POA Irradiance</span>
              <span className="text-lunar-200">
                {instantaneousSun.planeOfArrayIrradianceWm2} W/m²
              </span>
            </div>
            <div className="p-2 rounded-xl bg-space-950/70 border border-white/[0.06]">
              <span className="text-lunar-400 block">Power Uncertainty</span>
              <span className="text-amber-300">
                ±{instantaneousSun.powerUncertaintyWatts} W
              </span>
            </div>
          </div>

          {/* 360° Synthetic Horizon Mask Visualizer */}
          <div className="p-2.5 rounded-xl bg-space-950/80 border border-white/[0.07] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-lunar-400">
              <span>360° Horizon Mask (Synthetic Proxy)</span>
              <span className="text-amber-300">
                Az {instantaneousSun.azimuthDeg.toFixed(0)}°
              </span>
            </div>
            <div className="relative w-full overflow-hidden rounded-lg border border-white/[0.06] bg-[#040507]">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-20 block"
                preserveAspectRatio="none"
              >
                <line
                  x1={0}
                  y1={zeroHorizonY}
                  x2={svgWidth}
                  y2={zeroHorizonY}
                  stroke="#272c38"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <line
                  x1={sunX}
                  y1={0}
                  x2={sunX}
                  y2={svgHeight}
                  stroke="#f59e0b"
                  strokeOpacity={0.35}
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
                <polygon points={horizonPolygonPoints} fill="rgba(30, 35, 45, 0.9)" />
                <polyline
                  points={horizonLinePoints}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={1.4}
                  strokeOpacity={0.8}
                />
                <circle
                  cx={sunX}
                  cy={sunY}
                  r={5}
                  fill={instantaneousSun.horizonClearanceDeg >= 0 ? '#f59e0b' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth={1.2}
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
