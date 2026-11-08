import type { FeatureRoute } from '../../../contracts';
import { applyGflt } from './gflt';
import { recoverRecipeError } from '../../recover';
export const Gflt1:FeatureRoute={id:'Gflt1',apply(state,_action,catalog){try{return applyGflt(state,catalog,1,21062);}catch(error){return recoverRecipeError(state,catalog,error);}}};
