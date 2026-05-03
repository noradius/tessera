export function getArrivalEnvelope(state){
  if(!state.arrivalPhase) return { pull: 0, bloom: 0, phase: 0, residue: 0 };
  const timer = state.arrivalTimer;
  if(state.arrivalPhase===1){
    const p = Math.min(1,timer/0.7);
    return { pull:0.38+0.62*p, bloom:0, phase:1, residue:0 };
  }
  if(state.arrivalPhase===2){
    return { pull:1.0, bloom:0, phase:2, residue:0 };
  }
  if(state.arrivalPhase===3){
    const p = Math.min(1,timer/1.1);
    const bloom = Math.pow(Math.sin(Math.min(1,p)*Math.PI),0.8);
    return { pull:0.96*(1-p), bloom, phase:3, residue:0 };
  }
  const p = Math.min(1,timer/2.8);
  return { pull:0.24*(1-p), bloom:0, phase:4, residue:1-p };
}
