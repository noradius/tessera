import { TesseraEngine } from './tessera-engine.js';
import { TesseraState } from './tessera-state.js';
import { presets } from './tessera-presets.js';

console.log('[Tessera V2] main loaded');

function boot() {
  console.log('[Tessera V2] DOM ready');

  const canvas = document.getElementById('tessera-canvas');
  const controls = document.getElementById('dev-controls');
  const buttons = Array.from(document.querySelectorAll('#dev-controls button[data-preset]'));
  const hasTHREE = Boolean(window.THREE);

  console.log(`[Tessera V2] THREE available: ${hasTHREE}${hasTHREE ? ` revision: ${window.THREE.REVISION}` : ''}`);
  console.log(`[Tessera V2] canvas found: ${Boolean(canvas)}`);
  console.log(`[Tessera V2] controls found: ${Boolean(controls)}`);
  console.log(`[Tessera V2] buttons found: ${buttons.length}`);

  const state = new TesseraState();
  let currentPreset = 'rest';
  let engine = null;
  let running = false;
  let frameCount = 0;

  const applyPreset = (presetName) => {
    const preset = presets[presetName];
    if (!preset) return;
    currentPreset = presetName;
    state.setPreset(preset);
    if (controls) {
      const active = controls.querySelector('.is-active');
      if (active) active.classList.remove('is-active');
      const btn = controls.querySelector(`button[data-preset="${presetName}"]`);
      if (btn) btn.classList.add('is-active');
    }
    console.log(`[Tessera V2] preset selected: ${presetName}`);
    console.log('[Tessera V2] target textures:', state.target);
  };

  if (controls) {
    controls.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-preset]');
      if (!button || !controls.contains(button)) return;
      applyPreset(button.dataset.preset);
    });
    console.log('[Tessera V2] controls attached');
  }

  applyPreset('rest');

  try {
    console.log('[Tessera V2] engine init start');
    engine = new TesseraEngine(canvas);
    console.log('[Tessera V2] safe renderer visible');
    if (engine.tesseraEnabled) {
      console.log('[Tessera V2] tessera renderer enabled');
    }
    console.log(`[Tessera V2] particle count: ${engine.count}`);
    console.log(`[Tessera V2] renderer CSS size: ${engine.getRendererSizeString()}`);
    console.log(`[Tessera V2] drawing buffer size: ${engine.getDrawingBufferSizeString()}`);
    console.log(`[Tessera V2] pixel ratio: ${engine.getPixelRatio()}`);
  } catch (error) {
    console.error('[Tessera V2] engine initialization failed; controls remain active.', error);
  }

  function animate() {
    if (!engine) return;
    running = true;
    frameCount += 1;
    state.tick(1 / 60);
    try {
      engine.update(state);
    } catch (error) {
      console.error('[Tessera V2] runtime renderer error', error);
    }
    if (frameCount <= 3) {
      console.log(`[Tessera V2] frame ${frameCount} mode=${engine.getMode()}`);
    }
    requestAnimationFrame(animate);
  }

  if (engine) {
    console.log('[Tessera V2] animation loop started');
    animate();
  }

  window.tesseraDebug = function tesseraDebug() {
    return {
      engineExists: Boolean(engine),
      running,
      frameCount,
      currentPreset,
      targetTextures: { ...state.target },
      currentTextures: { ...state.current },
      confidence: state.confidence,
      rendererSize: engine ? engine.getRendererSizeString() : null,
      drawingBufferSize: engine ? engine.getDrawingBufferSizeString() : null,
      pixelRatio: engine ? engine.getPixelRatio() : null,
      particleCount: engine ? engine.count : 0,
      activeParticleCount: engine ? engine.activeCount : 0,
      fallbackMode: engine ? engine.isFallbackMode() : true,
    };
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
