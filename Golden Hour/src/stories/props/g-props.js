import * as THREE from 'three';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse, poly } from '../../world/shapes.js';
import { makeWheel, makeSign } from './c-props.js';

/**
 * Props for story batch G: the wedding car, the moving van and its sofa, ducks, the
 * marching band's instruments, the post box and letter, and the book-return booth.
 */

const INK = '#2f2530';
const GLASS = '#d6e8f2';
const BRASS = '#e8b84a';

/**
 * A little open-top wedding car facing +x. The couple stand in `inside` and show above the
 * doors; `tail` is where the tin cans are tied on, in the car's own coordinates.
 */
export function makeWeddingCar({ paint, trim }) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  // The seat back, behind the couple.
  place(body, card(roundRect(-0.95, 0.5, 1.15, 0.55, 0.12), '#6d5a6a', { depth: 0.02 }), 0, 0, -0.06);
  const inside = new THREE.Group();
  inside.position.z = 0.02;
  body.add(inside);
  // Doors and bonnet in front of the couple; a slanted windscreen ahead of the driver.
  place(body, card(poly([[-1.12, 0.1], [1.17, 0.1], [1.25, 0.5], [1.05, 0.72], [-1.1, 0.72], [-1.2, 0.5]]), paint), 0, 0, 0.2);
  place(body, card(poly([[0.32, 0.72], [0.44, 0.72], [0.3, 1.08], [0.22, 1.08]]), GLASS, { depth: 0.01 }), 0, 0, 0.21);
  place(body, card(rect(-1.12, 0.46, 2.3, 0.05), trim, { depth: 0.01 }), 0, 0, 0.245);
  // A ribbon bow on the bonnet.
  place(body, card(poly([[0.72, 0.78], [0.52, 0.9], [0.52, 0.66], [0.92, 0.9], [0.92, 0.66]]), trim, { depth: 0.01 }), 0, 0, 0.25);
  place(body, card(circle(1.17, 0.42, 0.06), '#fff6d6', { depth: 0.01 }), 0, 0, 0.25);
  // JUST MARRIED hangs off the boot.
  const sign = makeSign('JUST MARRIED', 0.62, 0.16, { bg: '#fbf6ee', ink: trim, depth: 0.01 });
  sign.rotation.z = 0.08;
  place(body, sign, -0.62, 0.34, 0.26);
  const wheels = [-0.68, 0.72].map((x) => place(group, makeWheel(0.22), x, 0.22, 0.27));
  return { group, body, inside, wheels, tail: new THREE.Vector3(-1.18, 0.3, 0.2) };
}

/** A tin can on its side, its middle at the origin. */
export function makeTinCan() {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.12, -0.08, 0.24, 0.16, 0.02), '#cfd3d6', { depth: 0.03 }), 0, 0, 0);
  place(group, card(rect(-0.04, -0.08, 0.07, 0.16), '#e2574c', { depth: 0.01, shadows: false }), 0, 0, 0.03);
  return group;
}

/**
 * A removals van facing +x, cab at the front. `door` swings open at the back and `lift` is the
 * tail-lift, hinged at the back of the floor (`floor` high): lower it with position.y, fold or
 * tip it with rotation.z (−π/2 is folded up). Cargo hides behind the body at z < −0.15.
 */
export function makeMovingVan(paint) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  place(body, card(roundRect(-1.55, 0.3, 2.25, 1.75, 0.06), paint), 0, 0, 0);
  place(body, card(poly([[0.72, 0.3], [1.5, 0.3], [1.5, 0.95], [1.3, 1.4], [0.72, 1.4]]), '#f3ead8'), 0, 0, 0);
  place(body, card(poly([[0.98, 0.98], [1.36, 0.98], [1.22, 1.3], [0.98, 1.3]]), GLASS, { depth: 0.01 }), 0, 0, 0.04);
  place(body, card(rect(-1.55, 0.3, 3.05, 0.12), '#3d3a40', { depth: 0.01 }), 0, 0, 0.04);
  place(body, makeSign('MOVING DAY', 1.5, 0.34, { bg: '#fbf1dc', ink: '#3f6f8f', depth: 0.01 }), -0.42, 1.3, 0.05);
  // The back door, hinged at the rear corner: scale.x 0 is shut, 1 is swung wide open.
  const door = place(body, card(rect(-0.5, 0, 0.5, 1.55), '#d8d2cc', { depth: 0.02 }), -1.55, 0.45, 0.05);
  door.scale.x = 0.02;
  const lift = new THREE.Group();
  lift.position.set(-1.55, 0.42, 0.12);
  body.add(lift);
  place(lift, card(rect(-1.6, -0.06, 1.6, 0.06), '#9a948e', { depth: 0.5 }), 0, 0, -0.25);
  const wheels = [-0.95, 1.05].map((x) => place(group, makeWheel(0.28), x, 0.28, 0.06));
  return { group, body, door, lift, wheels, floor: 0.42 };
}

/**
 * A three-seater sofa, front on. It turns about its middle: `group` sits at seat-cushion
 * height, `front` is the skirt that hides sitters' laps (put sitters between back and front).
 */
export function makeSofa(colour, cushion) {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = -0.42;
  group.add(inner);
  place(inner, card(roundRect(-0.72, 0.1, 1.44, 0.78, 0.12), colour), 0, 0, -0.12);
  for (const s of [-1, 1]) {
    place(inner, card(roundRect(-0.13, 0.08, 0.26, 0.5, 0.08), colour, { depth: 0.3 }), s * 0.72, 0, -0.1);
    place(inner, card(rect(-0.04, 0, 0.08, 0.1), '#4a3a30', { depth: 0.02 }), s * 0.6, 0, 0.18);
  }
  const front = place(inner, card(roundRect(-0.62, 0.1, 1.24, 0.34, 0.06), cushion, { depth: 0.03 }), 0, 0, 0.18);
  return { group, inner, front, height: 0.88 };
}

/** A side-on paper duck facing +x, feet at the origin. Flip with group.scale.x = -1. */
export function makeDuck({ feather, head, bill = '#f2a33a', wing = feather }) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const feet = [-0.06, 0.06].map((x) => place(group, card(poly([[-0.05, 0], [0.07, 0], [0, 0.12]]), bill, { depth: 0.01 }), x, 0, -0.01));
  place(body, card(ellipse(0, 0.22, 0.27, 0.15), feather), 0, 0, 0);
  place(body, card(poly([[-0.2, 0.26], [-0.36, 0.38], [-0.24, 0.18]]), feather), 0, 0, 0);
  place(body, card(ellipse(-0.03, 0.24, 0.15, 0.07, 0.15), wing, { depth: 0.01 }), 0, 0, 0.04);
  const neck = new THREE.Group();
  neck.position.set(0.18, 0.3, 0.01);
  body.add(neck);
  place(neck, card(circle(0.02, 0.14, 0.1), head), 0, 0, 0);
  place(neck, card(poly([[0.09, 0.15], [0.22, 0.12], [0.09, 0.09]]), bill, { depth: 0.01 }), 0, 0, 0.03);
  place(neck, card(circle(0.05, 0.17, 0.017), INK, { depth: 0.01, shadows: false }), 0, 0, 0.05);
  return { group, body, neck, feet };
}

/** A fluffy duckling facing +x, feet at the origin. */
export function makeDuckling(colour = '#f6d25a') {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  place(body, card(ellipse(0, 0.09, 0.1, 0.075), colour, { depth: 0.03 }), 0, 0, 0);
  const neck = new THREE.Group();
  neck.position.set(0.07, 0.15, 0.01);
  body.add(neck);
  place(neck, card(circle(0, 0.03, 0.06), colour, { depth: 0.03 }), 0, 0, 0);
  place(neck, card(poly([[0.05, 0.04], [0.11, 0.025], [0.05, 0.01]]), '#f2a33a', { depth: 0.01 }), 0, 0, 0.02);
  place(neck, card(circle(0.025, 0.05, 0.011), INK, { depth: 0.01, shadows: false }), 0, 0, 0.035);
  return { group, body, neck };
}

/** A lollipop STOP sign. The bottom of the pole is at the origin. */
export function makeStopSign() {
  const group = new THREE.Group();
  place(group, card(rect(-0.025, 0, 0.05, 1.25), '#e9e1d4', { depth: 0.03 }), 0, 0, 0);
  place(group, card(circle(0, 0, 0.26), '#d33a2f'), 0, 1.4, 0.02);
  place(group, makeSign('STOP', 0.4, 0.16, { bg: '#d33a2f', ink: '#fbf6ee', depth: 0.01 }), 0, 1.4, 0.06);
  return group;
}

/** A tall bandsman's hat, sitting on a puppet's head via wearHat (b-props). */
export function makeShako(colour) {
  const group = new THREE.Group();
  place(group, card(poly([[-0.24, -0.04], [0.17, -0.04], [0.17, 0.0], [0.14, 0.32], [-0.14, 0.32], [-0.17, 0.0]]), colour), 0, 0, 0);
  return group;
}

/** A bass drum, worn on the chest. */
export function makeDrum() {
  const group = new THREE.Group();
  place(group, card(circle(0, 0, 0.28), '#c8423a'), 0, 0, 0);
  place(group, card(circle(0, 0, 0.22), '#fbf6ee', { depth: 0.01 }), 0, 0, 0.04);
  return group;
}

/** A hand cymbal, front on, centred on the origin. */
export function makeCymbal() {
  return card(circle(0, 0, 0.17), BRASS, { depth: 0.02 });
}

/** A drum beater, gripped at the origin and pointing down the arm. */
export function makeBeater() {
  return card(poly([[-0.015, 0.05], [0.015, 0.05], [0.02, -0.3], [0.05, -0.33], [0, -0.4], [-0.05, -0.33], [-0.02, -0.3]]), '#fbf6ee', { depth: 0.02 });
}

/** A trumpet pointing +x from a mouthpiece at the origin. */
export function makeTrumpet() {
  const group = new THREE.Group();
  place(group, card(rect(0, -0.02, 0.32, 0.04), BRASS, { depth: 0.02 }), 0, 0, 0);
  place(group, card(poly([[0.3, 0], [0.44, 0.09], [0.44, -0.09]]), BRASS, { depth: 0.02 }), 0, 0, 0);
  return group;
}

/** A tuba, its coil at the origin and its bell pointing up. `mouth` is the middle of the bell's rim. */
export function makeTuba() {
  const group = new THREE.Group();
  const coil = circle(0, 0, 0.24);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.12, 0, Math.PI * 2, true);
  coil.holes.push(hole);
  place(group, card(coil, BRASS), 0, 0, 0);
  place(group, card(poly([[0.04, 0.16], [0.16, 0.16], [0.34, 0.72], [-0.16, 0.72]]), BRASS, { depth: 0.03 }), 0, 0, 0.02);
  return { group, mouth: new THREE.Vector3(0.09, 0.72, 0) };
}

/** An envelope with a red seal, centred on the origin. */
export function makeLetter() {
  const group = new THREE.Group();
  place(group, card(rect(-0.13, -0.085, 0.26, 0.17), '#fbf6ee', { depth: 0.01 }), 0, 0, 0);
  place(group, card(poly([[-0.13, 0.085], [0.13, 0.085], [0, -0.01]]), '#e9dcc4', { depth: 0.005, shadows: false }), 0, 0, 0.01);
  place(group, card(circle(0, 0, 0.025), '#c8423a', { depth: 0.005, shadows: false }), 0, 0, 0.016);
  return group;
}

/** A peaked postal cap, worn with wearHat (b-props). */
export function makeCap(colour) {
  return card(poly([[-0.25, -0.03], [0.27, -0.03], [0.21, 0.07], [0.18, 0.15], [-0.18, 0.15], [-0.21, 0.07]]), colour);
}

/** A satchel on a strap, made to hang on a puppet's hips (its origin at the hips). */
export function makeSatchel(colour) {
  const group = new THREE.Group();
  place(group, card(poly([[-0.2, 0.56], [-0.12, 0.6], [0.2, 0.06], [0.12, 0.02]]), colour, { depth: 0.01 }), 0, 0, 0.045);
  place(group, card(roundRect(0.08, -0.12, 0.26, 0.22, 0.04), colour, { depth: 0.04 }), 0, 0, 0.05);
  return group;
}

/** A red pillar box, its base at the origin. */
export function makePostBox() {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.2, 0, 0.4, 1.0, 0.05), '#c8423a'), 0, 0, 0);
  place(group, card(roundRect(-0.25, 0.98, 0.5, 0.14, 0.07), '#c8423a'), 0, 0, 0.02);
  place(group, card(rect(-0.12, 0.74, 0.24, 0.035), INK, { depth: 0.01, shadows: false }), 0, 0, 0.04);
  place(group, card(rect(-0.1, 0.42, 0.2, 0.16), '#fbf6ee', { depth: 0.01, shadows: false }), 0, 0, 0.04);
  return group;
}

/** A small book, centred on the origin. */
export function makeBook(colour) {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.13, -0.1, 0.26, 0.2, 0.02), colour, { depth: 0.04 }), 0, 0, 0);
  place(group, card(rect(-0.13, -0.1, 0.04, 0.2), '#2f2a30', { depth: 0.01, shadows: false }), 0, 0, 0.04);
  return group;
}

/** A rubber stamp, gripped at the origin with its pad pointing down the arm. */
export function makeStamp() {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.03, -0.1, 0.06, 0.14, 0.03), '#6b4636', { depth: 0.03 }), 0, 0, 0);
  place(group, card(rect(-0.08, -0.16, 0.16, 0.07), '#c8423a', { depth: 0.03 }), 0, 0, 0);
  return group;
}

/**
 * A book-return booth, its base centred on the origin. The librarian stands behind `front`
 * (a panel up to counterY) and leans on the counter, which runs out to the left.
 */
export function makeBooth(counterY, paint) {
  const group = new THREE.Group();
  const w = 0.55;
  place(group, card(rect(-w, 0, w * 2, counterY + 0.9), '#6d5a6a', { depth: 0.02 }), 0, 0, -0.2);
  for (let i = 0; i < 4; i++) place(group, card(rect(-0.07, 0, 0.14 - (i % 2) * 0.03, 0.3 - (i % 3) * 0.04), ['#5f8fb5', '#e8a35a', '#7fae6a', '#b03050'][i], { depth: 0.01, shadows: false }), -0.32 + i * 0.16, counterY + 0.5, -0.17);
  for (const s of [-1, 1]) place(group, card(rect(-0.06, 0, 0.12, counterY + 0.95), paint), s * (w - 0.06), 0, 0.26);
  place(group, card(rect(-w, 0, w * 2, counterY - 0.06), paint), 0, 0, 0.22);
  place(group, card(rect(-w - 0.45, counterY - 0.06, w * 2 + 0.45, 0.06), '#e9e1d4', { depth: 0.36 }), 0, 0, 0.0);
  place(group, card(poly([[-w - 0.15, counterY + 0.92], [w + 0.15, counterY + 0.92], [0, counterY + 1.3]]), '#b5524a'), 0, 0, 0.24);
  place(group, makeSign('BOOKS', 0.66, 0.2, { bg: '#fbf1dc', ink: '#2f6f6a', depth: 0.01 }), 0, counterY * 0.55, 0.27);
  return group;
}

/** A drawstring purse, held at the neck (the origin). */
export function makePurse() {
  const group = new THREE.Group();
  place(group, card(ellipse(0, -0.13, 0.11, 0.12), '#8a5a3a', { depth: 0.03 }), 0, 0, 0);
  place(group, card(poly([[-0.05, -0.03], [0.05, -0.03], [0.07, 0.03], [-0.07, 0.03]]), '#6b4636', { depth: 0.02 }), 0, 0, 0.01);
  return group;
}

/** A heap of gold coins, its base at the origin. */
export function makeCoinPile() {
  const group = new THREE.Group();
  place(group, card(ellipse(0, 0, 0.2, 0.09), '#e8b84a', { depth: 0.04 }), 0, 0.04, 0);
  for (const [x, y] of [[-0.09, 0.08], [0.06, 0.1], [0.0, 0.15]]) place(group, card(circle(0, 0, 0.045), '#ffd27a', { depth: 0.01, shadows: false }), x, y, 0.045);
  return group;
}
