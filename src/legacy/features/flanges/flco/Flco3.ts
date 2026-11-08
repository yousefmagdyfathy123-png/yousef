import type { FeatureRoute } from '../../../contracts';
import { applyCompact } from './compact';
import { recoverRecipeError } from '../../recover';
export const Flco3:FeatureRoute={id:'Flco3',apply(state,_action,catalog){try{return applyCompact(state,catalog,3,20560);}catch(error){return recoverRecipeError(state,catalog,error);}}};
