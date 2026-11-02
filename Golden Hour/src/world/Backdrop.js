import * as THREE from 'three';
import { card, place, glowMaterial } from './paper.js';
import { hill, poly, rect, roundRect } from './shapes.js';
import { bakeStatic } from './bake.js';
import { sunCentre } from './Sky.js';
import { Evening } from '../game/Evening.js';

/** Tonight's far distance, and how often each one comes up. */
const VARIANTS = [['hills', 40], ['sea', 25], ['mountains', 20], ['city', 15]];

const C = {
  // Same strings and stock as Town's C, so they share its cached materials (Season tints them).
  hillFar: '#9db59a',
  hillFarther: '#b7c4a6',
  sea: ['#a3c3d2', '#80aac3', '#5f9ba7', '#4c8198'],
  foam: ['#d3e5ea', '#bfdbe2', '#acd5d0', '#9fc8d2'],
  rock: '#6f6878',
  tower: '#f3ead8',
  band: '#c2564a',
  iron: '#3d3a40',
  hulls: ['#b5524a', '#3f6f8f', '#e9e1d4', '#6d5a7a', '#2f6f6a'],
  sails: ['#fbf1dc', '#f6e7c4', '#f2c14e', '#f2c8b8'],
  peaks: ['#aab2d8', '#8b8dc0'],
  foothills: '#8fa2b6',
  snow: '#f8f4ef',
  city: ['#ab9dc0', '#8e7fa8', '#76698f'],
};

/** Every far layer spans this, wider than the widest screen sees at z = -10. */
const X0 = -24;
const X1 = 24;
/** Far layers start below the ground so a bobbing strip never shows a gap. */
const FOOT = -0.4;

const smoothstep = THREE.MathUtils.smoothstep;
const jitter = (a) => (Math.random() * 2 - 1) * a;

function weighted(e, list) {
  let r = e.random() * list.reduce((s, [, w]) => s + w, 0);
  for (const [name, w] of list) {
    if ((r -= w) < 0) return name;
  }
  return list[0][0];
}

/** Points along a wavy top edge, sampled finely enough to stay smooth with rough: false. */
function edgePoints(top, step = 0.2) {
  const pts = [];
  for (let x = X0; x <= X1 + 1e-6; x += step) pts.push([x, top(x) + jitter(0.006)]);
  return pts;
}

/** A thin band hanging under an edge: the pale lip along the top of a water strip. */
function lip(pts, h) {
  return poly([...pts, ...pts.map(([x, y]) => [x, y - h]).reverse()]);
}

/**
 * The far distance behind the town, rebuilt every evening: rolling hills, the sea with a
 * lighthouse and sailboats, snowy mountains, or a city skyline. Static cards are baked;
 * the water strips, boats and lighthouse beam stay separate and move in update().
 */
export class Backdrop {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.name = null;
    this.waves = [];
    this.boats = [];
    this.beam = null;
    // Made once: glowMaterial registers each one with the sky for good.
    this.lamp = glowMaterial('#f6e3b0', '#ffc46b');
    this.glitter = glowMaterial('#f2dcaa', '#ffb35c');
    this.windows = glowMaterial('#6f6487', '#ffcf7a');
    this.beamMaterial = new THREE.MeshBasicMaterial({ color: '#fff1c8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  }

  /** Build tonight's far distance from the seeded evening; returns its name. */
  build(evening) {
    this.dispose();
    // A stream of its own, so the backdrop doesn't change which stories an evening has.
    const e = new Evening(evening.number + 0.25);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.name = weighted(e, VARIANTS);
    const moving = { hills: () => this.hills(), sea: () => this.sea(e), mountains: () => this.mountains(e), city: () => this.city(e) }[this.name]();
    bakeStatic(this.group, { skip: moving });
    return this.name;
  }

  hills() {
    const g = this.group;
    place(g, card(hill(-26, 26, (x) => 2.2 + 0.9 * Math.sin(x * 0.32 + 1) + 0.5 * Math.sin(x * 0.9)), C.hillFarther, { depth: 0.05, stock: 'watercolour' }), 0, 0, -10.4);
    place(g, card(hill(-26, 26, (x) => 1.3 + 0.7 * Math.sin(x * 0.45 + 2.4) + 0.3 * Math.sin(x * 1.4)), C.hillFar, { depth: 0.05, stock: 'watercolour' }), 0, 0, -9.2);
    return [];
  }

  /** Layered water strips, a lighthouse on a rock, two sailboats; the sun sets into it. */
  sea(e) {
    const sunX = sunCentre(0).x;
    const zs = [-10.4, -10.05, -9.55, -9.1];
    const tops = [e.range(2.08, 2.18), e.range(1.9, 2.0), e.range(1.74, 1.84), e.range(1.6, 1.68)];
    zs.forEach((z, i) => {
      const a1 = 0.012 + i * 0.016;
      const a2 = 0.006 + i * 0.008;
      const k1 = e.range(1.4, 2.2);
      const k2 = e.range(3.2, 4.6);
      const p1 = e.range(0, 6.28);
      const p2 = e.range(0, 6.28);
      const pts = edgePoints((x) => tops[i] + a1 * Math.sin(k1 * x + p1) + a2 * Math.sin(k2 * x + p2));
      const g = new THREE.Group();
      const strip = place(g, card(poly([...pts, [X1, FOOT], [X0, FOOT]]), C.sea[i], { depth: 0.05, rough: false, shadows: false, stock: 'watercolour' }), 0, 0, z);
      // Children of the strip share its hand-glued tilt, so they stay on its edge.
      place(strip, card(lip(pts, 0.05), C.foam[i], { depth: 0.01, rough: false, shadows: false }), 0, 0, 0.05);
      if (i < 2) {
        // The sun's path on the water: a few gold dashes that glow as it gets late.
        const y0 = tops[i] - a1 - a2 - 0.09;
        for (let r = 0; r < 3; r++) {
          for (let n = 1 + Math.floor(Math.random() * 2); n > 0; n--) {
            const w = 0.12 + Math.random() * 0.3;
            const dash = card(roundRect(-w / 2, 0, w, 0.035, 0.017), null, { depth: 0.01, material: this.glitter, shadows: false });
            place(strip, dash, sunX + jitter(0.4 + r * 0.3), y0 - r * 0.075, 0.062);
          }
        }
      }
      bakeStatic(g);
      this.group.add(g);
      this.waves.push({
        group: g,
        bob: i === 0 ? 0.01 : e.range(0.025, 0.045),
        speed: e.range(0.7, 1.2),
        sway: i === 0 ? 0.04 : e.range(0.08, 0.16),
        swaySpeed: e.range(0.25, 0.45),
        phase: e.range(0, 6.28),
        top: tops[i],
      });
    });

    const side = e.chance(0.5) ? -1 : 1;
    // Left: clear of the church. Right: the near hill hides the rock, the tower shows over it.
    const lx = side < 0 ? e.range(-14.6, -13.6) : e.range(14.8, 15.6);
    const pivot = this.lighthouse(lx, 2.15, -9.66, e);

    // One boat behind the viaduct, one in front of it.
    this.boats = [
      this.boat(e, 1, -10.25, 0.75, e.chance(0.5) ? e.range(-16, -10) : e.range(6.5, 11)),
      this.boat(e, 3, -9.3, 1.0, e.chance(0.5) ? e.range(-15, -9) : e.range(7, 12)),
    ];
    return [...this.waves.map((w) => w.group), ...this.boats.map((b) => b.group), pivot];
  }

  lighthouse(x, y, z, e) {
    const g = new THREE.Group();
    const opts = { shadows: false };
    place(g, card(poly([[-0.95, -1.3], [0.9, -1.3], [0.85, -0.2], [0.6, 0.04], [0.25, 0.12], [-0.2, 0.06], [-0.55, 0.15], [-0.8, -0.05], [-0.95, -0.3]]), C.rock, { ...opts, depth: 0.06 }), 0, 0, 0);
    const hw = (h) => 0.3 - 0.045 * h;
    place(g, card(poly([[-hw(0), 0], [hw(0), 0], [hw(2), 2], [-hw(2), 2]]), C.tower, { ...opts, depth: 0.04 }), 0, 0, -0.02);
    for (const [b0, b1] of [[0.5, 0.8], [1.3, 1.6]]) {
      place(g, card(poly([[-hw(b0), b0], [hw(b0), b0], [hw(b1), b1], [-hw(b1), b1]]), C.band, { ...opts, depth: 0.01 }), 0, 0, 0.02);
    }
    place(g, card(roundRect(-0.08, 0, 0.16, 0.3, 0.06), C.iron, { ...opts, depth: 0.01 }), 0, 0, 0.02);
    place(g, card(rect(-0.3, 2.0, 0.6, 0.08), C.iron, { ...opts, depth: 0.06 }), 0, 0, -0.01);
    place(g, card(roundRect(-0.15, 2.08, 0.3, 0.34, 0.04), null, { ...opts, depth: 0.03, material: this.lamp }), 0, 0, -0.01);
    place(g, card(poly([[-0.24, 2.42], [0.24, 2.42], [0, 2.72]]), C.band, { ...opts, depth: 0.04 }), 0, 0, 0);
    place(g, card(rect(-0.02, 2.72, 0.04, 0.1), C.iron, { ...opts, depth: 0.02 }), 0, 0, 0);
    g.position.set(x, y, z);
    this.group.add(g);

    // The beam: a pale wedge from the lamp that swings round (scale.x runs through cos).
    const pivot = new THREE.Group();
    const L = 4.5;
    pivot.add(new THREE.Mesh(new THREE.ShapeGeometry(poly([[0, -0.05], [L, -0.38], [L, 0.38], [0, 0.05]])), this.beamMaterial));
    pivot.position.set(x, y + 2.25, z + 0.06);
    this.group.add(pivot);
    this.beam = { pivot, phase: e.range(0, 6.28), speed: e.range(0.7, 1.0) };
    return pivot;
  }

  /** A small sailboat facing +x, waterline at y = 0, riding on wave strip `wave`. */
  boat(e, wave, z, s, x) {
    const g = new THREE.Group();
    const opts = { shadows: false, depth: 0.02 };
    const sail = e.pick(C.sails);
    const hull = e.pick(C.hulls);
    place(g, card(poly([[-0.46, 0.07], [0.52, 0.09], [0.34, -0.16], [-0.4, -0.16]]), hull, { ...opts, depth: 0.03 }), 0, 0, 0);
    place(g, card(rect(-0.015, 0.07, 0.03, 0.8), C.iron, { ...opts, rough: false }), 0, 0, -0.01);
    place(g, card(poly([[-0.03, 0.14], [-0.03, 0.82], [-0.42, 0.14]]), sail, opts), 0, 0, -0.005);
    place(g, card(poly([[0.03, 0.14], [0.03, 0.7], [0.36, 0.14]]), sail, opts), 0, 0, -0.005);
    place(g, card(poly([[0, 0.8], [0, 0.88], [-0.12, 0.84]]), hull, opts), 0, 0, -0.01);
    bakeStatic(g);
    const dir = e.chance(0.5) ? 1 : -1;
    g.scale.set(dir * s, s, 1);
    g.position.set(x, this.waves[wave].top, z);
    this.group.add(g);
    return { group: g, wave: this.waves[wave], speed: dir * e.range(0.08, 0.2), phase: e.range(0, 6.28) };
  }

  /** Jagged peaks in two layers with snow caps, low where tonight's sun goes down. */
  mountains(e) {
    const sunX = sunCentre(0).x;
    const layers = [
      { z: -10.4, lo: 3.4, hi: 4.8, dip: 2.0, step: [1.6, 3.0], snow: 3.9, colour: C.peaks[0] },
      { z: -10.12, lo: 2.0, hi: 3.5, dip: 1.4, step: [1.2, 2.3], snow: 3.05, colour: C.peaks[1] },
    ];
    for (const L of layers) {
      const ceiling = (x) => L.dip + (L.hi - L.dip) * smoothstep(Math.abs(x - sunX), 0.8, 3.8);
      const keys = [];
      let peak = e.chance(0.5);
      for (let x = X0 - e.range(0.5, 1.5); x < X1 + 1.5; x += e.range(L.step[0], L.step[1]) / 2) {
        const y = peak ? e.range(L.lo, L.hi) : e.range(L.lo * 0.45, L.lo * 0.75);
        keys.push({ x, y: Math.min(y, ceiling(x)), peak });
        peak = !peak;
      }
      // Straight slopes with a couple of nicks in each, as if cut with scissors.
      const outline = [];
      const tips = [];
      keys.forEach((k, i) => {
        if (k.peak) tips.push(outline.length);
        outline.push([k.x, k.y]);
        const n = keys[i + 1];
        if (!n) return;
        for (const u of [0.35, 0.7]) outline.push([k.x + (n.x - k.x) * u + jitter(0.05), k.y + (n.y - k.y) * u + jitter(0.06)]);
      });
      const first = outline[0][0];
      const last = outline[outline.length - 1][0];
      const m = place(this.group, card(poly([...outline, [last, FOOT], [first, FOOT]]), L.colour, { depth: 0.05, rough: false, shadows: false, stock: 'watercolour' }), 0, 0, L.z);
      for (const i of tips) {
        if (outline[i][1] > L.snow) place(m, card(snowCap(outline, i, L.snow), C.snow, { depth: 0.01, rough: false, shadows: false }), 0, 0, 0.05);
      }
    }
    const p = e.range(0, 6.28);
    const q = e.range(0, 6.28);
    place(this.group, card(hill(-26, 26, (x) => 1.0 + 0.3 * Math.sin(x * 0.5 + p) + 0.18 * Math.sin(x * 1.3 + q)), C.foothills, { depth: 0.05, shadows: false, stock: 'watercolour' }), 0, 0, -9.25);
    return [];
  }

  /** Flat tower silhouettes in three rows, a few windows lit. */
  city(e) {
    const rows = [
      { z: -10.4, colour: C.city[0], w: [0.7, 1.6], h: [1.6, 3.5], lit: 0.45 },
      { z: -10.12, colour: C.city[1], w: [0.6, 1.3], h: [0.9, 2.4], lit: 0.35 },
      { z: -9.3, colour: C.city[2], w: [0.9, 1.9], h: [0.35, 1.0], lit: 0 },
    ];
    for (const row of rows) {
      let x = X0 + e.range(-0.5, 0.5);
      for (let i = 0; x < X1; i++) {
        const w = e.range(row.w[0], row.w[1]);
        const h = e.range(row.h[0], row.h[1]);
        // Neighbours overlap a little, so stagger them in depth.
        const z = row.z + (i % 3) * 0.012;
        const cx = x + w / 2;
        place(this.group, card(towerShape(e, w, h), row.colour, { depth: 0.04, rough: false, shadows: false, stock: 'watercolour' }), cx, 0, z);
        if (h > 2.2 && h < 3.2 && e.chance(0.3)) place(this.group, card(rect(-0.03, 0, 0.06, 0.45), row.colour, { depth: 0.02, shadows: false }), cx + e.range(-0.2, 0.2) * w, h - 0.02, z + 0.01);
        if (e.chance(row.lit)) {
          for (let n = 1 + Math.floor(e.range(0, 3)); n > 0; n--) {
            place(this.group, card(rect(-0.04, -0.05, 0.08, 0.1), null, { depth: 0.01, material: this.windows, shadows: false }), cx + e.range(-0.35, 0.35) * w, e.range(0.5, h - 0.35), z + 0.045);
          }
        }
        x += w + e.range(-0.12, 0.3);
      }
    }
    return [];
  }

  /** Animate moving parts (waves, lighthouse beam, boats) — wall-clock time. */
  update(dt, wall) {
    if (!this.group) return;
    for (const w of this.waves) {
      w.group.position.set(w.sway * Math.sin(wall * w.swaySpeed + w.phase), w.bob * Math.sin(wall * w.speed + w.phase), 0);
    }
    for (const b of this.boats) {
      const p = b.group.position;
      p.x += b.speed * dt;
      if (p.x > 21) p.x -= 42;
      if (p.x < -21) p.x += 42;
      p.y = b.wave.top + b.wave.group.position.y + 0.02 * Math.sin(wall * 1.9 + b.phase);
      b.group.rotation.z = 0.05 * Math.sin(wall * 1.4 + b.phase);
    }
    if (this.beam) {
      const c = Math.cos(wall * this.beam.speed + this.beam.phase);
      const glow = Math.min(1, this.lamp.emissiveIntensity / 1.4);
      this.beam.pivot.scale.x = c;
      // Brightest when it swings round to face us.
      this.beamMaterial.opacity = 0.3 * glow * (0.6 + 0.4 * (1 - Math.abs(c)));
      this.beam.pivot.visible = glow > 0.02;
    }
  }

  dispose() {
    this.waves = [];
    this.boats = [];
    this.beam = null;
    if (!this.group) return;
    this.scene.remove(this.group);
    this.group.traverse((o) => o.geometry?.dispose());
    this.group = null;
  }
}

/** The top of a peak down to a zig-zag snow line, following the mountain's outline exactly. */
function snowCap(outline, i, snowLine) {
  const [px, py] = outline[i];
  const yc = py - Math.min(0.6, 0.25 + (py - snowLine) * 0.5);
  const cross = (a, b) => {
    const u = (yc - a[1]) / (b[1] - a[1]);
    return [a[0] + (b[0] - a[0]) * u, yc];
  };
  let j = i;
  while (j > 0 && outline[j - 1][1] > yc) j--;
  let k = i;
  while (k < outline.length - 1 && outline[k + 1][1] > yc) k++;
  const left = j > 0 ? cross(outline[j - 1], outline[j]) : [outline[j][0], yc];
  const right = k < outline.length - 1 ? cross(outline[k + 1], outline[k]) : [outline[k][0], yc];
  const ridge = [left, ...outline.slice(j, k + 1), right];
  // Height of the ridge at x, so the zig-zag never pokes out past the mountain's edge.
  const at = (x) => {
    for (let n = 1; n < ridge.length; n++) {
      const [ax, ay] = ridge[n - 1];
      const [bx, by] = ridge[n];
      if (x >= ax && x <= bx) return bx > ax ? ay + ((by - ay) * (x - ax)) / (bx - ax) : Math.max(ay, by);
    }
    return yc;
  };
  const pts = [...ridge];
  const teeth = 3 + Math.floor(Math.random() * 2);
  for (let s = 1; s < teeth; s++) {
    const x = right[0] + (left[0] - right[0]) * (s / teeth);
    pts.push([x, yc + (at(x) - yc) * (s % 2 ? 0.45 : 0.1)]);
  }
  return poly(pts);
}

/**
 * One distant tower, centred on x = 0, standing on FOOT. Corners are nudged by hand instead
 * of card()'s roughening, which costs a lot over two hundred towers and can't be seen this far.
 */
function towerShape(e, w, h) {
  const nudged = (pts) => poly(pts.map(([x, y]) => [x + jitter(0.012), y + jitter(0.012)]));
  const l = -w / 2;
  const r = w / 2;
  const kind = e.pick(['flat', 'flat', 'step', 'step', 'spire', 'slant', 'dome']);
  if (kind === 'step') {
    const s = w * e.range(0.15, 0.3);
    const t = e.range(0.25, 0.5);
    return nudged([[l, FOOT], [r, FOOT], [r, h], [r - s, h], [r - s, h + t], [l + s, h + t], [l + s, h], [l, h]]);
  }
  if (kind === 'spire') return nudged([[l, FOOT], [r, FOOT], [r, h], [w * 0.12, h], [0, h + e.range(0.3, 0.55)], [-w * 0.12, h], [l, h]]);
  if (kind === 'slant') return nudged([[l, FOOT], [r, FOOT], [r, h - w * 0.35], [l, h]]);
  if (kind === 'dome' && w < 1.1) {
    const s = new THREE.Shape();
    s.moveTo(l, FOOT);
    s.lineTo(r, FOOT);
    s.lineTo(r, h);
    s.absarc(0, h, r, 0, Math.PI, false);
    s.closePath();
    return s;
  }
  return nudged([[l, FOOT], [r, FOOT], [r, h], [l, h]]);
}
