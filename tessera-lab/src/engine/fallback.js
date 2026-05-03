export class FallbackRenderer {
  constructor({ THREE, scene, stateRef }) {
    this.THREE = THREE;
    this.scene = scene;
    this.stateRef = stateRef;
    this.count = 1800;
    this.phase = 0;

    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const seeds = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const radius = 1.0 + Math.random() * 4.5;
      const angle = Math.random() * Math.PI * 2;
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = (Math.random() - 0.5) * 5;
      positions[i3 + 2] = Math.sin(angle) * radius;
      seeds[i] = Math.random() * Math.PI * 2;
      colors[i3] = 0.42 + Math.random() * 0.12;
      colors[i3 + 1] = 0.58 + Math.random() * 0.2;
      colors[i3 + 2] = 0.82 + Math.random() * 0.15;
    }

    this.seeds = seeds;
    this.positions = positions;

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.038,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  update(dt = 0.016) {
    this.phase += dt;
    const s = this.stateRef?.current || {};
    const tracking = s.tracking || 0;
    const arrival = s.arrival || 0;
    const drift = s.drift || 0;
    const aliveness = s.aliveness || 0;
    const positions = this.positions;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const seed = this.seeds[i];
      const wobble = 0.0016 + drift * 0.0025;
      positions[i3] += Math.sin(this.phase * 0.7 + seed) * wobble;
      positions[i3 + 1] += Math.cos(this.phase * 0.9 + seed * 2.1) * wobble * (0.7 + tracking);
      positions[i3 + 2] += Math.sin(this.phase * 0.6 + seed * 1.4) * wobble;

      if (Math.abs(positions[i3]) > 6) positions[i3] *= -0.86;
      if (Math.abs(positions[i3 + 1]) > 4) positions[i3 + 1] *= -0.86;
      if (Math.abs(positions[i3 + 2]) > 6) positions[i3 + 2] *= -0.86;
    }

    this.material.opacity = 0.62 + aliveness * 0.24 + arrival * 0.08;
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
