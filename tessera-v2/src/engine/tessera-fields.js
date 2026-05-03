export function applyFieldMotion(baseX,baseY,baseZ,ph,t,s,state,arrival){
const ambientX=Math.sin(t*0.19+ph*0.7)*0.08+Math.cos(t*0.13+baseY*0.45)*0.05;
const ambientY=Math.cos(t*0.21+ph*0.9)*0.08+Math.sin(t*0.1+baseX*0.52)*0.04;
const driftCenterX=Math.sin(t*0.065+state.confidence*2.2)*s.drift*0.85;
const driftCenterY=Math.cos(t*0.058+s.nowness*1.8)*s.drift*0.8;
const dx=baseX-driftCenterX,dy=baseY-driftCenterY,r=Math.max(0.1,Math.hypot(dx,dy));
const spiral=(-dy/r)*(0.07+s.tracking*0.38+s.mixed_weather*0.14);
const align=(Math.sin(t*(0.55+s.tracking*1.8)+baseX*1.5+ph)+Math.cos(t*(0.47+s.tracking*1.5)+baseY*1.4))*0.06*(s.tracking+s.mixed_weather*0.6);
const reachProbe=(0.15+s.reach*0.65)*(0.65+0.35*Math.sin(t*0.8+ph*1.6));
const reachCurl=Math.sin(t*1.18+ph*1.1+r*0.9)*0.22*s.reach;
const shear=Math.sin((baseY*2.4+t*1.75)+Math.sin(baseX*1.3+t*0.5))*s.friction*0.32;
const eddy=Math.cos((baseX*2.1-baseY*1.7)+t*(1.2+s.friction))*s.friction*0.26;
const foldEcho=Math.sin((baseX+baseY)*(0.7+s.folding*1.2)+t*0.34+Math.sin(t*0.09)*3.0)*s.folding*0.24;
const placeHold=(-baseX*0.015-baseY*0.01)*(0.5+s.place*0.8);
const arrivalPull=arrival.pull||0;
const arrivalBloom=arrival.bloom||0;
const x=baseX+ambientX+spiral+align+dx*(reachProbe*0.08)+reachCurl+shear+placeHold-baseX*arrivalPull*0.18;
const y=baseY+ambientY+align*0.86+foldEcho+(-dx/r)*(s.reach*0.16)+eddy+dy*(s.drift*0.05)-baseY*arrivalPull*0.18;
const z=baseZ+Math.sin(t*0.27+ph*1.2)*(0.14+s.inhabited_silence*0.11)+Math.cos(t*0.43+ph+dx*0.5)*(0.08+s.aliveness*0.14)+arrivalBloom*0.24*(0.5+Math.sin(ph*2.0)*0.5);
return [x,y,z];
}
