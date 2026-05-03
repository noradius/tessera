export class FieldMemory{constructor(){this.residue=0;}tick(dt,target){this.residue=Math.max(0,this.residue-dt*.06)+target.arrival*dt*.3+target.heart_memory*dt*.2;}}
