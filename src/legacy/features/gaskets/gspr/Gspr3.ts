import type { FeatureRoute } from '../../../contracts';
import { applyGspr } from './gspr';
import { recoverRecipeError } from '../../recover';
export const Gspr3:FeatureRoute={id:'Gspr3',apply(state,_action,catalog){try{return applyGspr(state,catalog,3,21459);}catch(error){return recoverRecipeError(state,catalog,error);}}};
