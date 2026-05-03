export function createRenderer(canvas, state) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  const filaments = [];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureParticles(pulse) {
    const target = Math.floor(100 + pulse.weather.density * 180);
    while (particles.length < target) {
      particles.push({ x: Math.random(), y: Math.random(), v: Math.random() * 0.4 + 0.1 });
    }
    particles.length = target;
  }

  function draw(pulse, dt) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;

    ctx.clearRect(0, 0, w, h);
    drawWeather(w, h, pulse);
    drawHalo(cx, cy, Math.min(w, h) * 0.35, pulse);
    ensureParticles(pulse);
    particles.forEach((p) => {
      p.y = (p.y + dt * p.v * (0.5 + pulse.weather.turbulence)) % 1;
      const x = p.x * w;
      const y = p.y * h;
      const a = 0.12 + pulse.weather.glow * 0.15;
      ctx.fillStyle = `rgba(178,205,255,${a.toFixed(3)})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    });

    updateFilaments(filaments, pulse, dt, w, h);
    filaments.forEach((f) => drawFilament(f));
    drawArrival(cx, cy, pulse, w, h);
  }

  function drawWeather(w, h, pulse) {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
    grad.addColorStop(0, `rgba(90,120,180,${0.08 + pulse.weather.glow * 0.08})`);
    grad.addColorStop(1, 'rgba(6,10,20,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawHalo(cx, cy, r, pulse) {
    const breathScale = 1 + pulse.breathing * 0.03;
    ctx.beginPath();
    ctx.arc(cx, cy, r * breathScale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(170,200,255,${(0.08 + pulse.haloStrength * 0.2).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function updateFilaments(arr, pulse, dt, w, h) {
    if (Math.random() < pulse.filamentChance * dt) {
      arr.push({
        x1: Math.random() * w, y1: Math.random() * h, x2: Math.random() * w, y2: Math.random() * h, life: 0,
      });
    }
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      arr[i].life += dt * (0.2 + pulse.weather.turbulence);
      if (arr[i].life > 1) arr.splice(i, 1);
    }
  }

  function drawFilament(f) {
    const a = Math.max(0, 0.25 * (1 - f.life));
    ctx.strokeStyle = `rgba(140,188,255,${a.toFixed(3)})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.quadraticCurveTo((f.x1 + f.x2) * 0.5, (f.y1 + f.y2) * 0.5 - 40, f.x2, f.y2);
    ctx.stroke();
  }

  function drawArrival(cx, cy, pulse, w, h) {
    const s = pulse.arrival.stage;
    const p = pulse.arrival.progress;
    let scale = 1;
    let alpha = 0.12;
    if (s === 'compression') scale = 1 - p * 0.22;
    if (s === 'withholding') alpha = 0.08;
    if (s === 'release') { scale = 0.78 + p * 0.35; alpha = 0.1 + p * 0.2; }
    if (s === 'afterglow') alpha = 0.24 * (1 - p);

    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.2 * scale, h * 0.12 * (1 + (s === 'afterglow' ? 0.2 : 0)), 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(160,210,255,${alpha.toFixed(3)})`;
    ctx.fill();
  }

  window.addEventListener('resize', resize);
  resize();

  return { draw, resize };
}
