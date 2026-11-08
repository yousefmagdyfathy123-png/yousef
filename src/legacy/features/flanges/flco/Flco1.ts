import type { FeatureRoute } from '../../../contracts';
import { applyCompact } from './compact';
import { recoverRecipeError } from '../../recover';
export const Flco1:FeatureRoute={id:'Flco1',apply(state,_action,catalog){try{return applyCompact(state,catalog,1,20425);}catch(error){return recoverRecipeError(state,catalog,error);}}};
