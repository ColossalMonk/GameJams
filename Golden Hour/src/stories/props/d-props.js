import * as THREE from 'three';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse, poly, limb, teardrop } from '../../world/shapes.js';

/** Props for story batch D: the flying saucer and the whale-shaped cloud. */

const INK = '#2f2530';

/** Unlit material with its colour pushed above 1, so the bloom pass picks it up. */
export function glow(colour, strength = 2.5) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(strength) });
}

/** A spiky comic-book flash, centred on the origin. */
function starburst(r, spikes = 8) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const d = i % 2 ? r * 0.3 : r;
    pts.push([Math.cos(a) * d, Math.sin(a) * d]);
  }
  return poly(pts);
}

/**
 * A paper flying saucer with a little alien under a glass dome; the rim sits at y = 0.
 * Wave with armR; raise `camera` (it hides behind the saucer at y ≈ 0.05) for a photo,
 * then grow `flash` and slide `print` up. `lights` are separate glowing cards to blink.
 */
export function makeUfo({ alien = '#8fd16a', light = '#7affc8' } = {}) {
  const group = new THREE.Group();
  const dome = new THREE.Shape();
  dome.absarc(0, 0.04, 0.55, 0, Math.PI, false);
  dome.closePath();
  place(group, card(dome, '#bfe3ea', { depth: 0.02 }), 0, 0, 0);

  // The alien: the saucer hides everything below its shoulders.
  const tipMat = glow(light, 2);
  for (const side of [-1, 1]) {
    place(group, card(poly([[side * 0.04, 0.4], [side * 0.075, 0.4], [side * 0.135, 0.52], [side * 0.115, 0.53]]), alien, { depth: 0.01 }), 0, 0, 0.025);
    place(group, card(circle(side * 0.125, 0.53, 0.028), null, { depth: 0.01, material: tipMat, shadows: false }), 0, 0, 0.025);
  }
  place(group, card(roundRect(-0.12, 0.05, 0.24, 0.24, 0.09), alien, { depth: 0.02 }), 0, 0, 0.03);
  place(group, card(ellipse(0, 0.34, 0.17, 0.13), alien, { depth: 0.02 }), 0, 0, 0.04);
  for (const side of [-1, 1]) {
    place(group, card(ellipse(side * 0.075, 0.345, 0.048, 0.064, -side * 0.5), INK, { depth: 0.01 }), 0, 0, 0.062);
  }
  const arm = (side) => {
    const g = place(group, new THREE.Group(), side * 0.13, 0.22, 0.065);
    place(g, card(limb(0.05, 0.19), alien, { depth: 0.01 }), 0, 0, 0);
    place(g, card(circle(0, -0.19, 0.035), alien, { depth: 0.01 }), 0, 0, 0.002);
    return g;
  };
  const armL = arm(-1);
  const armR = arm(1);

  // A tiny camera, held up to its face for the photo; a print slides out of the top.
  const camera = new THREE.Group();
  place(group, camera, 0, 0.05, 0.09);
  const print = place(camera, new THREE.Group(), 0, -0.02, -0.006);
  place(print, card(rect(-0.065, -0.065, 0.13, 0.13), '#fbf6ee', { depth: 0.005, shadows: false }), 0, 0, 0);
  place(print, card(rect(-0.05, -0.035, 0.1, 0.085), '#ffb070', { depth: 0.003, shadows: false }), 0, 0, 0.005);
  place(camera, card(roundRect(-0.11, -0.075, 0.22, 0.15, 0.03), '#3a3640', { depth: 0.02 }), 0, 0, 0);
  place(camera, card(circle(0.025, -0.005, 0.05), '#9cc3dd', { depth: 0.01 }), 0, 0, 0.02);
  place(camera, card(rect(-0.095, 0.05, 0.05, 0.035), '#f3ead8', { depth: 0.01 }), 0, 0, 0.02);
  const flash = place(camera, card(starburst(0.3), null, { depth: 0.01, material: glow('#ffffff', 4), shadows: false }), -0.07, 0.065, 0.05);
  flash.scale.setScalar(0.001);
  flash.visible = false;

  place(group, card(ellipse(-0.28, 0.32, 0.03, 0.11, -0.7), '#ffffff', { depth: 0.005, shadows: false }), 0, 0, 0.13);

  // The saucer itself, in front of the alien.
  place(group, card(ellipse(0, -0.13, 0.42, 0.14), '#8e93a6', { depth: 0.03 }), 0, 0, 0.1);
  place(group, card(ellipse(0, 0.03, 1.0, 0.21), '#c9ccd8'), 0, 0, 0.14);
  place(group, card(ellipse(0, 0.12, 0.6, 0.035), '#eef0f6', { depth: 0.005, shadows: false }), 0, 0, 0.181);
  place(group, card(ellipse(0, -0.03, 0.96, 0.075), '#6e7389', { depth: 0.01 }), 0, 0, 0.181);
  const lights = [];
  for (let i = 0; i < 7; i++) {
    const mat = glow(light, 1);
    place(group, card(circle(0, 0, 0.045), null, { depth: 0.01, material: mat, shadows: false }), -0.75 + i * 0.25, -0.03, 0.192);
    lights.push(mat);
  }
  return { group, armL, armR, camera, print, flash, lights, light: new THREE.Color(light) };
}

/** The whale's silhouette as overlapping soft ellipses: [cx, cy, rx, ry, rotation]. */
const WHALE = [
  [0.3, 0, 1.75, 0.78, 0], // body
  [1.15, 0.38, 0.62, 0.55, 0], // forehead
  [0.25, 0.55, 0.6, 0.48, 0], // back
  [-0.65, 0.42, 0.5, 0.4, 0], // back, lower
  [-1.65, 0.32, 0.62, 0.24, -0.7], // tail
  [-2.5, 1.02, 0.42, 0.15, -0.6], // fluke
  [-1.95, 1.1, 0.38, 0.14, 0.9], // fluke
];

/**
 * A whale-shaped paper cloud, about 4.9 long, facing +x (flip with scale.x = -1).
 * `body` is the whale itself; rim(k) grows a glowing outline behind it (0 = none).
 */
export function makeWhaleCloud({ body, belly, fin }, { rimColour = '#ffd9a0', margin = 0.12 } = {}) {
  const group = new THREE.Group();
  const shape = place(group, new THREE.Group());
  const rimMat = glow(rimColour, 2.4);
  const halo = [];
  WHALE.forEach(([cx, cy, rx, ry, rot], i) => {
    place(shape, card(ellipse(cx, cy, rx, ry, rot), body, { depth: 0.03, shadows: false }), 0, 0, i * 0.004);
    // Each halo card is the same ellipse plus a margin, scaled down until it hides behind the body.
    const h = place(shape, card(ellipse(0, 0, rx + margin, ry + margin), null, { depth: 0.01, material: rimMat, shadows: false }), cx, cy, -0.03);
    h.rotation.z = rot;
    h.visible = false;
    halo.push({ mesh: h, rx, ry });
  });
  place(shape, card(ellipse(0.45, -0.4, 1.2, 0.24), belly, { depth: 0.01, shadows: false }), 0, 0, 0.04);
  const flipper = place(shape, card(teardrop(0.42, 0.78), fin, { depth: 0.01, shadows: false }), 0.85, -0.2, 0.045);
  flipper.rotation.z = 2.5;
  const eye = place(shape, card(circle(0, 0, 0.075), INK, { depth: 0.01, shadows: false }), 1.5, 0.12, 0.05);
  place(eye, card(circle(0.022, 0.025, 0.022), '#ffffff', { depth: 0.005, shadows: false }), 0, 0, 0.012);

  const rim = (k) => {
    for (const { mesh, rx, ry } of halo) {
      mesh.visible = k > 0.01;
      mesh.scale.set((rx + k * margin) / (rx + margin), (ry + k * margin) / (ry + margin), 1);
    }
  };
  rim(0);
  return { group, body: shape, eye, flipper, blowhole: new THREE.Vector3(1.05, 0.9, 0.05), rim };
}
