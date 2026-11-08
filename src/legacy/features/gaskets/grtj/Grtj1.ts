import type { FeatureRoute } from '../../../contracts';
import { applyGrtj } from './grtj';
import { recoverRecipeError } from '../../recover';
export const Grtj1:FeatureRoute={id:'Grtj1',apply(state,_action,catalog){try{return applyGrtj(state,catalog,1,21657);}catch(error){return recoverRecipeError(state,catalog,error);}}};
