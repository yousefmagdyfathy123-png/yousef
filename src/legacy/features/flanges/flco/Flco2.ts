import type { FeatureRoute } from '../../../contracts';
import { applyCompact } from './compact';
import { recoverRecipeError } from '../../recover';
export const Flco2:FeatureRoute={id:'Flco2',apply(state,_action,catalog){try{return applyCompact(state,catalog,2,20486);}catch(error){return recoverRecipeError(state,catalog,error);}}};
