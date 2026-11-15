import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import {
  DataClassification,
  DataProviderMetadata,
  LunarCoordinates,
} from '../types/navigation';
import { ScrollReveal } from '../motion/SmoothScrollProvider';

interface DataArchitectureViewProps {
  activeProviderKey: 'SIMULATED' | 'NASA_STUB';
  metadata: DataProviderMetadata;
  currentCoords: LunarCoordinates;
  currentEpochUtc: string;
  onSelectProviderKey: (key: 'SIMULATED' | 'NASA_STUB') => void;
}

const CLASSIFICATION_BADGES: Record<
  DataClassification,
  { bg: string; border: string; text: string; label: string }
> = {
  REAL_DATA: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/35',
    text: 'text-emerald-300',
    label: 'REAL DATA · VALIDATED ANALYTICAL / PUBLISHED',
  },
  SYNTHETIC_DATA: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/35',
    text: 'text-amber-300',
    label: 'SYNTHETIC DATA · PARAMETRIC PROXY',
  },
  UNAVAILABLE_DATA: {
    bg: 'bg-white/[0.04]',
    border: 'border-white/15',
    text: 'text-lunar-300',
    label: 'OFFLINE / BACKEND MOUNT READY',
  },
};

export const DataArchitectureView: React.FC<DataArchitectureViewProps> = ({
  activeProviderKey,
  metadata,
  currentCoords,
  currentEpochUtc,
  onSelectProviderKey,
}) => {
  const [copyState, setCopyState] = useState<'IDLE' | 'COPIED' | 'FAILED'>('IDLE');

  // Construct a real JPL Horizons REST API query URL for the user's selected Lunar coordinates.
  // Horizons SITE_COORD is "E-long,lat,alt_km" with east longitude in [0, 360).
  const parsedEpochMs = Date.parse(currentEpochUtc);
  const safeEpochMs = Number.isNaN(parsedEpochMs) ? Date.UTC(2026, 10, 15, 12, 0, 0) : parsedEpochMs;
  const startTime = new Date(safeEpochMs).toISOString().slice(0, 10);
  const stopTime = new Date(safeEpochMs + 7 * 86400000).toISOString().slice(0, 10);
  const eastLongitude360 = ((currentCoords.longitudeDeg % 360) + 360) % 360;
  const horizonsQueryUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='10'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='coord@301'&COORD_TYPE='GEODETIC'&SITE_COORD='${eastLongitude360.toFixed(
    3
  )},${currentCoords.latitudeDeg.toFixed(
    3
  )},0'&START_TIME='${startTime}'&STOP_TIME='${stopTime}'&STEP_SIZE='6%20h'&QUANTITIES='4'`;

  const handleCopyUrl = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(horizonsQueryUrl);
      setCopyState('COPIED');
    } catch {
      setCopyState('FAILED');
    }
    window.setTimeout(() => setCopyState('IDLE'), 2500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Editorial Hero Section */}
      <ScrollReveal className="lunaris-surface-elevated rounded-3xl p-6 sm:p-8 lg:p-10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="lunaris-index-pill">
              <span>03 // SCIENTIFIC PROVENANCE</span>
              <span>•</span>
              <span>DATA ARCHITECTURE</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-lunar-50">
              Modular Ephemeris &amp; Topographic Data Pipeline
            </h2>
            <p className="text-sm sm:text-base text-lunar-300 leading-relaxed">
              Every metric in LUNARIS is explicitly classified by provenance—separating validated
              analytical orbital mechanics and NASA LRO global imagery from parametric local
              horizon approximations and backend-mounted PDS4 datasets.
            </p>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-space-950/90 border border-white/10 font-mono text-xs shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-lunar-400">
              Active Engine Adapter
            </div>
            <div className="text-amber-300 font-semibold mt-0.5">{metadata.providerId}</div>
          </div>
        </div>

        {/* Scientific Disclaimer Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/25 flex items-start gap-3 text-xs sm:text-sm text-amber-100/90 leading-relaxed">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>{metadata.disclaimer}</div>
        </div>

        {/* Provider Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={() => onSelectProviderKey('SIMULATED')}
            className={`text-left p-5 rounded-2xl border transition-all ${
              activeProviderKey === 'SIMULATED'
                ? 'lunaris-surface-amber border-amber-400/60'
                : 'bg-space-950/70 border-white/[0.08] hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-semibold text-amber-300 uppercase tracking-wider">
                01 // Analytical Ephemeris + Synthetic Horizon Engine
              </span>
              {activeProviderKey === 'SIMULATED' && (
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              )}
            </div>
            <h3 className="font-display text-base font-semibold text-lunar-50 mb-1.5">
              SimulatedLunarProvider (Default)
            </h3>
            <p className="text-xs text-lunar-300 leading-relaxed mb-3">
              Executes validated analytical selenographic ephemeris equations (Delaunay arguments,
              optical libration, spherical trigonometry, and FSPL link budget math) paired with a
              deterministic 360° synthetic horizon mask generator.
            </p>
            <div className="text-[11px] font-mono text-lunar-200 flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Ephemeris: Real Analytical
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Horizon: Synthetic Proxy
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectProviderKey('NASA_STUB')}
            className={`text-left p-5 rounded-2xl border transition-all ${
              activeProviderKey === 'NASA_STUB'
                ? 'lunaris-surface-amber border-amber-400/60'
                : 'bg-space-950/70 border-white/[0.08] hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-semibold text-lunar-300 uppercase tracking-wider">
                02 // JPL Horizons &amp; LOLA PDS4 Adapter
              </span>
              {activeProviderKey === 'NASA_STUB' && (
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              )}
            </div>
            <h3 className="font-display text-base font-semibold text-lunar-50 mb-1.5">
              NasaHorizonsSpiceAdapterStub
            </h3>
            <p className="text-xs text-lunar-300 leading-relaxed mb-3">
              Implements the identical <code className="text-amber-300">ILunarNavigationProvider</code>{' '}
              contract for mounting NASA NAIF SPICE kernels (<code className="text-lunar-100">de440.bsp</code>)
              and LRO LOLA Polar GeoTIFF tiles (<code className="text-lunar-100">LDEM_80S_5M</code>).
            </p>
            <div className="text-[11px] font-mono text-lunar-200 flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-lunar-200 border border-white/15">
                Hybrid Cache Adapter
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Fallback: Synthetic DEM Proxy
              </span>
            </div>
          </button>
        </div>
      </ScrollReveal>

      {/* Dataset Source Manifest Catalog */}
      <ScrollReveal className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="font-display text-lg font-semibold text-lunar-50">
              Dataset Source Manifest &amp; Attribution Catalog
            </h3>
          </div>
          <span className="font-mono text-xs text-lunar-400">
            {metadata.datasets.length} Registered Data Products
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {metadata.datasets.map((ds) => {
            const badge = CLASSIFICATION_BADGES[ds.classification];
            return (
              <div
                key={ds.id}
                className="lunaris-surface rounded-2xl p-5 sm:p-6 space-y-4 transition-colors hover:border-white/15"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                  <div>
                    <h4 className="font-display text-base font-semibold text-lunar-50">
                      {ds.sourceName}
                    </h4>
                    <p className="text-xs font-mono text-lunar-400 mt-0.5">
                      {ds.agency} · Version: {ds.datasetVersion}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full border font-mono text-[10px] font-semibold tracking-wider ${badge.bg} ${badge.border} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-space-950/70 border border-white/[0.06]">
                    <span className="text-[10px] text-lunar-400 uppercase block mb-1">
                      Coordinate Frame
                    </span>
                    <span className="text-lunar-100">{ds.coordinateReferenceSystem}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-space-950/70 border border-white/[0.06]">
                    <span className="text-[10px] text-lunar-400 uppercase block mb-1">
                      Time System &amp; Epoch
                    </span>
                    <span className="text-lunar-100">
                      {ds.timeReferenceSystem} ({ds.retrievalDateUtc.slice(0, 10)})
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-space-950/70 border border-white/[0.06]">
                    <span className="text-[10px] text-lunar-400 uppercase block mb-1">
                      Native Units
                    </span>
                    <span className="text-lunar-100">{ds.units}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-space-950/70 border border-white/[0.06]">
                    <span className="text-[10px] text-lunar-400 uppercase block mb-1">
                      Uncertainty Bound
                    </span>
                    <span className="text-amber-300">{ds.uncertaintyEstimate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs leading-relaxed pt-1">
                  <div className="text-lunar-300">
                    <span className="font-mono text-[11px] uppercase text-lunar-400 block mb-0.5">
                      Processing &amp; Transformation
                    </span>
                    {ds.processingMethod}
                  </div>
                  <div className="text-lunar-300">
                    <span className="font-mono text-[11px] uppercase text-lunar-400 block mb-0.5">
                      Quality &amp; Integration Status
                    </span>
                    {ds.dataQualityInfo} —{' '}
                    <span className="font-mono text-amber-300">{ds.statusNote}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Live JPL Horizons Ephemeris Endpoint Generator */}
      <ScrollReveal className="lunaris-surface rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="font-display text-base font-semibold text-lunar-50">
                NASA SSD / JPL Horizons API Topocentric Query Builder
              </h3>
              <p className="text-xs text-lunar-400">
                Pre-parameterized REST endpoint for your active selenographic coordinate and epoch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-3.5 py-1.5 rounded-full bg-space-850 hover:bg-space-800 border border-white/10 text-lunar-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copyState === 'COPIED'
                ? 'Copied URI'
                : copyState === 'FAILED'
                  ? 'Copy Blocked — Select Text'
                  : 'Copy URI'}
            </button>
            <a
              href={horizonsQueryUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-space-950 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              Query JPL Horizons <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <p className="text-xs text-lunar-300 font-mono">
          Observer: Body <code className="text-amber-300">@301 (Moon)</code> at{' '}
          <code className="text-lunar-100">
            {currentCoords.latitudeDeg.toFixed(3)}° Lat,{' '}
            {currentCoords.longitudeDeg.toFixed(3)}° Lon ({eastLongitude360.toFixed(3)}° E)
          </code>{' '}
          · Target <code className="text-lunar-100">COMMAND=&apos;10&apos; (Sun)</code> · Quantities{' '}
          <code className="text-lunar-100">4 (Topocentric Az/El)</code>
        </p>

        <div className="p-4 bg-space-950 border border-white/10 rounded-2xl font-mono text-xs text-amber-200/90 break-all select-all">
          {horizonsQueryUrl}
        </div>
      </ScrollReveal>
    </div>
  );
};
