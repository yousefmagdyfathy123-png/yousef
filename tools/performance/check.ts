export type Measurement = { unit: string; samples: number; p50: number; p95: number; max: number };
export type PerformanceReport = {
  environment: string; metrics: Record<string, Measurement>; semantics: Record<string, boolean>; failures: number;
};
export type PerformanceBudgets = {
  status: 'proposed' | 'approved'; environment: string; maximumFailures: number;
  targets: Record<string, { unit: string; minSamples: number; p95: number; max: number }>;
};

export function checkPerformance(
  report: PerformanceReport, budgets: PerformanceBudgets, requiredMetrics: readonly string[], requiredScenarios: readonly string[],
) {
  const failures: string[] = [];
  const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;
  if (budgets.status !== 'approved') failures.push('Performance budgets await user approval');
  if (!report.environment || report.environment !== budgets.environment) failures.push('Performance environment mismatch');
  if (![report.failures, budgets.maximumFailures].every(value => Number.isSafeInteger(value) && value >= 0) ||
      report.failures > budgets.maximumFailures) failures.push('Invalid or excessive operation failures');
  for (const scenario of requiredScenarios) {
    if (report.semantics[scenario] !== true) failures.push('Missing semantic verification: ' + scenario);
  }
  for (const id of requiredMetrics) {
    const value = report.metrics[id];
    const target = budgets.targets[id];
    if (!value || !target || !target.unit || target.unit !== value.unit ||
        !Number.isSafeInteger(target.minSamples) || target.minSamples < 1 ||
        !Number.isSafeInteger(value.samples) || value.samples < target.minSamples ||
        ![target.p95, target.max, value.p50, value.p95, value.max].every(nonnegative) ||
        value.p50 > value.p95 || value.p95 > value.max || target.p95 > target.max) {
      failures.push('Missing or invalid measurement or budget: ' + id);
    } else if (value.p95 > target.p95 || value.max > target.max) {
      failures.push('Exceeded budget: ' + id);
    }
  }
  return { passed: failures.length === 0, failures };
}
