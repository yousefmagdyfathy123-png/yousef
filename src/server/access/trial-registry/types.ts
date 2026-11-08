import { randomUUID } from 'node:crypto';

export const trialDuration = 120 * 60 * 60 * 1000;

export type TrialStart = {
  subjectId: string;
  decisionId: string;
  startedAt: string;
  endsAt: string;
  schemaVersion: 1;
};

export type TrialLookup =
  | { status: 'found'; decision: TrialStart }
  | { status: 'absent' }
  | { status: 'unknown' };

export interface TrialRegistry {
  lookup(subjectId: string): Promise<TrialLookup>;
  createIfAbsent(subjectId: string, proposed: TrialStart): Promise<TrialLookup>;
}

export function proposeTrial(subjectId: string, now: Date): TrialStart {
  return {
    subjectId, decisionId: randomUUID(), schemaVersion: 1,
    startedAt: now.toISOString(), endsAt: new Date(now.getTime() + trialDuration).toISOString(),
  };
}

function utc(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return false;
  const millis = Date.parse(value);
  return Number.isFinite(millis) && new Date(millis).toISOString() === value;
}

export function validDecision(value: unknown, subject: string): value is TrialStart {
  if (!value || typeof value !== 'object') return false;
  const d = value as Partial<TrialStart>;
  return /^[a-f0-9]{64}$/.test(subject) && d.subjectId === subject && d.schemaVersion === 1 &&
    typeof d.decisionId === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(d.decisionId) &&
    utc(d.startedAt) && utc(d.endsAt) && Date.parse(d.endsAt) - Date.parse(d.startedAt) === trialDuration;
}
