import type { FeatureRoute } from '../../../contracts';
import { applyEN1092 } from './en1092';
import { recoverRecipeError } from '../../recover';
export const Fldi5:FeatureRoute={id:'Fldi5',apply(state,_action,catalog){try{return applyEN1092(state,catalog,5,20868);}catch(error){return recoverRecipeError(state,catalog,error);}}};
