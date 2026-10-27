import * as THREE from 'three';
import { paperTexture } from '../world/paper.js';
import { circle, heart } from '../world/shapes.js';

const KINDS = {
  puff: { shape: circle(0, 0, 0.2), color: '#f4ede4', grow: 1.6, rise: 0.5, drag: 1.4 },
  smoke: { shape: circle(0, 0, 0.07), color: '#d8d2cc', grow: 2.2, rise: 0.6, drag: 0.6 },
  heart: { shape: heart(0.14), color: '#ff6f91', grow: 0.4, rise: 0.9, drag: 1.0 },
  soot: { shape: circle(0, 0, 0.2), color: '#5a5258', grow: 1.8, rise: 0.4, drag: 1.6 },
  spark: { shape: circle(0, 0, 0.06), color: '#ffd27a', grow: 0, rise: -1.2, drag: 1.1, glow: 2.4 },
};

/** Paper puffs of smoke and little hearts that float up and fade. */
export class Particles {
  constructor(scene, size = 110) {
    this.pool = [];
    const geos = {};
    for (const [k, def] of Object.entries(KINDS)) {
      geos[k] = new THREE.ExtrudeGeometry(def.shape, { depth: 0.02, bevelEnabled: false, curveSegments: 14 });
    }
    for (let i = 0; i < size; i++) {
      const mat = new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 1, transparent: true });
      const mesh = new THREE.Mesh(geos.puff, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, geos, vel: new THREE.Vector3(), life: 0, age: 0, kind: 'puff', scale: 1 });
    }
  }

  spawn(kind, pos, vel = new THREE.Vector3(), { life = 1.2, scale = 1, color = null } = {}) {
    const p = this.pool.find((q) => !q.mesh.visible) || this.pool[0];
    p.kind = kind;
    p.mesh.geometry = p.geos[kind];
    const def = KINDS[kind];
    p.mesh.material.color.set(color || def.color);
    p.mesh.material.emissive.set(def.glow ? color || def.color : '#000000');
    p.mesh.material.emissiveIntensity = def.glow || 0;
    p.mesh.position.copy(pos);
    p.mesh.rotation.z = (Math.random() - 0.5) * 0.6;
    p.vel.copy(vel);
    p.life = life;
    p.age = 0;
    p.scale = scale;
    p.mesh.visible = true;
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.mesh.visible) continue;
      const def = KINDS[p.kind];
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.multiplyScalar(Math.exp(-def.drag * dt));
      p.vel.y += def.rise * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const s = p.scale * (1 + def.grow * u) * Math.min(1, u * 8);
      p.mesh.scale.set(s, s, 1);
      p.mesh.material.opacity = 1 - u * u;
    }
  }

  clear() {
    for (const p of this.pool) p.mesh.visible = false;
  }
}
