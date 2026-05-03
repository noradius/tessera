export function getArrivalEnvelope(state){
  if(!state.arrivalPhase) return { pull: 0, bloom: 0, phase: 0, residue: 0 };
  const timer = state.arrivalTimer;
  if(state.arrivalPhase===1){
    const p = Math.min(1,timer/0.56);
    return { pull:0.34+0.56*p, bloom:0, phase:1, residue:0 };
  }
  if(state.arrivalPhase===2){
    return { pull:0.92, bloom:0, phase:2, residue:0 };
  }
  if(state.arrivalPhase===3){
    const p = Math.min(1,timer/0.84);
    return { pull:0.9*(1-p), bloom:Math.sin(Math.min(1,p)*Math.PI), phase:3, residue:0 };
  }
  const p = Math.min(1,timer/2.4);
  return { pull:0.18*(1-p), bloom:0, phase:4, residue:1-p };
}
