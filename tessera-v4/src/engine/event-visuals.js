export const arrivalPhase=t=>t<.4?'pre-tension':t<1?'compression':t<1.35?'hold':t<2.2?'bloom':t<4.5?'reorg':t<8?'residue':'none';
