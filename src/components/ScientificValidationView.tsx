import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Filter,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  ScientificValidationReport,
  runScientificValidationSuite,
} from '../science/validationSuite';
import { ScrollReveal } from '../motion/SmoothScrollProvider';

interface ScientificValidationViewProps {
  /** Pre-computed report (App runs the suite once at startup); falls back to running it here. */
  report?: ScientificValidationReport;
}

export const ScientificValidationView: React.FC<ScientificValidationViewProps> = ({
  report: providedReport,
}) => {
  const report = useMemo(
    () => providedReport ?? runScientificValidationSuite(),
    [providedReport]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const tc of report.results) {
      set.add(tc.category);
    }
    return ['ALL', ...Array.from(set)];
  }, [report.results]);

  const filteredResults = useMemo(() => {
    if (selectedCategory === 'ALL') return report.results;
    return report.results.filter((tc) => tc.category === selectedCategory);
  }, [report.results, selectedCategory]);

  return (
    <div className="space-y-8 pb-12">
      {/* Editorial Hero Header */}
      <ScrollReveal className="lunaris-surface-elevated rounded-3xl p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="lunaris-index-pill">
              <span>04 // VERIFICATION SUITE</span>
              <span>•</span>
              <span>AUTOMATED BENCHMARKS</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-lunar-50">
              Scientific Validation &amp; Reference Benchmarks
            </h2>
            <p className="text-sm sm:text-base text-lunar-300 leading-relaxed">
              Live verification of selenographic coordinate transformations, Julian Date &amp;
              Local True Solar Time (LTST) timekeeping, topocentric Sun/Earth geometry, finite
              solar-disc grazing limb math, cosine array projection, and Ka/X/S-Band Free-Space
              Path Loss.
            </p>
          </div>

          <div
            className={`px-4 py-3 rounded-2xl border font-mono text-xs font-semibold flex items-center gap-2.5 shrink-0 ${
              report.allPassed
                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300'
                : 'bg-rose-500/10 border-rose-400/40 text-rose-300'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-lunar-400">
                Suite Status
              </div>
              <div className="text-sm font-bold">
                {report.passedCount} / {report.totalCount} Benchmarks Passed
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-6 pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-lunar-400 mr-2">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            Domain:
          </span>
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors ${
                  active
                    ? 'bg-amber-500 text-space-950 font-semibold'
                    : 'bg-space-850 border border-white/10 text-lunar-300 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? `All (${report.totalCount})` : cat}
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Benchmark Cards + Detailed Table */}
      <ScrollReveal className="lunaris-surface rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-lunar-100">
              Deterministic Reference Test Cases ({filteredResults.length})
            </h3>
          </div>
          <span className="font-mono text-[11px] text-lunar-400">
            Executed in real time against src/science/lunarMath.ts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-space-950/60 font-mono text-[11px] text-lunar-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Benchmark ID</th>
                <th className="py-3.5 px-5">Specification &amp; Physical Law</th>
                <th className="py-3.5 px-5">Expected Reference</th>
                <th className="py-3.5 px-5">Computed Output</th>
                <th className="py-3.5 px-5">Error / Tolerance</th>
                <th className="py-3.5 px-5">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] font-mono">
              {filteredResults.map((tc) => (
                <tr
                  key={tc.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-4 px-5 align-top">
                    <div className="text-amber-300 font-semibold">{tc.id}</div>
                    <div className="text-[11px] text-lunar-400 mt-0.5">{tc.category}</div>
                  </td>
                  <td className="py-4 px-5 align-top font-sans max-w-md">
                    <div className="text-lunar-100 font-medium text-xs sm:text-sm">
                      {tc.title}
                    </div>
                    <div className="text-xs text-lunar-400 mt-1 leading-relaxed">
                      {tc.referenceDescription}
                    </div>
                  </td>
                  <td className="py-4 px-5 align-top text-lunar-200 tabular-nums">
                    {tc.expectedValue}
                  </td>
                  <td className="py-4 px-5 align-top text-amber-200 font-medium tabular-nums">
                    {tc.actualValue}
                  </td>
                  <td className="py-4 px-5 align-top text-lunar-300 tabular-nums">
                    {tc.absoluteError} &le; {tc.tolerance} {tc.unit}
                  </td>
                  <td className="py-4 px-5 align-top">
                    {tc.passed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-400/40 text-rose-300 text-[11px] font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> FAIL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollReveal>
    </div>
  );
};
