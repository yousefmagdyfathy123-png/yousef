import type { FeatureRoute } from '../../../contracts';
import { applyEN1092 } from './en1092';
import { recoverRecipeError } from '../../recover';
export const Fldi3:FeatureRoute={id:'Fldi3',apply(state,_action,catalog){try{return applyEN1092(state,catalog,3,20745);}catch(error){return recoverRecipeError(state,catalog,error);}}};
