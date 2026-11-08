export function assertReferenceFixture(value: unknown): void {
  if (!value || typeof value !== 'object') throw new Error('Reference fixture must be an object');
  const item = value as Record<string,unknown>;
  if (typeof item.id !== 'string' || !item.id || item.culture !== 'en-US' || !Object.hasOwn(item,'expected') || !item.expected || typeof item.expected !== 'object') throw new Error('Reference fixture requires id, explicit en-US culture and expected output');
  if (!Array.isArray(item.sourceRefs) || !item.sourceRefs.length || item.sourceRefs.some(ref => !ref || typeof ref.path !== 'string' || !ref.path || typeof ref.hash !== 'string' || !/^[a-f0-9]{64}$/.test(ref.hash))) throw new Error('Reference fixture requires pinned sourceRefs');
}
