import React, { useState } from 'react';
import {
  Antenna,
  ChevronDown,
  ChevronUp,
  Radio,
  Satellite,
  Settings2,
} from 'lucide-react';
import {
  CommHardwareConfig,
  MissionScenarioData,
  UserExperienceMode,
} from '../types/navigation';

interface EarthVisibilityPanelProps {
  scenario: MissionScenarioData;
  commHardware: CommHardwareConfig;
  uxMode: UserExperienceMode;
  onChangeCommHardware: (cfg: CommHardwareConfig) => void;
}

export const EarthVisibilityPanel: React.FC<EarthVisibilityPanelProps> = ({
  scenario,
  commHardware,
  uxMode,
  onChangeCommHardware,
}) => {
  const [showCommConfig, setShowCommConfig] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { instantaneousEarth, instantaneousSun, horizonProfile360, summary } = scenario;

  const isDteOk = instantaneousEarth.isDteOperational;
  const isRelayOk = instantaneousEarth.isRelayOperational;

  const plainLanguageStatus = isDteOk
    ? `Direct-to-Earth link active — Earth is ${instantaneousEarth.horizonClearanceDeg.toFixed(1)}° above local terrain.`
    : isRelayOk
    ? 'Direct-to-Earth is blocked, but the NRHO lunar relay satellite is providing coverage.'
    : !instantaneousEarth.isGeometricallyVisible
    ? 'Earth is currently below the lunar horizon — direct communication is unavailable.'
    : instantaneousEarth.isTerrainObstructed
    ? 'Earth is geometrically above the horizon, but blocked by surrounding lunar ridges.'
    : 'Earth is too low above the horizon to meet the minimum antenna elevation constraint.';

  // Polar Sky-Dome Radar Coordinates
  const domeSize = 108;
  const center = domeSize / 2;
  const maxR = center - 10;

  const elevToRadius = (elDeg: number) => {
    const clamped = Math.max(-8, Math.min(25, elDeg));
    const norm = (25 - clamped) / 33;
    return norm * maxR;
  };

  const polarToXY = (azDeg: number, elDeg: number) => {
    const r = elevToRadius(elDeg);
    const rad = ((azDeg - 90) * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  const earthPt = polarToXY(
    instantaneousEarth.azimuthDeg,
    instantaneousEarth.elevationDeg
  );
  const sunPt = polarToXY(instantaneousSun.azimuthDeg, instantaneousSun.elevationDeg);

  const horizonRadarPolygon = horizonProfile360
    .map((s) => {
      const pt = polarToXY(s.azimuthDeg, s.horizonElevationDeg);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <section className="lunaris-surface rounded-2xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-lunar-200" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-lunar-100">Earth Communication</h3>
            <p className="text-[11px] text-lunar-400">Line-of-sight &amp; relay status</p>
          </div>
        </div>

        <span
          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
            isDteOk
              ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
              : isRelayOk
              ? 'bg-amber-500/15 border-amber-400/35 text-amber-300'
              : 'bg-rose-500/15 border-rose-400/35 text-rose-300'
          }`}
        >
          {isDteOk ? 'Direct Link' : isRelayOk ? 'Relay Active' : 'Unavailable'}
        </span>
      </div>

      {/* Plain-Language Summary */}
      <p className="text-xs text-lunar-200 leading-relaxed">{plainLanguageStatus}</p>

      {uxMode === 'EDUCATOR' && (
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-lunar-300 leading-relaxed">
          Near the South Pole, Earth hovers near the northern horizon and wobbles slightly (optical libration). Local crater walls can block direct radio contact.
        </div>
      )}

      {/* Primary Key Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">Earth Elev</div>
          <div className="text-sm font-semibold text-lunar-100 font-mono tabular-nums mt-0.5">
            {instantaneousEarth.elevationDeg > 0 ? '+' : ''}
            {instantaneousEarth.elevationDeg.toFixed(1)}°
          </div>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">Link Margin</div>
          <div
            className={`text-sm font-semibold font-mono tabular-nums mt-0.5 ${
              isDteOk ? 'text-emerald-300' : isRelayOk ? 'text-amber-300' : 'text-rose-300'
            }`}
          >
            {instantaneousEarth.estimatedLinkMarginDb > 0 ? '+' : ''}
            {instantaneousEarth.estimatedLinkMarginDb.toFixed(1)} dB
          </div>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <div className="text-[11px] text-lunar-400">DTE Duty</div>
          <div className="text-sm font-semibold text-lunar-100 font-mono tabular-nums mt-0.5">
            {summary.earthVisibilityPct}%
          </div>
        </div>
      </div>

      {/* Earthset / Earthrise Countdown + DSN Station + Hypothetical Relay Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-lunar-400 px-3 py-2 rounded-xl bg-space-950/60 border border-white/[0.06]">
        <span className="inline-flex items-center gap-1.5 font-mono">
          <Antenna className="w-3.5 h-3.5 text-sky-400" />
          <span>
            {instantaneousEarth.nextTransitionType === 'EARTHSET_OCCULTATION'
              ? 'Next Earthset:'
              : 'Next Earthrise:'}{' '}
            <strong className="text-lunar-100">
              {instantaneousEarth.transitionWithinWindow
                ? `~${instantaneousEarth.hoursToNextTransition}h`
                : 'none in window'}
            </strong>{' '}
            · {instantaneousEarth.activeDsnStation}
          </span>
        </span>

        <button
          type="button"
          onClick={() =>
            onChangeCommHardware({
              ...commHardware,
              relaySatelliteEnabled: !commHardware.relaySatelliteEnabled,
            })
          }
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-colors ${
            commHardware.relaySatelliteEnabled
              ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
              : 'bg-space-850 border-white/10 text-lunar-300 hover:text-white'
          }`}
          title="Toggle hypothetical NRHO Relay Satellite backup when Direct-to-Earth (DTE) is blocked"
        >
          <Satellite className="w-3 h-3" />
          {commHardware.relaySatelliteEnabled
            ? 'Hypothetical Relay: ON'
            : '+ Hypothetical Relay'}
        </button>
      </div>

      {/* Expandable Details + RF Config */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="inline-flex items-center gap-1.5 text-xs text-lunar-400 hover:text-lunar-200 transition-colors"
        >
          <span>Link budget &amp; sky dome</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => setShowCommConfig((v) => !v)}
          aria-expanded={showCommConfig}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            showCommConfig
              ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
              : 'bg-space-850 border-white/10 text-lunar-300 hover:text-white'
          }`}
        >
          <Settings2 className="w-3 h-3" />
          RF Config
        </button>
      </div>

      {showCommConfig && (
        <div className="p-3 rounded-xl bg-space-950/80 border border-white/10 space-y-3 text-xs">
          <div>
            <div className="text-[11px] text-lunar-400 mb-1.5">Frequency Band</div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'S_BAND_2_2GHZ', label: 'S-Band 2.2G' },
                { id: 'X_BAND_8_4GHZ', label: 'X-Band 8.4G' },
                { id: 'KA_BAND_32GHZ', label: 'Ka-Band 32G' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    onChangeCommHardware({
                      ...commHardware,
                      frequencyBand: b.id as CommHardwareConfig['frequencyBand'],
                    })
                  }
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                    commHardware.frequencyBand === b.id
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                      : 'bg-space-900 border-white/10 text-lunar-400 hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1">
                Min El ({commHardware.minElevationConstraintDeg}°)
              </label>
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={commHardware.minElevationConstraintDeg}
                onChange={(e) =>
                  onChangeCommHardware({
                    ...commHardware,
                    minElevationConstraintDeg: parseInt(e.target.value, 10),
                  })
                }
                className="w-full cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1">TX (W)</label>
              <input
                type="number"
                min={5}
                max={200}
                step={5}
                value={commHardware.transmitPowerWatts}
                onChange={(e) =>
                  onChangeCommHardware({
                    ...commHardware,
                    transmitPowerWatts: Math.max(1, parseFloat(e.target.value) || 25),
                  })
                }
                className="w-full bg-space-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-lunar-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-lunar-400 mb-1">Dish (m)</label>
              <input
                type="number"
                min={0.2}
                max={3.0}
                step={0.1}
                value={commHardware.antennaDiameterMeters}
                onChange={(e) =>
                  onChangeCommHardware({
                    ...commHardware,
                    antennaDiameterMeters: Math.max(
                      0.2,
                      parseFloat(e.target.value) || 0.85
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
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
          <div className="sm:col-span-7 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-xl bg-space-950/70 border border-white/[0.06]">
              <span className="text-lunar-400 block">Range / FSPL</span>
              <span className="text-lunar-200">
                {Math.round(instantaneousEarth.distanceKm / 1000)}k km · {instantaneousEarth.freeSpacePathLossDb} dB
              </span>
            </div>
            <div className="p-2 rounded-xl bg-space-950/70 border border-white/[0.06]">
              <span className="text-lunar-400 block">Downlink Rate</span>
              <span className="text-lunar-200">
                {instantaneousEarth.estimatedDataRateMbps} Mbps
              </span>
            </div>
            <div className="p-2 rounded-xl bg-space-950/70 border border-white/[0.06]">
              <span className="text-lunar-400 block">Libration</span>
              <span className="text-lunar-200">
                {instantaneousEarth.librationLongitudeDeg.toFixed(1)}°, {instantaneousEarth.librationLatitudeDeg.toFixed(1)}°
              </span>
            </div>
            <div className="p-2 rounded-xl bg-space-950/70 border border-white/[0.06]">
              <span className="text-lunar-400 block">Light Delay</span>
              <span className="text-lunar-200">
                {instantaneousEarth.oneWayLightTimeSec}s one-way
              </span>
            </div>
          </div>

          <div className="sm:col-span-5 flex flex-col items-center justify-center p-2.5 rounded-xl bg-space-950/80 border border-white/[0.07]">
            <div className="text-[10px] text-lunar-400 mb-1">Polar Sky Dome</div>
            <svg width={domeSize} height={domeSize} className="overflow-visible">
              <circle
                cx={center}
                cy={center}
                r={maxR}
                fill="#050608"
                stroke="#222834"
                strokeWidth={1}
              />
              <circle
                cx={center}
                cy={center}
                r={elevToRadius(0)}
                fill="none"
                stroke="#64748b"
                strokeOpacity={0.35}
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              <polygon
                points={horizonRadarPolygon}
                fill="rgba(148, 163, 184, 0.1)"
                stroke="#94a3b8"
                strokeWidth={1.1}
                strokeOpacity={0.65}
              />
              <circle
                cx={sunPt.x}
                cy={sunPt.y}
                r={3.5}
                fill="#f59e0b"
                stroke="#000"
                strokeWidth={1}
              />
              <circle
                cx={earthPt.x}
                cy={earthPt.y}
                r={4.2}
                fill={isDteOk ? '#10b981' : isRelayOk ? '#f59e0b' : '#f43f5e'}
                stroke="#fff"
                strokeWidth={1.1}
              />
              <text
                x={center}
                y={8}
                textAnchor="middle"
                className="fill-lunar-400 text-[8px] font-mono"
              >
                0°N
              </text>
            </svg>
          </div>
        </div>
      )}
    </section>
  );
};
