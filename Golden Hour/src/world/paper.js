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

/**
 * Other paper stocks, drawn over the base grain:
 * - corrugated: card with ribs (the building-site hoarding)
 * - watercolour: soft pooled blotches (the far hills)
 * - newsprint: columns of grey "text" (the odd house front)
 */
const stockTextures = new Map();

function stockTexture(stock) {
  if (stock === 'paper') return paperTexture();
  if (stockTextures.has(stock)) return stockTextures.get(stock);
  if (typeof document === 'undefined') {
    stockTextures.set(stock, paperTexture());
    return paperTexture();
  }
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.drawImage(paperTexture().image, 0, 0);
  if (stock === 'corrugated') {
    for (let x = 0; x < size; x += 16) {
      const g = ctx.createLinearGradient(x, 0, x + 16, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.16)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0.16)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 16, size);
    }
  } else if (stock === 'watercolour') {
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 30 + Math.random() * 90;
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      const dark = Math.random() < 0.5;
      g.addColorStop(0, dark ? 'rgba(90,80,70,0.12)' : 'rgba(255,255,255,0.14)');
      g.addColorStop(0.85, dark ? 'rgba(90,80,70,0.05)' : 'rgba(255,255,255,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (stock === 'newsprint') {
    ctx.fillStyle = 'rgba(60,55,50,0.22)';
    for (let col = 0; col < 4; col++) {
      const x0 = 14 + col * 126;
      ctx.fillRect(x0, 18, 110, 22);
      for (let y = 52; y < size - 10; y += 9) {
        const w = 70 + Math.random() * 40;
        if (Math.random() < 0.08) continue;
        ctx.fillRect(x0, y, w, 3);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.45, 0.45);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  stockTextures.set(stock, tex);
  return tex;
}

const faceCache = new Map();
let edgeMaterial = null;

export function paperMaterial(color, stock = 'paper') {
  const key = `${color}|${stock}`;
  if (faceCache.has(key)) return faceCache.get(key);
  const tex = stockTexture(stock);
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

/** Cards smaller than this skip the pale cut edge: it's too thin to see, and costs a draw call. */
const EDGE_MIN = 0.5;
/** Cards at least this big sit very slightly crooked, as if glued down by hand. */
const WOBBLE_MIN = 1.0;

/**
 * Build a paper card from a 2D shape. The face is at z = depth, the back at z = 0.
 * Pass `material` to override the face material (glowing windows, flames, the sun).
 * The outline is roughened a little so it looks cut by hand; pass rough: false for
 * shapes that must stay exact. stock picks the paper: 'paper', 'corrugated', 'watercolour'
 * or 'newsprint'.
 */
export function card(shape, color, { depth = 0.04, material = null, shadows = true, rough = true, stock = 'paper' } = {}) {
  const geo = new THREE.ExtrudeGeometry(rough ? roughen(shape) : shape, { depth, bevelEnabled: false, curveSegments: 18 });
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const size = Math.max(b.max.x - b.min.x, b.max.y - b.min.y);
  const face = material || paperMaterial(color, stock);
  const mesh = new THREE.Mesh(geo, size >= EDGE_MIN ? [face, paperEdge()] : face);
  if (size >= WOBBLE_MIN) mesh.rotation.z = (Math.random() - 0.5) * 0.016;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * The same outline, resampled evenly and nudged in and out along its normal by a small,
 * smoothed random amount: the slightly wandering edge of paper cut with scissors.
 * Tiny shapes (eyes, buttons) are left alone.
 */
function roughen(shape) {
  if (Array.isArray(shape)) return shape.map(roughen);
  const outline = shape.getPoints(12);
  let perimeter = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i];
    if (i) perimeter += p.distanceTo(outline[i - 1]);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const size = Math.max(maxX - minX, maxY - minY);
  if (size < 0.15) return shape;
  const amp = THREE.MathUtils.clamp(size * 0.012, 0.004, 0.035);
  const n = THREE.MathUtils.clamp(Math.round(perimeter / 0.05), 16, 240);
  const pts = shape.getSpacedPoints(n);
  pts.pop(); // the last point repeats the first
  let noise = pts.map(() => Math.random() * 2 - 1);
  for (let pass = 0; pass < 2; pass++) {
    noise = noise.map((v, i) => (noise[(i + noise.length - 1) % noise.length] + v * 2 + noise[(i + 1) % noise.length]) / 4);
  }
  const out = pts.map((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length];
    const c = pts[(i + 1) % pts.length];
    const tx = c.x - a.x;
    const ty = c.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    return new THREE.Vector2(p.x + (ty / len) * noise[i] * amp, p.y - (tx / len) * noise[i] * amp);
  });
  const rough = new THREE.Shape(out);
  rough.holes = shape.holes;
  return rough;
}

/** Add a card to a parent at a position; returns the card. */
export function place(parent, mesh, x = 0, y = 0, z = 0) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
