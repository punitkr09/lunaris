import { build } from 'esbuild';
import { unlinkSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';

const outFile = path.resolve('scripts/.validation-bundle.mjs');

await build({
  entryPoints: ['src/science/validationSuite.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: outFile,
  logLevel: 'silent',
});

const mod = await import(pathToFileURL(outFile).href);
const report = mod.runScientificValidationSuite();

console.log('================================================================================');
console.log(' LUNARIS v2.0 — AUTOMATED SCIENTIFIC VALIDATION & REFERENCE BENCHMARK SUITE');
console.log('================================================================================');

for (const tc of report.results) {
  const badge = tc.passed ? '[PASS]' : '[FAIL]';
  console.log(`${badge} ${tc.id} (${tc.category}): ${tc.title}`);
  console.log(`       Expected : ${tc.expectedValue}`);
  console.log(`       Actual   : ${tc.actualValue} (Abs Error: ${tc.absoluteError} <= ${tc.tolerance} ${tc.unit})`);
}

console.log('--------------------------------------------------------------------------------');
console.log(` SUMMARY: ${report.passedCount} / ${report.totalCount} Scientific Benchmarks Passed.`);
console.log('================================================================================');

try {
  unlinkSync(outFile);
} catch {}

if (!report.allPassed) {
  process.exit(1);
}
