import { createState, updateState } from './state.js';
import { derivePulse } from './pulseEngine.js';
import { createRenderer } from './renderer.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('field');
const controls = document.getElementById('controls');

const state = createState(2026);
const renderer = createRenderer(canvas, state);
createUI(controls, state);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updateState(state, dt);
  const pulse = derivePulse(state);
  renderer.draw(pulse, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
