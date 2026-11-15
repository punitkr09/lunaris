import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Compass,
  Crosshair,
  MapPin,
  PlusCircle,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  LandingSitePreset,
  LunarCoordinates,
  MissionScenarioData,
  SiteCategory,
  UserExperienceMode,
} from '../types/navigation';
import {
  computeSelenographicBearingDeg,
  NearbyLandingRecommendation,
  scanNearbyBetterLandingZones,
} from '../science/nearbyLandingZoneScanner';
import { computeLunarSurfaceDistanceKm } from '../science/lunarMath';

interface RelocationSnapshot {
  fromCoords: LunarCoordinates;
  fromLabel: string;
  fromScore: number;
  toCoords: LunarCoordinates;
  toLabel: string;
  toCode: string;
  distanceKm: number;
  compassDirection: string;
  scoreDelta: number;
  advantageSummary: string;
}

interface LandingSiteSelectorProps {
  candidateSites: LandingSitePreset[];
  scenario: MissionScenarioData;
  comparisonCoordsList: LunarCoordinates[];
  uxMode: UserExperienceMode;
  onSelectCoordinates: (coords: LunarCoordinates) => void;
  onToggleComparisonSite: (coords: LunarCoordinates) => void;
}

const CATEGORY_OPTIONS: { id: 'ALL' | SiteCategory; label: string }[] = [
  { id: 'ALL', label: 'All Regions' },
  { id: 'ARTEMIS_III_CANDIDATE', label: 'South Pole' },
  { id: 'HISTORIC_LANDING', label: 'Historic' },
  { id: 'FARSIDE_BASIN', label: 'Far Side' },
  { id: 'GLOBAL_LANDMARK', label: 'Global' },
];

export const LandingSiteSelector: React.FC<LandingSiteSelectorProps> = ({
  candidateSites,
  scenario,
  comparisonCoordsList,
  uxMode,
  onSelectCoordinates,
  onToggleComparisonSite,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | SiteCategory>('ALL');
  const [latInput, setLatInput] = useState<string>(
    scenario.coordinates.latitudeDeg.toFixed(3)
  );
  const [lonInput, setLonInput] = useState<string>(
    scenario.coordinates.longitudeDeg.toFixed(3)
  );
  const [coordError, setCoordError] = useState<string | null>(null);
  const [nearbyTab, setNearbyTab] = useState<'MICRO' | 'NASA'>('MICRO');
  const [showNearbyDrawer, setShowNearbyDrawer] = useState<boolean>(false);
  const [isScanningTransition, setIsScanningTransition] = useState<boolean>(false);
  const [lockingRecId, setLockingRecId] = useState<string | null>(null);
  const [relocationSnapshot, setRelocationSnapshot] =
    useState<RelocationSnapshot | null>(null);

  const nearbyScan = useMemo(
    () => scanNearbyBetterLandingZones(scenario, candidateSites),
    [scenario, candidateSites]
  );

  const prevScenarioRef = useRef<{
    coords: LunarCoordinates;
    label: string;
    score: number;
  }>({
    coords: scenario.coordinates,
    label:
      scenario.matchedPresetSite?.name ||
      `Custom (${scenario.coordinates.latitudeDeg.toFixed(2)}°, ${scenario.coordinates.longitudeDeg.toFixed(2)}°)`,
    score: nearbyScan.selectedPointScore,
  });

  useEffect(() => {
    setLatInput(scenario.coordinates.latitudeDeg.toFixed(3));
    setLonInput(scenario.coordinates.longitudeDeg.toFixed(3));
    setCoordError(null);

    const prev = prevScenarioRef.current;
    const distKm = computeLunarSurfaceDistanceKm(prev.coords, scenario.coordinates);
    if (distKm >= 0.25) {
      setIsScanningTransition(true);
      const currentLabel =
        scenario.matchedPresetSite?.name ||
        `Target (${scenario.coordinates.latitudeDeg.toFixed(2)}°, ${scenario.coordinates.longitudeDeg.toFixed(2)}°)`;
      const currentCode = scenario.matchedPresetSite?.code || 'OPTIMIZED-ZONE';
      const bearing = computeSelenographicBearingDeg(prev.coords, scenario.coordinates);
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const compass = dirs[Math.round(bearing / 45) % 8];
      const delta = nearbyScan.selectedPointScore - prev.score;

      setRelocationSnapshot((existing) => ({
        fromCoords: prev.coords,
        fromLabel: prev.label,
        fromScore: prev.score,
        toCoords: scenario.coordinates,
        toLabel: existing && lockingRecId ? existing.toLabel : currentLabel,
        toCode: existing && lockingRecId ? existing.toCode : currentCode,
        distanceKm: Number(distKm.toFixed(1)),
        compassDirection: compass,
        scoreDelta: delta,
        advantageSummary:
          existing && lockingRecId
            ? existing.advantageSummary
            : delta > 0
            ? `+${delta} pts higher terrain & illumination viability`
            : `Shifted ${distKm.toFixed(1)} km ${compass}`,
      }));

      prevScenarioRef.current = {
        coords: scenario.coordinates,
        label: currentLabel,
        score: nearbyScan.selectedPointScore,
      };

      const timer = window.setTimeout(() => {
        setIsScanningTransition(false);
        setLockingRecId(null);
      }, 280);
      return () => window.clearTimeout(timer);
    } else {
      prevScenarioRef.current = {
        coords: scenario.coordinates,
        label:
          scenario.matchedPresetSite?.name ||
          `Custom (${scenario.coordinates.latitudeDeg.toFixed(2)}°, ${scenario.coordinates.longitudeDeg.toFixed(2)}°)`,
        score: nearbyScan.selectedPointScore,
      };
    }
  }, [
    scenario.coordinates.latitudeDeg,
    scenario.coordinates.longitudeDeg,
    scenario.matchedPresetSite,
    nearbyScan.selectedPointScore,
  ]);

  const handleSwitchToNearbyRecommendation = (rec: NearbyLandingRecommendation) => {
    setLockingRecId(rec.id);
    setIsScanningTransition(true);
    const fromLabel =
      scenario.matchedPresetSite?.name ||
      `Custom (${scenario.coordinates.latitudeDeg.toFixed(2)}°, ${scenario.coordinates.longitudeDeg.toFixed(2)}°)`;

    setRelocationSnapshot({
      fromCoords: scenario.coordinates,
      fromLabel,
      fromScore: nearbyScan.selectedPointScore,
      toCoords: rec.coordinates,
      toLabel: rec.label,
      toCode: rec.code,
      distanceKm: rec.distanceKm,
      compassDirection: rec.compassDirection,
      scoreDelta: rec.scoreDeltaVsSelected,
      advantageSummary: rec.primaryAdvantageReason,
    });

    window.setTimeout(() => {
      onSelectCoordinates(rec.coordinates);
    }, 150);
  };

  const handleRevertToPreviousLocation = () => {
    if (!relocationSnapshot) return;
    setIsScanningTransition(true);
    onSelectCoordinates(relocationSnapshot.fromCoords);
  };

  const filteredSites = useMemo(() => {
    return candidateSites.filter((s) => {
      if (categoryFilter !== 'ALL' && s.category !== categoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [candidateSites, categoryFilter, searchQuery]);

  const isCoordInComparison = (coords: LunarCoordinates) => {
    return comparisonCoordsList.some(
      (c) =>
        Math.abs(c.latitudeDeg - coords.latitudeDeg) < 0.05 &&
        Math.abs(c.longitudeDeg - coords.longitudeDeg) < 0.1
    );
  };

  const handleApplyCustomCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(latInput);
    const parsedLon = parseFloat(lonInput);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
      setCoordError('Enter valid numeric decimal degrees.');
      return;
    }
    if (parsedLat < -90 || parsedLat > 90) {
      setCoordError('Latitude must be between -90.0° (South Pole) and +90.0° (North Pole).');
      return;
    }
    if (parsedLon < -180 || parsedLon > 180) {
      setCoordError('Longitude must be between -180.0° and +180.0°.');
      return;
    }
    setCoordError(null);
    onSelectCoordinates({
      latitudeDeg: Number(parsedLat.toFixed(4)),
      longitudeDeg: Number(parsedLon.toFixed(4)),
    });
  };

  const nudgeCoordinate = (dLat: number, dLon: number) => {
    const nextLat = Math.max(-90, Math.min(90, scenario.coordinates.latitudeDeg + dLat));
    let nextLon = scenario.coordinates.longitudeDeg + dLon;
    if (nextLon > 180) nextLon -= 360;
    if (nextLon < -180) nextLon += 360;
    onSelectCoordinates({
      latitudeDeg: Number(nextLat.toFixed(4)),
      longitudeDeg: Number(nextLon.toFixed(4)),
    });
  };

  return (
    <section className="lunaris-surface rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-lunar-100">Location Selection</h3>
            <p className="text-xs text-lunar-400">
              Choose a candidate region or enter custom coordinates
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-lunar-400">
          {filteredSites.length} sites
        </span>
      </div>

      {uxMode === 'EDUCATOR' && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-lunar-300 leading-relaxed">
          Lunar coordinates use the <strong>MOON_ME</strong> system: −90° is the South Pole, 0° longitude faces Earth, and ±180° is the Far Side.
        </div>
      )}

      {/* Search + Category Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-lunar-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search craters, Artemis regions, or codes..."
            className="w-full bg-space-950/80 border border-white/10 focus:border-amber-400/60 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-lunar-100 placeholder:text-lunar-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-amber-500 text-space-950'
                  : 'bg-space-850 text-lunar-300 border border-white/[0.07] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Candidate Sites List */}
      <div
        data-lenis-prevent
        className="max-h-64 overflow-y-auto pr-1 space-y-2"
      >
        {filteredSites.map((site) => {
          const isSelected = scenario.matchedPresetSite?.id === site.id;
          const inCompare = isCoordInComparison(site.coordinates);
          return (
            <div
              key={site.id}
              className={`p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-400/50'
                  : 'bg-space-950/60 border-white/[0.07] hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCoordinates(site.coordinates)}
                  className="text-left flex-1 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-amber-400 font-medium">
                      {site.code}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        site.locationAuthenticity === 'REAL_NASA_REFERENCE'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {site.locationAuthenticity === 'REAL_NASA_REFERENCE'
                        ? 'Real Coords'
                        : 'Illustrative'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-lunar-100 mt-1 truncate">
                    {site.name}
                  </div>
                  <div className="text-[11px] text-lunar-400 truncate">
                    {site.region}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleComparisonSite(site.coordinates)}
                  className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    inCompare
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                      : 'bg-space-850 border-white/10 text-lunar-300 hover:text-white'
                  }`}
                  title="Pin or unpin site for comparison"
                >
                  {inCompare ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Pinned
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3 h-3" />
                      Compare
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
        {filteredSites.length === 0 && (
          <div className="p-4 text-center text-xs text-lunar-400">
            No matching lunar sites found.
          </div>
        )}
      </div>

      {/* Custom Coordinate Entry */}
      <form
        onSubmit={handleApplyCustomCoordinates}
        className="pt-3 border-t border-white/[0.08] space-y-2.5"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-lunar-200 inline-flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            Custom Coordinates
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => nudgeCoordinate(-0.5, 0)}
              className="px-2 py-0.5 rounded-md bg-space-850 border border-white/10 text-lunar-300 hover:text-white"
            >
              -0.5° Lat
            </button>
            <button
              type="button"
              onClick={() => nudgeCoordinate(0.5, 0)}
              className="px-2 py-0.5 rounded-md bg-space-850 border border-white/10 text-lunar-300 hover:text-white"
            >
              +0.5° Lat
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-lunar-400 mb-1">
              Latitude (-90° to 90°)
            </label>
            <input
              type="text"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 focus:outline-none rounded-xl px-3 py-1.5 text-xs font-mono text-lunar-100 tabular-nums"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-lunar-400 mb-1">
              Longitude (-180° to 180°)
            </label>
            <input
              type="text"
              value={lonInput}
              onChange={(e) => setLonInput(e.target.value)}
              className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 focus:outline-none rounded-xl px-3 py-1.5 text-xs font-mono text-lunar-100 tabular-nums"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-space-950 font-semibold text-xs transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
        {coordError && (
          <p className="text-xs text-rose-400">{coordError}</p>
        )}
      </form>

      {/* Sleek, Collapsible Nearby Landing Alternatives Drawer */}
      <div className="pt-2.5 border-t border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-space-950/70 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setShowNearbyDrawer((v) => !v)}
            aria-expanded={showNearbyDrawer}
            className="flex items-center gap-2 min-w-0 flex-1 text-left group"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="min-w-0 flex-1 truncate text-xs">
              <span className="font-medium text-lunar-100 group-hover:text-white transition-colors">
                Nearby Alternatives
              </span>
              {nearbyScan.localMicroSites[0] && (
                <span className="text-lunar-400 ml-2">
                  · Best: {nearbyScan.localMicroSites[0].distanceKm} km{' '}
                  {nearbyScan.localMicroSites[0].compassDirection} (
                  {nearbyScan.localMicroSites[0].meanSlopeDeg}° slope)
                </span>
              )}
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {relocationSnapshot && (
              <button
                type="button"
                onClick={handleRevertToPreviousLocation}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[11px] text-sky-300 font-medium transition-colors"
                title={`Return to previous point (${relocationSnapshot.fromCoords.latitudeDeg.toFixed(2)}°, ${relocationSnapshot.fromCoords.longitudeDeg.toFixed(2)}°)`}
              >
                <RotateCcw className="w-3 h-3" />
                Undo
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNearbyDrawer((v) => !v)}
              aria-expanded={showNearbyDrawer}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[11px] font-medium text-lunar-200 hover:text-white transition-colors"
            >
              <span>{showNearbyDrawer ? 'Hide' : 'Explore (3)'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showNearbyDrawer ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {showNearbyDrawer && (
          <div
            className={`space-y-2 transition-all duration-200 animate-fadeIn ${
              isScanningTransition ? 'opacity-70' : 'opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-0.5">
              <span className="text-[11px] text-lunar-400">
                {nearbyTab === 'MICRO'
                  ? '90 km regional terrain scan'
                  : 'Closest official NASA sites'}
              </span>
              <div className="inline-flex rounded-lg bg-space-950 p-0.5 border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setNearbyTab('MICRO')}
                  className={`px-2.5 py-0.5 rounded-md transition-colors ${
                    nearbyTab === 'MICRO'
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-lunar-400 hover:text-white'
                  }`}
                >
                  Regional (3)
                </button>
                <button
                  type="button"
                  onClick={() => setNearbyTab('NASA')}
                  className={`px-2.5 py-0.5 rounded-md transition-colors ${
                    nearbyTab === 'NASA'
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-lunar-400 hover:text-white'
                  }`}
                >
                  NASA Sites (3)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {(nearbyTab === 'MICRO'
                ? nearbyScan.localMicroSites
                : nearbyScan.nearestNasaSites
              ).map((rec) => {
                const inCompare = isCoordInComparison(rec.coordinates);
                const isLockingThis = lockingRecId === rec.id;
                return (
                  <div
                    key={rec.id}
                    className={`px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isLockingThis
                        ? 'bg-sky-500/15 border-sky-400/50'
                        : 'bg-space-950/60 border-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-lunar-100 truncate">
                          {rec.label}
                        </span>
                        <span className="text-[11px] text-sky-300 font-medium shrink-0">
                          {rec.distanceKm} km {rec.compassDirection}
                        </span>
                      </div>
                      <div className="text-[11px] text-lunar-400 truncate mt-0.5">
                        {rec.meanSlopeDeg}° slope ·{' '}
                        {rec.elevationMeters >= 0 ? '+' : ''}
                        {rec.elevationMeters}m elev · {rec.estimatedSolarPct}% sun
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSwitchToNearbyRecommendation(rec)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-sky-500 hover:text-space-950 text-white font-medium text-[11px] transition-colors"
                      >
                        {isLockingThis ? 'Moving...' : 'Select'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleComparisonSite(rec.coordinates)}
                        className={`px-2 py-1 rounded-lg border text-[11px] transition-colors ${
                          inCompare
                            ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                            : 'bg-space-850 border-white/10 text-lunar-300 hover:text-white'
                        }`}
                        title="Pin or unpin for comparison"
                      >
                        {inCompare ? 'Pinned' : 'Compare'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
