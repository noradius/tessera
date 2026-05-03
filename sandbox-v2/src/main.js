import { TesseraEngine } from './tessera-engine.js';
import { TesseraState } from './tessera-state.js';
import { presets } from './tessera-presets.js';

console.log('[Tessera V2] main loaded');

function boot() {
  console.log('[Tessera V2] DOM ready');

  const canvas = document.getElementById('tessera-canvas');
  const controls = document.getElementById('dev-controls');
  const hasTHREE = Boolean(window.THREE);

  console.log(`[Tessera V2] THREE available: ${hasTHREE}${hasTHREE ? ` revision: ${window.THREE.REVISION}` : ''}`);
  console.log(`[Tessera V2] canvas found: ${Boolean(canvas)}`);
  console.log(`[Tessera V2] controls found: ${Boolean(controls)}`);

  const state = new TesseraState();
  let currentPreset = 'rest';
  let engine = null;
  let running = false;
  let frameCount = 0;

  const monitorEl = document.createElement('div');
  monitorEl.id = 'tessera-perf-monitor';
  monitorEl.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9;padding:6px 8px;background:rgba(3,7,13,0.68);color:#c8d8f6;font:11px/1.35 ui-monospace,Menlo,monospace;border:1px solid rgba(110,150,220,0.34);border-radius:4px;pointer-events:none;white-space:pre;display:none;';
  document.body.appendChild(monitorEl);
  let monitorVisible = false;

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
    if (engine) engine.setPreset(presetName);
    console.log(`[Tessera V2] preset selected: ${presetName}`);
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
    engine.setPreset(currentPreset);
    console.log('[Tessera V2] renderer initialized');
  } catch (error) {
    console.error('[Tessera V2] engine initialization failed; controls remain active.', error);
  }

  const keyToPreset = { r: 'rest', t: 'tracking', f: 'friction', a: 'arrival', h: 'heart_memory', m: 'mixed_weather' };
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (keyToPreset[key]) applyPreset(keyToPreset[key]);
    if (key === 'p') {
      monitorVisible = !monitorVisible;
      monitorEl.style.display = monitorVisible ? 'block' : 'none';
    }
    if (key >= '1' && key <= '4' && engine) {
      const levels = ['low', 'medium', 'high', 'ultra'];
      engine.setQualityLevel(levels[Number(key) - 1], true);
    }
  });

  function animate() {
    if (!engine) return;
    running = true;
    frameCount += 1;
    const dt = engine.beginFrame();
    state.tick(dt);
    try {
      engine.update(state);
    } catch (error) {
      console.error('[Tessera V2] runtime renderer error', error);
    }
    if (monitorVisible && frameCount % 8 === 0) {
      const d = engine.getDebugSnapshot(currentPreset, state);
      monitorEl.textContent = `FPS ${d.currentFps.toFixed(1)} avg ${d.averageFps.toFixed(1)}\nworst ${(d.worstFrameMs).toFixed(1)}ms hitch ${d.hitchCount}\nP ${d.particleCount} F ${d.filamentCount}\nq ${d.qualityLevel} pr ${d.pixelRatio.toFixed(2)}\nbuf ${d.drawingBufferSize}`;
    }
    requestAnimationFrame(animate);
  }

  if (engine) {
    console.log('[Tessera V2] animation loop started');
    animate();
  }

  window.tesseraDebug = function tesseraDebug() {
    if (!engine) {
      return { running: false, frameCount, currentPreset, fallbackMode: true };
    }
    const d = engine.getDebugSnapshot(currentPreset, state);
    console.log('[Tessera V2] debug snapshot', d);
    return d;
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
