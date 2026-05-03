export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function derivePulse(state) {
  const p = state.current;
  const t = state.time;
  const rng = createRng(state.seed);

  const breathBase = 0.03 + p.drift * 0.02;
  const irregular = (rng() - 0.5) * 0.01 + Math.sin(t * 0.071 + p.heartMemory * 2.7) * 0.008;
  const breathing = Math.sin(t * (breathBase + irregular) * Math.PI * 2);

  const weather = {
    density: 0.18 + p.reception * 0.35 - p.sterility * 0.2,
    turbulence: 0.08 + p.unresolvedOpenness * 0.35 + p.drift * 0.2,
    glow: 0.2 + p.aliveness * 0.55,
  };

  const arrival = arrivalEnvelope(t, p.arrival);

  return {
    breathing,
    weather,
    arrival,
    filamentChance: 0.08 + p.reach * 0.25 + p.tracking * 0.2,
    haloStrength: 0.2 + p.aliveness * 0.45 + Math.max(0, breathing) * 0.2,
  };
}

function arrivalEnvelope(t, arrival) {
  const phase = (t * 0.04 + arrival * 0.8) % 1;
  if (phase < 0.2) return { stage: 'compression', progress: phase / 0.2 };
  if (phase < 0.45) return { stage: 'withholding', progress: (phase - 0.2) / 0.25 };
  if (phase < 0.72) return { stage: 'release', progress: (phase - 0.45) / 0.27 };
  return { stage: 'afterglow', progress: (phase - 0.72) / 0.28 };
}
