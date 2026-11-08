import 'server-only';
import { createHash } from 'node:crypto';
import type { PublicDrawing, PublicDrawingPresentation } from '../../shared/public-contracts';
import { drawingFocusProfile } from './drawing-focus-profiles';

/** Optional focus hint for a verified structure; never changes a drawing. */
export function drawingPresentation(routeId: string, drawing: PublicDrawing): PublicDrawingPresentation | undefined {
  const profile = drawingFocusProfile(routeId);
  if (!profile || !drawing.commands.length) return undefined;

  for (const index of profile.dynamicMaskIndices) {
    const mask = drawing.commands[index], label = drawing.commands[index + 1];
    if (mask?.op !== 'fillRect' || label?.op !== 'text' || mask.width !== Math.fround(label.text.length * 18)) return undefined;
  }
  const normalized = drawing.commands.map((command, index) => {
    if (command.op === 'text') {
      const { text: _value, ...structure } = command;
      return structure;
    }
    return profile.dynamicMaskIndices.includes(index) ? { ...command, width: 'dynamic-text-mask' } : command;
  });
  const hash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  if (hash !== profile.structureHash) return undefined;

  const primaryCommandIndices = profile.primaryRanges.flatMap(([start, end]) =>
    Array.from({ length: end - start + 1 }, (_, offset) => start + offset));
  return { primaryCommandIndices };
}
