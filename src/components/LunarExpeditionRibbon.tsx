import React, { useState } from 'react';
import { ArrowUpRight, ChevronDown, Compass, Mountain } from 'lucide-react';
import {
  LandingSitePreset,
  LunarCoordinates,
  MissionScenarioData,
} from '../types/navigation';
import { CameraPreset, MoonViewMode } from './scene/types';
import { useSmoothScroll } from '../motion/SmoothScrollProvider';
import { NasaImageVariant, NasaLunarImagePlate } from './NasaLunarImagePlate';

interface LunarExpeditionRibbonProps {
  candidateSites: LandingSitePreset[];
  activeScenario: MissionScenarioData;
  onSelectSiteWithCamera: (
    coords: LunarCoordinates,
    preset: CameraPreset,
    viewMode?: MoonViewMode
  ) => void;
}

const EXPEDITION_STOPS: {
  siteId: string;
  chapter: string;
  curiosityQuestion: string;
  curiosityAnswer: string;
  imageVariant: NasaImageVariant;
  cameraPreset: CameraPreset;
}[] = [
  {
    siteId: 'shackleton-ridge',
    chapter: 'South Pole Ridge',
    curiosityQuestion: 'Why does sunlight linger here while Shackleton Crater below stays pitch black?',
    curiosityAnswer:
      'Standing +2,140 m above mean lunar radius right at 89.46°S, this narrow ridge catches grazing rays as the Sun circles the horizon—while the 4.2 km-deep Shackleton Crater floor right next to it never sees the Sun.',
    imageVariant: 'SHACKLETON_RIDGE_SUNLIGHT',
    cameraPreset: 'SOUTH_POLE',
  },
  {
    siteId: 'malapert-massif',
    chapter: 'Earth-Facing Peak',
    curiosityQuestion: 'How does this mountain maintain an unbroken radio link to Earth?',
    curiosityAnswer:
      'Aligned along the 0° Earth-facing prime meridian and rising +4,680 m above the mean sphere, Malapert Summit towers above foreground crater rims so Earth remains continuously in view.',
    imageVariant: 'MALAPERT_EARTH_LINE_OF_SIGHT',
    cameraPreset: 'TARGET_FOCUS',
  },
  {
    siteId: 'leibnitz-beta',
    chapter: 'High Summit Mesa',
    curiosityQuestion: 'Why is a flat-topped mountain 5 km high ideal for lunar landers and rovers?',
    curiosityAnswer:
      'Mons Mouton combines commanding altitude (+5,210 m) for solar & Earth visibility with a remarkably gentle 3.8° summit plateau slope—making touchdown far safer than steep crater rims.',
    imageVariant: 'MONS_MOUTON_PLATEAU',
    cameraPreset: 'TARGET_FOCUS',
  },
  {
    siteId: 'change-4-von-karman',
    chapter: 'Lunar Far Side',
    curiosityQuestion: 'How can a lander operate here when the entire Moon blocks Earth?',
    curiosityAnswer:
      'Located at 177.6°E on the Lunar Far Side inside the 2,500 km South Pole–Aitken Basin, Earth stays permanently -46° below the ground. Every command and image must bounce through a halo-orbit relay satellite.',
    imageVariant: 'VON_KARMAN_FARSIDE',
    cameraPreset: 'FARSIDE_180',
  },
];

export const LunarExpeditionRibbon: React.FC<LunarExpeditionRibbonProps> = ({
  candidateSites,
  activeScenario,
  onSelectSiteWithCamera,
}) => {
  const { scrollTo } = useSmoothScroll();
  const [openSiteId, setOpenSiteId] = useState<string | null>(null);

  return (
    <section
      id="stage-expedition"
      aria-label="Guided Selenographic Expedition Regions"
      className="space-y-6 pt-2"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div className="space-y-2">
          <div className="nasa-eyebrow">
            <span>NASA LRO REGIONAL SPOTLIGHT // FOUR EXTREME LUNAR ENVIRONMENTS</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Explore the Moon&apos;s Most Dramatic Landing Zones
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-lunar-300 max-w-md">
          Click a question on any card to uncover why scientists study that region, or fly the 3D
          camera directly to its coordinates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {EXPEDITION_STOPS.map((stop) => {
          const site = candidateSites.find((s) => s.id === stop.siteId);
          if (!site) return null;
          const isSelected = activeScenario.matchedPresetSite?.id === site.id;
          const isFactOpen = openSiteId === site.id;

          return (
            <div
              key={stop.siteId}
              className={`group nasa-card-interactive rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                isSelected ? 'ring-2 ring-sky-400' : ''
              }`}
            >
              <div>
                {/* Authentic NASA LRO/LOLA Photographic Plate */}
                <NasaLunarImagePlate
                  variant={stop.imageVariant}
                  className="h-44 w-full"
                  overlayTag={stop.chapter}
                />

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.06] border border-white/15 text-lunar-200">
                      {site.code}
                    </span>
                    {isSelected && (
                      <span className="font-mono text-[10px] text-sky-300 font-bold uppercase">
                        ● Active on 3D Moon
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-lg font-bold text-white leading-snug">
                    {site.name}
                  </h3>

                  {/* Interactive Question Button */}
                  <button
                    type="button"
                    onClick={() => setOpenSiteId(isFactOpen ? null : site.id)}
                    aria-expanded={isFactOpen}
                    className="w-full p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <span className="text-xs sm:text-sm font-medium text-lunar-100 leading-snug">
                        {stop.curiosityQuestion}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-sky-400 shrink-0 mt-0.5 transition-transform ${
                          isFactOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    <span className="block text-xs font-medium text-sky-300">
                      {isFactOpen ? 'Hide answer' : 'Read answer'}
                    </span>
                  </button>

                  {/* Revealed Answer + Site Data */}
                  {isFactOpen && (
                    <div className="p-3.5 rounded-xl bg-[#04070D]/90 border border-white/15 space-y-3 text-xs">
                      <p className="text-lunar-200 leading-relaxed">{stop.curiosityAnswer}</p>
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 font-mono text-[11px]">
                        <div>
                          <span className="text-[9px] text-lunar-400 uppercase block">Lat/Lon</span>
                          <span className="text-white">
                            {site.coordinates.latitudeDeg.toFixed(1)}°
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-lunar-400 uppercase block">Datum</span>
                          <span className="text-amber-300">
                            {site.elevationMeters >= 0 ? '+' : ''}
                            {site.elevationMeters}m
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-lunar-400 uppercase block">Slope</span>
                          <span className="text-white">{site.meanSlopeDeg}°</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-5 pb-5 pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectSiteWithCamera(
                      site.coordinates,
                      stop.cameraPreset,
                      'GLOBAL_SPHERE'
                    );
                    scrollTo('#stage-globe');
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-sky-500 text-space-950'
                      : 'bg-white/10 hover:bg-sky-500 hover:text-space-950 text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{isSelected ? 'Focused on 3D Moon' : 'Fly to Site on 3D Moon'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectSiteWithCamera(
                      site.coordinates,
                      'TARGET_FOCUS',
                      'LOCAL_TERRAIN'
                    );
                    scrollTo('#stage-globe');
                  }}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-lunar-200 hover:text-white transition-colors"
                  title="Inspect 3D Local Terrain Relief"
                  aria-label={`Inspect ${site.name} local terrain relief`}
                >
                  <Mountain className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
