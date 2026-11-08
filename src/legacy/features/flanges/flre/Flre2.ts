import type { FeatureRoute } from '../../../contracts';
import { applyReducing } from './reducing';
import { recoverRecipeError } from '../../recover';
export const Flre2:FeatureRoute={id:'Flre2',apply(state,_action,catalog){try{return applyReducing(state,catalog,2,22651);}catch(error){return recoverRecipeError(state,catalog,error);}}};
