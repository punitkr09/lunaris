import React, { useEffect, useState } from 'react';
import {
  Camera,
  ExternalLink,
  Maximize2,
  X,
  Compass,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  NASA_IMAGE_CONFIGS,
  NasaImageVariant,
  NasaLunarImagePlate,
} from './NasaLunarImagePlate';

interface GalleryEntry {
  variant: NasaImageVariant;
  category: string;
  headline: string;
  missionContext: string;
  physicsConnection: string;
  targetSection: string;
  ctaLabel: string;
}

const GALLERY_ENTRIES: GalleryEntry[] = [
  {
    variant: 'HERO_SOUTH_POLE_HORIZON',
    category: 'EARTH COMMUNICATION · LRO NAC',
    headline: 'Earthrise Over the Lunar Horizon',
    missionContext:
      'Captured by the Lunar Reconnaissance Orbiter Narrow Angle Camera (NAC), this high-resolution portrait shows Earth suspended just above the rough lunar limb—mirroring what astronauts at the Lunar South Pole see.',
    physicsConnection:
      'At 89°S, Earth never rises high overhead; it hovers near 0°–7° above the northern horizon and wobbles slowly over a 27.3-day libration cycle.',
    targetSection: '#stage-sky',
    ctaLabel: 'Inspect Earth in Local Sky Dome',
  },
  {
    variant: 'SHACKLETON_RIDGE_SUNLIGHT',
    category: 'SOLAR ILLUMINATION · ARTEMIS III LAB',
    headline: 'Grazing Sunlight & Long Polar Shadows',
    missionContext:
      'Inside NASA Johnson Space Center’s lighting simulation facility, engineers recreate the extreme 1.5° grazing solar incidence angle astronauts experience on Shackleton Connecting Ridge.',
    physicsConnection:
      'Because sunlight skims horizontally across the surface, vertical solar array masts capture up to 28× more solar energy than flat ground-mounted panels.',
    targetSection: '#stage-feasibility',
    ctaLabel: 'View Power Feasibility Matrix',
  },
  {
    variant: 'SYNODIC_SOLAR_CYCLE',
    category: 'SURFACE ARCHITECTURE · HLS',
    headline: 'Artemis III Human Landing System on the South Pole',
    missionContext:
      'A tall vertical lander architecture on the Lunar South Pole takes advantage of elevated ridge illumination while casting kilometer-long shadows across adjacent craters.',
    physicsConnection:
      'Tall landers require touchdown slopes below 8°–10° and battery reserves sized for the longest continuous topographic shadow window.',
    targetSection: '#stage-feasibility',
    ctaLabel: 'Test Lander Compatibility Lab',
  },
  {
    variant: 'ARTEMIS_ASTRONAUT_EVA',
    category: 'SURFACE SCIENCE · AXIOM EVA',
    headline: 'Astronaut Polar EVA & Volatile Prospecting',
    missionContext:
      'Next-generation Axiom Space EVA suits are engineered for extreme thermal gradients between sunlit polar peaks (+54°C) and nearby Permanently Shadowed Regions (-233°C).',
    physicsConnection:
      'Surface EVAs are scheduled during "Nominal Ops" windows where both direct sunlight and Direct-to-Earth radio lock overlap simultaneously.',
    targetSection: '#stage-timeline',
    ctaLabel: 'Inspect Nominal EVA Windows',
  },
  {
    variant: 'MALAPERT_EARTH_LINE_OF_SIGHT',
    category: 'DEEP SPACE OPTICS · ARTEMIS I ORION',
    headline: 'Orion Spacecraft Looking Back at Moon & Earth',
    missionContext:
      'Photographed on Artemis I Flight Day 13 from beyond the Moon, Orion’s solar array wing frames both the lunar surface and distant Earth (~384,400 km range).',
    physicsConnection:
      'LUNARIS models the exact 32 GHz Ka-Band and 8.4 GHz X-Band Free-Space Path Loss (~234.2 dB) across the Earth–Moon distance.',
    targetSection: '#stage-questions',
    ctaLabel: 'Open RF Link Budget Calculator',
  },
  {
    variant: 'LOLA_LASER_ALTIMETRY',
    category: 'ORBITAL RECONNAISSANCE · LRO / LOLA',
    headline: 'Lunar Reconnaissance Orbiter Laser Altimetry',
    missionContext:
      'Since 2009, NASA’s Lunar Reconnaissance Orbiter has fired billions of laser pulses to build the LOLA Digital Elevation Model (LDEM) powering LUNARIS’s 3D globe.',
    physicsConnection:
      'Every elevation value in LUNARIS is referenced to the IAU MOON_ME 1,737.4 km mean spherical radius datum.',
    targetSection: '#stage-globe',
    ctaLabel: 'Toggle LOLA Elevation on 3D Moon',
  },
  {
    variant: 'GATEWAY_NRHO_RELAY',
    category: 'ORBITAL RELAY · LUNAR GATEWAY',
    headline: 'Gateway in Polar Near-Rectilinear Halo Orbit',
    missionContext:
      'Positioned in a highly elliptical 6.5-day polar orbit, NASA’s Gateway station spends most of its orbit high over the Lunar South Pole.',
    physicsConnection:
      'When local mountain ridges or far-side geometry block Direct-to-Earth (DTE) radio, an NRHO relay bridges communication blackouts.',
    targetSection: '#stage-comparison',
    ctaLabel: 'Compare DTE vs. Relay Scenarios',
  },
  {
    variant: 'VIPER_POLAR_ROVER',
    category: 'ROBOTIC MOBILITY · VIPER SLOPE LAB',
    headline: 'VIPER Rover High-Slope Traction Testing',
    missionContext:
      'At NASA Glenn Research Center’s SLOPE Lab, the VIPER volatile-prospecting rover tests wheel mobility across steep lunar regolith simulant slopes.',
    physicsConnection:
      'Rovers tolerate steeper slopes (up to 15°–18°) than tall landers, enabling excursions down into shadowy crater rims.',
    targetSection: '#stage-feasibility',
    ctaLabel: 'Run Rover Slope What-If Check',
  },
];

interface NasaMissionGallerySectionProps {
  onJumpToSection: (selector: string) => void;
}

export const NasaMissionGallerySection: React.FC<NasaMissionGallerySectionProps> = ({
  onJumpToSection,
}) => {
  const [featuredIdx, setFeaturedIdx] = useState<number>(0);
  const [lightboxEntry, setLightboxEntry] = useState<GalleryEntry | null>(null);

  const featured = GALLERY_ENTRIES[featuredIdx] ?? GALLERY_ENTRIES[0];
  const featuredMeta = NASA_IMAGE_CONFIGS[featured.variant];

  // Escape closes the lightbox; ←/→ step through plates while it is open.
  useEffect(() => {
    if (!lightboxEntry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxEntry(null);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = GALLERY_ENTRIES.findIndex((g) => g.variant === lightboxEntry.variant);
        if (idx === -1) return;
        const next =
          (idx + (e.key === 'ArrowRight' ? 1 : -1) + GALLERY_ENTRIES.length) %
          GALLERY_ENTRIES.length;
        setFeaturedIdx(next);
        setLightboxEntry(GALLERY_ENTRIES[next]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxEntry]);

  return (
    <section
      id="stage-nasa-gallery"
      aria-label="NASA Archival Multimedia and Visual Mission Briefing"
      className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-16 space-y-6"
    >
      {/* Top NASA.gov Editorial Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/15 pb-4">
        <div>
          <div className="nasa-eyebrow mb-1.5">
            <span>NASA MULTIMEDIA ARCHIVE // VISUAL MISSION RECONNAISSANCE</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Inside the Artemis &amp; LRO Lunar South Pole Archive
          </h3>
          <p className="text-sm text-lunar-300 mt-1 max-w-3xl">
            Explore official NASA imagery from the Lunar Reconnaissance Orbiter (LRO), Artemis I Orion, Artemis III lighting laboratories, Gateway NRHO, and VIPER mobility tests—and see how each photograph connects directly to LUNARIS’s physics engine.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/15 font-mono text-xs text-sky-300 shrink-0">
          <Camera className="w-3.5 h-3.5 text-[#E4002B]" />
          <span>8 OFFICIAL NASA ARCHIVAL PLATES · PUBLIC DOMAIN</span>
        </div>
      </div>

      {/* Featured Split-Screen NASA.gov "Image of the Mission" Spotlight */}
      <div className="rounded-3xl overflow-hidden border border-white/15 bg-[#050811] shadow-2xl grid grid-cols-1 lg:grid-cols-12">
        {/* Left 7 Cols: High-Impact Photograph */}
        <div
          className="lg:col-span-7 relative min-h-[320px] sm:min-h-[420px] group cursor-pointer"
          onClick={() => setLightboxEntry(featured)}
        >
          <NasaLunarImagePlate
            variant={featured.variant}
            className="w-full h-full min-h-[320px] sm:min-h-[420px]"
            overlayTag={featured.category}
            showCaption
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxEntry(featured);
            }}
            className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white border border-white/25 font-mono text-[11px] transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-300" />
            <span>Inspect Full Plate</span>
          </button>
        </div>

        {/* Right 5 Cols: NASA Editorial Story + Physics Connection */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-5 bg-gradient-to-br from-[#070B14] to-[#030509]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E4002B]/20 border border-[#E4002B]/50 font-mono text-[10px] font-bold uppercase tracking-widest text-rose-200">
                FEATURED NASA RECORD #{featuredIdx + 1} OF {GALLERY_ENTRIES.length}
              </span>
              <span className="font-mono text-[11px] text-sky-300">
                ARCHIVE ID: {featuredMeta.nasaId}
              </span>
            </div>

            <h4 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
              {featured.headline}
            </h4>

            <p className="text-xs sm:text-sm text-lunar-200 leading-relaxed">
              {featured.missionContext}
            </p>

            <div className="rounded-2xl bg-sky-500/10 border border-sky-400/30 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-sky-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                How This Connects to Your Landing Evaluation
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {featured.physicsConnection}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="text-[11px] font-mono text-lunar-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Credit: {featuredMeta.credit}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onJumpToSection(featured.targetSection)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>{featured.ctaLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxEntry(featured)}
                className="py-2.5 px-4 rounded-xl bg-white/[0.07] hover:bg-white/15 border border-white/15 text-white font-mono text-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Metadata</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 8-Card Interactive NASA Multimedia Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {GALLERY_ENTRIES.map((entry, idx) => {
          const isSelected = idx === featuredIdx;
          const meta = NASA_IMAGE_CONFIGS[entry.variant];
          return (
            <button
              key={entry.variant}
              type="button"
              onClick={() => setFeaturedIdx(idx)}
              className={`group text-left rounded-2xl overflow-hidden border transition-all flex flex-col ${
                isSelected
                  ? 'border-sky-400 ring-2 ring-sky-400/40 bg-[#0B1222] scale-[1.02]'
                  : 'border-white/10 bg-[#050811] hover:border-white/30 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="relative h-24 w-full overflow-hidden bg-black">
                <img
                  src={meta.src}
                  alt={entry.headline}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-amber-300 font-semibold">
                  0{idx + 1}
                </span>
              </div>
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-white line-clamp-2 leading-tight">
                  {entry.headline}
                </div>
                <div className="text-[9px] font-mono text-sky-300/90 mt-1.5 truncate">
                  {meta.nasaId}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Full-Screen NASA Archival Lightbox Modal */}
      {lightboxEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxEntry.headline}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setLightboxEntry(null)}
        >
          <div
            className="max-w-5xl w-full rounded-3xl overflow-hidden border border-white/20 bg-[#050811] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E4002B]" />
                <span className="font-mono text-xs uppercase tracking-widest text-white font-semibold">
                  NASA ARCHIVAL RECORD · {NASA_IMAGE_CONFIGS[lightboxEntry.variant].nasaId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxEntry(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close archival image modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 bg-black flex items-center justify-center max-h-[65vh] overflow-hidden">
                <img
                  src={NASA_IMAGE_CONFIGS[lightboxEntry.variant].src}
                  alt={lightboxEntry.headline}
                  className="w-full h-full object-contain max-h-[65vh]"
                />
              </div>
              <div className="lg:col-span-4 p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-sky-300">
                    {lightboxEntry.category}
                  </div>
                  <h4 className="font-display text-xl font-bold text-white">
                    {lightboxEntry.headline}
                  </h4>
                  <p className="text-xs text-lunar-200 leading-relaxed">
                    {lightboxEntry.missionContext}
                  </p>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-amber-300">
                      Physics Engine Integration
                    </div>
                    <p className="text-xs text-lunar-200 leading-relaxed">
                      {lightboxEntry.physicsConnection}
                    </p>
                  </div>
                  <div className="text-[11px] font-mono text-lunar-400 pt-1">
                    Credit: {NASA_IMAGE_CONFIGS[lightboxEntry.variant].credit}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const target = lightboxEntry.targetSection;
                    setLightboxEntry(null);
                    onJumpToSection(target);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Compass className="w-4 h-4" />
                  <span>{lightboxEntry.ctaLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
