import * as THREE from 'three';

// Static, non-interactive room dressing - primitive-built prop groups in
// the same composition style as Player.js's humanoid. Purely cosmetic:
// never read by Grid.js, never touched by the simulation.

function buildCrate(color) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
  );
  box.position.y = 0.21;
  box.castShadow = true;
  g.add(box);
  return g;
}

function buildPlant(color) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f })
  );
  pot.position.y = 0.1;
  g.add(pot);
  const leafMat = new THREE.MeshStandardMaterial({ color });
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 5), leafMat);
    const angle = (i / 4) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.05, 0.36, Math.sin(angle) * 0.05);
    leaf.rotation.z = Math.cos(angle) * 0.35;
    leaf.rotation.x = Math.sin(angle) * 0.35;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

function buildLamp(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  pole.position.y = 0.45;
  g.add(pole);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.18, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 })
  );
  shade.position.y = 0.95;
  g.add(shade);
  return g;
}

function buildPoster(color) {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.7),
    new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 1 })
  );
  panel.position.y = 0.6;
  g.add(panel);
  return g;
}

function buildRug(color) {
  const g = new THREE.Group();
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshStandardMaterial({ color, roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.015;
  g.add(rug);
  return g;
}

const BUILDERS = {
  crate: buildCrate,
  plant: buildPlant,
  lamp: buildLamp,
  poster: buildPoster,
  rug: buildRug,
};

export class Decor {
  constructor(scene, specs, tileSize) {
    this.scene = scene;
    this.groups = [];
    for (const spec of specs || []) {
      const build = BUILDERS[spec.type];
      if (!build) continue;
      const group = build(spec.color ?? 0x888888);
      group.position.set(spec.x * tileSize, 0, spec.y * tileSize);
      if (spec.rotation) group.rotation.y = spec.rotation;
      scene.add(group);
      this.groups.push(group);
    }
  }

  dispose() {
    for (const g of this.groups) {
      this.scene.remove(g);
      g.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) obj.material.dispose?.();
      });
    }
  }
}
