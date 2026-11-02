import * as THREE from 'three';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse, poly } from '../../world/shapes.js';

/** Props for story batch F: window boxes, birds and cages, the café's bottles, boards and plates. */

const INK = '#2f2530';
const WATER = '#9fd0e8';

/** A half-ring (an arch band) of radius r and thickness t, standing on y = 0. */
function archBand(r, t) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI, false);
  s.lineTo(-r + t, 0);
  s.absarc(0, 0, r - t, Math.PI, 0, true);
  s.closePath();
  return s;
}

/** Only the top half of a window puppet shows; shrink the legs so they don't count in the photo either. */
export function hideLegs(puppet) {
  for (const leg of [puppet.legL, puppet.legR]) {
    leg.visible = false;
    leg.scale.setScalar(0.001);
  }
}

/**
 * The wooden box under a window that hides a window puppet's waist (as in opera.js).
 * Add it to the window group at its origin.
 */
export function makeWindowBox(colours = ['#f6a5b8', '#f2c14e', '#f6a5b8']) {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.36, -0.44, 0.72, 0.32, 0.04), '#8a5a3e', { depth: 0.08 }), 0, 0, 0.28);
  colours.forEach((c, i) => place(group, card(circle(-0.22 + i * 0.22, -0.28, 0.06), c, { depth: 0.01 }), 0, 0, 0.37));
  return group;
}

/**
 * A flower on a stem whose head can bloom: stem.scale.y grows it, head.scale opens it.
 * Origin at the bottom of the stem.
 */
export function makeBloom(colour, { r = 0.16, stem = 0.3 } = {}) {
  const group = new THREE.Group();
  const stemCard = place(group, card(rect(-0.015, 0, 0.03, 1), '#5f8f4a', { depth: 0.01, shadows: false }), 0, 0, 0);
  stemCard.scale.y = stem;
  const head = new THREE.Group();
  head.position.y = stem;
  group.add(head);
  const petals = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return circle(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5);
  });
  place(head, card(petals, colour, { depth: 0.015 }), 0, 0, 0.01);
  place(head, card(circle(0, 0, r * 0.35), '#f2c14e', { depth: 0.01, shadows: false }), 0, 0, 0.03);
  return { group, stem: stemCard, head, height: stem };
}

/** A wicker dove basket, origin at the bottom middle. lid.rotation.z opens it (hinged at the back left). */
export function makeBasket() {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.3, 0, 0.6, 0.3, 0.05), '#b98a55', { depth: 0.12 }), 0, 0, 0);
  const weave = [0.07, 0.15, 0.23].map((y) => rect(-0.28, y, 0.56, 0.025));
  place(group, card(weave, '#8f6436', { depth: 0.01, shadows: false }), 0, 0, 0.125);
  const lid = new THREE.Group();
  lid.position.set(-0.31, 0.3, 0.06);
  place(lid, card(roundRect(0, 0, 0.62, 0.07, 0.03), '#a07240', { depth: 0.12 }), 0, 0, -0.06);
  place(lid, card(roundRect(0.26, 0.06, 0.1, 0.05, 0.02), '#8f6436', { depth: 0.02 }), 0, 0, 0.0);
  group.add(lid);
  return { group, lid, top: new THREE.Vector3(0, 0.34, 0.06) };
}

/** A side-on parrot facing +x, origin at its middle, feet at y = -0.1. Flap with wing.rotation.z. */
export function makeParrot(body = '#3fa36b') {
  const group = new THREE.Group();
  place(group, card(poly([[-0.08, -0.03], [-0.44, -0.24], [-0.4, -0.13], [-0.06, 0.04]]), '#2f6fb5', { depth: 0.02 }), 0, 0, -0.01);
  place(group, card(ellipse(0, 0, 0.15, 0.1, 0.35), body, { depth: 0.02 }), 0, 0, 0);
  place(group, card(circle(0.13, 0.12, 0.08), '#e2574c', { depth: 0.02 }), 0, 0, 0.01);
  place(group, card(poly([[0.19, 0.16], [0.29, 0.1], [0.25, 0.02], [0.19, 0.08]]), '#f2c14e', { depth: 0.01 }), 0, 0, 0.02);
  place(group, card(circle(0.15, 0.14, 0.018), INK, { depth: 0.01, shadows: false }), 0, 0, 0.035);
  place(group, card([rect(-0.03, -0.14, 0.015, 0.06), rect(0.02, -0.14, 0.015, 0.06)], '#3a3340', { depth: 0.01, shadows: false }), 0, 0, 0.01);
  const wing = new THREE.Group();
  wing.position.set(0.04, 0.04, 0.035);
  place(wing, card(poly([[0, 0], [-0.3, 0.05], [-0.26, -0.06], [-0.04, -0.07]]), '#2a8a55', { depth: 0.01 }), 0, 0, 0);
  place(wing, card(poly([[-0.3, 0.05], [-0.4, 0.0], [-0.26, -0.06]]), '#2f6fb5', { depth: 0.01, shadows: false }), 0, 0, 0.01);
  group.add(wing);
  return { group, wing };
}

/**
 * A domed brass birdcage, origin at the bottom middle. door.rotation.y swings the door
 * open; doorway is where a bird squeezes out (cage-local).
 */
export function makeCage() {
  const group = new THREE.Group();
  const brass = '#c9a24a';
  place(group, card(roundRect(-0.26, 0, 0.52, 0.05, 0.02), brass, { depth: 0.1 }), 0, 0, -0.03);
  place(group, card(archBand(0.23, 0.025), brass, { depth: 0.02 }), 0, 0.4, 0.05);
  place(group, card(archBand(0.05, 0.015), brass, { depth: 0.01 }), 0, 0.62, 0.05);
  const bars = [-0.22, -0.13, 0.13, 0.22].map((x) => rect(x - 0.008, 0.04, 0.016, 0.38));
  bars.push(rect(-0.008, 0.4, 0.016, 0.2));
  place(group, card(bars, brass, { depth: 0.01, shadows: false }), 0, 0, 0.06);
  const door = new THREE.Group();
  door.position.set(-0.09, 0.05, 0.065);
  place(door, card([rect(0, 0, 0.18, 0.02), rect(0, 0.26, 0.18, 0.02), rect(0.04, 0, 0.016, 0.28), rect(0.12, 0, 0.016, 0.28)], brass, { depth: 0.01, shadows: false }), 0, 0, 0);
  group.add(door);
  return { group, door, doorway: new THREE.Vector3(0, 0.18, 0.12) };
}

/** A long-stemmed red rose, origin at the middle of the stem. */
export function makeRose() {
  const group = new THREE.Group();
  place(group, card(rect(-0.012, -0.2, 0.024, 0.3), '#4f8a45', { depth: 0.01, shadows: false }), 0, 0, 0);
  place(group, card(ellipse(0.05, -0.05, 0.05, 0.022, 0.6), '#5f9a50', { depth: 0.01, shadows: false }), 0, 0, 0.005);
  place(group, card(teardropHead(), '#d8324a', { depth: 0.02 }), 0, 0.1, 0.01);
  return group;
}

function teardropHead() {
  return poly([[-0.06, 0.02], [-0.07, 0.09], [-0.03, 0.07], [0, 0.12], [0.03, 0.07], [0.07, 0.09], [0.06, 0.02], [0, -0.02]]);
}

/** A tin bucket, origin at its bottom middle; mouth is where water leaves when it tips. */
export function makeBucket() {
  const group = new THREE.Group();
  place(group, card(poly([[-0.12, 0], [0.12, 0], [0.16, 0.24], [-0.16, 0.24]]), '#8fa3ad', { depth: 0.06 }), 0, 0, 0);
  place(group, card(archBand(0.15, 0.015), '#3d3a40', { depth: 0.01, shadows: false }), 0, 0.22, 0.04);
  return { group, mouth: new THREE.Vector3(0, 0.24, 0.04) };
}

/** A blob of falling water (a card with a few lobes). Stretch it with scale.y. */
export function makeWaterBlob(w = 0.3) {
  const shapes = [ellipse(0, 0, w * 0.5, w * 0.35), circle(-w * 0.35, -w * 0.25, w * 0.18), circle(w * 0.3, -w * 0.3, w * 0.15), circle(w * 0.05, w * 0.32, w * 0.16)];
  return card(shapes, WATER, { depth: 0.02, shadows: false });
}

/** A watering can facing -x (spout on the left), origin at the handle; spout is the rose's tip. */
export function makeWateringCan(colour = '#6f9a8a') {
  const group = new THREE.Group();
  const parts = [
    roundRect(-0.13, -0.2, 0.26, 0.18, 0.04),
    poly([[-0.11, -0.12], [-0.36, -0.0], [-0.36, -0.04], [-0.12, -0.18]]),
    poly([[-0.34, 0.02], [-0.4, 0.0], [-0.38, -0.08], [-0.33, -0.06]]),
    archBand(0.11, 0.025),
  ];
  place(group, card(parts, colour, { depth: 0.04 }), 0, 0, 0);
  return { group, spout: new THREE.Vector3(-0.39, -0.03, 0.02) };
}

/** A thin falling stream of water, hanging down from the origin; scale.y is its length. */
export function makeStream(w = 0.05) {
  const group = new THREE.Group();
  place(group, card(rect(-w / 2, -1, w, 1), WATER, { depth: 0.01, shadows: false }), 0, 0, 0);
  return group;
}

/** A pocket umbrella, origin at the bottom of the handle. open(u): 0 furled, 1 open. */
export function makeUmbrella(colour = '#e2574c') {
  const group = new THREE.Group();
  place(group, card([rect(-0.012, 0, 0.024, 0.62), roundRect(-0.05, -0.03, 0.06, 0.05, 0.02)], '#3d3a40', { depth: 0.01, shadows: false }), 0, 0, 0);
  const canopy = new THREE.Group();
  canopy.position.y = 0.62;
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.45, 0, Math.PI, false);
  for (let i = 0; i < 4; i++) s.quadraticCurveTo(-0.45 + (i + 0.5) * 0.225, 0.07, -0.45 + (i + 1) * 0.225, 0);
  place(canopy, card(s, colour, { depth: 0.02 }), 0, -0.1, 0.01);
  group.add(canopy);
  return {
    group,
    open(u) {
      canopy.scale.set(0.12 + 0.88 * u, 0.4 + 0.6 * u, 1);
      canopy.position.y = 0.62 - 0.25 * (1 - u);
    },
  };
}

/** A champagne bottle, origin at the bottom, neck up +y; mouth is the top (bottle-local). */
export function makeBottle() {
  const group = new THREE.Group();
  place(group, card([roundRect(-0.07, 0, 0.14, 0.26, 0.05), poly([[-0.07, 0.22], [0.07, 0.22], [0.025, 0.36], [-0.025, 0.36]]), rect(-0.025, 0.34, 0.05, 0.08)], '#2f5a3a', { depth: 0.05 }), 0, 0, 0);
  place(group, card(rect(-0.06, 0.07, 0.12, 0.09), '#fbf1dc', { depth: 0.01, shadows: false }), 0, 0, 0.05);
  place(group, card(rect(-0.03, 0.36, 0.06, 0.07), '#e8c77a', { depth: 0.01, shadows: false }), 0, 0, 0.05);
  return { group, mouth: new THREE.Vector3(0, 0.43, 0.03) };
}

/** A champagne cork, origin at its middle. */
export function makeCork() {
  const group = new THREE.Group();
  place(group, card([roundRect(-0.035, -0.04, 0.07, 0.05, 0.015), roundRect(-0.045, 0.0, 0.09, 0.045, 0.02)], '#d9b27a', { depth: 0.03 }), 0, 0, 0);
  return group;
}

/** A champagne flute, origin at the foot. fill.scale.y fills it (0..1). */
export function makeFlute() {
  const group = new THREE.Group();
  place(group, card([poly([[-0.045, 0.12], [0.045, 0.12], [0.035, 0.28], [-0.035, 0.28]]), rect(-0.006, 0.02, 0.012, 0.11), roundRect(-0.04, 0, 0.08, 0.02, 0.01)], '#e9f1f2', { depth: 0.01, shadows: false }), 0, 0, 0);
  const fill = new THREE.Group();
  fill.position.y = 0.125;
  place(fill, card(rect(-0.038, 0, 0.076, 0.14), '#f2d27a', { depth: 0.01, shadows: false }), 0, 0, 0.012);
  fill.scale.y = 0.001;
  group.add(fill);
  return { group, fill };
}

/** A chess board, tilted towards the camera; origin at its middle. at(u, v) is a square's point in the group. */
export function makeChessBoard(w = 0.8, d = 0.42, tilt = 0.95) {
  const group = new THREE.Group();
  const top = new THREE.Group();
  top.rotation.x = -tilt;
  group.add(top);
  place(top, card(roundRect(-w / 2 - 0.03, -d / 2 - 0.03, w + 0.06, d + 0.06, 0.02), '#6b4636', { depth: 0.03 }), 0, 0, -0.03);
  place(top, card(rect(-w / 2, -d / 2, w, d), '#fbf1dc', { depth: 0.01, shadows: false }), 0, 0, 0.0);
  const dark = [];
  const n = 8;
  const m = 4;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if ((i + j) % 2) dark.push(rect(-w / 2 + (i * w) / n, -d / 2 + (j * d) / m, w / n, d / m));
  place(top, card(dark, '#7a5a48', { depth: 0.01, shadows: false }), 0, 0, 0.005);
  return {
    group,
    top,
    /** u across the board (−0.5 left … 0.5 right), v from the back row (−0.5) to the front (0.5). */
    at(u, v, out = new THREE.Vector3()) {
      return out.set(u * w, -v * d * Math.cos(tilt) + 0.02 * Math.sin(tilt), v * d * Math.sin(tilt) + 0.02 * Math.cos(tilt));
    },
  };
}

/** A chess piece standing on its base at the origin: 'pawn', 'queen' or 'king'. */
export function makePiece(kind, colour) {
  const shapes = [roundRect(-0.05, 0, 0.1, 0.03, 0.012)];
  if (kind === 'pawn') shapes.push(poly([[-0.035, 0.03], [0.035, 0.03], [0.015, 0.09], [-0.015, 0.09]]), circle(0, 0.11, 0.035));
  else {
    const h = kind === 'king' ? 0.2 : 0.17;
    shapes.push(poly([[-0.04, 0.03], [0.04, 0.03], [0.022, h - 0.04], [-0.022, h - 0.04]]), roundRect(-0.04, h - 0.05, 0.08, 0.03, 0.01));
    if (kind === 'king') shapes.push(rect(-0.008, h - 0.03, 0.016, 0.08), rect(-0.03, h + 0.01, 0.06, 0.016));
    else shapes.push(poly([[-0.045, h - 0.03], [-0.03, h + 0.03], [-0.012, h], [0, h + 0.04], [0.012, h], [0.03, h + 0.03], [0.045, h - 0.03]]));
  }
  const group = new THREE.Group();
  place(group, card(shapes, colour, { depth: 0.03 }), 0, 0, 0);
  return group;
}

/** A dinner plate seen nearly edge-on, origin at its middle. */
export function makePlate(colour = '#fbf6ee', rim = '#5f8fb5') {
  const group = new THREE.Group();
  place(group, card(ellipse(0, 0, 0.19, 0.04), colour, { depth: 0.02 }), 0, 0, 0);
  place(group, card(ellipse(0, -0.012, 0.19, 0.012), rim, { depth: 0.01, shadows: false }), 0, 0, 0.02);
  return group;
}

/** A teacup with its handle on the right, origin at the bottom middle. */
export function makeCup(colour = '#fbf6ee') {
  const group = new THREE.Group();
  const handle = new THREE.Shape();
  handle.absarc(0.075, 0.07, 0.04, -Math.PI / 2, Math.PI / 2, false);
  handle.absarc(0.075, 0.07, 0.022, Math.PI / 2, -Math.PI / 2, true);
  place(group, card([poly([[-0.07, 0.12], [0.07, 0.12], [0.05, 0], [-0.05, 0]]), handle], colour, { depth: 0.03 }), 0, 0, 0);
  place(group, card(rect(-0.06, 0.07, 0.12, 0.018), '#e2574c', { depth: 0.01, shadows: false }), 0, 0, 0.03);
  return group;
}
