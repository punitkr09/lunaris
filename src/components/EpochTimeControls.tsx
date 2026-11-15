import React from 'react';
import {
  Calendar,
  Clock,
  FastForward,
  Pause,
  Play,
  Rewind,
  SunMedium,
} from 'lucide-react';
import { MissionScenarioData, UserExperienceMode } from '../types/navigation';
import { SYNODIC_MONTH_HOURS, formatLunarLocalSolarTime } from '../science/lunarMath';

interface EpochTimeControlsProps {
  scenario: MissionScenarioData;
  isPlaying: boolean;
  playbackSpeed: number;
  uxMode: UserExperienceMode;
  onTogglePlay: () => void;
  onChangePlaybackSpeed: (speed: number) => void;
  onChangeEpochUtc: (isoUtc: string) => void;
  onChangeElapsedHours: (hours: number) => void;
  onChangeDurationDays: (days: number) => void;
  onShiftLunarLocalHour: (targetLunarHour: number) => void;
}

const ARTEMIS_EPOCH_PRESETS = [
  { label: 'Nov 2026', iso: '2026-11-15T12:00:00Z' },
  { label: 'Jan 2027 Solstice', iso: '2027-01-19T06:00:00Z' },
  { label: 'May 2027 Equinox', iso: '2027-05-08T18:00:00Z' },
  { label: 'Sep 2028', iso: '2028-09-22T00:00:00Z' },
];

export const EpochTimeControls: React.FC<EpochTimeControlsProps> = ({
  scenario,
  isPlaying,
  playbackSpeed,
  uxMode,
  onTogglePlay,
  onChangePlaybackSpeed,
  onChangeEpochUtc,
  onChangeElapsedHours,
  onChangeDurationDays,
  onShiftLunarLocalHour,
}) => {
  const { timeConfig } = scenario;
  const totalHours = timeConfig.missionDurationDays * 24;
  const dateTimeLocalValue = timeConfig.epochIsoUtc.slice(0, 16);

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const iso = val.endsWith('Z') ? val : `${val}:00Z`;
    onChangeEpochUtc(iso);
  };

  const formattedLtst = formatLunarLocalSolarTime(timeConfig.lunarLocalSolarHour);

  const stepTime = (deltaHours: number) => {
    const next = Math.max(0, Math.min(totalHours, timeConfig.elapsedHours + deltaHours));
    onChangeElapsedHours(next);
  };

  const shiftLandingEpochHours = (deltaHours: number) => {
    const parsed = Date.parse(timeConfig.epochIsoUtc);
    const baseMs = Number.isNaN(parsed) ? Date.UTC(2026, 10, 15, 12, 0, 0) : parsed;
    const nextIso = new Date(baseMs + deltaHours * 3600000).toISOString().slice(0, 19) + 'Z';
    onChangeEpochUtc(nextIso);
  };

  return (
    <section className="lunaris-surface rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-lunar-200" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-lunar-100">Mission Time &amp; Playback</h3>
            <p className="text-xs text-lunar-400">
              Select landing date, time window, and simulation speed
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {formattedLtst}
        </span>
      </div>

      {uxMode === 'EDUCATOR' && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-lunar-300 leading-relaxed">
          One lunar day-night cycle lasts <strong>29.53 Earth days</strong>. At 12:00 LTST (Local True Solar Time), the Sun reaches its highest point at your selected site.
        </div>
      )}

      {/* Time Standard Readout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <span className="text-[10px] text-lunar-400 block">Current UTC</span>
          <span className="text-xs font-semibold text-lunar-100 tabular-nums">
            {timeConfig.currentIsoUtc.slice(0, 16).replace('T', ' ')}
          </span>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <span className="text-[10px] text-lunar-400 block">Elapsed (MET)</span>
          <span className="text-xs font-semibold text-amber-300 tabular-nums">
            T+{timeConfig.elapsedHours}h (Day {(timeConfig.elapsedHours / 24).toFixed(1)})
          </span>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <span className="text-[10px] text-lunar-400 block">Julian Date</span>
          <span className="text-xs font-semibold text-lunar-200 tabular-nums">
            {timeConfig.julianDate.toFixed(3)}
          </span>
        </div>
        <div className="p-2.5 rounded-xl lunaris-surface-subtle">
          <span className="text-[10px] text-lunar-400 block">Window</span>
          <span className="text-xs font-semibold text-lunar-200 tabular-nums">
            {timeConfig.missionDurationDays} Days
          </span>
        </div>
      </div>

      {/* Date / Epoch & Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-[11px] text-lunar-400 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Landing Epoch (UTC)
          </label>
          <input
            type="datetime-local"
            value={dateTimeLocalValue}
            onChange={handleDateInput}
            className="w-full bg-space-950 border border-white/10 focus:border-amber-400/60 focus:outline-none rounded-xl px-3 py-1.5 text-xs font-mono text-lunar-100"
          />
        </div>

        <div>
          <div className="text-[11px] text-lunar-400 mb-1.5">Mission Stay Duration</div>
          <div className="grid grid-cols-4 gap-1.5">
            {[7, 14, 28, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onChangeDurationDays(days)}
                className={`py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  timeConfig.missionDurationDays === days
                    ? 'bg-sky-500 text-space-950 border-sky-400 font-semibold'
                    : 'bg-space-850 border-white/10 text-lunar-300 hover:text-white'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Delay / Launch Slip Controls */}
      <div className="p-2.5 rounded-xl bg-space-950/75 border border-white/[0.07] space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-lunar-400">
          <span>Schedule Delay / Launch Slip Simulation</span>
          <span className="text-sky-300">Shift Landing Date</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: '-7d', hours: -168, title: 'Shift landing epoch 7 days earlier' },
            { label: '-1d', hours: -24, title: 'Shift landing epoch 1 day earlier' },
            { label: '+1d Delay', hours: 24, title: 'Simulate 24-hour launch scrub delay' },
            { label: '+7d Delay', hours: 168, title: 'Simulate 1-week launch delay' },
            { label: '+14.8d Lunar Flip', hours: Math.round(SYNODIC_MONTH_HOURS / 2), title: 'Shift by half a synodic month (14.77 days) — flips lunar day and night' },
            { label: '+29.5d Next Cycle', hours: Math.round(SYNODIC_MONTH_HOURS), title: 'Advance by 1 full synodic month (29.53 days) to the same lighting phase' },
          ].map((slip) => (
            <button
              key={slip.label}
              type="button"
              onClick={() => shiftLandingEpochHours(slip.hours)}
              title={slip.title}
              className="px-2.5 py-1 rounded-lg bg-space-900 hover:bg-sky-500/20 border border-white/10 hover:border-sky-400/50 text-[11px] font-mono text-lunar-200 hover:text-sky-200 transition-colors"
            >
              {slip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Epoch Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-lunar-400 mr-1">Windows:</span>
        {ARTEMIS_EPOCH_PRESETS.map((preset) => (
          <button
            key={preset.iso}
            type="button"
            onClick={() => onChangeEpochUtc(preset.iso)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
              timeConfig.epochIsoUtc === preset.iso
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                : 'bg-space-850 border-white/[0.07] text-lunar-400 hover:text-lunar-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Scrubber Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-lunar-400 font-mono">
          <span>T+0h</span>
          <span className="text-lunar-200">
            Elapsed: T+{timeConfig.elapsedHours}h / {totalHours}h
          </span>
          <span>T+{totalHours}h</span>
        </div>
        <input
          type="range"
          min={0}
          max={totalHours}
          step={1}
          value={timeConfig.elapsedHours}
          onChange={(e) => onChangeElapsedHours(parseInt(e.target.value, 10))}
          aria-label="Mission elapsed hours scrubber"
          className="w-full cursor-pointer"
        />
      </div>

      {/* Playback & Step Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.07]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 border border-amber-400/60 text-amber-200'
                : 'bg-amber-500 hover:bg-amber-400 text-space-950'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={() => stepTime(-24)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-space-850 border border-white/10 text-xs text-lunar-300 hover:text-white"
            title="Step back 24 hours"
          >
            <Rewind className="w-3 h-3" />
            -24h
          </button>
          <button
            type="button"
            onClick={() => stepTime(24)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-space-850 border border-white/10 text-xs text-lunar-300 hover:text-white"
            title="Step forward 24 hours"
          >
            +24h
            <FastForward className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 6, 12].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onChangePlaybackSpeed(spd)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                playbackSpeed === spd
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-space-850 border-white/[0.07] text-lunar-400 hover:text-white'
              }`}
            >
              {spd}×
            </button>
          ))}

          <button
            type="button"
            onClick={() => onShiftLunarLocalHour(12)}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-space-850 border border-white/10 text-[11px] text-lunar-300 hover:text-amber-300"
            title="Jump to Lunar Local Solar Noon"
          >
            <SunMedium className="w-3 h-3 text-amber-400" />
            Noon
          </button>
        </div>
      </div>
    </section>
  );
};
