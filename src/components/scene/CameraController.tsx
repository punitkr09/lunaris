import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LunarCoordinates } from '../../types/navigation';
import { lunarLatLonToCartesian3D } from '../../science/lunarMath';
import {
  CameraPreset,
  INITIAL_CAMERA_POSITION,
  MoonViewMode,
} from './types';

interface CameraControllerProps {
  viewMode: MoonViewMode;
  cameraPreset: CameraPreset;
  targetCoords: LunarCoordinates;
  autoRotate: boolean;
  onPresetComplete: () => void;
  onUserInteract?: () => void;
}

/**
 * Smooth, damped OrbitControls and spherical-arc camera animator.
 * - Automatically glides along a spherical orbital arc whenever targetCoords or cameraPreset changes.
 * - User pointer interaction immediately cancels any in-flight preset transition.
 */
export const CameraController: React.FC<CameraControllerProps> = ({
  viewMode,
  cameraPreset,
  targetCoords,
  autoRotate,
  onPresetComplete,
  onUserInteract,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const desiredPosRef = useRef<THREE.Vector3 | null>(null);
  const desiredTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const prevCoordsRef = useRef<{ lat: number; lon: number }>({
    lat: targetCoords.latitudeDeg,
    lon: targetCoords.longitudeDeg,
  });

  // Helper to compute an orbital camera position & focal look-at target that frames polar & nearby hops smoothly
  const computeTargetFraming = (
    latDeg: number,
    lonDeg: number,
    distance: number
  ): { camPos: THREE.Vector3; lookTarget: THREE.Vector3 } => {
    const [sx, sy, sz] = lunarLatLonToCartesian3D(latDeg, lonDeg, 2.0);
    const surfaceVec = new THREE.Vector3(sx, sy, sz);
    const normalVec = surfaceVec.clone().normalize();

    // Bias the OrbitControls target 38% toward the actual surface point so nearby hops visibly pan across the terrain
    const lookTarget = surfaceVec.clone().multiplyScalar(0.38);

    // Preserve the local longitude azimuth when tilting the camera at high latitudes (>75°)
    const lonRad = (lonDeg * Math.PI) / 180;
    const radialHorizonDir = new THREE.Vector3(
      Math.cos(lonRad),
      0,
      Math.sin(lonRad)
    ).normalize();

    const camDir = normalVec.clone();
    if (Math.abs(latDeg) > 75) {
      // Blend outward surface normal with local meridian direction so longitude switches smoothly orbit around the pole
      camDir.addScaledVector(radialHorizonDir, 0.32).normalize();
    }

    const camPos = lookTarget.clone().addScaledVector(camDir, distance);
    return { camPos, lookTarget };
  };

  // Trigger smooth camera focus transition when target coordinates change in GLOBAL_SPHERE mode
  useEffect(() => {
    const dLat = Math.abs(targetCoords.latitudeDeg - prevCoordsRef.current.lat);
    const dLon = Math.abs(targetCoords.longitudeDeg - prevCoordsRef.current.lon);
    if (dLat > 0.0005 || dLon > 0.0005) {
      // Check if this is a nearby regional switch (< ~6 degrees angular separation)
      const isNearbyHop = dLat < 6.0 && dLon < 45.0;
      prevCoordsRef.current = {
        lat: targetCoords.latitudeDeg,
        lon: targetCoords.longitudeDeg,
      };
      if (viewMode === 'GLOBAL_SPHERE') {
        const focusDist = isNearbyHop ? 3.85 : 4.45;
        const { camPos, lookTarget } = computeTargetFraming(
          targetCoords.latitudeDeg,
          targetCoords.longitudeDeg,
          focusDist
        );
        desiredPosRef.current = camPos;
        desiredTargetRef.current = lookTarget;
      }
    }
  }, [targetCoords.latitudeDeg, targetCoords.longitudeDeg, viewMode]);

  useEffect(() => {
    if (viewMode === 'LOCAL_TERRAIN') {
      desiredPosRef.current = new THREE.Vector3(0, 3.4, 3.7);
      desiredTargetRef.current = new THREE.Vector3(0, 0, 0);
      return;
    }

    if (cameraPreset === 'FREE_ORBIT') return;

    const dist = 6.1;
    if (cameraPreset === 'OVERVIEW_SOUTH') {
      desiredPosRef.current = new THREE.Vector3(...INITIAL_CAMERA_POSITION);
      desiredTargetRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'NEARSIDE_0') {
      desiredPosRef.current = new THREE.Vector3(0, 0.35, dist);
      desiredTargetRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'FARSIDE_180') {
      desiredPosRef.current = new THREE.Vector3(0, 0.35, -dist);
      desiredTargetRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'SOUTH_POLE') {
      desiredPosRef.current = new THREE.Vector3(0, -dist * 0.92, 1.35);
      desiredTargetRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'NORTH_POLE') {
      desiredPosRef.current = new THREE.Vector3(0, dist * 0.92, 1.35);
      desiredTargetRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'TARGET_FOCUS') {
      const { camPos, lookTarget } = computeTargetFraming(
        targetCoords.latitudeDeg,
        targetCoords.longitudeDeg,
        4.15
      );
      desiredPosRef.current = camPos;
      desiredTargetRef.current = lookTarget;
    }
  }, [viewMode, cameraPreset, targetCoords]);

  useFrame((_, delta) => {
    if (desiredPosRef.current) {
      const step = Math.min(1, delta * 5.2);

      if (viewMode === 'GLOBAL_SPHERE') {
        // Spherical orbital interpolation prevents camera from cutting through the Moon sphere
        const currentRadius = camera.position.length();
        const targetRadius = desiredPosRef.current.length();
        const nextRadius = THREE.MathUtils.lerp(currentRadius, targetRadius, step);

        const currentDir = camera.position.clone().normalize();
        const targetDir = desiredPosRef.current.clone().normalize();
        currentDir.lerp(targetDir, step).normalize();

        camera.position.copy(currentDir.multiplyScalar(nextRadius));
      } else {
        camera.position.lerp(desiredPosRef.current, step);
      }

      if (controlsRef.current) {
        controlsRef.current.target.lerp(desiredTargetRef.current, step);
        controlsRef.current.update();
      }
      if (
        camera.position.distanceTo(desiredPosRef.current) < 0.025 &&
        (!controlsRef.current ||
          controlsRef.current.target.distanceTo(desiredTargetRef.current) < 0.015)
      ) {
        camera.position.copy(desiredPosRef.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(desiredTargetRef.current);
          controlsRef.current.update();
        }
        desiredPosRef.current = null;
        onPresetComplete();
      }
    }
  });

  const handleUserInteractionStart = () => {
    if (desiredPosRef.current) {
      desiredPosRef.current = null;
      onPresetComplete();
    }
    onUserInteract?.();
  };

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      autoRotate={autoRotate && viewMode === 'GLOBAL_SPHERE'}
      autoRotateSpeed={0.42}
      enableDamping={true}
      dampingFactor={0.055}
      rotateSpeed={0.72}
      zoomSpeed={0.8}
      enablePan={viewMode === 'LOCAL_TERRAIN'}
      enableZoom={true}
      enableRotate={true}
      minDistance={viewMode === 'GLOBAL_SPHERE' ? 2.95 : 1.5}
      maxDistance={viewMode === 'GLOBAL_SPHERE' ? 12.5 : 9.0}
      onStart={handleUserInteractionStart}
    />
  );
};
