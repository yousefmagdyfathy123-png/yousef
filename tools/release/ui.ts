import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, platform, release, version } from 'node:os';
import { basename, resolve } from 'node:path';
import { requireLegacyCulture } from '../../src/server/legacy-culture';
import { releaseCandidate } from './candidate';
import type { StageReport } from './contracts';
import { checkStageReport, uiChecks } from './stage-report';
import { uiProjectNames, uiSuites } from './ui-matrix';

type BrowserSuite = {
  file?: string;
  suites?: BrowserSuite[];
  specs?: {
    title: string;
    tests: {
      projectName: string;
      status: string;
      annotations: { type: string; description?: string }[];
      results: { status: string }[];
    }[];
  }[];
};

const scratchRoot = resolve('.local/ui-acceptance');
mkdirSync(scratchRoot, { recursive: true });
const scratch = mkdtempSync(resolve(scratchRoot, 'run-'));
const output = 'evidence/acceptance';
const reportPath = output + '/ui.json';
const save = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const profile = 'local-ui';
const culture = requireLegacyCulture(process.env).name;
const candidate = await releaseCandidate({ culture, profile });
const report: StageReport = {
  schemaVersion: 1, stage: 'ui', candidate, status: 'failed', checks: [],
  environment: {
    node: process.version, os: [platform(), version(), release(), arch()].join(' '),
    profile, culture, localArtifacts: scratch, database: 'isolated PostgreSQL', physicalIPhone: 'not-tested',
    physicalAndroid: 'not-tested',
  },
  visualWaivers: ['unverified-visual-nonblocking'],
  externalSetup: ['physical-iphone-safari-not-tested', 'Physical Android Chrome not tested'],
};

mkdirSync(output, { recursive: true });
save(reportPath, report);
const result = spawnSync(process.execPath, ['--import', 'tsx', 'tools/auth/test-browser.ts'], {
  stdio: 'inherit',
  env: { ...process.env, ALFADATA_UI_BROWSER_REPORTS: scratch },
});
console.log('Raw UI test results and screenshots: ' + scratch);
const sameCandidate = JSON.stringify(candidate) === JSON.stringify(await releaseCandidate({ culture, profile }));

function collect(suites: BrowserSuite[]): { file: string; title: string; status: string; project: string; browser?: string }[] {
  return suites.flatMap(suite => [
    ...(suite.specs ?? []).flatMap(spec => spec.tests.map(test => ({
      file: basename(suite.file ?? ''), title: spec.title, project: test.projectName,
      status: test.status === 'expected' && test.results.length === 1 ? test.results[0].status : test.status,
      browser: test.annotations.find(annotation => annotation.type === 'browser-version')?.description,
    }))),
    ...collect(suite.suites ?? []),
  ]);
}

const matrix = uiProjectNames.map(project => {
  const path = resolve(scratch, project + '.json');
  const data = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as {
    suites: BrowserSuite[]; errors: unknown[];
  } : { suites: [], errors: ['Missing browser report'] };
  const tests = collect(data.suites);
  const versions = [...new Set(tests.flatMap(test => test.browser ? [test.browser] : []))];
  if (versions.length === 1) report.environment[project] = versions[0];
  return { project, versions, runnerErrors: data.errors.length, tests };
});
const required = [...new Set(Object.values(uiSuites).flat())];
for (const id of uiChecks) {
  if (id === 'manual-accessibility') {
    const evidencePath = output + '/ui-manual-accessibility.json';
    if (!existsSync(evidencePath)) save(evidencePath, { status: 'not-tested' });
    const manual = JSON.parse(readFileSync(evidencePath, 'utf8'));
    const passed = manual.status === 'passed' && manual.sourceTreeHash === candidate.sourceTreeHash &&
      manual.scope === 'protected' && Boolean(manual.reader && manual.readerVersion && manual.browser && manual.os) &&
      ['results', 'forms', 'messages'].every(key => typeof manual.observations?.[key] === 'string' && manual.observations[key].trim());
    report.environment.screenReader = passed ? manual.reader + ' ' + manual.readerVersion : 'no passing protected manual run recorded';
    report.checks.push({ id, evidencePath, status: passed ? 'passed' : 'failed' });
    continue;
  }
  const files = id === 'browser-matrix' ? required : uiSuites[id];
  const evidence = matrix.map(({ project, versions, runnerErrors, tests }) => {
    const selected = tests.filter(test => (files as readonly string[]).includes(test.file));
    const passed = versions.length === 1 && runnerErrors === 0 &&
      selected.every(test => test.project === project && test.status === 'passed') &&
      files.every(file => selected.some(test => test.file === file));
    return { project, versions, runnerErrors, passed, tests: selected };
  });
  const evidencePath = output + '/ui-' + id + '.json';
  save(evidencePath, { candidate, evidence });
  report.checks.push({ id, evidencePath, status: evidence.every(item => item.passed) ? 'passed' : 'failed' });
}
if (report.checks.find(check => check.id === 'mobile')?.status === 'passed' &&
    report.checks.find(check => check.id === 'browser-matrix')?.status === 'passed') {
  report.environment.iphoneCoverage = 'WebKit and mobile emulation tested; Safari on a physical iPhone not tested';
}
report.status = result.status === 0 && sameCandidate ? 'passed' : 'failed';
const gate = checkStageReport('ui', report);
report.status = gate.passed ? 'passed' : 'failed';
save(reportPath, report);
if (!gate.passed) {
  console.error(gate.failures.join('\n'));
  if (!sameCandidate) console.error('Candidate changed during UI acceptance');
  process.exitCode = 1;
}
