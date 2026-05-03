const DEFAULTS = {
  tracking: 0.55,
  reach: 0.52,
  reception: 0.5,
  friction: 0.42,
  drift: 0.36,
  aliveness: 0.64,
  sterility: 0.28,
  overSmoothness: 0.32,
  unresolvedOpenness: 0.48,
  arrival: 0.2,
  heartMemory: 0.5,
};

export const PARAM_KEYS = Object.freeze(Object.keys(DEFAULTS));

export function createState(seed = 2026) {
  const target = { ...DEFAULTS };
  const current = { ...DEFAULTS };
  return {
    seed,
    mode: 'public',
    recording: false,
    time: 0,
    target,
    current,
    smoothing: 0.08,
  };
}

export function setParam(state, key, value) {
  if (!(key in state.target)) return;
  state.target[key] = clamp01(value);
}

export function setSeed(state, seed) {
  state.seed = Number.isFinite(seed) ? Math.max(0, Math.floor(seed)) : state.seed;
}

export function setMode(state, mode) {
  state.mode = mode === 'developer' ? 'developer' : 'public';
}

export function resetState(state) {
  PARAM_KEYS.forEach((k) => {
    state.target[k] = DEFAULTS[k];
    state.current[k] = DEFAULTS[k];
  });
  state.time = 0;
}

export function restState(state) {
  PARAM_KEYS.forEach((k) => {
    state.target[k] = (DEFAULTS[k] + 0.5) * 0.5;
  });
}

export function updateState(state, dt) {
  state.time += dt;
  const smooth = Math.max(0.005, state.smoothing * (1 - state.current.overSmoothness * 0.5));
  PARAM_KEYS.forEach((key) => {
    const delta = state.target[key] - state.current[key];
    state.current[key] += delta * (1 - Math.exp(-dt * 60 * smooth));
  });
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}
