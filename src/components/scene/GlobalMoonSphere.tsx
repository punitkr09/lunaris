import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { LunarCoordinates } from '../../types/navigation';
import {
  cartesian3DToLunarLatLon,
  lunarLatLonToCartesian3D,
} from '../../science/lunarMath';
import {
  getOrGenerateLunarSphereTextures,
  subscribeLunarTextureUpdates,
} from '../../utils/lunarTextureGenerator';
import {
  MOON_SPHERE_RADIUS,
  SceneQualityMode,
  SurfaceShaderMode,
} from './types';

interface GlobalMoonSphereProps {
  shaderMode: SurfaceShaderMode;
  displacementScale: number;
  qualityMode: SceneQualityMode;
  onSelectCoordinates: (coords: LunarCoordinates) => void;
}

/**
 * Complete 3D Spherical Moon Mesh with exact Selenographic (MOON_ME) vertex/UV mapping,
 * authoritative 4K NASA LRO LROC WAC + LRO LOLA textures, tangent-space normal mapping,
 * and LOLA digital elevation displacement.
 */
export const GlobalMoonSphere: React.FC<GlobalMoonSphereProps> = ({
  shaderMode,
  displacementScale,
  qualityMode,
  onSelectCoordinates,
}) => {
  const [textureRev, setTextureRev] = useState(0);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // The bundle object is a stable singleton whose texture slots are swapped in place as the
  // 4K NASA maps stream in; re-read it on every texture revision so React passes the new
  // texture objects to the material.
  const textures = useMemo(
    () => getOrGenerateLunarSphereTextures(qualityMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qualityMode, textureRev]
  );

  // Subscribe for the lifetime of this component (not only the first mount) so a sphere
  // remounted after a Global ↔ Local switch still picks up maps that finish later.
  useEffect(() => {
    return subscribeLunarTextureUpdates(() => setTextureRev((r) => r + 1));
  }, []);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  }, [textures, textureRev]);

  const latSegments =
    qualityMode === 'ULTRA' ? 256 : qualityMode === 'STANDARD' ? 128 : 64;
  const lonSegments =
    qualityMode === 'ULTRA' ? 512 : qualityMode === 'STANDARD' ? 256 : 128;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= latSegments; y++) {
      const v = y / latSegments;
      const latDeg = 90.0 - v * 180.0;

      for (let x = 0; x <= lonSegments; x++) {
        const u = x / lonSegments;
        const lonDeg = u * 360.0 - 180.0;

        const [vx, vy, vz] = lunarLatLonToCartesian3D(
          latDeg,
          lonDeg,
          MOON_SPHERE_RADIUS
        );
        positions.push(vx, vy, vz);

        const norm = new THREE.Vector3(vx, vy, vz).normalize();
        normals.push(norm.x, norm.y, norm.z);

        // Canvas/Image flipY is true by default in Three.js, so v=1 is top (North Pole +90°)
        uvs.push(u, 1.0 - v);
      }
    }

    for (let y = 0; y < latSegments; y++) {
      for (let x = 0; x < lonSegments; x++) {
        const a = y * (lonSegments + 1) + x;
        const b = a + lonSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeTangents();
    return geo;
  }, [latSegments, lonSegments]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const coords = cartesian3DToLunarLatLon(e.point.x, e.point.y, e.point.z);
    onSelectCoordinates(coords);
  };

  const activeMap =
    shaderMode === 'REGOLITH_ALBEDO'
      ? textures.regolithAlbedoTexture
      : textures.lolaHypsometricTexture;

  const normalScaleVec = useMemo(
    () =>
      new THREE.Vector2(
        1.35 * displacementScale,
        1.35 * displacementScale
      ),
    [displacementScale]
  );

  return (
    <mesh geometry={geometry} onClick={handleClick} receiveShadow castShadow>
      <meshStandardMaterial
        ref={materialRef}
        map={activeMap}
        normalMap={textures.normalTexture}
        normalScale={normalScaleVec}
        displacementMap={textures.displacementTexture}
        displacementScale={0.07 * displacementScale}
        displacementBias={-0.035 * displacementScale}
        roughness={0.94}
        metalness={0.02}
      />
    </mesh>
  );
};
