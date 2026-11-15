import * as THREE from 'three';

export type TextureQualityTier = 'ULTRA' | 'STANDARD' | 'PERFORMANCE';

/**
 * Loads authoritative 4K (4096x2048) NASA LRO lunar textures (NASA GSFC SVS #4720 CGI Moon Kit,
 * derived from LRO LROC Wide Angle Camera Hapke Normalized Mosaic + LRO LOLA 16 px/deg DEM
 * centered on 0° longitude in the MOON_ME reference frame), with an instant procedural
 * fallback canvas while images stream in.
 *
 * The bundle is a process-wide singleton. Because the textures are swapped into the bundle
 * asynchronously, consumers must subscribe via `subscribeLunarTextureUpdates()` so that any
 * component mounted after the first request (e.g. after a Global ↔ Local view switch) still
 * re-renders when a map arrives. Load failures are recorded (not silently ignored) so the UI
 * can disclose that the procedural fallback is on screen instead of NASA imagery.
 */

export interface GeneratedMoonTextures {
  regolithAlbedoTexture: THREE.Texture;
  lolaHypsometricTexture: THREE.Texture;
  displacementTexture: THREE.Texture;
  normalTexture: THREE.Texture;
}

export type LunarTextureMapKey = keyof GeneratedMoonTextures;

export interface LunarTextureLoadStatus {
  /** Number of the 4 NASA maps that have finished loading */
  loadedCount: number;
  /** Number of maps that failed to load (procedural fallback remains in use) */
  failedCount: number;
  totalCount: number;
  /** Which maps failed, by bundle key */
  failedKeys: LunarTextureMapKey[];
  /** True once every map has either loaded or failed */
  settled: boolean;
}

const TEXTURE_SOURCES: { key: LunarTextureMapKey; url: string; isColor: boolean }[] = [
  { key: 'regolithAlbedoTexture', url: '/textures/lroc_color_4k.jpg', isColor: true },
  { key: 'lolaHypsometricTexture', url: '/textures/lola_hypsometric_4k.jpg', isColor: true },
  { key: 'displacementTexture', url: '/textures/lola_disp_4k.jpg', isColor: false },
  { key: 'normalTexture', url: '/textures/lola_normal_4k.jpg', isColor: false },
];

let cachedNasaTextures: GeneratedMoonTextures | null = null;
let loadStarted = false;
const listeners = new Set<() => void>();
const status: LunarTextureLoadStatus = {
  loadedCount: 0,
  failedCount: 0,
  totalCount: TEXTURE_SOURCES.length,
  failedKeys: [],
  settled: false,
};

function notifyListeners() {
  for (const cb of Array.from(listeners)) {
    try {
      cb();
    } catch (err) {
      console.error('LUNARIS texture listener failed:', err);
    }
  }
}

function createFallbackTexture(r: number, g: number, b: number, isColor: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 64, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  return tex;
}

function applyAnisotropy(bundle: GeneratedMoonTextures, anisotropy: number) {
  for (const src of TEXTURE_SOURCES) {
    const tex = bundle[src.key];
    if (tex.anisotropy !== anisotropy) {
      tex.anisotropy = anisotropy;
      tex.needsUpdate = true;
    }
  }
}

/** Current NASA texture streaming status (snapshot). */
export function getLunarTextureLoadStatus(): LunarTextureLoadStatus {
  return { ...status, failedKeys: [...status.failedKeys] };
}

/**
 * Subscribe to texture bundle changes (a map finished loading or failed).
 * Returns an unsubscribe function.
 */
export function subscribeLunarTextureUpdates(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getOrGenerateLunarSphereTextures(
  tier: TextureQualityTier = 'ULTRA'
): GeneratedMoonTextures {
  const anisotropy = tier === 'ULTRA' ? 16 : tier === 'STANDARD' ? 8 : 2;

  if (cachedNasaTextures) {
    applyAnisotropy(cachedNasaTextures, anisotropy);
    return cachedNasaTextures;
  }

  const bundle: GeneratedMoonTextures = {
    regolithAlbedoTexture: createFallbackTexture(135, 136, 140, true),
    lolaHypsometricTexture: createFallbackTexture(70, 120, 180, true),
    displacementTexture: createFallbackTexture(128, 128, 128, false),
    normalTexture: createFallbackTexture(128, 128, 255, false),
  };
  cachedNasaTextures = bundle;

  if (typeof window !== 'undefined' && !loadStarted) {
    loadStarted = true;
    const loader = new THREE.TextureLoader();

    const configure = (tex: THREE.Texture, isColor: boolean) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = anisotropy;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      if (isColor) {
        tex.colorSpace = THREE.SRGBColorSpace;
      }
      tex.needsUpdate = true;
    };

    const settleIfDone = () => {
      if (status.loadedCount + status.failedCount >= status.totalCount) {
        status.settled = true;
      }
    };

    for (const src of TEXTURE_SOURCES) {
      loader.load(
        src.url,
        (tex) => {
          configure(tex, src.isColor);
          const previous = bundle[src.key];
          bundle[src.key] = tex;
          // Release the tiny procedural placeholder once the real map has replaced it.
          if (previous !== tex) previous.dispose();
          status.loadedCount += 1;
          settleIfDone();
          notifyListeners();
        },
        undefined,
        () => {
          console.warn(
            `LUNARIS: NASA texture "${src.url}" failed to load — keeping procedural fallback for ${src.key}.`
          );
          status.failedCount += 1;
          status.failedKeys.push(src.key);
          settleIfDone();
          notifyListeners();
        }
      );
    }
  }

  return bundle;
}
