import {damp} from '../core/utils.js'; export const blend=(cur,tgt,dt)=>Object.fromEntries(Object.keys(cur).map(k=>[k,damp(cur[k],tgt[k]??0,.55,dt)]));
