import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Crosshair,
  Eye,
  Globe,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Mountain,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  LandingSitePreset,
  LunarCoordinates,
  MissionScenarioData,
} from '../types/navigation';
import { scanNearbyBetterLandingZones } from '../science/nearbyLandingZoneScanner';
import { computeLunarSurfaceDistanceKm } from '../science/lunarMath';
import { LunarSceneCanvas } from './scene/LunarSceneCanvas';
import {
  CameraChoreographyRequest,
  CameraPreset,
  MoonViewMode,
  SceneQualityMode,
  SurfaceShaderMode,
} from './scene/types';
import {
  LunarTextureLoadStatus,
  getLunarTextureLoadStatus,
  subscribeLunarTextureUpdates,
} from '../utils/lunarTextureGenerator';

export type {
  CameraChoreographyRequest,
  CameraPreset,
  MoonViewMode,
  SceneQualityMode,
  SurfaceShaderMode,
};

interface Moon3DViewportProps {
  scenario: MissionScenarioData;
  comparisonScenarios?: MissionScenarioData[];
  candidateSites: LandingSitePreset[];
  externalCameraRequest?: CameraChoreographyRequest | null;
  onSelectCoordinates: (coords: LunarCoordinates) => void;
}

export const Moon3DViewport: React.FC<Moon3DViewportProps> = ({
  scenario,
  comparisonScenarios = [],
  candidateSites,
  externalCameraRequest,
  onSelectCoordinates,
}) => {
  const [viewMode, setViewMode] = useState<MoonViewMode>('GLOBAL_SPHERE');
  const [shaderMode, setShaderMode] = useState<SurfaceShaderMode>('REGOLITH_ALBEDO');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('FREE_ORBIT');
  const [qualityMode, setQualityMode] = useState<SceneQualityMode>('ULTRA');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGraticule, setShowGraticule] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showCandidates, setShowCandidates] = useState(true);
  const [displacementScale, setDisplacementScale] = useState(1.0);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const nearbyScan = useMemo(
    () => scanNearbyBetterLandingZones(scenario, candidateSites),
    [scenario, candidateSites]
  );
  const [isHudRelocating, setIsHudRelocating] = useState(false);
  const [previousHudCoords, setPreviousHudCoords] =
    useState<LunarCoordinates | null>(null);
  const [lastHopKm, setLastHopKm] = useState<number>(0);
  const lastCommittedHudCoordsRef = useRef<LunarCoordinates>(
    scenario.coordinates
  );

  useEffect(() => {
    const prev = lastCommittedHudCoordsRef.current;
    const dist = computeLunarSurfaceDistanceKm(prev, scenario.coordinates);
    if (dist >= 0.25) {
      setPreviousHudCoords(prev);
      setLastHopKm(Number(dist.toFixed(1)));
      lastCommittedHudCoordsRef.current = scenario.coordinates;
      setIsHudRelocating(true);
      const t = window.setTimeout(() => setIsHudRelocating(false), 360);
      return () => window.clearTimeout(t);
    }
  }, [scenario.coordinates.latitudeDeg, scenario.coordinates.longitudeDeg]);

  const [textureStatus, setTextureStatus] = useState<LunarTextureLoadStatus>(() =>
    getLunarTextureLoadStatus()
  );
  const layerMenuRef = useRef<HTMLDivElement | null>(null);
  const layerButtonRef = useRef<HTMLButtonElement | null>(null);

  // Honour every external choreography request, even a repeat of the same preset.
  useEffect(() => {
    if (!externalCameraRequest) return;
    setAutoRotate(false);
    setViewMode(externalCameraRequest.viewMode);
    setCameraPreset(externalCameraRequest.preset);
  }, [externalCameraRequest]);

  // Disclose NASA texture streaming / fallback state instead of silently showing a grey sphere.
  useEffect(() => {
    setTextureStatus(getLunarTextureLoadStatus());
    return subscribeLunarTextureUpdates(() => setTextureStatus(getLunarTextureLoadStatus()));
  }, []);

  // Close the layer popover on Escape or on a click outside of it.
  useEffect(() => {
    if (!showLayerMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLayerMenu(false);
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (layerMenuRef.current?.contains(t) || layerButtonRef.current?.contains(t)) return;
      setShowLayerMenu(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [showLayerMenu]);

  const texturesStreaming = !textureStatus.settled;
  const texturesDegraded = textureStatus.settled && textureStatus.failedCount > 0;

  const siteTitle = scenario.matchedPresetSite
    ? scenario.matchedPresetSite.name
    : 'Custom Selenographic Target';
  const siteRegion = scenario.matchedPresetSite
    ? scenario.matchedPresetSite.region
    : `${Math.abs(scenario.coordinates.latitudeDeg).toFixed(2)}°${
        scenario.coordinates.latitudeDeg >= 0 ? 'N' : 'S'
      }, ${Math.abs(scenario.coordinates.longitudeDeg).toFixed(2)}°${
        scenario.coordinates.longitudeDeg >= 0 ? 'E' : 'W'
      }`;

  return (
    <section
      aria-label="Interactive 3D Moon Explorer"
      className={`relative rounded-2xl overflow-hidden border border-white/10 bg-[#040507] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.95)] transition-all duration-500 flex flex-col ${
        isExpanded
          ? 'h-[620px] sm:h-[740px] lg:h-[820px]'
          : 'h-[480px] sm:h-[580px] lg:h-[660px] xl:h-[700px]'
      }`}
    >
      {/* Subtle Top Vignette & Telemetry Hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 z-10 bg-gradient-to-b from-[#040507]/85 via-[#040507]/30 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 z-10 bg-gradient-to-t from-[#040507]/90 via-[#040507]/35 to-transparent"
      />

      {/* 3D WebGL Canvas */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing">
        <LunarSceneCanvas
          scenario={scenario}
          comparisonScenarios={comparisonScenarios}
          candidateSites={candidateSites}
          nearbyRecommendations={nearbyScan.localMicroSites}
          viewMode={viewMode}
          shaderMode={shaderMode}
          cameraPreset={cameraPreset}
          qualityMode={qualityMode}
          showGraticule={showGraticule}
          showVectors={showVectors}
          showCandidates={showCandidates}
          displacementScale={displacementScale}
          autoRotate={autoRotate}
          onPresetComplete={() => setCameraPreset('FREE_ORBIT')}
          onUserInteract={() => setAutoRotate(false)}
          onSelectCoordinates={onSelectCoordinates}
        />

        {/* Top-Left Floating Site Identity & Provenance Overlay (Compact & Unobtrusive) */}
        <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-[310px] z-20 pointer-events-none flex flex-col gap-2">
          <div
            className={`lunaris-glass rounded-2xl px-3.5 py-3 pointer-events-auto border transition-all duration-300 ${
              isHudRelocating
                ? 'border-sky-400/70 shadow-[0_0_24px_rgba(56,189,248,0.22)]'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isHudRelocating
                      ? 'bg-sky-400 animate-ping'
                      : 'bg-amber-400'
                  }`}
                />
                {isHudRelocating
                  ? 'Relocating...'
                  : scenario.matchedPresetSite?.code || 'Custom Target'}
              </span>
              <div className="flex items-center gap-1.5">
                {previousHudCoords && (
                  <button
                    type="button"
                    onClick={() => {
                      setAutoRotate(false);
                      onSelectCoordinates(previousHudCoords);
                      setCameraPreset('TARGET_FOCUS');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.08] hover:bg-white/15 border border-white/15 text-[10px] text-sky-200 font-medium transition-all"
                    title="Return to previous landing point"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Undo ({lastHopKm}km)
                  </button>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    viewMode === 'LOCAL_TERRAIN'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                      : scenario.matchedPresetSite?.locationAuthenticity ===
                        'ILLUSTRATIVE_SYNTHETIC'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                      : 'bg-white/[0.06] text-lunar-200 border-white/15'
                  }`}
                >
                  {viewMode === 'LOCAL_TERRAIN'
                    ? 'Local Relief'
                    : scenario.matchedPresetSite?.locationAuthenticity ===
                      'ILLUSTRATIVE_SYNTHETIC'
                    ? 'Illustrative'
                    : 'NASA LRO'}
                </span>
              </div>
            </div>
            <h2 className="font-display text-sm sm:text-base font-semibold text-lunar-50 tracking-tight mt-1 leading-snug truncate">
              {siteTitle}
            </h2>
            <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-3 gap-2 font-mono text-[11px] text-lunar-200 tabular-nums">
              <div>
                <span className="text-[9px] text-lunar-400 block">
                  Latitude
                </span>
                <span>{scenario.coordinates.latitudeDeg.toFixed(2)}°</span>
              </div>
              <div>
                <span className="text-[9px] text-lunar-400 block">
                  Longitude
                </span>
                <span>{scenario.coordinates.longitudeDeg.toFixed(2)}°</span>
              </div>
              <div>
                <span className="text-[9px] text-lunar-400 block">
                  Elevation
                </span>
                <span className="text-amber-300">
                  {scenario.summary.siteElevationMeters >= 0 ? '+' : ''}
                  {scenario.summary.siteElevationMeters} m
                </span>
              </div>
            </div>

            {/* Compact Quick Site Pills */}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
              <div className="flex flex-wrap gap-1">
                {candidateSites.slice(0, 5).map((s) => {
                  const active = scenario.matchedPresetSite?.id === s.id;
                  const shortLabel = s.code
                    .replace(/^ART-/, '')
                    .replace(/-RIDGE$/, '')
                    .replace(/-MASSIF$/, '')
                    .replace(/-RIM$/, '');
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setAutoRotate(false);
                        onSelectCoordinates(s.coordinates);
                        setCameraPreset('TARGET_FOCUS');
                      }}
                      className={`px-2 py-0.5 rounded-md font-mono text-[10px] border transition-all ${
                        active
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-semibold'
                          : 'bg-black/40 border-white/10 text-slate-300 hover:border-sky-400/50 hover:text-white'
                      }`}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>

              {nearbyScan.localMicroSites[0] && (
                <button
                  type="button"
                  onClick={() => {
                    setAutoRotate(false);
                    onSelectCoordinates(nearbyScan.localMicroSites[0].coordinates);
                    setCameraPreset('TARGET_FOCUS');
                  }}
                  title={`Jump to nearby better zone (${nearbyScan.localMicroSites[0].distanceKm}km ${nearbyScan.localMicroSites[0].compassDirection}: ${nearbyScan.localMicroSites[0].primaryAdvantageReason})`}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-[10px] font-medium text-sky-200 transition-all"
                >
                  <Sparkles className="w-2.5 h-2.5 text-sky-400" />
                  <span>+{nearbyScan.localMicroSites[0].distanceKm}km {nearbyScan.localMicroSites[0].compassDirection}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Compact Mode & Layer Controls */}
        <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-2">
          <div className="lunaris-glass rounded-full p-1 flex items-center text-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('GLOBAL_SPHERE');
                setCameraPreset('TARGET_FOCUS');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                viewMode === 'GLOBAL_SPHERE'
                  ? 'bg-amber-500 text-space-950 shadow-sm'
                  : 'text-lunar-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Global Sphere
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LOCAL_TERRAIN')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                viewMode === 'LOCAL_TERRAIN'
                  ? 'bg-amber-500 text-space-950 shadow-sm'
                  : 'text-lunar-300 hover:text-white'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              Local Relief
            </button>
          </div>

          <button
            ref={layerButtonRef}
            type="button"
            onClick={() => setShowLayerMenu((v) => !v)}
            aria-expanded={showLayerMenu}
            aria-controls="moon-layer-popover"
            className={`lunaris-glass rounded-full px-3.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              showLayerMenu
                ? 'border-amber-400/60 text-amber-300'
                : 'text-lunar-200 hover:text-white'
            }`}
            title="Surface layers & rendering options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Layers
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="lunaris-glass rounded-full p-2 text-lunar-300 hover:text-white transition-colors"
            title={isExpanded ? 'Restore standard viewport height' : 'Expand viewport height'}
            aria-label={isExpanded ? 'Restore standard viewport height' : 'Expand viewport height'}
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Expandable Layer & Quality Popover */}
        {showLayerMenu && (
          <div
            id="moon-layer-popover"
            ref={layerMenuRef}
            role="dialog"
            aria-label="Optics and surface layers"
            className="absolute top-16 right-4 z-30 lunaris-glass rounded-2xl p-4 w-72 space-y-3 text-xs border border-white/15"
          >
            <div className="flex items-center justify-between text-lunar-200 font-medium pb-2 border-b border-white/10">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Optics &amp; Surface Layers
              </span>
              <button
                type="button"
                onClick={() => setShowLayerMenu(false)}
                className="text-lunar-400 hover:text-white text-[11px] font-mono"
              >
                Close
              </button>
            </div>

            {viewMode === 'GLOBAL_SPHERE' && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-lunar-300">Surface Shader</span>
                <button
                  type="button"
                  onClick={() =>
                    setShaderMode((m) =>
                      m === 'REGOLITH_ALBEDO' ? 'LOLA_HYPSOMETRIC' : 'REGOLITH_ALBEDO'
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-space-850 border border-white/10 text-lunar-100 hover:border-amber-400/50 transition-colors font-mono text-[11px]"
                >
                  {shaderMode === 'REGOLITH_ALBEDO' ? 'LROC Albedo' : 'LOLA Hypsometric'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-lunar-300">Vertical Relief</span>
              <button
                type="button"
                onClick={() => setDisplacementScale((s) => (s === 1.0 ? 2.2 : 1.0))}
                className="px-3 py-1 rounded-lg bg-space-850 border border-white/10 text-lunar-100 hover:border-amber-400/50 transition-colors font-mono text-[11px]"
              >
                {displacementScale > 1.5 ? '2.2× Exaggerated' : '1.0× True Scale'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowGraticule((v) => !v)}
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  showGraticule
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                    : 'bg-space-850 border-white/10 text-lunar-400'
                }`}
              >
                Graticule
              </button>
              <button
                type="button"
                onClick={() => setShowVectors((v) => !v)}
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  showVectors
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                    : 'bg-space-850 border-white/10 text-lunar-400'
                }`}
              >
                Vectors
              </button>
              <button
                type="button"
                onClick={() => setShowCandidates((v) => !v)}
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  showCandidates
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                    : 'bg-space-850 border-white/10 text-lunar-400'
                }`}
              >
                Beacons
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="text-lunar-300">Mesh Fidelity</span>
              <button
                type="button"
                onClick={() =>
                  setQualityMode((q) =>
                    q === 'ULTRA'
                      ? 'STANDARD'
                      : q === 'STANDARD'
                      ? 'PERFORMANCE'
                      : 'ULTRA'
                  )
                }
                className={`px-3 py-1 rounded-lg border text-[11px] font-mono font-medium transition-colors ${
                  qualityMode === 'ULTRA'
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : qualityMode === 'PERFORMANCE'
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-space-850 border-white/10 text-lunar-200'
                }`}
              >
                {qualityMode === 'ULTRA'
                  ? 'Ultra 4K'
                  : qualityMode === 'STANDARD'
                  ? 'Standard'
                  : 'Eco 1K'}
              </button>
            </div>
          </div>
        )}

        {/* Bottom Floating Camera Dock */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2">
            {/* NASA Texture Streaming / Fallback Disclosure */}
            {viewMode === 'GLOBAL_SPHERE' && (texturesStreaming || texturesDegraded) && (
              <div
                role="status"
                aria-live="polite"
                className={`lunaris-glass rounded-full px-3 py-1.5 text-[11px] font-mono inline-flex items-center gap-2 ${
                  texturesDegraded ? 'text-amber-300 border-amber-400/40' : 'text-sky-200'
                }`}
              >
                {texturesDegraded ? (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                )}
                <span>
                  {texturesDegraded
                    ? `${textureStatus.failedCount}/${textureStatus.totalCount} NASA maps unavailable · procedural fallback shown`
                    : `Streaming 4K NASA LRO maps ${textureStatus.loadedCount}/${textureStatus.totalCount}`}
                </span>
              </div>
            )}

            {/* Subtle Interaction Hint */}
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full lunaris-glass text-[11px] text-lunar-300">
              <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Drag to orbit · Scroll to zoom · Click lunar surface to inspect</span>
            </div>
          </div>

          {/* Camera Presets + Mobile Mode Switcher */}
          <div className="pointer-events-auto lunaris-glass rounded-full p-1 flex flex-wrap items-center gap-1 text-[11px] font-medium">
            {viewMode === 'GLOBAL_SPHERE' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRotate(false);
                    setCameraPreset('OVERVIEW_SOUTH');
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
                    cameraPreset === 'OVERVIEW_SOUTH'
                      ? 'bg-amber-500 text-space-950 font-semibold'
                      : 'text-lunar-300 hover:text-white'
                  }`}
                  title="Return to South-Pole orbital overview"
                >
                  <RotateCcw className="w-3 h-3" />
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate((v) => !v)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
                    autoRotate
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                      : 'text-lunar-300 hover:text-white'
                  }`}
                  title="Toggle continuous orbital rotation"
                >
                  <RotateCw className="w-3 h-3" />
                  Orbit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRotate(false);
                    setCameraPreset('SOUTH_POLE');
                  }}
                  className={`px-3 py-1.5 rounded-full transition-colors ${
                    cameraPreset === 'SOUTH_POLE'
                      ? 'bg-amber-500 text-space-950 font-semibold'
                      : 'text-lunar-200 hover:text-white'
                  }`}
                >
                  90°S Pole
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRotate(false);
                    setCameraPreset('TARGET_FOCUS');
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
                    cameraPreset === 'TARGET_FOCUS'
                      ? 'bg-amber-500 text-space-950 font-semibold'
                      : 'text-lunar-300 hover:text-white'
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  Focus Target
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRotate(false);
                    setCameraPreset('NEARSIDE_0');
                  }}
                  className={`hidden sm:inline-flex px-3 py-1.5 rounded-full transition-colors ${
                    cameraPreset === 'NEARSIDE_0'
                      ? 'bg-amber-500 text-space-950 font-semibold'
                      : 'text-lunar-400 hover:text-white'
                  }`}
                >
                  Nearside
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRotate(false);
                    setCameraPreset('FARSIDE_180');
                  }}
                  className={`hidden sm:inline-flex px-3 py-1.5 rounded-full transition-colors ${
                    cameraPreset === 'FARSIDE_180'
                      ? 'bg-amber-500 text-space-950 font-semibold'
                      : 'text-lunar-400 hover:text-white'
                  }`}
                >
                  Far Side
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setViewMode('GLOBAL_SPHERE');
                  setCameraPreset('OVERVIEW_SOUTH');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500 text-space-950 font-semibold"
              >
                <Eye className="w-3.5 h-3.5" />
                Return to Global Sphere
              </button>
            )}

            {/* Mobile-only Local Terrain & Layer quick toggles */}
            <button
              type="button"
              onClick={() =>
                setViewMode((m) => (m === 'GLOBAL_SPHERE' ? 'LOCAL_TERRAIN' : 'GLOBAL_SPHERE'))
              }
              className="md:hidden px-3 py-1.5 rounded-full border border-white/15 text-lunar-100"
            >
              {viewMode === 'GLOBAL_SPHERE' ? 'Local Relief' : 'Global Sphere'}
            </button>
            <button
              type="button"
              onClick={() => setShowLayerMenu((v) => !v)}
              aria-expanded={showLayerMenu}
              aria-controls="moon-layer-popover"
              className="md:hidden px-3 py-1.5 rounded-full border border-white/15 text-lunar-200"
            >
              Layers
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
