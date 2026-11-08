import type { FeatureRoute } from '../../../contracts';
import { applySeriesA } from './series-a';
import { recoverRecipeError } from '../../recover';
export const Flaa2:FeatureRoute={id:'Flaa2',apply(state,_action,catalog){try{return applySeriesA(state,catalog,2,19818,29);}catch(error){return recoverRecipeError(state,catalog,error);}}};
