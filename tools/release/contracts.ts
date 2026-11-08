export type CandidateIdentity = {
  sourceTreeHash: string;
  catalogRevision: string;
  configFingerprint: string;
};

export type StageReport = {
  schemaVersion: 1;
  stage: 'functional' | 'ui' | 'performance' | 'package';
  candidate: CandidateIdentity;
  environment: Record<string, string>;
  status: 'passed' | 'failed';
  checks: { id: string; status: 'passed' | 'failed'; evidencePath: string }[];
  visualWaivers: string[];
  externalSetup: string[];
};

export type StageCheck = { passed: boolean; failures: string[] };
