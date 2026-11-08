import type { FeatureRoute } from '../../../contracts';
import { applyGflt } from './gflt';
import { recoverRecipeError } from '../../recover';
export const Gflt3:FeatureRoute={id:'Gflt3',apply(state,_action,catalog){try{return applyGflt(state,catalog,3,21176);}catch(error){return recoverRecipeError(state,catalog,error);}}};
