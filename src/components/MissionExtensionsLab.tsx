import React, { useState } from 'react';
import {
  Cpu,
  BatteryCharging,
  Compass,
  Mountain,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
} from 'lucide-react';
import { MissionScenarioData } from '../types/navigation';
import { NasaImageVariant, NasaLunarImagePlate } from './NasaLunarImagePlate';

interface MissionExtensionsLabProps {
  scenario: MissionScenarioData;
}

interface ArchitectureProfile {
  id: string;
  name: string;
  category: 'LANDER' | 'ROVER' | 'HABITAT';
  imageVariant: NasaImageVariant;
  maxSlopeDeg: number;
  batterySurvivalHours: number;
  minOperatingPowerWatts: number;
  requiresContinuousDte: boolean;
  description: string;
}

const ARCHITECTURE_PROFILES: ArchitectureProfile[] = [
  {
    id: 'crewed-hls',
    name: 'Crewed Polar Lander (6.5d Surface Sortie)',
    category: 'LANDER',
    imageVariant: 'SYNODIC_SOLAR_CYCLE',
    maxSlopeDeg: 8.0,
    batterySurvivalHours: 48,
    minOperatingPowerWatts: 850,
    requiresContinuousDte: true,
    description: 'High-mass vertical crewed lander with tall vertical solar mast and strict touchdown tilt & DTE telemetry requirements.',
  },
  {
    id: 'clps-commercial',
    name: 'Commercial Robotic Lander (CLPS-Class)',
    category: 'LANDER',
    imageVariant: 'ARTEMIS_ASTRONAUT_EVA',
    maxSlopeDeg: 10.0,
    batterySurvivalHours: 24,
    minOperatingPowerWatts: 250,
    requiresContinuousDte: true,
    description: 'Single-lunation commercial payload delivery lander optimized for sunlit polar ridges with direct Earth line-of-sight.',
  },
  {
    id: 'volatile-rover',
    name: 'Polar Volatile Prospecting Rover (VIPER-Class)',
    category: 'ROVER',
    imageVariant: 'VIPER_POLAR_ROVER',
    maxSlopeDeg: 15.0,
    batterySurvivalHours: 72,
    minOperatingPowerWatts: 350,
    requiresContinuousDte: false,
    description: 'Mobile prospecting rover capable of traversing moderate slopes and surviving multi-day shadow transits between sunlit ridges.',
  },
  {
    id: 'rtg-autonomous-rover',
    name: 'RTG-Assisted PSR Explorer Rover',
    category: 'ROVER',
    imageVariant: 'APOLLO_17_PANORAMA',
    maxSlopeDeg: 18.0,
    batterySurvivalHours: 360,
    minOperatingPowerWatts: 0,
    requiresContinuousDte: false,
    description: 'Radioisotope-heated autonomous rover designed for prolonged excursions into Permanently Shadowed Regions via orbital relay.',
  },
];

export const MissionExtensionsLab: React.FC<MissionExtensionsLabProps> = ({ scenario }) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(ARCHITECTURE_PROFILES[0].id);
  const [customBatteryHours, setCustomBatteryHours] = useState<number | null>(null);
  const [customSlopeLimit, setCustomSlopeLimit] = useState<number | null>(null);

  const profile =
    ARCHITECTURE_PROFILES.find((p) => p.id === selectedProfileId) ?? ARCHITECTURE_PROFILES[0];

  const effectiveBatteryHours = customBatteryHours ?? profile.batterySurvivalHours;
  const effectiveSlopeLimit = customSlopeLimit ?? profile.maxSlopeDeg;

  const siteName = scenario.matchedPresetSite?.name || 'Custom Selenographic Site';
  const siteSlope = scenario.summary.localSlopeDeg;
  const siteDarkness = scenario.summary.maxContinuousDarknessHours;
  const sitePower = Math.round(scenario.instantaneousSun.estimatedElectricalPowerWatts);
  const siteDtePct = scenario.summary.earthVisibilityPct;

  const slopePass = siteSlope <= effectiveSlopeLimit;
  const batteryPass = siteDarkness <= effectiveBatteryHours;
  const powerPass = sitePower >= profile.minOperatingPowerWatts;
  const commPass = !profile.requiresContinuousDte || siteDtePct >= 75;

  const totalChecksPassed = [slopePass, batteryPass, powerPass, commPass].filter(Boolean).length;

  return (
    <section
      aria-label="Hypothetical Surface Asset Compatibility Lab"
      className="lunaris-glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] mt-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-400/30">
              <Sliders className="w-3.5 h-3.5" />
              Optional Mission Extension · HYPOTHETICAL SIMULATION
            </span>
            <span className="text-xs font-mono text-slate-400">
              Evaluated against {siteName} ({scenario.timeConfig.missionDurationDays}-day window)
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">
            Surface Asset &amp; Rover Compatibility What-If Lab
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
            Test how hypothetical lander and rover hardware envelopes (touchdown slope tolerance, eclipse battery survival hours, and DTE link dependency) interact with the real computed environment at {siteName}.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950/80 border border-white/[0.08] px-4 py-2.5 text-right shrink-0">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Envelope Compatibility
          </div>
          <div className="text-lg font-mono font-semibold text-white">
            {totalChecksPassed} / 4 Criteria Met
          </div>
        </div>
      </div>

      {/* Profile Selector Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {ARCHITECTURE_PROFILES.map((item) => {
          const active = item.id === profile.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedProfileId(item.id);
                setCustomBatteryHours(null);
                setCustomSlopeLimit(null);
              }}
              className={`group text-left rounded-2xl overflow-hidden border transition-all flex flex-col ${
                active
                  ? 'bg-sky-500/15 border-sky-400/50 text-white shadow-lg shadow-sky-950/40'
                  : 'bg-slate-900/60 border-white/[0.07] text-slate-300 hover:border-white/20'
              }`}
            >
              <NasaLunarImagePlate
                variant={item.imageVariant}
                className="h-28 w-full"
                overlayTag={item.category}
              />
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.06] text-sky-300">
                      {item.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Max {item.maxSlopeDeg}° · {item.batterySurvivalHours}h Bat
                    </span>
                  </div>
                  <div className="text-sm font-medium text-white mt-1">{item.name}</div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Parameter Overrides + 4 Constraint Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        {/* What-If Sliders */}
        <div className="rounded-2xl bg-slate-950/75 border border-white/[0.07] p-4 space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-sky-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            Hardware Envelope What-If Tuning
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Eclipse Battery Survival Capacity</span>
              <span className="font-mono text-amber-300">{effectiveBatteryHours} hours</span>
            </div>
            <input
              type="range"
              min={12}
              max={360}
              step={12}
              value={effectiveBatteryHours}
              onChange={(e) => setCustomBatteryHours(Number(e.target.value))}
              aria-label="Eclipse Battery Survival Capacity in hours"
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5">
              <span>12h (Short Sortie)</span>
              <span>150h (Multi-Day)</span>
              <span>360h (Full Night)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Max Safe Touchdown / Traverse Slope</span>
              <span className="font-mono text-sky-300">{effectiveSlopeLimit.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min={5}
              max={20}
              step={0.5}
              value={effectiveSlopeLimit}
              onChange={(e) => setCustomSlopeLimit(Number(e.target.value))}
              aria-label="Max Safe Touchdown or Traverse Slope in degrees"
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5">
              <span>5° (Strict Tall Lander)</span>
              <span>12° (Standard)</span>
              <span>20° (Rover)</span>
            </div>
          </div>
        </div>

        {/* 4 Hardware vs Site Comparison Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Check 1: Slope */}
          <div className="rounded-2xl bg-slate-900/65 border border-white/[0.07] p-3.5 flex items-start gap-3">
            {slopePass ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <Mountain className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-white">
                  Topographic Slope Margin
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Site slope <span className="font-mono text-white">{siteSlope.toFixed(1)}°</span> vs. hardware limit{' '}
                <span className="font-mono text-sky-300">{effectiveSlopeLimit.toFixed(1)}°</span>
              </div>
              <div className="text-[11px] font-mono mt-1 text-slate-400">
                {slopePass
                  ? `PASS · +${(effectiveSlopeLimit - siteSlope).toFixed(1)}° stability margin`
                  : `EXCEEDS LIMIT by ${(siteSlope - effectiveSlopeLimit).toFixed(1)}°`}
              </div>
            </div>
          </div>

          {/* Check 2: Darkness Survival */}
          <div className="rounded-2xl bg-slate-900/65 border border-white/[0.07] p-3.5 flex items-start gap-3">
            {batteryPass ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-white">
                  Eclipse Survival Duration
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Max darkness <span className="font-mono text-white">{siteDarkness}h</span> vs. storage{' '}
                <span className="font-mono text-amber-300">{effectiveBatteryHours}h</span>
              </div>
              <div className="text-[11px] font-mono mt-1 text-slate-400">
                {batteryPass
                  ? `PASS · Survives longest shadow window (${siteDarkness}h)`
                  : `DEFICIT · Needs +${siteDarkness - effectiveBatteryHours}h battery or hibernation`}
              </div>
            </div>
          </div>

          {/* Check 3: Instantaneous Power */}
          <div className="rounded-2xl bg-slate-900/65 border border-white/[0.07] p-3.5 flex items-start gap-3">
            {powerPass ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-white">
                  Solar Bus Power Output
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Current output <span className="font-mono text-white">{sitePower} W</span> vs. bus min{' '}
                <span className="font-mono text-amber-300">{profile.minOperatingPowerWatts} W</span>
              </div>
              <div className="text-[11px] font-mono mt-1 text-slate-400">
                {powerPass
                  ? `PASS · Array supports active payload operations`
                  : `LOW SOLAR · Switch to Vertical Mast or shift epoch to sunlit window`}
              </div>
            </div>
          </div>

          {/* Check 4: RF Architecture */}
          <div className="rounded-2xl bg-slate-900/65 border border-white/[0.07] p-3.5 flex items-start gap-3">
            {commPass ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-white">
                  RF Link Architecture
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Site DTE <span className="font-mono text-white">{siteDtePct.toFixed(1)}%</span> ·{' '}
                {profile.requiresContinuousDte ? 'Requires Direct Earth' : 'Orbital Relay Compatible'}
              </div>
              <div className="text-[11px] font-mono mt-1 text-slate-400">
                {commPass
                  ? `PASS · Communications link architecture satisfied`
                  : `RELAY REQUIRED · DTE below 75% threshold for direct-only asset`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
