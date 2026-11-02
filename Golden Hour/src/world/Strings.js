import * as THREE from 'three';

/** Strings run up from each object to this height, well above the top of the view. */
const TOP = 26;
const MAX = 48;

/**
 * Paper-theatre strings: everything that hangs in the sky (clouds, birds, the balloon,
 * the banner plane, the UFO…) dangles from a faint thread running up out of frame, as if
 * someone above the stage were holding it. One line-segments mesh for all of them.
 */
export class Strings {
  constructor(scene) {
    this.items = [];
    this.box = new THREE.Box3();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 6), 3));
    geo.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#3a3340', transparent: true, opacity: 0.14 }));
    this.lines.frustumCulled = false;
    scene.add(this.lines);
  }

  attach(object) {
    if (this.items.length < MAX && !this.items.includes(object)) this.items.push(object);
  }

  clear() {
    this.items.length = 0;
    this.lines.geometry.setDrawRange(0, 0);
  }

  update() {
    const arr = this.lines.geometry.attributes.position.array;
    let n = 0;
    for (const o of this.items) {
      if (!isShown(o)) continue;
      this.box.setFromObject(o);
      if (this.box.isEmpty()) continue;
      const x = (this.box.min.x + this.box.max.x) / 2;
      const z = (this.box.min.z + this.box.max.z) / 2 - 0.02;
      arr.set([x, this.box.max.y - 0.05, z, x, TOP, z], n * 6);
      n++;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, n * 2);
  }
}

function isShown(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
