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

    // derived nowness from tracking + reception + low drift velocity
    const derived = Math.min(1, this.current.tracking * 0.45 + this.current.reception * 0.35 + this.current.drift * 0.2);
    this.current.nowness = Math.max(this.current.nowness, derived * 0.85);

    // keep arrival rare, never auto-escalate.
    this.current.arrival = Math.min(this.current.arrival, this.target.arrival);
  }
}
