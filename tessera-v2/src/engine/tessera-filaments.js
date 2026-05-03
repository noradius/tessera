export function updateFilaments(engine,s,t){
let c=0;
const preset=engine.currentPreset;
const restScale=preset==='rest'?0.2:1;
const trackingBoost=preset==='tracking'?1.6:1;
const receptionBoost=preset==='reception'?1.35:1;
const frictionBreak=preset==='friction'?0.75:1;
const arrivalBoost=preset==='arrival'?1.45:1;
const maxFilaments=preset==='arrival'?Math.floor(engine.maxFilaments*0.75):engine.maxFilaments;
const rate=(0.004+s.tracking*0.028+s.reception*0.02+s.mixed_weather*0.02+(s.arrival||0)*0.014)*restScale*trackingBoost*receptionBoost*frictionBreak*arrivalBoost;
for(let i=0;i<engine.activeCount-1&&c<maxFilaments;i+=engine.filamentStride){
if(Math.random()>rate)continue;const j=(i+7+((i*13)%29))%engine.activeCount,a=i*3,b=j*3;
const dx=engine.positions[a]-engine.positions[b],dy=engine.positions[a+1]-engine.positions[b+1],d=Math.hypot(dx,dy);
const minD=preset==='friction'?0.19:0.12,maxD=preset==='reception'?1.02:0.9;
if(d<minD||d>maxD)continue;
const p=c*6,ap=c*2;engine.linePos[p]=engine.positions[a];engine.linePos[p+1]=engine.positions[a+1];engine.linePos[p+2]=engine.positions[a+2];engine.linePos[p+3]=engine.positions[b];engine.linePos[p+4]=engine.positions[b+1];engine.linePos[p+5]=engine.positions[b+2];
let alpha=(1-d/1.02)*(0.08+s.tracking*0.3+s.reception*0.22+s.heart_memory*0.2)*(0.68+0.26*Math.sin(t+i));
if(preset==='friction'&&Math.random()<0.28)alpha*=0.35;
if(preset==='heart_memory')alpha*=1.2;
engine.lineAlpha[ap]=alpha;engine.lineAlpha[ap+1]=alpha;c++;
}
engine.filamentCount=c;
}
