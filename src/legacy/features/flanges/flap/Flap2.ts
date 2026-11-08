import type { FeatureRoute } from '../../../contracts';
import { applySeriesB } from './series-b';
import { recoverRecipeError } from '../../recover';
export const Flap2:FeatureRoute={id:'Flap2',apply(state,_action,catalog){try{return applySeriesB(state,catalog,2,19941,17);}catch(error){return recoverRecipeError(state,catalog,error);}}};
