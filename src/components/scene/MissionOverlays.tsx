import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  LandingSitePreset,
  LunarCoordinates,
  MissionScenarioData,
} from '../../types/navigation';
import { NearbyLandingRecommendation } from '../../science/nearbyLandingZoneScanner';
import {
  computeLunarSurfaceDistanceKm,
  lunarLatLonToCartesian3D,
} from '../../science/lunarMath';
import { MOON_SPHERE_RADIUS } from './types';

interface MissionOverlaysProps {
  scenario: MissionScenarioData;
  comparisonScenarios: MissionScenarioData[];
  candidateSites: LandingSitePreset[];
  nearbyRecommendations?: NearbyLandingRecommendation[];
  globalSunPosition: [number, number, number];
  showCandidates: boolean;
  showVectors: boolean;
  onSelectCoordinates: (coords: LunarCoordinates) => void;
}

/**
 * Helper to compute a quaternion that aligns local +Z with the outward lunar surface normal.
 */
function computeSurfaceNormalQuaternion(pos: [number, number, number]): THREE.Quaternion {
  const normal = new THREE.Vector3(...pos).normalize();
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  return q;
}

/**
 * Helper to compute a quaternion that aligns local +Y (cone tip) with a direction vector.
 */
function computeConeDirectionQuaternion(dir: THREE.Vector3): THREE.Quaternion {
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return q;
}

/**
 * Individual Candidate Site Surface Reticle & Horizon-Aware Callout.
 * Hides HTML tag automatically when rotated onto the far hemisphere of the Moon.
 */
const CandidateSiteNode: React.FC<{
  site: LandingSitePreset;
  activeCoords: LunarCoordinates;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (coords: LunarCoordinates) => void;
}> = ({ site, activeCoords, isHovered, onHover, onSelect }) => {
  const htmlWrapRef = useRef<HTMLDivElement>(null);

  const surfacePos = useMemo((): [number, number, number] => {
    return lunarLatLonToCartesian3D(
      site.coordinates.latitudeDeg,
      site.coordinates.longitudeDeg,
      MOON_SPHERE_RADIUS + 0.012
    );
  }, [site.coordinates.latitudeDeg, site.coordinates.longitudeDeg]);

  const stemTipPos = useMemo((): [number, number, number] => {
    return lunarLatLonToCartesian3D(
      site.coordinates.latitudeDeg,
      site.coordinates.longitudeDeg,
      MOON_SPHERE_RADIUS + (isHovered ? 0.16 : 0.075)
    );
  }, [site.coordinates.latitudeDeg, site.coordinates.longitudeDeg, isHovered]);

  const normalQuat = useMemo(() => computeSurfaceNormalQuaternion(surfacePos), [surfacePos]);
  const normalVec = useMemo(() => new THREE.Vector3(...surfacePos).normalize(), [surfacePos]);
  const surfaceVec = useMemo(() => new THREE.Vector3(...surfacePos), [surfacePos]);
  // Scratch vector reused every frame to avoid per-frame allocations across ~12 nodes.
  const toCamScratch = useMemo(() => new THREE.Vector3(), []);

  // Great-circle angular separation from active target (in degrees) to prevent South Pole label collisions
  const angularDistFromActiveDeg = useMemo(() => {
    const activeVec = new THREE.Vector3(
      ...lunarLatLonToCartesian3D(activeCoords.latitudeDeg, activeCoords.longitudeDeg, 1)
    ).normalize();
    const d = Math.max(-1, Math.min(1, normalVec.dot(activeVec)));
    return (Math.acos(d) * 180) / Math.PI;
  }, [activeCoords.latitudeDeg, activeCoords.longitudeDeg, normalVec]);

  const isPolarClustered = site.coordinates.latitudeDeg < -82;

  const isSynthetic = site.locationAuthenticity === 'ILLUSTRATIVE_SYNTHETIC';
  const isArtemis = site.category === 'ARTEMIS_III_CANDIDATE';

  const ringColor = isHovered
    ? '#38bdf8'
    : isSynthetic
      ? '#fb7185'
      : isArtemis
        ? '#38bdf8'
        : '#94a3b8';

  // Horizon occlusion + anti-clutter check every frame
  useFrame(({ camera }) => {
    const el = htmlWrapRef.current;
    if (!el) return;
    const camPos = camera.position;
    const camDist = camPos.length();
    const toCam = toCamScratch.copy(camPos).sub(surfaceVec).normalize();
    const facingDot = normalVec.dot(toCam);

    // 1. Hide if on the far side / near limb of the visible hemisphere
    if (facingDot < 0.18) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    // 2. If hovered, always show full tactical callout
    if (isHovered) {
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      return;
    }

    // 3. Anti-clutter: if within 12° of the active target, or part of the dense < -82°S polar cluster when zoomed out,
    // keep text hidden until hovered or zoomed in close (< 4.7 units) so polar labels never pile on top of each other.
    if (angularDistFromActiveDeg < 12 || (isPolarClustered && camDist > 4.7)) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    const alpha = Math.min(1, (facingDot - 0.18) / 0.25);
    el.style.opacity = String((alpha * 0.78).toFixed(2));
    el.style.pointerEvents = 'auto';
  });

  // Short compact code (e.g. "SHACKLETON" or "MALAPERT") instead of long raw IDs
  const shortTag = useMemo(() => {
    return site.code
      .replace(/^ART-/, '')
      .replace(/-RIDGE$/, '')
      .replace(/-MASSIF$/, '')
      .replace(/-RIM$/, '');
  }, [site.code]);

  return (
    <group>
      {/* Hairline surface-normal stem */}
      <Line
        points={[surfacePos, stemTipPos]}
        color={ringColor}
        lineWidth={isHovered ? 1.6 : 0.9}
        transparent
        opacity={isHovered ? 0.95 : 0.55}
      />

      {/* Precision flush surface reticle ring + pinpoint */}
      <group position={surfacePos} quaternion={normalQuat}>
        {/* Invisible larger hit target for effortless clicking/hovering */}
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(site.coordinates);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(site.id);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onHover(null);
          }}
        >
          <circleGeometry args={[0.055, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>

        {/* Outer precision reticle ring */}
        <mesh>
          <ringGeometry args={[isHovered ? 0.028 : 0.019, isHovered ? 0.036 : 0.025, 28]} />
          <meshBasicMaterial
            color={ringColor}
            side={THREE.DoubleSide}
            transparent
            opacity={isHovered ? 1.0 : 0.8}
          />
        </mesh>

        {/* Center pinpoint */}
        <mesh>
          <circleGeometry args={[0.007, 16]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Horizon-culled tactical micro-tag (expands on hover) */}
      <Html
        position={stemTipPos}
        center
        zIndexRange={isHovered ? [40, 0] : [10, 0]}
      >
        <div
          ref={htmlWrapRef}
          className="transition-opacity duration-150 select-none"
          style={{ opacity: 0 }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(site.coordinates);
            }}
            onMouseEnter={() => onHover(site.id)}
            onMouseLeave={() => onHover(null)}
            className={`group flex items-center gap-1.5 text-left transition-all ${
              isHovered
                ? 'px-2.5 py-1.5 rounded-lg bg-[#050914]/95 border border-sky-400/80 shadow-[0_8px_24px_rgba(0,0,0,0.9)] scale-105'
                : 'px-1.5 py-0.5 rounded bg-[#050811]/80 border border-white/15 hover:border-sky-400/60 backdrop-blur-sm'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isSynthetic
                  ? 'bg-rose-400'
                  : isArtemis
                    ? 'bg-sky-400'
                    : 'bg-slate-400'
              }`}
            />
            {isHovered ? (
              <div className="space-y-0.5">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-white whitespace-nowrap flex items-center gap-1.5">
                  <span>{site.name}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300">
                    {site.coordinates.latitudeDeg.toFixed(1)}°
                  </span>
                </div>
                <div className="font-mono text-[9px] text-slate-300 whitespace-nowrap">
                  Elev {site.elevationMeters >= 0 ? '+' : ''}
                  {site.elevationMeters}m · Slope {site.meanSlopeDeg}° · Click to Target
                </div>
              </div>
            ) : (
              <span className="font-mono text-[9px] font-medium uppercase tracking-widest text-slate-200/90 whitespace-nowrap">
                {shortTag}
              </span>
            )}
          </button>
        </div>
      </Html>
    </group>
  );
};

/**
 * Modular 3D mission overlay layer for the global Moon:
 * NASA Eyes-inspired flush surface reticles, horizon-culled HUD callouts, and precision sightline vectors.
 */
export const MissionOverlays: React.FC<MissionOverlaysProps> = ({
  scenario,
  comparisonScenarios,
  candidateSites,
  nearbyRecommendations = [],
  globalSunPosition,
  showCandidates,
  showVectors,
  onSelectCoordinates,
}) => {
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const outerCrosshairRef = useRef<THREE.Group>(null);
  const relocationBeadRef = useRef<THREE.Mesh>(null);
  const activeTagRef = useRef<HTMLDivElement>(null);
  const sunTagRef = useRef<HTMLDivElement>(null);
  const earthTagRef = useRef<HTMLDivElement>(null);
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
  const [hoveredRecId, setHoveredRecId] = useState<string | null>(null);
  const [hoveredOrigin, setHoveredOrigin] = useState<boolean>(false);

  // Track previous coordinate to render a smooth 3D ballistic relocation arc when switching sites
  const prevCommittedCoordsRef = useRef<LunarCoordinates>(scenario.coordinates);
  const [originCoords, setOriginCoords] = useState<LunarCoordinates | null>(null);
  const [hopDistanceKm, setHopDistanceKm] = useState<number>(0);
  const hopTimestampRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevCommittedCoordsRef.current;
    const curr = scenario.coordinates;
    const distKm = computeLunarSurfaceDistanceKm(prev, curr);
    if (distKm >= 0.4) {
      setOriginCoords(prev);
      setHopDistanceKm(Number(distKm.toFixed(1)));
      hopTimestampRef.current = performance.now();
      prevCommittedCoordsRef.current = curr;
    }
  }, [scenario.coordinates.latitudeDeg, scenario.coordinates.longitudeDeg]);

  const { camera } = useThree();

  // Active target flush surface coordinates
  const globalTargetPos = useMemo((): [number, number, number] => {
    return lunarLatLonToCartesian3D(
      scenario.coordinates.latitudeDeg,
      scenario.coordinates.longitudeDeg,
      MOON_SPHERE_RADIUS + 0.014
    );
  }, [scenario.coordinates.latitudeDeg, scenario.coordinates.longitudeDeg]);

  // Compact stem tip for the active target callout (0.21 units above surface instead of 0.46)
  const globalTargetCalloutPos = useMemo((): [number, number, number] => {
    return lunarLatLonToCartesian3D(
      scenario.coordinates.latitudeDeg,
      scenario.coordinates.longitudeDeg,
      MOON_SPHERE_RADIUS + 0.21
    );
  }, [scenario.coordinates.latitudeDeg, scenario.coordinates.longitudeDeg]);

  const targetOrientationQuat = useMemo(
    () => computeSurfaceNormalQuaternion(globalTargetPos),
    [globalTargetPos]
  );

  const targetNormalVec = useMemo(
    () => new THREE.Vector3(...globalTargetPos).normalize(),
    [globalTargetPos]
  );
  const targetPosVec = useMemo(() => new THREE.Vector3(...globalTargetPos), [globalTargetPos]);
  const toCamScratch = useMemo(() => new THREE.Vector3(), []);

  // Sun & Earth directional vectors (sleek 0.58-unit sightlines with arrowhead cones)
  const sunDirVec = useMemo(
    () => new THREE.Vector3(...globalSunPosition).normalize(),
    [globalSunPosition]
  );

  const globalSunVectorTip = useMemo((): [number, number, number] => {
    return [
      globalTargetPos[0] + sunDirVec.x * 0.58,
      globalTargetPos[1] + sunDirVec.y * 0.58,
      globalTargetPos[2] + sunDirVec.z * 0.58,
    ];
  }, [globalTargetPos, sunDirVec]);

  const sunConeQuat = useMemo(() => computeConeDirectionQuaternion(sunDirVec), [sunDirVec]);

  const earthDirVec = useMemo(() => {
    return new THREE.Vector3(
      ...lunarLatLonToCartesian3D(
        scenario.instantaneousEarth.librationLatitudeDeg,
        scenario.instantaneousEarth.librationLongitudeDeg,
        1.0
      )
    ).normalize();
  }, [
    scenario.instantaneousEarth.librationLatitudeDeg,
    scenario.instantaneousEarth.librationLongitudeDeg,
  ]);

  const globalEarthVectorTip = useMemo((): [number, number, number] => {
    return [
      globalTargetPos[0] + earthDirVec.x * 0.54,
      globalTargetPos[1] + earthDirVec.y * 0.54,
      globalTargetPos[2] + earthDirVec.z * 0.54,
    ];
  }, [globalTargetPos, earthDirVec]);

  const earthConeQuat = useMemo(() => computeConeDirectionQuaternion(earthDirVec), [earthDirVec]);

  // Compute curved 3D relocation transfer arc from previous origin coordinate to active target
  const relocationData = useMemo(() => {
    if (!originCoords || hopDistanceKm < 0.4 || hopDistanceKm > 650) {
      return null;
    }
    const originPos = lunarLatLonToCartesian3D(
      originCoords.latitudeDeg,
      originCoords.longitudeDeg,
      MOON_SPHERE_RADIUS + 0.013
    );
    const originTip = lunarLatLonToCartesian3D(
      originCoords.latitudeDeg,
      originCoords.longitudeDeg,
      MOON_SPHERE_RADIUS + 0.095
    );
    const originQuat = computeSurfaceNormalQuaternion(originPos);

    const vStart = new THREE.Vector3(...originPos);
    const vEnd = new THREE.Vector3(...globalTargetPos);
    const chordLen = vStart.distanceTo(vEnd);
    const apexBoost = Math.min(0.18, Math.max(0.028, chordLen * 0.32));

    const segments = 20;
    const arcPoints: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const interp = new THREE.Vector3().lerpVectors(vStart, vEnd, t).normalize();
      const parabola = 4 * t * (1 - t);
      const radius = MOON_SPHERE_RADIUS + 0.014 + apexBoost * parabola;
      interp.multiplyScalar(radius);
      arcPoints.push([interp.x, interp.y, interp.z]);
    }

    return {
      originPos,
      originTip,
      originQuat,
      arcPoints,
    };
  }, [originCoords, hopDistanceKm, globalTargetPos]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (pulseRingRef.current) {
      const t = (elapsed * 0.75) % 1;
      const scale = 1 + t * 1.85;
      pulseRingRef.current.scale.set(scale, scale, 1);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = (1 - t) * 0.6;
      }
    }

    if (outerCrosshairRef.current) {
      outerCrosshairRef.current.rotation.z = elapsed * 0.25;
    }

    // Animate telemetry bead traveling along the relocation trajectory arc from Origin -> New Target
    if (relocationBeadRef.current && relocationData) {
      const pts = relocationData.arcPoints;
      const cycle = (elapsed * 0.85) % 1;
      const floatIdx = cycle * (pts.length - 1);
      const idx0 = Math.floor(floatIdx);
      const idx1 = Math.min(pts.length - 1, idx0 + 1);
      const frac = floatIdx - idx0;
      const p0 = pts[idx0];
      const p1 = pts[idx1];
      relocationBeadRef.current.position.set(
        p0[0] + (p1[0] - p0[0]) * frac,
        p0[1] + (p1[1] - p0[1]) * frac,
        p0[2] + (p1[2] - p0[2]) * frac
      );
    }

    // Horizon occlusion check for active target and vector badges
    const toCam = toCamScratch.copy(camera.position).sub(targetPosVec).normalize();
    const facingDot = targetNormalVec.dot(toCam);
    const isVisibleHemisphere = facingDot > 0.02;

    if (activeTagRef.current) {
      activeTagRef.current.style.opacity = isVisibleHemisphere ? '1' : '0';
    }
    if (sunTagRef.current) {
      sunTagRef.current.style.opacity = isVisibleHemisphere ? '1' : '0';
    }
    if (earthTagRef.current) {
      earthTagRef.current.style.opacity = isVisibleHemisphere ? '1' : '0';
    }
  });

  const isSunUp = scenario.instantaneousSun.visibleSolarDiscFraction > 0.05;
  const isDteUp = scenario.instantaneousEarth.isDteOperational;

  return (
    <group>
      {/* 3D Ballistic Relocation Trajectory Arc & Origin Ghost Reticle */}
      {relocationData && originCoords && (
        <group>
          {/* Curved trajectory arc from previous location to new location */}
          <Line
            points={relocationData.arcPoints}
            color="#38bdf8"
            lineWidth={1.8}
            dashed
            dashSize={0.022}
            gapSize={0.014}
            transparent
            opacity={hoveredOrigin ? 0.95 : 0.72}
          />

          {/* Animated transfer pulse bead traveling along the relocation arc */}
          <mesh ref={relocationBeadRef}>
            <sphereGeometry args={[0.011, 12, 12]} />
            <meshBasicMaterial color="#34d399" />
          </mesh>

          {/* Clickable Origin Point Ghost Reticle (Return to previous coordinate) */}
          <group position={relocationData.originPos} quaternion={relocationData.originQuat}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectCoordinates(originCoords);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredOrigin(true);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoveredOrigin(false);
              }}
            >
              <circleGeometry args={[0.048, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <ringGeometry args={[0.018, 0.025, 24]} />
              <meshBasicMaterial
                color="#38bdf8"
                side={THREE.DoubleSide}
                transparent
                opacity={hoveredOrigin ? 1.0 : 0.75}
              />
            </mesh>
            <mesh>
              <circleGeometry args={[0.005, 12]} />
              <meshBasicMaterial color="#bae6fd" side={THREE.DoubleSide} />
            </mesh>
          </group>

          {hoveredOrigin && (
            <Html position={relocationData.originTip} center zIndexRange={[45, 0]}>
              <div className="px-2.5 py-1.5 rounded-lg bg-[#050C1A]/95 border border-sky-400/80 shadow-xl backdrop-blur-md text-left pointer-events-none select-none whitespace-nowrap">
                <div className="font-mono text-[10px] font-bold text-sky-300">
                  ↩ ORIGIN POINT ({hopDistanceKm} km hop)
                </div>
                <div className="font-mono text-[9px] text-slate-200 mt-0.5">
                  {originCoords.latitudeDeg.toFixed(2)}°, {originCoords.longitudeDeg.toFixed(2)}° · Click to revert
                </div>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Non-Selected Candidate Landing Sites */}
      {showCandidates &&
        candidateSites
          .filter((site) => scenario.matchedPresetSite?.id !== site.id)
          .map((site) => (
            <CandidateSiteNode
              key={site.id}
              site={site}
              activeCoords={scenario.coordinates}
              isHovered={hoveredSiteId === site.id}
              onHover={setHoveredSiteId}
              onSelect={onSelectCoordinates}
            />
          ))}

      {/* Nearby Better / Alternative Landing Zone Reticles (REC-01, REC-02, REC-03) */}
      {showCandidates &&
        nearbyRecommendations.map((rec) => {
          const rPos = lunarLatLonToCartesian3D(
            rec.coordinates.latitudeDeg,
            rec.coordinates.longitudeDeg,
            MOON_SPHERE_RADIUS + 0.013
          );
          const isHovered = hoveredRecId === rec.id;
          const rTip = lunarLatLonToCartesian3D(
            rec.coordinates.latitudeDeg,
            rec.coordinates.longitudeDeg,
            MOON_SPHERE_RADIUS + (isHovered ? 0.14 : 0.07)
          );
          const rQuat = computeSurfaceNormalQuaternion(rPos);
          return (
            <group key={rec.id}>
              {/* Only show recon range line when hovering this recommendation so the 3D Moon stays clean */}
              {isHovered && (
                <Line
                  points={[globalTargetPos, rPos]}
                  color="#38bdf8"
                  lineWidth={1.2}
                  dashed
                  dashSize={0.025}
                  gapSize={0.02}
                  transparent
                  opacity={0.85}
                />
              )}
              {/* Subtle surface reticle ring */}
              <group position={rPos} quaternion={rQuat}>
                <mesh
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCoordinates(rec.coordinates);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredRecId(rec.id);
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    setHoveredRecId(null);
                  }}
                >
                  <circleGeometry args={[0.048, 16]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <ringGeometry args={[isHovered ? 0.024 : 0.017, isHovered ? 0.032 : 0.023, 24]} />
                  <meshBasicMaterial
                    color="#10b981"
                    side={THREE.DoubleSide}
                    transparent
                    opacity={isHovered ? 1.0 : 0.85}
                  />
                </mesh>
                <mesh>
                  <circleGeometry args={[0.006, 12]} />
                  <meshBasicMaterial color="#6ee7b7" side={THREE.DoubleSide} />
                </mesh>
              </group>

              {isHovered && (
                <Html position={rTip} center zIndexRange={[45, 0]}>
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#04130E]/95 border border-emerald-400/80 shadow-xl backdrop-blur-md text-left pointer-events-none select-none whitespace-nowrap">
                    <div className="font-mono text-[10px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <span>★ {rec.code} · {rec.distanceKm}km {rec.compassDirection}</span>
                      {rec.scoreDeltaVsSelected > 0 && (
                        <span className="px-1 py-0.2 rounded bg-emerald-500/25 text-emerald-200 text-[9px]">
                          +{rec.scoreDeltaVsSelected} pts
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[9px] text-white mt-0.5">
                      {rec.primaryAdvantageReason}
                    </div>
                  </div>
                </Html>
              )}
            </group>
          );
        })}

      {/* Active Target Precision Surface Reticle & NASA Tactical HUD Callout */}
      <group>
        {/* Fine vertical leader line along surface normal */}
        <Line
          points={[globalTargetPos, globalTargetCalloutPos]}
          color="#f59e0b"
          lineWidth={1.6}
          transparent
          opacity={0.9}
        />

        {/* Surface-tangent concentric target rings */}
        <group position={globalTargetPos} quaternion={targetOrientationQuat}>
          {/* Inner high-contrast target lock ring */}
          <mesh>
            <ringGeometry args={[0.026, 0.035, 36]} />
            <meshBasicMaterial
              color="#f59e0b"
              side={THREE.DoubleSide}
              transparent
              opacity={0.95}
            />
          </mesh>

          {/* Rotating segmented outer tactical ring */}
          <group ref={outerCrosshairRef}>
            {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
              <mesh key={idx} rotation={[0, 0, angle]}>
                <ringGeometry args={[0.046, 0.052, 12, 1, 0, Math.PI / 3.2]} />
                <meshBasicMaterial
                  color="#38bdf8"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.85}
                />
              </mesh>
            ))}
          </group>

          {/* Expanding radar pulse ring */}
          <mesh ref={pulseRingRef}>
            <ringGeometry args={[0.036, 0.045, 36]} />
            <meshBasicMaterial
              color="#fbbf24"
              side={THREE.DoubleSide}
              transparent
              opacity={0.5}
            />
          </mesh>

          {/* Center bullseye pinpoint */}
          <mesh>
            <circleGeometry args={[0.01, 20]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* Active Site NASA HUD Telemetry Callout Card */}
        <Html position={globalTargetCalloutPos} center zIndexRange={[30, 0]}>
          <div
            ref={activeTagRef}
            className="pointer-events-none select-none transition-opacity duration-150"
          >
            <div className="relative px-3 py-1.5 rounded-lg bg-[#050914]/92 border border-amber-400/70 shadow-[0_10px_28px_rgba(0,0,0,0.92)] backdrop-blur-md">
              {/* Top tactical header row */}
              <div className="flex items-center justify-between gap-3 text-[9px] font-mono uppercase tracking-widest text-amber-300">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  TARGET LOCK · {scenario.matchedPresetSite?.code || 'CUSTOM'}
                </span>
                <span className="text-sky-300">
                  {scenario.coordinates.latitudeDeg.toFixed(2)}°,{' '}
                  {scenario.coordinates.longitudeDeg.toFixed(1)}°
                </span>
              </div>

              {/* Site Name */}
              <div className="font-display text-xs font-semibold text-white whitespace-nowrap mt-0.5">
                {scenario.matchedPresetSite
                  ? scenario.matchedPresetSite.name
                  : 'Custom Selenographic Target'}
              </div>

              {/* Micro status strip */}
              <div className="mt-1 pt-1 border-t border-white/10 flex items-center gap-2.5 text-[9px] font-mono whitespace-nowrap">
                <span className={isSunUp ? 'text-amber-300' : 'text-rose-300'}>
                  ☉ {scenario.instantaneousSun.elevationDeg >= 0 ? '+' : ''}
                  {scenario.instantaneousSun.elevationDeg.toFixed(1)}° (
                  {Math.round(scenario.instantaneousSun.estimatedElectricalPowerWatts)}W)
                </span>
                <span className="text-white/25">|</span>
                <span className={isDteUp ? 'text-sky-300' : 'text-slate-400'}>
                  ⊕ {scenario.instantaneousEarth.elevationDeg >= 0 ? '+' : ''}
                  {scenario.instantaneousEarth.elevationDeg.toFixed(1)}°{' '}
                  {isDteUp ? 'DTE' : 'OCC'}
                </span>
              </div>
            </div>
          </div>
        </Html>
      </group>

      {/* Pinned Comparison Scenario Beacons */}
      {comparisonScenarios.map((comp, idx) => {
        const cPos = lunarLatLonToCartesian3D(
          comp.coordinates.latitudeDeg,
          comp.coordinates.longitudeDeg,
          MOON_SPHERE_RADIUS + 0.014
        );
        const cTip = lunarLatLonToCartesian3D(
          comp.coordinates.latitudeDeg,
          comp.coordinates.longitudeDeg,
          MOON_SPHERE_RADIUS + 0.14
        );
        const cQuat = computeSurfaceNormalQuaternion(cPos);
        return (
          <group key={comp.scenarioId + idx}>
            <Line
              points={[cPos, cTip]}
              color="#38bdf8"
              lineWidth={1.2}
              transparent
              opacity={0.75}
            />
            <group position={cPos} quaternion={cQuat}>
              <mesh>
                <ringGeometry args={[0.022, 0.03, 28]} />
                <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
              </mesh>
            </group>
            <Html position={cTip} center zIndexRange={[15, 0]}>
              <div className="px-2 py-0.5 rounded bg-[#050914]/90 border border-sky-400/50 text-[9px] font-mono uppercase tracking-wider text-sky-200 whitespace-nowrap pointer-events-none backdrop-blur-md shadow-md">
                {comp.scenarioLabel} · {comp.matchedPresetSite?.code || 'CUSTOM'}
              </div>
            </Html>
          </group>
        );
      })}

      {/* Precision Sun & Earth Line-of-Sight Vectors */}
      {showVectors && (
        <group>
          {/* Solar Ray Vector + Arrowhead Cone */}
          <Line
            points={[globalTargetPos, globalSunVectorTip]}
            color="#fbbf24"
            lineWidth={1.8}
            transparent
            opacity={0.9}
          />
          <mesh position={globalSunVectorTip} quaternion={sunConeQuat}>
            <coneGeometry args={[0.016, 0.048, 16]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
          <Html position={globalSunVectorTip} center zIndexRange={[20, 0]}>
            <div
              ref={sunTagRef}
              className="mt-[-18px] px-2 py-0.5 rounded bg-[#140F05]/90 border border-amber-400/60 text-[9px] font-mono uppercase tracking-wider text-amber-200 whitespace-nowrap pointer-events-none shadow-md transition-opacity duration-150"
            >
              ☉ SUN {scenario.instantaneousSun.elevationDeg >= 0 ? '+' : ''}
              {scenario.instantaneousSun.elevationDeg.toFixed(1)}°
            </div>
          </Html>

          {/* Earth DTE Ray Vector + Arrowhead Cone */}
          <Line
            points={[globalTargetPos, globalEarthVectorTip]}
            color="#38bdf8"
            lineWidth={1.6}
            dashed={!scenario.instantaneousEarth.isDteOperational}
            transparent
            opacity={0.85}
          />
          <mesh position={globalEarthVectorTip} quaternion={earthConeQuat}>
            <coneGeometry args={[0.015, 0.045, 16]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <Html position={globalEarthVectorTip} center zIndexRange={[20, 0]}>
            <div
              ref={earthTagRef}
              className="mt-[-18px] px-2 py-0.5 rounded bg-[#050D1A]/90 border border-sky-400/60 text-[9px] font-mono uppercase tracking-wider text-sky-200 whitespace-nowrap pointer-events-none shadow-md transition-opacity duration-150"
            >
              ⊕ EARTH {scenario.instantaneousEarth.elevationDeg >= 0 ? '+' : ''}
              {scenario.instantaneousEarth.elevationDeg.toFixed(1)}°
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};
