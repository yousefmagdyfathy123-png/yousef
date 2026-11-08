import type { FeatureRoute } from '../../../contracts';
import { applyReducing } from './reducing';
import { recoverRecipeError } from '../../recover';
export const Flre1:FeatureRoute={id:'Flre1',apply(state,_action,catalog){try{return applyReducing(state,catalog,1,22560);}catch(error){return recoverRecipeError(state,catalog,error);}}};
