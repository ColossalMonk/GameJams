import * as THREE from 'three';

/**
 * Everything in the town is a paper card: a thin extruded shape with a coloured face,
 * a paper-fibre texture, and a pale paper core showing on the cut edges.
 */

let fibreTexture = null;

/** Procedural paper texture: fine grain plus faint fibres. Shared by every card. */
export function paperTexture() {
  if (fibreTexture) return fibreTexture;
  // Headless (the Node self-test): no canvas, so use a blank texture.
  if (typeof document === 'undefined') return (fibreTexture = new THREE.Texture());
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 236 + (Math.random() - 0.5) * 22;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v - 3;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = Math.random() * Math.PI * 2;
    const len = 6 + Math.random() * 26;
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(150,140,120,0.16)';
    ctx.lineWidth = 0.6 + Math.random() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a + 0.6) * len * 0.5,
      y + Math.sin(a + 0.6) * len * 0.5,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len,
    );
    ctx.stroke();
  }
  fibreTexture = new THREE.CanvasTexture(c);
  fibreTexture.wrapS = fibreTexture.wrapT = THREE.RepeatWrapping;
  fibreTexture.repeat.set(0.45, 0.45);
  fibreTexture.colorSpace = THREE.SRGBColorSpace;
  fibreTexture.anisotropy = 4;
  return fibreTexture;
}

const faceCache = new Map();
let edgeMaterial = null;

export function paperMaterial(color) {
  const key = String(color);
  if (faceCache.has(key)) return faceCache.get(key);
  const tex = paperTexture();
  const mat = new THREE.MeshStandardMaterial({
    color,
    map: tex,
    bumpMap: tex,
    bumpScale: 1.2,
    roughness: 0.92,
    metalness: 0,
  });
  faceCache.set(key, mat);
  return mat;
}

function paperEdge() {
  if (!edgeMaterial) {
    edgeMaterial = new THREE.MeshStandardMaterial({ color: '#f6eedd', roughness: 1, metalness: 0 });
  }
  return edgeMaterial;
}

/**
 * Materials that light up at dusk (windows, lamps, string lights). Town.js and Sky.js
 * share them so one intensity change turns every light in town on at once.
 */
export const glowMaterials = [];

export function glowMaterial(color, glowColor = color) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    map: paperTexture(),
    roughness: 0.9,
    emissive: glowColor,
    emissiveIntensity: 0,
  });
  glowMaterials.push(mat);
  return mat;
}

/**
 * Build a paper card from a 2D shape. The face is at z = depth, the back at z = 0.
 * Pass `material` to override the face material (glowing windows, flames, the sun).
 */
export function card(shape, color, { depth = 0.04, material = null, shadows = true } = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 });
  const mesh = new THREE.Mesh(geo, [material || paperMaterial(color), paperEdge()]);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

/** Add a card to a parent at a position; returns the card. */
export function place(parent, mesh, x = 0, y = 0, z = 0) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
