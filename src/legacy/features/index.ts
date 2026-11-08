import type { FeatureRoute } from '../contracts';
import { registerRoutes } from '../registry';
import { flangeRoutes } from './flanges';
import { gasketRoutes } from './gaskets';
import { fittingRoutes } from './fittings';
import { pipeRoutes } from './pipe';
import { branchRoutes } from './branches';
import { valveRoutes } from './valves';
import { strainerRoutes } from './strainers';
import { fastenerRoutes } from './fasteners';
import { calculatorRoutes } from './calculators';

export const allRoutes:FeatureRoute[]=[...flangeRoutes,...gasketRoutes,...fittingRoutes,...pipeRoutes,...branchRoutes,...valveRoutes,...strainerRoutes,...fastenerRoutes,...calculatorRoutes];
export const allRouteRegistry=registerRoutes(allRoutes);
