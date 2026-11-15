import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollContextValue {
  lenis: Lenis | null;
  prefersReducedMotion: boolean;
  scrollTo: (
    target: string | number | HTMLElement,
    options?: { offset?: number; duration?: number; immediate?: boolean }
  ) => void;
  refreshScrollTriggers: () => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  lenis: null,
  prefersReducedMotion: false,
  scrollTo: () => {},
  refreshScrollTriggers: () => {},
});

/** Height in px of the sticky top header, or a sensible default when not mounted. */
export function measureStickyHeaderHeight(): number {
  if (typeof document === 'undefined') return 64;
  const header = document.querySelector('header');
  const h = header?.getBoundingClientRect().height;
  return h && Number.isFinite(h) && h > 0 ? h : 64;
}

export const useSmoothScroll = () => useContext(SmoothScrollContext);

interface SmoothScrollProviderProps {
  children: React.ReactNode;
  activeRouteKey?: string;
}

/**
 * Global Lenis + GSAP ScrollTrigger Provider.
 * - Uses a single GSAP ticker loop driving Lenis RAF (no competing requestAnimationFrame loops).
 * - Updates a hardware-accelerated top scroll progress bar via DOM ref (zero React re-renders on scroll).
 * - Respects prefers-reduced-motion, keyboard navigation, and data-lenis-prevent containers.
 */
export const SmoothScrollProvider: React.FC<SmoothScrollProviderProps> = ({
  children,
  activeRouteKey,
}) => {
  const lenisRef = useRef<Lenis | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const updateNativeProgress = () => {
      if (!progressBarRef.current) return;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
      progressBarRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
    };

    if (prefersReducedMotion) {
      window.addEventListener('scroll', updateNativeProgress, { passive: true });
      updateNativeProgress();
      return () => {
        window.removeEventListener('scroll', updateNativeProgress);
      };
    }

    const lenis = new Lenis({
      lerp: 0.088,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
      syncTouch: false,
    });

    lenisRef.current = lenis;

    const onLenisScroll = (e: { progress: number }) => {
      ScrollTrigger.update();
      if (progressBarRef.current) {
        const p = Number.isFinite(e.progress) ? e.progress : 0;
        progressBarRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      }
    };

    lenis.on('scroll', onLenisScroll);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.off('scroll', onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [prefersReducedMotion]);

  // Reset scroll position and refresh ScrollTrigger when route changes
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    const timer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeRouteKey]);

  const scrollTo = useCallback(
    (
      target: string | number | HTMLElement,
      options?: { offset?: number; duration?: number; immediate?: boolean }
    ) => {
      // Default offset tracks the real sticky header height (64px on desktop, taller when
      // the tablet/mobile chapter strip is present) so anchors never land under the header.
      const offset = options?.offset ?? -(measureStickyHeaderHeight() + 12);
      if (lenisRef.current && !prefersReducedMotion) {
        lenisRef.current.scrollTo(target, {
          offset,
          duration: options?.duration ?? 1.15,
          immediate: options?.immediate ?? false,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
        return;
      }

      if (typeof target === 'number') {
        window.scrollTo({
          top: target,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      } else if (typeof target === 'string') {
        const el = document.querySelector(target);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY + offset;
          window.scrollTo({
            top,
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
          });
        }
      } else if (target instanceof HTMLElement) {
        const top = target.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    },
    [prefersReducedMotion]
  );

  const refreshScrollTriggers = useCallback(() => {
    ScrollTrigger.refresh();
  }, []);

  return (
    <SmoothScrollContext.Provider
      value={{
        lenis: lenisRef.current,
        prefersReducedMotion,
        scrollTo,
        refreshScrollTriggers,
      }}
    >
      {/* Top Global Scroll Progress Indicator */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none bg-white/[0.04]"
      >
        <div
          ref={progressBarRef}
          className="h-full w-full origin-left bg-gradient-to-r from-sky-500 via-sky-300 to-amber-300 transition-transform duration-75"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
      {children}
    </SmoothScrollContext.Provider>
  );
};

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
  id?: string;
}

/**
 * Scroll-triggered reveal wrapper powered by GSAP + ScrollTrigger.
 * Cleanly disposes of triggers and skips animation when prefers-reduced-motion is active.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 28,
  id,
}) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const { prefersReducedMotion } = useSmoothScroll();

  useEffect(() => {
    const el = elRef.current;
    if (!el || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          opacity: 0,
          y: yOffset,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 89%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [delay, yOffset, prefersReducedMotion]);

  return (
    <div ref={elRef} id={id} className={className}>
      {children}
    </div>
  );
};
