import * as THREE from 'three';

/** Centralized color palette per the BALAM art direction spec. */
export const PALETTE = {
  physical: {
    ground: 0x5a7a3a,
    canopy: 0x2d5a1b,
    trunk: 0x6b4423,
    stone: 0x8a8070,
    water: 0x3a6b8a,
    fog: 0xc8d9a0,
    warm: 0xf5d76e,
  },
  spirit: {
    groundTint: 0x1a1040,
    leyLine: 0xc4a8ff,
    jaguar: 0x7b5ea7,
    motes: 0xe8d9ff,
    barrier: 0x4a2080,
    bloom: 0x9b7fd4,
    fog: 0x0d0820,
  },
};

export function toonMaterial(color) {
  return new THREE.MeshToonMaterial({ color, transparent: true, opacity: 1 });
}

export function toonMaterialWithMap(map, color = 0xffffff) {
  return new THREE.MeshToonMaterial({ color, map, transparent: true, opacity: 1 });
}

export function spiritMaterial(color, emissive, emissiveIntensity = 0.8) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    transparent: true,
    opacity: 1,
  });
}
