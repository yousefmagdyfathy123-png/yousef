import type { FeatureRoute } from '../../../contracts';
import { applyType6B } from './type-6b';
import { recoverRecipeError } from '../../recover';
export const Fl6b1:FeatureRoute={id:'Fl6b1',apply(state,_action,catalog){try{return applyType6B(state,catalog,1,20193);}catch(error){return recoverRecipeError(state,catalog,error);}}};
