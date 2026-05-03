import { TesseraEngine } from './tessera-engine.js';
import { TesseraState } from './tessera-state.js';
import { presets } from './tessera-presets.js';

console.log('[Tessera V2] main loaded');
console.log(`[Tessera V2] THREE available: ${Boolean(window.THREE)}${window.THREE ? ` r${window.THREE.REVISION}` : ''}`);

function boot() {
  const canvas = document.getElementById('tessera-canvas');
  const controls = document.getElementById('dev-controls');
  const controlButtons = Array.from(document.querySelectorAll('#dev-controls button[data-preset]'));
  console.log(`[Tessera V2] canvas found: ${Boolean(canvas)}`);
  console.log(`[Tessera V2] controls found: ${controlButtons.length}`);

  const state = new TesseraState();
  let engine = null;
  let isAnimating = false;
  let currentPreset = 'rest';
  let frameCount = 0;

  try {
    engine = new TesseraEngine(canvas);
    console.log('[Tessera V2] engine initialized');
    console.log(`[Tessera V2] particle count: ${engine.count}`);
    console.log(`[Tessera V2] active particle count: ${engine.activeCount}`);
    console.log(`[Tessera V2] renderer CSS size: ${engine.getRendererSizeString()}`);
    console.log(`[Tessera V2] drawing buffer size: ${engine.getDrawingBufferSizeString()}`);
    console.log(`[Tessera V2] pixel ratio: ${engine.getPixelRatio()}`);

    const applyPreset = (presetName) => {
      const preset = presets[presetName];
      if (!preset) return;
      currentPreset = presetName;
      state.setPreset(preset);
      console.log(`[Tessera V2] preset selected: ${presetName}`);
      console.log('[Tessera V2] target textures:', state.target);
    };

    controlButtons.forEach((btn) => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    if (controls) {
      controls.addEventListener('click', (event) => {
        const targetButton = event.target.closest('button[data-preset]');
        if (!targetButton || !controls.contains(targetButton)) return;
        applyPreset(targetButton.dataset.preset);
      });
    }

    applyPreset('rest');

    window.tesseraDebug = () => ({
      rendererSize: engine.getRendererSizeString(),
      drawingBufferSize: engine.getDrawingBufferSizeString(),
      particleCount: engine.count,
      activeCount: engine.activeCount,
      currentTextures: { ...state.current },
      targetTextures: { ...state.target },
      confidence: state.confidence,
      currentPreset,
      animationRunning: isAnimating,
    });

    function frame() {
      isAnimating = true;
      frameCount += 1;
      state.tick(1 / 60);
      engine.update(state);

      if (frameCount <= 5) {
        const d = engine.getFrameDiagnostics();
        console.log(`[Tessera V2] frame ${frameCount} avgPos=(${d.avgX.toFixed(3)}, ${d.avgY.toFixed(3)}, ${d.avgZ.toFixed(3)}) active=${d.activeCount}`);
        console.log('[Tessera V2] uniforms:', d.uniforms);
        console.log('[Tessera V2] Rest nonzero check:', {
          place: state.current.place,
          aliveness: state.current.aliveness,
          confidence: state.confidence,
        });
      }

      requestAnimationFrame(frame);
    }

    console.log('[Tessera V2] animation loop started');
    frame();
  } catch (error) {
    console.error('[Tessera V2] initialization failed', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
