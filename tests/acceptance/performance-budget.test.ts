import { expect, test } from 'vitest';
import { summarize } from '../../tools/performance/measurements';

test('percentiles use nearest rank and keep the measured tail', () => {
  expect(summarize([70, 10, 40, 30, 20, 60, 50])).toEqual({
    samples: 7, p50: 40, p95: 70, max: 70,
  });
});

test.each([[], [-1], [Infinity], [NaN]])('invalid measurement samples are rejected (%j)', (...values) => {
  expect(() => summarize(values)).toThrow();
});
import { checkPerformance, type PerformanceReport, type PerformanceBudgets } from '../../tools/performance/check';

const report: PerformanceReport = {
  environment: 'fixture',
  metrics: { latency: { samples: 20, p50: 2, p95: 4, max: 5, unit: 'ms' } },
  semantics: { resumed: true }, failures: 0,
};
const limits: PerformanceBudgets = {
  status: 'approved', environment: 'fixture', maximumFailures: 0,
  targets: { latency: { unit: 'ms', minSamples: 15, p95: 4, max: 6 } },
};

test('budget checker admits a complete matching measurement', () => {
  expect(checkPerformance(report, limits, ['latency'], ['resumed']).passed).toBe(true);
});

test.each([
  ['environment drift', { ...report, environment: 'other' }, limits],
  ['missing semantics', { ...report, semantics: {} }, limits],
  ['errors', { ...report, failures: 1 }, limits],
  ['few samples', { ...report, metrics: { latency: { ...report.metrics.latency, samples: 2 } } }, limits],
  ['tail above budget', { ...report, metrics: { latency: { ...report.metrics.latency, max: 7 } } }, limits],
  ['p95 above budget', { ...report, metrics: { latency: { ...report.metrics.latency, p95: 5 } } }, limits],
  ['missing target', report, { ...limits, targets: {} }],
  ['pending approval', report, { ...limits, status: 'proposed' as const }],
] as const)('budget checker rejects %s', (_name, measured, budget) => {
  expect(checkPerformance(measured, budget, ['latency'], ['resumed']).passed).toBe(false);
});
