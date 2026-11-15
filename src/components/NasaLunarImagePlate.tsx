import React from 'react';

export type NasaImageVariant =
  | 'HERO_SOUTH_POLE_HORIZON'
  | 'SHACKLETON_RIDGE_SUNLIGHT'
  | 'MALAPERT_EARTH_LINE_OF_SIGHT'
  | 'MONS_MOUTON_PLATEAU'
  | 'VON_KARMAN_FARSIDE'
  | 'LOLA_LASER_ALTIMETRY'
  | 'LOLA_SLOPE_TERRAIN'
  | 'SYNODIC_SOLAR_CYCLE'
  | 'ARTEMIS_ASTRONAUT_EVA'
  | 'GATEWAY_NRHO_RELAY'
  | 'VIPER_POLAR_ROVER'
  | 'APOLLO_17_PANORAMA';

export interface NasaImageMetadata {
  src: string;
  objectPosition: string;
  scale: string;
  filter: string;
  nasaId: string;
  credit: string;
  caption: string;
  defaultTag: string;
  tintGradient: string;
}

interface NasaLunarImagePlateProps {
  variant: NasaImageVariant;
  className?: string;
  showCaption?: boolean;
  overlayTag?: string;
  /** Load eagerly (above-the-fold hero imagery); default lazy. */
  priority?: boolean;
}

export const NASA_IMAGE_CONFIGS: Record<NasaImageVariant, NasaImageMetadata> = {
  HERO_SOUTH_POLE_HORIZON: {
    src: '/images/nasa/lro_earthrise.jpg',
    objectPosition: '50% 42%',
    scale: 'scale-105',
    filter: 'contrast(1.18) brightness(0.84)',
    nasaId: 'GSFC_20171208_Archive_e000496',
    credit: 'NASA / GSFC / Arizona State University (LRO NAC Earthrise)',
    caption: 'High-resolution Earthrise over the lunar limb captured by NASA Lunar Reconnaissance Orbiter',
    defaultTag: 'NASA LRO ARCHIVE · EARTHRISE OVER LUNAR LIMB',
    tintGradient:
      'radial-gradient(circle at 72% 35%, rgba(56, 189, 248, 0.22), transparent 55%), linear-gradient(90deg, rgba(3,5,9,0.92) 0%, rgba(3,5,9,0.62) 55%, rgba(3,5,9,0.28) 100%)',
  },
  SHACKLETON_RIDGE_SUNLIGHT: {
    src: '/images/nasa/artemis3_polar_lighting_sim.jpg',
    objectPosition: '50% 45%',
    scale: 'scale-105',
    filter: 'contrast(1.15) brightness(0.9)',
    nasaId: 'NASA-JSC-CEB_1528',
    credit: 'NASA / Johnson Space Center (Artemis III Polar Lighting Lab)',
    caption: 'NASA engineers simulate low-angle grazing polar sunlight and long shadows for Artemis III',
    defaultTag: 'ARTEMIS III · LOW-ANGLE POLAR SUNLIGHT',
    tintGradient:
      'radial-gradient(circle at 80% 20%, rgba(251, 191, 36, 0.22), transparent 60%), linear-gradient(180deg, rgba(3,5,9,0.12) 0%, rgba(3,5,9,0.86) 100%)',
  },
  MALAPERT_EARTH_LINE_OF_SIGHT: {
    src: '/images/nasa/artemis1_orion_earth_moon.jpg',
    objectPosition: '50% 50%',
    scale: 'scale-105',
    filter: 'contrast(1.15) brightness(0.9)',
    nasaId: 'NASA-ART001E001822',
    credit: 'NASA / Artemis I Orion Spacecraft Optical Navigation',
    caption: 'Artemis I Flight Day 13: Orion solar array looking back at the Moon and Earth line-of-sight',
    defaultTag: 'ARTEMIS I ORION · EARTH–MOON LINE OF SIGHT',
    tintGradient:
      'radial-gradient(circle at 25% 25%, rgba(56, 189, 248, 0.22), transparent 60%), linear-gradient(180deg, rgba(3,5,9,0.12) 0%, rgba(3,5,9,0.86) 100%)',
  },
  MONS_MOUTON_PLATEAU: {
    src: '/images/nasa/lro_lunar_highlands_oblique.jpg',
    objectPosition: '50% 50%',
    scale: 'scale-105',
    filter: 'contrast(1.25) brightness(0.88)',
    nasaId: 'NASA-JPL-PIA12885',
    credit: 'NASA / GSFC / Arizona State University (LRO Narrow Angle Camera)',
    caption: 'Oblique Lunar Reconnaissance Orbiter view swooping across elevated lunar highland plateaus',
    defaultTag: 'LRO NAC OBLIQUE · HIGHLAND MESA (+5,210M)',
    tintGradient:
      'linear-gradient(180deg, rgba(3,5,9,0.15) 0%, rgba(3,5,9,0.88) 100%)',
  },
  VON_KARMAN_FARSIDE: {
    src: '/images/nasa/lro_farside_crater_roi.jpg',
    objectPosition: '50% 50%',
    scale: 'scale-105',
    filter: 'contrast(1.28) brightness(0.85)',
    nasaId: 'NASA-JPL-PIA13059',
    credit: 'NASA / GSFC / ASU (LRO Far-Side Crater Region of Interest)',
    caption: 'Lunar far-side crater complex inside the South Pole–Aitken Basin (permanent Earth RF occultation)',
    defaultTag: 'LUNAR FAR SIDE · SPA BASIN RECONNAISSANCE',
    tintGradient:
      'radial-gradient(circle at 70% 30%, rgba(244, 63, 94, 0.18), transparent 60%), linear-gradient(180deg, rgba(3,5,9,0.15) 0%, rgba(3,5,9,0.88) 100%)',
  },
  LOLA_LASER_ALTIMETRY: {
    src: '/images/nasa/lro_spacecraft_orbit.jpg',
    objectPosition: '50% 45%',
    scale: 'scale-105',
    filter: 'contrast(1.16) brightness(0.9)',
    nasaId: 'NASA-JPL-PIA18163',
    credit: 'NASA / GSFC / JPL (Lunar Reconnaissance Orbiter in Polar Mapping Orbit)',
    caption: 'NASA Lunar Reconnaissance Orbiter (LRO) mapping polar topography and cold traps with LOLA laser altimetry',
    defaultTag: 'NASA LRO / LOLA ORBITAL LASER ALTIMETRY',
    tintGradient:
      'linear-gradient(180deg, rgba(3,5,9,0.15) 0%, rgba(3,5,9,0.88) 100%)',
  },
  LOLA_SLOPE_TERRAIN: {
    src: '/images/nasa/lro_crater_peak_scarp.jpg',
    objectPosition: '50% 50%',
    scale: 'scale-105',
    filter: 'contrast(1.3) brightness(0.88)',
    nasaId: 'NASA-JPL-PIA13132',
    credit: 'NASA / GSFC / Arizona State University (LRO NAC Scarp & Boulder Field)',
    caption: 'High-resolution LRO Narrow Angle Camera imagery of steep crater scarps and landing slope hazards',
    defaultTag: 'LRO NAC · TERRAIN SLOPE & SCARP HAZARD',
    tintGradient:
      'linear-gradient(180deg, rgba(3,5,9,0.15) 0%, rgba(3,5,9,0.88) 100%)',
  },
  SYNODIC_SOLAR_CYCLE: {
    src: '/images/nasa/artemis3_hls_surface.jpg',
    objectPosition: '50% 45%',
    scale: 'scale-105',
    filter: 'contrast(1.16) brightness(0.9)',
    nasaId: "ARTIST'S CONCEPT",
    credit: "Artist's concept: NASA / SpaceX (Starship Human Landing System)",
    caption: "Artist's concept of the Artemis Human Landing System operating in long-shadow grazing illumination near the Lunar South Pole',
    defaultTag: 'ARTEMIS III HLS · SOUTH POLE SURFACE OPS',
    tintGradient:
      'radial-gradient(circle at 85% 30%, rgba(245, 158, 11, 0.22), transparent 55%), linear-gradient(180deg, rgba(3,5,9,0.15) 0%, rgba(3,5,9,0.88) 100%)',
  },
  ARTEMIS_ASTRONAUT_EVA: {
    src: '/images/nasa/artemis3_astronauts_south_pole.jpg',
    objectPosition: '50% 40%',
    scale: 'scale-105',
    filter: 'contrast(1.15) brightness(0.92)',
    nasaId: "ARTIST'S CONCEPT",
    credit: "Artist's concept: NASA / Axiom Space (Artemis III surface suits)",
    caption: "Artist's concept of astronauts conducting geological science and volatile sampling in extreme polar lighting',
    defaultTag: 'ARTEMIS III · POLAR SURFACE EVA',
    tintGradient:
      'linear-gradient(180deg, rgba(3,5,9,0.12) 0%, rgba(3,5,9,0.86) 100%)',
  },
  GATEWAY_NRHO_RELAY: {
    src: '/images/nasa/gateway_nrho_orbit.jpg',
    objectPosition: '50% 50%',
    scale: 'scale-105',
    filter: 'contrast(1.15) brightness(0.9)',
    nasaId: 'KSC-20240716-PH-NAS01_0002',
    credit: 'NASA / Kennedy Space Center (Lunar Gateway NRHO Architecture)',
    caption: 'NASA Lunar Gateway station in Polar Near-Rectilinear Halo Orbit providing South Pole communications relay',
    defaultTag: 'NASA GATEWAY · NRHO SOUTH POLE RELAY',
    tintGradient:
      'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.2), transparent 60%), linear-gradient(180deg, rgba(3,5,9,0.14) 0%, rgba(3,5,9,0.88) 100%)',
  },
  VIPER_POLAR_ROVER: {
    src: '/images/nasa/viper_rover_slope_lab.jpg',
    objectPosition: '50% 45%',
    scale: 'scale-105',
    filter: 'contrast(1.14) brightness(0.9)',
    nasaId: 'GRC-2022-C-04467',
    credit: 'NASA / Glenn Research Center SLOPE Lab (VIPER Polar Rover)',
    caption: 'NASA VIPER polar volatile prospecting rover undergoing high-slope regolith traction testing',
    defaultTag: 'NASA VIPER · POLAR VOLATILE ROVER',
    tintGradient:
      'linear-gradient(180deg, rgba(3,5,9,0.12) 0%, rgba(3,5,9,0.88) 100%)',
  },
  APOLLO_17_PANORAMA: {
    src: '/images/nasa/apollo17_surface_panorama.jpg',
    objectPosition: '50% 50%',
    scale: 'scale-105',
    filter: 'contrast(1.2) brightness(0.9)',
    nasaId: 'NASA-JSC2004E52772',
    credit: 'NASA / Johnson Space Center (Apollo 17 Taurus-Littrow Surface Panorama)',
    caption: 'Historical Apollo lunar surface operations panorama providing ground-truth reference telemetry',
    defaultTag: 'APOLLO GROUND TRUTH · SURFACE PANORAMA',
    tintGradient:
      'linear-gradient(180deg, rgba(3,5,9,0.14) 0%, rgba(3,5,9,0.88) 100%)',
  },
};

export const NasaLunarImagePlate: React.FC<NasaLunarImagePlateProps> = ({
  variant,
  className = 'h-48',
  showCaption = false,
  overlayTag,
  priority = false,
}) => {
  const cfg = NASA_IMAGE_CONFIGS[variant];
  const tagText = overlayTag || cfg.defaultTag;

  return (
    <div className={`relative overflow-hidden bg-[#030509] select-none ${className}`}>
      <img
        src={cfg.src}
        alt={cfg.caption}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        style={{
          objectPosition: cfg.objectPosition,
          filter: cfg.filter,
        }}
        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.12] ${cfg.scale}`}
      />

      {/* Atmospheric & Editorial Gradient Overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: cfg.tintGradient }}
      />

      {/* Single Clean Minimal Tag Pill */}
      {tagText && (
        <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white/95 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
            <span className="truncate">{tagText}</span>
          </span>
        </div>
      )}

      {/* Optional Full Caption (only when explicitly requested) */}
      {showCaption && (
        <div className="absolute bottom-3 left-3.5 right-3.5 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-lunar-100 bg-black/65 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
          <span className="truncate">{cfg.caption}</span>
          <span className="shrink-0 text-sky-300 font-medium text-[11px]">{cfg.credit}</span>
        </div>
      )}
    </div>
  );
};
