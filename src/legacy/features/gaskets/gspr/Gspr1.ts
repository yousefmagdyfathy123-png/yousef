import type { FeatureRoute } from '../../../contracts';
import { applyGspr } from './gspr';
import { recoverRecipeError } from '../../recover';
export const Gspr1:FeatureRoute={id:'Gspr1',apply(state,_action,catalog){try{return applyGspr(state,catalog,1,21351);}catch(error){return recoverRecipeError(state,catalog,error);}}};
