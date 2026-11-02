import * as THREE from 'three';
import { card, place, paperTexture } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse, poly, limb, teardrop } from '../../world/shapes.js';
import { glow } from './d-props.js';

/** Props for story batch E: skywriting, cranes, lanterns, a parachute, a telescope and an easel. */

const INK = '#2f2530';

/**
 * One puff of skywriting, about 0.5 across. Clone it for the rest of the trail: clones share
 * its geometry and its material, so one opacity change fades the whole message.
 */
export function makeSkyPuff() {
  const material = new THREE.MeshStandardMaterial({
    color: '#fffdf8',
    map: paperTexture(),
    roughness: 1,
    emissive: '#fff4e8',
    emissiveIntensity: 0.25,
    transparent: true,
  });
  return card(circle(0, 0, 0.24), null, { depth: 0.02, material, shadows: false });
}

/**
 * A side-on crane (the bird) facing +x, about 1.1 long with its legs trailing. Flap with
 * bird.flap(v), v from −1 (down) to 1 (up).
 */
export function makeCraneBird() {
  const group = new THREE.Group();
  const far = place(group, new THREE.Group(), 0, 0.03, -0.02);
  place(far, card(poly([[-0.12, 0], [0.14, 0], [0.02, 0.42], [-0.22, 0.38]]), '#6e6a78', { depth: 0.01, shadows: false }), 0, 0, 0);
  place(group, card(poly([[-0.2, -0.01], [-0.68, -0.05], [-0.68, -0.025], [-0.2, 0.02]]), INK, { depth: 0.01, shadows: false }), 0, 0, -0.01);
  place(group, card(poly([[-0.2, 0.03], [-0.4, 0.07], [-0.38, -0.03], [-0.2, -0.03]]), INK, { depth: 0.01, shadows: false }), 0, 0, 0);
  place(group, card(ellipse(0, 0, 0.25, 0.09), '#a29fab', { depth: 0.02, shadows: false }), 0, 0, 0.01);
  place(group, card(poly([[0.15, 0.0], [0.6, 0.08], [0.6, 0.115], [0.15, 0.075]]), INK, { depth: 0.01, shadows: false }), 0, 0, 0.02);
  place(group, card(circle(0.63, 0.1, 0.05), INK, { depth: 0.01, shadows: false }), 0, 0, 0.025);
  place(group, card(poly([[0.66, 0.115], [0.82, 0.095], [0.66, 0.08]]), '#8a7a5a', { depth: 0.01, shadows: false }), 0, 0, 0.025);
  const near = place(group, new THREE.Group(), 0, 0.03, 0.04);
  place(near, card(poly([[-0.14, 0], [0.16, 0], [0.04, 0.46], [-0.24, 0.42]]), '#c4c1cc', { depth: 0.01, shadows: false }), 0, 0, 0);
  place(near, card(poly([[0.04, 0.46], [-0.24, 0.42], [-0.19, 0.3], [0.07, 0.33]]), INK, { depth: 0.01, shadows: false }), 0, 0, 0.01);
  return {
    group,
    flap(v) {
      near.scale.y = v;
      far.scale.y = v * 0.9;
    },
  };
}

/**
 * A paper sky-lantern, origin at the open bottom, about 0.5 × 0.66. It glows: set how
 * brightly with lantern.light(k) (0.75 looks like unlit paper, 2.4 is fully alight).
 */
export function makeLantern(colour) {
  const group = new THREE.Group();
  const base = new THREE.Color(colour);
  const mat = glow(colour, 0.75);
  const s = new THREE.Shape();
  s.moveTo(-0.17, 0.03);
  s.lineTo(0.17, 0.03);
  s.lineTo(0.25, 0.5);
  s.quadraticCurveTo(0.25, 0.66, 0, 0.66);
  s.quadraticCurveTo(-0.25, 0.66, -0.25, 0.5);
  s.closePath();
  const body = place(group, card(s, null, { depth: 0.03, material: mat, shadows: false }), 0, 0, 0);
  place(group, card(rect(-0.18, 0, 0.36, 0.06), '#7a4a3a', { depth: 0.01 }), 0, 0, 0.035);
  const flame = place(group, card(teardrop(0.08, 0.15), null, { depth: 0.01, material: glow('#fff1b0', 3), shadows: false }), 0, 0.07, 0.04);
  flame.visible = false;
  return {
    group,
    body,
    flame,
    light(k) {
      mat.color.copy(base).multiplyScalar(k);
    },
  };
}

/** A TV aerial for the top of the water tower: a mast and two crossbars, origin at its foot. */
export function makeAerial(height = 1.6) {
  const group = new THREE.Group();
  place(group, card(rect(-0.018, 0, 0.036, height), '#3d3a40', { depth: 0.02 }), 0, 0, 0);
  place(group, card(rect(-0.25, height - 0.38, 0.5, 0.03), '#3d3a40', { depth: 0.02 }), 0, 0, 0.005);
  place(group, card(rect(-0.16, height - 0.14, 0.32, 0.03), '#3d3a40', { depth: 0.02 }), 0, 0, 0.005);
  return { group, tip: new THREE.Vector3(0, height, 0) };
}

/**
 * A striped parachute canopy seen from the side: a dome cut into five gores, origin at the
 * middle of its hem, about 2.1 wide and 0.65 tall. anchors are where the lines tie on.
 */
export function makeCanopy(colours = ['#e2574c', '#fbf1dc']) {
  const group = new THREE.Group();
  const rx = 1.05;
  const ry = 0.65;
  const gores = 5;
  for (let i = 0; i < gores; i++) {
    const pts = [[0, 0.02]];
    for (let j = 0; j <= 6; j++) {
      const a = Math.PI - (Math.PI * (i + j / 6)) / gores;
      pts.push([rx * Math.cos(a), ry * Math.sin(a) + 0.02 * Math.abs(Math.cos(a))]);
    }
    place(group, card(poly(pts), colours[i % colours.length], { depth: 0.02 }), 0, 0, i * 0.002);
  }
  // The hem scallops between the gores.
  place(group, card(ellipse(0, 0.0, rx * 0.98, 0.07), colours[0], { depth: 0.01 }), 0, 0, 0.015);
  const anchors = [-0.95, -0.35, 0.35, 0.95].map((x) => new THREE.Vector3(x, 0.02, 0.02));
  return { group, anchors };
}

/**
 * A telescope on a tall tripod, origin at the tripod's feet. The tube pivots at `pivot`
 * (aim it with pivot.rotation.z; it points along +x). lens is a front-on view of the
 * objective, for when the telescope turns to face the camera; eyepiece is tube-local.
 */
export function makeTelescope(height = 1.7, colour = '#3f4a6b') {
  const group = new THREE.Group();
  place(group, card(poly([[-0.03, height], [0.03, height], [-0.36, 0], [-0.43, 0]]), '#6b4636', { depth: 0.02 }), 0, 0, 0.02);
  place(group, card(poly([[-0.03, height], [0.03, height], [0.43, 0], [0.36, 0]]), '#6b4636', { depth: 0.02 }), 0, 0, 0.02);
  place(group, card(poly([[-0.025, height], [0.025, height], [0.06, 0], [0.0, 0]]), '#4e3328', { depth: 0.02 }), 0, 0, -0.04);
  const pivot = place(group, new THREE.Group(), 0, height, 0.06);
  const tube = place(pivot, new THREE.Group(), 0, 0, 0);
  place(tube, card(roundRect(-0.4, -0.075, 1.12, 0.15, 0.04), colour, { depth: 0.03 }), 0, 0, 0);
  place(tube, card(rect(0.6, -0.095, 0.17, 0.19), '#2f3550', { depth: 0.03 }), 0, 0, 0.005);
  place(tube, card(rect(-0.52, -0.035, 0.14, 0.07), INK, { depth: 0.02 }), 0, 0, 0.005);
  place(tube, card(roundRect(0.0, 0.08, 0.34, 0.05, 0.02), '#d9b04a', { depth: 0.02 }), 0, 0, 0.0);
  place(pivot, card(circle(0, 0, 0.055), '#d9b04a', { depth: 0.01, shadows: false }), 0, 0, 0.04);
  const lens = place(pivot, new THREE.Group(), 0.77, 0, 0.08);
  place(lens, card(circle(0, 0, 0.15), '#2f3550', { depth: 0.02 }), 0, 0, 0);
  place(lens, card(circle(0, 0, 0.105), '#9cc3dd', { depth: 0.01, shadows: false }), 0, 0, 0.02);
  place(lens, card(ellipse(-0.035, 0.035, 0.03, 0.045, 0.6), '#ffffff', { depth: 0.005, shadows: false }), 0, 0, 0.032);
  lens.scale.setScalar(0.001);
  return { group, pivot, tube, lens, eyepiece: new THREE.Vector3(-0.52, 0, 0.03), front: 0.77 };
}

/** A four-pointed twinkle of light, centred on the origin. */
export function makeSparkle(colour = '#fff4c8', r = 0.3, strength = 3) {
  const group = new THREE.Group();
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 4;
    const d = i % 2 ? r * 0.22 : r;
    pts.push([Math.cos(a) * d, Math.sin(a) * d]);
  }
  place(group, card(poly(pts), null, { depth: 0.01, material: glow(colour, strength), shadows: false }), 0, 0, 0);
  place(group, card(circle(0, 0, r * 0.22), null, { depth: 0.01, material: glow('#ffffff', strength), shadows: false }), 0, 0, 0.01);
  return group;
}

/**
 * A painter's easel with a canvas, origin at its feet. `canvas` is a group on the canvas
 * face (origin at the canvas's bottom centre, 0.8 × 0.62) for the painting's layers.
 */
export function makeEasel() {
  const group = new THREE.Group();
  place(group, card(rect(-0.025, 0, 0.05, 1.72), '#5a3a2c', { depth: 0.02 }), 0.02, 0, -0.08);
  place(group, card(poly([[-0.07, 1.8], [-0.02, 1.8], [-0.38, 0], [-0.45, 0]]), '#8a5a3e', { depth: 0.02 }), 0, 0, 0);
  place(group, card(poly([[0.02, 1.8], [0.07, 1.8], [0.45, 0], [0.38, 0]]), '#8a5a3e', { depth: 0.02 }), 0, 0, 0);
  place(group, card(rect(-0.48, 0.96, 0.96, 0.06), '#6b4636', { depth: 0.05 }), 0, 0, 0.02);
  const canvas = place(group, new THREE.Group(), 0, 1.02, 0.07);
  place(canvas, card(rect(-0.4, 0, 0.8, 0.62), '#fbf6ee', { depth: 0.02 }), 0, 0, -0.02);
  return { group, canvas };
}

/** A beret, origin at the middle of its band. */
export function makeBeret(colour = '#3a3550') {
  const group = new THREE.Group();
  place(group, card(ellipse(0, 0.04, 0.2, 0.075, 0.08), colour, { depth: 0.03 }), 0, 0, 0);
  place(group, card(rect(-0.012, 0.1, 0.024, 0.05), colour, { depth: 0.02 }), 0, 0, 0.005);
  return group;
}

/** A painter's palette with three dabs of paint, centred on the origin. */
export function makePalette(dabs = ['#e8734a', '#f2c14e', '#b0458a']) {
  const group = new THREE.Group();
  place(group, card(ellipse(0, 0, 0.16, 0.1, 0.2), '#d9b48a', { depth: 0.02 }), 0, 0, 0);
  dabs.forEach((c, i) => place(group, card(circle(-0.07 + i * 0.07, 0.025 - (i % 2) * 0.04, 0.025), c, { depth: 0.01, shadows: false }), 0, 0, 0.022));
  return group;
}

/** A paintbrush hanging straight down from the origin (put it in a hand), tip loaded with paint. */
export function makeBrush(paint = '#e8734a') {
  const group = new THREE.Group();
  place(group, card(limb(0.035, 0.3), '#6b4636', { depth: 0.01 }), 0, 0, 0);
  place(group, card(teardrop(0.07, 0.11), paint, { depth: 0.01, shadows: false }), 0, -0.29, 0.002).rotation.z = Math.PI;
  return group;
}
