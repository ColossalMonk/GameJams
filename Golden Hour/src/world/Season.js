import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { card, place, paperMaterial, paperTexture } from './paper.js';
import { rect, roundRect, poly, ellipse, circle } from './shapes.js';
import { bakeStatic } from './bake.js';
import { C, LAYOUT } from './Town.js';
import { sunCentre } from './Sky.js';
import { Evening } from '../game/Evening.js';

export const SEASONS = ['summer', 'autumn', 'winter', 'spring'];

/**
 * Town colours each season repaints, by their name in Town's C. These colours are used
 * only by the town, so their cached materials are recoloured in place (that reaches the
 * far hills wherever they're built). Watercolour ones are the far hills.
 */
const TINTS = {
  autumn: { grass: '#b9b86e', grassDark: '#9d9a58', hillNear: '#afb06c', hillFar: '#b3ad86', hillFarther: '#c9c0a0' },
  winter: { grass: '#c6cdbb', grassDark: '#adb7a3', hillNear: '#c3cbb9', hillFar: '#b5bfb6', hillFarther: '#d0d6cd' },
  spring: { grass: '#9fd477', grassDark: '#84c062', hillNear: '#9bcf73', hillFar: '#98c196', hillFarther: '#b4cfa6' },
};
const STOCK = { hillFar: 'watercolour', hillFarther: 'watercolour' };

/**
 * Tree canopies: [choices for C.leaves, choices for C.leavesAlt]. Those two greens are
 * also shirts, balloons and cushions, so the baked canopy meshes get a different material
 * instead of the shared one being recoloured.
 */
const CANOPY = {
  autumn: [['#d8703a', '#c4503c'], ['#e7a73e', '#de8a36']],
  winter: [['#8d9d88'], ['#a9b5a2']],
  spring: [['#f0a9c0', '#eb98b3'], ['#f8cdd9']],
};

const SNOW = '#f7f5f0';
const FOG = new THREE.Color('#f4e6cf');
const RAIN_END = 4.6;
const RAINBOW = { z: -11, radius: 7.2, band: 0.26, y: -0.6, offset: 12, colours: ['#e8806e', '#f2a65a', '#f5d67a', '#9cc98a', '#86b4d8', '#a892c8'] };

/** Falling cards. Counts are capacities: the most at once is snow + rain = 58. */
const FALL = {
  leaf: { count: 14, colours: ['#d8703a', '#c4503c', '#e7a73e', '#b8643a', '#e08a36'], speed: [0.45, 0.8], wind: 0.35, sway: 0.6, spin: 1.6, flutter: 1.2, size: [0.8, 1.35], z: [-6, 3.5] },
  snow: { count: 32, colours: ['#ffffff', '#f2f5fa'], speed: [0.35, 0.6], wind: 0.1, sway: 0.25, spin: 0, flutter: 0, size: [0.6, 1.3], z: [-8, 4] },
  petal: { count: 14, colours: ['#f6b8c8', '#f9d3dd', '#f2a0b8', '#fff0f3'], speed: [0.35, 0.55], wind: 0.25, sway: 0.5, spin: 2.2, flutter: 1.4, size: [0.8, 1.2], z: [-6, 3.5] },
  rain: { count: 26, colours: ['#e4edf5'], speed: [10, 12.5], wind: -1.3, sway: 0, spin: 0, flutter: 0, size: [0.85, 1.15], z: [-7, 3], until: RAIN_END },
};
const SEASON_FALL = { autumn: 'leaf', winter: 'snow', spring: 'petal' };

const rnd = (a, b) => a + (b - a) * Math.random();

function leafShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.12);
  s.quadraticCurveTo(0.1, 0, 0, 0.12);
  s.quadraticCurveTo(-0.1, 0, 0, -0.12);
  return s;
}

/** A pool of identical falling cards, drawn as one instanced mesh. */
class Fall {
  constructor(scene, def, shape, material) {
    this.def = def;
    this.mesh = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape, 8), material, def.count);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.cards = Array.from({ length: def.count }, () => ({ pos: new THREE.Vector3(), v: 0, phase: 0, spin: 0, rz: 0, s: 1, alive: false }));
    scene.add(this.mesh);
  }

  start() {
    const colour = new THREE.Color();
    this.cards.forEach((c, i) => {
      this.spawn(c, true);
      this.mesh.setColorAt(i, colour.set(this.def.colours[i % this.def.colours.length]));
    });
    this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = true;
  }

  stop() {
    this.mesh.visible = false;
  }

  /** anywhere: scatter over the whole height (start of an evening) instead of just above the frame. */
  spawn(c, anywhere = false) {
    const d = this.def;
    c.pos.set(rnd(-16, 16), anywhere ? rnd(-0.3, 12) : rnd(10.5, 12.5), rnd(d.z[0], d.z[1]));
    c.v = rnd(d.speed[0], d.speed[1]);
    c.phase = rnd(0, Math.PI * 2);
    c.spin = rnd(-1, 1) * d.spin;
    c.rz = rnd(0, Math.PI * 2);
    c.s = rnd(d.size[0], d.size[1]);
    c.alive = true;
  }

  update(t, dt, time, dummy) {
    if (!this.mesh.visible) return;
    const d = this.def;
    this.cards.forEach((c, i) => {
      const raining = d.until == null || t < d.until;
      if (!c.alive && raining) this.spawn(c);
      if (c.alive) {
        c.pos.y -= c.v * dt;
        c.pos.x += (d.wind + Math.sin(time * 1.3 + c.phase) * d.sway) * dt;
        c.rz += c.spin * dt;
        if (c.pos.x > 16.5) c.pos.x -= 33;
        if (c.pos.x < -16.5) c.pos.x += 33;
        if (c.pos.y < -0.3) {
          if (raining) this.spawn(c);
          else c.alive = false;
        }
      }
      dummy.position.copy(c.pos);
      if (d.until != null) dummy.rotation.set(0, 0, Math.atan2(d.wind, c.v));
      else dummy.rotation.set(Math.sin(time * 2.1 + c.phase) * d.flutter * 0.6, Math.cos(time * 1.7 + c.phase) * d.flutter, c.rz);
      dummy.scale.setScalar(c.alive ? c.s : 0);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * Tonight's season and weather. Both are drawn from the evening, so the same number always
 * looks the same. One instance serves every evening: apply() undoes the last one first.
 *
 * - summer: the town as built. autumn: orange and gold trees, olive grass, falling leaves,
 *   a few pumpkins. winter: grey-green grass, snow on the roofs and wall, snowfall, scarves.
 *   spring: blossom trees, bright grass, drifting petals.
 * - weather: clear, fog that lifts by t ≈ 6, or rain until t ≈ 5 then a rainbow until t ≈ 12.
 */
export class Season {
  constructor(scene, { town, sky = null, camera = null } = {}) {
    this.scene = scene;
    this.town = town;
    this.sky = sky;
    this.camera = camera;
    this.season = 'summer';
    this.weather = 'clear';
    this.time = 0;
    this.dummy = new THREE.Object3D();

    // Fog stays installed and is parked far away when it's not foggy: switching scene.fog
    // on and off would recompile every material.
    this.fog = new THREE.Fog(FOG.clone(), 1e4, 2e4);
    scene.fog = this.fog;

    this.tinted = Object.keys(TINTS.autumn).map((name) => {
      const material = paperMaterial(C[name], STOCK[name]);
      return { name, material, original: material.color.clone() };
    });
    this.canopies = [paperMaterial(C.leaves), paperMaterial(C.leavesAlt)];
    this.swapped = [];
    this.decor = null;

    const fallMaterial = (opts) => new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 1, side: THREE.DoubleSide, ...opts });
    this.falls = {
      leaf: new Fall(scene, FALL.leaf, leafShape(), fallMaterial()),
      snow: new Fall(scene, FALL.snow, circle(0, 0, 0.05), fallMaterial()),
      petal: new Fall(scene, FALL.petal, ellipse(0, 0, 0.06, 0.04), fallMaterial()),
      rain: new Fall(scene, FALL.rain, rect(-0.007, -0.2, 0.014, 0.4), new THREE.MeshBasicMaterial({ map: paperTexture(), transparent: true, opacity: 0.55, depthWrite: false })),
    };

    this.rainbow = this.buildRainbow();
    scene.add(this.rainbow);
  }

  /** Pick and apply tonight's season and weather from the seeded evening. Returns { season, weather }. */
  apply(evening) {
    this.reset();
    // A stream of its own, so adding seasons doesn't change which stories an evening has.
    const e = new Evening(evening.number + 0.5);
    this.season = e.pick(SEASONS);
    const w = e.random();
    this.weather = w < 0.6 ? 'clear' : w < 0.85 ? 'fog' : 'rain';
    evening.season = this.season;
    evening.weather = this.weather;

    if (this.season !== 'summer') {
      const tints = TINTS[this.season];
      for (const { name, material } of this.tinted) material.color.set(tints[name]);
      const [leaves, leavesAlt] = CANOPY[this.season];
      const swap = new Map([[this.canopies[0], paperMaterial(e.pick(leaves))], [this.canopies[1], paperMaterial(e.pick(leavesAlt))]]);
      this.town.group.traverse((o) => {
        if (o.isMesh && swap.has(o.material)) {
          this.swapped.push([o, o.material]);
          o.material = swap.get(o.material);
        }
      });
      this.falls[SEASON_FALL[this.season]].start();
    }

    const decor = new THREE.Group();
    if (this.season === 'autumn') this.pumpkins(decor, e);
    if (this.season === 'winter') this.snowCaps(decor);
    if (decor.children.length) {
      // Built detached so the bake ignores the town's pop-up scale.
      bakeStatic(decor);
      this.town.group.add(decor);
      this.decor = decor;
    }

    if (this.weather === 'rain') this.falls.rain.start();
    this.update(0, 0);
    return { season: this.season, weather: this.weather };
  }

  /** Called every frame with run time t (0–20) and wall-clock dt. */
  update(t, dt) {
    this.time += dt;
    for (const f of Object.values(this.falls)) f.update(t, dt, this.time, this.dummy);

    const k = this.weather === 'fog' ? 1 - THREE.MathUtils.smoothstep(t, 0.4, 6) : 0;
    if (k > 0.001) {
      const d = this.camera ? this.camera.position.z : 26;
      this.fog.near = d - 3;
      this.fog.far = d - 3 + 22 / k;
      this.fog.color.copy(FOG);
      if (this.sky) this.fog.color.lerp(this.sky.state.horizon, 0.5);
    } else {
      this.fog.near = 1e4;
      this.fog.far = 2e4;
    }

    if (this.weather === 'rain') {
      // Opposite side of the sky from tonight's sun, so the two never overlap.
      const sx = sunCentre(0).x;
      this.rainbow.position.x = sx > 1 ? sx - RAINBOW.offset : sx + RAINBOW.offset;
      const a = THREE.MathUtils.smoothstep(t, 5, 7) * (1 - THREE.MathUtils.smoothstep(t, 10, 12));
      this.rainbow.material.opacity = 0.42 * a;
      this.rainbow.visible = a > 0.001;
    } else {
      this.rainbow.visible = false;
    }
  }

  /** Back to the town as built: summer colours, no decorations, nothing falling, no fog. */
  reset() {
    for (const { material, original } of this.tinted) material.color.copy(original);
    for (const [mesh, material] of this.swapped) mesh.material = material;
    this.swapped = [];
    if (this.decor) {
      this.decor.parent?.remove(this.decor);
      this.decor.traverse((o) => o.geometry?.dispose());
      this.decor = null;
    }
    for (const f of Object.values(this.falls)) f.stop();
    this.rainbow.visible = false;
    this.fog.near = 1e4;
    this.fog.far = 2e4;
    this.season = 'summer';
    this.weather = 'clear';
  }

  /** Two or three paper pumpkins on doorsteps and the ends of the pavement, clear of story slots. */
  pumpkins(group, e) {
    const spots = [
      [1.3, -3.35],
      [-10.85, -4.85],
      [-11.05, 2.3],
      [11.4, 1.95],
      [11.3, -3.0],
    ];
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(e.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    const n = e.chance(0.5) ? 3 : 2;
    for (const [x, z] of spots.slice(0, n)) {
      const p = new THREE.Group();
      place(p, card(ellipse(-0.1, 0.12, 0.1, 0.12), '#d9682e', { depth: 0.05 }), 0, 0, 0);
      place(p, card(ellipse(0.1, 0.12, 0.1, 0.12), '#d9682e', { depth: 0.05 }), 0, 0, 0);
      place(p, card(rect(-0.018, 0.2, 0.036, 0.1), '#6b6a34', { depth: 0.03 }), 0, 0, 0.02);
      place(p, card(ellipse(0, 0.125, 0.11, 0.125), '#ec8a3a', { depth: 0.05 }), 0, 0, 0.04);
      place(p, card(ellipse(0.06, 0.28, 0.045, 0.02, 0.5), '#7f9a4a', { depth: 0.01 }), 0, 0, 0.03);
      p.position.set(x, 0, z);
      p.scale.setScalar(e.range(1.0, 1.45));
      group.add(p);
    }
  }

  /** Thin white cards on the church, apartment, café, garden wall and lamps. */
  snowCaps(group) {
    const snow = (shape, depth, x, y, z) => {
      const m = card(shape, SNOW, { depth });
      m.castShadow = false;
      return place(group, m, x, y, z);
    };
    const ch = LAYOUT.church;
    const h = ch.h;
    snow(poly([[0, h + 1.33], [-0.8, h + 0.735], [-0.6, h + 0.77], [-0.4, h + 0.82], [-0.15, h + 0.755], [0.1, h + 0.81], [0.32, h + 0.745], [0.55, h + 0.8], [0.8, h + 0.735]]), 0.02, ch.x, 0, ch.z + 0.065);
    snow(poly([[0, h + 4.62], [-0.27, h + 3.83], [-0.08, h + 3.86], [0.1, h + 3.9], [0.27, h + 3.83]]), 0.02, ch.x, 0, ch.z - 0.135);

    const ap = LAYOUT.apartment;
    snow(rect(-ap.w / 2 - 0.1, 0, ap.w + 0.2, 0.035), 0.98, ap.x, ap.h + 0.08, ap.z - 0.39);
    snow(rect(-ap.w / 2 - 0.13, 0, ap.w + 0.26, 0.05), 0.1, ap.x, ap.h + 0.3, ap.z + 0.49);
    snow(poly([[0.62, 0.85], [0.85, 1.07], [1.08, 0.85]]), 0.02, ap.x, ap.h + 0.08, ap.z - 0.24);

    const cf = LAYOUT.cafe;
    snow(rect(-1.66, 0, 3.32, 0.07), 0.3, cf.x, 2.7, cf.z - 0.26);
    snow(rect(-1.75, 0, 3.5, 0.035), 0.6, cf.x, 2.27, cf.z + 0.05);

    const wl = LAYOUT.wall;
    snow(rect(wl.x0 - 0.1, 0, wl.x1 - wl.x0 + 0.2, 0.05), 0.46, 0, wl.h + 0.12, wl.z - 0.08);

    // The two lamp posts (Town.js puts them at x = -4.6 and 5.1).
    for (const lx of [-4.6, 5.1]) snow(roundRect(-0.25, 0, 0.5, 0.07, 0.035), 0.1, lx, 3.37, 0.65);
  }

  /** A paper rainbow: six bands merged into one mesh, faded in and out as a whole. */
  buildRainbow() {
    const geos = RAINBOW.colours.map((hex, i) => {
      const outer = RAINBOW.radius - i * RAINBOW.band;
      const inner = outer - RAINBOW.band;
      const s = new THREE.Shape();
      s.absarc(0, 0, outer, 0, Math.PI, false);
      s.lineTo(-inner, 0);
      s.absarc(0, 0, inner, Math.PI, 0, true);
      s.closePath();
      const geo = new THREE.ShapeGeometry(s, 48);
      const colour = new THREE.Color(hex);
      const colours = new Float32Array(geo.attributes.position.count * 3);
      for (let v = 0; v < colours.length; v += 3) colour.toArray(colours, v);
      geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      return geo;
    });
    const mesh = new THREE.Mesh(
      mergeGeometries(geos),
      new THREE.MeshBasicMaterial({ map: paperTexture(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    );
    for (const g of geos) g.dispose();
    mesh.position.set(0, RAINBOW.y, RAINBOW.z);
    mesh.visible = false;
    return mesh;
  }
}
