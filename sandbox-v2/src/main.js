import { TesseraEngine } from './tessera-engine.js';
import { TesseraState } from './tessera-state.js';
import { presets } from './tessera-presets.js';

const canvas = document.getElementById('tessera-canvas');
const state = new TesseraState();
const engine = new TesseraEngine(canvas);

state.setPreset(presets.rest);

document.querySelectorAll('#dev-controls button').forEach((btn) => {
  btn.addEventListener('click', () => state.setPreset(presets[btn.dataset.preset]));
});

function frame() {
  state.tick(1 / 60);
  engine.update(state);
  requestAnimationFrame(frame);
}
frame();
