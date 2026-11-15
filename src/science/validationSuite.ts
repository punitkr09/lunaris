/**
 * LUNARIS — Automated Scientific Validation & Reference Benchmark Suite
 *
 * Tests all 10 required scientific & engineering domains against analytical
 * reference values with explicit error reporting and tolerance verification.
 */

import {
  DEFAULT_COMM_HARDWARE,
  DEFAULT_SOLAR_HARDWARE,
  MEAN_LUNAR_RADIUS_KM,
  SOLAR_ANGULAR_RADIUS_DEG,
  cartesian3DToLunarLatLon,
  computeAnalyticalSelenographicEphemeris,
  computeDelaunayArguments,
  computeEarthCommLinkBudget,
  computeLunarLocalSolarHour,
  computeLunarSurfaceDistanceKm,
  computeSolarArrayPerformance,
  computeSolarDiscVisibilityFraction,
  computeTopocentricHorizontal,
  formatLunarLocalSolarTime,
  julianDateToJ2000Centuries,
  lunarLatLonToCartesian3D,
  normalizeLongitudeDeg,
  utcMsToJulianDate,
} from './lunarMath';
import { SimulatedLunarProvider } from '../services/SimulatedLunarProvider';

export interface ScientificTestCaseResult {
  id: string;
  category:
    | '1. Coordinate Transformations'
    | '2. Time Conversions'
    | '3. Sun Position'
    | '4. Earth Position'
    | '5. Terrain Horizon Calculations'
    | '6. Solar Visibility'
    | '7. Earth Visibility'
    | '8. Shadow Calculations'
    | '9. Power Estimates'
    | '10. Communication Constraints';
  title: string;
  referenceDescription: string;
  expectedValue: string;
  actualValue: string;
  absoluteError: number;
  tolerance: number;
  unit: string;
  passed: boolean;
}

export interface ScientificValidationReport {
  results: ScientificTestCaseResult[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
}

export function runScientificValidationSuite(): ScientificValidationReport {
  const results: ScientificTestCaseResult[] = [];
  const provider = new SimulatedLunarProvider();

  // 1. COORDINATE TRANSFORMATIONS
  {
    // Test 1A: Round-trip (Lat, Lon) -> 3D Cartesian -> (Lat, Lon) at Shackleton Connecting Ridge
    const refLat = -89.46;
    const refLon = -137.8;
    const [x, y, z] = lunarLatLonToCartesian3D(refLat, refLon, MEAN_LUNAR_RADIUS_KM);
    const recovered = cartesian3DToLunarLatLon(x, y, z);
    const err = Math.hypot(
      recovered.latitudeDeg - refLat,
      recovered.longitudeDeg - refLon
    );
    results.push({
      id: 'COORD-01',
      category: '1. Coordinate Transformations',
      title: 'Selenographic (MOON_ME) ↔ 3D Cartesian Round-Trip',
      referenceDescription: 'Shackleton Ridge (-89.46°S, -137.80°W) at R = 1737.4 km',
      expectedValue: `${refLat.toFixed(4)}°, ${refLon.toFixed(4)}°`,
      actualValue: `${recovered.latitudeDeg.toFixed(4)}°, ${recovered.longitudeDeg.toFixed(4)}°`,
      absoluteError: Number(err.toFixed(6)),
      tolerance: 0.001,
      unit: 'deg',
      passed: err <= 0.001,
    });

    // Test 1B: Quarter-Meridian Selenodesic Arc (Equator 0° to South Pole -90°S)
    // Exact quarter circumference = (pi / 2) * 1737.4 = 2729.1015 km
    const expectedQuarterArcKm = (Math.PI / 2) * MEAN_LUNAR_RADIUS_KM;
    const actualArcKm = computeLunarSurfaceDistanceKm(
      { latitudeDeg: 0, longitudeDeg: 0 },
      { latitudeDeg: -90, longitudeDeg: 0 }
    );
    const arcErr = Math.abs(actualArcKm - expectedQuarterArcKm);
    results.push({
      id: 'COORD-02',
      category: '1. Coordinate Transformations',
      title: 'Great-Circle Selenodesic Pole-to-Equator Distance',
      referenceDescription: 'Quarter meridian arc π/2 × 1737.4 km',
      expectedValue: `${expectedQuarterArcKm.toFixed(3)} km`,
      actualValue: `${actualArcKm.toFixed(3)} km`,
      absoluteError: Number(arcErr.toFixed(4)),
      tolerance: 0.05,
      unit: 'km',
      passed: arcErr <= 0.05,
    });

    // Test 1C: Longitude normalization & anti-meridian wrap.
    // ±180° must be preserved (not collapsed), out-of-range values wrap, and a great-circle
    // distance that straddles the ±180° seam must be the short way round (0.2° ≈ 6.065 km).
    const wrapChecks: [number, number][] = [
      [normalizeLongitudeDeg(180), 180],
      [normalizeLongitudeDeg(-180), -180],
      [normalizeLongitudeDeg(540), 180],
      [normalizeLongitudeDeg(-190), 170],
      [normalizeLongitudeDeg(190), -170],
    ];
    const wrapErr = wrapChecks.reduce((acc, [got, want]) => acc + Math.abs(got - want), 0);
    const seamKm = computeLunarSurfaceDistanceKm(
      { latitudeDeg: 0, longitudeDeg: 179.9 },
      { latitudeDeg: 0, longitudeDeg: -179.9 }
    );
    const expectedSeamKm = (0.2 * Math.PI / 180) * MEAN_LUNAR_RADIUS_KM;
    const seamErr = Math.abs(seamKm - expectedSeamKm);
    results.push({
      id: 'COORD-03',
      category: '1. Coordinate Transformations',
      title: 'Longitude Normalization & ±180° Anti-Meridian Seam',
      referenceDescription:
        'normalize(540)=180, normalize(-190)=170, normalize(190)=-170; distance 179.9°E→179.9°W = 0.2° arc',
      expectedValue: `0.000° wrap error · ${expectedSeamKm.toFixed(3)} km`,
      actualValue: `${wrapErr.toFixed(3)}° wrap error · ${seamKm.toFixed(3)} km`,
      absoluteError: Number((wrapErr + seamErr).toFixed(4)),
      tolerance: 0.01,
      unit: 'deg+km',
      passed: wrapErr === 0 && seamErr <= 0.01,
    });
  }

  // 2. TIME CONVERSIONS
  {
    // Test 2A: J2000.0 Epoch (2000-01-01T12:00:00Z) -> JD 2451545.0, T = 0.0
    const j2000Ms = Date.UTC(2000, 0, 1, 12, 0, 0);
    const jd = utcMsToJulianDate(j2000Ms);
    const T = julianDateToJ2000Centuries(jd);
    const jdErr = Math.abs(jd - 2451545.0);
    results.push({
      id: 'TIME-01',
      category: '2. Time Conversions',
      title: 'J2000.0 Reference Epoch Julian Date Conversion',
      referenceDescription: '2000-01-01T12:00:00Z must equal JD 2451545.0 (T = 0.0)',
      expectedValue: '2451545.00000',
      actualValue: `${jd.toFixed(5)} (T=${T.toFixed(6)})`,
      absoluteError: Number(jdErr.toFixed(6)),
      tolerance: 1e-5,
      unit: 'JD',
      passed: jdErr <= 1e-5 && Math.abs(T) <= 1e-7,
    });

    // Test 2B: Lunar Local True Solar Time (LTST) at Sub-Solar Meridian & Antimeridian
    const noonLtst = computeLunarLocalSolarHour(-68.7, -68.7);
    const midnightLtst = computeLunarLocalSolarHour(-68.7, 111.3);
    const ltstErr = Math.abs(noonLtst - 12.0) + Math.abs(midnightLtst - 0.0);
    results.push({
      id: 'TIME-02',
      category: '2. Time Conversions',
      title: 'Lunar Local True Solar Time (LTST) Meridian Identity',
      referenceDescription: 'When λ_site = λ_sun → 12.00h Noon; Δλ = 180° → 0.00h Midnight',
      expectedValue: '12.00h / 0.00h',
      actualValue: `${noonLtst.toFixed(2)}h / ${midnightLtst.toFixed(2)}h`,
      absoluteError: Number(ltstErr.toFixed(5)),
      tolerance: 0.01,
      unit: 'hours',
      passed: ltstErr <= 0.01,
    });

    // Test 2C: LTST display formatting must carry rounded-up minutes into the hour field
    // (a naive floor/round pair prints 11.9999 h as "11:00").
    const fmtChecks: [string, string][] = [
      [formatLunarLocalSolarTime(11.9999), '12:00 LTST'],
      [formatLunarLocalSolarTime(23.9999), '00:00 LTST'],
      [formatLunarLocalSolarTime(6.5), '06:30 LTST'],
      [formatLunarLocalSolarTime(0.0), '00:00 LTST'],
    ];
    const fmtFailures = fmtChecks.filter(([got, want]) => got !== want).length;
    results.push({
      id: 'TIME-03',
      category: '2. Time Conversions',
      title: 'LTST Clock Formatting Carry (HH:MM)',
      referenceDescription: '11.9999h → "12:00", 23.9999h → "00:00", 6.5h → "06:30", 0h → "00:00"',
      expectedValue: fmtChecks.map(([, want]) => want.replace(' LTST', '')).join(' / '),
      actualValue: fmtChecks.map(([got]) => got.replace(' LTST', '')).join(' / '),
      absoluteError: fmtFailures,
      tolerance: 0,
      unit: 'mismatches',
      passed: fmtFailures === 0,
    });
  }

  // 3. SUN POSITION
  {
    // Test 3A: Observer located directly at the Sub-Solar Point must see Sun at +90.0° Zenith
    const jdSample = utcMsToJulianDate(Date.UTC(2026, 10, 15, 12, 0, 0));
    const eph = computeAnalyticalSelenographicEphemeris(jdSample);
    const subSolarTopo = computeTopocentricHorizontal(
      {
        latitudeDeg: eph.subSolarLatitudeDeg,
        longitudeDeg: eph.subSolarLongitudeDeg,
      },
      eph.subSolarLatitudeDeg,
      eph.subSolarLongitudeDeg
    );
    const zenithErr = Math.abs(subSolarTopo.elevationDeg - 90.0);
    results.push({
      id: 'SUN-01',
      category: '3. Sun Position',
      title: 'Sub-Solar Point Zenith Elevation Identity',
      referenceDescription: 'Topocentric solar elevation at (φ_sun, λ_sun) must equal +90.0°',
      expectedValue: '+90.000°',
      actualValue: `+${subSolarTopo.elevationDeg.toFixed(3)}°`,
      absoluteError: Number(zenithErr.toFixed(5)),
      tolerance: 0.01,
      unit: 'deg',
      passed: zenithErr <= 0.01,
    });

    // Test 3B: Exact Lunar South Pole (-90°S) Solar Elevation equals -φ_sun (bounded by ±1.5424°)
    const southPoleSun = computeTopocentricHorizontal(
      { latitudeDeg: -90.0, longitudeDeg: 0.0 },
      eph.subSolarLatitudeDeg,
      eph.subSolarLongitudeDeg
    );
    const expectedPoleEl = -eph.subSolarLatitudeDeg;
    const poleErr = Math.abs(southPoleSun.elevationDeg - expectedPoleEl);
    results.push({
      id: 'SUN-02',
      category: '3. Sun Position',
      title: 'South Pole (-90°S) Solar Elevation vs. Sub-Solar Latitude',
      referenceDescription: 'At φ = -90°S, sin(El) = -sin(φ_sun) → El = -φ_sun ∈ [-1.54°, +1.54°]',
      expectedValue: `${expectedPoleEl.toFixed(3)}°`,
      actualValue: `${southPoleSun.elevationDeg.toFixed(3)}°`,
      absoluteError: Number(poleErr.toFixed(5)),
      tolerance: 0.01,
      unit: 'deg',
      passed:
        poleErr <= 0.01 && Math.abs(eph.subSolarLatitudeDeg) <= 1.55,
    });

    // Test 3C: Equatorial East-Rise (Az ~90°) & West-Set (Az ~270°) Sign Convention
    // When sub-solar longitude is +90°E of site (06:00 LTST dawn), Sun must be in the East (Az ≈ 90°).
    // When sub-solar longitude is -90°W of site (18:00 LTST dusk), Sun must be in the West (Az ≈ 270°).
    const dawnTopo = computeTopocentricHorizontal(
      { latitudeDeg: 0.0, longitudeDeg: 0.0 },
      0.0,
      90.0
    );
    const duskTopo = computeTopocentricHorizontal(
      { latitudeDeg: 0.0, longitudeDeg: 0.0 },
      0.0,
      -90.0
    );
    const azErr = Math.abs(dawnTopo.azimuthDeg - 90.0) + Math.abs(duskTopo.azimuthDeg - 270.0);
    results.push({
      id: 'SUN-03',
      category: '3. Sun Position',
      title: 'Selenographic East-Sunrise (90° Az) & West-Sunset (270° Az) Convention',
      referenceDescription: 'Sub-solar +90°E (06:00 LTST) → Az 90.0° (East); -90°W (18:00 LTST) → Az 270.0° (West)',
      expectedValue: 'Dawn 90.0° / Dusk 270.0°',
      actualValue: `Dawn ${dawnTopo.azimuthDeg.toFixed(1)}° / Dusk ${duskTopo.azimuthDeg.toFixed(1)}°`,
      absoluteError: Number(azErr.toFixed(4)),
      tolerance: 0.05,
      unit: 'deg',
      passed: azErr <= 0.05,
    });
  }

  // 4. EARTH POSITION
  {
    // Test 4A: Far-Side Landing Site (Chang'e-4 Von Kármán Crater: 45.44°S, 177.60°E) must have permanently negative Earth elevation
    const jdSample = utcMsToJulianDate(Date.UTC(2026, 10, 15, 12, 0, 0));
    const eph = computeAnalyticalSelenographicEphemeris(jdSample);
    const farsideEarth = computeTopocentricHorizontal(
      { latitudeDeg: -45.444, longitudeDeg: 177.599 },
      eph.subEarthLatitudeDeg,
      eph.subEarthLongitudeDeg
    );
    const isBelowHorizon = farsideEarth.elevationDeg < -30.0;
    results.push({
      id: 'EARTH-01',
      category: '4. Earth Position',
      title: 'Far-Side (Von Kármán 177.6°E) Earth Occultation Verification',
      referenceDescription: 'Lunar Far Side must yield negative geometric Earth elevation (< -30°)',
      expectedValue: '< -30.0° (Below Horizon)',
      actualValue: `${farsideEarth.elevationDeg.toFixed(2)}°`,
      absoluteError: isBelowHorizon ? 0 : Math.abs(farsideEarth.elevationDeg + 30),
      tolerance: 0.1,
      unit: 'deg',
      passed: isBelowHorizon,
    });

    // Test 4B: Independent Historical Reference Fixture — Apollo 11 Tranquillitatis Base (1969-07-20T20:17:40Z)
    // At (0.674°N, 23.473°E) the zero-libration geometric Earth elevation is 90° − arccos(cos 0.674°·cos 23.473°) ≈ 66.5°.
    // Optical libration can displace the sub-Earth point by up to ~7.9° in longitude and ~6.7° in latitude, so the
    // topocentric elevation must lie inside a 66.5° ± 9° envelope and the libration terms themselves must stay bounded.
    // (At landing M' ≈ 270°, i.e. a week before perigee: the Moon lags its mean position, so l' is negative/west.)
    const apollo11Jd = utcMsToJulianDate(Date.UTC(1969, 6, 20, 20, 17, 40));
    const apollo11Eph = computeAnalyticalSelenographicEphemeris(apollo11Jd);
    const apollo11Earth = computeTopocentricHorizontal(
      { latitudeDeg: 0.674, longitudeDeg: 23.473 },
      apollo11Eph.subEarthLatitudeDeg,
      apollo11Eph.subEarthLongitudeDeg
    );
    const apolloElErr = Math.abs(apollo11Earth.elevationDeg - 66.5);
    const librationBounded =
      Math.abs(apollo11Eph.subEarthLongitudeDeg) <= 8.0 &&
      Math.abs(apollo11Eph.subEarthLatitudeDeg) <= 6.8;
    results.push({
      id: 'EARTH-02',
      category: '4. Earth Position',
      title: 'Apollo 11 (1969-07-20 UTC) Topocentric Earth Elevation & Libration Envelope',
      referenceDescription:
        'Statio Tranquillitatis (0.674°N, 23.473°E): zero-libration Earth elevation 66.5°; libration envelope ±7.9° lon / ±6.7° lat',
      expectedValue: '66.5° (±9.0° envelope) · |l′| ≤ 8°, |b′| ≤ 6.8°',
      actualValue: `${apollo11Earth.elevationDeg.toFixed(2)}° (Lib: ${apollo11Eph.subEarthLongitudeDeg.toFixed(1)}°, ${apollo11Eph.subEarthLatitudeDeg.toFixed(1)}°)`,
      absoluteError: Number(apolloElErr.toFixed(2)),
      tolerance: 9.0,
      unit: 'deg',
      passed: apolloElErr <= 9.0 && librationBounded,
    });

    // Test 4C: Libration-in-longitude SIGN convention (regression for a transcription error that
    // negated only the leading 6.289·sin(M′) term of the equation-of-center series).
    // Physics: the Moon rotates uniformly but orbits non-uniformly. Shortly after perigee
    // (M′ ≈ 90°) it runs AHEAD of its mean position, so the Earth is displaced toward the eastern
    // (Mare Crisium) limb and the sub-Earth selenographic longitude must be POSITIVE (≈ +6°).
    // Find the sample nearest M′ = 90° inside a 60-day window and check the sign and magnitude.
    let bestJd = NaN;
    let bestDelta = Number.POSITIVE_INFINITY;
    const scanStartMs = Date.UTC(2026, 10, 1, 0, 0, 0);
    for (let h = 0; h < 24 * 60; h += 1) {
      const jd = utcMsToJulianDate(scanStartMs + h * 3600000);
      const { Mprime } = computeDelaunayArguments(jd);
      const d = Math.abs(Mprime - 90);
      if (d < bestDelta) {
        bestDelta = d;
        bestJd = jd;
      }
    }
    const postPerigeeEph = computeAnalyticalSelenographicEphemeris(bestJd);
    const librationSignOk = postPerigeeEph.subEarthLongitudeDeg > 4.0;
    results.push({
      id: 'EARTH-03',
      category: '4. Earth Position',
      title: 'Optical Libration Longitude Sign (Post-Perigee → East)',
      referenceDescription:
        "At M′ ≈ 90° (≈1 week after perigee) l′ ≈ +6.3°·sin(M′) + minor terms must be positive (Earth displaced toward the east limb)",
      expectedValue: '> +4.0° (east)',
      actualValue: `${postPerigeeEph.subEarthLongitudeDeg.toFixed(2)}° at M′=${(90 + (computeDelaunayArguments(bestJd).Mprime - 90)).toFixed(1)}°`,
      absoluteError: librationSignOk ? 0 : Number((4.0 - postPerigeeEph.subEarthLongitudeDeg).toFixed(2)),
      tolerance: 0,
      unit: 'deg',
      passed: librationSignOk && bestDelta < 1.0,
    });
  }

  // 5. TERRAIN HORIZON CALCULATIONS
  {
    // Test 5A: High-elevation massif (Mons Mouton +5210m) has lower mean horizon obstruction than deep basin (-2450m)
    const sites = provider.getCandidateLandingSites();
    const mouton = sites.find((s) => s.id === 'leibnitz-beta')!;
    const coldTrap = sites.find((s) => s.id === 'synth-coldtrap-test')!;
    const profMouton = provider.generateHorizonProfile(mouton.coordinates, mouton);
    const profTrap = provider.generateHorizonProfile(coldTrap.coordinates, coldTrap);
    const meanMouton =
      profMouton.reduce((a, b) => a + b.horizonElevationDeg, 0) / profMouton.length;
    const meanTrap =
      profTrap.reduce((a, b) => a + b.horizonElevationDeg, 0) / profTrap.length;
    const delta = meanTrap - meanMouton;
    results.push({
      id: 'HORIZ-01',
      category: '5. Terrain Horizon Calculations',
      title: 'Hypsometric Horizon Mask Altitude Sensitivity',
      referenceDescription: 'Summit massif (+5210m) mean horizon mask must be lower than basin floor (-2450m)',
      expectedValue: 'Mean(Basin) > Mean(Summit) by ≥ 2.0°',
      actualValue: `Basin ${meanTrap.toFixed(2)}° vs Summit ${meanMouton.toFixed(2)}° (Δ=${delta.toFixed(2)}°)`,
      absoluteError: delta >= 2.0 ? 0 : 2.0 - delta,
      tolerance: 0.1,
      unit: 'deg',
      passed: profMouton.length === 72 && delta >= 2.0,
    });

    // Test 5B: Horizon mask interpolation must wrap across the 355° → 0° seam
    // (the last azimuth bin interpolates toward bin 0, never off the end of the array).
    const seamProfile = profMouton;
    const v355 = seamProfile[seamProfile.length - 1].horizonElevationDeg;
    const v0 = seamProfile[0].horizonElevationDeg;
    const expectedMid = (v355 + v0) / 2;
    const sampledMid = provider.sampleHorizonMaskDeg(seamProfile, 357.5);
    const sampledWrap = provider.sampleHorizonMaskDeg(seamProfile, 360);
    const exactBin = provider.sampleHorizonMaskDeg(seamProfile, 355);
    const seamInterpErr =
      Math.abs(sampledMid - expectedMid) + Math.abs(sampledWrap - v0) + Math.abs(exactBin - v355);
    results.push({
      id: 'HORIZ-02',
      category: '5. Terrain Horizon Calculations',
      title: 'Horizon Mask Azimuth Interpolation & 360° Seam Wrap',
      referenceDescription:
        'mask(357.5°) = mean(mask[355°], mask[0°]); mask(360°) = mask[0°]; mask(355°) = mask[355°]',
      expectedValue: `${expectedMid.toFixed(2)}° / ${v0.toFixed(2)}° / ${v355.toFixed(2)}°`,
      actualValue: `${sampledMid.toFixed(2)}° / ${sampledWrap.toFixed(2)}° / ${exactBin.toFixed(2)}°`,
      absoluteError: Number(seamInterpErr.toFixed(4)),
      tolerance: 0.011,
      unit: 'deg',
      passed: seamInterpErr <= 0.011,
    });

    // Test 5C: Preset site matching must be metric (great-circle) rather than a lat/lon box.
    // 1.3° of longitude at 89.46°S is only ~370 m, so this click must still snap to Shackleton,
    // while a point 0.1° of latitude (~3 km) off the equatorial Apollo 11 site must also match
    // and one 0.2° (~6 km) off must not.
    const polarClick = provider.findMatchingPreset({ latitudeDeg: -89.46, longitudeDeg: -136.5 });
    const apolloNear = provider.findMatchingPreset({ latitudeDeg: 0.774, longitudeDeg: 23.473 });
    const apolloFar = provider.findMatchingPreset({ latitudeDeg: 0.874, longitudeDeg: 23.473 });
    const matchOk =
      polarClick?.id === 'shackleton-ridge' &&
      apolloNear?.id === 'apollo-11-tranquillitatis' &&
      apolloFar === null;
    results.push({
      id: 'HORIZ-03',
      category: '5. Terrain Horizon Calculations',
      title: 'Polar-Safe Preset Site Snapping (Great-Circle Radius)',
      referenceDescription:
        '(-89.46°, -136.5°) → Shackleton (Δ≈0.37 km); (0.774°, 23.473°) → Apollo 11 (Δ≈3.0 km); (0.874°, 23.473°) → no match (Δ≈6.1 km)',
      expectedValue: 'shackleton-ridge / apollo-11-tranquillitatis / null',
      actualValue: `${polarClick?.id ?? 'null'} / ${apolloNear?.id ?? 'null'} / ${apolloFar?.id ?? 'null'}`,
      absoluteError: matchOk ? 0 : 1,
      tolerance: 0,
      unit: 'boolean',
      passed: matchOk,
    });
  }

  // 6. SOLAR VISIBILITY
  {
    // Test 6A: Finite Solar Disc Limb Visibility across ridge boundary
    const fullVis = computeSolarDiscVisibilityFraction(2.5, 1.0); // +1.5° clearance -> 1.0
    const grazingHalf = computeSolarDiscVisibilityFraction(1.0, 1.0); // 0.0° center on ridge -> 0.5
    const blocked = computeSolarDiscVisibilityFraction(0.2, 1.0); // -0.8° behind ridge -> 0.0
    const err =
      Math.abs(fullVis - 1.0) +
      Math.abs(grazingHalf - 0.5) +
      Math.abs(blocked - 0.0);
    results.push({
      id: 'SOLVIS-01',
      category: '6. Solar Visibility',
      title: 'Finite Solar Disc (R_☉ = 0.266°) Limb Grazing Model',
      referenceDescription: 'Clearance +1.5° → 1.0; Clearance 0.0° → 0.50; Clearance -0.8° → 0.0',
      expectedValue: '1.000 / 0.500 / 0.000',
      actualValue: `${fullVis.toFixed(3)} / ${grazingHalf.toFixed(3)} / ${blocked.toFixed(3)}`,
      absoluteError: Number(err.toFixed(5)),
      tolerance: 0.005,
      unit: 'fraction',
      passed: err <= 0.005,
    });

    // Test 6B: Exact circular-segment area at half-radius clearance.
    // f(h) = 1 − [acos(h) − h√(1−h²)]/π; at h = +0.5: 1 − (π/3 − √3/4)/π = 0.80450; at h = −0.5: 0.19550.
    const halfUp = computeSolarDiscVisibilityFraction(SOLAR_ANGULAR_RADIUS_DEG * 0.5, 0);
    const halfDown = computeSolarDiscVisibilityFraction(-SOLAR_ANGULAR_RADIUS_DEG * 0.5, 0);
    const expectedHalfUp = 1 - (Math.acos(0.5) - 0.5 * Math.sqrt(0.75)) / Math.PI;
    const expectedHalfDown = 1 - expectedHalfUp;
    const segErr = Math.abs(halfUp - expectedHalfUp) + Math.abs(halfDown - expectedHalfDown);
    results.push({
      id: 'SOLVIS-02',
      category: '6. Solar Visibility',
      title: 'Circular-Segment Disc Area at ±½ R_☉ Clearance',
      referenceDescription:
        'Chord at half the disc radius above/below the ridge hides exactly 19.55% / 80.45% of the disc (not the ~15.6% / ~84.4% of a smoothstep)',
      expectedValue: `${expectedHalfUp.toFixed(4)} / ${expectedHalfDown.toFixed(4)}`,
      actualValue: `${halfUp.toFixed(4)} / ${halfDown.toFixed(4)}`,
      absoluteError: Number(segErr.toFixed(5)),
      tolerance: 0.0005,
      unit: 'fraction',
      passed: segErr <= 0.0005,
    });
  }

  // 7. EARTH VISIBILITY
  {
    // Test 7A: Geometric elevation > 0° (+2.0°) MUST NOT be treated as operational DTE when obstructed by a +3.5° ridge or below 3.0° minimum elevation constraint
    const obstructedCheck = computeEarthCommLinkBudget(
      2.0, // Earth geometric elevation +2.0° (> 0°)
      0.0,
      3.5, // Local terrain ridge is +3.5° (obstructs Earth!)
      384400,
      0,
      DEFAULT_COMM_HARDWARE
    );
    const passedGateCheck =
      obstructedCheck.isGeometricallyVisible === true &&
      obstructedCheck.isTerrainObstructed === true &&
      obstructedCheck.isDteOperational === false;
    results.push({
      id: 'EARTHVIS-01',
      category: '7. Earth Visibility',
      title: 'Non-Equivalence of Geometric Elevation and Operational DTE Lock',
      referenceDescription: 'At Earth El = +2.0° behind a +3.5° ridge, Geometric=TRUE but Operational DTE=FALSE',
      expectedValue: 'Geom=true, Obstructed=true, DTE=false',
      actualValue: `Geom=${obstructedCheck.isGeometricallyVisible}, Obstructed=${obstructedCheck.isTerrainObstructed}, DTE=${obstructedCheck.isDteOperational}`,
      absoluteError: passedGateCheck ? 0 : 1,
      tolerance: 0,
      unit: 'boolean',
      passed: passedGateCheck,
    });
  }

  // 8. SHADOW CALCULATIONS
  {
    // Test 8A: Equatorial site (Apollo 11: 0.674°N, 23.473°E) over 28-day stay experiences ~50% illumination and ~14-day continuous shadow
    const apolloScenario = provider.computeScenario({
      scenarioId: 'TEST-AP11',
      scenarioLabel: 'Apollo 11 Synodic Cycle Test',
      coordinates: { latitudeDeg: 0.674, longitudeDeg: 23.473 },
      epochIsoUtc: '2026-11-15T12:00:00Z',
      elapsedHours: 0,
      missionDurationDays: 28,
    });
    const duty = apolloScenario.summary.solarAvailabilityPct;
    const dutyErr = Math.abs(duty - 50.0);
    results.push({
      id: 'SHAD-01',
      category: '8. Shadow Calculations',
      title: 'Equatorial Synodic Day/Night Duty Cycle Benchmark',
      referenceDescription: 'Equatorial site over 28 Earth days should exhibit ~50% (±8%) solar duty cycle',
      expectedValue: '50.0% (±8.0%)',
      actualValue: `${duty.toFixed(1)}% (Max Dark: ${apolloScenario.summary.maxContinuousDarknessHours}h)`,
      absoluteError: Number(dutyErr.toFixed(2)),
      tolerance: 8.0,
      unit: '%',
      passed: dutyErr <= 8.0 && apolloScenario.summary.maxContinuousDarknessHours >= 240,
    });

    // Test 8B: Operational Window Partition Conservation & Sunrise/Sunset Transition Detection
    // Over a full 30-day synodic cycle (720h > 708.7h synodic month), any equatorial site must experience both Sunrise and Sunset,
    // and the 4 operational window durations must sum to totalMissionHours.
    const synodicScenario = provider.computeScenario({
      scenarioId: 'TEST-AP11-SYNODIC',
      scenarioLabel: 'Apollo 11 Full Synodic Month Transition Test',
      coordinates: { latitudeDeg: 0.674, longitudeDeg: 23.473 },
      epochIsoUtc: '2026-11-20T12:00:00Z',
      elapsedHours: 0,
      missionDurationDays: 28,
    });
    const sumWindowHours =
      synodicScenario.summary.nominalOpsHours +
      synodicScenario.summary.solarOnlyHours +
      synodicScenario.summary.eclipseDteHours +
      synodicScenario.summary.criticalBlackoutHours;
    const totalExpectedHours = 28 * 24;
    const partitionErr = Math.abs(sumWindowHours - totalExpectedHours);
    const hasSunEvents =
      synodicScenario.summary.sunriseCount >= 1 && synodicScenario.summary.sunsetCount >= 1;
    results.push({
      id: 'SHAD-02',
      category: '8. Shadow Calculations',
      title: 'Operational Window Conservation & Sunrise/Sunset Event Detection',
      referenceDescription: 'Sum of 4 operational states must equal 672h (28d) with ≥1 Sunrise & ≥1 Sunset detected',
      expectedValue: '672h (≥1 Rise, ≥1 Set)',
      actualValue: `${sumWindowHours}h (${synodicScenario.summary.sunriseCount} Rise, ${synodicScenario.summary.sunsetCount} Set)`,
      absoluteError: partitionErr,
      tolerance: 0,
      unit: 'hours',
      passed: partitionErr === 0 && hasSunEvents,
    });
  }

  // 9. POWER ESTIMATES
  {
    // Test 9A: At polar grazing Sun elevation (+2.0°), a Vertical Mast (88° tilt) generates >10x the power of a Horizontal Flat Panel (0° tilt)
    const verticalMast = computeSolarArrayPerformance(2.0, 180, 0.0, {
      ...DEFAULT_SOLAR_HARDWARE,
      trackingMode: 'VERTICAL_1AXIS_AZIMUTH',
      panelTiltDeg: 88,
    });
    const flatPanel = computeSolarArrayPerformance(2.0, 180, 0.0, {
      ...DEFAULT_SOLAR_HARDWARE,
      trackingMode: 'FIXED_ORIENTATION',
      panelTiltDeg: 0,
    });
    const ratio =
      verticalMast.estimatedElectricalPowerWatts /
      Math.max(1, flatPanel.estimatedElectricalPowerWatts);
    results.push({
      id: 'POW-01',
      category: '9. Power Estimates',
      title: 'Polar Grazing Sun (+2° El): Vertical Mast vs. Horizontal Panel Cosine Law',
      referenceDescription: 'cos(2°) / sin(2°) ≈ 28.6x irradiance advantage for vertical mast at +2° Sun',
      expectedValue: 'Ratio > 20.0x (~4216 W vs ~147 W)',
      actualValue: `${verticalMast.estimatedElectricalPowerWatts} W vs ${flatPanel.estimatedElectricalPowerWatts} W (${ratio.toFixed(1)}x)`,
      absoluteError: ratio >= 20 ? 0 : 20 - ratio,
      tolerance: 0.5,
      unit: 'ratio',
      passed: ratio >= 20.0,
    });

    // Test 9B: Exact cosine law on a horizontal panel with an unobstructed Sun at +30° elevation:
    // cos θ_i = sin(30°) = 0.500 → θ_i = 60.0°, POA = 1361 × 0.5 = 680.5 → 681 W/m² (integer rounding).
    const flat30 = computeSolarArrayPerformance(30.0, 135.0, 0.0, {
      ...DEFAULT_SOLAR_HARDWARE,
      trackingMode: 'FIXED_ORIENTATION',
      panelTiltDeg: 0,
    });
    const cosErr =
      Math.abs(flat30.cosineProjectionFactor - 0.5) +
      Math.abs(flat30.panelIncidenceAngleDeg - 60.0) +
      Math.abs(flat30.planeOfArrayIrradianceWm2 - 681) / 1000;
    results.push({
      id: 'POW-02',
      category: '9. Power Estimates',
      title: 'Horizontal Panel Cosine Law at +30° Sun (Exact Identity)',
      referenceDescription: 'Flat panel: cos θ_i = sin(El) = 0.500, θ_i = 60.0°, POA = 1361 W/m² × 0.5 ≈ 681 W/m²',
      expectedValue: 'cos=0.500 · θ=60.0° · 681 W/m²',
      actualValue: `cos=${flat30.cosineProjectionFactor.toFixed(3)} · θ=${flat30.panelIncidenceAngleDeg.toFixed(1)}° · ${flat30.planeOfArrayIrradianceWm2} W/m²`,
      absoluteError: Number(cosErr.toFixed(4)),
      tolerance: 0.002,
      unit: 'mixed',
      passed: cosErr <= 0.002,
    });
  }

  // 10. COMMUNICATION CONSTRAINTS
  {
    // Test 10A: Free-Space Path Loss (FSPL) at Mean Lunar Distance (384,400 km) and Ka-Band (32.0 GHz)
    // Theoretical: 20*log10(384400) + 20*log10(32.0) + 92.45 = 111.6957 + 30.1030 + 92.45 = 234.2487 dB
    const expectedFsplDb = 234.2;
    const link = computeEarthCommLinkBudget(
      10.0,
      0.0,
      0.0,
      384400,
      0,
      DEFAULT_COMM_HARDWARE
    );
    const fsplErr = Math.abs(link.freeSpacePathLossDb - expectedFsplDb);
    results.push({
      id: 'COMM-01',
      category: '10. Communication Constraints',
      title: 'Ka-Band (32 GHz) Free-Space Path Loss at 384,400 km',
      referenceDescription: 'FSPL = 20·log10(384400) + 20·log10(32.0) + 92.45 = 234.25 dB',
      expectedValue: '234.2 dB',
      actualValue: `${link.freeSpacePathLossDb.toFixed(1)} dB (Gain: ${link.landerAntennaGainDbi} dBi)`,
      absoluteError: Number(fsplErr.toFixed(2)),
      tolerance: 0.2,
      unit: 'dB',
      passed: fsplErr <= 0.2 && link.isDteOperational === true,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    results,
    passedCount,
    totalCount: results.length,
    allPassed: passedCount === results.length,
  };
}
