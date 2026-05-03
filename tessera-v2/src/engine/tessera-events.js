export function getArrivalPull(state){return state.arrivalPhase>0?1-Math.min(1,state.arrivalTimer/0.8):0;}
