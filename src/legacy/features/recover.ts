import type { Catalog,WorkResult,WorkState } from '../contracts';
import { DrawingProtocolError } from '../drawing/parse';
import { recoverLegacyError } from '../state/errors';
import { registerRoutes } from '../registry';
import { Flan1 } from './flanges/flan/Flan1';
// Call only at a source-proven recipe catch. Missing route dispatch remains a
// development error outside these boundaries; recovery itself is not retried.
export function recoverRecipeError(state:WorkState,catalog:Catalog,error:unknown,sourceId=state.routeId):WorkResult{
  if(error instanceof DrawingProtocolError)state.legacyBuffers=error.buffers;
  state.values.ActiveSub=sourceId;
  return recoverLegacyError(state,catalog,registerRoutes([Flan1]),sourceId);
}
