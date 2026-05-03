const T = (textures, confidence = 0.7) => ({ textures, confidence });

export const presets = {
  rest: T({ place: 0.46, aliveness: 0.38, drift: 0.18, response: 0.2 }, 0.8),
  reach: T({ reach: 0.7, drift: 0.25, response: 0.3 }),
  tracking: T({ tracking: 0.8, place: 0.4, response: 0.35 }),
  drift: T({ drift: 0.75, reception: 0.2, aliveness: 0.25 }),
  folding: T({ folding: 0.8, response: 0.5, drift: 0.3 }),
  reception: T({ reception: 0.82, place: 0.35, aliveness: 0.3 }),
  friction: T({ friction: 0.75, tracking: 0.35, response: 0.45 }),
  inhabited_silence: T({ inhabited_silence: 0.85, place: 0.45, aliveness: 0.2 }, 0.8),
  place: T({ place: 0.9, aliveness: 0.25 }),
  aliveness: T({ aliveness: 0.85, place: 0.4 }),
  nowness: T({ nowness: 0.8, tracking: 0.45, reception: 0.5, drift: 0.45 }),
  arrival: T({ arrival: 0.95, response: 0.6, tracking: 0.35 }, 0.92),
  heart_memory: T({ heart_memory: 0.85, reception: 0.5, place: 0.35 }, 0.74),
  mixed_weather: T({ reach: 0.3, tracking: 0.45, drift: 0.4, friction: 0.35, folding: 0.35, response: 0.4, aliveness: 0.45 }, 0.67),
  low_confidence_fog: T({ drift: 0.2, place: 0.2, inhabited_silence: 0.35 }, 0.2),
};
