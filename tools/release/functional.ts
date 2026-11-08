import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { allRoutes } from '../../src/legacy/features';
import { requireLegacyCulture } from '../../src/server/legacy-culture';
import ui from '../../src/legacy/ui/source-data.json';
import { discoverCoverage } from '../evidence/discover';
import { checkFunctionalCoverage } from '../evidence/coverage';
import type { ParityCard } from '../evidence/types';
import { checkAcceptanceCoverage, checkReferenceProvenance } from './coverage';
import { releaseCandidate } from './candidate';
import type { StageReport } from './contracts';
import { checkStageReport } from './stage-report';

const output = 'evidence/acceptance';
const scratch = '.local/functional-acceptance';
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const save = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
requireLegacyCulture(process.env);

const environment = {
  node: process.version,
  platform: process.platform,
  culture: 'en-US',
  profile: 'local-functional',
  browser: 'Chrome over loopback HTTPS',
  database: 'isolated PostgreSQL',
  payment: 'synthetic adapter and unconfigured live boundary',
};

const candidate = () => releaseCandidate({ culture: environment.culture, profile: environment.profile });

type TestResult = {
  testResults: { name: string; assertionResults: { status: string; title: string }[] }[];
};

function passingTests(results: TestResult, file: string): string[] {
  const suite = results.testResults.find(result => relative('.', result.name).replaceAll('\\', '/') === file);
  if (!suite?.assertionResults.length || suite.assertionResults.some(test => test.status !== 'passed')) {
    throw new Error('Missing, failed or skipped required suite ' + file);
  }
  return suite.assertionResults.map(test => test.title);
}

mkdirSync(output, { recursive: true });
mkdirSync(scratch, { recursive: true });
const identity = await candidate();
const report: StageReport = {
  schemaVersion: 1, stage: 'functional', candidate: identity, environment,
  status: 'failed', checks: [], visualWaivers: ['unverified-visual-nonblocking'],
  externalSetup: ['Live merchant integration', 'Independent trial registry host resilience'],
};
const reportPath = output + '/functional.json';
save(reportPath, report);

type CommandResult = { command: string; exitCode: number | null; seconds: number; summary: string[] };
const commands: CommandResult[] = [];
function run(program: string, args: string[], label: string, env = process.env): string {
  console.log(label);
  const start = Date.now();
  const result = spawnSync(program, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env });
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  writeFileSync(scratch + '/' + label + '.log', log);
  const summary = log.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/)
    .map(line => line.trim()).filter(line => /^(Test Files|Tests|Duration|Types generated|✓ Compiled|\d+ passed)/.test(line));
  commands.push({ command: label, exitCode: result.status, seconds: (Date.now() - start) / 1000, summary });
  if (result.error || result.status !== 0) throw new Error(label + ' failed. See ' + scratch + '/' + label + '.log');
  return result.stdout;
}

function npm(script: string, args: string[] = [], env = process.env) {
  // npm_execpath comes from npm run and works with Windows without a shell.
  if (!process.env.npm_execpath) throw new Error('Run npm run acceptance:functional');
  return run(process.execPath, [process.env.npm_execpath, 'run', script, ...args], script.replaceAll(':', '-'), env);
}

async function check(id: string, verify: () => unknown) {
  const evidencePath = output + '/' + id + '.json';
  const previous = commands.length;
  try {
    const evidence = await verify();
    save(evidencePath, { evidence, commands: commands.slice(previous) });
    report.checks.push({ id, status: 'passed', evidencePath });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    save(evidencePath, { reason, commands: commands.slice(previous) });
    report.checks.push({ id, status: 'failed', evidencePath });
    console.error(id + ' failed. ' + reason);
  }
  save(reportPath, report);
}

const sourceCheck = () => JSON.parse(run('python', ['tools/evidence/core-source-check.py'], 'original-source-hashes'));
let original: unknown;
await check('source-preservation', () => (original = sourceCheck()));

let ledger: ParityCard[] = [];
await check('source-coverage', () => {
  npm('coverage:check');
  const fresh = discoverCoverage(resolve('..'));
  ledger = json('evidence/parity-ledger.json');
  const issues = checkAcceptanceCoverage(fresh, ledger, allRoutes, ui.events);
  if (issues.length) throw new Error(JSON.stringify(issues.slice(0, 10)));
  const report = checkFunctionalCoverage(fresh, ledger);
  return {
    artifact: fresh.artifact, requiredEntries: report.requiredRoutes.length,
    dispatchRoutes: report.implementedRoutes.length, testedCards: report.testedBranches.length,
    staticRecipeBranches: fresh.recipes.reduce((sum, recipe) => sum + recipe.conditionalBranches, 0),
    searchOnly: fresh.searchOnly, dispatchNotInSearch: fresh.dispatchNotInSearch,
    dormantCalculators: ['Pwal1', 'Ptem1'], exclusions: fresh.exclusions.map(item => item.id),
    functionalGaps: issues,
  };
});

const unitPath = scratch + '/unit.json';
const integrationPath = scratch + '/integration.json';
let unit: TestResult;
let integration: TestResult;
await check('unit', () => {
  npm('test', ['--', '--reporter=default', '--reporter=json', '--outputFile.json=' + unitPath]);
  unit = json(unitPath);
  return { suites: unit.testResults.length };
});
await check('independent-references', () => {
  if (!ledger.length) throw new Error('Missing source coverage');
  const tests = [...new Set(ledger.flatMap(card => card.testIds))].filter(path => path.endsWith('.test.ts'));
  for (const file of tests) passingTests(unit, file);
  const passingCaseIds = passingTests(unit, 'tests/legacy/calculator-recipes.test.ts')
    .map(title => title.replace(/ matches independent source recipe, controls, banks and drawing$/, ''));
  const routeIds = allRoutes.filter(route => /^(Gpas|Comp|Span|Fxly|Psiz)/.test(route.id)).map(route => route.id);
  const extraction = run('python', ['tools/release/reference-check.py', scratch + '/recipes'], 'independent-extraction');
  const sourceHashes: Record<string, string> = JSON.parse(extraction.trimEnd().split(/\r?\n/).at(-1)!);
  let cases = 0;
  for (const routeId of routeIds) {
    const { fixtures: fixture } = json('evidence/calculators/' + routeId + '.json');
    const bytes = readFileSync(fixture.path);
    const caseIds = JSON.parse(bytes.toString()).cases.map((entry: { id: string }) => entry.id);
    const issues = checkReferenceProvenance({
      fixture, extractor: 'tools/evidence/calculators-reference.py', actualHash: hash(bytes), caseIds, passingCaseIds,
    });
    if (sourceHashes[routeId] !== hash(bytes)) issues.push('Fresh source extraction differs');
    if (issues.length) throw new Error(routeId + ' ' + issues.join(', '));
    cases += caseIds.length;
  }
  const browserSpecs = [...new Set(ledger.flatMap(card => card.testIds))].filter(path => path.endsWith('.spec.ts'));
  npm('test:e2e', ['--', ...browserSpecs]);
  return { referenceSuites: tests, browserSpecs, calculatorRoutes: routeIds, calculatorCases: cases };
});
await check('integration', () => {
  npm('test:integration', ['--', '--reporter=default', '--reporter=json', '--outputFile.json=' + integrationPath]);
  integration = json(integrationPath);
  return { suites: integration.testResults.length };
});

const integrationEvidence = (files: string[]) =>
  Object.fromEntries(files.map(file => [file, passingTests(integration, 'tests/integration/' + file + '.test.ts')]));

type BrowserSuite = {
  file?: string;
  specs?: { tests: { status: string }[] }[];
  suites?: BrowserSuite[];
};
const browserTests = new Map<string, string[]>();
function readBrowserSuite(suite: BrowserSuite) {
  if (suite.file && suite.specs?.length) {
    const statuses = browserTests.get(suite.file) ?? [];
    statuses.push(...suite.specs.flatMap(spec => spec.tests.map(test => test.status)));
    browserTests.set(suite.file, statuses);
  }
  for (const child of suite.suites ?? []) readBrowserSuite(child);
}
function browserEvidence(...names: string[]) {
  return Object.fromEntries(names.map(name => {
    const file = name + '.spec.ts';
    const statuses = browserTests.get(file);
    if (!statuses?.length || statuses.some(status => status !== 'expected')) {
      throw new Error('Missing, failed, flaky or skipped required browser tests in ' + file);
    }
    return [file, statuses.length];
  }));
}

await check('http-request-protection', () => {
  npm('test:e2e:auth', [], { ...process.env, ALFADATA_FUNCTIONAL_BROWSER_REPORTS: resolve(scratch) });
  for (const group of ['identity', 'account', 'network', 'resume', 'culture']) {
    readBrowserSuite(json(scratch + '/browser-' + group + '.json'));
  }
  return {
    browser: browserEvidence('request-protection', 'account-commerce', 'auth', 'payment-recovery'),
    policy: integrationEvidence(['browser-mutation']),
    signedWebhook: integrationEvidence(['payments']),
  };
});
await check('workspace-assets', () => {
  const publicStaticFiles = globSync('public/**/*', { withFileTypes: true }).filter(entry => !entry.isDirectory());
  if (publicStaticFiles.length) throw new Error('Static public files require an explicit asset review');
  return {
    browser: browserEvidence('workspace-session-resume', 'workspace-recovery'),
    integration: integrationEvidence(['workspace-assets']),
    publicDto: passingTests(unit, 'tests/workspace/public-result.test.ts'),
    publicStaticFiles: [],
  };
});
await check('paid-reconciliation', () => integrationEvidence(['post-payment-reconciliation', 'payment-recovery']));
await check('trial-registry', () => integrationEvidence(['trial-registry', 'entitlement']));
await check('state-codec', () => ({
  unit: passingTests(unit, 'tests/legacy/state-codec.test.ts'),
  postgres: integrationEvidence(['workspace-persistence', 'workspace-operations']),
}));
await check('workspace-preferences', () => ({
  integration: integrationEvidence(['preferences', 'workspace-persistence']),
  browser: browserEvidence('preferences', 'culture'),
}));
await check('typecheck', () => { npm('typecheck'); });
await check('build', () => { npm('build'); });

const afterSource = sourceCheck();
const sameSource = JSON.stringify(original) === JSON.stringify(afterSource);
if (sameSource) save(output + '/source-preservation.json', {
  evidence: { before: original, after: afterSource, equal: true },
  commands: commands.filter(command => command.command === 'original-source-hashes'),
});
const sameCandidate = JSON.stringify(identity) === JSON.stringify(await candidate());
if (!sameSource || !sameCandidate) throw new Error('Source or candidate changed during acceptance');
const result = checkStageReport('functional', { ...report, status: 'passed' });
report.status = result.passed ? 'passed' : 'failed';
save(reportPath, report);
if (!result.passed) {
  console.error(result.failures.join('\n'));
  process.exitCode = 1;
}
console.log('Functional acceptance ' + report.status + '. ' + reportPath);
