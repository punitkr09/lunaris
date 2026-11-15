import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { lunarLatLonToCartesian3D } from '../../science/lunarMath';
import { MOON_SPHERE_RADIUS } from './types';

interface CardinalMarkerProps {
  position: [number, number, number];
  normal: [number, number, number];
  label: string;
  sublabel: string;
  accent?: boolean;
}

const HorizonCulledGraticuleLabel: React.FC<CardinalMarkerProps> = ({
  position,
  normal,
  label,
  sublabel,
  accent = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const normalVec = useMemo(() => new THREE.Vector3(...normal).normalize(), [normal]);
  const posVec = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame(({ camera }) => {
    const el = ref.current;
    if (!el) return;
    const toCam = camera.position.clone().sub(posVec).normalize();
    const dot = normalVec.dot(toCam);
    if (dot < 0.22) {
      el.style.opacity = '0';
    } else {
      const alpha = Math.min(1, (dot - 0.22) / 0.3);
      el.style.opacity = String((alpha * 0.72).toFixed(2));
    }
  });

  return (
    <Html position={position} center zIndexRange={[5, 0]}>
      <div
        ref={ref}
        style={{ opacity: 0 }}
        className="pointer-events-none select-none transition-opacity duration-150"
      >
        <div
          className={`px-2 py-0.5 rounded border backdrop-blur-sm flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest whitespace-nowrap ${
            accent
              ? 'bg-[#050914]/75 border-sky-400/35 text-sky-300'
              : 'bg-[#050811]/70 border-white/10 text-slate-400'
          }`}
        >
          <span>{label}</span>
          <span className="text-white/25">·</span>
          <span className="text-[8px] text-slate-400">{sublabel}</span>
        </div>
      </div>
    </Html>
  );
};

/**
 * Full 3D Spherical Latitude / Longitude Graticule Grid (-90° to +90°, -180° to +180°).
 * Uses horizon-culled cartographic labels that fade cleanly when rotated toward the limb.
 */
export const GlobalSphericalGraticule: React.FC = () => {
  const r = MOON_SPHERE_RADIUS + 0.015;

  const parallels = useMemo(() => {
    const lats = [-85, -60, -30, 0, 30, 60, 85];
    return lats.map((lat) => {
      const pts: [number, number, number][] = [];
      for (let lon = -180; lon <= 180; lon += 4) {
        pts.push(lunarLatLonToCartesian3D(lat, lon, r));
      }
      return { lat, pts };
    });
  }, [r]);

  const meridians = useMemo(() => {
    const lons = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
    return lons.map((lon) => {
      const pts: [number, number, number][] = [];
      for (let lat = -90; lat <= 90; lat += 4) {
        pts.push(lunarLatLonToCartesian3D(lat, lon, r));
      }
      return { lon, pts };
    });
  }, [r]);

  return (
    <group>
      {parallels.map((p) => (
        <Line
          key={`lat-${p.lat}`}
          points={p.pts}
          color={
            p.lat === -85
              ? '#38bdf8'
              : p.lat === 0 || p.lat === 85
                ? '#64748b'
                : '#334155'
          }
          lineWidth={p.lat === -85 ? 1.1 : p.lat === 0 ? 0.9 : 0.5}
          transparent
          opacity={p.lat === -85 ? 0.5 : p.lat === 0 ? 0.32 : 0.16}
        />
      ))}
      {meridians.map((m) => (
        <Line
          key={`lon-${m.lon}`}
          points={m.pts}
          color={m.lon === 0 ? '#94a3b8' : m.lon === 180 ? '#64748b' : '#334155'}
          lineWidth={m.lon === 0 || m.lon === 180 ? 0.9 : 0.5}
          transparent
          opacity={m.lon === 0 || m.lon === 180 ? 0.35 : 0.15}
        />
      ))}

      {/* Horizon-Culled Cartographic Coordinate Reference Ticks */}
      <HorizonCulledGraticuleLabel
        position={[0, r + 0.1, 0]}
        normal={[0, 1, 0]}
        label="90°N"
        sublabel="NORTH POLE"
      />
      <HorizonCulledGraticuleLabel
        position={lunarLatLonToCartesian3D(-85, 45, r + 0.06)}
        normal={lunarLatLonToCartesian3D(-85, 45, 1)}
        label="85°S"
        sublabel="ARTEMIS POLAR CIRCLE"
        accent
      />
      <HorizonCulledGraticuleLabel
        position={[0, 0, r + 0.06]}
        normal={[0, 0, 1]}
        label="0° LON"
        sublabel="SUB-EARTH MERIDIAN"
      />
      <HorizonCulledGraticuleLabel
        position={[0, 0, -r - 0.06]}
        normal={[0, 0, -1]}
        label="180° LON"
        sublabel="FAR-SIDE ANTI-MERIDIAN"
      />
    </group>
  );
};
