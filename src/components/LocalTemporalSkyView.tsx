import React, { useMemo } from 'react';
import {
  Compass,
  FastForward,
  Pause,
  Play,
  Radio,
  Rewind,
  Sun,
  SunMedium,
  Sunrise,
  Sunset,
  Zap,
} from 'lucide-react';
import {
  MissionScenarioData,
  OperationalWindowState,
  UserExperienceMode,
} from '../types/navigation';
import { HORIZON_MASK_UNCERTAINTY_DEG } from '../science/lunarMath';

interface LocalTemporalSkyViewProps {
  scenario: MissionScenarioData;
  isPlaying: boolean;
  playbackSpeed: number;
  uxMode: UserExperienceMode;
  onTogglePlay: () => void;
  onChangePlaybackSpeed: (speed: number) => void;
  onChangeElapsedHours: (hours: number) => void;
  onShiftLunarLocalHour: (targetLunarHour: number) => void;
}

const OP_STATE_BADGES: Record<
  OperationalWindowState,
  { label: string; short: string; bg: string; border: string; text: string }
> = {
  NOMINAL_OPS: {
    label: 'Sunlight + Direct-to-Earth Comm',
    short: 'SUN + DIRECT COMM',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-400/45',
    text: 'text-emerald-300',
  },
  SOLAR_ONLY_RELAY: {
    label: 'Sunlight + No Direct Earth Comm',
    short: 'SUN + NO DIRECT COMM',
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/45',
    text: 'text-amber-300',
  },
  ECLIPSE_DTE_COMM: {
    label: 'Shadow + Comm Link (DTE or Relay)',
    short: 'SHADOW + COMM',
    bg: 'bg-sky-500/15',
    border: 'border-sky-400/45',
    text: 'text-sky-300',
  },
  CRITICAL_BLACKOUT: {
    label: 'Shadow + No Comm Link',
    short: 'SHADOW + NO COMM',
    bg: 'bg-rose-500/15',
    border: 'border-rose-400/45',
    text: 'text-rose-300',
  },
};

export const LocalTemporalSkyView: React.FC<LocalTemporalSkyViewProps> = ({
  scenario,
  isPlaying,
  playbackSpeed,
  uxMode,
  onTogglePlay,
  onChangePlaybackSpeed,
  onChangeElapsedHours,
  onShiftLunarLocalHour,
}) => {
  const {
    instantaneousSun,
    instantaneousEarth,
    horizonProfile360,
    timeConfig,
    transitionEvents,
    timeline,
  } = scenario;

  const totalHours = timeConfig.missionDurationDays * 24;

  // Determine current operational window state
  const isSunUp = instantaneousSun.visibleSolarDiscFraction > 0.05;
  const isDteUp = instantaneousEarth.isDteOperational;
  const currentOpState: OperationalWindowState =
    isSunUp && isDteUp
      ? 'NOMINAL_OPS'
      : isSunUp && !isDteUp
      ? 'SOLAR_ONLY_RELAY'
      : !isSunUp && (isDteUp || instantaneousEarth.isRelayOperational)
      ? 'ECLIPSE_DTE_COMM'
      : 'CRITICAL_BLACKOUT';

  const opBadge = OP_STATE_BADGES[currentOpState];

  // Temporal Sun & Earth sky tracks come straight from the provider's cached timeline, so
  // the dome stays consistent with every other panel (and with any future SPICE provider)
  // instead of re-deriving an ephemeris locally.
  const skyTrajectories = useMemo(() => {
    const stride = Math.max(1, Math.round(timeline.length / 48));
    const sunTrack: { hour: number; az: number; el: number }[] = [];
    const earthTrack: { hour: number; az: number; el: number }[] = [];
    for (let i = 0; i < timeline.length; i += stride) {
      const pt = timeline[i];
      sunTrack.push({ hour: pt.hourOffset, az: pt.sunAzimuthDeg, el: pt.sunElevationDeg });
      earthTrack.push({ hour: pt.hourOffset, az: pt.earthAzimuthDeg, el: pt.earthElevationDeg });
    }
    return { sunTrack, earthTrack };
  }, [timeline]);

  // --- 1. 360° PANORAMIC LOCAL HORIZON DIAGRAM GEOMETRY ---
  const panoWidth = 640;
  const panoHeight = 200;
  // Adapt elevation range so equatorial high-sun/earth and polar grazing views both render clearly
  const maxBodyEl = Math.max(
    14,
    Math.ceil(Math.max(instantaneousSun.elevationDeg, instantaneousEarth.elevationDeg) + 4)
  );
  const minBodyEl = Math.min(
    -8,
    Math.floor(Math.min(instantaneousSun.elevationDeg, instantaneousEarth.elevationDeg) - 3)
  );
  const minEl = Math.max(-25, minBodyEl);
  const maxEl = Math.min(90, maxBodyEl);

  const mapAzToX = (az: number) => (az / 360) * panoWidth;
  const mapElToY = (el: number) => {
    const clamped = Math.max(minEl, Math.min(maxEl, el));
    return panoHeight - ((clamped - minEl) / (maxEl - minEl)) * panoHeight;
  };

  const zeroGeomY = mapElToY(0);
  const minAntennaElY = mapElToY(scenario.commHardware.minElevationConstraintDeg);

  const terrainPolygonPoints = [
    `0,${panoHeight}`,
    ...horizonProfile360.map(
      (s) => `${mapAzToX(s.azimuthDeg).toFixed(1)},${mapElToY(s.horizonElevationDeg).toFixed(1)}`
    ),
    `${panoWidth},${mapElToY(horizonProfile360[0]?.horizonElevationDeg ?? 0).toFixed(1)}`,
    `${panoWidth},${panoHeight}`,
  ].join(' ');

  const terrainLinePoints = [
    ...horizonProfile360.map(
      (s) => `${mapAzToX(s.azimuthDeg).toFixed(1)},${mapElToY(s.horizonElevationDeg).toFixed(1)}`
    ),
    `${panoWidth},${mapElToY(horizonProfile360[0]?.horizonElevationDeg ?? 0).toFixed(1)}`,
  ].join(' ');

  // ±HORIZON_MASK_UNCERTAINTY_DEG Synthetic Terrain Uncertainty Band
  const U = HORIZON_MASK_UNCERTAINTY_DEG;
  const uncertaintyBandPoints = [
    ...horizonProfile360.map(
      (s) =>
        `${mapAzToX(s.azimuthDeg).toFixed(1)},${mapElToY(s.horizonElevationDeg + U).toFixed(1)}`
    ),
    `${panoWidth},${mapElToY((horizonProfile360[0]?.horizonElevationDeg ?? 0) + U).toFixed(1)}`,
    `${panoWidth},${mapElToY((horizonProfile360[0]?.horizonElevationDeg ?? 0) - U).toFixed(1)}`,
    ...[...horizonProfile360]
      .reverse()
      .map(
        (s) =>
          `${mapAzToX(s.azimuthDeg).toFixed(1)},${mapElToY(s.horizonElevationDeg - U).toFixed(1)}`
      ),
  ].join(' ');

  const sunX = mapAzToX(instantaneousSun.azimuthDeg);
  const sunY = mapElToY(instantaneousSun.elevationDeg);
  const sunMaskY = mapElToY(instantaneousSun.localHorizonMaskDeg);

  const earthX = mapAzToX(instantaneousEarth.azimuthDeg);
  const earthY = mapElToY(instantaneousEarth.elevationDeg);
  const earthMaskY = mapElToY(instantaneousEarth.localHorizonMaskDeg);

  // --- 2. POLAR SKY DOME GEOMETRY ---
  const domeSize = 210;
  const domeCenter = domeSize / 2;
  const domeMaxR = domeCenter - 18;
  const domeMaxEl = Math.max(25, maxEl);
  const domeMinEl = -10;

  const elevToDomeR = (elDeg: number) => {
    const clamped = Math.max(domeMinEl, Math.min(domeMaxEl, elDeg));
    const norm = (domeMaxEl - clamped) / (domeMaxEl - domeMinEl);
    return norm * domeMaxR;
  };

  const polarToDomeXY = (azDeg: number, elDeg: number) => {
    const r = elevToDomeR(elDeg);
    const rad = ((azDeg - 90) * Math.PI) / 180;
    return {
      x: domeCenter + r * Math.cos(rad),
      y: domeCenter + r * Math.sin(rad),
    };
  };

  const domeHorizonPolygon = horizonProfile360
    .map((s) => {
      const pt = polarToDomeXY(s.azimuthDeg, s.horizonElevationDeg);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const domeSunTrackPoints = skyTrajectories.sunTrack
    .map((p) => {
      const pt = polarToDomeXY(p.az, p.el);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const domeEarthTrackPoints = skyTrajectories.earthTrack
    .map((p) => {
      const pt = polarToDomeXY(p.az, p.el);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const domeSunPt = polarToDomeXY(
    instantaneousSun.azimuthDeg,
    instantaneousSun.elevationDeg
  );
  const domeEarthPt = polarToDomeXY(
    instantaneousEarth.azimuthDeg,
    instantaneousEarth.elevationDeg
  );

  // Quick-jump targets: prefer the next upcoming event; otherwise fall back to the most
  // recent past one and label it as such so a "Sunrise (T+40h)" pill is never mistaken
  // for a forecast when the scrubber is already past it.
  const pickEvent = (kinds: ReadonlyArray<string>) => {
    const upcoming = transitionEvents.find(
      (e) => kinds.includes(e.kind) && e.hourOffset > timeConfig.elapsedHours
    );
    if (upcoming) return { event: upcoming, isPast: false };
    const past = [...transitionEvents]
      .reverse()
      .find((e) => kinds.includes(e.kind) && e.hourOffset <= timeConfig.elapsedHours);
    return past ? { event: past, isPast: true } : null;
  };
  const nextSunrise = pickEvent(['SUNRISE']);
  const nextSunset = pickEvent(['SUNSET']);
  const nextEarthEvent = pickEvent(['EARTHRISE', 'EARTHSET']);

  const sunCountdownLabel = instantaneousSun.transitionWithinWindow
    ? `~${instantaneousSun.hoursToNextTransition} hrs`
    : 'None in window';
  const earthCountdownLabel = instantaneousEarth.transitionWithinWindow
    ? `~${instantaneousEarth.hoursToNextTransition} hrs`
    : 'None in window';

  return (
    <section
      id="stage-sky"
      aria-label="Local and Temporal Lunar Sky View"
      className="lunaris-surface-elevated rounded-3xl p-5 sm:p-6 lg:p-7 space-y-5 border border-white/15"
    >
      {/* Top Header & Operational Readiness Classification */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.09] pb-4">
        <div className="space-y-1.5">
          <div className="nasa-eyebrow">
            <span>SIGNATURE INSTRUMENT // LOCAL &amp; TEMPORAL LUNAR SKY VIEW</span>
          </div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-snug">
            Where Are the Sun &amp; Earth Relative to Surrounding Crater Ridges?
          </h3>
          <p className="text-xs text-lunar-300 max-w-3xl leading-relaxed">
            A body can be geometrically above the <strong>0° smooth-sphere horizon</strong> yet
            hidden behind a local mountain ridge. Compare geometric elevation against the{' '}
            <span className="text-amber-300 font-mono">360° terrain horizon mask (±1.5° proxy)</span>{' '}
            and scrub mission time below.
          </p>
          <p className="text-[11px] font-mono text-lunar-400">
            Keyboard: <kbd className="px-1 rounded bg-white/10 text-lunar-200">Space</kbd> play/pause ·{' '}
            <kbd className="px-1 rounded bg-white/10 text-lunar-200">←</kbd>/
            <kbd className="px-1 rounded bg-white/10 text-lunar-200">→</kbd> ±1h ·{' '}
            <kbd className="px-1 rounded bg-white/10 text-lunar-200">Shift</kbd>+arrows ±24h
          </p>
        </div>

        {/* Live Time-Dependent Operational Readiness Classification */}
        <div
          className={`px-3.5 py-2 rounded-2xl border ${opBadge.bg} ${opBadge.border} flex flex-col items-end font-mono`}
        >
          <span className="text-[10px] uppercase tracking-wider text-lunar-300">
            Operational Readiness (T+{timeConfig.elapsedHours}h)
          </span>
          <span className={`text-xs font-bold ${opBadge.text} mt-0.5`}>
            {opBadge.label}
          </span>
        </div>
      </div>

      {/* Main Visual Grid: 360° Horizon Panorama (8 cols) + Polar Sky Dome (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* A1. 360° LOCAL TOPOGRAPHIC HORIZON PANORAMA */}
        <div className="xl:col-span-8 p-4 rounded-2xl bg-[#04070D] border border-white/10 flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Sun: Az {instantaneousSun.azimuthDeg.toFixed(1)}° · El{' '}
                {instantaneousSun.elevationDeg > 0 ? '+' : ''}
                {instantaneousSun.elevationDeg.toFixed(1)}° (Clearance{' '}
                {instantaneousSun.horizonClearanceDeg > 0 ? '+' : ''}
                {instantaneousSun.horizonClearanceDeg.toFixed(1)}°)
              </span>
              <span className="inline-flex items-center gap-1.5 text-sky-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                Earth: Az {instantaneousEarth.azimuthDeg.toFixed(1)}° · El{' '}
                {instantaneousEarth.elevationDeg > 0 ? '+' : ''}
                {instantaneousEarth.elevationDeg.toFixed(1)}° (Clearance{' '}
                {instantaneousEarth.horizonClearanceDeg > 0 ? '+' : ''}
                {instantaneousEarth.horizonClearanceDeg.toFixed(1)}°)
              </span>
            </div>
            <span className="text-lunar-400">
              {timeConfig.currentIsoUtc.slice(0, 16).replace('T', ' ')} UTC ·{' '}
              {timeConfig.lunarLocalSolarHour.toFixed(1)}h LTST
            </span>
          </div>

          {/* 360° SVG Horizon Diagram */}
          <div className="relative w-full rounded-xl overflow-hidden border border-white/[0.08] bg-gradient-to-b from-[#040814] via-[#060B18] to-[#04060B]">
            <svg
              viewBox={`0 0 ${panoWidth} ${panoHeight}`}
              className="w-full h-44 sm:h-52 block"
              preserveAspectRatio="none"
            >
              {/* Cardinal Azimuth Vertical Grid Lines */}
              {[
                { az: 0, label: '0° N (Earthward)' },
                { az: 90, label: '90° E' },
                { az: 180, label: '180° S' },
                { az: 270, label: '270° W' },
              ].map((card) => {
                const cx = mapAzToX(card.az);
                return (
                  <g key={card.az}>
                    <line
                      x1={cx}
                      y1={0}
                      x2={cx}
                      y2={panoHeight}
                      stroke="rgba(148, 163, 184, 0.14)"
                      strokeDasharray="2 3"
                      strokeWidth={1}
                    />
                    <text
                      x={cx + 5}
                      y={14}
                      className="fill-lunar-400 font-mono text-[9px]"
                    >
                      {card.label}
                    </text>
                  </g>
                );
              })}

              {/* 0° Geometric Reference Horizon Line */}
              <line
                x1={0}
                y1={zeroGeomY}
                x2={panoWidth}
                y2={zeroGeomY}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1.1}
              />
              <text
                x={panoWidth - 6}
                y={Math.max(12, zeroGeomY - 4)}
                textAnchor="end"
                className="fill-lunar-400 font-mono text-[8.5px]"
              >
                0° Geometric Horizon (Smooth Sphere)
              </text>

              {/* Minimum Antenna Elevation Constraint Line */}
              {scenario.commHardware.minElevationConstraintDeg > 0 && (
                <line
                  x1={0}
                  y1={minAntennaElY}
                  x2={panoWidth}
                  y2={minAntennaElY}
                  stroke="rgba(56, 189, 248, 0.28)"
                  strokeDasharray="2 4"
                  strokeWidth={1}
                />
              )}

              {/* ±1.5° Synthetic Terrain Uncertainty Band */}
              <polygon
                points={uncertaintyBandPoints}
                fill="rgba(245, 158, 11, 0.08)"
              />

              {/* Local Topographic Terrain Horizon Polygon */}
              <polygon
                points={terrainPolygonPoints}
                fill="rgba(15, 23, 42, 0.92)"
              />
              <polyline
                points={terrainLinePoints}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.8}
              />

              {/* Sun Clearance Drop-Line to Local Ridge */}
              <line
                x1={sunX}
                y1={sunY}
                x2={sunX}
                y2={sunMaskY}
                stroke={instantaneousSun.horizonClearanceDeg >= 0 ? '#fbbf24' : '#f43f5e'}
                strokeDasharray="2 2"
                strokeWidth={1.4}
              />

              {/* Earth Clearance Drop-Line to Local Ridge */}
              <line
                x1={earthX}
                y1={earthY}
                x2={earthX}
                y2={earthMaskY}
                stroke={instantaneousEarth.isDteOperational ? '#38bdf8' : '#f43f5e'}
                strokeDasharray="2 2"
                strokeWidth={1.4}
              />

              {/* SUN BODY MARKER */}
              <g transform={`translate(${sunX}, ${sunY})`}>
                <circle
                  r={10}
                  fill={
                    instantaneousSun.horizonClearanceDeg >= 0
                      ? 'rgba(251, 191, 36, 0.22)'
                      : 'rgba(244, 63, 94, 0.18)'
                  }
                />
                <circle
                  r={5.5}
                  fill={instantaneousSun.horizonClearanceDeg >= 0 ? '#fbbf24' : '#f43f5e'}
                  stroke="#ffffff"
                  strokeWidth={1.4}
                />
                <text
                  x={0}
                  y={-12}
                  textAnchor="middle"
                  className="fill-amber-300 font-mono text-[9px] font-bold"
                >
                  SUN ({instantaneousSun.elevationDeg > 0 ? '+' : ''}
                  {instantaneousSun.elevationDeg.toFixed(1)}°)
                </text>
              </g>

              {/* EARTH BODY MARKER */}
              <g transform={`translate(${earthX}, ${earthY})`}>
                <circle
                  r={9}
                  fill={
                    instantaneousEarth.isDteOperational
                      ? 'rgba(56, 189, 248, 0.25)'
                      : 'rgba(244, 63, 94, 0.2)'
                  }
                />
                <circle
                  r={5}
                  fill={
                    instantaneousEarth.isDteOperational
                      ? '#38bdf8'
                      : instantaneousEarth.isRelayOperational
                      ? '#f59e0b'
                      : '#f43f5e'
                  }
                  stroke="#ffffff"
                  strokeWidth={1.4}
                />
                <text
                  x={0}
                  y={16}
                  textAnchor="middle"
                  className="fill-sky-300 font-mono text-[9px] font-bold"
                >
                  EARTH ({instantaneousEarth.elevationDeg > 0 ? '+' : ''}
                  {instantaneousEarth.elevationDeg.toFixed(1)}°)
                </text>
              </g>
            </svg>
          </div>

          {/* Legend & Geometric vs Terrain Horizon Explanation */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-lunar-400 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-400 inline-block" />
                Terrain Ridge Horizon
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-b border-dashed border-slate-500 inline-block" />
                0° Geometric Horizon
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-300/90">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-400/40 inline-block" />
                ±{HORIZON_MASK_UNCERTAINTY_DEG}° Synthetic Mask Uncertainty
              </span>
            </div>
            <span>Azimuth: 0°=N · 90°=E · 180°=S · 270°=W</span>
          </div>
        </div>

        {/* A2. POLAR SKY DOME + INSTANTANEOUS SUN/EARTH TELEMETRY */}
        <div className="xl:col-span-4 p-4 rounded-2xl bg-[#04070D] border border-white/10 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-lunar-300">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              Polar Sky Dome (Zenith Center)
            </span>
            <span className="text-lunar-400">Tracks over {timeConfig.missionDurationDays}d</span>
          </div>

          <div className="flex items-center justify-center py-1">
            <svg width={domeSize} height={domeSize} className="overflow-visible">
              {/* Outer Rim */}
              <circle
                cx={domeCenter}
                cy={domeCenter}
                r={domeMaxR}
                fill="#030509"
                stroke="#1e293b"
                strokeWidth={1.2}
              />
              {/* 0° Geometric Horizon Ring */}
              <circle
                cx={domeCenter}
                cy={domeCenter}
                r={elevToDomeR(0)}
                fill="none"
                stroke="#475569"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              {/* +10° Elevation Ring */}
              <circle
                cx={domeCenter}
                cy={domeCenter}
                r={elevToDomeR(10)}
                fill="none"
                stroke="#1e293b"
                strokeWidth={0.8}
              />
              {/* Crosshairs */}
              <line
                x1={domeCenter}
                y1={domeCenter - domeMaxR}
                x2={domeCenter}
                y2={domeCenter + domeMaxR}
                stroke="#1e293b"
                strokeWidth={0.8}
              />
              <line
                x1={domeCenter - domeMaxR}
                y1={domeCenter}
                x2={domeCenter + domeMaxR}
                y2={domeCenter}
                stroke="#1e293b"
                strokeWidth={0.8}
              />

              {/* 360° Terrain Horizon Mask Polygon */}
              <polygon
                points={domeHorizonPolygon}
                fill="rgba(56, 189, 248, 0.05)"
                stroke="#94a3b8"
                strokeWidth={1.2}
                strokeOpacity={0.75}
              />

              {/* Temporal Sun Trajectory Path */}
              {domeSunTrackPoints && (
                <polyline
                  points={domeSunTrackPoints}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1.1}
                  strokeDasharray="2 2"
                  strokeOpacity={0.55}
                />
              )}

              {/* Temporal Earth Libration Trajectory Path */}
              {domeEarthTrackPoints && (
                <polyline
                  points={domeEarthTrackPoints}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={1.2}
                  strokeOpacity={0.65}
                />
              )}

              {/* Current Sun Position */}
              <circle
                cx={domeSunPt.x}
                cy={domeSunPt.y}
                r={5}
                fill={instantaneousSun.horizonClearanceDeg >= 0 ? '#fbbf24' : '#f43f5e'}
                stroke="#ffffff"
                strokeWidth={1.2}
              />

              {/* Current Earth Position */}
              <circle
                cx={domeEarthPt.x}
                cy={domeEarthPt.y}
                r={5}
                fill={
                  instantaneousEarth.isDteOperational
                    ? '#38bdf8'
                    : instantaneousEarth.isRelayOperational
                    ? '#f59e0b'
                    : '#f43f5e'
                }
                stroke="#ffffff"
                strokeWidth={1.2}
              />

              {/* Cardinal Labels */}
              <text
                x={domeCenter}
                y={11}
                textAnchor="middle"
                className="fill-sky-300 text-[9px] font-mono font-semibold"
              >
                0°N (EARTH)
              </text>
              <text
                x={domeCenter}
                y={domeSize - 3}
                textAnchor="middle"
                className="fill-lunar-400 text-[8.5px] font-mono"
              >
                180°S
              </text>
              <text
                x={domeSize - 6}
                y={domeCenter + 3}
                textAnchor="end"
                className="fill-lunar-400 text-[8.5px] font-mono"
              >
                90°E
              </text>
              <text
                x={6}
                y={domeCenter + 3}
                textAnchor="start"
                className="fill-lunar-400 text-[8.5px] font-mono"
              >
                270°W
              </text>
            </svg>
          </div>

          {/* Countdown Strip: Time to Sunset/Sunrise & Time to Earthset/Earthrise */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center gap-1 text-[10px] text-amber-300 uppercase">
                {instantaneousSun.nextTransitionType === 'SUNSET_OCCULTATION' ? (
                  <Sunset className="w-3 h-3" />
                ) : (
                  <Sunrise className="w-3 h-3" />
                )}
                <span>
                  {instantaneousSun.nextTransitionType === 'SUNSET_OCCULTATION'
                    ? 'Time to Sunset'
                    : 'Time to Sunrise'}
                </span>
              </div>
              <div
                className={`text-xs font-bold mt-0.5 tabular-nums ${
                  instantaneousSun.transitionWithinWindow ? 'text-white' : 'text-lunar-400'
                }`}
                title={
                  instantaneousSun.transitionWithinWindow
                    ? undefined
                    : `No ${instantaneousSun.nextTransitionType === 'SUNSET_OCCULTATION' ? 'sunset' : 'sunrise'} occurs in the remaining ${instantaneousSun.hoursToNextTransition}h of this window`
                }
              >
                {sunCountdownLabel}
              </div>
              <div className="text-[10px] text-lunar-400 truncate">
                Array: {instantaneousSun.estimatedElectricalPowerWatts}W (Inc{' '}
                {instantaneousSun.panelIncidenceAngleDeg}°)
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center gap-1 text-[10px] text-sky-300 uppercase">
                <Radio className="w-3 h-3" />
                <span>
                  {instantaneousEarth.nextTransitionType === 'EARTHSET_OCCULTATION'
                    ? 'Time to Earthset'
                    : 'Time to Earthrise'}
                </span>
              </div>
              <div
                className={`text-xs font-bold mt-0.5 tabular-nums ${
                  instantaneousEarth.transitionWithinWindow ? 'text-white' : 'text-lunar-400'
                }`}
                title={
                  instantaneousEarth.transitionWithinWindow
                    ? undefined
                    : `No ${instantaneousEarth.nextTransitionType === 'EARTHSET_OCCULTATION' ? 'Earthset' : 'Earthrise'} occurs in the remaining ${instantaneousEarth.hoursToNextTransition}h of this window`
                }
              >
                {earthCountdownLabel}
              </div>
              <div className="text-[10px] text-lunar-400 truncate">
                {instantaneousEarth.isDteOperational
                  ? `DTE +${instantaneousEarth.estimatedLinkMarginDb} dB`
                  : instantaneousEarth.isTerrainObstructed
                  ? 'Blocked by Ridge'
                  : 'Below Min Elev'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B. TEMPORAL SKY VIEW — SYNCHRONIZED TIME SCRUBBER, PLAYBACK & EVENT JUMP BAR */}
      <div className="p-4 rounded-2xl bg-[#04070D]/90 border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-sky-300 font-semibold uppercase tracking-wider text-[11px]">
              Temporal Sky Scrubber
            </span>
            <span className="text-lunar-400">|</span>
            <span className="text-white font-semibold tabular-nums">
              T+{timeConfig.elapsedHours}h / {totalHours}h (Day{' '}
              {(timeConfig.elapsedHours / 24).toFixed(1)})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Sun className="w-3.5 h-3.5" />
              Disc: {(instantaneousSun.visibleSolarDiscFraction * 100).toFixed(0)}%
            </span>
            <span className="text-lunar-500">·</span>
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Zap className="w-3.5 h-3.5" />
              {instantaneousSun.estimatedElectricalPowerWatts}W (±
              {instantaneousSun.powerUncertaintyWatts}W)
            </span>
          </div>
        </div>

        {/* Synchronized Operational Readiness Bar + Range Scrubber */}
        <div className="space-y-1.5">
          <div className="w-full h-3 flex rounded-full overflow-hidden border border-white/10 bg-space-950">
            {timeline.map((pt) => {
              const isCurrent =
                Math.abs(pt.hourOffset - timeConfig.elapsedHours) <=
                (timeConfig.missionDurationDays <= 7 ? 1 : 2);
              const barColor =
                pt.operationalState === 'NOMINAL_OPS'
                  ? 'bg-emerald-500'
                  : pt.operationalState === 'SOLAR_ONLY_RELAY'
                  ? 'bg-amber-400'
                  : pt.operationalState === 'ECLIPSE_DTE_COMM'
                  ? 'bg-sky-500'
                  : 'bg-rose-500/80';
              return (
                <button
                  key={pt.hourOffset}
                  type="button"
                  onClick={() => onChangeElapsedHours(pt.hourOffset)}
                  title={`Jump to T+${pt.hourOffset}h (${pt.timestampUtc}) — Sun ${pt.sunElevationDeg.toFixed(1)}°, Earth ${pt.earthElevationDeg.toFixed(1)}°`}
                  className={`flex-1 h-full transition-opacity ${barColor} ${
                    isCurrent ? 'ring-2 ring-white z-10 opacity-100' : 'opacity-65 hover:opacity-100'
                  }`}
                />
              );
            })}
          </div>

          <input
            type="range"
            min={0}
            max={totalHours}
            step={1}
            value={timeConfig.elapsedHours}
            onChange={(e) => onChangeElapsedHours(parseInt(e.target.value, 10))}
            aria-label="Scrub temporal sky view mission hour"
            className="w-full cursor-pointer"
          />
        </div>

        {/* Playback Controls + Quick Event Jump Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlay}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isPlaying
                  ? 'bg-sky-500/20 border border-sky-400/60 text-sky-200'
                  : 'bg-sky-500 hover:bg-sky-400 text-space-950'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause Sky' : 'Play Sky'}
            </button>

            <button
              type="button"
              onClick={() =>
                onChangeElapsedHours(Math.max(0, timeConfig.elapsedHours - 12))
              }
              className="px-2.5 py-1.5 rounded-full bg-space-850 border border-white/10 text-xs font-mono text-lunar-300 hover:text-white inline-flex items-center gap-1"
            >
              <Rewind className="w-3 h-3" /> -12h
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeElapsedHours(Math.min(totalHours, timeConfig.elapsedHours + 12))
              }
              className="px-2.5 py-1.5 rounded-full bg-space-850 border border-white/10 text-xs font-mono text-lunar-300 hover:text-white inline-flex items-center gap-1"
            >
              +12h <FastForward className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-1 ml-1">
              {[1, 2, 6, 12].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onChangePlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                      : 'bg-space-850 border-white/[0.07] text-lunar-400 hover:text-white'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>
          </div>

          {/* One-Click Jump to Key Horizon Events */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => onShiftLunarLocalHour(12)}
              className="px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 inline-flex items-center gap-1 transition-colors"
              title="Jump to Lunar Local Solar Noon (12:00 LTST)"
            >
              <SunMedium className="w-3 h-3" />
              Solar Noon
            </button>

            {nextSunrise && (
              <button
                type="button"
                onClick={() => onChangeElapsedHours(nextSunrise.event.hourOffset)}
                title={nextSunrise.isPast ? 'Most recent sunrise (already elapsed)' : 'Jump to next sunrise'}
                className={`px-2.5 py-1 rounded-full border inline-flex items-center gap-1 transition-colors ${
                  nextSunrise.isPast
                    ? 'bg-white/[0.04] border-white/15 text-lunar-400 hover:text-lunar-200'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/40 text-emerald-200'
                }`}
              >
                <Sunrise className="w-3 h-3" />
                {nextSunrise.isPast ? 'Last ' : ''}Sunrise (T+{nextSunrise.event.hourOffset}h)
              </button>
            )}

            {nextSunset && (
              <button
                type="button"
                onClick={() => onChangeElapsedHours(nextSunset.event.hourOffset)}
                title={nextSunset.isPast ? 'Most recent sunset (already elapsed)' : 'Jump to next sunset'}
                className={`px-2.5 py-1 rounded-full border inline-flex items-center gap-1 transition-colors ${
                  nextSunset.isPast
                    ? 'bg-white/[0.04] border-white/15 text-lunar-400 hover:text-lunar-200'
                    : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/40 text-rose-200'
                }`}
              >
                <Sunset className="w-3 h-3" />
                {nextSunset.isPast ? 'Last ' : ''}Sunset (T+{nextSunset.event.hourOffset}h)
              </button>
            )}

            {nextEarthEvent && (
              <button
                type="button"
                onClick={() => onChangeElapsedHours(nextEarthEvent.event.hourOffset)}
                title={nextEarthEvent.isPast ? 'Most recent Earth event (already elapsed)' : 'Jump to next Earth horizon event'}
                className={`px-2.5 py-1 rounded-full border inline-flex items-center gap-1 transition-colors ${
                  nextEarthEvent.isPast
                    ? 'bg-white/[0.04] border-white/15 text-lunar-400 hover:text-lunar-200'
                    : 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/40 text-sky-200'
                }`}
              >
                <Radio className="w-3 h-3" />
                {nextEarthEvent.isPast ? 'Last ' : ''}{nextEarthEvent.event.kind} (T+{nextEarthEvent.event.hourOffset}h)
              </button>
            )}
          </div>
        </div>

        {uxMode === 'EDUCATOR' && (
          <div className="text-[11px] text-lunar-300 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 leading-relaxed">
            <strong>Beginner Tip:</strong> Watch the amber <strong>SUN</strong> and blue{' '}
            <strong>EARTH</strong> markers as you drag the slider. Whenever a marker drops below the
            grey mountain ridge line, local terrain blocks sunlight or direct radio contact with Earth.
          </div>
        )}
      </div>
    </section>
  );
};
