import { PARAM_KEYS, resetState, restState, setMode, setParam, setSeed } from './state.js';

const PRESETS = {
  DawnReach: { reach: 0.75, reception: 0.62, aliveness: 0.78, arrival: 0.44 },
  SterileOrbit: { sterility: 0.8, overSmoothness: 0.73, unresolvedOpenness: 0.2, drift: 0.2 },
  TenderArrival: { arrival: 0.88, tracking: 0.68, heartMemory: 0.8, friction: 0.28 },
};

export function createUI(container, state) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <h2>Tessera V2 Sandbox</h2>
    <div class="group row">
      <button data-action="mode">Toggle Developer</button>
      <button data-action="record">Recording: Off</button>
      <button data-action="reset">Reset</button>
      <button data-action="rest">Rest</button>
    </div>
    <div class="group">
      <label>Seed <input data-seed type="number" min="0" step="1" value="${state.seed}" /></label>
      <div class="row">
        <select data-preset>${Object.keys(PRESETS).map((k) => `<option>${k}</option>`).join('')}</select>
        <button data-action="preset">Apply Preset</button>
      </div>
    </div>
    <div class="group" data-sliders></div>
    <div class="group hidden-public"><small>Developer mode exposes full controls for live event triggering.</small></div>
  `;
  container.appendChild(wrapper);

  const sliders = wrapper.querySelector('[data-sliders]');
  PARAM_KEYS.forEach((key) => {
    const label = document.createElement('label');
    label.innerHTML = `${key}<input data-key="${key}" type="range" min="0" max="1" step="0.001" value="${state.target[key]}" />`;
    sliders.appendChild(label);
  });

  wrapper.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('input[data-key]')) setParam(state, t.dataset.key, Number(t.value));
    if (t.matches('input[data-seed]')) setSeed(state, Number(t.value));
  });

  wrapper.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    if (action === 'mode') {
      setMode(state, state.mode === 'public' ? 'developer' : 'public');
      document.body.classList.toggle('developer', state.mode === 'developer');
    }
    if (action === 'record') {
      state.recording = !state.recording;
      e.target.textContent = `Recording: ${state.recording ? 'On' : 'Off'}`;
    }
    if (action === 'reset') resetState(state);
    if (action === 'rest') restState(state);
    if (action === 'preset') {
      const presetName = wrapper.querySelector('[data-preset]').value;
      Object.entries(PRESETS[presetName]).forEach(([k, v]) => setParam(state, k, v));
    }
  });

  return { sync() {} };
}
