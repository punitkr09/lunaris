export type MoonViewMode = 'GLOBAL_SPHERE' | 'LOCAL_TERRAIN';

export type SurfaceShaderMode = 'REGOLITH_ALBEDO' | 'LOLA_HYPSOMETRIC';

export type CameraPreset =
  | 'FREE_ORBIT'
  | 'OVERVIEW_SOUTH'
  | 'NEARSIDE_0'
  | 'FARSIDE_180'
  | 'SOUTH_POLE'
  | 'NORTH_POLE'
  | 'TARGET_FOCUS';

export type SceneQualityMode = 'ULTRA' | 'STANDARD' | 'PERFORMANCE';

/**
 * External camera choreography request (e.g. from an Expedition card). The `nonce` lets a
 * caller re-issue the same preset twice in a row and still trigger a flight.
 */
export interface CameraChoreographyRequest {
  preset: CameraPreset;
  viewMode: MoonViewMode;
  nonce: number;
}

export const MOON_SPHERE_RADIUS = 2.35;

/** Useful initial camera position showing the full Moon with the South Pole region in view. */
export const INITIAL_CAMERA_POSITION: [number, number, number] = [0, -3.4, 5.2];

/**
 * Visual scale of the synthetic LOCAL_TERRAIN patch: one scene unit ≈ 300 m of lunar surface.
 * The 100 m HLS safety perimeter therefore has a radius of 100 / 300 ≈ 0.333 units.
 * The scale is illustrative (the heightfield itself is a labelled synthetic proxy).
 */
export const LOCAL_PATCH_METERS_PER_UNIT = 300;
export const LOCAL_PATCH_SIZE_UNITS = 6.4;
