const T = (textures, confidence = 0.72) => ({ textures, confidence });

export const presets = {
  rest: T({ place: 0.48, aliveness: 0.38, drift: 0.15, response: 0.18, tracking: 0.1 }, 0.82),
  reach: T({ reach: 0.82, drift: 0.35, response: 0.28, aliveness: 0.25 }, 0.75),
  tracking: T({ tracking: 0.92, place: 0.4, response: 0.45, reach: 0.35 }, 0.73),
  drift: T({ drift: 0.85, reception: 0.24, aliveness: 0.24 }, 0.7),
  folding: T({ folding: 0.9, response: 0.52, drift: 0.34, place: 0.25 }, 0.7),
  reception: T({ reception: 0.88, place: 0.32, aliveness: 0.26, tracking: 0.28 }, 0.76),
  friction: T({ friction: 0.88, tracking: 0.48, response: 0.56, drift: 0.32 }, 0.62),
  inhabited_silence: T({ inhabited_silence: 0.9, place: 0.52, aliveness: 0.2, drift: 0.12 }, 0.84),
  place: T({ place: 0.95, aliveness: 0.24, response: 0.2 }, 0.79),
  aliveness: T({ aliveness: 0.92, place: 0.42, response: 0.35, tracking: 0.2 }, 0.74),
  nowness: T({ nowness: 0.88, tracking: 0.52, reception: 0.52, drift: 0.48 }, 0.72),
  arrival: T({ arrival: 0.98, response: 0.68, tracking: 0.42, place: 0.3 }, 0.93),
  heart_memory: T({ heart_memory: 0.9, reception: 0.58, place: 0.42, drift: 0.2 }, 0.76),
  mixed_weather: T({ reach: 0.5, tracking: 0.52, drift: 0.46, friction: 0.5, folding: 0.42, response: 0.48, aliveness: 0.45 }, 0.66),
  low_confidence_fog: T({ drift: 0.26, place: 0.24, inhabited_silence: 0.42, reception: 0.28 }, 0.23),
};
