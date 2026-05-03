const THREE = window.THREE;
if (!THREE) throw new Error('THREE is unavailable.');

const QUALITY_LEVELS = {
  low: { particles: 1600, maxFilaments: 130, filamentStride: 4, filamentEvery: 3, pixelRatioCap: 1.25 },
  medium: { particles: 2400, maxFilaments: 220, filamentStride: 3, filamentEvery: 2, pixelRatioCap: 1.5 },
  high: { particles: 3200, maxFilaments: 320, filamentStride: 3, filamentEvery: 2, pixelRatioCap: 2 },
  ultra: { particles: 4200, maxFilaments: 420, filamentStride: 2, filamentEvery: 1, pixelRatioCap: 2 },
};

export class TesseraEngine {
  constructor(canvas) {
    if (!canvas) throw new Error('Missing canvas element.');
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.frameNumber = 0;
    this.qualityLevel = 'high';
    this.qualityOverride = false;
    this.currentPreset = 'rest';
    this.lastAdaptiveAt = 0;

    this.fallbackMode = false;
    this.tesseraEnabled = false;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    this.camera.position.z = 8;

    this.tmpVec2a = new THREE.Vector2();
    this.tmpVec2b = new THREE.Vector2();
    this.perf = { frameCount: 0, currentFps: 0, averageFps: 0, worstFrameMs: 0, hitchCount: 0, hitchWindow: 0, lastHitchLogAt: 0, frameTimes: [], sumFrameMs: 0 };

    this.#initParticlesAndFilaments();
    this.#buildPoints();
    this.resize();

    this.resizeTimeout = 0;
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.resize(), 80);
    });

    this.#enableSafeMode();
    this.#tryEnableTesseraMode();
  }

  #initParticlesAndFilaments() {
    const q = QUALITY_LEVELS[this.qualityLevel];
    this.count = q.particles;
    this.activeCount = this.count;
    this.maxFilaments = q.maxFilaments;
    this.filamentStride = q.filamentStride;
    this.filamentEvery = q.filamentEvery;
    this.pixelRatioCap = q.pixelRatioCap;

    this.positions = new Float32Array(this.count * 3);
    this.base = new Float32Array(this.count * 3);
    this.hues = new Float32Array(this.count);
    this.sizes = new Float32Array(this.count);
    this.opacity = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);
    this.linePos = new Float32Array(this.maxFilaments * 6);
    this.lineAlpha = new Float32Array(this.maxFilaments * 2);
    this.filamentCount = 0;

    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      const r = Math.pow(Math.random(), 0.65) * 4.5;
      const a = Math.random() * Math.PI * 2;
      this.base[k] = Math.cos(a) * r;
      this.base[k + 1] = Math.sin(a) * r;
      this.base[k + 2] = (Math.random() - 0.5) * 3.1;
      this.positions[k] = this.base[k]; this.positions[k + 1] = this.base[k + 1]; this.positions[k + 2] = this.base[k + 2];
      this.hues[i] = 0.54 + (Math.random() - 0.5) * 0.18;
      this.phase[i] = Math.random() * Math.PI * 2;
      this.sizes[i] = 0.82 + Math.random() * 1.05;
      this.opacity[i] = 0.3 + Math.random() * 0.48;
    }
  }

  #buildPoints() { /* unchanged core */
    this.pointsGeometry = new THREE.BufferGeometry();
    this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointsGeometry.setAttribute('aHue', new THREE.BufferAttribute(this.hues, 1));
    this.pointsGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.pointsGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacity, 1));
    this.pointsGeometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phase, 1));
    this.safeMaterial = new THREE.PointsMaterial({ size: 0.05, transparent: true, opacity: 0.68, color: new THREE.Color('#7ba7ff'), depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.tesseraMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uEnergy: { value: 0.28 }, uFog: { value: 0.25 }, uArrival: { value: 0 }, uHeart: { value: 0 } },
      vertexShader: `attribute float aHue;attribute float aSize;attribute float aOpacity;attribute float aPhase;varying float vHue;varying float vAlpha;varying float vPhase;uniform float uTime;uniform float uEnergy;void main(){vHue=aHue;vAlpha=aOpacity;vPhase=aPhase;vec3 p=position;float mur=sin(uTime*0.45+aPhase)*0.08+cos(uTime*0.25+aPhase*0.6)*0.07; p.xy*=1.0+mur*uEnergy;vec4 mv=modelViewMatrix*vec4(p,1.0);float depthScale=clamp(80.0/max(1.0,-mv.z),0.9,2.5);gl_PointSize=max(1.1,aSize*(1.0+uEnergy*0.72)*depthScale);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying float vHue;varying float vAlpha;varying float vPhase;uniform float uEnergy;uniform float uFog;uniform float uArrival;uniform float uHeart;vec3 h2r(float h,float s,float l){float c=(1.-abs(2.*l-1.))*s;float x=c*(1.-abs(mod(h*6.,2.)-1.));float m=l-c*.5;vec3 r;if(h<1./6.)r=vec3(c,x,0.);else if(h<2./6.)r=vec3(x,c,0.);else if(h<3./6.)r=vec3(0.,c,x);else if(h<4./6.)r=vec3(0.,x,c);else if(h<5./6.)r=vec3(x,0.,c);else r=vec3(c,0.,x);return r+m;}void main(){vec2 p=gl_PointCoord-0.5;float d=length(p);float core=exp(-d*d*58.0);float halo=exp(-d*d*19.0);float a=(core*0.8+halo*0.22)*max(0.25,vAlpha);if(a<0.02) discard;float h=vHue+sin(vPhase)*uEnergy*0.03+uHeart*0.04;float sat=0.46+uEnergy*0.16;float lit=0.28+uEnergy*0.1+uArrival*0.06;vec3 col=h2r(fract(h),sat,lit);col += vec3(0.01,0.03,0.08)*halo*(1.0-uFog*0.6);col = mix(col, vec3(0.92,0.94,0.98), min(0.2,uArrival*core*0.32));float peak=max(col.r,max(col.g,col.b));if(peak>0.92) col*=mix(1.0,0.92/peak,0.85);gl_FragColor=vec4(col,min(0.88,a));}` });
    this.points = new THREE.Points(this.pointsGeometry, this.safeMaterial); this.scene.add(this.points);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.lineGeometry.setAttribute('aLineAlpha', new THREE.BufferAttribute(this.lineAlpha, 1));
    this.lineMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uLineColor: { value: new THREE.Vector3(0.9, 0.96, 1.0) } },
      vertexShader: `attribute float aLineAlpha;varying float vA;void main(){vA=aLineAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 uLineColor;varying float vA;void main(){gl_FragColor=vec4(uLineColor,vA*0.1);}` });
    this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial); this.scene.add(this.lines);
  }

  beginFrame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const ms = dt * 1000;
    this.frameNumber += 1;
    this.perf.frameCount += 1;
    this.perf.currentFps = 1 / Math.max(dt, 1e-6);
    this.perf.frameTimes.push(ms);
    this.perf.sumFrameMs += ms;
    while (this.perf.sumFrameMs > 3000 && this.perf.frameTimes.length > 1) this.perf.sumFrameMs -= this.perf.frameTimes.shift();
    let total = 0; let worst = 0;
    for (let i = 0; i < this.perf.frameTimes.length; i++) { const v = this.perf.frameTimes[i]; total += v; if (v > worst) worst = v; }
    this.perf.averageFps = total > 0 ? (1000 / (total / this.perf.frameTimes.length)) : 0;
    this.perf.worstFrameMs = worst;
    if (ms > 33) { this.perf.hitchCount += 1; this.perf.hitchWindow += 1; }
    return dt;
  }

  update(state) {
    const t = this.clock.elapsedTime;
    const s = state.current;
    const energy = 0.24 + s.reach * 0.22 + s.tracking * 0.28 + s.friction * 0.18 + s.aliveness * 0.12;
    const arrivalPull = state.arrivalPhase > 0 ? 1 - Math.min(1, state.arrivalTimer / 0.8) : 0;
    for (let i = 0; i < this.activeCount; i++) {
      const k = i * 3; const ph = this.phase[i]; const baseX = this.base[k]; const baseY = this.base[k + 1]; const baseZ = this.base[k + 2];
      const mur = Math.sin(t * (0.32 + s.tracking * 0.55) + ph) * (0.1 + s.tracking * 0.34);
      const drift = Math.cos(t * 0.21 + i * 0.011) * s.drift * 0.31;
      const friction = Math.sin(baseY * 1.7 + t * 1.4) * s.friction * 0.22;
      const fold = Math.sin((baseX + baseY) * (0.55 + s.folding) + t * 0.35) * s.folding * 0.22;
      this.positions[k] = baseX + (mur + drift + friction - baseX * arrivalPull * 0.15) * (1 + s.reach * 0.32);
      this.positions[k + 1] = baseY + (Math.cos(t * 0.34 + ph) * (0.1 + s.reception * 0.22) + fold - baseY * arrivalPull * 0.15);
      this.positions[k + 2] = baseZ + Math.sin(t * 0.27 + ph * 1.2) * (0.18 + s.inhabited_silence * 0.13);
    }

    if (this.frameNumber % this.filamentEvery === 0) this.#updateFilaments(s, t);
    this.pointsGeometry.attributes.position.needsUpdate = true;
    if (!this.fallbackMode && this.tesseraEnabled) {
      this.tesseraMaterial.uniforms.uTime.value = t;
      this.tesseraMaterial.uniforms.uEnergy.value = energy;
      this.tesseraMaterial.uniforms.uFog.value = 1 - state.confidence;
      this.tesseraMaterial.uniforms.uArrival.value = state.arrivalPhase === 3 ? 1 : 0;
      this.tesseraMaterial.uniforms.uHeart.value = state.heartMemoryWave;
    }

    this.renderer.render(this.scene, this.camera);
    this.#maybeAdapt();
  }

  #updateFilaments(s, t) {
    const presetBoost = this.currentPreset === 'tracking' ? 1.2 : (this.currentPreset === 'rest' ? 0.5 : 1);
    const filamentRate = (0.006 + s.tracking * 0.02 + s.reception * 0.018 + (s.arrival || 0) * 0.01) * presetBoost;
    let c = 0;
    for (let i = 0; i < this.activeCount - 1 && c < this.maxFilaments; i += this.filamentStride) {
      if (Math.random() > filamentRate) continue;
      const j = (i + 7 + ((i * 13) % 29)) % this.activeCount;
      const a = i * 3; const b = j * 3;
      const dx = this.positions[a] - this.positions[b]; const dy = this.positions[a + 1] - this.positions[b + 1];
      const d = Math.hypot(dx, dy);
      if (d < 0.14 || d > 0.88) continue;
      const p = c * 6; const ap = c * 2;
      this.linePos[p] = this.positions[a]; this.linePos[p + 1] = this.positions[a + 1]; this.linePos[p + 2] = this.positions[a + 2];
      this.linePos[p + 3] = this.positions[b]; this.linePos[p + 4] = this.positions[b + 1]; this.linePos[p + 5] = this.positions[b + 2];
      const alpha = (1 - d / 0.9) * (0.12 + s.tracking * 0.34 + s.reception * 0.18) * (0.66 + 0.3 * Math.sin(t + i));
      this.lineAlpha[ap] = alpha; this.lineAlpha[ap + 1] = alpha; c++;
    }
    this.filamentCount = c;
    this.lineGeometry.setDrawRange(0, c * 2);
    this.lineGeometry.attributes.position.needsUpdate = true;
    this.lineGeometry.attributes.aLineAlpha.needsUpdate = true;
  }

  #maybeAdapt() {
    if (this.qualityOverride || this.clock.elapsedTime - this.lastAdaptiveAt < 5) return;
    if (this.perf.averageFps < 50 || this.perf.hitchWindow > 6) {
      this.lastAdaptiveAt = this.clock.elapsedTime;
      this.perf.hitchWindow = 0;
      if (this.qualityLevel === 'high') this.setQualityLevel('medium', false);
      else if (this.qualityLevel === 'medium') this.setQualityLevel('low', false);
      const now = performance.now();
      if (now - this.perf.lastHitchLogAt > 7000) { this.perf.lastHitchLogAt = now; console.warn('[Tessera V2] adaptive quality downshifted to', this.qualityLevel); }
    }
  }

  setQualityLevel(level, manual) {
    if (!QUALITY_LEVELS[level] || level === this.qualityLevel) return;
    this.qualityLevel = level;
    this.qualityOverride = manual;
    const q = QUALITY_LEVELS[level];
    this.maxFilaments = q.maxFilaments; this.filamentStride = q.filamentStride; this.filamentEvery = q.filamentEvery; this.pixelRatioCap = q.pixelRatioCap;
    this.activeCount = Math.min(this.activeCount, q.particles);
    this.resize();
  }
  setPreset(name) { this.currentPreset = name; }
  resize() {
    const width = Math.max(1, this.canvas.parentElement?.clientWidth || window.innerWidth || 1);
    const height = Math.max(1, this.canvas.parentElement?.clientHeight || window.innerHeight || 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.pixelRatioCap));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  getDebugSnapshot(currentPreset, state) {
    this.renderer.getSize(this.tmpVec2a); this.renderer.getDrawingBufferSize(this.tmpVec2b);
    return {
      running: true, frameCount: this.perf.frameCount, currentFps: this.perf.currentFps, averageFps: this.perf.averageFps, worstFrameMs: this.perf.worstFrameMs,
      hitchCount: this.perf.hitchCount, particleCount: this.activeCount, filamentCount: this.filamentCount, currentPreset,
      currentTextures: { ...state.current }, targetTextures: { ...state.target }, rendererSize: `${this.tmpVec2a.x}x${this.tmpVec2a.y}`,
      drawingBufferSize: `${this.tmpVec2b.x}x${this.tmpVec2b.y}`, pixelRatio: this.renderer.getPixelRatio(), qualityLevel: this.qualityLevel, fallbackMode: this.fallbackMode,
    };
  }
  #enableSafeMode() { this.fallbackMode = true; this.points.material = this.safeMaterial; }
  #tryEnableTesseraMode() { try { this.points.material = this.tesseraMaterial; this.tesseraEnabled = true; this.fallbackMode = false; } catch (error) { console.error('[Tessera V2] tessera material enable failed; staying in safe mode.', error); this.#enableSafeMode(); } }
}
