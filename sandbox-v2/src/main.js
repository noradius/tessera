import { TesseraEngine } from './tessera-engine.js';
import { TesseraState } from './tessera-state.js';
import { presets } from './tessera-presets.js';

console.log('[Tessera V2] main loaded');
console.log(`[Tessera V2] THREE available: ${Boolean(window.THREE)}`);

const canvas = document.getElementById('tessera-canvas');
const state = new TesseraState();

let engine = null;

try {
  engine = new TesseraEngine(canvas);
  console.log('[Tessera V2] engine initialized');
  console.log(`[Tessera V2] particle count: ${engine.count}`);
  console.log(`[Tessera V2] renderer size: ${engine.getRendererSizeString()}`);

  state.setPreset(presets.rest);

  document.querySelectorAll('#dev-controls button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset;
      console.log(`[Tessera V2] preset selected: ${presetName}`);
      const preset = presets[presetName];
      if (preset) {
        state.setPreset(preset);
      }
    });
  });

  function frame() {
    state.tick(1 / 60);
    engine.update(state);
    requestAnimationFrame(frame);
  }

  console.log('[Tessera V2] animation loop started');
  frame();
} catch (error) {
  console.error('[Tessera V2] initialization failed', error);
}
