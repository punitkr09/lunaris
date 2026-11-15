/**
 * LUNARIS — Landing Window Scanner
 *
 * Answers "WHEN should we land here?" by sweeping candidate landing epochs across a
 * span of Earth days and evaluating each with the active `ILunarNavigationProvider`.
 * Every candidate is a full scenario computation (same engine, same synthetic horizon
 * caveats as the rest of the app), so the ranking is exactly consistent with what the
 * user sees when they apply an epoch.
 */

import {
  CommHardwareConfig,
  LandingWindowCandidate,
  LunarCoordinates,
  SolarHardwareConfig,
} from '../types/navigation';
import { ILunarNavigationProvider } from '../services/LunarDataProvider';

export interface LandingWindowScanParams {
  coordinates: LunarCoordinates;
  /** Scan origin (first candidate epoch), ISO-8601 UTC */
  originEpochIsoUtc: string;
  missionDurationDays: number;
  solarHardware?: SolarHardwareConfig;
  commHardware?: CommHardwareConfig;
  /** Total span of landing dates to sweep, in Earth days (default: one synodic month) */
  spanDays?: number;
  /** Step between candidate epochs, in Earth days */
  stepDays?: number;
}

export type LandingWindowRankingMetric =
  | 'NOMINAL_OPS_HOURS'
  | 'SOLAR_AVAILABILITY'
  | 'MIN_BLACKOUT'
  | 'VIABILITY_SCORE';

export function scanLandingWindows(
  provider: ILunarNavigationProvider,
  params: LandingWindowScanParams
): LandingWindowCandidate[] {
  const parsedOrigin = Date.parse(params.originEpochIsoUtc);
  if (Number.isNaN(parsedOrigin)) return [];

  const spanDays = Math.max(1, params.spanDays ?? 30);
  const stepDays = Math.max(0.25, params.stepDays ?? 1);
  const candidates: LandingWindowCandidate[] = [];

  for (let offset = 0; offset <= spanDays + 1e-9; offset += stepDays) {
    const epochMs = parsedOrigin + offset * 86400000;
    const epochIsoUtc = new Date(epochMs).toISOString().slice(0, 19) + 'Z';
    const scenario = provider.computeScenario({
      scenarioId: `SCAN-${offset.toFixed(2)}`,
      scenarioLabel: `Landing window scan +${offset.toFixed(1)}d`,
      coordinates: params.coordinates,
      epochIsoUtc,
      elapsedHours: 0,
      missionDurationDays: params.missionDurationDays,
      solarHardware: params.solarHardware,
      commHardware: params.commHardware,
    });
    const s = scenario.summary;
    candidates.push({
      epochIsoUtc,
      offsetDays: Number(offset.toFixed(2)),
      solarAvailabilityPct: s.solarAvailabilityPct,
      earthVisibilityPct: s.earthVisibilityPct,
      nominalOpsHours: s.nominalOpsHours,
      criticalBlackoutHours: s.criticalBlackoutHours,
      maxContinuousDarknessHours: s.maxContinuousDarknessHours,
      cumulativeEnergyKwh: s.cumulativeEnergyKwh,
      overallViabilityScore: s.overallViabilityScore,
    });
  }

  return candidates;
}

/**
 * Picks the best candidate for a given ranking metric. Ties are broken by the composite
 * screening score and then by the earliest date (schedule risk favours landing sooner).
 */
export function pickBestLandingWindow(
  candidates: LandingWindowCandidate[],
  metric: LandingWindowRankingMetric
): LandingWindowCandidate | null {
  if (candidates.length === 0) return null;
  const keyOf = (c: LandingWindowCandidate): number => {
    switch (metric) {
      case 'NOMINAL_OPS_HOURS':
        return c.nominalOpsHours;
      case 'SOLAR_AVAILABILITY':
        return c.solarAvailabilityPct;
      case 'MIN_BLACKOUT':
        return -c.criticalBlackoutHours;
      case 'VIABILITY_SCORE':
      default:
        return c.overallViabilityScore;
    }
  };
  return candidates.reduce((best, c) => {
    const kc = keyOf(c);
    const kb = keyOf(best);
    if (kc > kb) return c;
    if (kc < kb) return best;
    if (c.overallViabilityScore !== best.overallViabilityScore) {
      return c.overallViabilityScore > best.overallViabilityScore ? c : best;
    }
    return c.offsetDays < best.offsetDays ? c : best;
  });
}
