// PtemCalculate has no caller. The constructed pressure menu calls Clicker
// through Ptem1, which has no dispatch case. Keep the prior drawing/state path.
export const pressurePath={menu:'mnuFlangeSafePressure',routeId:'Ptem1',behavior:'no-dispatch',helper:'PtemCalculate',helperReachable:false} as const;
