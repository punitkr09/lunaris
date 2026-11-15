import {
  LandingSitePreset,
  LunarCoordinates,
  MissionScenarioData,
} from '../types/navigation';
import {
  computeAnalyticalSelenographicEphemeris,
  computeTopocentricHorizontal,
  computeSolarDiscVisibilityFraction,
  computeLunarSurfaceDistanceKm,
  utcMsToJulianDate,
} from './lunarMath';

export interface NearbyLandingRecommendation {
  id: string;
  code: string;
  label: string;
  kind: 'LOCAL_OPTIMIZED_POINT' | 'NEARBY_NASA_PRESET';
  coordinates: LunarCoordinates;
  distanceKm: number;
  bearingDeg: number;
  compassDirection: string;
  elevationMeters: number;
  meanSlopeDeg: number;
  estimatedSolarPct: number;
  estimatedDtePct: number;
  viabilityScore: number;
  scoreDeltaVsSelected: number;
  slopeDeltaVsSelected: number;
  solarDeltaVsSelected: number;
  elevationDeltaMeters: number;
  isBetterThanSelected: boolean;
  primaryAdvantageReason: string;
  matchedPreset?: LandingSitePreset;
}

const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

function bearingToCompass(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  const idx = Math.round(norm / 45) % 8;
  return COMPASS_DIRS[idx];
}

/**
 * Computes initial selenographic forward azimuth (0°=N, 90°=E, 180°=S, 270°=W)
 * from `from` to `to`.
 */
export function computeSelenographicBearingDeg(
  from: LunarCoordinates,
  to: LunarCoordinates
): number {
  const d2r = Math.PI / 180;
  const lat1 = from.latitudeDeg * d2r;
  const lat2 = to.latitudeDeg * d2r;
  const dLon = (to.longitudeDeg - from.longitudeDeg) * d2r;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Number((((brng % 360) + 360) % 360).toFixed(1));
}

function estimatePointElevationMeters(
  coords: LunarCoordinates,
  preset: LandingSitePreset | null
): number {
  if (preset) return preset.elevationMeters;
  const d2r = Math.PI / 180;
  const isFarSide = Math.abs(coords.longitudeDeg) > 110;
  if (isFarSide && coords.latitudeDeg < -15 && coords.latitudeDeg > -75) {
    return Math.round(-4200 + 1200 * Math.sin(coords.latitudeDeg * 0.1));
  }
  const latFactor = Math.cos((coords.latitudeDeg + 88) * 0.45);
  const lonFactor = Math.cos(coords.longitudeDeg * d2r * 2);
  const microRidge =
    480 * Math.sin(coords.latitudeDeg * 9.5 + coords.longitudeDeg * 1.8) +
    320 * Math.cos(coords.latitudeDeg * 14.2 - coords.longitudeDeg * 2.4);
  return Math.round(950 + 1600 * latFactor * lonFactor + microRidge);
}

function estimatePointSlopeDeg(
  coords: LunarCoordinates,
  preset: LandingSitePreset | null
): number {
  if (preset) return preset.meanSlopeDeg;
  const pseudo = Math.abs(
    Math.sin(coords.latitudeDeg * 12.3 + coords.longitudeDeg * 3.7)
  );
  return Number((3.2 + pseudo * 6.8).toFixed(1));
}

function sampleQuickHorizonObstruction(
  coords: LunarCoordinates,
  elevMeters: number,
  azimuthDeg: number
): number {
  const d2r = Math.PI / 180;
  const lat = coords.latitudeDeg;
  const lon = coords.longitudeDeg;
  const isMareOrEquatorial = Math.abs(lat) < 60 && elevMeters < 0;
  const baseObstruction = isMareOrEquatorial
    ? 0.55
    : Math.max(-1.6, 2.2 - (elevMeters / 2200) * 1.5);
  const seed1 = Math.abs(lat * 13.7 + lon * 0.71) % 6.28;
  const seed2 = Math.abs(lat * 5.3 - lon * 1.13) % 6.28;
  const ampScale = isMareOrEquatorial ? 0.35 : 1.0;
  const azRad = azimuthDeg * d2r;
  const ridge1 = 1.65 * ampScale * Math.sin(azRad * 2 + seed1);
  const ridge2 = 1.15 * ampScale * Math.cos(azRad * 3 - seed2);
  const peakSpike = 0.85 * ampScale * Math.sin(azRad * 5 + seed1 * 1.7);
  return Math.max(-2.0, Math.min(8.8, baseObstruction + ridge1 + ridge2 + peakSpike));
}

/**
 * Fast 14-sample orbital & topographic screening evaluation for a candidate coordinate
 * around the user's selected site.
 */
function evaluateCoordinateQuickMetrics(
  coords: LunarCoordinates,
  epochIsoUtc: string,
  durationDays: number,
  preset: LandingSitePreset | null
): {
  elevationMeters: number;
  meanSlopeDeg: number;
  estimatedSolarPct: number;
  estimatedDtePct: number;
  viabilityScore: number;
} {
  const elev = estimatePointElevationMeters(coords, preset);
  const slope = estimatePointSlopeDeg(coords, preset);

  const baseEpochMs = Date.parse(epochIsoUtc);
  const validEpochMs = Number.isNaN(baseEpochMs)
    ? Date.UTC(2026, 10, 15, 12, 0, 0)
    : baseEpochMs;

  const totalHours = Math.max(24, durationDays * 24);
  const sampleCount = 14;
  const stepHours = totalHours / sampleCount;

  let sunlitSamples = 0;
  let dteSamples = 0;
  let maxDarkRunSamples = 0;
  let curDarkRun = 0;

  for (let i = 0; i <= sampleCount; i++) {
    const tMs = validEpochMs + i * stepHours * 3600000;
    const jd = utcMsToJulianDate(tMs);
    const eph = computeAnalyticalSelenographicEphemeris(jd);

    const sunTopo = computeTopocentricHorizontal(
      coords,
      eph.subSolarLatitudeDeg,
      eph.subSolarLongitudeDeg
    );
    const sunMask = sampleQuickHorizonObstruction(coords, elev, sunTopo.azimuthDeg);
    const discFrac = computeSolarDiscVisibilityFraction(sunTopo.elevationDeg, sunMask);

    if (discFrac > 0.05) {
      sunlitSamples++;
      curDarkRun = 0;
    } else {
      curDarkRun++;
      if (curDarkRun > maxDarkRunSamples) maxDarkRunSamples = curDarkRun;
    }

    const earthTopo = computeTopocentricHorizontal(
      coords,
      eph.subEarthLatitudeDeg,
      eph.subEarthLongitudeDeg
    );
    const earthMask = sampleQuickHorizonObstruction(coords, elev, earthTopo.azimuthDeg);
    if (earthTopo.elevationDeg - earthMask >= 1.0) {
      dteSamples++;
    }
  }

  const totalSamples = sampleCount + 1;
  const solarPct = Number(((sunlitSamples / totalSamples) * 100).toFixed(1));
  const dtePct = Number(((dteSamples / totalSamples) * 100).toFixed(1));
  const maxDarkHours = maxDarkRunSamples * stepHours;

  const solarScore = Math.round(0.45 * solarPct);
  const commScore = Math.round(0.3 * dtePct);
  const slopeScore = Math.round(Math.max(0, 15 * (1 - slope / 16)));
  const darkScore = Math.round(
    Math.max(0, 10 * (1 - Math.min(1, maxDarkHours / 150)))
  );
  const viabilityScore = Math.min(100, solarScore + commScore + slopeScore + darkScore);

  return {
    elevationMeters: elev,
    meanSlopeDeg: slope,
    estimatedSolarPct: solarPct,
    estimatedDtePct: dtePct,
    viabilityScore,
  };
}

/**
 * Scans the surrounding lunar terrain (15 km – 110 km radius) and nearby published
 * NASA reference sites around `scenario.coordinates` to surface better or alternative
 * nearby landing zones.
 */
export function scanNearbyBetterLandingZones(
  scenario: MissionScenarioData,
  candidateSites: LandingSitePreset[]
): {
  selectedPointScore: number;
  localMicroSites: NearbyLandingRecommendation[];
  nearestNasaSites: NearbyLandingRecommendation[];
  bestOverallNearby: NearbyLandingRecommendation | null;
} {
  const center = scenario.coordinates;
  const epochIso = scenario.timeConfig.epochIsoUtc;
  const durationDays = scenario.timeConfig.missionDurationDays;

  const selectedScore = scenario.summary.overallViabilityScore;
  const selectedSlope = scenario.summary.localSlopeDeg;
  const selectedSolar = scenario.summary.solarAvailabilityPct;
  const selectedElev = scenario.summary.siteElevationMeters;

  // 1. Generate 16 regional micro-candidate points around the selected coordinate
  // Distances: ~22 km (0.72° lat), ~52 km (1.72° lat), ~90 km (2.95° lat)
  const ringLatSteps = [0.65, 1.45, 2.45];
  const azimuthAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const d2r = Math.PI / 180;

  const rawLocalCandidates: NearbyLandingRecommendation[] = [];
  let idxCounter = 1;

  for (const rDeg of ringLatSteps) {
    for (const az of azimuthAngles) {
      const azRad = az * d2r;
      const dLat = rDeg * Math.cos(azRad);
      const rawLat = center.latitudeDeg + dLat;
      const clampedLat = Math.max(-89.85, Math.min(89.85, rawLat));

      // Scale longitude step by cos(lat) so East-West distance matches North-South distance
      const cosLat = Math.max(0.08, Math.cos(clampedLat * d2r));
      const dLon = (rDeg * Math.sin(azRad)) / cosLat;
      let nextLon = center.longitudeDeg + dLon;
      if (nextLon > 180) nextLon -= 360;
      if (nextLon < -180) nextLon += 360;

      const ptCoords: LunarCoordinates = {
        latitudeDeg: Number(clampedLat.toFixed(3)),
        longitudeDeg: Number(nextLon.toFixed(3)),
      };

      const distKm = Number(
        computeLunarSurfaceDistanceKm(center, ptCoords).toFixed(1)
      );
      if (distKm < 8) continue;

      const brng = computeSelenographicBearingDeg(center, ptCoords);
      const compass = bearingToCompass(brng);

      const metrics = evaluateCoordinateQuickMetrics(
        ptCoords,
        epochIso,
        durationDays,
        null
      );

      const scoreDelta = metrics.viabilityScore - selectedScore;
      const slopeDelta = Number((metrics.meanSlopeDeg - selectedSlope).toFixed(1));
      const solarDelta = Number(
        (metrics.estimatedSolarPct - selectedSolar).toFixed(1)
      );
      const elevDelta = metrics.elevationMeters - selectedElev;

      const isBetter =
        scoreDelta > 0 ||
        (slopeDelta <= -1.0 && solarDelta >= -2.0) ||
        solarDelta >= 4.0;

      const reasons: string[] = [];
      if (solarDelta >= 2.0) {
        reasons.push(`+${solarDelta.toFixed(0)}% more sunlight`);
      }
      if (slopeDelta <= -0.6) {
        reasons.push(`${Math.abs(slopeDelta).toFixed(1)}° flatter slope`);
      }
      if (elevDelta >= 200) {
        reasons.push(`+${elevDelta}m higher ridge clearance`);
      }
      if (metrics.estimatedDtePct > scenario.summary.earthVisibilityPct + 2) {
        reasons.push(
          `+${(metrics.estimatedDtePct - scenario.summary.earthVisibilityPct).toFixed(0)}% DTE comm`
        );
      }
      if (reasons.length === 0) {
        reasons.push(
          `Safe alternate pad (${metrics.meanSlopeDeg}° slope, ${metrics.estimatedSolarPct}% sun)`
        );
      }

      const terrainFeatureName =
        metrics.elevationMeters > selectedElev + 250
          ? `Elevated Ridge (${compass} Sector)`
          : metrics.meanSlopeDeg < selectedSlope - 0.8
            ? `Low-Slope Terrace (${compass} Sector)`
            : `Adjacent Bench (${compass} Sector)`;

      rawLocalCandidates.push({
        id: `local-opt-${idxCounter}`,
        code: `REC-0${idxCounter}`,
        label: terrainFeatureName,
        kind: 'LOCAL_OPTIMIZED_POINT',
        coordinates: ptCoords,
        distanceKm: distKm,
        bearingDeg: brng,
        compassDirection: compass,
        elevationMeters: metrics.elevationMeters,
        meanSlopeDeg: metrics.meanSlopeDeg,
        estimatedSolarPct: metrics.estimatedSolarPct,
        estimatedDtePct: metrics.estimatedDtePct,
        viabilityScore: metrics.viabilityScore,
        scoreDeltaVsSelected: scoreDelta,
        slopeDeltaVsSelected: slopeDelta,
        solarDeltaVsSelected: solarDelta,
        elevationDeltaMeters: elevDelta,
        isBetterThanSelected: isBetter,
        primaryAdvantageReason: reasons.join(' · '),
      });
      idxCounter++;
    }
  }

  // Sort local candidates by highest viability score (and lowest slope as tiebreaker), pick distinct compass directions
  rawLocalCandidates.sort((a, b) => {
    if (b.viabilityScore !== a.viabilityScore) {
      return b.viabilityScore - a.viabilityScore;
    }
    return a.meanSlopeDeg - b.meanSlopeDeg;
  });

  const pickedLocal: NearbyLandingRecommendation[] = [];
  const usedDirections = new Set<string>();
  for (const cand of rawLocalCandidates) {
    if (usedDirections.has(cand.compassDirection) && pickedLocal.length < 3) {
      continue;
    }
    usedDirections.add(cand.compassDirection);
    pickedLocal.push({
      ...cand,
      code: `REC-0${pickedLocal.length + 1}`,
    });
    if (pickedLocal.length >= 3) break;
  }

  // 2. Evaluate nearest published NASA reference sites (excluding currently matched site)
  const nasaRecs: NearbyLandingRecommendation[] = candidateSites
    .filter(
      (s) =>
        s.id !== scenario.matchedPresetSite?.id &&
        s.locationAuthenticity === 'REAL_NASA_REFERENCE'
    )
    .map((site) => {
      const distKm = Number(
        computeLunarSurfaceDistanceKm(center, site.coordinates).toFixed(1)
      );
      const brng = computeSelenographicBearingDeg(center, site.coordinates);
      const compass = bearingToCompass(brng);
      const metrics = evaluateCoordinateQuickMetrics(
        site.coordinates,
        epochIso,
        durationDays,
        site
      );
      const scoreDelta = metrics.viabilityScore - selectedScore;
      const slopeDelta = Number((site.meanSlopeDeg - selectedSlope).toFixed(1));
      const solarDelta = Number(
        (metrics.estimatedSolarPct - selectedSolar).toFixed(1)
      );
      const elevDelta = site.elevationMeters - selectedElev;

      const reasons: string[] = [];
      if (scoreDelta > 0) reasons.push(`+${scoreDelta} viability pts`);
      if (solarDelta >= 2) reasons.push(`+${solarDelta.toFixed(0)}% sun`);
      if (slopeDelta <= -0.5)
        reasons.push(`${Math.abs(slopeDelta).toFixed(1)}° flatter`);
      if (reasons.length === 0) {
        reasons.push(site.tags.slice(0, 2).join(' · '));
      }

      return {
        id: `nasa-near-${site.id}`,
        code: site.code,
        label: site.name,
        kind: 'NEARBY_NASA_PRESET' as const,
        coordinates: site.coordinates,
        distanceKm: distKm,
        bearingDeg: brng,
        compassDirection: compass,
        elevationMeters: site.elevationMeters,
        meanSlopeDeg: site.meanSlopeDeg,
        estimatedSolarPct: metrics.estimatedSolarPct,
        estimatedDtePct: metrics.estimatedDtePct,
        viabilityScore: metrics.viabilityScore,
        scoreDeltaVsSelected: scoreDelta,
        slopeDeltaVsSelected: slopeDelta,
        solarDeltaVsSelected: solarDelta,
        elevationDeltaMeters: elevDelta,
        isBetterThanSelected: scoreDelta > 0 || slopeDelta < -1.0,
        primaryAdvantageReason: reasons.join(' · '),
        matchedPreset: site,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);

  const allCombined = [...pickedLocal, ...nasaRecs].sort(
    (a, b) => b.viabilityScore - a.viabilityScore
  );
  const bestOverallNearby = allCombined[0] ?? null;

  return {
    selectedPointScore: selectedScore,
    localMicroSites: pickedLocal,
    nearestNasaSites: nasaRecs,
    bestOverallNearby,
  };
}
