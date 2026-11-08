import type { FeatureRoute } from '../../../contracts';
import { applyEN1092 } from './en1092';
import { recoverRecipeError } from '../../recover';
export const Fldi1:FeatureRoute={id:'Fldi1',apply(state,_action,catalog){try{return applyEN1092(state,catalog,1,20621);}catch(error){return recoverRecipeError(state,catalog,error);}}};
