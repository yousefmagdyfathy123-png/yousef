import type { FeatureRoute } from '../../../contracts';
import { applyGflt } from './gflt';
import { recoverRecipeError } from '../../recover';
export const Gflt2:FeatureRoute={id:'Gflt2',apply(state,_action,catalog){try{return applyGflt(state,catalog,2,21118);}catch(error){return recoverRecipeError(state,catalog,error);}}};
