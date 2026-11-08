export function summarize(values: readonly number[]) {
  if (!values.length || values.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('Expected nonempty, finite, nonnegative measurements');
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted[sorted.length - 1],
  };
}
