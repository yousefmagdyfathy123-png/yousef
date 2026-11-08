// Source classification, not a dispatched calculator. The constructed menu
// loads Pwal1 and calls Clicker, which has no Pwal case. Pwal1 and its header
// arithmetic have no other incoming functional call path in the retained source.
export const wallPath={menu:'mnuWallThicknesCalculator',routeId:'Pwal1',behavior:'no-dispatch',helper:'PwalCalculate',helperReachable:false} as const;
