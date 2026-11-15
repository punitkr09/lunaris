import {
  DataProviderMetadata,
  LandingSitePreset,
  MissionScenarioData,
  ScenarioRequestParams,
} from '../types/navigation';

/**
 * Replaceable Scientific Data Provider Interface (`ILunarNavigationProvider`).
 *
 * UI components never perform astronomical or topographic math directly;
 * instead, they query an implementation of `ILunarNavigationProvider`.
 *
 * Current Implementation:
 * - `SimulatedLunarProvider` (Deterministic Parametric South-Pole Ephemeris & Horizon Model)
 *
 * Planned Production Implementations:
 * - `NasaSpiceLolaProvider` (NAIF SPICE kernels de440/moon_pa + JPL Horizons API + LRO LOLA LDEM_80S_5M)
 */
export interface ILunarNavigationProvider {
  /** Returns provider provenance & simulation disclaimer metadata */
  getMetadata(): DataProviderMetadata;

  /** Returns curated Artemis / Lunar South Pole candidate landing sites */
  getCandidateLandingSites(): LandingSitePreset[];

  /** Computes complete navigation, Sun, Earth, horizon, and timeline telemetry for a scenario */
  computeScenario(params: ScenarioRequestParams): MissionScenarioData;
}
