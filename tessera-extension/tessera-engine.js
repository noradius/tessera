// ============================================================
// TESSERA ENGINE — Chrome Extension Module
// Ported from Tessera v2 visualization
// A witness, not a judge.
// ============================================================

(function () {
  'use strict';

  const THREE = window.THREE;

  // ---- GLSL Shaders ----

  const vertexShader = `
  attribute float aBaseHue;
  attribute float aSaturation;
  attribute float aBrightness;
  attribute float aSize;
  attribute float aPhase;
  attribute float aOpacity;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uResolution;
  varying float vHue;
  varying float vSaturation;
  varying float vBrightness;
  varying float vOpacity;
  varying float vPhase;
  void main() {
    vHue = aBaseHue;
    vSaturation = aSaturation;
    vBrightness = aBrightness;
    vOpacity = aOpacity;
    vPhase = aPhase;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float breath1 = sin(uTime * 0.8 + vPhase * 6.2831);
    float breath2 = sin(uTime * 0.23 + vPhase * 3.1416);
    float pulse = 1.0 + 0.08 * breath1 + 0.035 * breath2;
    gl_PointSize = aSize * pulse * uPixelRatio * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

  const fragmentShader = `
  varying float vHue;
  varying float vSaturation;
  varying float vBrightness;
  varying float vOpacity;
  varying float vPhase;
  uniform float uTime;
  uniform float uReceptionGlow;
  vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
  }
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    float baseAlpha = exp(-dist * dist * 50.0);
    float glowAlpha = exp(-dist * dist * (50.0 - uReceptionGlow * 15.0));
    float alpha = mix(baseAlpha, glowAlpha, uReceptionGlow * 0.3);
    if (alpha < 0.02) discard;
    float cappedBright = min(vBrightness, 0.60);
    vec3 color = hsl2rgb(vHue, vSaturation, cappedBright);
    float coreBright = exp(-dist * dist * 80.0) * 0.04;
    color += coreBright;
    float maxC = max(color.r, max(color.g, color.b));
    if (maxC > 0.85) {
      color = mix(color, color / maxC * 0.85, smoothstep(0.85, 1.2, maxC));
    }
    gl_FragColor = vec4(color, alpha * vOpacity);
  }
`;

  const lineVertexShader = `
  attribute float aLineAlpha;
  varying float vLineAlpha;
  void main() {
    vLineAlpha = aLineAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

  const lineFragmentShader = `
  uniform vec3 uLineColor;
  varying float vLineAlpha;
  void main() {
    gl_FragColor = vec4(uLineColor, vLineAlpha * 0.08);
  }
`;

  // ---- Configuration (scaled down for extension 200x200 viewport) ----

  const CONFIG = {
    baseParticleCount: 800,
    maxParticles: 1200,
    baseWidth: 200,
    baseHeight: 200,
    bgColor: 0x000000,
    fieldDepth: 3,
    spatialGridSize: 1.5,
    boidNeighborRadius: 1.4,
    boidSeparationRadius: 0.3,
    maxConnectionParticles: 100,
    maxConnections: 150,
    maxConnectionsPerParticle: 3,
  };

  // ---- Texture State ----

  const defaultTextures = {
    reach: 0, tracking: 0, drift: 0, folding: 0,
    reception: 0, friction: 0, inhabited_silence: 0,
    nowness: 0, place: 0, aliveness: 0,
    arrival: 0, response: 0, heart_memory: 0
  };

  let targetTextures = { ...defaultTextures };
  let currentTextures = { ...defaultTextures };
  let rollingTextures = { ...defaultTextures };
  let confidence = 0;
  let isAnalyzing = false;
  let lastInputTime = 0;
  let arrivalTriggered = false;
  let heartMemoryTriggered = false;
  let arrivalPhase = 0; // 0=none, 1=compress, 2=hold, 3=bloom, 4=settle
  let arrivalTimer = 0;
  let heartMemoryPhase = 0;
  let heartMemoryTimer = 0;
  let preArrivalHueShift = 0;
  let postArrivalHueShift = 0;

  // Spontaneous swirl vortex
  let swirlActive = false;
  let swirlX = 0, swirlY = 0;
  let swirlTimer = 0;
  let swirlDuration = 2.5;
  let swirlDirection = 1;
  let swirlCooldown = 0;

  // Luminance wave
  let lumiWaveActive = false;
  let lumiWaveOriginX = 0, lumiWaveOriginY = 0;
  let lumiWaveDirX = 1, lumiWaveDirY = 0;
  let lumiWaveTimer = 0;
  let lumiWaveDuration = 6.0;
  let lumiWaveCooldown = 0;

  // Transition breathing
  let transitionBreathActive = false;
  let transitionBreathTimer = 0;
  const transitionBreathDuration = 0.8;

  // Folding memory
  let foldingMemory = [];
  let currentCymaticConfig = { freqX: 2.0, freqY: 2.0, amp: 0.5, rotation: 0 };

  // Drift: hue distribution center
  let hueCenterTarget = 0.6;
  let hueCenterCurrent = 0.6;

  // ---- Three.js State ----

  let scene, camera, renderer, particles, clock;
  let particlePositions, particleVelocities, particleBaseHues;
  let particleSaturations, particleBrightnesses, particleSizes, particlePhases, particleOpacities;
  let particleCount;
  let material;
  let connectionLines, lineGeometry, linePositions, lineAlphas;
  let width, height;
  let animationFrameId = null;
  let container = null;
  let resizeObserver = null;

  // Spatial hash grid
  let spatialGrid = {};

  function hashKey(x, y) {
    const gx = Math.floor(x / CONFIG.spatialGridSize);
    const gy = Math.floor(y / CONFIG.spatialGridSize);
    return gx + ',' + gy;
  }

  function buildSpatialGrid() {
    spatialGrid = {};
    for (let i = 0; i < particleCount; i++) {
      const key = hashKey(particlePositions[i * 3], particlePositions[i * 3 + 1]);
      if (!spatialGrid[key]) spatialGrid[key] = [];
      spatialGrid[key].push(i);
    }
  }

  // Pre-allocated neighbor buffer to avoid GC pressure
  const neighborBuffer = new Int32Array(256);
  let neighborCount = 0;

  function getNeighborIndices(x, y) {
    const gx = Math.floor(x / CONFIG.spatialGridSize);
    const gy = Math.floor(y / CONFIG.spatialGridSize);
    neighborCount = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = spatialGrid[(gx + dx) + ',' + (gy + dy)];
        if (cell) {
          for (let j = 0; j < cell.length && neighborCount < 256; j++) {
            neighborBuffer[neighborCount++] = cell[j];
          }
        }
      }
    }
    return neighborCount;
  }

  // ---- Noise ----

  function pseudoNoise(x, y, seed) {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 43758.5453) * 43758.5453;
    return n - Math.floor(n);
  }

  function smoothNoise(x, y, t) {
    return Math.sin(x * 1.7321 + y * 1.4142 + t) * 0.5 +
           Math.sin(x * 2.2360 - y * 1.7321 + t * 0.7) * 0.3 +
           Math.sin(-x * 1.4142 + y * 2.6457 - t * 0.5) * 0.2;
  }

  // ---- Cymatic Field ----

  function cymaticForce(x, y, time) {
    const cfg = currentCymaticConfig;
    const cr = Math.cos(cfg.rotation);
    const sr = Math.sin(cfg.rotation);
    const rx = x * cr - y * sr;
    const ry = x * sr + y * cr;

    const f1 = Math.sin(rx * cfg.freqX + time * 0.15) * Math.cos(ry * cfg.freqY + time * 0.12);
    const f2 = Math.sin((rx + ry) * cfg.freqX * 0.7 + time * 0.1) * 0.5;
    const f3 = Math.cos(rx * cfg.freqY * 1.3 - ry * cfg.freqX * 0.8 + time * 0.08) * 0.3;
    const f4 = cfg.amp > 0.3 ? Math.sin(rx * cfg.freqX * 1.618 + ry * cfg.freqY * 1.618 + time * 0.05) *
               Math.cos((rx - ry) * cfg.freqX * 0.618 + time * 0.13) * 0.25 * (cfg.amp - 0.3) / 0.7 : 0;
    const field = (f1 + f2 + f3 + f4) * cfg.amp;

    const eps = 0.05;
    const fx1 = Math.sin((rx + eps) * cfg.freqX + time * 0.15) * Math.cos(ry * cfg.freqY + time * 0.12);
    const fx2 = Math.sin((rx + eps + ry) * cfg.freqX * 0.7 + time * 0.1) * 0.5;
    const fx3 = Math.cos((rx + eps) * cfg.freqY * 1.3 - ry * cfg.freqX * 0.8 + time * 0.08) * 0.3;
    const fx4 = cfg.amp > 0.3 ? Math.sin((rx + eps) * cfg.freqX * 1.618 + ry * cfg.freqY * 1.618 + time * 0.05) *
                Math.cos(((rx + eps) - ry) * cfg.freqX * 0.618 + time * 0.13) * 0.25 * (cfg.amp - 0.3) / 0.7 : 0;
    const fieldDx = ((fx1 + fx2 + fx3 + fx4) * cfg.amp - field) / eps;

    const fy1 = Math.sin(rx * cfg.freqX + time * 0.15) * Math.cos((ry + eps) * cfg.freqY + time * 0.12);
    const fy2 = Math.sin((rx + ry + eps) * cfg.freqX * 0.7 + time * 0.1) * 0.5;
    const fy3 = Math.cos(rx * cfg.freqY * 1.3 - (ry + eps) * cfg.freqX * 0.8 + time * 0.08) * 0.3;
    const fy4 = cfg.amp > 0.3 ? Math.sin(rx * cfg.freqX * 1.618 + (ry + eps) * cfg.freqY * 1.618 + time * 0.05) *
                Math.cos((rx - (ry + eps)) * cfg.freqX * 0.618 + time * 0.13) * 0.25 * (cfg.amp - 0.3) / 0.7 : 0;
    const fieldDy = ((fy1 + fy2 + fy3 + fy4) * cfg.amp - field) / eps;

    return { fx: -fieldDx, fy: -fieldDy };
  }

  // ---- Turbulence Zones (Friction) ----

  let turbulenceZones = [
    { x: 2, y: 1, vx: -0.08, vy: 0.06, radius: 2.0 },
    { x: -2, y: -1, vx: 0.08, vy: -0.06, radius: 2.0 },
    { x: 0, y: -2, vx: 0.05, vy: 0.07, radius: 1.8 },
  ];

  function updateTurbulenceZones(dt) {
    for (const z of turbulenceZones) {
      z.x += z.vx * dt;
      z.y += z.vy * dt;
      if (Math.abs(z.x) > 6) z.vx *= -1;
      if (Math.abs(z.y) > 6) z.vy *= -1;
    }
  }

  // ---- Shape Attractor (Place) ----

  function shapeAttractorForce(x, y, time, placeStrength) {
    if (placeStrength < 0.05) return { fx: 0, fy: 0 };

    const dist = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);

    const breathe = Math.sin(time * 0.3) * 0.3 * placeStrength;
    const targetRadius = 3.0 + breathe;

    const radialDiff = targetRadius - dist;
    let rf;
    if (radialDiff > 0) {
      const interiorFalloff = dist / targetRadius;
      rf = radialDiff * placeStrength * 0.008 * interiorFalloff;
    } else {
      rf = radialDiff * placeStrength * 0.03;
    }

    const rotAngle = time * 0.08;
    const angleDiff = angle - rotAngle;
    const angularBias = (Math.cos(angleDiff) * 0.5 + 0.5);
    const biasBoost = angularBias * placeStrength * 0.008;
    const angularBias2 = (Math.cos(angleDiff * 2.0 + 1.5) * 0.5 + 0.5);
    const biasBoost2 = angularBias2 * placeStrength * 0.004;

    const totalRf = rf + (radialDiff > 0 ? biasBoost + biasBoost2 : 0);

    return {
      fx: Math.cos(angle) * totalRf,
      fy: Math.sin(angle) * totalRf,
    };
  }

  // ---- Update Textures ----

  function updateTextures(dt) {
    const t = currentTextures;
    const tgt = targetTextures;
    const roll = rollingTextures;

    const climateTextures = ['place', 'response', 'aliveness'];
    const weatherTextures = ['reach', 'tracking', 'drift', 'folding', 'friction', 'reception'];

    for (const key of climateTextures) {
      roll[key] = roll[key] * 0.85 + tgt[key] * 0.15;
      t[key] += (roll[key] - t[key]) * 0.3 * dt;
    }

    for (const key of weatherTextures) {
      roll[key] = roll[key] * 0.85 + tgt[key] * 0.15;
      t[key] += (roll[key] - t[key]) * 1.2 * dt;
    }

    // Inhabited silence -- direct (event-like)
    t.inhabited_silence += (tgt.inhabited_silence - t.inhabited_silence) * 1.5 * dt;

    // Derive Nowness
    if (t.tracking > 0.6 && t.reception > 0.6 && t.drift > 0.4) {
      t.nowness += (1.0 - t.nowness) * 0.5 * dt;
    } else {
      t.nowness += (0.0 - t.nowness) * 0.8 * dt;
    }

    // Aliveness decay
    const timeSinceInput = (Date.now() - lastInputTime) / 1000;
    if (lastInputTime > 0 && timeSinceInput > 5) {
      const decayRate = 1.0 - t.aliveness * 0.8;
      const decay = Math.max(0, 1.0 - decayRate * 0.01 * dt);
      for (const key of weatherTextures) {
        t[key] *= (1.0 - 0.005 * decayRate * dt);
      }
    }

    // Drift: shift hue center
    const driftRate = t.drift * 0.02;
    hueCenterTarget += driftRate * dt;
    if (hueCenterTarget > 1) hueCenterTarget -= 1;
    hueCenterCurrent += (hueCenterTarget - hueCenterCurrent) * 0.3 * dt;

    // Response: color temperature
    if (t.response > 0.5) {
      hueCenterTarget = 0.05 + (1 - t.response) * 0.5;
    } else if (t.response < 0.3) {
      hueCenterTarget = 0.55 + t.response * 0.2;
    }

    // Update cymatic config based on textures
    const textureIntensity = overallIntensity();
    currentCymaticConfig.freqX = 1.5 + textureIntensity * 3.0;
    currentCymaticConfig.freqY = 1.5 + textureIntensity * 2.5;
    currentCymaticConfig.amp = textureIntensity * 0.8;
    currentCymaticConfig.rotation += t.drift * 0.01 * dt;

    // Folding: store and recall configurations
    if (t.folding > 0.3 && foldingMemory.length > 0) {
      const recalled = foldingMemory[Math.floor(Math.random() * foldingMemory.length)];
      currentCymaticConfig.freqX += (recalled.freqX - currentCymaticConfig.freqX) * t.folding * 0.1 * dt;
      currentCymaticConfig.freqY += (recalled.freqY - currentCymaticConfig.freqY) * t.folding * 0.1 * dt;
    }
  }

  function overallIntensity() {
    const t = currentTextures;
    return Math.min(1, (t.reach + t.tracking + t.drift + t.folding + t.friction + t.reception) / 4.0) * confidence;
  }

  // ---- Lightning Events ----

  function updateLightningEvents(dt) {
    // Arrival
    if (targetTextures.arrival > 0.85 && !arrivalTriggered) {
      arrivalTriggered = true;
      arrivalPhase = 1;
      arrivalTimer = 0;
      preArrivalHueShift = hueCenterCurrent;
      postArrivalHueShift = Math.random();
    }

    if (arrivalPhase > 0) {
      arrivalTimer += dt;
      if (arrivalPhase === 1 && arrivalTimer > 0.5) { arrivalPhase = 2; arrivalTimer = 0; }
      if (arrivalPhase === 2 && arrivalTimer > 0.3) { arrivalPhase = 3; arrivalTimer = 0; }
      if (arrivalPhase === 3 && arrivalTimer > 0.7) { arrivalPhase = 4; arrivalTimer = 0; }
      if (arrivalPhase === 4 && arrivalTimer > 3.0) {
        arrivalPhase = 0;
        arrivalTimer = 0;
        hueCenterTarget = postArrivalHueShift;
        hueCenterCurrent = postArrivalHueShift;
      }
    }

    // Heart Memory
    if (targetTextures.heart_memory > 0.5 && !heartMemoryTriggered) {
      heartMemoryTriggered = true;
      heartMemoryPhase = 1;
      heartMemoryTimer = 0;
    }

    if (heartMemoryPhase > 0) {
      heartMemoryTimer += dt;
      if (heartMemoryTimer > 3.0) {
        heartMemoryPhase = 0;
        heartMemoryTimer = 0;
      }
    }
  }

  // ---- Ambient Events ----

  function updateAmbientEvents(dt) {
    const t = currentTextures;

    // Swirl vortex
    if (swirlActive) {
      swirlTimer += dt;
      if (swirlTimer >= swirlDuration) {
        swirlActive = false;
        swirlCooldown = (8 + Math.random() * 4) * (1.0 - t.aliveness * 0.4);
      }
    } else {
      swirlCooldown -= dt;
      if (swirlCooldown <= 0) {
        swirlActive = true;
        swirlTimer = 0;
        swirlDuration = (2.0 + Math.random() * 1.5) * (1.0 - t.aliveness * 0.3);
        swirlX = (Math.random() - 0.5) * 6;
        swirlY = (Math.random() - 0.5) * 6;
        swirlDirection = Math.random() > 0.5 ? 1 : -1;
      }
    }

    // Luminance wave
    if (lumiWaveActive) {
      lumiWaveTimer += dt;
      if (lumiWaveTimer >= lumiWaveDuration) {
        lumiWaveActive = false;
        lumiWaveCooldown = 15 + Math.random() * 10;
      }
    } else {
      lumiWaveCooldown -= dt;
      if (lumiWaveCooldown <= 0) {
        lumiWaveActive = true;
        lumiWaveTimer = 0;
        lumiWaveDuration = 5.0 + Math.random() * 2.0;
        const angle = Math.random() * 6.2831;
        lumiWaveDirX = Math.cos(angle);
        lumiWaveDirY = Math.sin(angle);
        lumiWaveOriginX = -lumiWaveDirX * 8;
        lumiWaveOriginY = -lumiWaveDirY * 8;
      }
    }
  }

  // ---- Main Particle Update ----

  function updateParticles(dt, time) {
    const t = currentTextures;
    const intensity = overallIntensity();
    const aspect = width / height;
    const fieldW = 5 * (aspect > 1 ? aspect : 1);
    const fieldH = 5 * (aspect < 1 ? 1 / aspect : 1);

    // Compute field center of mass for drift correction
    let comX = 0, comY = 0;
    for (let i = 0; i < particleCount; i++) {
      comX += particlePositions[i * 3];
      comY += particlePositions[i * 3 + 1];
    }
    comX /= particleCount;
    comY /= particleCount;
    const driftCorrX = -comX * 0.05;
    const driftCorrY = -comY * 0.05;

    // Build spatial grid for boid lookups
    const doFlocking = t.tracking > 0.05;
    if (doFlocking) buildSpatialGrid();

    // Arrival compression/expansion force
    let arrivalRadialForce = 0;
    let arrivalSatBoost = 0;
    let arrivalBrightBoost = 0;
    if (arrivalPhase === 1) {
      arrivalRadialForce = -8.0 * easeInQuad(arrivalTimer / 0.5);
      arrivalSatBoost = arrivalTimer / 0.5 * 0.3;
    } else if (arrivalPhase === 2) {
      arrivalRadialForce = -10.0;
      arrivalSatBoost = 0.5;
      arrivalBrightBoost = 0.3;
    } else if (arrivalPhase === 3) {
      const p = arrivalTimer / 0.7;
      arrivalRadialForce = 12.0 * (1 - easeOutQuad(p));
      arrivalSatBoost = 1.0 * (1 - p);
      arrivalBrightBoost = 0.5 * (1 - p);
    } else if (arrivalPhase === 4) {
      const p = arrivalTimer / 3.0;
      arrivalSatBoost = 0.3 * (1 - easeOutQuad(p));
      arrivalBrightBoost = 0.1 * (1 - easeOutQuad(p));
    }

    // Heart Memory warmth wave
    let heartWarmth = 0;
    let heartWaveRadius = 0;
    if (heartMemoryPhase > 0) {
      const p = heartMemoryTimer / 3.0;
      heartWarmth = 0.3 * (1 - easeOutQuad(p));
      heartWaveRadius = p * 10.0;
    }

    // Inhabited Silence
    const silenceMultiplier = 1.0 - t.inhabited_silence * 0.85;

    // Nowness
    const nownessSlowdown = 1.0 - t.nowness * 0.15;
    const nownessNoise = t.nowness * 0.3;

    // Loading state
    const loadingBreath = isAnalyzing ? 0.15 : 0;
    let loadingRadialPulse = 0;
    let loadingSatBoost = 0;
    if (isAnalyzing) {
      const breathCycle = Math.sin(time * 2.094);
      loadingRadialPulse = breathCycle * 0.015;
      loadingSatBoost = (breathCycle * 0.5 + 0.5) * 0.08;
    }

    // Transition breath
    let transitionPull = 0;
    if (transitionBreathActive) {
      transitionBreathTimer += dt;
      if (transitionBreathTimer >= transitionBreathDuration) {
        transitionBreathActive = false;
      } else {
        const tp = transitionBreathTimer / transitionBreathDuration;
        transitionPull = tp < 0.4 ? (tp / 0.4) * 0.04 : (1.0 - (tp - 0.4) / 0.6) * 0.04;
      }
    }

    // Alternate cymatic/friction calculations between frames
    const frameToggle = Math.floor(time * 60) & 1;

    // Batch startle
    const startleCount = Math.max(0, Math.round(particleCount * 0.0002 * 60 * dt));
    const startleSet = new Set();
    for (let s = 0; s < startleCount; s++) {
      startleSet.add(Math.floor(Math.random() * particleCount));
    }

    // Swirl vortex pre-computation
    let swirlStrength = 0, swirlFade = 0;
    if (swirlActive) {
      const sp = swirlTimer / swirlDuration;
      swirlFade = sp < 0.2 ? sp / 0.2 : (1.0 - (sp - 0.2) / 0.8);
      swirlFade = swirlFade * swirlFade * (3.0 - 2.0 * swirlFade);
      const swirlBase = 0.4 + t.tracking * 0.4;
      const silenceDampen = 1.0 - t.inhabited_silence * 0.6;
      swirlStrength = swirlBase * swirlFade * silenceDampen;
    }

    // Luminance wave position
    let lumiWavePos = 0, lumiFade = 0;
    if (lumiWaveActive) {
      const lp = lumiWaveTimer / lumiWaveDuration;
      lumiFade = lp < 0.15 ? lp / 0.15 : (lp > 0.85 ? (1.0 - lp) / 0.15 : 1.0);
      lumiFade *= (1.0 - t.inhabited_silence * 0.7);
      lumiWavePos = lp * 16.0;
    }

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;
      const px = particlePositions[ix];
      const py = particlePositions[iy];
      const pz = particlePositions[iz];

      let fx = driftCorrX, fy = driftCorrY;

      // 1. Brownian drift
      const brownianAmp = 0.12 + nownessNoise * 0.1 + loadingBreath;
      const tOff = particlePhases[i] * 20.0;
      fx += smoothNoise(px * 0.3, py * 0.3, time * 0.5 + tOff) * brownianAmp;
      fy += smoothNoise(py * 0.3, -px * 0.3, time * 0.5 + tOff + 7.0) * brownianAmp;

      // 2. Cymatic attractor field
      if (intensity > 0.05 && ((i + frameToggle) & 1) === 0) {
        const cymatic = cymaticForce(px, py, time);
        const cymaticStr = intensity * (0.06 + intensity * 0.08);
        fx += cymatic.fx * cymaticStr;
        fy += cymatic.fy * cymaticStr;
      }

      // 3. Place shape attractor
      if (t.place > 0.05) {
        const shape = shapeAttractorForce(px, py, time, t.place);
        fx += shape.fx;
        fy += shape.fy;
      }

      // 4. Boid rules (Tracking)
      if (doFlocking && (i & 3) === 0) {
        const nTotal = getNeighborIndices(px, py);
        let sepFx = 0, sepFy = 0;
        let alignFx = 0, alignFy = 0;
        let cohFx = 0, cohFy = 0;
        let nCount = 0;
        const maxNeighborChecks = 10;
        const nRadSq = CONFIG.boidNeighborRadius * CONFIG.boidNeighborRadius;
        const sepRadSq = CONFIG.boidSeparationRadius * CONFIG.boidSeparationRadius;

        for (let n = 0; n < nTotal && nCount < maxNeighborChecks; n++) {
          const j = neighborBuffer[n];
          if (j === i) continue;
          const dx = particlePositions[j * 3] - px;
          const dy = particlePositions[j * 3 + 1] - py;
          const distSq = dx * dx + dy * dy;

          if (distSq < nRadSq && distSq > 0.001) {
            nCount++;

            if (distSq < sepRadSq) {
              const repel = 1.0 - distSq / sepRadSq;
              sepFx -= dx * repel;
              sepFy -= dy * repel;
            }

            alignFx += particleVelocities[j * 3];
            alignFy += particleVelocities[j * 3 + 1];

            cohFx += dx;
            cohFy += dy;
          }
        }

        if (nCount > 0) {
          const trackStr = t.tracking * 0.5;
          fx += sepFx * trackStr * 1.2;
          fy += sepFy * trackStr * 1.2;
          alignFx /= nCount;
          alignFy /= nCount;
          fx += (alignFx - particleVelocities[ix]) * trackStr * 1.5;
          fy += (alignFy - particleVelocities[iy]) * trackStr * 1.5;
          cohFx /= nCount;
          cohFy /= nCount;
          fx += cohFx * trackStr * 0.2;
          fy += cohFy * trackStr * 0.2;
        }
      }

      // 5. Friction turbulence zones
      if (t.friction > 0.05) {
        for (const zone of turbulenceZones) {
          const dx = px - zone.x;
          const dy = py - zone.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < zone.radius) {
            const influence = (1 - dist / zone.radius) * t.friction;
            const scatterAngle = Math.atan2(dy, dx) + smoothNoise(px, py, time * 2) * 2;
            fx += Math.cos(scatterAngle) * influence * 0.8;
            fy += Math.sin(scatterAngle) * influence * 0.8;
          }
        }
      }

      // 6. Arrival radial force
      if (arrivalRadialForce !== 0) {
        const dist = Math.sqrt(px * px + py * py) + 0.001;
        fx += (px / dist) * arrivalRadialForce;
        fy += (py / dist) * arrivalRadialForce;
      }

      // 7+8. Center attractor + boundary
      const distSqCenter = px * px + py * py;
      const distFromCenter = Math.sqrt(distSqCenter);
      const innerPull = distFromCenter * (0.005 + loadingRadialPulse + transitionPull);
      const outerPull = distFromCenter > 3.5 ? (distFromCenter - 3.5) * 0.04 : 0;
      const totalPull = innerPull + outerPull;
      const invDist = 1.0 / (distFromCenter + 0.001);
      fx -= px * invDist * totalPull;
      fy -= py * invDist * totalPull;
      const edgeDist = distFromCenter / (fieldW * 0.7);
      if (edgeDist > 0.8) {
        const pushback = (edgeDist - 0.8) * 2.0;
        fx -= px * pushback * 0.5;
        fy -= py * pushback * 0.5;
      }

      // Batched startle impulse
      if (startleSet.has(i)) {
        const startleAngle = Math.random() * 6.2831;
        const startleForce = 0.3 + Math.random() * 0.4;
        fx += Math.cos(startleAngle) * startleForce;
        fy += Math.sin(startleAngle) * startleForce;
      }

      // Swirl vortex
      if (swirlActive && swirlStrength > 0.01) {
        const sdx = px - swirlX;
        const sdy = py - swirlY;
        const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sDist < 1.5 && sDist > 0.1) {
          const sFalloff = 1.0 - sDist / 1.5;
          fx += (-sdy / sDist) * swirlStrength * sFalloff * swirlDirection;
          fy += (sdx / sDist) * swirlStrength * sFalloff * swirlDirection;
          fx -= sdx * 0.02 * swirlStrength * sFalloff;
          fy -= sdy * 0.02 * swirlStrength * sFalloff;
          const swirlPhase = (swirlX * 1.7321 + swirlY * 1.4142) % 1.0;
          const phaseDiff = swirlPhase - particlePhases[i];
          particlePhases[i] += phaseDiff * sFalloff * 0.012 * dt * 60;
        }
      }

      // Apply forces to velocity
      particleVelocities[ix] += fx * dt;
      particleVelocities[iy] += fy * dt;

      // Per-particle damping variation
      const damping = 0.955 + particlePhases[i] * 0.035; // 0.955-0.99
      particleVelocities[ix] *= damping;
      particleVelocities[iy] *= damping;

      // Depth parallax
      const depthFactor = 0.85 + (pz + CONFIG.fieldDepth / 2) / CONFIG.fieldDepth * 0.3;
      const speedMult = silenceMultiplier * nownessSlowdown * depthFactor;
      particlePositions[ix] += particleVelocities[ix] * dt * 60 * speedMult;
      particlePositions[iy] += particleVelocities[iy] * dt * 60 * speedMult;

      // Z: gentle layering drift
      particlePositions[iz] += Math.sin(time * 0.2 + particlePhases[i] * 6.28) * 0.002;
      particlePositions[iz] = Math.max(-CONFIG.fieldDepth / 2, Math.min(CONFIG.fieldDepth / 2, particlePositions[iz]));

      // ---- Color / Visual Updates ----
      const reachRaw = t.reach * (0.5 + confidence * 0.5);
      const reachDrive = Math.pow(reachRaw, 0.6);
      const restSat = 0.05 + particlePhases[i] * 0.10;
      const activeSat = 0.60 + particlePhases[i] * 0.35;
      const targetSat = restSat + (activeSat - restSat) * reachDrive + arrivalSatBoost + loadingSatBoost;

      const restBright = 0.15 + (1 - particlePhases[i]) * 0.10;
      const activeBright = 0.40 + (1 - particlePhases[i]) * 0.20;
      const targetBright = restBright + (activeBright - restBright) * intensity + arrivalBrightBoost;

      const restOpacity = 0.30 + particlePhases[i] * 0.15;
      const activeOpacity = 0.40 + particlePhases[i] * 0.15;
      const targetOpacity = restOpacity + (activeOpacity - restOpacity) * intensity;
      const receptionFade = 1.0 - t.reception * 0.15;

      const targetSize = 0.8 + intensity * 0.6 + t.reception * 0.5;

      // Heart Memory warmth wave
      let warmthBoost = 0;
      if (heartMemoryPhase > 0) {
        const particleDist = Math.sqrt(px * px + py * py);
        const waveDist = Math.abs(particleDist - heartWaveRadius);
        if (waveDist < 2.0) {
          warmthBoost = heartWarmth * (1 - waveDist / 2.0);
        }
      }

      // Display hue
      let displayHue = particleBaseHues[i];
      const hueShift = (hueCenterCurrent - 0.5) * intensity * 0.15;
      displayHue = (displayHue + hueShift + warmthBoost * 0.08) % 1.0;
      if (displayHue < 0) displayHue += 1;

      // Smooth lerp toward targets
      particleSaturations[i] += (targetSat - particleSaturations[i]) * 2.0 * dt;
      particleBrightnesses[i] += (targetBright - particleBrightnesses[i]) * 2.0 * dt;
      particleSizes[i] += (targetSize - particleSizes[i]) * 2.0 * dt;
      particleOpacities[i] += (targetOpacity * receptionFade - particleOpacities[i]) * 2.0 * dt;

      // Velocity-dependent opacity
      const vSpeed = Math.sqrt(particleVelocities[ix] * particleVelocities[ix] + particleVelocities[iy] * particleVelocities[iy]);
      const velocityOpacityMod = -Math.min(0.03, vSpeed * 0.10) + 0.015;

      // Edge fade
      let displayOpacity = particleOpacities[i] + velocityOpacityMod;
      if (edgeDist > 0.5) {
        const t_edge = Math.min(1.0, (edgeDist - 0.5) / 0.5);
        const fade = 1.0 - t_edge * t_edge * (3.0 - 2.0 * t_edge);
        displayOpacity *= fade;
      }

      // Luminance wave
      if (lumiWaveActive && lumiFade > 0) {
        const proj = (px - lumiWaveOriginX) * lumiWaveDirX + (py - lumiWaveOriginY) * lumiWaveDirY;
        const waveDist = Math.abs(proj - lumiWavePos);
        if (waveDist < 3.0) {
          const waveInfluence = Math.exp(-waveDist * waveDist / 4.5) * lumiFade;
          displayOpacity += waveInfluence * 0.07;
          particleBrightnesses[i] += waveInfluence * 0.02;
        }
      }

      // Write to buffer attributes
      particles.geometry.attributes.aBaseHue.array[i] = displayHue;
      particles.geometry.attributes.aSaturation.array[i] = Math.min(1, Math.max(0, particleSaturations[i]));
      particles.geometry.attributes.aBrightness.array[i] = Math.min(1, Math.max(0, particleBrightnesses[i]));
      particles.geometry.attributes.aSize.array[i] = particleSizes[i];
      particles.geometry.attributes.aOpacity.array[i] = Math.min(1, Math.max(0, displayOpacity));
    }

    // Mark attributes for update
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.aBaseHue.needsUpdate = true;
    particles.geometry.attributes.aSaturation.needsUpdate = true;
    particles.geometry.attributes.aBrightness.needsUpdate = true;
    particles.geometry.attributes.aSize.needsUpdate = true;
    particles.geometry.attributes.aOpacity.needsUpdate = true;

    // Update material uniforms
    material.uniforms.uTime.value = time;
    material.uniforms.uReceptionGlow.value = t.reception;

    // Update connection line color to track hue center
    const lineHue = hueCenterCurrent;
    const lineSat = 0.3 + intensity * 0.4;
    const lineLight = 0.4 + intensity * 0.2;
    const lc = (1 - Math.abs(2 * lineLight - 1)) * lineSat;
    const lx = lc * (1 - Math.abs((lineHue * 6) % 2 - 1));
    const lm = lineLight - lc / 2;
    let lr, lg, lb;
    const lh6 = lineHue * 6;
    if (lh6 < 1) { lr = lc; lg = lx; lb = 0; }
    else if (lh6 < 2) { lr = lx; lg = lc; lb = 0; }
    else if (lh6 < 3) { lr = 0; lg = lc; lb = lx; }
    else if (lh6 < 4) { lr = 0; lg = lx; lb = lc; }
    else if (lh6 < 5) { lr = lx; lg = 0; lb = lc; }
    else { lr = lc; lg = 0; lb = lx; }
    connectionLines.material.uniforms.uLineColor.value.set(lr + lm, lg + lm, lb + lm);

    // Connection Lines
    updateConnectionLines(t.tracking);
  }

  // ---- Connection Lines ----

  function updateConnectionLines(tracking) {
    let lineIdx = 0;
    const maxLines = CONFIG.maxConnections;

    if (tracking > 0.4) {
      const checkCount = Math.min(CONFIG.maxConnectionParticles, particleCount);
      const step = Math.max(1, Math.floor(particleCount / checkCount));
      const connectDist = 0.8 + tracking * 1.0;
      const connectDistSq = connectDist * connectDist;
      const alphaBase = (tracking - 0.4) / 0.6;

      for (let i = 0; i < particleCount && lineIdx < maxLines; i += step) {
        const px = particlePositions[i * 3];
        const py = particlePositions[i * 3 + 1];
        const pz = particlePositions[i * 3 + 2];
        let connectionsThisParticle = 0;

        const nTotal = getNeighborIndices(px, py);
        for (let n = 0; n < nTotal && lineIdx < maxLines && connectionsThisParticle < CONFIG.maxConnectionsPerParticle; n++) {
          const j = neighborBuffer[n];
          if (j <= i) continue;
          const dx = particlePositions[j * 3] - px;
          const dy = particlePositions[j * 3 + 1] - py;
          const distSq = dx * dx + dy * dy;
          if (distSq < connectDistSq && distSq > 0.04) {
            const vix = particleVelocities[i * 3], viy = particleVelocities[i * 3 + 1];
            const vjx = particleVelocities[j * 3], vjy = particleVelocities[j * 3 + 1];
            const viLen = Math.sqrt(vix * vix + viy * viy);
            const vjLen = Math.sqrt(vjx * vjx + vjy * vjy);
            if (viLen < 0.001 || vjLen < 0.001) continue;
            const cosAngle = (vix * vjx + viy * vjy) / (viLen * vjLen);
            if (cosAngle < 0.5) continue;

            const distFactor = 1.0 - distSq / connectDistSq;
            const alpha = alphaBase * distFactor * (cosAngle - 0.5) * 2.0;

            const vi = lineIdx * 2;
            linePositions[vi * 3] = px;
            linePositions[vi * 3 + 1] = py;
            linePositions[vi * 3 + 2] = pz;
            linePositions[(vi + 1) * 3] = particlePositions[j * 3];
            linePositions[(vi + 1) * 3 + 1] = particlePositions[j * 3 + 1];
            linePositions[(vi + 1) * 3 + 2] = particlePositions[j * 3 + 2];
            lineAlphas[vi] = alpha;
            lineAlphas[vi + 1] = alpha;
            lineIdx++;
            connectionsThisParticle++;
          }
        }
      }
    }

    // Clear remaining
    for (let i = lineIdx; i < CONFIG.maxConnections; i++) {
      const vi = i * 2;
      linePositions[vi * 3] = 0;
      linePositions[vi * 3 + 1] = 0;
      linePositions[vi * 3 + 2] = 0;
      linePositions[(vi + 1) * 3] = 0;
      linePositions[(vi + 1) * 3 + 1] = 0;
      linePositions[(vi + 1) * 3 + 2] = 0;
      lineAlphas[vi] = 0;
      lineAlphas[vi + 1] = 0;
    }

    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.aLineAlpha.needsUpdate = true;
    lineGeometry.setDrawRange(0, lineIdx * 2);
  }

  // ---- Easing Functions ----

  function easeInQuad(t) { return t * t; }
  function easeOutQuad(t) { return t * (2 - t); }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  // ---- Create Particles ----

  function createParticles() {
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const baseHues = new Float32Array(particleCount);
    const saturations = new Float32Array(particleCount);
    const brightnesses = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);

    const aspect = width / height;
    const fieldW = 5 * aspect;
    const fieldH = 5;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.6) * 6.0;
      positions[i * 3] = Math.cos(angle) * radius * (aspect > 1 ? aspect * 0.6 : 1);
      positions[i * 3 + 1] = Math.sin(angle) * radius * (aspect < 1 ? (1 / aspect) * 0.6 : 1);
      positions[i * 3 + 2] = (Math.random() - 0.5) * CONFIG.fieldDepth;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = 0;

      baseHues[i] = Math.random();
      saturations[i] = 0.05 + Math.random() * 0.10;
      brightnesses[i] = 0.15 + Math.random() * 0.10;
      sizes[i] = 0.8 + Math.random() * 0.6;
      phases[i] = Math.random();
      opacities[i] = 0.40 + Math.random() * 0.20;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aBaseHue', new THREE.BufferAttribute(baseHues, 1));
    geometry.setAttribute('aSaturation', new THREE.BufferAttribute(saturations, 1));
    geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightnesses, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uResolution: { value: new THREE.Vector2(width, height) },
        uReceptionGlow: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    particlePositions = positions;
    particleVelocities = velocities;
    particleBaseHues = baseHues;
    particleSaturations = saturations;
    particleBrightnesses = brightnesses;
    particleSizes = sizes;
    particlePhases = phases;
    particleOpacities = opacities;
  }

  // ---- Create Connection Lines ----

  function createConnectionLines() {
    lineGeometry = new THREE.BufferGeometry();
    const maxVerts = CONFIG.maxConnections * 2;
    linePositions = new Float32Array(maxVerts * 3);
    lineAlphas = new Float32Array(maxVerts);

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('aLineAlpha', new THREE.BufferAttribute(lineAlphas, 1));

    const lineMaterial = new THREE.ShaderMaterial({
      vertexShader: lineVertexShader,
      fragmentShader: lineFragmentShader,
      uniforms: {
        uLineColor: { value: new THREE.Vector3(0.5, 0.6, 0.8) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    connectionLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(connectionLines);
  }

  // ---- Animation Loop ----

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();

    updateTextures(dt);
    updateLightningEvents(dt);
    updateTurbulenceZones(dt);
    updateAmbientEvents(dt);
    updateParticles(dt, time);

    renderer.render(scene, camera);
  }

  // ---- Resize (ResizeObserver-based) ----

  function onResize() {
    if (!container || !renderer) return;
    width = container.clientWidth;
    height = container.clientHeight;
    if (width === 0 || height === 0) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    material.uniforms.uResolution.value.set(width, height);
  }

  // ---- Init (adapted for container param, transparent bg) ----

  function init(containerEl) {
    container = containerEl;
    width = container.clientWidth || 200;
    height = container.clientHeight || 200;

    particleCount = Math.min(
      CONFIG.maxParticles,
      Math.max(CONFIG.baseParticleCount, Math.floor(CONFIG.baseParticleCount * (width * height) / (CONFIG.baseWidth * CONFIG.baseHeight)))
    );

    scene = new THREE.Scene();

    const aspect = width / height;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 0, 14);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // transparent background
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    createParticles();
    createConnectionLines();
    animate();

    // Use ResizeObserver instead of window resize
    resizeObserver = new ResizeObserver(function () {
      onResize();
    });
    resizeObserver.observe(container);
  }

  // ---- Destroy (cleanup) ----

  function destroy() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    if (renderer && container) {
      container.removeChild(renderer.domElement);
      renderer.dispose();
      renderer = null;
    }

    if (particles) {
      particles.geometry.dispose();
      material.dispose();
      particles = null;
      material = null;
    }

    if (connectionLines) {
      connectionLines.geometry.dispose();
      connectionLines.material.dispose();
      connectionLines = null;
    }

    if (scene) {
      scene = null;
    }

    camera = null;
    clock = null;
    container = null;

    // Reset state
    targetTextures = { ...defaultTextures };
    currentTextures = { ...defaultTextures };
    rollingTextures = { ...defaultTextures };
    confidence = 0;
    isAnalyzing = false;
    lastInputTime = 0;
    arrivalTriggered = false;
    heartMemoryTriggered = false;
    arrivalPhase = 0;
    arrivalTimer = 0;
    heartMemoryPhase = 0;
    heartMemoryTimer = 0;
    preArrivalHueShift = 0;
    postArrivalHueShift = 0;
    swirlActive = false;
    swirlX = 0; swirlY = 0;
    swirlTimer = 0;
    swirlDuration = 2.5;
    swirlDirection = 1;
    swirlCooldown = 0;
    lumiWaveActive = false;
    lumiWaveOriginX = 0; lumiWaveOriginY = 0;
    lumiWaveDirX = 1; lumiWaveDirY = 0;
    lumiWaveTimer = 0;
    lumiWaveDuration = 6.0;
    lumiWaveCooldown = 0;
    transitionBreathActive = false;
    transitionBreathTimer = 0;
    foldingMemory = [];
    currentCymaticConfig = { freqX: 2.0, freqY: 2.0, amp: 0.5, rotation: 0 };
    hueCenterTarget = 0.6;
    hueCenterCurrent = 0.6;
    spatialGrid = {};
    turbulenceZones = [
      { x: 2, y: 1, vx: -0.08, vy: 0.06, radius: 2.0 },
      { x: -2, y: -1, vx: 0.08, vy: -0.06, radius: 2.0 },
      { x: 0, y: -2, vx: 0.05, vy: 0.07, radius: 1.8 },
    ];
  }

  // ---- Public API ----

  window.TesseraEngine = {
    init: function (containerEl) {
      init(containerEl);
    },

    setTextures: function (textureObj, conf) {
      // Store current cymatic config for folding memory
      if (foldingMemory.length >= 3) foldingMemory.shift();
      foldingMemory.push({ ...currentCymaticConfig });

      // Transition breath
      transitionBreathActive = true;
      transitionBreathTimer = 0;

      // Apply textures
      targetTextures = { ...defaultTextures, ...textureObj };
      confidence = conf || 0.5;
      lastInputTime = Date.now();

      // Reset lightning triggers for new analysis
      arrivalTriggered = false;
      heartMemoryTriggered = false;
    },

    setAnalyzing: function (bool) {
      isAnalyzing = bool;
    },

    triggerEvent: function (eventName) {
      if (eventName === 'heartMemory') {
        heartMemoryTriggered = false;
        targetTextures.heart_memory = 1.0;
      }
    },

    destroy: function () {
      destroy();
    }
  };

})();
