import { expect, test } from 'vitest';
import { checkStageReport, functionalChecks } from '../../tools/release/stage-report';
import type { StageReport } from '../../tools/release/contracts';

const report: StageReport = {
  schemaVersion: 1,
  stage: 'functional',
  candidate: { sourceTreeHash: 'a'.repeat(64), catalogRevision: 'b'.repeat(64), configFingerprint: 'c'.repeat(64) },
  environment: { culture: 'en-US' },
  status: 'passed',
  checks: functionalChecks.map(id => ({ id, status: 'passed', evidencePath: `evidence/acceptance/${id}.json` })),
  visualWaivers: ['unverified-visual-nonblocking'],
  externalSetup: [],
};

test('functional acceptance stands alone and retains the visual waiver', () => {
  expect(checkStageReport('functional', report).passed).toBe(true);
  expect(checkStageReport('functional', { ...report, visualWaivers: ['visual-pass'] }).passed).toBe(false);
});

test.each(functionalChecks)('missing %s fails despite an external setup entry', id => {
  expect(checkStageReport('functional', {
    ...report, checks: report.checks.filter(check => check.id !== id), externalSetup: [id],
  }).passed).toBe(false);
});

test('failed, duplicate, wrong-stage and unsafe evidence entries fail', () => {
  const [first, ...rest] = report.checks;
  for (const invalid of [
    { ...report, checks: [{ ...first, status: 'failed' as const }, ...rest] },
    { ...report, checks: [...report.checks, first] },
    { ...report, stage: 'ui' as const },
    { ...report, checks: [{ ...first, evidencePath: '../outside.json' }, ...rest] },
  ]) expect(checkStageReport('functional', invalid).passed).toBe(false);
});

const uiReport: StageReport = {
  ...report, stage: 'ui',
  checks: ['desktop', 'mobile', 'print', 'protected-journeys', 'browser-matrix',
    'accessible-results', 'manual-accessibility', 'public-identity'].map(id => ({
      id, status: 'passed', evidencePath: `evidence/acceptance/ui-${id}.json`,
    })),
  environment: { physicalIPhone: 'not-tested' },
  externalSetup: ['physical-iphone-safari-not-tested'],
};

test('the physical iPhone waiver preserves mandatory mobile and matrix checks', () => {
  expect(checkStageReport('ui', uiReport).passed).toBe(true);
  for (const id of ['mobile', 'browser-matrix', 'accessible-results', 'manual-accessibility']) {
    expect(checkStageReport('ui', {
      ...uiReport, checks: uiReport.checks.map(check => check.id === id ? { ...check, status: 'failed' } : check),
    }).passed).toBe(false);
  }
  expect(checkStageReport('ui', { ...uiReport, checks: uiReport.checks.slice(1) }).passed).toBe(false);
  expect(checkStageReport('ui', {
    ...uiReport, environment: { physicalIPhone: 'not-tested' }, externalSetup: [],
  }).passed).toBe(false);
});
