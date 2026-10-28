import * as THREE from 'three';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse, poly, limb } from '../../world/shapes.js';

/** Props for story batch A: banner plane, toy balloon, belfry, pigeons, viaduct, train, laundry. */

const INK = '#2f2530';
const SKIN = ['#f1c7a3', '#e0a77e', '#c68a5e', '#a8714e', '#8a5a3e'];

/** A doorway-style arch, bottom centre at the origin. */
export function arch(w, h) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.closePath();
  return s;
}

/** A little paper propeller plane, nose pointing +x. Flip with group.scale.x = -1. */
export function makeTowPlane(colour = '#e2574c') {
  const group = new THREE.Group();
  place(group, card(poly([[-0.55, 0.04], [-0.4, 0.04], [-0.52, 0.3], [-0.6, 0.3]]), '#f2c14e'), 0, 0, -0.01);
  place(group, card(roundRect(-0.6, -0.08, 1.0, 0.2, 0.09), colour), 0, 0, 0);
  place(group, card(circle(0.12, 0.14, 0.075), SKIN[1]), 0, 0, -0.02);
  place(group, card(roundRect(0.0, 0.08, 0.2, 0.1, 0.04), '#d6e8f2', { depth: 0.01 }), 0, 0, 0.04);
  place(group, card(ellipse(0.05, -0.02, 0.3, 0.065), '#f2c14e', { depth: 0.02 }), 0, 0, 0.05);
  place(group, card(circle(0.42, 0.02, 0.05), '#3d3a40', { depth: 0.02 }), 0, 0, 0.04);
  const prop = card(ellipse(0, 0, 0.03, 0.2), '#3d3a40', { depth: 0.01, shadows: false });
  place(group, prop, 0.45, 0.02, 0.07);
  return { group, prop, tail: new THREE.Vector3(-0.6, 0.0, 0.02) };
}

/** A banner w × h with text painted on. Bends along x, so it is a plain plane mesh, not a card. */
export function makeBanner(text, w, h, ink) {
  const geo = new THREE.PlaneGeometry(w, h, 16, 1);
  const mat = new THREE.MeshStandardMaterial({ color: '#fbf1dc', roughness: 1, side: THREE.DoubleSide });
  // Headless (the Node self-test) has no canvas: a plain banner.
  if (typeof document !== 'undefined') {
    const cw = 1024;
    const ch = Math.max(64, Math.round((cw * h) / w));
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d');
    g.fillStyle = '#fbf1dc';
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = ink;
    g.fillRect(0, 0, cw, ch * 0.07);
    g.fillRect(0, ch * 0.93, cw, ch * 0.07);
    let size = ch * 0.66;
    const font = (s) => `900 ${s}px "Arial Black", "Trebuchet MS", sans-serif`;
    g.font = font(size);
    const fit = (cw * 0.9) / g.measureText(text).width;
    if (fit < 1) g.font = font((size *= fit));
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch * 0.53);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    mat.map = tex;
    mat.color.set('#ffffff');
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  const rest = Float32Array.from(geo.attributes.position.array);
  /** Ripple the cloth; from = the x of the edge that is held (−w/2 or w/2), amp grows away from it. */
  const ripple = (time, amp, from) => {
    const arr = geo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = rest[i];
      const k = Math.abs(x - from) / w;
      arr[i + 1] = rest[i + 1] + Math.sin(time * 7 + x * 2.6) * amp * k * 0.6;
      arr[i + 2] = Math.sin(time * 6 + x * 3.1) * amp * (0.3 + k);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { mesh, ripple };
}

/** A toy balloon; the knot is at (0, −0.36). */
export function makeToyBalloon(colour) {
  const group = new THREE.Group();
  place(group, card(ellipse(0, 0, 0.26, 0.32), colour), 0, 0, 0);
  place(group, card(ellipse(-0.09, 0.11, 0.045, 0.09, 0.4), '#fff6ea', { depth: 0.01, shadows: false }), 0, 0, 0.04);
  place(group, card(poly([[-0.05, -0.37], [0.05, -0.37], [0, -0.3]]), colour), 0, 0, 0);
  return { group, knot: new THREE.Vector3(0, -0.36, 0.02) };
}

/** A side-on pigeon facing +x, about 0.4 long. Flip with group.scale.x = -1. */
export function makePigeon() {
  const group = new THREE.Group();
  place(group, card(poly([[-0.1, 0.03], [-0.27, 0.07], [-0.27, -0.03], [-0.1, -0.04]]), '#7d8698', { depth: 0.02 }), 0, 0, -0.01);
  place(group, card(ellipse(0, 0, 0.16, 0.09), '#9aa3b5', { depth: 0.02 }), 0, 0, 0);
  place(group, card(circle(0.14, 0.08, 0.07), '#8a93a6', { depth: 0.02 }), 0, 0, 0.01);
  place(group, card(poly([[0.2, 0.1], [0.27, 0.075], [0.2, 0.06]]), '#e2a24a', { depth: 0.01 }), 0, 0, 0.01);
  place(group, card(circle(0.165, 0.1, 0.016), INK, { depth: 0.01, shadows: false }), 0, 0, 0.035);
  const wing = new THREE.Group();
  wing.position.set(0.03, 0.03, 0.035);
  place(wing, card(ellipse(-0.07, 0, 0.12, 0.05, 0.2), '#c9d0dc', { depth: 0.01 }), 0, 0, 0);
  group.add(wing);
  return { group, wing };
}

/**
 * A belfry for the church tower front: arched opening, sill, yoke and a bell on a pivot.
 * Origin at the middle of the opening. bell.rotation.z swings it; rope is where the rope
 * leaves the bell wheel (bell-local).
 */
export function makeBelfry() {
  const group = new THREE.Group();
  place(group, card(arch(0.84, 1.08), '#d9c8a6', { depth: 0.01 }), 0, -0.42, 0);
  place(group, card(arch(0.66, 0.96), '#4a3a44', { depth: 0.01 }), 0, -0.38, 0.012);
  place(group, card(rect(-0.47, -0.5, 0.94, 0.09), '#cbb894', { depth: 0.14 }), 0, 0, 0);
  place(group, card(rect(-0.33, -0.03, 0.66, 0.06), '#6b4636', { depth: 0.02 }), 0, 0.36, 0.03);
  const bell = new THREE.Group();
  bell.position.set(0, 0.34, 0.06);
  group.add(bell);
  place(bell, card(circle(0, 0, 0.12), '#6b4636', { depth: 0.02 }), 0, 0, -0.02);
  const clapper = new THREE.Group();
  clapper.position.set(0, -0.08, -0.005);
  place(clapper, card(limb(0.03, 0.34), '#5a4a3a', { depth: 0.01 }), 0, 0, 0);
  place(clapper, card(circle(0, -0.36, 0.045), '#5a4a3a', { depth: 0.01 }), 0, 0, 0);
  bell.add(clapper);
  const s = new THREE.Shape();
  s.moveTo(-0.09, -0.05);
  s.bezierCurveTo(-0.18, -0.06, -0.13, -0.3, -0.23, -0.42);
  s.lineTo(0.23, -0.42);
  s.bezierCurveTo(0.13, -0.3, 0.18, -0.06, 0.09, -0.05);
  s.closePath();
  place(bell, card(s, '#d9a84a', { depth: 0.03 }), 0, 0, 0);
  place(bell, card(rect(-0.23, -0.42, 0.46, 0.05), '#b0843a', { depth: 0.01 }), 0, 0, 0.032);
  place(bell, card(rect(-0.04, -0.07, 0.08, 0.08), '#b0843a', { depth: 0.01 }), 0, 0, 0.032);
  return { group, bell, clapper, rope: new THREE.Vector3(-0.12, 0, 0.2) };
}

/** Stone viaduct from x0 to x1 with its deck top at `top`, arches cut out of the bottom. */
export function makeViaduct(x0, x1, top, { span = 2.4, pier = 0.5, stone = '#c9a27e', trim = '#a87e62' } = {}) {
  const group = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(x0, top);
  s.lineTo(x1, top);
  s.lineTo(x1, 0);
  const r = span / 2;
  const spring = top - 0.55 - r;
  let x = x1;
  while (x - pier - span > x0 + pier) {
    x -= pier;
    s.lineTo(x, 0);
    s.lineTo(x, spring);
    s.absarc(x - r, spring, r, 0, Math.PI, false);
    s.lineTo(x - span, 0);
    x -= span;
  }
  s.lineTo(x0, 0);
  s.closePath();
  place(group, card(s, stone, { depth: 0.08, shadows: false }), 0, 0, 0);
  place(group, card(rect(x0, top, x1 - x0, 0.1), trim, { depth: 0.02, shadows: false }), 0, 0, 0.08);
  place(group, card(rect(x0, top - 0.24, x1 - x0, 0.06), trim, { depth: 0.01, shadows: false }), 0, 0, 0.08);
  return group;
}

/**
 * A little steam train facing +x: three carriages then the engine. Centred on x = 0, wheels
 * on y = 0. Passengers' heads and arms are returned so they can wave and lean out.
 */
export function makeTrain(evening, { engine = '#b5524a', cars = ['#5f8fb5', '#f2c14e', '#9fd3c7'] } = {}) {
  const group = new THREE.Group();
  const carW = 1.3;
  const gap = 0.12;
  const total = 3 * (carW + gap) + 1.4;
  const left = -total / 2;
  const passengers = [];
  for (let i = 0; i < 3; i++) {
    const x = left + i * (carW + gap);
    place(group, card(roundRect(x, 0.1, carW, 0.52, 0.06), cars[i]), 0, 0, 0);
    place(group, card(roundRect(x - 0.05, 0.6, carW + 0.1, 0.09, 0.04), '#5a4a5c', { depth: 0.02 }), 0, 0, 0.01);
    for (const wx of [0.3, 1.0]) place(group, card(circle(x + wx, 0.08, 0.085), '#2f2a30', { depth: 0.02 }), 0, 0, 0.05);
    if (i > 0) place(group, card(rect(x - gap - 0.02, 0.18, gap + 0.04, 0.05), '#3d3a40', { depth: 0.01 }), 0, 0, -0.01);
    for (let j = 0; j < 3; j++) {
      const wx = x + 0.13 + j * 0.39;
      place(group, card(roundRect(wx, 0.3, 0.27, 0.22, 0.03), '#fff1cf', { depth: 0.01 }), 0, 0, 0.04);
      if (!evening.chance(0.7)) continue;
      const head = place(group, card(circle(0, 0, 0.075), evening.pick(SKIN), { depth: 0.01 }), wx + 0.135, 0.4, 0.06);
      const arm = new THREE.Group();
      arm.position.set(wx + 0.22, 0.34, 0.075);
      arm.add(card(limb(0.045, 0.22), evening.pick(cars.concat(engine)), { depth: 0.01 }));
      group.add(arm);
      passengers.push({ head, arm, phase: evening.range(0, 6) });
    }
  }
  const ex = left + 3 * (carW + gap);
  place(group, card(rect(ex, 0.12, 0.48, 0.66), engine), 0, 0, 0);
  place(group, card(roundRect(ex - 0.05, 0.76, 0.58, 0.08, 0.03), '#3d3a40', { depth: 0.02 }), 0, 0, 0.01);
  place(group, card(roundRect(ex + 0.1, 0.44, 0.26, 0.2, 0.03), '#fff1cf', { depth: 0.01 }), 0, 0, 0.04);
  const driver = place(group, card(circle(0, 0, 0.075), evening.pick(SKIN), { depth: 0.01 }), ex + 0.23, 0.53, 0.06);
  place(group, card(roundRect(ex + 0.4, 0.14, 0.9, 0.4, 0.17), '#3d3a40'), 0, 0, -0.01);
  place(group, card(rect(ex + 0.62, 0.14, 0.06, 0.4), engine, { depth: 0.01 }), 0, 0, 0.03);
  place(group, card(rect(ex + 1.08, 0.5, 0.13, 0.24), '#3d3a40'), 0, 0, -0.01);
  place(group, card(rect(ex + 1.04, 0.72, 0.21, 0.06), engine, { depth: 0.02 }), 0, 0, 0);
  place(group, card(poly([[ex + 1.3, 0.3], [ex + 1.3, 0.08], [ex + 1.48, 0.0]]), '#b0843a', { depth: 0.02 }), 0, 0, 0.02);
  for (const wx of [0.25, 0.68, 1.08]) place(group, card(circle(ex + wx, 0.1, wx < 0.5 ? 0.12 : 0.1), engine, { depth: 0.02 }), 0, 0, 0.05);
  return { group, passengers, driver, length: total, chimney: new THREE.Vector3(ex + 1.15, 0.82, 0.05) };
}

/** A sheet with a wavy hem, hanging from its top centre. eyes are hidden until it goes ghost. */
export function makeSheet(colour, w = 0.5, h = 0.66) {
  const group = new THREE.Group();
  const pts = [[-w / 2, 0], [w / 2, 0], [w / 2, -h]];
  const waves = 3;
  for (let i = 1; i <= waves * 2; i++) {
    const x = w / 2 - (w * i) / (waves * 2);
    pts.push([x, -h + (i % 2 ? 0.07 : 0)]);
  }
  place(group, card(poly(pts), colour, { depth: 0.015 }), 0, 0, 0);
  for (const px of [-w / 2 + 0.06, w / 2 - 0.06]) place(group, card(rect(-0.015, -0.05, 0.03, 0.09), '#c46a4a', { depth: 0.01 }), px, 0, 0.02);
  const eyes = [-0.09, 0.09].map((ex) => {
    const eye = place(group, card(ellipse(0, 0, 0.035, 0.05), INK, { depth: 0.005, shadows: false }), ex, -h * 0.35, 0.018);
    eye.visible = false;
    return eye;
  });
  return { group, eyes };
}
