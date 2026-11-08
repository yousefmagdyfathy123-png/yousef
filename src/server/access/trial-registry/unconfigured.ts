import type { TrialRegistry } from './types';

export const unconfiguredRegistry: TrialRegistry = {
  async lookup() { return { status: 'unknown' }; },
  async createIfAbsent() { return { status: 'unknown' }; },
};
