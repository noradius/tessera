export const rng=(s=1337)=>()=>((s=Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
