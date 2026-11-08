import type { FeatureRoute } from '../../../contracts';
import { applySeriesA } from './series-a';
import { recoverRecipeError } from '../../recover';
export const Flaa1:FeatureRoute={id:'Flaa1',apply(state,_action,catalog){try{return applySeriesA(state,catalog,1,19754,27);}catch(error){return recoverRecipeError(state,catalog,error);}}};
