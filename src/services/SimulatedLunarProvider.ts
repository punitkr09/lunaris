import {
  CommHardwareConfig,
  CommLinkStatus,
  DataProviderMetadata,
  DatasetSourceManifest,
  EarthTelemetry,
  HorizonAzimuthSample,
  IlluminationStatus,
  LandingSitePreset,
  LunarCoordinates,
  MissionScenarioData,
  MissionSummaryMetrics,
  OperationalWindowState,
  ScenarioRequestParams,
  ScoreComponentBreakdown,
  SolarHardwareConfig,
  SunTelemetry,
  TimelinePoint,
  TimelineTransitionEvent,
} from '../types/navigation';
import { ILunarNavigationProvider } from './LunarDataProvider';
import {
  DEFAULT_COMM_HARDWARE,
  DEFAULT_SOLAR_HARDWARE,
  DEG_TO_RAD,
  SPEED_OF_LIGHT_KMS,
  computeAnalyticalSelenographicEphemeris,
  computeEarthCommLinkBudget,
  computeLunarLocalSolarHour,
  computeLunarSurfaceDistanceKm,
  computeSolarArrayPerformance,
  computeTopocentricHorizontal,
  utcMsToJulianDate,
} from '../science/lunarMath';

/** Azimuth spacing of the synthetic 360° horizon profile (72 samples). */
export const HORIZON_AZIMUTH_STEP_DEG = 5;

/**
 * Great-circle radius (km) within which a coordinate is considered to be "at" a catalogued
 * preset site. ~4 km ≈ 0.13° of latitude; chosen so a click on the 3D globe snaps to the
 * intended reticle without colliding with neighbouring polar sites (all > 15 km apart).
 */
export const PRESET_MATCH_RADIUS_KM = 4.0;

/** Fallback epoch when a caller supplies an unparseable ISO timestamp. */
export const FALLBACK_EPOCH_MS = Date.UTC(2026, 10, 15, 12, 0, 0);

/** Solar disc fraction above which a timeline sample counts as "illuminated". */
export const ILLUMINATION_DISC_THRESHOLD = 0.05;

const DATASET_MANIFESTS: DatasetSourceManifest[] = [
  {
    id: 'nasa-svs-4720-lroc-lola-4k',
    sourceName: 'NASA CGI Moon Kit (LRO LROC WAC Hapke Mosaic + LRO LOLA 16 px/deg DEM)',
    agency: 'NASA GSFC Scientific Visualization Studio (SVS #4720) / LRO Science Team',
    datasetVersion: 'SVS-4720 (lroc_color_poles_4k + ldem_16_uint)',
    retrievalDateUtc: '2026-11-14T16:25:00Z',
    coordinateReferenceSystem: 'MOON_ME Cylindrical Equirectangular (Centered on 0° Lon, R_ref = 1737.4 km)',
    timeReferenceSystem: 'Static LRO Mission Composite',
    units: 'sRGB Reflectance (643/566/415 nm + LDAM Polar Fill), Half-Meters above 1727.4 km datum',
    processingMethod:
      '4096×2048 equirectangular LROC color/albedo map, 16-bit LOLA DEM resampled to 4K displacement, latitude-corrected tangent-space normal map, and LOLA hypsometric hillshade.',
    classification: 'REAL_DATA',
    dataQualityInfo: 'Global 3D surface imagery & elevation derived directly from NASA LRO LROC + LOLA archives.',
    uncertaintyEstimate: '±0.0625° grid spacing (16 px/deg), ±0.5 m vertical quantization',
    statusNote: 'ACTIVE IN 3D GLOBE — Served from /public/textures/*_4k.jpg.',
  },
  {
    id: 'iau-lunar-ephemeris-analytical',
    sourceName: 'Analytical Lunar Orientation & Delaunay Ephemeris Engine',
    agency: 'IAU / Meeus Analytical Reference',
    datasetVersion: 'J2000-Analytical-v2.1',
    retrievalDateUtc: '2026-11-10T00:00:00Z',
    coordinateReferenceSystem: 'MOON_ME (Mean Earth / Polar Axis Selenographic)',
    timeReferenceSystem: 'UTC / Julian Date (JD)',
    units: 'Degrees (deg), Kilometers (km), Watts/m²',
    processingMethod:
      'Spherical trigonometric transformation of Delaunay arguments (D, M, M\', F) and optical libration to topocentric horizontal coordinates.',
    classification: 'REAL_DATA',
    dataQualityInfo: 'Analytical precision: ±0.15° Sun/Earth position, ±0.2° libration.',
    uncertaintyEstimate: '±0.15° angular position',
    statusNote: 'ACTIVE IN ENGINE — Validated against reference orbital mechanics.',
  },
  {
    id: 'nasa-artemis-site-catalog',
    sourceName: 'NASA Artemis III Candidate Landing Regions & IAU Gazetteer',
    agency: 'NASA / USGS Astrogeology Science Center',
    datasetVersion: 'Artemis-III-13-Regions-Rev2',
    retrievalDateUtc: '2026-11-10T00:00:00Z',
    coordinateReferenceSystem: 'MOON_ME (Selenographic Lat/Lon, R_ref = 1737.4 km)',
    timeReferenceSystem: 'Static Epoch J2000',
    units: 'Decimal Degrees, Meters above 1737.4 km sphere',
    processingMethod:
      'Published centroid coordinates and reference elevations from NASA Artemis III site selection briefs and LRO LOLA altimetry summaries.',
    classification: 'REAL_DATA',
    dataQualityInfo: 'Published reference coordinates and regional mean elevations.',
    uncertaintyEstimate: '±50 m regional centroid',
    statusNote: 'ACTIVE IN ENGINE — 11 real reference sites + 1 illustrative test site.',
  },
  {
    id: 'synthetic-horizon-mask-generator',
    sourceName: 'Parametric Topographic Horizon Mask & Local Relief Proxy',
    agency: 'LUNARIS Internal Simulation Model',
    datasetVersion: 'SYNTH-HORIZON-v2.0',
    retrievalDateUtc: '2026-11-10T00:00:00Z',
    coordinateReferenceSystem: 'Local Topocentric Horizontal (Azimuth 0–360° CW from North)',
    timeReferenceSystem: 'Time-Invariant Local Topography',
    units: 'Elevation Angle (deg)',
    processingMethod:
      'Multi-harmonic procedural ridge synthesis parameterized by site latitude, longitude, and reference altitude.',
    classification: 'SYNTHETIC_DATA',
    dataQualityInfo:
      'Synthetic approximation for UI & trade-study prototyping. Not derived from ray-tracing full-resolution LOLA PDS4 DEM tiles.',
    uncertaintyEstimate: '±1.5° local ridge elevation vs. actual LOLA 5m DEM (72 azimuth bins at 5° spacing)',
    statusNote: 'SYNTHETIC MODEL ACTIVE — Clearly badged across all horizon charts.',
  },
  {
    id: 'nasa-lola-pds4-dem',
    sourceName: 'LRO Lunar Orbiter Laser Altimeter (LOLA) Polar DEM (LDEM_80S_5M)',
    agency: 'NASA GSFC / PDS Geosciences Node',
    datasetVersion: 'PDS4-LOLA-GDR-v1.04 (5m/px & 20m/px)',
    retrievalDateUtc: 'PENDING_OFFLINE_MOUNT',
    coordinateReferenceSystem: 'Polar Stereographic / MOON_ME (1737.4 km sphere)',
    timeReferenceSystem: 'J2000',
    units: 'Meters (0.5m vertical DN scale)',
    processingMethod:
      'Direct GPU/CPU ray-marching over GeoTIFF heightfields to extract exact 360° horizon masks.',
    classification: 'UNAVAILABLE_DATA',
    dataQualityInfo: 'Requires ~1.8 GB local GeoTIFF tile mount or tile server backend.',
    uncertaintyEstimate: '±1.0 m horizontal, ±0.1 m vertical',
    statusNote: 'UNAVAILABLE IN BROWSER BUNDLE — Integration hook ready in ILunarNavigationProvider.',
  },
  {
    id: 'nasa-jpl-horizons-spice',
    sourceName: 'NASA JPL Horizons API & NAIF SPICE Kernels (de440.bsp, moon_pa_de440)',
    agency: 'NASA JPL Navigation and Ancillary Information Facility (NAIF)',
    datasetVersion: 'DE440 / MOON_PA_DE440_200625',
    retrievalDateUtc: 'ON_DEMAND_API',
    coordinateReferenceSystem: 'ICRF / MOON_PA / MOON_ME',
    timeReferenceSystem: 'TDB / UTC',
    units: 'Kilometers, Degrees, Seconds',
    processingMethod:
      'Chebyshev polynomial interpolation of JPL Development Ephemeris DE440.',
    classification: 'UNAVAILABLE_DATA',
    dataQualityInfo: 'Sub-meter state vector precision; requires backend proxy or WASM CSPICE.',
    uncertaintyEstimate: '< 0.001° angular accuracy',
    statusNote: 'ADAPTER READY — Live REST query builder available in Data Pipeline view.',
  },
];

const CANDIDATE_SITES: LandingSitePreset[] = [
  {
    id: 'shackleton-ridge',
    code: 'ART-SP-01',
    name: 'Shackleton Connecting Ridge',
    region: 'South Pole // Shackleton – de Gerlache Ridge',
    category: 'ARTEMIS_III_CANDIDATE',
    coordinates: { latitudeDeg: -89.46, longitudeDeg: -137.8 },
    elevationMeters: 2140,
    meanSlopeDeg: 6.4,
    psrDistanceKm: 1.2,
    terrainRoughnessLabel: 'MODERATE',
    description:
      'High-altitude topographic ridge linking Shackleton and de Gerlache craters within 0.6° of the Lunar South Pole. Exhibits prolonged grazing solar illumination and immediate proximity to cold-trap volatiles.',
    elevationExplanation:
      '+2,140 m above the 1,737.4 km mean lunar radius (LOLA regional reference), elevating solar masts above adjacent basin walls.',
    slopeExplanation:
      '6.4° mean slope over 100 m baseline; within the <10° Artemis Human Landing System (HLS) touchdown threshold.',
    dataSourceAttribution: 'NASA Artemis III Candidate Region Brief + LOLA Regional Altimetry (Real Coords, Synthetic Horizon Profile)',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    artemisCandidateRank: 1,
    tags: ['PEAK ILLUMINATION', 'NEAR PSR', 'SOUTH POLE'],
  },
  {
    id: 'malapert-massif',
    code: 'ART-SP-02',
    name: 'Malapert Massif Summit Plateau',
    region: 'South Pole // Malapert Mountain Complex',
    category: 'ARTEMIS_III_CANDIDATE',
    coordinates: { latitudeDeg: -85.98, longitudeDeg: 0.45 },
    elevationMeters: 4680,
    meanSlopeDeg: 5.1,
    psrDistanceKm: 4.8,
    terrainRoughnessLabel: 'LOW',
    description:
      'Prominent nearside massif aligned along the 0° prime meridian. Commands uninterrupted Direct-to-Earth (DTE) line-of-sight and high elevation above surrounding craters.',
    elevationExplanation:
      '+4,680 m above mean sphere, providing commanding line-of-sight clearance toward Earth along the 0° meridian.',
    slopeExplanation:
      '5.1° summit plateau slope; benign landing zone with low boulder abundance on the upper ridge.',
    dataSourceAttribution: 'NASA Artemis III Candidate Region Brief / LOLA Altimetry Reference',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    artemisCandidateRank: 2,
    tags: ['OPTIMAL DTE COMM', 'HIGH ELEVATION', 'LOW SLOPE'],
  },
  {
    id: 'de-gerlache-rim-2',
    code: 'ART-SP-03',
    name: 'de Gerlache Rim 2',
    region: 'South Pole // de Gerlache Western Rim',
    category: 'ARTEMIS_III_CANDIDATE',
    coordinates: { latitudeDeg: -88.42, longitudeDeg: -68.7 },
    elevationMeters: 1890,
    meanSlopeDeg: 7.2,
    psrDistanceKm: 0.9,
    terrainRoughnessLabel: 'MODERATE',
    description:
      'Elevated crater rim terrace overlooking the de Gerlache permanently shadowed cold trap. Balances multi-week summer illumination with short rover traverses to volatile deposits.',
    elevationExplanation:
      '+1,890 m rim crest altitude above the 1,737.4 km datum, ~3.5 km higher than the adjacent crater floor.',
    slopeExplanation:
      '7.2° mean terrace slope; requires precision hazard detection avoidance near the inner crater scarp.',
    dataSourceAttribution: 'NASA Artemis III Candidate Region Brief',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    artemisCandidateRank: 3,
    tags: ['COLD TRAP ACCESS', 'HIGH SOLAR DUTY', 'CRATER RIM'],
  },
  {
    id: 'leibnitz-beta',
    code: 'ART-SP-04',
    name: 'Mons Mouton (Leibnitz Beta Plateau)',
    region: 'South Pole // Mons Mouton Massif',
    category: 'ARTEMIS_III_CANDIDATE',
    coordinates: { latitudeDeg: -85.4, longitudeDeg: 31.8 },
    elevationMeters: 5210,
    meanSlopeDeg: 3.8,
    psrDistanceKm: 6.4,
    terrainRoughnessLabel: 'LOW',
    description:
      'Broad, flat-topped mesa towering ~6 km above adjacent terrain (former VIPER rover target sector). Provides benign landing slopes (<4°) and high Earth elevation windows.',
    elevationExplanation:
      '+5,210 m summit mesa elevation, minimizing horizon obstruction in all azimuths.',
    slopeExplanation:
      '3.8° broad plateau slope; among the flattest high-altitude surfaces in the south polar highlands.',
    dataSourceAttribution: 'NASA VIPER & Artemis III Site Selection Reference (Mons Mouton)',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    artemisCandidateRank: 4,
    tags: ['FLAT MESA', 'VIPER SECTOR', 'HIGH COMM MARGIN'],
  },
  {
    id: 'nobile-rim-1',
    code: 'ART-SP-05',
    name: 'Nobile Rim 1',
    region: 'South Pole // Nobile Crater Northern Rim',
    category: 'ARTEMIS_III_CANDIDATE',
    coordinates: { latitudeDeg: -85.28, longitudeDeg: 53.9 },
    elevationMeters: 1620,
    meanSlopeDeg: 6.1,
    psrDistanceKm: 2.3,
    terrainRoughnessLabel: 'MODERATE',
    description:
      'Ancient impact basin rim featuring subdued regolith slopes and periodic high-elevation Earth libration windows.',
    elevationExplanation: '+1,620 m relative to 1,737.4 km mean radius.',
    slopeExplanation: '6.1° degraded Nectarian rim slope.',
    dataSourceAttribution: 'NASA Artemis III Candidate Region Brief',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    artemisCandidateRank: 5,
    tags: ['ICE PROSPECTING', 'MODERATE RELIEF', 'EASTERN SECTOR'],
  },
  {
    id: 'haworth-rim',
    code: 'ART-SP-06',
    name: 'Haworth Crater Southern Bench',
    region: 'South Pole // Haworth – Shoemaker Zone',
    category: 'ARTEMIS_III_CANDIDATE',
    coordinates: { latitudeDeg: -87.45, longitudeDeg: -4.2 },
    elevationMeters: 1120,
    meanSlopeDeg: 8.5,
    psrDistanceKm: 0.6,
    terrainRoughnessLabel: 'ELEVATED',
    description:
      'Tactical site adjacent to one of the coldest doubly-shadowed PSRs (<40 K). Subject to pronounced horizon masking by Malapert and Haworth walls.',
    elevationExplanation: '+1,120 m bench altitude; partially shadowed by higher northern massifs.',
    slopeExplanation: '8.5° rugged bench slope requiring LiDAR hazard avoidance.',
    dataSourceAttribution: 'NASA Artemis III Candidate Region Brief',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    artemisCandidateRank: 6,
    tags: ['DOUBLY SHADOWED PSR', 'TERRAIN MASKED', 'HIGH SCIENCE'],
  },
  {
    id: 'faustini-rim-a',
    code: 'ART-SP-07',
    name: 'Faustini Rim A',
    region: 'South Pole // Faustini – Shoemaker Ridge',
    category: 'ARTEMIS_III_CANDIDATE',
    coordinates: { latitudeDeg: -87.85, longitudeDeg: 78.4 },
    elevationMeters: 1450,
    meanSlopeDeg: 6.9,
    psrDistanceKm: 1.5,
    terrainRoughnessLabel: 'MODERATE',
    description:
      'Eastern polar highland ridge on the limb transition zone. Experiences pronounced optical libration swings affecting Direct-to-Earth link continuity.',
    elevationExplanation: '+1,450 m eastern polar ridge elevation.',
    slopeExplanation: '6.9° moderate highland slope.',
    dataSourceAttribution: 'NASA Artemis III Candidate Region Brief',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    artemisCandidateRank: 7,
    tags: ['LIMB LIBRATION', 'RELAY RECOMMENDED', 'VOLATILE TARGET'],
  },
  {
    id: 'apollo-11-tranquillitatis',
    code: 'HIST-AP11',
    name: 'Statio Tranquillitatis (Apollo 11)',
    region: 'Equatorial Nearside // Mare Tranquillitatis',
    category: 'HISTORIC_LANDING',
    coordinates: { latitudeDeg: 0.674, longitudeDeg: 23.473 },
    elevationMeters: -1890,
    meanSlopeDeg: 1.4,
    psrDistanceKm: null,
    terrainRoughnessLabel: 'LOW',
    description:
      'Historic first human lunar landing site (July 20, 1969). Located on flat basaltic mare plains with high overhead Earth elevation (~66°) and classic 14.7-day lunar day / 14.7-day night cycle.',
    elevationExplanation: '-1,890 m below mean lunar radius inside the Tranquillitatis mare basin.',
    slopeExplanation: '1.4° smooth basaltic mare plain.',
    dataSourceAttribution: 'NASA LROCNAC Verified Lander Coordinates (Real Reference)',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    tags: ['APOLLO 11', 'EQUATORIAL MARE', 'CONTINUOUS DTE'],
  },
  {
    id: 'change-4-von-karman',
    code: 'HIST-CE4',
    name: 'Statio Tianhe // Von Kármán Crater (Chang’e-4)',
    region: 'Southern Far Side // South Pole-Aitken Basin',
    category: 'FARSIDE_BASIN',
    coordinates: { latitudeDeg: -45.444, longitudeDeg: 177.599 },
    elevationMeters: -5920,
    meanSlopeDeg: 2.3,
    psrDistanceKm: null,
    terrainRoughnessLabel: 'LOW',
    description:
      'First spacecraft landing on the Lunar Far Side inside the immense South Pole-Aitken (SPA) basin. Earth is permanently below the geometric horizon (-45°), requiring a halo-orbit relay satellite (Queqiao / Lunanet).',
    elevationExplanation:
      '-5,920 m deep within the floor of Von Kármán crater inside the South Pole-Aitken basin.',
    slopeExplanation: '2.3° mare-flooded crater floor.',
    dataSourceAttribution: 'CNSA / NASA LROC Verified Far-Side Landing Site',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    tags: ['LUNAR FAR SIDE', 'ZERO DTE (RELAY ONLY)', 'SPA BASIN'],
  },
  {
    id: 'tycho-central-peak',
    code: 'GLB-TYCHO',
    name: 'Tycho Crater Northern Rim Terrace',
    region: 'Southern Nearside Highlands',
    category: 'GLOBAL_LANDMARK',
    coordinates: { latitudeDeg: -43.31, longitudeDeg: -11.36 },
    elevationMeters: 1240,
    meanSlopeDeg: 9.8,
    psrDistanceKm: null,
    terrainRoughnessLabel: 'ELEVATED',
    description:
      'Prominent Copernican impact crater (~108 Ma) with extensive bright ray system across the southern nearside.',
    elevationExplanation: '+1,240 m terraced crater rim wall.',
    slopeExplanation: '9.8° steep Copernican impact terrace.',
    dataSourceAttribution: 'IAU Planetary Nomenclature Gazetteer / LRO LOLA',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    tags: ['COPERNICAN RAY CRATER', 'SOUTHERN HIGHLANDS'],
  },
  {
    id: 'peary-north-pole',
    code: 'GLB-NP-01',
    name: 'Peary Crater Rim (North Pole Peak of Eternal Light)',
    region: 'Lunar North Pole (88.6°N)',
    category: 'GLOBAL_LANDMARK',
    coordinates: { latitudeDeg: 88.63, longitudeDeg: 33.0 },
    elevationMeters: 1780,
    meanSlopeDeg: 5.8,
    psrDistanceKm: 1.8,
    terrainRoughnessLabel: 'MODERATE',
    description:
      'Northern polar counterpart to Shackleton Ridge, situated on the rim of Peary crater near 89°N. Exhibits high northern-summer illumination duty cycles.',
    elevationExplanation: '+1,780 m north polar crater rim elevation.',
    slopeExplanation: '5.8° rim crest slope.',
    dataSourceAttribution: 'IAU / NASA LRO North Polar Reference',
    locationAuthenticity: 'REAL_NASA_REFERENCE',
    horizonDataClassification: 'SYNTHETIC_DATA',
    tags: ['NORTH POLE', 'POLAR COMPARISON', 'HIGH ILLUMINATION'],
  },
  {
    id: 'synth-coldtrap-test',
    code: 'SYNTH-TEST-09',
    name: 'Synthetic Deep Cold-Trap Benchmark Floor',
    region: 'South Pole // Illustrative Shadowed Depression',
    category: 'ARTEMIS_III_CANDIDATE',
    coordinates: { latitudeDeg: -89.15, longitudeDeg: 118.0 },
    elevationMeters: -2450,
    meanSlopeDeg: 11.2,
    psrDistanceKm: 0.0,
    terrainRoughnessLabel: 'EXTREME',
    description:
      'Illustrative synthetic test location inside a deep polar depression used to stress-test eclipse battery draw, high horizon masks (+6°), and relay-only communication.',
    elevationExplanation: '-2,450 m synthetic basin floor depression.',
    slopeExplanation: '11.2° steep inner wall slope (exceeds nominal 10° lander limit).',
    dataSourceAttribution: 'LUNARIS Illustrative Synthetic Stress-Test Coordinate',
    locationAuthenticity: 'ILLUSTRATIVE_SYNTHETIC',
    horizonDataClassification: 'SYNTHETIC_DATA',
    tags: ['ILLUSTRATIVE SYNTHETIC', 'STRESS TEST', 'HIGH OBSTRUCTION'],
  },
];

const SIMULATED_METADATA: DataProviderMetadata = {
  providerId: 'lunaris-hybrid-ephemeris-v2',
  providerName: 'LUNARIS Analytical Ephemeris + Synthetic Horizon Engine',
  version: '2.0.0',
  mode: 'SIMULATED_MODEL',
  isSimulated: true,
  disclaimer:
    'SCIENTIFIC TRANSPARENCY NOTICE — Selenographic coordinate transformations, Julian Date / LTST timekeeping, topocentric Sun/Earth positions, panel incidence math, and RF Free-Space Path Loss use validated analytical equations (REAL_DATA). Local 360° terrain horizon masks use a parametric synthetic ridge model (SYNTHETIC_DATA) pending full-resolution LRO LOLA DEM tile mounting.',
  referenceFrame: 'MOON_ME (Mean Earth / Polar Axis Selenographic Frame)',
  terrainSourceLabel: 'Parametric Synthetic Horizon Mask (SYNTHETIC_DATA — LOLA Proxy)',
  ephemerisSourceLabel: 'IAU / Meeus Analytical Selenographic Ephemeris (REAL_DATA)',
  datasets: DATASET_MANIFESTS,
};

interface CachedTimelineBundle {
  matchedPreset: LandingSitePreset | null;
  horizonProfile: HorizonAzimuthSample[];
  timeline: TimelinePoint[];
  transitionEvents: TimelineTransitionEvent[];
  summary: MissionSummaryMetrics;
  epochMs: number;
  totalMissionHours: number;
}

export class SimulatedLunarProvider implements ILunarNavigationProvider {
  private timelineCache = new Map<string, CachedTimelineBundle>();

  public getMetadata(): DataProviderMetadata {
    return SIMULATED_METADATA;
  }

  public getCandidateLandingSites(): LandingSitePreset[] {
    return CANDIDATE_SITES;
  }

  /**
   * Returns the catalogued preset nearest to `coords` if it lies within
   * PRESET_MATCH_RADIUS_KM along the great circle. A metric radius (rather than a
   * lat/lon box) is required because degrees of longitude shrink to metres at 89°S.
   */
  public findMatchingPreset(coords: LunarCoordinates): LandingSitePreset | null {
    let best: LandingSitePreset | null = null;
    let bestKm = Number.POSITIVE_INFINITY;
    for (const site of CANDIDATE_SITES) {
      const km = computeLunarSurfaceDistanceKm(site.coordinates, coords);
      if (km <= PRESET_MATCH_RADIUS_KM && km < bestKm) {
        best = site;
        bestKm = km;
      }
    }
    return best;
  }

  /**
   * Generates a deterministic 360-degree local topographic horizon mask profile
   * parameterized by the site's latitude, longitude, and matched terrain elevation.
   */
  public generateHorizonProfile(
    coords: LunarCoordinates,
    preset: LandingSitePreset | null
  ): HorizonAzimuthSample[] {
    const lat = coords.latitudeDeg;
    const lon = coords.longitudeDeg;
    const elev = preset ? preset.elevationMeters : this.estimateElevation(coords);

    // Flat mare sites have low horizon obstruction (~0.3° to 1.2°); deep polar craters have high masks
    const isMareOrEquatorial = Math.abs(lat) < 60 && elev < 0;
    const baseObstruction = isMareOrEquatorial
      ? 0.55
      : Math.max(-1.6, 2.2 - (elev / 2200) * 1.5);

    const seed1 = Math.abs(lat * 13.7 + lon * 0.71) % 6.28;
    const seed2 = Math.abs(lat * 5.3 - lon * 1.13) % 6.28;
    const ampScale = isMareOrEquatorial ? 0.35 : 1.0;

    const samples: HorizonAzimuthSample[] = [];
    for (let az = 0; az < 360; az += HORIZON_AZIMUTH_STEP_DEG) {
      const azRad = az * DEG_TO_RAD;
      const ridge1 = 1.65 * ampScale * Math.sin(azRad * 2 + seed1);
      const ridge2 = 1.15 * ampScale * Math.cos(azRad * 3 - seed2);
      const peakSpike = 0.85 * ampScale * Math.sin(azRad * 5 + seed1 * 1.7);
      const rawMask = baseObstruction + ridge1 + ridge2 + peakSpike;
      const clampedMask = Number(Math.max(-2.0, Math.min(8.8, rawMask)).toFixed(2));
      samples.push({
        azimuthDeg: az,
        horizonElevationDeg: clampedMask,
      });
    }
    return samples;
  }

  /**
   * Linearly interpolates the horizon mask at an arbitrary azimuth. The step is derived
   * from the profile length so any uniformly-sampled profile (not only 5°) works, and the
   * last bin wraps back to azimuth 0° so 359.9° interpolates between 355° and 0°.
   */
  public sampleHorizonMaskDeg(profile: HorizonAzimuthSample[], azimuthDeg: number): number {
    if (profile.length === 0) return 0;
    const step = 360 / profile.length;
    const normAz = ((azimuthDeg % 360) + 360) % 360;
    const index = Math.floor(normAz / step) % profile.length;
    const nextIndex = (index + 1) % profile.length;
    const frac = (normAz - index * step) / step;
    const v0 = profile[index].horizonElevationDeg;
    const v1 = profile[nextIndex].horizonElevationDeg;
    return Number((v0 + (v1 - v0) * frac).toFixed(2));
  }

  private estimateElevation(coords: LunarCoordinates): number {
    // South Pole-Aitken basin on far side (-70° to -20° lat, 140° to -140° lon) is deep (-5000m)
    const isFarSide = Math.abs(coords.longitudeDeg) > 110;
    if (isFarSide && coords.latitudeDeg < -15 && coords.latitudeDeg > -75) {
      return Math.round(-4200 + 1200 * Math.sin(coords.latitudeDeg * 0.1));
    }
    const latFactor = Math.cos((coords.latitudeDeg + 88) * 0.45);
    const lonFactor = Math.cos(coords.longitudeDeg * DEG_TO_RAD * 2);
    return Math.round(950 + 1600 * latFactor * lonFactor);
  }

  private estimateSlope(coords: LunarCoordinates, preset: LandingSitePreset | null): number {
    if (preset) return preset.meanSlopeDeg;
    const pseudo = Math.abs(Math.sin(coords.latitudeDeg * 12.3 + coords.longitudeDeg * 3.7));
    return Number((3.2 + pseudo * 6.8).toFixed(1));
  }

  private computeInstantaneousState(
    coords: LunarCoordinates,
    epochMs: number,
    hourOffset: number,
    horizonProfile: HorizonAzimuthSample[],
    solarHardware: SolarHardwareConfig,
    commHardware: CommHardwareConfig
  ): {
    sun: SunTelemetry;
    earth: EarthTelemetry;
    lunarLocalHour: number;
    julianDate: number;
    currentIsoUtc: string;
  } {
    const currentMs = epochMs + hourOffset * 3600 * 1000;
    const currentIsoUtc = new Date(currentMs).toISOString().slice(0, 19) + 'Z';
    const jd = utcMsToJulianDate(currentMs);

    const eph = computeAnalyticalSelenographicEphemeris(jd);

    // 1. Topocentric Sun
    const sunTopo = computeTopocentricHorizontal(
      coords,
      eph.subSolarLatitudeDeg,
      eph.subSolarLongitudeDeg
    );
    const sunHorizonMaskDeg = this.sampleHorizonMaskDeg(
      horizonProfile,
      sunTopo.azimuthDeg
    );
    const sunClearanceDeg = Number(
      (sunTopo.elevationDeg - sunHorizonMaskDeg).toFixed(2)
    );
    const lunarLocalHour = computeLunarLocalSolarHour(
      coords.longitudeDeg,
      eph.subSolarLongitudeDeg
    );

    const solarPerf = computeSolarArrayPerformance(
      sunTopo.elevationDeg,
      sunTopo.azimuthDeg,
      sunHorizonMaskDeg,
      solarHardware
    );

    let sunStatus: IlluminationStatus = 'ILLUMINATED';
    if (solarPerf.visibleDiscFraction >= 0.99) {
      sunStatus = 'ILLUMINATED';
    } else if (solarPerf.visibleDiscFraction > 0.0) {
      sunStatus = 'GRAZING_PENUMBRA';
    } else {
      sunStatus = 'TOPOGRAPHIC_SHADOW';
    }

    // 2. Topocentric Earth
    const earthTopo = computeTopocentricHorizontal(
      coords,
      eph.subEarthLatitudeDeg,
      eph.subEarthLongitudeDeg
    );
    const earthHorizonMaskDeg = this.sampleHorizonMaskDeg(
      horizonProfile,
      earthTopo.azimuthDeg
    );

    const commBudget = computeEarthCommLinkBudget(
      earthTopo.elevationDeg,
      earthTopo.azimuthDeg,
      earthHorizonMaskDeg,
      eph.earthMoonDistanceKm,
      hourOffset,
      commHardware
    );

    let commStatus: CommLinkStatus = 'NOMINAL_DTE';
    if (commBudget.isDteOperational) {
      commStatus = 'NOMINAL_DTE';
    } else if (commBudget.isRelayOperational) {
      commStatus = 'RELAY_SATELLITE_ACTIVE';
    } else if (
      commBudget.isGeometricallyVisible &&
      !commBudget.isTerrainObstructed &&
      !commBudget.meetsMinimumElevationConstraint
    ) {
      commStatus = 'LOW_ELEVATION_CONSTRAINT';
    } else {
      commStatus = 'OCCULTED_BLACKOUT';
    }

    // Active DSN station rotates with Earth UTC hour
    const utcHour = new Date(currentMs).getUTCHours();
    const dsnStations: EarthTelemetry['activeDsnStation'][] = [
      'DSN-MADRID (MDS)',
      'DSN-GOLDSTONE (GDS)',
      'DSN-CANBERRA (CDS)',
    ];
    const activeDsnStation = dsnStations[Math.floor(utcHour / 8) % 3];
    const oneWayLightTimeSec = Number(
      (eph.earthMoonDistanceKm / SPEED_OF_LIGHT_KMS).toFixed(3)
    );

    const sun: SunTelemetry = {
      elevationDeg: Number(sunTopo.elevationDeg.toFixed(2)),
      azimuthDeg: Number(sunTopo.azimuthDeg.toFixed(1)),
      localHorizonMaskDeg: sunHorizonMaskDeg,
      horizonClearanceDeg: sunClearanceDeg,
      visibleSolarDiscFraction: solarPerf.visibleDiscFraction,
      subSolarLongitudeDeg: Number(eph.subSolarLongitudeDeg.toFixed(2)),
      subSolarLatitudeDeg: Number(eph.subSolarLatitudeDeg.toFixed(2)),
      effectivePanelAzimuthDeg: solarPerf.effectivePanelAzimuthDeg,
      effectivePanelTiltDeg: solarPerf.effectivePanelTiltDeg,
      panelIncidenceAngleDeg: solarPerf.panelIncidenceAngleDeg,
      cosineProjectionFactor: solarPerf.cosineProjectionFactor,
      directNormalIrradianceWm2: solarPerf.directNormalIrradianceWm2,
      planeOfArrayIrradianceWm2: solarPerf.planeOfArrayIrradianceWm2,
      solarIrradianceWm2: solarPerf.planeOfArrayIrradianceWm2,
      estimatedElectricalPowerWatts: solarPerf.estimatedElectricalPowerWatts,
      powerUncertaintyWatts: solarPerf.powerUncertaintyWatts,
      status: sunStatus,
      hoursToNextTransition: 48,
      transitionWithinWindow: false,
      nextTransitionType:
        solarPerf.visibleDiscFraction > 0 ? 'SUNSET_OCCULTATION' : 'SUNRISE_EMERGENCE',
      directionVector3D: sunTopo.directionVectorENU,
    };

    const earth: EarthTelemetry = {
      elevationDeg: Number(earthTopo.elevationDeg.toFixed(2)),
      azimuthDeg: Number(earthTopo.azimuthDeg.toFixed(1)),
      isGeometricallyVisible: commBudget.isGeometricallyVisible,
      localHorizonMaskDeg: earthHorizonMaskDeg,
      isTerrainObstructed: commBudget.isTerrainObstructed,
      horizonClearanceDeg: commBudget.horizonClearanceDeg,
      meetsMinimumElevationConstraint: commBudget.meetsMinimumElevationConstraint,
      isDteOperational: commBudget.isDteOperational,
      isRelayOperational: commBudget.isRelayOperational,
      antennaPointingAzDeg: Number(earthTopo.azimuthDeg.toFixed(1)),
      antennaPointingElDeg: Number(Math.max(0, earthTopo.elevationDeg).toFixed(1)),
      landerAntennaGainDbi: commBudget.landerAntennaGainDbi,
      freeSpacePathLossDb: commBudget.freeSpacePathLossDb,
      distanceKm: eph.earthMoonDistanceKm,
      librationLongitudeDeg: Number(eph.subEarthLongitudeDeg.toFixed(2)),
      librationLatitudeDeg: Number(eph.subEarthLatitudeDeg.toFixed(2)),
      commStatus,
      activeDsnStation,
      estimatedLinkMarginDb: commBudget.estimatedLinkMarginDb,
      estimatedDataRateMbps: commBudget.estimatedDataRateMbps,
      oneWayLightTimeSec,
      hoursToNextTransition: 48,
      transitionWithinWindow: false,
      nextTransitionType: commBudget.isDteOperational
        ? 'EARTHSET_OCCULTATION'
        : 'EARTHRISE_EMERGENCE',
      directionVector3D: earthTopo.directionVectorENU,
    };

    return {
      sun,
      earth,
      lunarLocalHour: Number(lunarLocalHour.toFixed(2)),
      julianDate: Number(jd.toFixed(5)),
      currentIsoUtc,
    };
  }

  private getOrComputeTimelineBundle(
    coordinates: LunarCoordinates,
    epochIsoUtc: string,
    missionDurationDays: number,
    solarHardware: SolarHardwareConfig,
    commHardware: CommHardwareConfig
  ): CachedTimelineBundle {
    const cacheKey = JSON.stringify({
      lat: Number(coordinates.latitudeDeg.toFixed(4)),
      lon: Number(coordinates.longitudeDeg.toFixed(4)),
      epochIsoUtc,
      missionDurationDays,
      solarHardware,
      commHardware,
    });

    const cached = this.timelineCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const matchedPreset = this.findMatchingPreset(coordinates);
    const horizonProfile = this.generateHorizonProfile(coordinates, matchedPreset);

    const parsedEpoch = Date.parse(epochIsoUtc);
    const epochMs = Number.isNaN(parsedEpoch) ? FALLBACK_EPOCH_MS : parsedEpoch;
    const totalMissionHours = Math.max(24, Math.round(missionDurationDays * 24));

    const stepHours = totalMissionHours <= 168 ? 2 : 3;
    const timeline: TimelinePoint[] = [];
    const transitionEvents: TimelineTransitionEvent[] = [];

    let illuminatedCount = 0;
    let dteCount = 0;
    let effectiveCommCount = 0;
    let simultaneousCount = 0;
    let nominalOpsSampleCount = 0;
    let solarOnlySampleCount = 0;
    let eclipseDteSampleCount = 0;
    let criticalBlackoutSampleCount = 0;
    let sunriseCount = 0;
    let sunsetCount = 0;
    let earthriseCount = 0;
    let earthsetCount = 0;
    let currentDarknessRunHours = 0;
    let maxDarknessHours = 0;
    let sumSunEl = 0;
    let sumPowerWatts = 0;
    let peakSolarFlux = 0;

    let prevIlluminated: boolean | null = null;
    let prevEarthLos: boolean | null = null;

    for (let h = 0; h <= totalMissionHours; h += stepHours) {
      const state = this.computeInstantaneousState(
        coordinates,
        epochMs,
        h,
        horizonProfile,
        solarHardware,
        commHardware
      );
      const isIlluminated = state.sun.visibleSolarDiscFraction > ILLUMINATION_DISC_THRESHOLD;
      const hasEarthLineOfSight = state.earth.isDteOperational;
      const hasRelayCoverage = state.earth.isRelayOperational;
      const hasAnyComm = hasEarthLineOfSight || hasRelayCoverage;

      const ptDate = new Date(epochMs + h * 3600 * 1000);
      const timestampUtc = ptDate.toISOString().slice(0, 16).replace('T', ' ') + 'Z';

      // Detect Sunrise / Sunset & Earthrise / Earthset transition markers
      if (prevIlluminated !== null && isIlluminated !== prevIlluminated) {
        if (isIlluminated) sunriseCount++;
        else sunsetCount++;
        transitionEvents.push({
          hourOffset: h,
          timestampUtc,
          kind: isIlluminated ? 'SUNRISE' : 'SUNSET',
          azimuthDeg: state.sun.azimuthDeg,
          horizonElevationDeg: state.sun.localHorizonMaskDeg,
          description: isIlluminated
            ? `Solar disc emerges above ${state.sun.localHorizonMaskDeg.toFixed(1)}° ridge at Az ${state.sun.azimuthDeg.toFixed(0)}°`
            : `Solar disc occulted behind ${state.sun.localHorizonMaskDeg.toFixed(1)}° ridge at Az ${state.sun.azimuthDeg.toFixed(0)}°`,
        });
      }
      if (prevEarthLos !== null && hasEarthLineOfSight !== prevEarthLos) {
        if (hasEarthLineOfSight) earthriseCount++;
        else earthsetCount++;
        transitionEvents.push({
          hourOffset: h,
          timestampUtc,
          kind: hasEarthLineOfSight ? 'EARTHRISE' : 'EARTHSET',
          azimuthDeg: state.earth.azimuthDeg,
          horizonElevationDeg: state.earth.localHorizonMaskDeg,
          description: hasEarthLineOfSight
            ? `Direct-to-Earth link acquired above ${commHardware.minElevationConstraintDeg}° min elev & ridge mask`
            : `Direct-to-Earth link lost (ridge occultation or min elevation constraint)`,
        });
      }
      prevIlluminated = isIlluminated;
      prevEarthLos = hasEarthLineOfSight;

      if (isIlluminated) {
        illuminatedCount++;
        currentDarknessRunHours = 0;
      } else {
        currentDarknessRunHours += stepHours;
        if (currentDarknessRunHours > maxDarknessHours) {
          maxDarknessHours = currentDarknessRunHours;
        }
      }

      if (hasEarthLineOfSight) dteCount++;
      if (hasAnyComm) effectiveCommCount++;
      if (isIlluminated && hasAnyComm) simultaneousCount++;

      sumSunEl += state.sun.elevationDeg;
      sumPowerWatts += state.sun.estimatedElectricalPowerWatts;
      if (state.sun.planeOfArrayIrradianceWm2 > peakSolarFlux) {
        peakSolarFlux = state.sun.planeOfArrayIrradianceWm2;
      }

      let operationalState: OperationalWindowState = 'CRITICAL_BLACKOUT';
      if (isIlluminated && hasEarthLineOfSight) {
        operationalState = 'NOMINAL_OPS';
        nominalOpsSampleCount++;
      } else if (isIlluminated && !hasEarthLineOfSight) {
        operationalState = 'SOLAR_ONLY_RELAY';
        solarOnlySampleCount++;
      } else if (!isIlluminated && hasAnyComm) {
        operationalState = 'ECLIPSE_DTE_COMM';
        eclipseDteSampleCount++;
      } else {
        criticalBlackoutSampleCount++;
      }

      timeline.push({
        hourOffset: h,
        timestampUtc,
        lunarLocalHour: state.lunarLocalHour,
        sunElevationDeg: state.sun.elevationDeg,
        sunAzimuthDeg: state.sun.azimuthDeg,
        sunHorizonMaskDeg: state.sun.localHorizonMaskDeg,
        sunClearanceDeg: state.sun.horizonClearanceDeg,
        visibleSolarDiscFraction: state.sun.visibleSolarDiscFraction,
        solarFluxWm2: state.sun.planeOfArrayIrradianceWm2,
        electricalPowerWatts: state.sun.estimatedElectricalPowerWatts,
        isIlluminated,
        earthElevationDeg: state.earth.elevationDeg,
        earthAzimuthDeg: state.earth.azimuthDeg,
        earthHorizonMaskDeg: state.earth.localHorizonMaskDeg,
        earthClearanceDeg: state.earth.horizonClearanceDeg,
        hasEarthLineOfSight,
        hasRelayCoverage,
        operationalState,
      });
    }

    const sampleCount = Math.max(1, timeline.length);
    const solarAvailabilityPct = Number(((illuminatedCount / sampleCount) * 100).toFixed(1));
    const earthVisibilityPct = Number(((dteCount / sampleCount) * 100).toFixed(1));
    const effectiveCommAvailabilityPct = Number(
      ((effectiveCommCount / sampleCount) * 100).toFixed(1)
    );
    const simultaneousNominalPct = Number(((simultaneousCount / sampleCount) * 100).toFixed(1));

    const totalIlluminatedHours = Math.round((solarAvailabilityPct / 100) * totalMissionHours);
    const totalDteCommHours = Math.round((earthVisibilityPct / 100) * totalMissionHours);
    const nominalOpsHours = Math.round(
      (nominalOpsSampleCount / sampleCount) * totalMissionHours
    );
    const solarOnlyHours = Math.round(
      (solarOnlySampleCount / sampleCount) * totalMissionHours
    );
    const eclipseDteHours = Math.round(
      (eclipseDteSampleCount / sampleCount) * totalMissionHours
    );
    const criticalBlackoutHours = Math.max(
      0,
      totalMissionHours - nominalOpsHours - solarOnlyHours - eclipseDteHours
    );

    const meanSunElevationDeg = Number((sumSunEl / sampleCount).toFixed(2));
    const meanElectricalPowerWatts = Math.round(sumPowerWatts / sampleCount);
    const cumulativeEnergyKwh = Number(
      ((meanElectricalPowerWatts * totalMissionHours) / 1000).toFixed(1)
    );

    const siteElevationMeters = matchedPreset
      ? matchedPreset.elevationMeters
      : this.estimateElevation(coordinates);
    const localSlopeDeg = this.estimateSlope(coordinates, matchedPreset);

    // Transparent Score Calculation Breakdown
    const solarScoreComponent = Number((solarAvailabilityPct * 0.45).toFixed(1));
    const commScoreComponent = Number((effectiveCommAvailabilityPct * 0.3).toFixed(1));
    const rawSlopeScore = Math.max(0, 100 - localSlopeDeg * 7);
    const slopeSafetyComponent = Number((rawSlopeScore * 0.15).toFixed(1));
    const rawDarknessScore = Math.max(0, 100 - (maxDarknessHours / totalMissionHours) * 100);
    const darknessResilienceComponent = Number((rawDarknessScore * 0.1).toFixed(1));

    const overallViabilityScore = Math.min(
      99,
      Math.max(
        5,
        Math.round(
          solarScoreComponent +
            commScoreComponent +
            slopeSafetyComponent +
            darknessResilienceComponent
        )
      )
    );

    const scoreBreakdown: ScoreComponentBreakdown = {
      solarScoreComponent,
      commScoreComponent,
      slopeSafetyComponent,
      darknessResilienceComponent,
      formulaExplanation:
        'Score = 0.45 × (Solar Duty %) + 0.30 × (Effective Comm %) + 0.15 × max(0, 100 - 7 × Slope_deg) + 0.10 × (100 - LongestDarkness_pct)',
    };

    const summary: MissionSummaryMetrics = {
      solarAvailabilityPct,
      totalIlluminatedHours,
      maxContinuousDarknessHours: maxDarknessHours,
      meanSunElevationDeg,
      peakSolarFluxWm2: peakSolarFlux,
      meanElectricalPowerWatts,
      cumulativeEnergyKwh,
      earthVisibilityPct,
      effectiveCommAvailabilityPct,
      totalDteCommHours,
      simultaneousNominalPct,
      nominalOpsHours,
      solarOnlyHours,
      eclipseDteHours,
      criticalBlackoutHours,
      sunriseCount,
      sunsetCount,
      earthriseCount,
      earthsetCount,
      overallViabilityScore,
      scoreBreakdown,
      siteElevationMeters,
      localSlopeDeg,
    };

    const bundle: CachedTimelineBundle = {
      matchedPreset,
      horizonProfile,
      timeline,
      transitionEvents,
      summary,
      epochMs,
      totalMissionHours,
    };

    // LRU-ish eviction. The cap comfortably holds a 31-epoch landing-window scan plus the
    // Alpha/Bravo/pin scenarios so scrubbing never thrashes the cache.
    if (this.timelineCache.size >= 192) {
      const oldestKey = this.timelineCache.keys().next().value;
      if (oldestKey !== undefined) this.timelineCache.delete(oldestKey);
    }
    this.timelineCache.set(cacheKey, bundle);
    return bundle;
  }

  public computeScenario(params: ScenarioRequestParams): MissionScenarioData {
    const solarHardware = params.solarHardware || DEFAULT_SOLAR_HARDWARE;
    const commHardware = params.commHardware || DEFAULT_COMM_HARDWARE;

    const bundle = this.getOrComputeTimelineBundle(
      params.coordinates,
      params.epochIsoUtc,
      params.missionDurationDays,
      solarHardware,
      commHardware
    );

    const {
      matchedPreset,
      horizonProfile,
      timeline,
      transitionEvents,
      summary,
      epochMs,
      totalMissionHours,
    } = bundle;

    const clampedElapsedHours = Math.max(0, Math.min(totalMissionHours, params.elapsedHours));

    const instant = this.computeInstantaneousState(
      params.coordinates,
      epochMs,
      clampedElapsedHours,
      horizonProfile,
      solarHardware,
      commHardware
    );

    // Next Sun transition: scan the cached timeline for the first sample after "now" whose
    // illumination state differs. If none exists, report the remaining window and flag it
    // so the UI can say "no sunset within this window" instead of inventing an event.
    const currentIllum = instant.sun.visibleSolarDiscFraction > ILLUMINATION_DISC_THRESHOLD;
    let hoursToNextSun = Math.max(0, totalMissionHours - clampedElapsedHours);
    let sunTransitionFound = false;
    for (const pt of timeline) {
      if (pt.hourOffset > clampedElapsedHours && pt.isIlluminated !== currentIllum) {
        hoursToNextSun = Math.max(1, pt.hourOffset - clampedElapsedHours);
        sunTransitionFound = true;
        break;
      }
    }
    instant.sun.hoursToNextTransition = Math.round(hoursToNextSun);
    instant.sun.transitionWithinWindow = sunTransitionFound;
    instant.sun.nextTransitionType = currentIllum
      ? 'SUNSET_OCCULTATION'
      : 'SUNRISE_EMERGENCE';

    const currentDte = instant.earth.isDteOperational;
    let hoursToNextEarth = Math.max(0, totalMissionHours - clampedElapsedHours);
    let earthTransitionFound = false;
    for (const pt of timeline) {
      if (pt.hourOffset > clampedElapsedHours && pt.hasEarthLineOfSight !== currentDte) {
        hoursToNextEarth = Math.max(1, pt.hourOffset - clampedElapsedHours);
        earthTransitionFound = true;
        break;
      }
    }
    instant.earth.hoursToNextTransition = Math.round(hoursToNextEarth);
    instant.earth.transitionWithinWindow = earthTransitionFound;
    instant.earth.nextTransitionType = currentDte
      ? 'EARTHSET_OCCULTATION'
      : 'EARTHRISE_EMERGENCE';

    return {
      scenarioId: params.scenarioId,
      scenarioLabel: params.scenarioLabel,
      metadata: SIMULATED_METADATA,
      coordinates: params.coordinates,
      matchedPresetSite: matchedPreset,
      timeConfig: {
        epochIsoUtc: params.epochIsoUtc,
        currentIsoUtc: instant.currentIsoUtc,
        julianDate: instant.julianDate,
        elapsedHours: clampedElapsedHours,
        missionDurationDays: params.missionDurationDays,
        lunarLocalSolarHour: instant.lunarLocalHour,
      },
      solarHardware,
      commHardware,
      instantaneousSun: instant.sun,
      instantaneousEarth: instant.earth,
      horizonProfile360: horizonProfile,
      timeline,
      transitionEvents,
      summary,
    };
  }
}

export const defaultLunarProvider: ILunarNavigationProvider = new SimulatedLunarProvider();
