import type { FeatureRoute } from '../../../contracts';
import { applyGspr } from './gspr';
import { recoverRecipeError } from '../../recover';
export const Gspr2:FeatureRoute={id:'Gspr2',apply(state,_action,catalog){try{return applyGspr(state,catalog,2,21403);}catch(error){return recoverRecipeError(state,catalog,error);}}};
