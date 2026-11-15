import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, BatteryCharging, Radio, Sun } from 'lucide-react';
import {
  MissionScenarioData,
  OperationalWindowState,
  UserExperienceMode,
} from '../types/navigation';

interface MissionTimelinePanelProps {
  scenario: MissionScenarioData;
  uxMode: UserExperienceMode;
  onSelectHourOffset: (hourOffset: number) => void;
}

/** Shared across every readiness bar in the app so identical states always read the same colour. */
export const STATE_COLORS: Record<OperationalWindowState, { bg: string; label: string }> = {
  NOMINAL_OPS: { bg: 'bg-emerald-500', label: 'Sun + Direct Comm' },
  SOLAR_ONLY_RELAY: { bg: 'bg-amber-400', label: 'Sun + No Direct Comm' },
  ECLIPSE_DTE_COMM: { bg: 'bg-sky-500', label: 'Shadow + Comm (DTE/Relay)' },
  CRITICAL_BLACKOUT: { bg: 'bg-rose-500/80', label: 'Shadow + No Comm' },
};

export const MissionTimelinePanel: React.FC<MissionTimelinePanelProps> = ({
  scenario,
  uxMode,
  onSelectHourOffset,
}) => {
  const { timeline, transitionEvents, timeConfig, summary } = scenario;
  const totalHours = timeConfig.missionDurationDays * 24;

  return (
    <section className="lunaris-surface rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Header & Summary KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-lunar-100">
              {timeConfig.missionDurationDays}-Day Mission Timeline
            </h3>
            <p className="text-xs text-lunar-400">
              Sunlight &amp; Earth clearance above local terrain (synthetic horizon mask)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-lunar-400">Sun:</span>
            <strong className="text-amber-300 tabular-nums">
              {summary.solarAvailabilityPct}% ({summary.totalIlluminatedHours}h)
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-lunar-300" />
            <span className="text-lunar-400">Direct Comm:</span>
            <strong className="text-lunar-100 tabular-nums">
              {summary.earthVisibilityPct}% ({summary.totalDteCommHours}h)
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-lunar-400">Energy:</span>
            <strong className="text-emerald-300 tabular-nums">
              {summary.cumulativeEnergyKwh} kWh
            </strong>
          </div>
        </div>
      </div>

      {uxMode === 'EDUCATOR' && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-lunar-300 leading-relaxed">
          Values above <strong>0°</strong> mean the Sun or Earth is visible above surrounding crater ridges. Click any point on the readiness bar or chart to inspect that hour.
        </div>
      )}

      {/* Synchronized Multi-Track Operational Window Strip */}
      <div className="space-y-2 bg-space-950/70 p-3 rounded-xl border border-white/[0.07]">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-lunar-400">
          <span>Operational Windows (click to jump)</span>
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(STATE_COLORS).map(([key, cfg]) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full inline-block ${cfg.bg}`} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full h-4 flex rounded-full overflow-hidden border border-white/10 bg-space-900">
          {timeline.map((pt) => {
            const isCurrent =
              Math.abs(pt.hourOffset - timeConfig.elapsedHours) <=
              (timeConfig.missionDurationDays <= 7 ? 1 : 2);
            const stateStyle = STATE_COLORS[pt.operationalState];
            return (
              <button
                key={pt.hourOffset}
                type="button"
                onClick={() => onSelectHourOffset(pt.hourOffset)}
                title={`T+${pt.hourOffset}h (${pt.timestampUtc}) — ${stateStyle.label} | Power: ${pt.electricalPowerWatts}W`}
                className={`flex-1 h-full transition-opacity ${stateStyle.bg} ${
                  isCurrent
                    ? 'ring-2 ring-white z-10 opacity-100'
                    : 'opacity-70 hover:opacity-100'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Interactive Recharts Elevation & Clearance Chart */}
      <div className="h-[245px] w-full bg-space-950/70 p-3 rounded-xl border border-white/[0.07]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={timeline}
            margin={{ top: 14, right: 16, left: -12, bottom: 2 }}
            onClick={(state) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const clickedHour = state.activePayload[0].payload.hourOffset;
                if (typeof clickedHour === 'number') {
                  onSelectHourOffset(clickedHour);
                }
              }
            }}
          >
            <defs>
              <linearGradient id="sunClearanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="earthClearanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1c202a" strokeDasharray="3 3" />
            {/* Numeric axis: the "Now" ReferenceLine must render for ANY elapsed hour, not only sampled ones */}
            <XAxis
              dataKey="hourOffset"
              type="number"
              domain={[0, totalHours]}
              allowDataOverflow
              tickCount={8}
              tickFormatter={(val) => `T+${val}h`}
              stroke="#646b78"
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8e95a2' }}
            />
            <YAxis
              stroke="#646b78"
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#8e95a2' }}
              tickFormatter={(val) => `${val}°`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B0D12',
                borderColor: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: '#E6E8EC',
              }}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                return `T+${label}h · ${item?.timestampUtc || ''} (LTST ${item?.lunarLocalHour?.toFixed(1)}h)`;
              }}
            />
            <ReferenceLine
              y={0}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{
                value: '0° Horizon Mask',
                fill: '#8e95a2',
                fontSize: 9,
                position: 'insideBottomRight',
              }}
            />

            {transitionEvents.slice(0, 8).map((ev, idx) => (
              <ReferenceLine
                key={`ev-${ev.kind}-${ev.hourOffset}-${idx}`}
                x={ev.hourOffset}
                stroke={
                  ev.kind === 'SUNRISE'
                    ? '#f59e0b'
                    : ev.kind === 'SUNSET'
                    ? '#fb7185'
                    : '#10b981'
                }
                strokeDasharray="2 2"
                label={{
                  value: ev.kind,
                  fill:
                    ev.kind === 'SUNRISE'
                      ? '#fcd34d'
                      : ev.kind === 'SUNSET'
                      ? '#fda4af'
                      : '#6ee7b7',
                  fontSize: 8,
                  position: 'insideTopLeft',
                }}
              />
            ))}

            <ReferenceLine
              x={timeConfig.elapsedHours}
              stroke="#ffffff"
              strokeWidth={1.8}
              label={{
                value: `Now T+${timeConfig.elapsedHours}h`,
                fill: '#f5f6f8',
                fontSize: 10,
                position: 'top',
              }}
            />
            <Area
              type="monotone"
              dataKey="sunClearanceDeg"
              name="Sun Ridge Clearance (°)"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#sunClearanceGrad)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="earthClearanceDeg"
              name="Earth Ridge Clearance (°)"
              stroke="#cbd5e1"
              strokeWidth={1.8}
              fill="url(#earthClearanceGrad)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="sunHorizonMaskDeg"
              name="Terrain Mask at Sun Az (°)"
              stroke="#fb7185"
              strokeWidth={1.2}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
