export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const damp=(a,b,hl,dt)=>lerp(a,b,1-Math.exp(-Math.LN2*dt/hl));
