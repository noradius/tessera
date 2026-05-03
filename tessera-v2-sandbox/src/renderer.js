function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createRenderer(canvas, state) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  const filaments = [];

  let rng = createRng(state.seed || 1);
  let noiseSeed = rng() * 1000;
  let particleSeed = state.seed;

  function reseedIfNeeded() {
    if (particleSeed !== state.seed) {
      particleSeed = state.seed;
      rng = createRng(state.seed || 1);
      noiseSeed = rng() * 1000;
      particles.length = 0;
      filaments.length = 0;
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureParticles(pulse, w, h) {
    const target = Math.floor(320 + pulse.weather.density * 920);
    while (particles.length < target) {
      const a = rng() * Math.PI * 2;
      const r = (0.1 + Math.pow(rng(), 0.62) * 0.9) * Math.min(w, h) * 0.34;
      particles.push({
        x: w * 0.5 + Math.cos(a) * r,
        y: h * 0.5 + Math.sin(a) * r,
        vx: (rng() - 0.5) * 20,
        vy: (rng() - 0.5) * 20,
        hue: (0.48 + (rng() - 0.5) * 0.38 + 1) % 1,
        sat: 0.58 + rng() * 0.32,
        light: 0.52 + rng() * 0.12,
        phase: rng() * Math.PI * 2,
        size: 0.8 + rng() * 1.7,
      });
    }
    particles.length = target;
  }

  function draw(pulse, dt) {
    reseedIfNeeded();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;

    ensureParticles(pulse, w, h);
    ctx.clearRect(0, 0, w, h);
    drawDeepWaterBackdrop(w, h, pulse);
    updateAndDrawParticles(pulse, dt, cx, cy, w, h);
    updateAndDrawFilaments(pulse, dt);
    drawArrivalBloom(pulse, cx, cy, w, h);
  }

  function drawDeepWaterBackdrop(w, h, pulse) {
    const g = ctx.createRadialGradient(w * 0.45, h * 0.45, 0, w * 0.5, h * 0.52, Math.max(w, h) * 0.72);
    g.addColorStop(0, `rgba(20,32,66,${(0.36 + pulse.weather.glow * 0.18).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(8,18,40,${(0.62 + pulse.weather.glow * 0.16).toFixed(3)})`);
    g.addColorStop(1, 'rgba(1,4,12,0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function fieldNoise(x, y, t) {
    return Math.sin(x * 0.012 + t * 0.73 + noiseSeed) * 0.5
      + Math.cos(y * 0.017 - t * 0.41 + noiseSeed * 1.7) * 0.35
      + Math.sin((x + y) * 0.009 + t * 0.29) * 0.15;
  }

  function updateAndDrawParticles(pulse, dt, cx, cy, w, h) {
    const neighborRadius = 38 + pulse.weather.density * 30;
    const sepRadius = 13;
    const arrival = pulse.arrival;
    const inwardBias = arrival.stage === 'compression' ? 22 * (1 + arrival.progress) : 7;

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      let ax = 0;
      let ay = 0;
      let close = 0;

      for (let j = Math.max(0, i - 16); j < Math.min(particles.length, i + 16); j += 1) {
        if (i === j) continue;
        const q = particles[j];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < neighborRadius * neighborRadius) {
          close += 1;
          if (d2 > 0.0001) {
            ax += q.vx * 0.012;
            ay += q.vy * 0.012;
            ax += dx * 0.0007;
            ay += dy * 0.0007;
          }
        }
        if (d2 < sepRadius * sepRadius && d2 > 0.0001) {
          ax -= dx * 0.012;
          ay -= dy * 0.012;
        }
      }

      const toCx = cx - p.x;
      const toCy = cy - p.y;
      const dist = Math.hypot(toCx, toCy) + 0.0001;
      ax += (toCx / dist) * inwardBias * 0.08;
      ay += (toCy / dist) * inwardBias * 0.08;

      const n = fieldNoise(p.x, p.y, state.time + p.phase);
      const ang = n * Math.PI * 2.0;
      ax += Math.cos(ang) * (2.4 + pulse.weather.turbulence * 4.2);
      ay += Math.sin(ang) * (2.4 + pulse.weather.turbulence * 4.2);

      if (arrival.stage === 'release' || arrival.stage === 'afterglow') {
        const bloom = arrival.stage === 'release' ? arrival.progress : 1 - arrival.progress * 0.5;
        ax -= (toCx / dist) * bloom * 3.1;
        ay -= (toCy / dist) * bloom * 3.1;
      }

      p.vx = (p.vx + ax * dt) * 0.965;
      p.vy = (p.vy + ay * dt) * 0.965;
      const vmax = 52 + pulse.weather.turbulence * 70;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > vmax) {
        p.vx = (p.vx / sp) * vmax;
        p.vy = (p.vy / sp) * vmax;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      const breath = 1 + pulse.breathing * 0.11 + Math.sin(state.time * 0.9 + p.phase) * 0.08;
      const prismatic = ((p.hue + pulse.weather.density * 0.09 + close * 0.002) + 1) % 1;
      const alpha = 0.16 + pulse.weather.glow * 0.24 + Math.min(0.1, close * 0.0035);
      const radius = p.size * breath * (1 + pulse.weather.glow * 0.25);

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 2.4, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.4);
      glow.addColorStop(0, `hsla(${(prismatic * 360).toFixed(1)},${(p.sat * 100).toFixed(1)}%,${(p.light * 62).toFixed(1)}%,${alpha.toFixed(3)})`);
      glow.addColorStop(1, `hsla(${(prismatic * 360).toFixed(1)},95%,55%,0)`);
      ctx.fillStyle = glow;
      ctx.fill();
    }
  }

  function updateAndDrawFilaments(pulse, dt) {
    const maxNew = Math.floor(2 + pulse.filamentChance * 12);
    for (let k = 0; k < maxNew; k += 1) {
      if (rng() < (0.025 + pulse.filamentChance * 0.06) * dt * 60) {
        const a = particles[(rng() * particles.length) | 0];
        const b = particles[(rng() * particles.length) | 0];
        if (!a || !b || a === b) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 20 && d < 130) {
          filaments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, life: 0, ttl: 0.3 + rng() * 0.7 });
        }
      }
    }

    for (let i = filaments.length - 1; i >= 0; i -= 1) {
      const f = filaments[i];
      f.life += dt;
      if (f.life >= f.ttl) {
        filaments.splice(i, 1);
        continue;
      }
      const t = f.life / f.ttl;
      const a = Math.sin((1 - t) * Math.PI) * (0.16 + pulse.weather.glow * 0.15);
      const mx = (f.ax + f.bx) * 0.5;
      const my = (f.ay + f.by) * 0.5;
      const bend = Math.sin((state.time + i) * 3.2) * 12;

      ctx.strokeStyle = `rgba(124,182,255,${a.toFixed(3)})`;
      ctx.lineWidth = 0.5 + (1 - t) * 1.1;
      ctx.beginPath();
      ctx.moveTo(f.ax, f.ay);
      ctx.quadraticCurveTo(mx + bend, my - bend * 0.6, f.bx, f.by);
      ctx.stroke();
    }
  }

  function drawArrivalBloom(pulse, cx, cy, w, h) {
    const s = pulse.arrival.stage;
    const p = pulse.arrival.progress;
    if (s === 'withholding') return;

    let radius = Math.min(w, h) * 0.18;
    let alpha = 0.08;
    if (s === 'compression') {
      radius *= 1 - p * 0.3;
      alpha = 0.06 + p * 0.04;
    }
    if (s === 'release') {
      radius *= 0.74 + p * 0.75;
      alpha = 0.09 + p * 0.13;
    }
    if (s === 'afterglow') {
      radius *= 1.4 - p * 0.55;
      alpha = (1 - p) * 0.14;
    }

    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    bloom.addColorStop(0, `rgba(190,225,255,${alpha.toFixed(3)})`);
    bloom.addColorStop(0.6, `rgba(108,156,255,${(alpha * 0.45).toFixed(3)})`);
    bloom.addColorStop(1, 'rgba(60,110,220,0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  window.addEventListener('resize', resize);
  resize();

  return { draw, resize };
}
