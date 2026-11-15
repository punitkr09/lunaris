import React, { Component, ErrorInfo, ReactNode, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import {
  LandingSitePreset,
  LunarCoordinates,
  MissionScenarioData,
} from '../../types/navigation';
import { NearbyLandingRecommendation } from '../../science/nearbyLandingZoneScanner';
import { lunarLatLonToCartesian3D } from '../../science/lunarMath';
import { CameraController } from './CameraController';
import { GlobalMoonSphere } from './GlobalMoonSphere';
import { GlobalSphericalGraticule } from './GlobalSphericalGraticule';
import { LocalTerrainPatch } from './LocalTerrainPatch';
import { MissionOverlays } from './MissionOverlays';
import {
  CameraPreset,
  INITIAL_CAMERA_POSITION,
  MOON_SPHERE_RADIUS,
  MoonViewMode,
  SceneQualityMode,
  SurfaceShaderMode,
} from './types';

interface SceneErrorBoundaryProps {
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  public state: SceneErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): SceneErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LUNARIS 3D Scene Error:', error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#040507] text-lunar-300 text-xs space-y-2">
          <div className="text-amber-300 font-semibold">
            3D WebGL Viewport Unavailable
          </div>
          <p className="text-lunar-400 max-w-md">
            The 3D lunar canvas could not initialize on this device ({this.state.errorMessage || 'WebGL context error'}). All coordinate, solar, and communication panels remain operational.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface LunarSceneCanvasProps {
  scenario: MissionScenarioData;
  comparisonScenarios: MissionScenarioData[];
  candidateSites: LandingSitePreset[];
  nearbyRecommendations?: NearbyLandingRecommendation[];
  viewMode: MoonViewMode;
  shaderMode: SurfaceShaderMode;
  cameraPreset: CameraPreset;
  qualityMode: SceneQualityMode;
  showGraticule: boolean;
  showVectors: boolean;
  showCandidates: boolean;
  displacementScale: number;
  autoRotate: boolean;
  onPresetComplete: () => void;
  onUserInteract?: () => void;
  onSelectCoordinates: (coords: LunarCoordinates) => void;
}

/**
 * Pure 3D R3F Scene Canvas separated from mission UI controls.
 * Composes camera, solar & Earthshine lighting, global Moon / local terrain, graticule, and mission overlays.
 */
export const LunarSceneCanvas: React.FC<LunarSceneCanvasProps> = ({
  scenario,
  comparisonScenarios,
  candidateSites,
  nearbyRecommendations = [],
  viewMode,
  shaderMode,
  cameraPreset,
  qualityMode,
  showGraticule,
  showVectors,
  showCandidates,
  displacementScale,
  autoRotate,
  onPresetComplete,
  onUserInteract,
  onSelectCoordinates,
}) => {
  const globalSunPosition = useMemo((): [number, number, number] => {
    return lunarLatLonToCartesian3D(
      scenario.instantaneousSun.subSolarLatitudeDeg,
      scenario.instantaneousSun.subSolarLongitudeDeg,
      16.0
    );
  }, [
    scenario.instantaneousSun.subSolarLatitudeDeg,
    scenario.instantaneousSun.subSolarLongitudeDeg,
  ]);

  const globalEarthshinePosition = useMemo((): [number, number, number] => {
    return lunarLatLonToCartesian3D(
      scenario.instantaneousEarth.librationLatitudeDeg,
      scenario.instantaneousEarth.librationLongitudeDeg,
      14.0
    );
  }, [
    scenario.instantaneousEarth.librationLatitudeDeg,
    scenario.instantaneousEarth.librationLongitudeDeg,
  ]);

  const isPerfMode = qualityMode === 'PERFORMANCE';
  const isUltraMode = qualityMode === 'ULTRA';
  const shadowMapSize = isUltraMode ? 2048 : 1024;

  return (
    <SceneErrorBoundary>
      <Canvas
        shadows={!isPerfMode}
        dpr={isPerfMode ? 1 : isUltraMode ? [1, 2] : [1, 1.5]}
        camera={{ position: INITIAL_CAMERA_POSITION, fov: 36 }}
        gl={{
          antialias: !isPerfMode,
          powerPreference: isPerfMode ? 'low-power' : 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isUltraMode ? 1.12 : 1.04,
        }}
      >
        <color attach="background" args={['#040507']} />

        {/* Subtle deep-space starfield */}
        {!isPerfMode && (
          <Stars
            radius={98}
            depth={48}
            count={isUltraMode ? 3200 : 1400}
            factor={2.3}
            saturation={0}
            fade={false}
            speed={0}
          />
        )}

        {/* High-contrast solar illumination + authentic selenographic Earthshine fill */}
        <ambientLight intensity={isUltraMode ? 0.065 : 0.12} color="#94a3b8" />
        <directionalLight
          position={globalEarthshinePosition}
          intensity={0.14}
          color="#cbd5e1"
        />
        <directionalLight
          position={globalSunPosition}
          intensity={isUltraMode ? 3.25 : 2.85}
          color="#fff9ed"
          castShadow={!isPerfMode}
          shadow-mapSize-width={shadowMapSize}
          shadow-mapSize-height={shadowMapSize}
          shadow-bias={-0.0003}
        />

        <CameraController
          viewMode={viewMode}
          cameraPreset={cameraPreset}
          targetCoords={scenario.coordinates}
          autoRotate={autoRotate}
          onPresetComplete={onPresetComplete}
          onUserInteract={onUserInteract}
        />

        {viewMode === 'GLOBAL_SPHERE' ? (
          <group name="lunar-global-scene">
            <GlobalMoonSphere
              shaderMode={shaderMode}
              displacementScale={displacementScale}
              qualityMode={qualityMode}
              onSelectCoordinates={onSelectCoordinates}
            />

            {/* Subtle optical limb depth shell to separate the unlit lunar limb from deep space */}
            <mesh>
              <sphereGeometry args={[MOON_SPHERE_RADIUS * 1.008, 64, 64]} />
              <meshBasicMaterial
                color="#94a3b8"
                transparent
                opacity={0.025}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>

            {showGraticule && <GlobalSphericalGraticule />}

            <MissionOverlays
              scenario={scenario}
              comparisonScenarios={comparisonScenarios}
              candidateSites={candidateSites}
              nearbyRecommendations={nearbyRecommendations}
              globalSunPosition={globalSunPosition}
              showCandidates={showCandidates}
              showVectors={showVectors}
              onSelectCoordinates={onSelectCoordinates}
            />
          </group>
        ) : (
          <group name="lunar-local-terrain-scene">
            <LocalTerrainPatch
              scenario={scenario}
              reliefScale={displacementScale}
              qualityMode={qualityMode}
              showVectors={showVectors}
              onSelectCoordinates={onSelectCoordinates}
            />
          </group>
        )}
      </Canvas>
    </SceneErrorBoundary>
  );
};
