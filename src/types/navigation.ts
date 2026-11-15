/**
 * LUNARIS — Complete Scientific & Navigation Data Structures
 * All UI components consume exclusively from these interfaces.
 */

export type DataClassification = 'REAL_DATA' | 'SYNTHETIC_DATA' | 'UNAVAILABLE_DATA';

export type DataProvenanceMode = 'SIMULATED_MODEL' | 'NASA_SPICE_HORIZONS' | 'HYBRID_CACHE';

export type UserExperienceMode = 'EDUCATOR' | 'EXPLORER' | 'MISSION_PLANNER';

export interface DatasetSourceManifest {
  id: string;
  sourceName: string;
  agency: string;
  datasetVersion: string;
  retrievalDateUtc: string;
  coordinateReferenceSystem: string;
  timeReferenceSystem: string;
  units: string;
  processingMethod: string;
  classification: DataClassification;
  dataQualityInfo: string;
  uncertaintyEstimate: string;
  statusNote: string;
}

export interface DataProviderMetadata {
  providerId: string;
  providerName: string;
  version: string;
  mode: DataProvenanceMode;
  isSimulated: boolean;
  disclaimer: string;
  referenceFrame: string;
  terrainSourceLabel: string;
  ephemerisSourceLabel: string;
  datasets: DatasetSourceManifest[];
}

export interface LunarCoordinates {
  /** Latitude in decimal degrees (-90.0 to +90.0, Mean Earth / Polar Axis frame) */
  latitudeDeg: number;
  /** Longitude in decimal degrees (-180.0 to +180.0, Mean Earth / Polar Axis frame) */
  longitudeDeg: number;
}

export type SiteCategory =
  | 'ARTEMIS_III_CANDIDATE'
  | 'HISTORIC_LANDING'
  | 'GLOBAL_LANDMARK'
  | 'FARSIDE_BASIN';

export interface LandingSitePreset {
  id: string;
  code: string;
  name: string;
  region: string;
  category: SiteCategory;
  coordinates: LunarCoordinates;
  /** Elevation in meters relative to 1737.4 km mean lunar sphere */
  elevationMeters: number;
  /** Mean baseline slope in degrees over 100m lander footprint */
  meanSlopeDeg: number;
  /** Distance to nearest Permanently Shadowed Region (km), or null if equatorial */
  psrDistanceKm: number | null;
  terrainRoughnessLabel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'EXTREME';
  description: string;
  elevationExplanation: string;
  slopeExplanation: string;
  dataSourceAttribution: string;
  /** Distinguishes real published NASA/IAU coordinates from synthetic/illustrative points */
  locationAuthenticity: 'REAL_NASA_REFERENCE' | 'ILLUSTRATIVE_SYNTHETIC';
  /** Distinguishes whether local horizon mask at this site is real LOLA DEM or synthetic proxy */
  horizonDataClassification: DataClassification;
  artemisCandidateRank?: number;
  tags: string[];
}

export interface SolarHardwareConfig {
  /** Panel tracking configuration */
  trackingMode: 'FIXED_ORIENTATION' | 'VERTICAL_1AXIS_AZIMUTH' | 'DUAL_AXIS_SUN_TRACKING';
  /** Panel tilt angle from local horizontal (0° = flat on ground, 90° = vertical mast for polar sun) */
  panelTiltDeg: number;
  /** Panel azimuth orientation (0°=N, 90°=E, 180°=S, 270°=W) when in FIXED_ORIENTATION mode */
  panelAzimuthDeg: number;
  /** Total active photovoltaic array area in m^2 */
  arrayAreaM2: number;
  /** Triple-junction solar cell conversion efficiency (0-100%) */
  cellEfficiencyPct: number;
  /** Combined thermal, dust, and power-conditioning derating factor (0.5 - 1.0) */
  systemDeratingFactor: number;
}

export interface CommHardwareConfig {
  /** Carrier frequency band */
  frequencyBand: 'S_BAND_2_2GHZ' | 'X_BAND_8_4GHZ' | 'KA_BAND_32GHZ';
  /** Minimum allowable antenna elevation angle above local horizon/terrain (deg) */
  minElevationConstraintDeg: number;
  /** Minimum clearance required above local topographic ridge mask (deg) */
  minRidgeClearanceDeg: number;
  /** RF Transmitter output power (Watts) */
  transmitPowerWatts: number;
  /** Lander High-Gain Antenna (HGA) diameter in meters */
  antennaDiameterMeters: number;
  /** Enable Lunar Relay Satellite (NRHO Gateway / Lunanet Relay) fallback when DTE is blocked */
  relaySatelliteEnabled: boolean;
}

export interface MissionTimeConfig {
  /** ISO-8601 UTC Landing / Epoch timestamp */
  epochIsoUtc: string;
  /** Instantaneous UTC timestamp at current elapsedHours */
  currentIsoUtc: string;
  /** Julian Date (JD) at current instant */
  julianDate: number;
  /** Offset in hours from landing epoch currently inspected on the timeline (0 to durationHours) */
  elapsedHours: number;
  /** Total mission planning window in Earth days (e.g., 7, 14, 28) */
  missionDurationDays: number;
  /** Lunar Local True Solar Time (LTST) in lunar hours (0.0 - 24.0) */
  lunarLocalSolarHour: number;
}

export type IlluminationStatus = 'ILLUMINATED' | 'GRAZING_PENUMBRA' | 'TOPOGRAPHIC_SHADOW';

export type CommLinkStatus =
  | 'NOMINAL_DTE'
  | 'LOW_ELEVATION_CONSTRAINT'
  | 'RELAY_SATELLITE_ACTIVE'
  | 'OCCULTED_BLACKOUT';

export type OperationalWindowState =
  | 'NOMINAL_OPS'       // Sun illuminated + Direct-to-Earth Comm available
  | 'SOLAR_ONLY_RELAY'  // Sun illuminated, no Direct-to-Earth link (relay may or may not be available)
  | 'ECLIPSE_DTE_COMM'  // In shadow (battery/fuel-cell draw), a comm link (DTE or relay) is available
  | 'CRITICAL_BLACKOUT'; // Both Sun and every comm link unavailable

export interface HorizonAzimuthSample {
  /** Azimuth in degrees (0 = North, 90 = East, 180 = South, 270 = West) */
  azimuthDeg: number;
  /** Local terrain horizon mask elevation angle in degrees */
  horizonElevationDeg: number;
}

export interface SunTelemetry {
  /** Topocentric elevation angle of the Sun center above ideal horizontal plane (deg) */
  elevationDeg: number;
  /** Topocentric azimuth angle of the Sun (0-360 deg clockwise from North) */
  azimuthDeg: number;
  /** Local topographic horizon mask angle at the Sun's current azimuth (deg) */
  localHorizonMaskDeg: number;
  /** Net angular clearance of Sun center above local terrain mask (deg) */
  horizonClearanceDeg: number;
  /** Fraction of the 0.53° solar disc unobstructed by terrain (0.0 to 1.0) */
  visibleSolarDiscFraction: number;
  /** Sub-solar longitude on the Moon (deg) */
  subSolarLongitudeDeg: number;
  /** Sub-solar latitude on the Moon (deg, varies ~ ±1.54 deg) */
  subSolarLatitudeDeg: number;
  /** Effective panel normal azimuth (deg) */
  effectivePanelAzimuthDeg: number;
  /** Effective panel tilt (deg from horizontal) */
  effectivePanelTiltDeg: number;
  /** Angle of incidence between solar rays and solar panel normal (0° = perpendicular, 90° = grazing) */
  panelIncidenceAngleDeg: number;
  /** Cosine projection efficiency factor cos(theta_i) (0.0 to 1.0) */
  cosineProjectionFactor: number;
  /** Unattenuated Direct Normal Irradiance (W/m^2) */
  directNormalIrradianceWm2: number;
  /** Effective Plane-of-Array solar irradiance on the panel (W/m^2) */
  planeOfArrayIrradianceWm2: number;
  /** Incident solar irradiance compatibility field (W/m^2) */
  solarIrradianceWm2: number;
  /** Estimated net electrical power generated by the configured array (W_e) */
  estimatedElectricalPowerWatts: number;
  /** Uncertainty bound on electrical power due to synthetic horizon mask uncertainty (±W_e) */
  powerUncertaintyWatts: number;
  /** Qualitative illumination state */
  status: IlluminationStatus;
  /**
   * Estimated hours until next state transition (sunrise or sunset behind ridge).
   * When `transitionWithinWindow` is false this is simply the remaining mission window
   * and must NOT be presented as a predicted event time.
   */
  hoursToNextTransition: number;
  /** Whether a sunrise/sunset actually occurs inside the remaining mission window */
  transitionWithinWindow: boolean;
  /** Next transition type */
  nextTransitionType: 'SUNSET_OCCULTATION' | 'SUNRISE_EMERGENCE';
  /** 3D unit vector toward Sun in local East-North-Up (ENU) frame */
  directionVector3D: [number, number, number];
}

export interface EarthTelemetry {
  /** Topocentric elevation angle of Earth center above ideal horizontal plane (deg) */
  elevationDeg: number;
  /** Topocentric azimuth angle of Earth (0-360 deg) */
  azimuthDeg: number;
  /** Geometric line-of-sight above smooth sphere (elevationDeg > 0) */
  isGeometricallyVisible: boolean;
  /** Local topographic horizon mask angle at Earth's current azimuth (deg) */
  localHorizonMaskDeg: number;
  /** Whether terrain obstructs the geometric line of sight */
  isTerrainObstructed: boolean;
  /** Net angular clearance of Earth above local terrain mask (deg) */
  horizonClearanceDeg: number;
  /** Whether Earth elevation satisfies the configured minimum antenna elevation constraint */
  meetsMinimumElevationConstraint: boolean;
  /** Whether Direct-to-Earth (DTE) communication is operationally viable (unobstructed + meets min elev + positive margin) */
  isDteOperational: boolean;
  /** Whether NRHO Relay Satellite is currently in view and providing link backup */
  isRelayOperational: boolean;
  /** Required antenna pointing azimuth (deg) and elevation (deg) */
  antennaPointingAzDeg: number;
  antennaPointingElDeg: number;
  /** Lander High-Gain Antenna peak boresight gain (dBi) */
  landerAntennaGainDbi: number;
  /** Free-Space Path Loss (FSPL) at selected frequency band and range (dB) */
  freeSpacePathLossDb: number;
  /** Center-to-center Earth-Moon range (km) */
  distanceKm: number;
  /** Optical libration in longitude (deg) */
  librationLongitudeDeg: number;
  /** Optical libration in latitude (deg) */
  librationLatitudeDeg: number;
  /** Direct-to-Earth or Relay communication link status */
  commStatus: CommLinkStatus;
  /** Active Deep Space Network (DSN) ground complex in view */
  activeDsnStation: 'DSN-GOLDSTONE (GDS)' | 'DSN-MADRID (MDS)' | 'DSN-CANBERRA (CDS)';
  /** Estimated downlink margin (dB) */
  estimatedLinkMarginDb: number;
  /** Estimated achievable downlink data rate (Mbps) */
  estimatedDataRateMbps: number;
  /** One-way light time delay (seconds) */
  oneWayLightTimeSec: number;
  /**
   * Estimated hours until next Earth visibility transition (Earthrise or Earthset).
   * When `transitionWithinWindow` is false this is simply the remaining mission window.
   */
  hoursToNextTransition: number;
  /** Whether an Earthrise/Earthset actually occurs inside the remaining mission window */
  transitionWithinWindow: boolean;
  /** Next Earth visibility transition type */
  nextTransitionType: 'EARTHSET_OCCULTATION' | 'EARTHRISE_EMERGENCE';
  /** 3D unit vector toward Earth in local ENU frame */
  directionVector3D: [number, number, number];
}

export type HorizonEventKind = 'SUNRISE' | 'SUNSET' | 'EARTHRISE' | 'EARTHSET';

export interface TimelineTransitionEvent {
  hourOffset: number;
  timestampUtc: string;
  kind: HorizonEventKind;
  azimuthDeg: number;
  horizonElevationDeg: number;
  description: string;
}

export interface TimelinePoint {
  /** Hours elapsed since landing epoch (T+h) */
  hourOffset: number;
  /** Formatted timestamp label */
  timestampUtc: string;
  /** Lunar local solar hour (0 - 24) */
  lunarLocalHour: number;
  /** Sun elevation angle (deg) */
  sunElevationDeg: number;
  /** Sun azimuth angle (deg, 0=N, 90=E) */
  sunAzimuthDeg: number;
  /** Local terrain mask at Sun azimuth (deg) */
  sunHorizonMaskDeg: number;
  /** Net Sun clearance (deg) */
  sunClearanceDeg: number;
  /** Fraction of the solar disc visible above the terrain mask (0.0 to 1.0) */
  visibleSolarDiscFraction: number;
  /** Incident solar flux on array (W/m^2) */
  solarFluxWm2: number;
  /** Estimated electrical power at this hour (W) */
  electricalPowerWatts: number;
  /** Whether site is illuminated at this hour */
  isIlluminated: boolean;
  /** Earth elevation angle (deg) */
  earthElevationDeg: number;
  /** Earth azimuth angle (deg, 0=N, 90=E) */
  earthAzimuthDeg: number;
  /** Local terrain mask at Earth azimuth (deg) */
  earthHorizonMaskDeg: number;
  /** Net Earth clearance (deg) */
  earthClearanceDeg: number;
  /** Whether Direct-to-Earth comm is operationally available at this hour */
  hasEarthLineOfSight: boolean;
  /** Whether Relay satellite comm is available at this hour */
  hasRelayCoverage: boolean;
  /** Combined operational readiness state */
  operationalState: OperationalWindowState;
}

export interface ScoreComponentBreakdown {
  solarScoreComponent: number;      // Weight 45%
  commScoreComponent: number;       // Weight 30%
  slopeSafetyComponent: number;     // Weight 15%
  darknessResilienceComponent: number; // Weight 10%
  formulaExplanation: string;
}

export interface MissionSummaryMetrics {
  /** Percentage of mission window with unobstructed solar illumination (0-100) */
  solarAvailabilityPct: number;
  /** Total illuminated hours across mission window */
  totalIlluminatedHours: number;
  /** Longest continuous darkness / eclipse period in hours */
  maxContinuousDarknessHours: number;
  /** Mean solar elevation angle during mission (deg) */
  meanSunElevationDeg: number;
  /** Peak incident solar flux (W/m^2) */
  peakSolarFluxWm2: number;
  /** Mean electrical power output across mission (W) */
  meanElectricalPowerWatts: number;
  /** Cumulative electrical energy generated over mission window (kWh) */
  cumulativeEnergyKwh: number;
  /** Percentage of mission window with operational Direct-to-Earth comm (0-100) */
  earthVisibilityPct: number;
  /** Percentage of mission window with Either DTE or Relay comm (0-100) */
  effectiveCommAvailabilityPct: number;
  /** Total hours with DTE communication lock */
  totalDteCommHours: number;
  /** Percentage of mission with simultaneous Sun + Comm (Nominal Ops) */
  simultaneousNominalPct: number;
  /** Hours in Sunlight + Direct-to-Earth Comm */
  nominalOpsHours: number;
  /** Hours in Sunlight + No Direct Comm (or Relay Only) */
  solarOnlyHours: number;
  /** Hours in Shadow + a comm link (Direct-to-Earth, or relay when enabled) */
  eclipseDteHours: number;
  /** Hours in Shadow + no comm link at all */
  criticalBlackoutHours: number;
  /** Number of sunrise events in mission window */
  sunriseCount: number;
  /** Number of sunset events in mission window */
  sunsetCount: number;
  /** Number of Earthrise events in mission window */
  earthriseCount: number;
  /** Number of Earthset events in mission window */
  earthsetCount: number;
  /** Composite mission viability score (0-100) */
  overallViabilityScore: number;
  /** Transparent breakdown of the viability score calculation */
  scoreBreakdown: ScoreComponentBreakdown;
  /** Estimated terrain elevation (m relative to 1737.4 km mean radius) */
  siteElevationMeters: number;
  /** Estimated local terrain slope (deg) */
  localSlopeDeg: number;
}

export interface MissionScenarioData {
  scenarioId: string;
  scenarioLabel: string;
  metadata: DataProviderMetadata;
  coordinates: LunarCoordinates;
  matchedPresetSite: LandingSitePreset | null;
  timeConfig: MissionTimeConfig;
  solarHardware: SolarHardwareConfig;
  commHardware: CommHardwareConfig;
  instantaneousSun: SunTelemetry;
  instantaneousEarth: EarthTelemetry;
  horizonProfile360: HorizonAzimuthSample[];
  timeline: TimelinePoint[];
  transitionEvents: TimelineTransitionEvent[];
  summary: MissionSummaryMetrics;
}

export interface ScenarioRequestParams {
  scenarioId: string;
  scenarioLabel: string;
  coordinates: LunarCoordinates;
  epochIsoUtc: string;
  elapsedHours: number;
  missionDurationDays: number;
  solarHardware?: SolarHardwareConfig;
  commHardware?: CommHardwareConfig;
}

/** One candidate landing epoch evaluated by the landing-window scanner. */
export interface LandingWindowCandidate {
  epochIsoUtc: string;
  /** Offset of this candidate epoch from the scan origin, in Earth days */
  offsetDays: number;
  solarAvailabilityPct: number;
  earthVisibilityPct: number;
  nominalOpsHours: number;
  criticalBlackoutHours: number;
  maxContinuousDarknessHours: number;
  cumulativeEnergyKwh: number;
  overallViabilityScore: number;
}
