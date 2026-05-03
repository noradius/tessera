export const textureKeys = [
  'reach','tracking','drift','folding','reception','friction','inhabited_silence',
  'place','aliveness','response','arrival','heart_memory','nowness'
];

export class TesseraState {
  constructor() {
    this.target = Object.fromEntries(textureKeys.map((k) => [k, 0]));
    this.current = Object.fromEntries(textureKeys.map((k) => [k, 0]));
    this.confidenceTarget = 0.65;
    this.confidence = 0.65;

    this.arrivalPhase = 0;
    this.arrivalTimer = 0;
    this.heartMemoryWave = 0;
    this.heartMemoryTimer = 0;
    this.frictionPulse = 0;
  }

  setPreset(preset) {
    this.target = { ...this.target, ...preset.textures };
    if (typeof preset.confidence === 'number') this.confidenceTarget = preset.confidence;
  }

  tick(dt) {
    for (const key of textureKeys) {
      const t = this.target[key] ?? 0;
      const c = this.current[key] ?? 0;
      const halfLife = ['place', 'aliveness', 'response'].includes(key) ? 4.6 : (['arrival', 'heart_memory'].includes(key) ? 1.1 : 2.4);
      const lambda = Math.pow(0.5, dt / halfLife);
      this.current[key] = c * lambda + t * (1 - lambda);
    }

    const confLambda = Math.pow(0.5, dt / 3.0);
    this.confidence = this.confidence * confLambda + this.confidenceTarget * (1 - confLambda);

    const derivedNowness = Math.min(1, this.current.tracking * 0.43 + this.current.reception * 0.35 + this.current.drift * 0.22);
    this.current.nowness = Math.max(this.current.nowness * (1 - dt * 0.32), derivedNowness * 0.9);

    if (this.current.arrival > 0.72 && this.arrivalPhase === 0) {
      this.arrivalPhase = 1;
      this.arrivalTimer = 0;
    }
    if (this.arrivalPhase > 0) {
      this.arrivalTimer += dt;
      if (this.arrivalPhase === 1 && this.arrivalTimer > 0.55) { this.arrivalPhase = 2; this.arrivalTimer = 0; }
      else if (this.arrivalPhase === 2 && this.arrivalTimer > 0.28) { this.arrivalPhase = 3; this.arrivalTimer = 0; }
      else if (this.arrivalPhase === 3 && this.arrivalTimer > 0.82) { this.arrivalPhase = 4; this.arrivalTimer = 0; }
      else if (this.arrivalPhase === 4 && this.arrivalTimer > 2.6) { this.arrivalPhase = 0; this.arrivalTimer = 0; }
    }

    if (this.current.heart_memory > 0.55 && this.heartMemoryWave <= 0.001) {
      this.heartMemoryWave = 1;
      this.heartMemoryTimer = 0;
    }
    if (this.heartMemoryWave > 0) {
      this.heartMemoryTimer += dt;
      this.heartMemoryWave = Math.max(0, 1 - this.heartMemoryTimer / 3.2);
    }

    this.frictionPulse = this.frictionPulse * (1 - dt * 2.1) + this.current.friction * dt * 1.8;
    this.current.arrival = Math.min(this.current.arrival, this.target.arrival);
  }
}
