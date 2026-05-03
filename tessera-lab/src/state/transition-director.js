export const smooth=(cur,t,hl,dt)=>cur+(t-cur)*(1-Math.exp(-dt*Math.log(2)/hl));
