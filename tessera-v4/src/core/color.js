export function hslToRgb(h,s,l){const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h*12)%12;return l-a*Math.max(-1,Math.min(k-3,Math.min(9-k,1)));};return [f(0),f(8),f(4)];}
