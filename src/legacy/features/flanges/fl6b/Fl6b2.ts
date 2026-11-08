import type { FeatureRoute } from '../../../contracts';
import { applyType6B } from './type-6b';
import { recoverRecipeError } from '../../recover';
export const Fl6b2:FeatureRoute={id:'Fl6b2',apply(state,_action,catalog){try{return applyType6B(state,catalog,2,20251);}catch(error){return recoverRecipeError(state,catalog,error);}}};
