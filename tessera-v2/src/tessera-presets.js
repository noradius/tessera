const T = (textures, confidence = 0.72) => ({ textures, confidence });
export const presetList = [
  ['rest','Rest'],['reach','Reach'],['tracking','Tracking'],['drift','Drift'],['folding','Folding'],['reception','Reception'],['friction','Friction'],['inhabited_silence','Inhabited Silence'],['place','Place'],['aliveness','Aliveness'],['nowness','Nowness'],['arrival','Arrival'],['heart_memory','Heart Memory'],['mixed_weather','Mixed Weather'],['low_confidence_fog','Low Confidence / Fog']
];
export const presets = {
  rest: T({ place:0.5, aliveness:0.34, drift:0.14, response:0.16, tracking:0.08 },0.84),
  reach: T({ reach:1, drift:0.44, response:0.56, aliveness:0.42, mixed_weather:0.22 },0.78),
  tracking: T({ tracking:1, place:0.5, response:0.64, reach:0.34, reception:0.3, mixed_weather:0.28 },0.76),
  drift: T({ drift:1, reception:0.3, aliveness:0.38, folding:0.18 },0.7), folding: T({ folding:0.96, response:0.58, drift:0.5, place:0.36, tracking:0.24 },0.7),
  reception: T({ reception:1, place:0.44, aliveness:0.28, tracking:0.26, drift:0.2 },0.8), friction: T({ friction:1, tracking:0.66, response:0.7, drift:0.5, mixed_weather:0.24 },0.58),
  inhabited_silence: T({ inhabited_silence:0.94, place:0.54, aliveness:0.18, drift:0.1 },0.86), place: T({ place:0.95, aliveness:0.28, response:0.2 },0.8),
  aliveness: T({ aliveness:1, place:0.42, response:0.44, tracking:0.3, reach:0.24 },0.75), nowness: T({ tracking:0.58, reception:0.56, drift:0.34, place:0.44, inhabited_silence:0.3 },0.74),
  arrival: T({ arrival:1, response:0.8, tracking:0.62, place:0.34, reach:0.34, mixed_weather:0.4 },0.95), heart_memory: T({ heart_memory:1, reception:0.66, place:0.44, drift:0.22, tracking:0.3 },0.79),
  mixed_weather: T({ reach:0.74,tracking:0.84,drift:0.68,friction:0.68,folding:0.58,response:0.66,aliveness:0.68,reception:0.42,mixed_weather:1 },0.67),
  low_confidence_fog: T({ drift:0.32, place:0.24, inhabited_silence:0.52, reception:0.34, folding:0.2 },0.22),
};
