import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { checkPerformance, type Measurement } from '../performance/check';
import { summarize } from '../performance/measurements';
import { releaseCandidate } from './candidate';
import type { StageReport } from './contracts';
import { checkStageReport } from './stage-report';

const read = (name: string) => JSON.parse(readFileSync('evidence/performance/' + name + '.json', 'utf8'));
const baseline = read('baseline');
type Stage = { concurrency: number; completed: number; failures: number; stopReason?: string;
  metrics?: { latencyMs: Omit<Measurement, 'unit'>; responseBytes: Omit<Measurement, 'unit'> } };
const load: { candidate: unknown; environment: unknown; limits: { requests: number }; stages: Stage[];
  serverMemory?: { rss: number; heapUsed: number }[] } = read('load-report');
const receipts = read('receipt-window');
const budgets = read('budgets');
const candidate = await releaseCandidate({ culture: 'en-US', profile: 'local-performance' });
const matchingCandidate = [baseline, load].every(report => JSON.stringify(report.candidate) === JSON.stringify(candidate));
const environment = createHash('sha256').update(JSON.stringify({
  browser: baseline.environment, load: load.environment, limits: load.limits,
})).digest('hex');

const metrics: Record<string, Measurement> = {};
for (const phase of ['create', 'changeClass', 'search', 'selectSearchHit', 'reload']) {
  if (baseline.samples?.[phase]?.length) metrics[phase] = { ...summarize(baseline.samples[phase]), unit: 'ms' };
}
const target = load.stages.find(stage => stage.concurrency === 2);
if (target?.metrics) {
  metrics.loadLatency = { ...target.metrics.latencyMs, unit: 'ms' };
  metrics.loadResponse = { ...target.metrics.responseBytes, unit: 'bytes' };
}
if (baseline.restart?.verified) metrics.resume = { ...summarize([baseline.restart.resumeMs]), unit: 'ms' };
const memory = [...(baseline.serverMemory ?? []), ...(load.serverMemory ?? [])];
if (memory.length) {
  metrics.rss = { ...summarize(memory.map(sample => sample.rss)), unit: 'bytes' };
  metrics.heap = { ...summarize(memory.map(sample => sample.heapUsed)), unit: 'bytes' };
}

const required = ['create', 'changeClass', 'search', 'selectSearchHit', 'reload', 'loadLatency', 'loadResponse', 'resume', 'rss', 'heap'];
const semantics = {
  exactCandidate: matchingCandidate,
  restartAndResume: baseline.restart?.verified === true,
  sourceDrawing: baseline.representativeDrawing?.verified === true,
  boundedLoad: target?.completed === load.limits.requests && !target.stopReason,
  receiptWindow: receipts.operations >= 2000 && receipts.maximumLiveReceipts === 100 &&
    receipts.verified.includes('cursor and buffers after logical restoration'),
};
const failures = load.stages.reduce((count, stage) => count + stage.failures, 0);
const result = checkPerformance({ environment, metrics, semantics, failures }, budgets, required, Object.keys(semantics));
const evidencePath = 'evidence/acceptance/performance-budget.json';
const report: StageReport = {
  schemaVersion: 1, stage: 'performance', candidate, environment: {
    profile: 'local-performance', fingerprint: environment, browser: baseline.environment.browser,
  }, status: result.passed ? 'passed' : 'failed',
  checks: [{ id: 'performance-budget', status: result.passed ? 'passed' : 'failed', evidencePath }],
  visualWaivers: [], externalSetup: budgets.status === 'approved' ? [] : ['Measured budget review pending'],
};
const save = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
save(evidencePath, { candidate, environment, metrics, semantics, failures, result });
const gate = checkStageReport('performance', report);
report.status = gate.passed ? 'passed' : 'failed';
if (!process.argv.includes('--check')) save('evidence/acceptance/performance.json', report);
console.log(JSON.stringify({ ...result, metrics, semantics, environment }, null, 2));
process.exitCode = gate.passed ? 0 : 1;
