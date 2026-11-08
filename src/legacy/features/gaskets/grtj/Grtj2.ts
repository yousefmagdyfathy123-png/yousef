import type { FeatureRoute } from '../../../contracts';
import { applyGrtj } from './grtj';
import { recoverRecipeError } from '../../recover';
export const Grtj2:FeatureRoute={id:'Grtj2',apply(state,_action,catalog){try{return applyGrtj(state,catalog,2,21708);}catch(error){return recoverRecipeError(state,catalog,error);}}};
