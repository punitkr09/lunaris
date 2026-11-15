/**
 * LUNARIS — Pure Scientific & Engineering Calculation Core (`lunarMath.ts`)
 *
 * Implements analytical selenographic coordinate transformations, Julian Date &
 * Lunar Local True Solar Time (LTST) timekeeping, topocentric Sun/Earth horizontal
 * coordinates, finite solar disc horizon occultation, photovoltaic plane-of-array
 * incidence/power equations, and RF Free-Space Path Loss (FSPL) link budget math.
 */

import {
  CommHardwareConfig,
  LunarCoordinates,
  SolarHardwareConfig,
} from '../types/navigation';

export const MEAN_LUNAR_RADIUS_KM = 1737.4;
export const SOLAR_CONSTANT_1AU_WM2 = 1361.0;
export const SOLAR_ANGULAR_RADIUS_DEG = 0.266; // ~0.532° solar disc diameter at 1 AU
export const SYNODIC_MONTH_DAYS = 29.530588853;
export const SYNODIC_MONTH_HOURS = SYNODIC_MONTH_DAYS * 24.0;
export const LUNAR_OBLIQUITY_ECLIPTIC_DEG = 1.5424;
export const SPEED_OF_LIGHT_KMS = 299792.458;

/**
 * Stated 1-sigma-ish uncertainty of the synthetic parametric horizon mask relative to a
 * full-resolution LOLA DEM ray-trace. Used consistently for the UI uncertainty band and
 * for the photovoltaic power uncertainty propagation.
 */
export const HORIZON_MASK_UNCERTAINTY_DEG = 1.5;

/** One kilometre of lunar surface expressed in degrees of arc on the mean sphere. */
export const DEG_PER_KM_LUNAR_SURFACE = 180 / (Math.PI * MEAN_LUNAR_RADIUS_KM);

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export const DEFAULT_SOLAR_HARDWARE: SolarHardwareConfig = {
  trackingMode: 'VERTICAL_1AXIS_AZIMUTH',
  panelTiltDeg: 85, // Near-vertical mast optimized for low polar sun angles
  panelAzimuthDeg: 0,
  arrayAreaM2: 12.0,
  cellEfficiencyPct: 30.0,
  systemDeratingFactor: 0.86,
};

export const DEFAULT_COMM_HARDWARE: CommHardwareConfig = {
  frequencyBand: 'KA_BAND_32GHZ',
  minElevationConstraintDeg: 3.0,
  minRidgeClearanceDeg: 0.5,
  transmitPowerWatts: 25.0,
  antennaDiameterMeters: 0.85,
  relaySatelliteEnabled: false,
};

/**
 * Normalizes any angle in degrees to [-180, +180].
 */
export function normalizeLongitudeDeg(lonDeg: number): number {
  const wrapped = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && lonDeg > 0 ? 180 : wrapped;
}

/**
 * Normalizes any angle in degrees to [0, 360).
 */
export function normalizeAzimuthDeg(azDeg: number): number {
  return ((azDeg % 360) + 360) % 360;
}

/**
 * Clamps latitude to [-90, +90].
 */
export function clampLatitudeDeg(latDeg: number): number {
  return Math.max(-90, Math.min(90, latDeg));
}

/**
 * Converts selenographic (latitudeDeg, longitudeDeg, radius) in the Mean Earth (MOON_ME)
 * frame to 3D scene Cartesian coordinates:
 * - +Y is North Pole (+90°N), -Y is South Pole (-90°S)
 * - +Z is 0° Lat, 0° Lon (Sub-Earth Prime Meridian center of Near Side)
 * - +X is 0° Lat, +90°E (Eastern Nearside Limb)
 * - -X is 0° Lat, -90°W (Western Nearside Limb)
 * - -Z is 0° Lat, ±180° (Center of Far Side)
 */
export function lunarLatLonToCartesian3D(
  latitudeDeg: number,
  longitudeDeg: number,
  radius: number = 1.0
): [number, number, number] {
  const latRad = clampLatitudeDeg(latitudeDeg) * DEG_TO_RAD;
  const lonRad = normalizeLongitudeDeg(longitudeDeg) * DEG_TO_RAD;
  const cosLat = Math.cos(latRad);

  const x = radius * cosLat * Math.sin(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * cosLat * Math.cos(lonRad);
  return [x, y, z];
}

/**
 * Inverse transformation from 3D scene Cartesian coordinates (x, y, z)
 * back to selenographic (latitudeDeg, longitudeDeg) in the MOON_ME frame.
 */
export function cartesian3DToLunarLatLon(
  x: number,
  y: number,
  z: number
): LunarCoordinates {
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r < 1e-12) {
    return { latitudeDeg: 0, longitudeDeg: 0 };
  }
  const latDeg = Math.asin(Math.max(-1, Math.min(1, y / r))) * RAD_TO_DEG;
  const lonDeg = Math.atan2(x, z) * RAD_TO_DEG;
  return {
    latitudeDeg: Number(latDeg.toFixed(4)),
    longitudeDeg: Number(normalizeLongitudeDeg(lonDeg).toFixed(4)),
  };
}

/**
 * Computes great-circle selenodesic surface distance (km) between two lunar coordinates
 * on a sphere of radius 1737.4 km.
 */
export function computeLunarSurfaceDistanceKm(
  a: LunarCoordinates,
  b: LunarCoordinates
): number {
  const lat1 = a.latitudeDeg * DEG_TO_RAD;
  const lat2 = b.latitudeDeg * DEG_TO_RAD;
  const dLat = (b.latitudeDeg - a.latitudeDeg) * DEG_TO_RAD;
  const dLon = normalizeLongitudeDeg(b.longitudeDeg - a.longitudeDeg) * DEG_TO_RAD;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  return Number((MEAN_LUNAR_RADIUS_KM * c).toFixed(3));
}

/**
 * True when two selenographic coordinates lie within `toleranceKm` of each other on the
 * mean sphere. Unlike a lat/lon bounding box this behaves correctly at the poles (where
 * longitude degenerates) and across the ±180° anti-meridian.
 */
export function areLunarCoordinatesEquivalent(
  a: LunarCoordinates,
  b: LunarCoordinates,
  toleranceKm: number = 1.0
): boolean {
  return computeLunarSurfaceDistanceKm(a, b) <= toleranceKm;
}

/**
 * Formats a Lunar Local True Solar Time value (decimal lunar hours) as `HH:MM LTST`,
 * carrying minutes that round to 60 into the hour field (11.999 h -> "12:00 LTST").
 */
export function formatLunarLocalSolarTime(lunarHours: number): string {
  const totalMinutes = Math.round((((lunarHours % 24) + 24) % 24) * 60) % (24 * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} LTST`;
}

/**
 * Converts Unix Epoch milliseconds (UTC) to Astronomical Julian Date (JD).
 * Reference: Unix epoch 1970-01-01T00:00:00Z = JD 2440587.5
 */
export function utcMsToJulianDate(utcMs: number): number {
  return 2440587.5 + utcMs / 86400000.0;
}

/**
 * Converts Julian Date (JD) to Julian Centuries since J2000.0 (2000-01-01T12:00:00 TT/UTC approx).
 */
export function julianDateToJ2000Centuries(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Computes Lunar Local True Solar Time (LTST) in hours [0, 24)
 * from site longitude and sub-solar longitude.
 * At siteLon == subSolarLon, LTST = 12.00 (Local Solar Noon).
 * At |siteLon - subSolarLon| == 180°, LTST = 0.00 (Local Solar Midnight).
 */
export function computeLunarLocalSolarHour(
  siteLongitudeDeg: number,
  subSolarLongitudeDeg: number
): number {
  const deltaLon = normalizeLongitudeDeg(siteLongitudeDeg - subSolarLongitudeDeg);
  const rawHour = 12.0 + deltaLon / 15.0;
  return Number((((rawHour % 24) + 24) % 24).toFixed(3));
}

/**
 * Fundamental Delaunay arguments of lunar theory (degrees, normalized to [0, 360)):
 * - D: Mean elongation of the Moon from the Sun
 * - M: Sun's mean anomaly
 * - Mprime: Moon's mean anomaly (0° = mean perigee)
 * - F: Moon's mean argument of latitude (mean distance from ascending node)
 * Polynomials per Meeus, "Astronomical Algorithms", Ch. 47.
 */
export function computeDelaunayArguments(jd: number): {
  D: number;
  M: number;
  Mprime: number;
  F: number;
} {
  const T = julianDateToJ2000Centuries(jd);
  return {
    D: normalizeAzimuthDeg(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T),
    M: normalizeAzimuthDeg(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T),
    Mprime: normalizeAzimuthDeg(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T),
    F: normalizeAzimuthDeg(93.272095 + 483202.0175233 * T - 0.0036539 * T * T),
  };
}

/**
 * Computes analytical sub-solar and sub-Earth selenographic coordinates
 * (latitude, longitude, range) for a given Julian Date.
 *
 * Uses fundamental astronomical arguments (Meeus / IAU analytical lunar orientation terms):
 * - D: Mean elongation of the Moon from the Sun
 * - M: Sun's mean anomaly
 * - M': Moon's mean anomaly
 * - F: Moon's argument of latitude (mean distance from ascending node)
 */
export function computeAnalyticalSelenographicEphemeris(jd: number): {
  subSolarLatitudeDeg: number;
  subSolarLongitudeDeg: number;
  subEarthLatitudeDeg: number;
  subEarthLongitudeDeg: number;
  earthMoonDistanceKm: number;
} {
  const { D, M, Mprime, F } = computeDelaunayArguments(jd);

  const Drad = D * DEG_TO_RAD;
  const Mrad = M * DEG_TO_RAD;
  const Mprad = Mprime * DEG_TO_RAD;
  const Frad = F * DEG_TO_RAD;

  // Optical libration in longitude (sub-Earth selenographic longitude, ±7.9°).
  // Because the Moon rotates uniformly while moving non-uniformly along its orbit, the
  // sub-Earth longitude l' ≈ λ_true − L' = the Moon's equation of center (Meeus Table 47.A
  // leading terms, all taken with their native signs). Positive = Earth displaced toward
  // the eastern (Mare Crisium) limb, which occurs after perigee when the Moon runs ahead
  // of its mean position.
  const subEarthLongitudeDeg = Number(
    (
      6.289 * Math.sin(Mprad) +
      1.274 * Math.sin(2 * Drad - Mprad) +
      0.658 * Math.sin(2 * Drad) +
      0.214 * Math.sin(2 * Mprad) -
      0.186 * Math.sin(Mrad)
    ).toFixed(3)
  );

  // Optical libration in latitude (sub-Earth selenographic latitude, ±6.7°):
  // b' ≈ −β_moon − I·sin(F), where β_moon is the Moon's ecliptic latitude series
  // (Meeus Table 47.B leading terms) and I = 1.5424° is the equator/ecliptic inclination.
  const subEarthLatitudeDeg = Number(
    (
      -5.128 * Math.sin(Frad) -
      0.28 * Math.sin(Mprad + Frad) -
      0.277 * Math.sin(Mprad - Frad) -
      0.173 * Math.sin(2 * Drad - Frad) -
      LUNAR_OBLIQUITY_ECLIPTIC_DEG * Math.sin(Frad)
    ).toFixed(3)
  );

  // Earth-Moon center-to-center distance (km)
  const earthMoonDistanceKm = Math.round(
    385000.56 -
      20905.355 * Math.cos(Mprad) -
      3699.111 * Math.cos(2 * Drad - Mprad) -
      2955.968 * Math.cos(2 * Drad) -
      569.925 * Math.cos(2 * Mprad)
  );

  // Sub-solar selenographic longitude:
  // When D = 0° (New Moon), Sun is over far side (180°); when D = 180° (Full Moon), Sun is over 0° nearside.
  const subSolarLongitudeDeg = Number(
    normalizeLongitudeDeg(180.0 - D + 0.18 * Math.sin(Mrad)).toFixed(3)
  );

  // Sub-solar selenographic latitude varies by ±1.5424° with the draconic/seasonal argument (F - D)
  const subSolarLatitudeDeg = Number(
    (-LUNAR_OBLIQUITY_ECLIPTIC_DEG * Math.sin((F - D) * DEG_TO_RAD)).toFixed(3)
  );

  return {
    subSolarLatitudeDeg,
    subSolarLongitudeDeg,
    subEarthLatitudeDeg,
    subEarthLongitudeDeg,
    earthMoonDistanceKm,
  };
}

/**
 * Computes topocentric horizontal coordinates (elevationDeg, azimuthDeg, unitVectorENU)
 * of a celestial body given the observer's (latitudeDeg, longitudeDeg) and the body's
 * sub-selenographic point (subLatDeg, subLonDeg).
 *
 * Azimuth convention: 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function computeTopocentricHorizontal(
  observer: LunarCoordinates,
  subBodyLatDeg: number,
  subBodyLonDeg: number
): {
  elevationDeg: number;
  azimuthDeg: number;
  directionVectorENU: [number, number, number];
} {
  const latRad = observer.latitudeDeg * DEG_TO_RAD;
  const subLatRad = subBodyLatDeg * DEG_TO_RAD;
  const deltaLonRad =
    normalizeLongitudeDeg(subBodyLonDeg - observer.longitudeDeg) * DEG_TO_RAD;

  const sinEl =
    Math.sin(latRad) * Math.sin(subLatRad) +
    Math.cos(latRad) * Math.cos(subLatRad) * Math.cos(deltaLonRad);
  const elRad = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const elevationDeg = Number((elRad * RAD_TO_DEG).toFixed(3));

  const east = Math.sin(deltaLonRad) * Math.cos(subLatRad);
  const north =
    Math.cos(latRad) * Math.sin(subLatRad) -
    Math.sin(latRad) * Math.cos(subLatRad) * Math.cos(deltaLonRad);

  const azimuthDeg = Number(
    normalizeAzimuthDeg(Math.atan2(east, north) * RAD_TO_DEG).toFixed(2)
  );

  const azRad = azimuthDeg * DEG_TO_RAD;
  const cosEl = Math.cos(elRad);
  const directionVectorENU: [number, number, number] = [
    Number((cosEl * Math.sin(azRad)).toFixed(4)), // East
    Number(Math.sin(elRad).toFixed(4)),            // Up
    Number((cosEl * Math.cos(azRad)).toFixed(4)), // North
  ];

  return {
    elevationDeg,
    azimuthDeg,
    directionVectorENU,
  };
}

/**
 * Computes the fraction [0.0, 1.0] of the finite solar disc (radius ~0.266°)
 * visible above the local terrain horizon mask, treating the ridge as a straight
 * chord cutting a circular disc of unit radius.
 *
 * With h = clearance / R_☉ (signed distance of the disc centre above the ridge, in disc
 * radii), the visible area fraction is the complement of the circular segment below
 * the chord:  f(h) = 1 − [acos(h) − h·√(1 − h²)] / π.
 * f(−1) = 0, f(0) = 0.5, f(+1) = 1.
 */
export function computeSolarDiscVisibilityFraction(
  sunCenterElevationDeg: number,
  horizonMaskElevationDeg: number
): number {
  const clearance = sunCenterElevationDeg - horizonMaskElevationDeg;
  if (clearance >= SOLAR_ANGULAR_RADIUS_DEG) {
    return 1.0;
  }
  if (clearance <= -SOLAR_ANGULAR_RADIUS_DEG) {
    return 0.0;
  }
  const h = Math.max(-1, Math.min(1, clearance / SOLAR_ANGULAR_RADIUS_DEG));
  const hiddenSegmentArea = Math.acos(h) - h * Math.sqrt(Math.max(0, 1 - h * h));
  const fraction = 1 - hiddenSegmentArea / Math.PI;
  return Number(Math.max(0, Math.min(1, fraction)).toFixed(4));
}

/**
 * Computes solar panel orientation, incidence angle (theta_i), plane-of-array irradiance,
 * and net electrical power output for a given solar position and hardware configuration.
 */
export function computeSolarArrayPerformance(
  sunElevationDeg: number,
  sunAzimuthDeg: number,
  horizonMaskDeg: number,
  hardware: SolarHardwareConfig
): {
  visibleDiscFraction: number;
  effectivePanelAzimuthDeg: number;
  effectivePanelTiltDeg: number;
  panelIncidenceAngleDeg: number;
  cosineProjectionFactor: number;
  directNormalIrradianceWm2: number;
  planeOfArrayIrradianceWm2: number;
  estimatedElectricalPowerWatts: number;
  powerUncertaintyWatts: number;
} {
  const visibleDiscFraction = computeSolarDiscVisibilityFraction(
    sunElevationDeg,
    horizonMaskDeg
  );
  const directNormalIrradianceWm2 = Math.round(
    SOLAR_CONSTANT_1AU_WM2 * visibleDiscFraction
  );

  // Determine effective panel normal azimuth & tilt based on tracking mode
  let effectivePanelAzimuthDeg = hardware.panelAzimuthDeg;
  let effectivePanelTiltDeg = hardware.panelTiltDeg;

  if (hardware.trackingMode === 'VERTICAL_1AXIS_AZIMUTH') {
    effectivePanelAzimuthDeg = sunAzimuthDeg;
    effectivePanelTiltDeg = hardware.panelTiltDeg;
  } else if (hardware.trackingMode === 'DUAL_AXIS_SUN_TRACKING') {
    effectivePanelAzimuthDeg = sunAzimuthDeg;
    effectivePanelTiltDeg = Math.max(0, Math.min(90, 90 - sunElevationDeg));
  }

  // Compute angle of incidence theta_i between solar vector and panel normal
  const sunElRad = sunElevationDeg * DEG_TO_RAD;
  const sunAzRad = sunAzimuthDeg * DEG_TO_RAD;
  const tiltRad = effectivePanelTiltDeg * DEG_TO_RAD;
  const panelAzRad = effectivePanelAzimuthDeg * DEG_TO_RAD;

  // Panel normal vector: tilt=0° is Zenith (Up=1), tilt=90° is Horizontal facing panelAzimuth
  const cosTheta =
    Math.sin(sunElRad) * Math.cos(tiltRad) +
    Math.cos(sunElRad) * Math.sin(tiltRad) * Math.cos(sunAzRad - panelAzRad);

  const clampedCos = Math.max(0, Math.min(1, cosTheta));
  const panelIncidenceAngleDeg = Number((Math.acos(clampedCos) * RAD_TO_DEG).toFixed(1));
  const cosineProjectionFactor = Number(clampedCos.toFixed(3));

  const planeOfArrayIrradianceWm2 = Math.round(
    directNormalIrradianceWm2 * cosineProjectionFactor
  );

  const efficiency = Math.max(0.01, Math.min(1.0, hardware.cellEfficiencyPct / 100));
  const derating = Math.max(0.1, Math.min(1.0, hardware.systemDeratingFactor));
  const estimatedElectricalPowerWatts = Math.round(
    planeOfArrayIrradianceWm2 * hardware.arrayAreaM2 * efficiency * derating
  );

  // Propagate the stated synthetic horizon-mask uncertainty (±HORIZON_MASK_UNCERTAINTY_DEG)
  // through the disc-visibility function. Far from the ridge both bounds agree and the
  // term vanishes; within ~1.5° of the ridge the honest answer is "anywhere from dark to full".
  const highFrac = computeSolarDiscVisibilityFraction(
    sunElevationDeg,
    horizonMaskDeg - HORIZON_MASK_UNCERTAINTY_DEG
  );
  const lowFrac = computeSolarDiscVisibilityFraction(
    sunElevationDeg,
    horizonMaskDeg + HORIZON_MASK_UNCERTAINTY_DEG
  );
  const deltaFrac = Math.abs(highFrac - lowFrac) * 0.5;
  const baseUncertainty = estimatedElectricalPowerWatts * 0.04; // ±4% calibration/thermal uncertainty
  const horizonUncertainty =
    SOLAR_CONSTANT_1AU_WM2 *
    deltaFrac *
    cosineProjectionFactor *
    hardware.arrayAreaM2 *
    efficiency *
    derating;
  const powerUncertaintyWatts = Math.round(baseUncertainty + horizonUncertainty);

  return {
    visibleDiscFraction,
    effectivePanelAzimuthDeg: Number(effectivePanelAzimuthDeg.toFixed(1)),
    effectivePanelTiltDeg: Number(effectivePanelTiltDeg.toFixed(1)),
    panelIncidenceAngleDeg,
    cosineProjectionFactor,
    directNormalIrradianceWm2,
    planeOfArrayIrradianceWm2,
    estimatedElectricalPowerWatts,
    powerUncertaintyWatts,
  };
}

/**
 * Computes Direct-to-Earth (DTE) RF link budget, Free-Space Path Loss (FSPL),
 * minimum elevation constraint compliance, and optional NRHO Relay availability.
 *
 * Never treats Earth elevation > 0° alone as proof of communication availability:
 * requires BOTH terrain clearance >= minRidgeClearanceDeg AND
 * elevation >= minElevationConstraintDeg AND positive link margin.
 */
export function computeEarthCommLinkBudget(
  earthElevationDeg: number,
  earthAzimuthDeg: number,
  horizonMaskDeg: number,
  distanceKm: number,
  hourOffset: number,
  hardware: CommHardwareConfig
): {
  isGeometricallyVisible: boolean;
  isTerrainObstructed: boolean;
  horizonClearanceDeg: number;
  meetsMinimumElevationConstraint: boolean;
  isDteOperational: boolean;
  isRelayOperational: boolean;
  landerAntennaGainDbi: number;
  freeSpacePathLossDb: number;
  estimatedLinkMarginDb: number;
  estimatedDataRateMbps: number;
} {
  const isGeometricallyVisible = earthElevationDeg > 0.0;
  const horizonClearanceDeg = Number((earthElevationDeg - horizonMaskDeg).toFixed(2));
  const isTerrainObstructed = horizonClearanceDeg < hardware.minRidgeClearanceDeg;
  const meetsMinimumElevationConstraint =
    earthElevationDeg >= hardware.minElevationConstraintDeg;

  // Frequency in GHz
  const freqGhz =
    hardware.frequencyBand === 'S_BAND_2_2GHZ'
      ? 2.25
      : hardware.frequencyBand === 'X_BAND_8_4GHZ'
      ? 8.45
      : 32.0;

  // Parabolic dish gain: G(dBi) ≈ 10 * log10(eta * (pi * D * f / c)^2), eta = 0.55
  const wavelengthM = 0.299792458 / freqGhz;
  const dishEfficiency = 0.55;
  const gainLinear =
    dishEfficiency * Math.pow((Math.PI * hardware.antennaDiameterMeters) / wavelengthM, 2);
  const landerAntennaGainDbi = Number((10 * Math.log10(Math.max(1, gainLinear))).toFixed(1));

  // Free-Space Path Loss: FSPL(dB) = 20*log10(d_km) + 20*log10(f_GHz) + 92.45
  const freeSpacePathLossDb = Number(
    (
      20 * Math.log10(Math.max(1000, distanceKm)) +
      20 * Math.log10(freqGhz) +
      92.45
    ).toFixed(1)
  );

  // Transmitter power in dBW
  const txPowerDbw = 10 * Math.log10(Math.max(0.1, hardware.transmitPowerWatts));
  const eirpDbw = txPowerDbw + landerAntennaGainDbi;

  // DSN 34m Beam-Waveguide (BWG) equivalent receive figure of merit + bandwidth normalization
  const dsnSystemConstantDb =
    hardware.frequencyBand === 'S_BAND_2_2GHZ'
      ? 169.5
      : hardware.frequencyBand === 'X_BAND_8_4GHZ'
      ? 176.2
      : 181.0;

  // Multipath / low-angle atmospheric & regolith reflection penalty below 5°
  const lowAnglePenaltyDb =
    earthElevationDeg < 5.0 ? Math.max(0, (5.0 - earthElevationDeg) * 1.4) : 0;

  let estimatedLinkMarginDb: number;
  if (isTerrainObstructed) {
    // Knife-edge diffraction loss behind lunar ridge
    estimatedLinkMarginDb = Number(
      Math.max(-35.0, -8.0 + horizonClearanceDeg * 4.5).toFixed(1)
    );
  } else {
    estimatedLinkMarginDb = Number(
      (
        eirpDbw -
        freeSpacePathLossDb +
        dsnSystemConstantDb -
        lowAnglePenaltyDb
      ).toFixed(1)
    );
  }

  const isDteOperational =
    isGeometricallyVisible &&
    !isTerrainObstructed &&
    meetsMinimumElevationConstraint &&
    estimatedLinkMarginDb >= 3.0;

  // NRHO Relay Satellite (6.5-day southern apoapsis dwell over Lunar South Pole):
  // Provides overhead pass coverage ~82% of the orbit when enabled
  const nrhoOrbitPeriodHours = 6.56 * 24; // ~157.4 hours
  const nrhoPhase = ((hourOffset % nrhoOrbitPeriodHours) + nrhoOrbitPeriodHours) % nrhoOrbitPeriodHours;
  // Perilune passage over North Pole drops south polar coverage for ~24 hours per 157h orbit
  const isRelayInPassWindow = nrhoPhase < 132.0;
  const isRelayOperational = Boolean(hardware.relaySatelliteEnabled && isRelayInPassWindow);

  let estimatedDataRateMbps = 0;
  if (isDteOperational) {
    const rawRate =
      hardware.frequencyBand === 'KA_BAND_32GHZ'
        ? 45.0
        : hardware.frequencyBand === 'X_BAND_8_4GHZ'
        ? 12.0
        : 2.0;
    const marginMultiplier = Math.pow(10, Math.min(12, estimatedLinkMarginDb - 3.0) / 15);
    estimatedDataRateMbps = Number((rawRate * marginMultiplier).toFixed(1));
  } else if (isRelayOperational) {
    estimatedDataRateMbps = 10.0; // Standard Proximity-1 / Lunanet S/Ka relay rate
  }

  return {
    isGeometricallyVisible,
    isTerrainObstructed,
    horizonClearanceDeg,
    meetsMinimumElevationConstraint,
    isDteOperational,
    isRelayOperational,
    landerAntennaGainDbi,
    freeSpacePathLossDb,
    estimatedLinkMarginDb,
    estimatedDataRateMbps,
  };
}
