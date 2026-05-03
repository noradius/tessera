export class FieldMemory{constructor(){this.residue=0;this.warmth=0;}tick(dt,a,h){this.residue=Math.max(0,this.residue-dt*.08)+a*dt*.2;this.warmth=Math.max(0,this.warmth-dt*.09)+h*dt*.22;}}
