import type { FeatureRoute } from '../../../contracts';
import { applyEN1092 } from './en1092';
import { recoverRecipeError } from '../../recover';
export const Fldi4:FeatureRoute={id:'Fldi4',apply(state,_action,catalog){try{return applyEN1092(state,catalog,4,20804);}catch(error){return recoverRecipeError(state,catalog,error);}}};
