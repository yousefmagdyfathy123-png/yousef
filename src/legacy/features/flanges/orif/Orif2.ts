import type { FeatureRoute } from '../../../contracts';
import { applySlipThreaded } from './slip-threaded';
import { recoverRecipeError } from '../../recover';
export const Orif2:FeatureRoute={id:'Orif2',apply(state,_action,catalog){try{return applySlipThreaded(state,catalog,2,20066);}catch(error){return recoverRecipeError(state,catalog,error);}}};
