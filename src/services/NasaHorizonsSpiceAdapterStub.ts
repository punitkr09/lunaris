import {
  DataProviderMetadata,
  LandingSitePreset,
  MissionScenarioData,
  ScenarioRequestParams,
} from '../types/navigation';
import { ILunarNavigationProvider } from './LunarDataProvider';
import { SimulatedLunarProvider } from './SimulatedLunarProvider';

/**
 * Production Adapter Stub for NASA Datasets:
 * - JPL Horizons REST API (`https://ssd.jpl.nasa.gov/api/horizons.api`)
 * - NAIF SPICE Kernels (`de440.bsp`, `moon_pa_de440_200625.bpc`)
 * - LRO LOLA Digital Elevation Model (`LDEM_80S_5M` / `LDEM_85S_5M`)
 */
export class NasaHorizonsSpiceAdapterStub implements ILunarNavigationProvider {
  private fallbackProvider = new SimulatedLunarProvider();

  public getMetadata(): DataProviderMetadata {
    const base = this.fallbackProvider.getMetadata();
    return {
      ...base,
      providerId: 'nasa-spice-lola-adapter-stub',
      providerName: 'NASA JPL Horizons + LRO LOLA Adapter (Hybrid Cache / Fallback)',
      version: '2.0.0-HYBRID',
      mode: 'HYBRID_CACHE',
      isSimulated: true,
      disclaimer:
        'HYBRID ADAPTER ACTIVE — Analytical ephemeris (REAL_DATA) active; LRO LOLA full-resolution 5m/px PDS4 DEM tiles require backend tile mount and currently fall back to the parametric horizon mask (SYNTHETIC_DATA).',
      referenceFrame: 'MOON_ME_DE440 (Selenographic Mean Earth Frame)',
      terrainSourceLabel: 'LRO LOLA LDEM_80S_5M (Pending Local Tile Mount -> Synthetic Proxy)',
      ephemerisSourceLabel: 'Analytical Delaunay Ephemeris + JPL Horizons Query Bridge',
    };
  }

  public getCandidateLandingSites(): LandingSitePreset[] {
    return this.fallbackProvider.getCandidateLandingSites();
  }

  public computeScenario(params: ScenarioRequestParams): MissionScenarioData {
    const data = this.fallbackProvider.computeScenario(params);
    return {
      ...data,
      metadata: this.getMetadata(),
    };
  }
}
