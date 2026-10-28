import * as THREE from 'three';
import { card, place, glowMaterial } from './paper.js';
import { rect, roundRect, circle, poly, cloud, hill, ellipse } from './shapes.js';

/** Where Elm Street's fixed buildings stand. */
export const LAYOUT = {
  church: { x: -9.4, z: -5.8, h: 3.3 },
  wall: { x0: -7.5, x1: -4.9, z: -2.9, h: 1.45 },
  apartment: { x: -3.2, z: -5.6, w: 2.9, h: 6.2 },
  cafe: { x: -0.2, z: -3.6 },
  table: { x: -0.4, z: -1.9 },
  hill: { z: -6.8 },
};

/** Height of the near hill at x. */
export function hillHeight(x) {
  const u = THREE.MathUtils.smoothstep(x, 3.2, 10.5);
  return 3.2 * u + 0.18 * Math.sin(x * 1.3) * u;
}

/**
 * Places in Elm Street where a story can happen. The director gives each of tonight's
 * stories a free slot of the type it asks for. x/y/z is the slot's anchor; each story
 * arranges itself around it.
 */
export const SLOTS = [
  { id: 'hill', type: 'hill', x: 9.6, y: hillHeight(9.6), z: LAYOUT.hill.z + 0.25 },
  { id: 'park', type: 'park', x: 7.6, y: 0, z: 1.3 },
  { id: 'pav1', type: 'pavement', x: -8.0, y: 0, z: 1.5 },
  { id: 'pav2', type: 'pavement', x: -5.0, y: 0, z: 1.6 },
  { id: 'pav3', type: 'pavement', x: -1.8, y: 0, z: 1.7 },
  { id: 'pav4', type: 'pavement', x: 1.5, y: 0, z: 1.6 },
  { id: 'cafe', type: 'cafe', x: LAYOUT.table.x, y: 0, z: LAYOUT.table.z },
  { id: 'church', type: 'church', x: LAYOUT.church.x, y: 0, z: -4.3 },
  { id: 'tower', type: 'tower', x: LAYOUT.church.x, y: LAYOUT.church.h + 1.7, z: LAYOUT.church.z - 0.15 },
  { id: 'wall', type: 'wall', x: -5.7, y: LAYOUT.wall.h + 0.12, z: LAYOUT.wall.z + 0.12 },
  { id: 'roof', type: 'rooftop', x: -3.3, y: LAYOUT.apartment.h + 0.08, z: -5.05 },
  { id: 'kerb', type: 'kerb', x: 3.9, y: 0, z: -1.1 },
  { id: 'road', type: 'road', x: 0, y: 0, z: -0.45 },
  { id: 'win1', type: 'window', x: -4.05, y: 3.2, z: LAYOUT.apartment.z + 0.06 },
  { id: 'win2', type: 'window', x: -2.29, y: 4.15, z: LAYOUT.apartment.z + 0.06 },
  { id: 'site1', type: 'site', x: 2.6, y: 0, z: -7.1 },
  { id: 'site2', type: 'site', x: 2.6, y: 0, z: -7.1 },
  { id: 'horizon', type: 'horizon', x: 0, y: 0, z: -9.8 },
  { id: 'sky1', type: 'sky', x: 0, y: 8, z: -8.4 },
  { id: 'sky2', type: 'sky', x: 0, y: 8, z: -8.4 },
  { id: 'low', type: 'lowsky', x: 0, y: 3.4, z: 2.4 },
  { id: 'far', type: 'farsky', x: 2, y: 6.5, z: -7.0 },
];

const C = {
  ground: '#e6d2ab',
  street: '#a39a8f',
  pavement: '#ead9b6',
  grass: '#a9c77f',
  grassDark: '#8fb06d',
  hillNear: '#a3c27c',
  hillFar: '#9db59a',
  hillFarther: '#b7c4a6',
  church: '#efe3c8',
  roof: '#b5524a',
  roofPlum: '#6d5a7a',
  wood: '#6b4636',
  wall: '#cf8f6a',
  wallCap: '#e8b48f',
  apartment: '#a9c3d8',
  apartmentTrim: '#f2e8d6',
  cafe: '#f1dbb2',
  awning: '#d9644a',
  cream: '#fbf1dc',
  trunk: '#7a5340',
  leaves: '#7fae6a',
  leavesAlt: '#9cc276',
  lampPost: '#3d3a40',
  cloud: '#fff4e4',
  bird: '#3a3340',
};


function floorCard(shape, color, y) {
  const m = card(shape, color, { depth: 0.04 });
  m.rotation.x = -Math.PI / 2;
  m.position.y = y - 0.04;
  m.castShadow = false;
  return m;
}

export function windowGrid(parent, x0, y0, cols, rows, w, h, gapX, gapY, z, glow) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() < 0.75;
      const mat = lit ? glow : null;
      const win = card(roundRect(0, 0, w, h, 0.05), '#5f6f86', { depth: 0.02, material: mat });
      place(parent, win, x0 + c * (w + gapX), y0 + r * (h + gapY), z);
    }
  }
}

export function tree(parent, x, z, size = 1, alt = false) {
  const g = new THREE.Group();
  place(g, card(rect(-0.09 * size, 0, 0.18 * size, 1.3 * size), C.trunk), 0, 0, 0);
  place(g, card(circle(0, 0, 0.75 * size), alt ? C.leavesAlt : C.leaves), 0, 1.6 * size, 0.05);
  place(g, card(circle(0, 0, 0.45 * size), C.leavesAlt), 0.35 * size, 1.95 * size, 0.1);
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

export class Town {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const g = this.group;
    const windowGlow = glowMaterial('#6d7b92', '#ffc76b');
    this.windowGlow = windowGlow;
    const warmGlow = glowMaterial('#f6e3b0', '#ffb347');

    // ── Ground: back pavement, street, front pavement, park grass ──
    g.add(floorCard(rect(-26, -6, 52, 16), C.ground, 0));
    g.add(floorCard(rect(-26, -0.2, 52, 2.3), C.street, 0.012));
    g.add(floorCard(rect(-26, -6, 52, 5.8), C.pavement, 0.008));
    g.add(floorCard(roundRect(4.4, -4.6, 22, 3.6, 1.2), C.grass, 0.016));

    // ── Far hills, layered ──
    place(g, card(hill(-26, 26, (x) => 2.2 + 0.9 * Math.sin(x * 0.32 + 1) + 0.5 * Math.sin(x * 0.9)), C.hillFarther, { depth: 0.05 }), 0, 0, -10.4);
    place(g, card(hill(-26, 26, (x) => 1.3 + 0.7 * Math.sin(x * 0.45 + 2.4) + 0.3 * Math.sin(x * 1.4)), C.hillFar, { depth: 0.05 }), 0, 0, -9.2);

    // Background houses are rebuilt every evening by Facades.js.

    // ── Near hill on the right (kite kid stands on top) ──
    place(g, card(hill(2.4, 16, hillHeight, 60), C.hillNear, { depth: 0.06 }), 0, 0, LAYOUT.hill.z - 0.1);
    tree(g, 12.6, LAYOUT.hill.z - 0.3, 0.9, true).position.y = hillHeight(12.6) - 0.2;

    // ── Church ──
    {
      const c = new THREE.Group();
      const w = 3.2;
      const h = 3.3;
      place(c, card(rect(-w / 2, 0, w, h), C.church), 0, 0, 0);
      place(c, card(poly([[-w / 2 - 0.2, h], [w / 2 + 0.2, h], [0, h + 1.3]]), C.roof), 0, 0, 0.02);
      place(c, card(rect(-0.5, 0, 1.0, 2.0), C.church), 0, h + 0.7, -0.2);
      place(c, card(poly([[-0.62, 0], [0.62, 0], [0, 1.9]]), C.roofPlum), 0, h + 2.7, -0.18);
      place(c, card(rect(-0.04, 0, 0.08, 0.5), '#d9b04a'), 0, h + 4.55, -0.18);
      place(c, card(rect(-0.18, 0, 0.36, 0.08), '#d9b04a'), 0, h + 4.82, -0.17);
      place(c, card(circle(0, 0, 0.42), null, { depth: 0.02, material: warmGlow }), 0, h - 0.35, 0.04);
      place(c, card(roundRect(-0.5, 0, 1.0, 1.7, 0.5), C.wood), 0, 0, 0.04);
      place(c, card(roundRect(-1.3, 1.3, 0.42, 0.9, 0.2), null, { depth: 0.02, material: warmGlow }), 0, 0, 0.04);
      place(c, card(roundRect(0.88, 1.3, 0.42, 0.9, 0.2), null, { depth: 0.02, material: warmGlow }), 0, 0, 0.04);
      // steps
      for (let i = 0; i < 3; i++) {
        place(c, card(rect(-1.1 + i * 0.12, 0, 2.2 - i * 0.24, 0.12), C.cream, { depth: 0.9 - i * 0.25 }), 0, i * 0.12, 0.05);
      }
      c.position.set(LAYOUT.church.x, 0, LAYOUT.church.z);
      g.add(c);
    }

    // ── Garden wall with a tree behind it (the cat sits on top) ──
    {
      const { x0, x1, z, h } = LAYOUT.wall;
      tree(g, -6.6, z - 0.8, 1.15);
      place(g, card(rect(x0, 0, x1 - x0, h), C.wall, { depth: 0.3 }), 0, 0, z);
      place(g, card(rect(x0 - 0.08, h, x1 - x0 + 0.16, 0.12), C.wallCap, { depth: 0.42 }), 0, 0, z - 0.06);
      for (let row = 0; row < 4; row++) {
        for (let i = 0; i < 6; i++) {
          const bx = x0 + 0.1 + i * 0.44 + (row % 2) * 0.2;
          if (bx + 0.3 > x1) continue;
          place(g, card(rect(0, 0, 0.3, 0.12), '#bd7c5a', { depth: 0.01 }), bx, 0.2 + row * 0.32, z + 0.3);
        }
      }
    }

    // ── Apartment building with a rooftop (the couple stands up there) ──
    {
      const { x, z, w, h } = LAYOUT.apartment;
      const a = new THREE.Group();
      place(a, card(rect(-w / 2, 0, w, h), C.apartment), 0, 0, 0);
      place(a, card(rect(-w / 2 - 0.1, 0, w + 0.2, 0.12), C.apartmentTrim, { depth: 1.0 }), 0, h - 0.04, -0.4);
      place(a, card(rect(-w / 2 - 0.1, 0, w + 0.2, 0.22), C.apartmentTrim, { depth: 0.08 }), 0, h + 0.08, 0.5);
      windowGrid(a, -w / 2 + 0.35, 1.3, 3, 5, 0.5, 0.62, 0.38, 0.33, 0.05, windowGlow);
      place(a, card(roundRect(-0.38, 0, 0.76, 1.0, 0.1), C.wood), 0, 0, 0.05);
      // water tower + plant pot on the roof
      place(a, card(roundRect(0.55, 0, 0.6, 0.75, 0.12), '#9a7f6a'), 0, h + 0.08, -0.3);
      place(a, card(poly([[0.5, 0.75], [1.2, 0.75], [0.85, 1.05]]), C.roofPlum), 0, h + 0.08, -0.29);
      place(a, card(rect(-1.25, 0, 0.3, 0.25), '#c46a4a'), 0, h + 0.08, 0.2);
      place(a, card(circle(-1.1, 0.42, 0.2), C.leaves), 0, h + 0.08, 0.18);
      a.position.set(x, 0, z);
      g.add(a);
    }

    // ── Café with striped awning, and the birthday table out front ──
    {
      const { x, z } = LAYOUT.cafe;
      const c = new THREE.Group();
      place(c, card(rect(-1.6, 0, 3.2, 2.7), C.cafe), 0, 0, 0);
      place(c, card(roundRect(-1.3, 0.5, 1.5, 1.2, 0.08), null, { depth: 0.02, material: warmGlow }), 0, 0, 0.04);
      place(c, card(roundRect(0.55, 0, 0.7, 1.55, 0.08), C.wood), 0, 0, 0.04);
      place(c, card(rect(-1.75, 0, 3.5, 0.32), C.awning, { depth: 0.6 }), 0, 1.95, 0.05);
      for (let i = 0; i < 7; i++) {
        place(c, card(rect(0, 0, 0.25, 0.32), C.cream, { depth: 0.02 }), -1.7 + i * 0.5, 1.95, 0.66);
      }
      for (let i = 0; i < 7; i++) {
        place(c, card(circle(0, 0, 0.25), i % 2 ? C.awning : C.cream, { depth: 0.02 }), -1.5 + i * 0.5, 1.98, 0.64);
      }
      place(c, card(roundRect(-0.7, 0, 1.4, 0.4, 0.08), C.wood), 0, 2.35, 0.05);
      c.position.set(x, 0, z);
      g.add(c);

      const t = LAYOUT.table;
      place(g, card(rect(-0.06, 0, 0.12, 0.72), C.wood), t.x, 0, t.z);
      place(g, card(rect(-0.3, 0, 0.6, 0.06), C.wood), t.x, 0, t.z + 0.01);
      place(g, card(roundRect(-0.75, 0, 1.5, 0.1, 0.04), C.cream, { depth: 0.6 }), t.x, 0.72, t.z - 0.3);
    }

    // ── Trees and lamp posts ──
    tree(g, 1.9, -4.4, 1.0, true);
    tree(g, -11.6, 1.0, 1.25);
    tree(g, 12.0, 1.2, 1.1, true);
    const bulbs = glowMaterial('#fff1cf', '#ffcf7a');
    for (const lx of [-4.6, 5.1]) {
      place(g, card(rect(-0.05, 0, 0.1, 3.0), C.lampPost), lx, 0, 0.7);
      place(g, card(roundRect(-0.22, 0, 0.44, 0.38, 0.1), C.lampPost), lx, 3.0, 0.68);
      place(g, card(circle(0, 0, 0.15), null, { depth: 0.02, material: bulbs }), lx, 3.15, 0.74);
    }

    // ── String lights from the apartment to the tree over the café ──
    {
      const from = new THREE.Vector3(-1.75, 4.2, -3.3);
      const to = new THREE.Vector3(1.75, 3.5, -3.3);
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const p = from.clone().lerp(to, u);
        p.y -= Math.sin(u * Math.PI) * 0.55;
        pts.push(p);
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: '#3d3a40' }),
      );
      g.add(line);
      const colours = ['#ffd27a', '#ff9a7a', '#fff1cf', '#9fd3c7'];
      for (let i = 2; i < 24; i += 3) {
        const mat = glowMaterial(colours[(i / 3) % colours.length | 0], colours[(i / 3) % colours.length | 0]);
        const b = card(ellipse(0, -0.08, 0.07, 0.1), null, { depth: 0.03, material: mat });
        b.position.copy(pts[i]);
        g.add(b);
      }
    }

    // ── Foreground bushes framing the stage ──
    place(g, card(cloud(2.6, 0.9), C.grassDark), -10.6, 0, 3.4);
    place(g, card(cloud(2.2, 0.8), C.grassDark), 10.8, 0, 3.4);
    place(g, card(cloud(1.6, 0.55), C.grass), -8.4, 0, 3.5);

    // ── Clouds and birds (animated) ──
    this.clouds = [];
    for (const [x, y, s] of [[-8, 8.4, 1.3], [-1, 9.6, 1], [7, 8.8, 1.15], [13, 7.2, 0.9], [-13, 9.2, 1.05], [3, 7.6, 0.8]]) {
      const c = card(cloud(2.6 * s, 0.9 * s), C.cloud, { depth: 0.04 });
      c.castShadow = false;
      place(g, c, x, y, -10.9);
      this.clouds.push(c);
    }
    this.birds = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group();
      const wingL = card(poly([[0, 0], [-0.32, 0.1], [-0.3, 0.16]]), C.bird, { depth: 0.01, shadows: false });
      const wingR = card(poly([[0, 0], [0.32, 0.1], [0.3, 0.16]]), C.bird, { depth: 0.01, shadows: false });
      b.add(wingL, wingR);
      b.userData = { wingL, wingR, speed: 0.9 + i * 0.25, y: 7.4 + i * 0.6, phase: i * 2.1, offset: i * 6 };
      g.add(b);
      this.birds.push(b);
    }
  }

  /** Scatter the clouds and birds differently for a new evening. */
  reseed(evening) {
    const clouds = 2 + Math.floor(evening.range(0, this.clouds.length - 1));
    this.clouds.forEach((c, i) => {
      c.visible = i < clouds;
      c.position.x = evening.range(-15, 15);
      c.position.y = evening.range(7.2, 10.2);
    });
    const birds = 1 + Math.floor(evening.range(0, this.birds.length));
    this.birds.forEach((b, i) => {
      b.visible = i < birds;
      b.userData.offset = evening.range(0, 34);
      b.userData.y = evening.range(6.8, 9.2);
    });
  }

  /** Ambient motion: clouds drift, birds cross and flap. Runs on wall-clock time. */
  update(dt, time) {
    for (const c of this.clouds) {
      c.position.x += dt * 0.12;
      if (c.position.x > 17) c.position.x = -17;
    }
    for (const b of this.birds) {
      const d = b.userData;
      const x = ((time * d.speed + d.offset) % 34) - 17;
      b.position.set(x, d.y + Math.sin(time * 0.8 + d.phase) * 0.3, -8.8);
      const flap = Math.sin(time * 9 + d.phase);
      d.wingL.rotation.z = flap * 0.5;
      d.wingR.rotation.z = -flap * 0.5;
    }
  }
}
