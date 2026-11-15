import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  ChevronDown,
  Compass,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MissionScenarioData } from '../types/navigation';
import { useSmoothScroll } from './SmoothScrollProvider';
import { NasaImageVariant, NasaLunarImagePlate } from '../components/NasaLunarImagePlate';

gsap.registerPlugin(ScrollTrigger);

interface HeroBigTextStageProps {
  scenario: MissionScenarioData;
  onJumpToSection: (selector: string) => void;
}

interface HeroCuriosityQuestion {
  id: string;
  tag: string;
  question: string;
  shortHook: string;
  imageVariant: NasaImageVariant;
  getAnswer: (s: MissionScenarioData) => {
    headline: string;
    explanation: string;
    liveDataLabel: string;
    liveDataValue: string;
    ctaLabel: string;
    targetSection: string;
  };
}

const HERO_CURIOSITY_QUESTIONS: HeroCuriosityQuestion[] = [
  {
    id: 'why-south-pole',
    tag: 'Solar Physics',
    question: 'Why are astronauts targeting the Lunar South Pole instead of the equator?',
    shortHook: 'Discover how a 1.54° axial tilt creates peaks of near-continuous sunlight.',
    imageVariant: 'SHACKLETON_RIDGE_SUNLIGHT',
    getAnswer: (s) => ({
      headline: 'Grazing Sunlight Powers Long Surface Stays',
      explanation:
        'At the lunar equator (where Apollo landed), 14 days of scorching sunlight are followed by 14 days of freezing darkness. Because the Moon is tilted by only 1.54°, the Sun skims horizontally around the South Pole—illuminating high mountain ridges for over 80% of the lunar year.',
      liveDataLabel: `Live Sunlight at ${s.matchedPresetSite?.name || 'Selected Site'}`,
      liveDataValue: `${s.summary.solarAvailabilityPct}% Illuminated (${s.summary.totalIlluminatedHours}h / ${s.timeConfig.missionDurationDays * 24}h window) · ${s.instantaneousSun.estimatedElectricalPowerWatts}W Now`,
      ctaLabel: 'Explore Sunlight on the 3D Moon',
      targetSection: '#stage-globe',
    }),
  },
  {
    id: 'ancient-water-ice',
    tag: 'Water & Ice',
    question: 'How can a crater floor be colder than Pluto just 2 km from a sunlit peak?',
    shortHook: 'Inside permanently shadowed craters untouched by sunlight for 2 billion years.',
    imageVariant: 'LOLA_LASER_ALTIMETRY',
    getAnswer: (s) => ({
      headline: 'Permanently Shadowed Cold Traps Preserve Ancient Water Ice',
      explanation:
        'Without an atmosphere to conduct heat, deep polar crater floors never see a single ray of direct sunlight. Temperatures plunge below 40 Kelvin (-233°C), trapping water ice delivered by comets over billions of years—essential for drinking water, oxygen, and rocket propellant.',
      liveDataLabel: `Elevation & Cold-Trap Proximity at ${s.matchedPresetSite?.code || 'Target'}`,
      liveDataValue: `Datum Elevation: ${s.summary.siteElevationMeters >= 0 ? '+' : ''}${s.summary.siteElevationMeters} m · Nearest PSR: ${s.matchedPresetSite?.psrDistanceKm != null ? `${s.matchedPresetSite.psrDistanceKm} km` : 'Equatorial / N/A'}`,
      ctaLabel: 'Tour the 4 Lunar Polar Regimes',
      targetSection: '#stage-expedition',
    }),
  },
  {
    id: 'earth-horizon-wobble',
    tag: 'Earth Contact',
    question: 'Can this site communicate directly with Earth—or do mountains block the signal?',
    shortHook: 'See how orbital libration makes Earth weave across the northern lunar horizon.',
    imageVariant: 'MALAPERT_EARTH_LINE_OF_SIGHT',
    getAnswer: (s) => ({
      headline: 'Earth Never Rises High at the South Pole',
      explanation:
        'From the Lunar South Pole, Earth stays near 0° elevation on the northern horizon, slowly weaving ±7° up and down over a month due to orbital libration. A single intervening mountain ridge can block Direct-to-Earth radio contact, requiring an orbiting relay satellite.',
      liveDataLabel: `Live Earth Radio Status at ${s.matchedPresetSite?.code || 'Target'}`,
      liveDataValue: `${s.instantaneousEarth.isDteOperational ? 'Direct-to-Earth Link Active' : 'Direct Link Blocked by Ridge'} · Earth Elev ${s.instantaneousEarth.elevationDeg.toFixed(1)}° · ${s.summary.earthVisibilityPct}% Window Availability`,
      ctaLabel: 'Inspect Local Sky Dome & Earth Link',
      targetSection: '#stage-sky',
    }),
  },
];

export const HeroBigTextStage: React.FC<HeroBigTextStageProps> = ({
  scenario,
  onJumpToSection,
}) => {
  const heroRef = useRef<HTMLElement | null>(null);
  const line1Ref = useRef<HTMLSpanElement | null>(null);
  const line2Ref = useRef<HTMLSpanElement | null>(null);
  const line3Ref = useRef<HTMLSpanElement | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const { prefersReducedMotion } = useSmoothScroll();

  useEffect(() => {
    const el = heroRef.current;
    if (!el || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        [line1Ref.current, line2Ref.current, line3Ref.current],
        { yPercent: 85, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.0,
          stagger: 0.1,
          ease: 'power4.out',
        }
      );

      gsap.to(line1Ref.current, {
        xPercent: -6,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.55,
        },
      });

      gsap.to(line2Ref.current, {
        xPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.55,
        },
      });
    }, el);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section
      ref={heroRef}
      id="stage-hero"
      aria-label="NASA Lunar South Pole Exploration Feature"
      className="relative pt-4 sm:pt-6 pb-12 sm:pb-16 space-y-8"
    >
      {/* Full-Bleed LUNARIS Featured Mission Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-[#04070E] shadow-[0_32px_90px_rgba(0,0,0,0.95)] min-h-[500px] sm:min-h-[580px] flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Authentic NASA LRO South Pole Mosaic Background */}
        <div className="absolute inset-0 z-0">
          <NasaLunarImagePlate
            variant="HERO_SOUTH_POLE_HORIZON"
            className="w-full h-full"
            overlayTag="NASA LRO / LOLA SOUTH POLE RECONNAISSANCE"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030509] via-[#04070E]/70 to-[#030509]/35" />
        </div>

        {/* Top Editorial Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-8 sm:pt-4">
          <div className="nasa-eyebrow">
            <span>2026 NASA SPACE APPS // THE NEXT LANDING STARTS WITH YOU</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#050811]/85 backdrop-blur-md border border-sky-400/30 font-mono text-xs text-lunar-200">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>
              ACTIVE SITE: <strong className="text-white">{scenario.matchedPresetSite?.name || 'Custom Target'}</strong> ·{' '}
              <span className="text-amber-300">{scenario.timeConfig.epochIsoUtc.slice(0, 10)}</span>
            </span>
          </div>
        </div>

        {/* Center Monumental Headline & Core Question */}
        <div className="relative z-10 my-auto py-8 max-w-5xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/40 font-mono text-xs font-semibold tracking-widest text-sky-200 uppercase">
            <span>CORE MISSION QUESTION: CAN WE LAND HERE?</span>
          </div>

          <h1 className="font-display font-bold uppercase tracking-tightest leading-[0.9] text-[clamp(2.5rem,7.8vw,7.4rem)] text-white select-none">
            <span className="block overflow-hidden">
              <span ref={line1Ref} className="block will-change-transform">
                WHERE THE SUN
              </span>
            </span>
            <span className="block overflow-hidden">
              <span
                ref={line2Ref}
                className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-200 to-amber-300 will-change-transform"
              >
                NEVER SETS—AND
              </span>
            </span>
            <span className="block overflow-hidden">
              <span ref={line3Ref} className="block text-lunar-200 will-change-transform">
                NEVER RISES.
              </span>
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-lunar-100/95 max-w-2xl leading-relaxed font-normal">
            If your landing location or date changes, how does your mission environment change?
            Evaluate solar illumination, local terrain horizon obstruction, and Direct-to-Earth
            radio windows across the Lunar South Pole.{' '}
            <strong className="text-white font-semibold">
              The Next Landing Starts With You.
            </strong>
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => onJumpToSection('#stage-globe')}
              className="group px-6 py-3.5 rounded-full bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold text-sm inline-flex items-center gap-3 transition-all shadow-[0_10px_30px_rgba(56,189,248,0.3)]"
            >
              <Compass className="w-4 h-4" />
              <span>Launch 3D Moon &amp; Sky Explorer</span>
              <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
            </button>

            <button
              type="button"
              onClick={() => onJumpToSection('#stage-sky')}
              className="px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/25 text-white font-medium text-sm inline-flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Inspect Local &amp; Temporal Sky View</span>
            </button>

            <button
              type="button"
              onClick={() => onJumpToSection('#stage-comparison')}
              className="px-5 py-3.5 rounded-full bg-white/[0.06] hover:bg-white/10 backdrop-blur-md border border-white/15 text-lunar-100 font-medium text-sm inline-flex items-center gap-2 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-sky-300" />
              <span>Compare Sites &amp; Dates</span>
            </button>
          </div>
        </div>

        {/* Bottom Image Credit Footer inside Hero */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-lunar-300">
          <span>
            IMAGE CREDIT: NASA / GSFC / ARIZONA STATE UNIVERSITY (LRO LROC + LOLA SVS #4720)
          </span>
          <span className="text-sky-300">
            SCROLL OR CLICK A QUESTION BELOW TO REVEAL LIVE TELEMETRY ↓
          </span>
        </div>
      </div>

      {/* Curiosity Hook Strip: Clean Question Cards */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="nasa-eyebrow">
            <span>Key Mission Questions</span>
          </div>
          <span className="text-xs text-lunar-400">
            Select any question to view the answer and live Moon telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {HERO_CURIOSITY_QUESTIONS.map((item) => {
            const isOpen = activeQuestionId === item.id;
            const resolved = item.getAnswer(scenario);

            return (
              <div
                key={item.id}
                className={`group nasa-card-interactive rounded-2xl overflow-hidden flex flex-col justify-between ${
                  isOpen ? 'ring-2 ring-sky-400/70 bg-[#0A101D]' : ''
                }`}
              >
                <div>
                  {/* NASA Lunar Image Header */}
                  <NasaLunarImagePlate
                    variant={item.imageVariant}
                    className="h-44 w-full"
                    overlayTag={item.tag}
                  />

                  {/* Clickable Question Trigger */}
                  <button
                    type="button"
                    onClick={() => setActiveQuestionId(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    className="w-full p-6 text-left flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base sm:text-lg font-semibold text-white leading-snug group-hover:text-sky-200 transition-colors">
                        {item.question}
                      </h2>
                      <span className="nasa-red-circle w-8 h-8 shrink-0 mt-0.5">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </div>
                    <p className="text-sm text-lunar-300 leading-relaxed">
                      {item.shortHook}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 pt-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {isOpen ? 'Hide answer' : 'Read answer & live data'}
                    </span>
                  </button>
                </div>

                {/* Revealed Answer + Live Computed Telemetry */}
                {isOpen && (
                  <div className="px-6 pb-6 pt-3 border-t border-white/10 bg-[#050811]/80 space-y-4 text-sm animate-fadeIn">
                    <div className="font-semibold text-amber-300">
                      {resolved.headline}
                    </div>
                    <p className="text-lunar-200 leading-relaxed">
                      {resolved.explanation}
                    </p>
                    <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                      <div className="text-xs text-lunar-400">
                        {resolved.liveDataLabel}
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {resolved.liveDataValue}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onJumpToSection(resolved.targetSection)}
                      className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>{resolved.ctaLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
