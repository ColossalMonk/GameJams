import * as THREE from 'three';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, poly } from '../../world/shapes.js';

/** Props for story batch H: juggling balls, cardboard, a paraglider wing, chips and string. */

const INK = '#2f2530';
const KRAFT = '#c79a62';

/** A juggling ball with a stripe, centred on the origin. */
export function makeBall(colour, stripe = '#fbf6ee') {
  const group = new THREE.Group();
  place(group, card(circle(0, 0, 0.075), colour, { depth: 0.03 }), 0, 0, 0);
  place(group, card(rect(-0.075, -0.016, 0.15, 0.032), stripe, { depth: 0.005, shadows: false, rough: false }), 0, 0, 0.031);
  return group;
}

/** A flattened cardboard box lying on the ground, centred on the origin. */
export function makeFlatBox(w = 1.5, d = 0.9) {
  const group = new THREE.Group();
  const flat = card(rect(-w / 2, -d / 2, w, d), KRAFT, { depth: 0.012, shadows: false, stock: 'corrugated' });
  flat.rotation.x = -Math.PI / 2;
  place(group, flat, 0, 0.012, 0);
  const tape = card(rect(-w / 2, -0.05, w, 0.1), '#e3c9a0', { depth: 0.004, shadows: false, rough: false });
  tape.rotation.x = -Math.PI / 2;
  place(group, tape, 0, 0.026, 0);
  return group;
}

/** A sheet of cardboard seen side-on, as a sled: front lip curled up at -x, origin under the middle. */
export function makeSled() {
  const group = new THREE.Group();
  place(group, card(poly([[-0.55, 0], [0.55, 0], [0.55, 0.05], [-0.5, 0.05], [-0.68, 0.22], [-0.76, 0.19], [-0.6, 0]]), KRAFT, { stock: 'corrugated' }), 0, 0, 0);
  place(group, card(rect(-0.3, 0.012, 0.5, 0.026), '#e3c9a0', { depth: 0.005, shadows: false, rough: false }), 0, 0, 0.041);
  return group;
}

/** A boombox standing on the ground. */
export function makeBoombox(colour = '#3d3a40') {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.28, 0, 0.56, 0.3, 0.05), colour), 0, 0, 0);
  place(group, card(rect(-0.16, 0.3, 0.32, 0.05), colour, { depth: 0.02 }), 0, 0, -0.01);
  const speakers = [-0.15, 0.15].map((x) => place(group, card(circle(0, 0, 0.09), '#9aa3b5', { depth: 0.01 }), x, 0.15, 0.04));
  place(group, card(rect(-0.05, 0.2, 0.1, 0.05), '#f2c14e', { depth: 0.01, rough: false }), 0, 0, 0.04);
  return { group, speakers };
}

/** A small yellow star, for someone who has spun a little too much. */
export function makeStar(colour = '#ffd27a') {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 ? 0.035 : 0.08;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return card(poly(pts), colour, { depth: 0.01, shadows: false });
}

/** A ribbon bow tied round a rope, centred on the knot. */
export function makeRibbon(colour = '#e2574c') {
  const group = new THREE.Group();
  place(group, card(poly([[0, 0], [-0.13, 0.08], [-0.13, -0.08]]), colour, { depth: 0.01 }), 0, 0, 0.03);
  place(group, card(poly([[0, 0], [0.13, 0.08], [0.13, -0.08]]), colour, { depth: 0.01 }), 0, 0, 0.03);
  place(group, card(poly([[-0.03, 0], [-0.07, -0.22], [0.0, -0.17], [0.07, -0.22], [0.03, 0]]), colour, { depth: 0.01 }), 0, 0, 0.025);
  return group;
}

/**
 * A piece of rope 1 unit long along +x from the origin. Stretch it between two points with
 * span(piece, a, b): it is built short and scaled, so it stays a single cheap card.
 */
export function makeRope(colour = '#c9a46a') {
  const piece = card(rect(0, -0.025, 0.4, 0.05), colour, { depth: 0.03, rough: false });
  const group = new THREE.Group();
  group.add(piece);
  piece.scale.x = 2.5;
  return group;
}

export function span(rope, a, b) {
  rope.position.copy(a);
  rope.scale.x = Math.max(0.001, Math.hypot(b.x - a.x, b.y - a.y));
  rope.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
}

/** An arc of points from angle a0 to a1 (radians) at radius r. */
function arcPoints(r, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/**
 * A paraglider wing seen from the front: an arch of `cells` cells around the origin, from
 * 30° to 150° at radius `r`. Each cell has its own pivot so the wing can crumple.
 * anchors[i] is where cell i's lines tie on, in the cell's own coordinates.
 */
export function makeWing(colours, { r = 1.3, thick = 0.28, cells = 5 } = {}) {
  const group = new THREE.Group();
  const list = [];
  const a0 = Math.PI / 6;
  const step = (Math.PI * 2) / 3 / cells;
  for (let i = 0; i < cells; i++) {
    const from = a0 + i * step;
    const mid = from + step / 2;
    const cx = Math.cos(mid) * (r - thick / 2);
    const cy = Math.sin(mid) * (r - thick / 2);
    const outer = arcPoints(r, from, from + step, 4);
    const inner = arcPoints(r - thick, from + step, from, 4);
    const pts = [...outer, ...inner].map(([x, y]) => [x - cx, y - cy]);
    const pivot = new THREE.Group();
    pivot.position.set(cx, cy, 0);
    pivot.add(card(poly(pts), colours[i % colours.length], { depth: 0.03 }));
    group.add(pivot);
    const anchor = new THREE.Vector3(Math.cos(mid) * (r - thick) - cx, Math.sin(mid) * (r - thick) - cy, 0.02);
    list.push({ pivot, home: pivot.position.clone(), anchor });
  }
  return { group, cells: list };
}

/** A paper cone of chips, origin at the tip. flap folds over the top until it is opened. */
export function makeChipCone() {
  const group = new THREE.Group();
  const chips = [];
  for (const [x, a] of [[-0.06, 0.25], [-0.02, -0.1], [0.03, 0.15], [0.07, -0.3]]) {
    const chip = new THREE.Group();
    chip.position.set(x, 0.24, -0.01);
    chip.rotation.z = a;
    chip.add(card(rect(-0.018, 0, 0.036, 0.14), '#f2cf6b', { depth: 0.01, rough: false }));
    group.add(chip);
    chips.push(chip);
  }
  place(group, card(poly([[0, 0], [0.13, 0.3], [-0.13, 0.3]]), '#efe6d2', { stock: 'newsprint' }), 0, 0, 0);
  const flap = new THREE.Group();
  flap.position.set(0.13, 0.3, 0.02);
  flap.add(card(poly([[0, 0], [-0.26, 0], [-0.13, 0.13]]), '#e6dcc4', { depth: 0.01, stock: 'newsprint' }));
  group.add(flap);
  return { group, chips, flap };
}

/** One chip, held by its lower end. */
export function makeChip() {
  const group = new THREE.Group();
  place(group, card(rect(-0.02, 0, 0.04, 0.16), '#f2cf6b', { depth: 0.012, rough: false }), 0, 0, 0);
  return group;
}

/**
 * Bendy strings (leads, paraglider lines) as one LineSegments: `count` strings of `segs`
 * segments each. set(i, a, b, sag) draws string i from a to b, hanging down by `sag` in the middle.
 */
export function makeStrings(count, segs = 1, colour = INK) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * segs * 6), 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: colour }));
  lines.frustumCulled = false;
  const arr = geo.attributes.position.array;
  const at = (a, b, k, sag, out) => {
    out[0] = a.x + (b.x - a.x) * k;
    out[1] = a.y + (b.y - a.y) * k - Math.sin(Math.PI * k) * sag;
    out[2] = a.z + (b.z - a.z) * k;
  };
  const p = [0, 0, 0];
  return {
    lines,
    set(i, a, b, sag = 0) {
      for (let s = 0; s < segs; s++) {
        const o = (i * segs + s) * 6;
        at(a, b, s / segs, sag, p);
        arr[o] = p[0];
        arr[o + 1] = p[1];
        arr[o + 2] = p[2];
        at(a, b, (s + 1) / segs, sag, p);
        arr[o + 3] = p[0];
        arr[o + 4] = p[1];
        arr[o + 5] = p[2];
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

/** Where a puppet goes so that one of its points lands on `at`, with the whole body turned by `angle`. */
export function pinPuppet(puppet, angle, part, at, out = new THREE.Vector3()) {
  const root = puppet.root;
  root.rotation.z = angle;
  root.position.set(0, 0, at.z);
  root.updateMatrixWorld(true);
  const w = part(out);
  return out.set(at.x - w.x, at.y - w.y, at.z);
}
