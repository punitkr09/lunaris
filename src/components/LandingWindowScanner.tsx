import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarSearch, Crosshair, Sparkles, Trophy } from 'lucide-react';
import {
  CommHardwareConfig,
  LandingWindowCandidate,
  LunarCoordinates,
  SolarHardwareConfig,
  UserExperienceMode,
} from '../types/navigation';
import { ILunarNavigationProvider } from '../services/LunarDataProvider';
import {
  LandingWindowRankingMetric,
  pickBestLandingWindow,
  scanLandingWindows,
} from '../science/landingWindowScan';

interface LandingWindowScannerProps {
  provider: ILunarNavigationProvider;
  siteName: string;
  coordinates: LunarCoordinates;
  currentEpochIsoUtc: string;
  missionDurationDays: number;
  solarHardware: SolarHardwareConfig;
  commHardware: CommHardwareConfig;
  uxMode: UserExperienceMode;
  onApplyEpoch: (isoUtc: string) => void;
}

const METRIC_OPTIONS: {
  id: LandingWindowRankingMetric;
  label: string;
  unit: string;
  dataKey: keyof LandingWindowCandidate;
  describe: string;
}[] = [
  {
    id: 'NOMINAL_OPS_HOURS',
    label: 'Sun + DTE Hours',
    unit: 'h',
    dataKey: 'nominalOpsHours',
    describe: 'hours with simultaneous sunlight and a Direct-to-Earth link (EVA-ready time)',
  },
  {
    id: 'SOLAR_AVAILABILITY',
    label: 'Solar Duty %',
    unit: '%',
    dataKey: 'solarAvailabilityPct',
    describe: 'share of the stay with the solar disc clear of the terrain mask',
  },
  {
    id: 'MIN_BLACKOUT',
    label: 'Least Blackout',
    unit: 'h',
    dataKey: 'criticalBlackoutHours',
    describe: 'hours with neither sunlight nor any comm link (lower is better)',
  },
  {
    id: 'VIABILITY_SCORE',
    label: 'Screening Score',
    unit: '/100',
    dataKey: 'overallViabilityScore',
    describe: 'composite screening index (inputs & weights disclosed in Chapter 05)',
  },
];

const SCAN_SPAN_DAYS = 30;

/**
 * Landing Window Scanner — sweeps the next synodic month of landing dates for the active
 * site and ranks them with the same engine used everywhere else in LUNARIS.
 */
export const LandingWindowScanner: React.FC<LandingWindowScannerProps> = ({
  provider,
  siteName,
  coordinates,
  currentEpochIsoUtc,
  missionDurationDays,
  solarHardware,
  commHardware,
  uxMode,
  onApplyEpoch,
}) => {
  const [metric, setMetric] = useState<LandingWindowRankingMetric>('NOMINAL_OPS_HOURS');
  const metricCfg = METRIC_OPTIONS.find((m) => m.id === metric) ?? METRIC_OPTIONS[0];

  const candidates = useMemo(
    () =>
      scanLandingWindows(provider, {
        coordinates,
        originEpochIsoUtc: currentEpochIsoUtc,
        missionDurationDays,
        solarHardware,
        commHardware,
        spanDays: SCAN_SPAN_DAYS,
        stepDays: 1,
      }),
    [provider, coordinates, currentEpochIsoUtc, missionDurationDays, solarHardware, commHardware]
  );

  const best = useMemo(() => pickBestLandingWindow(candidates, metric), [candidates, metric]);
  const current = candidates[0] ?? null;

  if (!current || !best) {
    return null;
  }

  const bestIsCurrent = best.offsetDays === 0;
  const valueOf = (c: LandingWindowCandidate) => Number(c[metricCfg.dataKey]);
  const delta = valueOf(best) - valueOf(current);

  return (
    <section
      aria-label="Landing Window Scanner"
      className="lunaris-surface rounded-2xl p-4 sm:p-5 flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center">
            <CalendarSearch className="w-4 h-4 text-sky-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-lunar-100">Landing Window Scanner</h3>
            <p className="text-xs text-lunar-400">
              Next {SCAN_SPAN_DAYS} days of landing dates at {siteName} · {missionDurationDays}-day stay each
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Ranking metric">
          {METRIC_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                metric === m.id
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                  : 'bg-space-850 border-white/[0.07] text-lunar-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {uxMode === 'EDUCATOR' && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-lunar-300 leading-relaxed">
          Because the lunar day lasts 29.5 Earth days, landing a few days earlier or later can
          swap sunlight for shadow. Each bar is a full mission simulation for that landing date;
          the brightest bar is the best date for the chosen metric.
        </div>
      )}

      {/* Verdict strip */}
      <div
        className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs ${
          bestIsCurrent
            ? 'bg-emerald-500/10 border-emerald-400/30'
            : 'bg-sky-500/10 border-sky-400/30'
        }`}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <Trophy className={`w-4 h-4 shrink-0 mt-0.5 ${bestIsCurrent ? 'text-emerald-300' : 'text-sky-300'}`} />
          <div className="space-y-0.5 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-lunar-400">
              Best landing date by {metricCfg.label}
            </div>
            <div className="text-lunar-100">
              {bestIsCurrent ? (
                <>
                  Your current epoch <strong className="text-white">{current.epochIsoUtc.slice(0, 10)}</strong>{' '}
                  is already the best of the next {SCAN_SPAN_DAYS} days ({valueOf(current)}
                  {metricCfg.unit}).
                </>
              ) : (
                <>
                  Landing on <strong className="text-white">{best.epochIsoUtc.slice(0, 10)}</strong> (
                  {best.offsetDays > 0 ? '+' : ''}
                  {best.offsetDays}d) yields{' '}
                  <strong className="font-mono text-white">
                    {valueOf(best)}
                    {metricCfg.unit}
                  </strong>{' '}
                  vs.{' '}
                  <span className="font-mono">
                    {valueOf(current)}
                    {metricCfg.unit}
                  </span>{' '}
                  now (
                  <span className={`font-mono ${(metric === 'MIN_BLACKOUT' ? delta <= 0 : delta >= 0) ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {delta > 0 ? '+' : ''}
                    {Number(delta.toFixed(1))}
                    {metricCfg.unit}
                  </span>
                  ) — {metricCfg.describe}.
                </>
              )}
            </div>
          </div>
        </div>
        {!bestIsCurrent && (
          <button
            type="button"
            onClick={() => onApplyEpoch(best.epochIsoUtc)}
            className="px-3.5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-space-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Apply {best.epochIsoUtc.slice(0, 10)}
          </button>
        )}
      </div>

      {/* Bar chart of the metric vs landing-date offset */}
      <div className="h-[190px] w-full bg-space-950/70 p-3 rounded-xl border border-white/[0.07]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={candidates} margin={{ top: 10, right: 12, left: -16, bottom: 2 }}>
            <CartesianGrid stroke="#1c202a" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="offsetDays"
              type="number"
              domain={[-0.5, SCAN_SPAN_DAYS + 0.5]}
              tickCount={7}
              tickFormatter={(v) => `+${v}d`}
              stroke="#646b78"
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8e95a2' }}
            />
            <YAxis
              stroke="#646b78"
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8e95a2' }}
              tickFormatter={(v) => `${v}${metricCfg.unit === '/100' ? '' : metricCfg.unit}`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                backgroundColor: '#0B0D12',
                borderColor: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: '#E6E8EC',
              }}
              labelFormatter={(label) => {
                const c = candidates.find((x) => x.offsetDays === Number(label));
                return c ? `Land ${c.epochIsoUtc.slice(0, 10)} (+${label}d)` : `+${label}d`;
              }}
              formatter={(value: number, _name, item) => {
                const c = item?.payload as LandingWindowCandidate | undefined;
                const extra = c
                  ? ` · Sun ${c.solarAvailabilityPct}% · DTE ${c.earthVisibilityPct}% · Dark max ${c.maxContinuousDarknessHours}h`
                  : '';
                return [`${value}${metricCfg.unit}${extra}`, metricCfg.label];
              }}
            />
            <ReferenceLine
              x={0}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{ value: 'Current', fill: '#fcd34d', fontSize: 9, position: 'insideTopLeft' }}
            />
            <Bar
              dataKey={metricCfg.dataKey}
              isAnimationActive={false}
              radius={[3, 3, 0, 0]}
              onClick={(entry) => {
                const c = entry as unknown as LandingWindowCandidate;
                if (c?.epochIsoUtc) onApplyEpoch(c.epochIsoUtc);
              }}
              className="cursor-pointer"
            >
              {candidates.map((c) => (
                <Cell
                  key={c.epochIsoUtc}
                  fill={
                    c.offsetDays === best.offsetDays
                      ? '#38bdf8'
                      : c.offsetDays === 0
                        ? '#f59e0b'
                        : 'rgba(148, 163, 184, 0.45)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-lunar-400">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          Click any bar to make that date the landing epoch
        </span>
        <span>
          {candidates.length} full-mission simulations · same analytical ephemeris &amp; synthetic horizon mask as all panels
        </span>
      </div>
    </section>
  );
};
