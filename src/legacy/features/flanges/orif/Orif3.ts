import type { FeatureRoute } from '../../../contracts';
import { applySlipThreaded } from './slip-threaded';
import { recoverRecipeError } from '../../recover';
export const Orif3:FeatureRoute={id:'Orif3',apply(state,_action,catalog){try{return applySlipThreaded(state,catalog,3,20133);}catch(error){return recoverRecipeError(state,catalog,error);}}};
