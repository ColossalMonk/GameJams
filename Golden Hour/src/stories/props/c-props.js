import * as THREE from 'three';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse, poly } from '../../world/shapes.js';

/** Props shared by story batch C (ice-cream van, bus, magician, balloon seller). */

/** A paper wheel with a hub and one spoke, so you can see it turn. */
export function makeWheel(r, tyre = '#2f2a30', hub = '#e9e1d2') {
  const group = new THREE.Group();
  place(group, card(circle(0, 0, r), tyre), 0, 0, 0);
  place(group, card(circle(0, 0, r * 0.42), hub, { depth: 0.01 }), 0, 0, 0.04);
  place(group, card(rect(-r * 0.08, 0, r * 0.16, r * 0.66), hub, { depth: 0.01 }), 0, 0, 0.045);
  return group;
}

const signTextures = new Map();

/** Canvas lettering, cached per text. Headless (the Node self-test) there is no canvas. */
function lettering(text, w, h, ink) {
  const key = `${text}|${ink}|${w}x${h}`;
  if (signTextures.has(key)) return signTextures.get(key);
  const px = 256;
  const c = document.createElement('canvas');
  c.width = Math.round(w * px);
  c.height = Math.round(h * px);
  const ctx = c.getContext('2d');
  let size = c.height * 0.72;
  ctx.font = `800 ${size}px Fraunces, Georgia, serif`;
  const fit = (c.width * 0.9) / ctx.measureText(text).width;
  if (fit < 1) size *= fit;
  ctx.font = `800 ${size}px Fraunces, Georgia, serif`;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + size * 0.05);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  signTextures.set(key, tex);
  return tex;
}

/** A painted sign: a paper card with lettering on its face (blank when headless). */
export function makeSign(text, w, h, { bg = '#fbf1dc', ink = '#b0453a', depth = 0.03 } = {}) {
  const group = new THREE.Group();
  place(group, card(roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.2), bg, { depth }), 0, 0, 0);
  if (typeof document === 'undefined') return group;
  const mat = new THREE.MeshStandardMaterial({ map: lettering(text, w, h, ink), transparent: true, roughness: 0.9 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  face.position.z = depth + 0.003;
  group.add(face);
  return group;
}

/** A front-on paper dove. Flap with wingL/wingR.rotation.z. */
export function makeDove(colour = '#fbf6ee') {
  const group = new THREE.Group();
  const wingL = card(poly([[0, 0], [-0.27, 0.13], [-0.22, -0.02]]), colour, { depth: 0.01 });
  const wingR = card(poly([[0, 0], [0.27, 0.13], [0.22, -0.02]]), colour, { depth: 0.01 });
  place(group, wingL, -0.03, 0.02, -0.01);
  place(group, wingR, 0.03, 0.02, -0.01);
  place(group, card(ellipse(0, 0, 0.07, 0.09), colour, { depth: 0.02 }), 0, 0, 0);
  place(group, card(circle(0, 0, 0.055), colour, { depth: 0.02 }), 0, 0.1, 0.01);
  place(group, card(poly([[-0.02, 0], [0.02, 0], [0, -0.04]]), '#e8a35a', { depth: 0.01 }), 0, 0.09, 0.03);
  return { group, wingL, wingR };
}

/** A toy balloon whose knot is at the origin, so strings tie on there. */
export function makeToyBalloon(colour) {
  const group = new THREE.Group();
  place(group, card(poly([[-0.04, 0], [0.04, 0], [0, 0.05]]), colour, { depth: 0.02 }), 0, 0, 0);
  place(group, card(ellipse(0, 0.28, 0.19, 0.24), colour, { depth: 0.02 }), 0, 0, 0);
  place(group, card(ellipse(-0.07, 0.37, 0.035, 0.07, 0.4), '#fff4e4', { depth: 0.005, shadows: false }), 0, 0, 0.022);
  return group;
}
