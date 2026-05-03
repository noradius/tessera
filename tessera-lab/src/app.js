import { TextureState } from './state/texture-state.js';
import { TesseraEngine } from './engine/tessera-engine.js';
import { attachControls } from './lab/controls.js';
import { attachKeyboard } from './lab/keyboard.js';
import { captureCanvas } from './lab/capture.js';

export function createApp() {
  console.log('[Tessera Lab] main loaded');
  const canvas = document.getElementById('tessera-canvas');
  const panel = document.getElementById('lab-panel');
  const perf = document.getElementById('perf-monitor');
  const state = new TextureState();
  let paused = false, slow = 1, preset = 'rest', showPerf = false;
  let engine = null;
  let lastError = null;

  console.log('[Tessera Lab] DOM ready');
  console.log('[Tessera Lab] THREE available:', !!window.THREE, 'revision:', window.THREE?.REVISION ?? 'n/a');
  console.log('[Tessera Lab] canvas found:', !!canvas);

  const app = {
    setPreset: n => { preset = n; state.setPreset(n); engine?.setCurrentPreset(n); console.log('[Tessera Lab] preset', n); },
    setRecipe: n => { state.setRecipe(n); console.log('[Tessera Lab] recipe', n); },
    setIntensity: v => state.setIntensity(v),
    setMotionBoldness: v => state.setMotionBoldness(v),
    setSpectralStrength: v => state.setSpectralStrength(v),
    setFilamentStrength: v => state.setFilamentStrength(v),
    setEventTheatre: v => state.setEventTheatre(v),
    setDensity: v => state.setDensity(v),
    setQuality: q => { state.setQuality(q); engine?.setQualityLevel(q); },
    togglePerf: () => { showPerf = !showPerf; perf.classList.toggle('hidden', !showPerf); },
    action: a => {
      if (a === 'pause') paused = !paused;
      if (a === 'capture') captureCanvas(canvas);
      if (a === 'copy') navigator.clipboard?.writeText(JSON.stringify(window.tesseraDebug(), null, 2));
      if (a === 'slow') slow = slow === 1 ? 0.25 : 1;
    }
  };

  attachControls(panel, app);
  attachKeyboard(app);
  console.log('[Tessera Lab] controls attached');

  try {
    engine = new TesseraEngine(canvas, state);
  } catch (error) {
    lastError = error;
    console.error('[Tessera Lab] engine construction failed', error);
  }

  function loop() {
    try {
      if (!paused) {
        state.tick(0.016 * slow);
        engine?.update(state, 0.016 * slow);
      }
      if (showPerf && engine && engine.frame % 10 === 0) {
        const d = engine.getDebugSnapshot(preset, state);
        perf.textContent = `fps ${d.FPS.toFixed(1)} avg ${d.averageFPS.toFixed(1)}\nP ${d.particleCount} safe ${d.safeModeActive} full ${d.fullEngineActive}`;
      }
    } catch (frameError) {
      lastError = frameError;
      console.error('[Tessera Lab] frame error', frameError);
    }
    requestAnimationFrame(loop);
  }

  window.tesseraDebug = () => {
    if (!engine) {
      return {
        webglContextAcquired: false,
        safeModeActive: false,
        fullEngineActive: false,
        lastError: lastError ? String(lastError.message || lastError) : 'Engine unavailable',
        rendererSize: '0x0',
        drawingBufferSize: '0x0',
        pixelRatio: 1,
        frameCount: 0,
        currentPreset: preset,
        particleCount: 0,
        FPS: 0
      };
    }
    return engine.getDebugSnapshot(preset, state);
  };

  console.log('[Tessera Lab] animation loop started');
  loop();
  state.setPreset('rest');
}
