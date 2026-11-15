import React, { useEffect, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  LunarCoordinates,
  MissionScenarioData,
} from '../../types/navigation';
import {
  DEG_PER_KM_LUNAR_SURFACE,
  DEG_TO_RAD,
  normalizeLongitudeDeg,
} from '../../science/lunarMath';
import {
  LOCAL_PATCH_METERS_PER_UNIT,
  LOCAL_PATCH_SIZE_UNITS,
  SceneQualityMode,
} from './types';

/** Scene-unit radii of the HLS touchdown rings, derived from a single documented scale. */
const INNER_RING_RADIUS_M = 25;
const OUTER_RING_RADIUS_M = 100;
const INNER_RING_R = INNER_RING_RADIUS_M / LOCAL_PATCH_METERS_PER_UNIT;
const OUTER_RING_R = OUTER_RING_RADIUS_M / LOCAL_PATCH_METERS_PER_UNIT;

/**
 * Deterministic synthetic local terrain heightfield around the selected site.
 * Exported so surface assets (landers, rovers) can sample local elevation.
 */
export function sampleLocalPatchHeight(
  dx: number,
  dz: number,
  centerCoords: LunarCoordinates
): number {
  const r2 = dx * dx + dz * dz;
  const sphereDrop = -0.025 * r2;
  const latSeed = centerCoords.latitudeDeg * 0.37;
  const lonSeed = centerCoords.longitudeDeg * 0.19;

  const craters: [number, number, number, number, number][] = [
    [0.02, -0.02, 0.36, 0.21, 0.085],
    [-0.55, 0.28, 0.48, 0.19, 0.08],
    [0.48, 0.62, 0.52, 0.22, 0.075],
    [-0.22, -0.78, 0.5, 0.2, 0.07],
    [0.88, -0.35, 0.62, 0.21, 0.085],
  ];

  let h = sphereDrop;
  for (const [cx, cz, cr, depth, rim] of craters) {
    const ox = dx - cx * Math.cos(lonSeed);
    const oz = dz - cz * Math.sin(latSeed + 1.1);
    const dist = Math.sqrt(ox * ox + oz * oz);
    const norm = dist / cr;
    if (norm < 1.0) {
      h -= depth * (1 - norm * norm);
    } else if (norm < 1.45) {
      const rimFactor = Math.cos(((norm - 1.0) / 0.45) * Math.PI * 0.5);
      h += rim * rimFactor * rimFactor;
    }
  }

  const m1 = (dx - 0.15) ** 2 + (dz - 1.05) ** 2;
  h += 0.22 * Math.exp(-m1 / 0.18);

  h +=
    0.02 * Math.sin(dx * 4.2 + dz * 3.5 + latSeed) +
    0.014 * Math.cos(dx * 7.5 - dz * 6.1 + lonSeed);

  return h;
}

interface LocalTerrainPatchProps {
  scenario: MissionScenarioData;
  reliefScale: number;
  qualityMode: SceneQualityMode;
  showVectors: boolean;
  onSelectCoordinates: (coords: LunarCoordinates) => void;
}

/**
 * Local Topographic Patch Mesh (Synthetic proxy pending LOLA 5m/px PDS4 DEM tiles).
 */
export const LocalTerrainPatch: React.FC<LocalTerrainPatchProps> = ({
  scenario,
  reliefScale,
  qualityMode,
  showVectors,
  onSelectCoordinates,
}) => {
  const centerCoords = scenario.coordinates;
  const segments =
    qualityMode === 'ULTRA' ? 192 : qualityMode === 'PERFORMANCE' ? 80 : 128;

  const geometry = useMemo(() => {
    const size = LOCAL_PATCH_SIZE_UNITS;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const rawH = sampleLocalPatchHeight(vx, vz, centerCoords);
      pos.setY(i, rawH * reliefScale);

      const normElev = Math.max(0, Math.min(1, (rawH + 0.35) / 0.65));
      const lum = 0.16 + normElev * 0.5;
      colors.push(lum * 0.97, lum * 0.98, lum * 1.01);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [centerCoords, reliefScale, segments]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const originHeight = useMemo(
    () => sampleLocalPatchHeight(0, 0, centerCoords) * reliefScale,
    [centerCoords, reliefScale]
  );

  /**
   * Convert a click on the local patch into a selenographic offset using the documented
   * scene scale (1 unit ≈ 300 m). North is −Z (the plane was rotated −90° about X), East is +X.
   * Within a few hundred metres of a pole the longitude of an ENU offset is ill-defined, so
   * the east/west component is dropped there rather than producing a wild longitude jump.
   */
  const handleSurfaceClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const northMeters = -e.point.z * LOCAL_PATCH_METERS_PER_UNIT;
    const eastMeters = e.point.x * LOCAL_PATCH_METERS_PER_UNIT;
    const dLat = (northMeters / 1000) * DEG_PER_KM_LUNAR_SURFACE;
    const cosLat = Math.cos(centerCoords.latitudeDeg * DEG_TO_RAD);
    const dLon =
      cosLat > 0.02 ? ((eastMeters / 1000) * DEG_PER_KM_LUNAR_SURFACE) / cosLat : 0;
    onSelectCoordinates({
      latitudeDeg: Number(
        Math.max(-90, Math.min(90, centerCoords.latitudeDeg + dLat)).toFixed(4)
      ),
      longitudeDeg: Number(
        normalizeLongitudeDeg(centerCoords.longitudeDeg + dLon).toFixed(4)
      ),
    });
  };

  return (
    <group>
      <mesh geometry={geometry} receiveShadow castShadow onClick={handleSurfaceClick}>
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Local Target Lander Mast & Touchdown Footprint Ring */}
      <group position={[0, originHeight, 0]}>
        {/* Inner 25m Touchdown Target Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[INNER_RING_R - 0.012, INNER_RING_R, 36]} />
          <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
        </mesh>
        {/* Outer 100m Safety Perimeter Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
          <ringGeometry args={[OUTER_RING_R - 0.014, OUTER_RING_R, 48]} />
          <meshBasicMaterial
            color="#38bdf8"
            side={THREE.DoubleSide}
            transparent
            opacity={0.7}
          />
        </mesh>
        <Line
          points={[
            [0, 0, 0],
            [0, 0.65, 0],
          ]}
          color="#f59e0b"
          lineWidth={1.8}
        />
        <Html position={[0, 0.72, 0]} center zIndexRange={[25, 0]}>
          <div className="px-3 py-1.5 rounded-lg bg-[#050914]/92 border border-amber-400/70 text-[10px] font-mono text-white whitespace-nowrap shadow-xl backdrop-blur-md space-y-0.5 pointer-events-none select-none">
            <div className="flex items-center gap-1.5 text-[9px] text-amber-300 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>HLS TOUCHDOWN ELLIPSE · 100M FOOTPRINT</span>
            </div>
            <div className="text-[10px] text-sky-200">
              {centerCoords.latitudeDeg.toFixed(3)}°, {centerCoords.longitudeDeg.toFixed(3)}° · Slope {scenario.summary.localSlopeDeg}°
            </div>
            <div className="text-[9px] text-slate-400">
              Synthetic relief · 1 unit ≈ {LOCAL_PATCH_METERS_PER_UNIT} m · patch ≈{' '}
              {((LOCAL_PATCH_SIZE_UNITS * LOCAL_PATCH_METERS_PER_UNIT) / 1000).toFixed(1)} km
            </div>
          </div>
        </Html>
      </group>

      {showVectors && (
        <group position={[0, originHeight + 0.05, 0]}>
          <Line
            points={[
              [0, 0, 0],
              [
                scenario.instantaneousSun.directionVector3D[0] * 1.55,
                scenario.instantaneousSun.directionVector3D[1] * 1.55,
                -scenario.instantaneousSun.directionVector3D[2] * 1.55,
              ],
            ]}
            color="#fbbf24"
            lineWidth={2.0}
          />
          <Html
            position={[
              scenario.instantaneousSun.directionVector3D[0] * 1.55,
              scenario.instantaneousSun.directionVector3D[1] * 1.55,
              -scenario.instantaneousSun.directionVector3D[2] * 1.55,
            ]}
            center
          >
            <div className="px-2 py-0.5 rounded bg-[#140F05]/90 border border-amber-400/60 text-[9px] font-mono uppercase tracking-wider text-amber-200 whitespace-nowrap pointer-events-none">
              ☉ SUN {scenario.instantaneousSun.elevationDeg >= 0 ? '+' : ''}
              {scenario.instantaneousSun.elevationDeg.toFixed(1)}°
            </div>
          </Html>
          <Line
            points={[
              [0, 0, 0],
              [
                scenario.instantaneousEarth.directionVector3D[0] * 1.4,
                scenario.instantaneousEarth.directionVector3D[1] * 1.4,
                -scenario.instantaneousEarth.directionVector3D[2] * 1.4,
              ],
            ]}
            color="#38bdf8"
            lineWidth={1.8}
            dashed={!scenario.instantaneousEarth.isDteOperational}
          />
          <Html
            position={[
              scenario.instantaneousEarth.directionVector3D[0] * 1.4,
              scenario.instantaneousEarth.directionVector3D[1] * 1.4,
              -scenario.instantaneousEarth.directionVector3D[2] * 1.4,
            ]}
            center
          >
            <div className="px-2 py-0.5 rounded bg-[#050D1A]/90 border border-sky-400/60 text-[9px] font-mono uppercase tracking-wider text-sky-200 whitespace-nowrap pointer-events-none">
              ⊕ EARTH {scenario.instantaneousEarth.elevationDeg >= 0 ? '+' : ''}
              {scenario.instantaneousEarth.elevationDeg.toFixed(1)}°
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};
