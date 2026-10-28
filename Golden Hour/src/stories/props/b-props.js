import * as THREE from 'three';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse, poly } from '../../world/shapes.js';

/** Props for story batch B: the building site, the opera window and the fire truck. */

const INK = '#2f2530';

function dome(r) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI, false);
  s.closePath();
  return s;
}

/** A hard hat (or, with a long brim, a firefighter's helmet). Put it on with wearHat(). */
export function makeHardHat(colour, { brim = 0.29, back = 0 } = {}) {
  const group = new THREE.Group();
  place(group, card(dome(0.22), colour), 0, 0, 0);
  place(group, card(roundRect(-brim, -0.035, brim * 2 + back, 0.06, 0.03), colour), 0, 0, 0.03);
  place(group, card(rect(-0.03, 0.02, 0.06, 0.2), '#ffffff', { depth: 0.01 }), 0, 0, 0.04);
  return group;
}

/** Sit a hat on a puppet's head, so it follows every nod. */
export function wearHat(puppet, hat) {
  const hs = puppet.options.kid ? 1.3 : 1;
  hat.scale.setScalar(hs);
  hat.position.set(0, puppet.headCentre.y + 0.08 * hs, 0.06);
  puppet.head.add(hat);
  return hat;
}

/** An upright piano, origin at the bottom centre. */
export function makePiano(wood = '#3a2a2e') {
  const group = new THREE.Group();
  place(group, card(rect(-0.42, 0, 0.07, 0.12), wood), 0, 0, 0);
  place(group, card(rect(0.35, 0, 0.07, 0.12), wood), 0, 0, 0);
  place(group, card(roundRect(-0.47, 0.08, 0.94, 0.8, 0.04), wood), 0, 0, 0);
  place(group, card(rect(-0.5, 0.84, 1.0, 0.07), wood), 0, 0, 0.02);
  place(group, card(roundRect(-0.36, 0.56, 0.72, 0.22, 0.03), '#5a4048', { depth: 0.01 }), 0, 0, 0.04);
  place(group, card(rect(-0.05, 0.64, 0.1, 0.05), '#e8c77a', { depth: 0.01 }), 0, 0, 0.05);
  place(group, card(rect(-0.46, 0.38, 0.92, 0.13), '#fbf6ee', { depth: 0.08 }), 0, 0, 0.02);
  for (let i = 0; i < 6; i++) place(group, card(rect(0, 0, 0.05, 0.07), INK, { depth: 0.01 }), -0.38 + i * 0.14 + (i > 2 ? 0.05 : 0), 0.44, 0.1);
  return group;
}

/** Two ropes from the hook down to the corners of a load `drop` below. */
export function makeSlings(drop, spread = 0.42) {
  const group = new THREE.Group();
  for (const s of [-1, 1]) {
    place(group, card(poly([[-0.012, 0], [0.012, 0], [s * spread + 0.012, -drop], [s * spread - 0.012, -drop]]), '#3d3a40', { depth: 0.01, shadows: false }), 0, 0, 0);
  }
  return group;
}

/** A comic "plonk!" burst, centred on the origin. */
export function makeBurst() {
  const group = new THREE.Group();
  const star = (r0, r1, n) => poly(Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? r1 : r0;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }));
  place(group, card(star(0.62, 0.36, 9), '#ffd27a', { shadows: false }), 0, 0, 0);
  place(group, card(star(0.4, 0.24, 9), '#fbf6ee', { depth: 0.01, shadows: false }), 0, 0, 0.04);
  place(group, card(circle(0, 0, 0.1), '#e2574c', { depth: 0.01, shadows: false }), 0, 0, 0.05);
  return group;
}

/** A side-on paper gull facing -x. Flap with gull.flap(v), v from -1 (down) to 1 (up). */
export function makeGull() {
  const group = new THREE.Group();
  const far = new THREE.Group();
  far.position.set(0.02, 0.05, -0.03);
  place(far, card(poly([[0, 0], [0.12, 0.42], [0.3, 0.36], [0.2, 0]]), '#b9b3ba', { shadows: false }), 0, 0, 0);
  group.add(far);
  place(group, card(poly([[0.2, 0.02], [0.42, 0.1], [0.42, -0.04]]), '#d8d2cc'), 0, 0, 0);
  place(group, card(ellipse(0, 0, 0.28, 0.11), '#fbf6ee'), 0, 0, 0.01);
  place(group, card(circle(-0.24, 0.07, 0.09), '#fbf6ee'), 0, 0, 0.02);
  place(group, card(poly([[-0.31, 0.08], [-0.44, 0.05], [-0.31, 0.03]]), '#f2a33a', { depth: 0.01 }), 0, 0, 0.04);
  place(group, card(circle(-0.27, 0.1, 0.018), INK, { depth: 0.01, shadows: false }), 0, 0, 0.06);
  const near = new THREE.Group();
  near.position.set(-0.02, 0.04, 0.07);
  place(near, card(poly([[0, 0], [0.1, 0.44], [0.32, 0.38], [0.22, 0]]), '#d8d2cc'), 0, 0, 0);
  place(near, card(poly([[0.1, 0.44], [0.32, 0.38], [0.27, 0.26], [0.07, 0.3]]), '#3a3340', { depth: 0.01 }), 0, 0, 0.04);
  group.add(near);
  return {
    group,
    beak: new THREE.Vector3(-0.42, 0.05, 0.06),
    flap(v) {
      near.scale.y = v;
      far.scale.y = v * 0.9;
    },
  };
}

export function makeFlask(colour) {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.05, -0.11, 0.1, 0.2, 0.03), colour), 0, 0, 0);
  place(group, card(rect(-0.035, 0.08, 0.07, 0.05), '#3d3a40'), 0, 0, 0.01);
  return group;
}

export function makeSandwich() {
  const group = new THREE.Group();
  place(group, card(poly([[-0.1, -0.07], [0.1, -0.07], [-0.1, 0.1]]), '#f0d49a'), 0, 0, 0);
  place(group, card(poly([[-0.1, -0.03], [0.06, -0.03], [-0.1, 0.05]]), '#7fae6a', { depth: 0.01 }), 0, 0, 0.04);
  return group;
}

/** A paper music note, origin at the note head. */
export function makeNote(colour = INK) {
  const group = new THREE.Group();
  place(group, card(ellipse(0, 0, 0.075, 0.055, 0.4), colour, { shadows: false }), 0, 0, 0);
  place(group, card(rect(0.045, 0, 0.025, 0.26), colour, { shadows: false }), 0, 0, 0);
  place(group, card(poly([[0.07, 0.26], [0.17, 0.16], [0.07, 0.19]]), colour, { shadows: false }), 0, 0, 0);
  return group;
}

/**
 * A window opening over one of the apartment's windows: dark room, cream sill and two
 * shutters hinged at the sides. shutters(u) swings them, 0 closed to 1 flat open.
 */
export function makeOpenWindow({ w = 0.6, h = 0.68, shutter = '#2f6f6a', sill = 0.12, slats = 3 } = {}) {
  const group = new THREE.Group();
  place(group, card(rect(-w / 2, -0.02, w, h), '#2e2838', { depth: 0.02 }), 0, 0, 0.02);
  place(group, card(rect(-w / 2 - 0.06, -sill, w + 0.12, sill + 0.02), '#f2e8d6', { depth: 0.06 }), 0, 0, 0.3);
  const leaves = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set((s * w) / 2, 0, 0.08);
    const leaf = new THREE.Group();
    place(leaf, card(rect(0, -0.02, w / 2, h), shutter, { depth: 0.02 }), 0, 0, 0);
    for (let i = 1; i <= slats; i++) place(leaf, card(rect(0.04, (h * i) / (slats + 1) - 0.02, w / 2 - 0.08, 0.025), '#1f3f3c', { depth: 0.005, shadows: false }), 0, 0, 0.02);
    leaf.scale.x = -s;
    hinge.add(leaf);
    group.add(hinge);
    leaves.push({ hinge, s });
  }
  return {
    group,
    shutters(u) {
      for (const { hinge, s } of leaves) hinge.rotation.y = s * u * Math.PI * 0.97;
    },
  };
}

/** A fire engine facing -x (cab on the left). The ladder is built separately. */
export function makeFireTruck() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const red = '#d33a2f';
  place(body, card(roundRect(-1.75, 0.28, 3.5, 0.9, 0.08), red), 0, 0, 0);
  place(body, card(roundRect(-1.75, 0.28, 1.05, 1.35, 0.14), red), 0, 0, 0.02);
  place(body, card(roundRect(-1.62, 0.95, 0.62, 0.5, 0.08), '#d6e8f2', { depth: 0.01 }), 0, 0, 0.06);
  place(body, card(rect(-1.75, 0.66, 3.5, 0.08), '#f3ead8', { depth: 0.01 }), 0, 0, 0.06);
  for (let i = 0; i < 3; i++) place(body, card(roundRect(-0.5 + i * 0.68, 0.36, 0.56, 0.26, 0.04), '#b02f27', { depth: 0.01 }), 0, 0, 0.05);
  place(body, card(rect(1.62, 0.2, 0.32, 0.08), '#cfd3d6'), 0, 0, 0.05);
  place(body, card(rect(-1.86, 0.24, 0.2, 0.12), '#cfd3d6'), 0, 0, 0.05);
  place(body, card(roundRect(0.66, 1.1, 0.48, 0.72, 0.06), '#3d3a40'), 0, 0, -0.01);
  const lights = [];
  for (const [x, colour] of [[-1.48, '#ff5a4a'], [-1.12, '#6ab0ff']]) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(1.6) });
    lights.push(place(body, card(roundRect(-0.12, 0, 0.24, 0.12, 0.05), null, { depth: 0.03, material: mat, shadows: false }), x, 1.62, 0.02));
  }
  const wheels = [];
  for (const x of [-1.2, 0.5, 1.2]) {
    place(group, card(circle(0, 0, 0.27), '#2f2a30'), x, 0.27, 0.08);
    const hub = new THREE.Group();
    hub.position.set(x, 0.27, 0.12);
    place(hub, card(poly([[-0.1, -0.03], [0.1, -0.03], [0.1, 0.03], [-0.1, 0.03]]), '#e9e1d2', { depth: 0.01 }), 0, 0, 0);
    group.add(hub);
    wheels.push(hub);
  }
  return { group, body, lights, wheels, turntable: new THREE.Vector3(0.9, 1.85, -0.06), step: new THREE.Vector3(1.82, 0.26, 0.16) };
}

/** One section of a ladder, length len along +y from the origin, face toward +z. */
export function makeLadderSection(len, width = 0.34, colour = '#e9e1d4') {
  const group = new THREE.Group();
  for (const s of [-1, 1]) place(group, card(rect(s * width / 2 - 0.03, 0, 0.06, len), colour, { depth: 0.03 }), 0, 0, 0);
  const rungs = Math.round(len / 0.36);
  for (let i = 0; i < rungs; i++) place(group, card(rect(-width / 2, 0, width, 0.035), '#bdb6b0', { depth: 0.02 }), 0, 0.15 + i * (len - 0.3) / Math.max(1, rungs - 1), 0.01);
  return group;
}
