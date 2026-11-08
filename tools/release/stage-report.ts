import type { StageCheck, StageReport } from './contracts';

export const functionalChecks = [
  'source-preservation', 'source-coverage', 'independent-references', 'unit',
  'integration', 'http-request-protection', 'workspace-assets', 'paid-reconciliation',
  'trial-registry', 'state-codec', 'workspace-preferences', 'typecheck', 'build',
] as const;

export const uiChecks = [
  'desktop', 'mobile', 'print', 'protected-journeys', 'browser-matrix',
  'accessible-results', 'manual-accessibility', 'public-identity',
] as const;

export const performanceChecks = ['performance-budget'] as const;

const sha256 = /^[0-9a-f]{64}$/;
const evidencePath = /^evidence\/(?:[\w-]+\/)*[\w.-]+$/;

export function checkStageReport(stage: StageReport['stage'], report: StageReport): StageCheck {
  const failures: string[] = [];
  if (report.schemaVersion !== 1 || report.stage !== stage || report.status !== 'passed') {
    failures.push('Expected a passing report for ' + stage);
  }
  if (![report.candidate?.sourceTreeHash, report.candidate?.catalogRevision,
    report.candidate?.configFingerprint].every(hash => typeof hash === 'string' && sha256.test(hash))) {
    failures.push('Invalid candidate identity');
  }
  if (!Array.isArray(report.visualWaivers) ||
      report.visualWaivers.some(waiver => waiver !== 'unverified-visual-nonblocking')) {
    failures.push('Invalid visual waiver');
  }
  const seen = new Set<string>();
  for (const check of report.checks ?? []) {
    if (seen.has(check.id)) failures.push('Duplicate check ' + check.id);
    seen.add(check.id);
    if (check.status !== 'passed' || !evidencePath.test(check.evidencePath) ||
        /(?:^|\/)\.{1,2}$/.test(check.evidencePath)) failures.push('Invalid or failed check ' + check.id);
  }
  if (stage === 'functional') {
    for (const id of functionalChecks) if (!seen.has(id)) failures.push('Missing check ' + id);
  } else if (stage === 'ui') {
    for (const id of uiChecks) if (!seen.has(id)) failures.push('Missing check ' + id);
    const physicalIPhone = report.environment?.physicalIPhone;
    const waived = report.externalSetup?.includes('physical-iphone-safari-not-tested');
    if ((physicalIPhone !== 'passed' && physicalIPhone !== 'not-tested') ||
        waived !== (physicalIPhone === 'not-tested')) failures.push('Invalid physical iPhone coverage');
  } else if (stage === 'performance') {
    for (const id of performanceChecks) if (!seen.has(id)) failures.push('Missing check ' + id);
  } else {
    failures.push('Required checks are not defined yet for ' + stage);
  }
  return { passed: failures.length === 0, failures };
}
