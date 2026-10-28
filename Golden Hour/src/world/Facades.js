import * as THREE from 'three';
import { card, place } from './paper.js';
import { rect, roundRect, poly } from './shapes.js';
import { windowGrid } from './Town.js';

const WALLS = ['#e9b98f', '#c9a4c4', '#f0d58c', '#d98c6b', '#a8c8b0', '#e7c7a9', '#b9cde0', '#f2c8b8', '#d6c08a'];
const ROOFS = ['#b5524a', '#6d5a7a', '#8a5a4a', '#4f6a7a', '#a8643a'];
const SIGNS = ['#d9644a', '#2f6f6a', '#3f6f8f', '#9a6fb0'];
const STEEL = '#9a6a52';
const CRANE = '#f2c14e';

const ROW_Z = -7.4;
const ROW_X = [-2.2, 6.4];
/** Building-site footprint inside the row. */
export const SITE = { x0: 1.0, x1: 4.6, z: -7.1, frameTop: 3.6, beams: [1.2, 2.4, 3.6], posts: [1.3, 2.5, 3.7] };

/**
 * The row of small houses behind the café, rebuilt every evening: widths, heights, wall
 * colours, roof shapes, windows, chimneys and shop signs are all drawn from the evening.
 * When tonight has a building-site story, part of the row becomes a steel frame with a
 * tower crane over it.
 */
export class Facades {
  constructor(scene, windowGlow) {
    this.scene = scene;
    this.windowGlow = windowGlow;
    this.group = null;
    this.site = null;
  }

  build(evening, { site = false } = {}) {
    this.dispose();
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.site = null;

    let x = ROW_X[0];
    while (x < ROW_X[1]) {
      const w = evening.range(1.2, 1.9);
      const centre = x + w / 2;
      if (site && centre > SITE.x0 - 0.3 && centre < SITE.x1 + 0.3) {
        x = SITE.x1 + 0.3;
        continue;
      }
      this.house(evening, centre, w, evening.range(2.0, 3.4));
      x += w + evening.range(0.05, 0.3);
    }
    if (site) this.site = this.buildSite();
  }

  house(e, x, w, h) {
    const g = new THREE.Group();
    const wall = e.pick(WALLS);
    const roof = e.pick(ROOFS);
    place(g, card(rect(-w / 2, 0, w, h), wall), 0, 0, 0);
    const roofType = e.pick(['gable', 'gable', 'flat', 'step']);
    if (roofType === 'gable') {
      place(g, card(poly([[-w / 2 - 0.15, h], [w / 2 + 0.15, h], [0, h + w * e.range(0.32, 0.5)]]), roof), 0, 0, 0.02);
    } else if (roofType === 'flat') {
      place(g, card(rect(-w / 2 - 0.08, h, w + 0.16, 0.16), roof), 0, 0, 0.02);
    } else {
      const s = w / 6;
      place(g, card(poly([[-w / 2, h], [w / 2, h], [w / 2, h + s], [w / 2 - s, h + s], [w / 2 - s, h + 2 * s], [-w / 2 + s, h + 2 * s], [-w / 2 + s, h + s], [-w / 2, h + s]]), wall), 0, 0, -0.01);
    }
    if (e.chance(0.4)) place(g, card(rect(-0.1, 0, 0.2, 0.5), roof), w * e.range(-0.3, 0.3), h + 0.05, -0.03);
    const cols = w > 1.55 ? 2 : 1;
    const rows = h > 2.8 ? 2 : 1;
    const ww = 0.36;
    const gap = cols === 2 ? w - 0.6 - 2 * ww : 0;
    windowGrid(g, cols === 2 ? -w / 2 + 0.3 : -ww / 2, h * (rows === 2 ? 0.3 : 0.45), cols, rows, ww, 0.44, gap, 0.4, 0.05, this.windowGlow);
    if (e.chance(0.3)) place(g, card(roundRect(-w * 0.35, 0, w * 0.7, 0.26, 0.05), e.pick(SIGNS)), 0, h * 0.18, 0.05);
    g.position.set(x, 0, ROW_Z + e.range(-0.15, 0.15));
    this.group.add(g);
  }

  /** Steel frame plus a tower crane. Returns handles the site stories animate. */
  buildSite() {
    const g = new THREE.Group();
    g.position.z = SITE.z;
    this.group.add(g);
    for (const px of SITE.posts) place(g, card(rect(-0.07, 0, 0.14, SITE.frameTop), STEEL, { depth: 0.08 }), px, 0, 0);
    for (const by of SITE.beams) place(g, card(rect(SITE.x0, -0.12, SITE.x1 - SITE.x0 - 0.6, 0.14), STEEL, { depth: 0.1 }), 0, by, 0.05);
    for (let i = 0; i < 2; i++) {
      place(g, card(poly([[SITE.posts[i], SITE.beams[0]], [SITE.posts[i] + 0.08, SITE.beams[0]], [SITE.posts[i + 1], SITE.beams[1] - 0.1], [SITE.posts[i + 1] - 0.08, SITE.beams[1] - 0.1]]), '#7d5a48', { depth: 0.02 }), 0, 0, 0.03);
    }
    // Hoarding along the bottom
    place(g, card(rect(SITE.x0 - 0.2, 0, SITE.x1 - SITE.x0 + 0.2, 0.7), '#c9a46a'), 0, 0, 0.4);
    for (let i = 0; i < 4; i++) place(g, card(rect(0, 0, 0.5, 0.08), '#e2574c', { depth: 0.01 }), SITE.x0 + i * 0.9, 0.36, 0.44);

    // Tower crane: mast, jib, counter-jib, cab, trolley + hook
    const mastX = 4.4;
    const top = 8.0;
    const crane = new THREE.Group();
    g.add(crane);
    place(crane, card(rect(-0.14, 0, 0.28, top), CRANE, { depth: 0.06 }), mastX, 0, -0.25);
    for (let y = 0.4; y < top - 0.3; y += 0.6) {
      place(crane, card(poly([[-0.14, 0], [-0.08, 0], [0.14, 0.5], [0.08, 0.5]]), '#c9952e', { depth: 0.01 }), mastX, y, -0.18);
    }
    place(crane, card(rect(-3.9, 0, 5.9, 0.16), CRANE, { depth: 0.06 }), mastX, top, -0.25);
    place(crane, card(rect(1.3, -0.4, 0.6, 0.4), '#6d6a70'), mastX, top, -0.24);
    place(crane, card(roundRect(-0.3, -0.5, 0.45, 0.42, 0.06), '#e9e1d4'), mastX, top, -0.2);
    place(crane, card(poly([[-0.05, 0.16], [0.05, 0.16], [0, 1.0]]), CRANE, { depth: 0.03 }), mastX, top, -0.26);

    const trolley = new THREE.Group();
    place(trolley, card(rect(-0.12, -0.12, 0.24, 0.12), '#3d3a40'), 0, 0, 0);
    crane.add(trolley);
    const hook = new THREE.Group();
    place(hook, card(roundRect(-0.08, -0.12, 0.16, 0.16, 0.04), '#3d3a40'), 0, 0, 0);
    crane.add(hook);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#3d3a40' }));
    line.frustumCulled = false;
    crane.add(line);

    const site = {
      group: g,
      z: SITE.z,
      frameTop: SITE.frameTop,
      posts: SITE.posts,
      beams: SITE.beams,
      jib: { x0: mastX - 3.9, x1: mastX - 0.3, y: top },
      hook,
      /** Move the trolley along the jib to x and lower the hook to y (site-local coordinates). */
      setHook(hx, hy) {
        trolley.position.set(hx, top, -0.22);
        hook.position.set(hx, hy, -0.2);
        const arr = lineGeo.attributes.position.array;
        arr[0] = hx; arr[1] = top - 0.1; arr[2] = -0.21;
        arr[3] = hx; arr[4] = hy; arr[5] = -0.21;
        lineGeo.attributes.position.needsUpdate = true;
      },
    };
    site.setHook(2.0, 6.0);
    return site;
  }

  dispose() {
    if (!this.group) return;
    this.scene.remove(this.group);
    this.group.traverse((o) => o.geometry?.dispose());
    this.group = null;
  }
}
