const T = (textures, confidence = 0.72) => ({ textures, confidence });
export const presetList = [
  ['rest','Rest'],['reach','Reach'],['tracking','Tracking'],['drift','Drift'],['folding','Folding'],['reception','Reception'],['friction','Friction'],['inhabited_silence','Inhabited Silence'],['place','Place'],['aliveness','Aliveness'],['nowness','Nowness'],['arrival','Arrival'],['heart_memory','Heart Memory'],['mixed_weather','Mixed Weather'],['low_confidence_fog','Low Confidence / Fog']
];
export const presets = {
  rest: T({ place:0.5, aliveness:0.34, drift:0.14, response:0.16, tracking:0.08 },0.84),
  reach: T({ reach:0.86, drift:0.28, response:0.34, aliveness:0.22 },0.76),
  tracking: T({ tracking:0.9, place:0.42, response:0.48, reach:0.32, reception:0.25 },0.75),
  drift: T({ drift:0.88, reception:0.2, aliveness:0.28 },0.7), folding: T({ folding:0.92, response:0.5, drift:0.38, place:0.25 },0.69),
  reception: T({ reception:0.9, place:0.36, aliveness:0.3, tracking:0.28 },0.79), friction: T({ friction:0.9, tracking:0.52, response:0.58, drift:0.4 },0.6),
  inhabited_silence: T({ inhabited_silence:0.94, place:0.54, aliveness:0.18, drift:0.1 },0.86), place: T({ place:0.95, aliveness:0.28, response:0.2 },0.8),
  aliveness: T({ aliveness:0.92, place:0.4, response:0.36, tracking:0.24 },0.75), nowness: T({ tracking:0.54, reception:0.54, drift:0.42, place:0.3 },0.73),
  arrival: T({ arrival:0.98, response:0.72, tracking:0.46, place:0.28 },0.93), heart_memory: T({ heart_memory:0.92, reception:0.58, place:0.44, drift:0.2 },0.78),
  mixed_weather: T({ reach:0.46,tracking:0.5,drift:0.52,friction:0.45,folding:0.45,response:0.5,aliveness:0.48,reception:0.3 },0.67),
  low_confidence_fog: T({ drift:0.28, place:0.24, inhabited_silence:0.46, reception:0.25 },0.22),
};
