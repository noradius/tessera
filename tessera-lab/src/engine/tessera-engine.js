import { FallbackRenderer } from './fallback.js';

export class TesseraEngine {
  constructor(canvas, stateRef) {
    this.canvas = canvas;
    this.stateRef = stateRef;
    this.frame = 0;
    this.running = true;
    this.quality = 'high';
    this.safeModeActive = true;
    this.fullEngineActive = false;
    this.lastError = null;
    this.webglContextAcquired = false;
    this.currentPreset = 'rest';

    this.perf = { fps: 60, avg: 60, worst: 16, hitch: 0, last: performance.now() };

    this.initThree();
    this.createSafeScene();
    this.renderSafeFrame();
    this.initFullEngine();
  }

  initThree() {
    if (!window.THREE) throw new Error('THREE is not available on window.');
    const T = window.THREE;
    this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setClearColor(0x04080f, 1);
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 50);
    this.camera.position.z = 9;
    this.resize();
    addEventListener('resize', () => this.resize());

    const ctx = this.renderer.getContext();
    this.webglContextAcquired = !!ctx;
    console.log('[Tessera Lab] WebGL context acquired:', this.webglContextAcquired);
    if (!this.webglContextAcquired) {
      throw new Error('Failed to acquire WebGL context.');
    }
  }

  createSafeScene() {
    this.safeRenderer = new FallbackRenderer({ THREE: window.THREE, scene: this.scene, stateRef: this.stateRef });
    this.count = this.safeRenderer.count;
    console.log('[Tessera Lab] safe scene created');
  }

  renderSafeFrame() {
    this.renderer.render(this.scene, this.camera);
    console.log('[Tessera Lab] safe frame rendered');
  }

  initFullEngine() {
    console.log('[Tessera Lab] full engine init start');
    try {
      const T = window.THREE;
      const count = { low: 4000, medium: 6500, high: 9800, ultra: 14000 }[this.quality];
      this.count = count;
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const size = new Float32Array(count);
      this.vel = new Float32Array(count * 3);
      this.seed = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const r = Math.random() * 3.8;
        const a = Math.random() * Math.PI * 2;
        pos[i3] = Math.cos(a) * r;
        pos[i3 + 1] = Math.sin(a) * r * (0.6 + Math.random());
        pos[i3 + 2] = (Math.random() - 0.5) * 4;
        this.seed[i3] = Math.random() * 6.28;
        this.seed[i3 + 1] = Math.random();
        this.seed[i3 + 2] = Math.random();
        col[i3] = 0.55;
        col[i3 + 1] = 0.66;
        col[i3 + 2] = 0.82;
        size[i] = 0.016 + Math.random() * 0.02;
      }

      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      g.setAttribute('size', new T.BufferAttribute(size, 1));
      const m = new T.PointsMaterial({ size: 0.03, vertexColors: true, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false });
      this.points = new T.Points(g, m);
      this.scene.add(this.points);

      this.fullEngineActive = true;
      this.safeModeActive = false;
      this.safeRenderer.dispose();
      this.safeRenderer = null;
      console.log('[Tessera Lab] full engine ready');
    } catch (error) {
      this.lastError = error;
      this.fullEngineActive = false;
      this.safeModeActive = true;
      console.error('[Tessera Lab] full engine failed, staying in safe mode', error);
    }
  }

  resize() {
    if (!this.renderer) return;
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.quality === 'ultra' ? 2 : 1.6));
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  setQualityLevel(q) { this.quality = q; }
  setCurrentPreset(preset) { this.currentPreset = preset; }

  update(state, dt) {
    this.frame++;

    if (this.safeModeActive && this.safeRenderer) {
      this.safeRenderer.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.updatePerf();
      return;
    }

    const p = this.points.geometry.attributes.position.array;
    const c = this.points.geometry.attributes.color.array;
    const t = this.frame * 0.01;
    const s = state.current;
    for (let i = 0; i < this.count; i++) {
      const j = i * 3;
      const sx = this.seed[j], sy = this.seed[j + 1], sz = this.seed[j + 2];
      const drift = 0.0012 * (0.5 + s.drift * 2) * state.motionBoldness;
      const flock = s.tracking * 0.006 * state.motionBoldness;
      const shear = s.friction * 0.008;
      const reach = s.reach * 0.006;
      const fog = (1 - state.confidence) * (0.4 + s.response);
      this.vel[j] += Math.sin(t + sx) * drift + (Math.sin(p[j + 1] * 1.7 + t * 1.3)) * shear;
      this.vel[j + 1] += Math.cos(t * 0.9 + sx) * drift + (Math.cos(p[j] * 1.4 - t)) * shear;
      this.vel[j + 2] += Math.sin(t * 1.3 + sx) * drift;
      this.vel[j] += (Math.sin(t * 2 + sy) - 0.5) * reach;
      this.vel[j + 1] += (Math.cos(t * 2.4 + sy) - 0.5) * reach;
      this.vel[j] -= p[j] * flock * 0.015;
      this.vel[j + 1] -= p[j + 1] * flock * 0.015;
      const comp = s.arrival * state.timeline.value('arrival') * 0.02;
      this.vel[j] -= p[j] * comp;
      this.vel[j + 1] -= p[j + 1] * comp;
      const mem = s.heart_memory * state.timeline.value('heart_memory') * 0.012;
      this.vel[j] += Math.sin(t + sz * 8) * mem;
      this.vel[j + 1] += Math.cos(t + sz * 8) * mem;
      this.vel[j] *= 0.965;
      this.vel[j + 1] *= 0.965;
      this.vel[j + 2] *= 0.97;
      p[j] += this.vel[j];
      p[j + 1] += this.vel[j + 1];
      if (Math.abs(p[j]) > 5) p[j] *= -0.8;
      if (Math.abs(p[j + 1]) > 4) p[j + 1] *= -0.8;
      const spec = (s.reach + s.arrival + s.aliveness + s.tracking * 0.5) * state.spectralStrength;
      const warmth = s.heart_memory * state.timeline.value('heart_memory');
      c[j] = 0.45 + spec * 0.45 + warmth * 0.3;
      c[j + 1] = 0.56 + spec * 0.35 + warmth * 0.08;
      c[j + 2] = 0.78 + spec * 0.25 - fog * 0.2;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.material.opacity = Math.max(0.2, 0.85 - ((1 - state.confidence) * (0.4 + s.response)) * 0.4 + s.inhabited_silence * 0.2);
    this.renderer.render(this.scene, this.camera);
    this.updatePerf();
  }

  updatePerf() {
    const now = performance.now();
    const d = now - this.perf.last;
    this.perf.last = now;
    this.perf.fps = 1000 / d;
    this.perf.avg = this.perf.avg * 0.98 + this.perf.fps * 0.02;
    this.perf.worst = Math.max(this.perf.worst, d);
    if (d > 40) this.perf.hitch++;
  }

  getDebugSnapshot(preset, state) {
    const size = this.renderer ? this.renderer.getSize(new window.THREE.Vector2()) : { x: innerWidth, y: innerHeight };
    const db = this.renderer ? this.renderer.getDrawingBufferSize(new window.THREE.Vector2()) : size;
    return {
      running: this.running,
      frameCount: this.frame,
      currentPreset: preset,
      webglContextAcquired: this.webglContextAcquired,
      safeModeActive: this.safeModeActive,
      fullEngineActive: this.fullEngineActive,
      lastError: this.lastError ? String(this.lastError.message || this.lastError) : null,
      rendererSize: `${size.x}x${size.y}`,
      drawingBufferSize: `${db.x}x${db.y}`,
      pixelRatio: this.renderer ? this.renderer.getPixelRatio() : 1,
      particleCount: this.count || 0,
      FPS: this.perf.fps,
      averageFPS: this.perf.avg
    };
  }
}
