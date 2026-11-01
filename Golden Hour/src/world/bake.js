import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merge every static card under `root` into one mesh per material, so a building made of
 * forty cards costs a handful of draw calls instead of eighty. Each card's transform is
 * baked into its vertices. Objects in `skip` (and everything under them) are left alone
 * because they move: clouds, birds, the crane's hook. Lines are left alone too.
 *
 * `root` must sit at the world origin with no rotation or scale.
 */
export function bakeStatic(root, { skip = [] } = {}) {
  const skipped = new Set(skip);
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const baked = [];

  const visit = (o) => {
    if (skipped.has(o)) return;
    if (o.isMesh && o.visible) {
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      const parts = Array.isArray(o.material)
        ? o.geometry.groups.map((g) => [o.material[g.materialIndex], slice(geo, g.start, g.count)])
        : [[o.material, geo]];
      if (Array.isArray(o.material)) geo.dispose();
      for (const [material, part] of parts) {
        const key = `${material.uuid}|${o.castShadow}`;
        if (!buckets.has(key)) buckets.set(key, { material, castShadow: o.castShadow, geos: [] });
        buckets.get(key).geos.push(part);
      }
      baked.push(o);
    }
    for (const child of [...o.children]) visit(child);
  };
  for (const child of [...root.children]) visit(child);

  for (const o of baked) {
    o.parent.remove(o);
    o.geometry.dispose();
  }
  for (const { material, castShadow, geos } of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    root.add(mesh);
    for (const g of geos) g.dispose();
  }
}

/** Vertices [start, start + count) of a non-indexed geometry, as a new geometry. */
function slice(geo, start, count) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = geo.attributes[name];
    if (!a) continue;
    out.setAttribute(name, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
  }
  return out;
}
