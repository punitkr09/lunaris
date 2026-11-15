import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSmoothScroll } from './SmoothScrollProvider';
import {
  NASA_IMAGE_CONFIGS,
  NasaImageVariant,
} from '../components/NasaLunarImagePlate';

gsap.registerPlugin(ScrollTrigger);

export interface BigTextChapterTransitionProps {
  id: string;
  chapterNumber: string;
  eyebrow: string;
  primaryTitle: string;
  accentTitle: string;
  kineticBackdropText: string;
  subtitle: string;
  telemetryTag?: string;
  backgroundVariant?: NasaImageVariant;
}

/**
 * NASA.gov + Lenis.dev-inspired Monumental Big-Text Section Transition.
 * Uses GSAP ScrollTrigger scrub animations for:
 * - Opposing horizontal kinetic typography rails
 * - Clip/translateY reveal on oversized viewport-spanning headlines
 * - NASA crimson & lunar white editorial contrast
 */
export const BigTextChapterTransition: React.FC<BigTextChapterTransitionProps> = ({
  id,
  chapterNumber,
  eyebrow,
  primaryTitle,
  accentTitle,
  kineticBackdropText,
  subtitle,
  telemetryTag,
  backgroundVariant,
}) => {
  const bgMeta = backgroundVariant ? NASA_IMAGE_CONFIGS[backgroundVariant] : null;
  const sectionRef = useRef<HTMLElement | null>(null);
  const backdropRailTopRef = useRef<HTMLDivElement | null>(null);
  const backdropRailBottomRef = useRef<HTMLDivElement | null>(null);
  const primaryLineRef = useRef<HTMLSpanElement | null>(null);
  const accentLineRef = useRef<HTMLSpanElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const ruleRef = useRef<HTMLDivElement | null>(null);
  const { prefersReducedMotion } = useSmoothScroll();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      if (backdropRailTopRef.current) {
        gsap.fromTo(
          backdropRailTopRef.current,
          { xPercent: -12 },
          {
            xPercent: 8,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.65,
            },
          }
        );
      }

      if (backdropRailBottomRef.current) {
        gsap.fromTo(
          backdropRailBottomRef.current,
          { xPercent: 10 },
          {
            xPercent: -12,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.65,
            },
          }
        );
      }

      if (ruleRef.current) {
        gsap.fromTo(
          ruleRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            ease: 'power3.inOut',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              end: 'top 35%',
              scrub: 0.4,
            },
          }
        );
      }

      if (primaryLineRef.current && accentLineRef.current) {
        gsap.fromTo(
          [primaryLineRef.current, accentLineRef.current],
          {
            yPercent: 75,
            opacity: 0,
            rotateX: -18,
          },
          {
            yPercent: 0,
            opacity: 1,
            rotateX: 0,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              end: 'top 42%',
              scrub: 0.5,
            },
          }
        );
      }

      if (subtitleRef.current) {
        gsap.fromTo(
          subtitleRef.current,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 78%',
              end: 'top 45%',
              scrub: 0.4,
            },
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={`${chapterNumber} ${primaryTitle} ${accentTitle}`}
      className="relative py-16 sm:py-24 lg:py-28 overflow-hidden select-none border-t border-white/[0.12]"
    >
      {/* Authentic NASA Archival Photograph Backdrop */}
      {bgMeta && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <img
            src={bgMeta.src}
            alt=""
            loading="lazy"
            style={{
              objectPosition: bgMeta.objectPosition,
              filter: 'contrast(1.22) brightness(0.42)',
            }}
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030509] via-[#030509]/80 to-[#030509]/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030509] via-transparent to-[#030509]/90" />
        </div>
      )}

      {/* Background Scrubbed Kinetic Typography Rails */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col justify-between py-6 opacity-[0.045] overflow-hidden"
      >
        <div
          ref={backdropRailTopRef}
          className="whitespace-nowrap font-display font-bold uppercase tracking-tightest text-[13vw] leading-none text-white"
        >
          {kineticBackdropText} — {kineticBackdropText} — {kineticBackdropText}
        </div>
        <div
          ref={backdropRailBottomRef}
          className="whitespace-nowrap font-display font-bold uppercase tracking-tightest text-[13vw] leading-none text-sky-400"
        >
          {chapterNumber} // {eyebrow} — {chapterNumber} // {eyebrow}
        </div>
      </div>

      {/* Foreground Big-Text Editorial Stage */}
      <div className="relative z-10 max-w-[1680px] mx-auto px-4 sm:px-6">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 sm:mb-7">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/45 text-sky-200 tracking-widest">
              CHAPTER {chapterNumber}
            </span>
            <span className="nasa-eyebrow">
              <span>{eyebrow}</span>
            </span>
          </div>

          {telemetryTag && (
            <span className="font-mono text-[11px] uppercase tracking-widest text-lunar-300 px-3 py-1 rounded-full border border-white/15 bg-[#050811]/90">
              {telemetryTag}
            </span>
          )}
        </div>

        {/* Animated Hairline Rule */}
        <div
          ref={ruleRef}
          className="h-[1px] w-full origin-left bg-gradient-to-r from-sky-400 via-white/30 to-transparent mb-7 sm:mb-10"
        />

        {/* Monumental Display Headline */}
        <h2 className="font-display font-bold uppercase tracking-tightest leading-[0.9] text-[clamp(2.4rem,7.2vw,6.8rem)]">
          <span className="block overflow-hidden pb-1">
            <span ref={primaryLineRef} className="block text-white will-change-transform">
              {primaryTitle}
            </span>
          </span>
          <span className="block overflow-hidden pt-1">
            <span
              ref={accentLineRef}
              className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-lunar-100 to-amber-300 will-change-transform"
            >
              {accentTitle}
            </span>
          </span>
        </h2>

        {/* Editorial Subtitle */}
        <p
          ref={subtitleRef}
          className="mt-5 sm:mt-6 max-w-2xl text-sm sm:text-base lg:text-lg text-lunar-300 font-normal leading-relaxed select-text"
        >
          {subtitle}
        </p>
      </div>
    </section>
  );
};
