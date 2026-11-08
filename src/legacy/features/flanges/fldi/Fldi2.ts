import type { FeatureRoute } from '../../../contracts';
import { applyEN1092 } from './en1092';
import { recoverRecipeError } from '../../recover';
export const Fldi2:FeatureRoute={id:'Fldi2',apply(state,_action,catalog){try{return applyEN1092(state,catalog,2,20683);}catch(error){return recoverRecipeError(state,catalog,error);}}};
