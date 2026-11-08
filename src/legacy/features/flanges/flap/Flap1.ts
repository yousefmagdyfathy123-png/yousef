import type { FeatureRoute } from '../../../contracts';
import { applySeriesB } from './series-b';
import { recoverRecipeError } from '../../recover';
export const Flap1:FeatureRoute={id:'Flap1',apply(state,_action,catalog){try{return applySeriesB(state,catalog,1,19882,16);}catch(error){return recoverRecipeError(state,catalog,error);}}};
