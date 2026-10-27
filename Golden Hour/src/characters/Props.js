import * as THREE from 'three';
import { card, place, paperTexture } from '../world/paper.js';
import { rect, roundRect, circle, ellipse, poly, teardrop } from '../world/shapes.js';

/** Mr. Okafor's old car, facing left (headlight at -x). */
export function makeCar() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = '#5f8fb5';
  place(body, card(roundRect(-0.62, 0.62, 1.15, 0.46, 0.18), paint), 0, 0, -0.02);
  place(body, card(roundRect(-0.5, 0.68, 0.42, 0.32, 0.08), '#d6e8f2', { depth: 0.01 }), 0, 0, 0.02);
  place(body, card(roundRect(-0.02, 0.68, 0.42, 0.32, 0.08), '#d6e8f2', { depth: 0.01 }), 0, 0, 0.02);
  place(body, card(roundRect(-1.05, 0.2, 2.1, 0.5, 0.2), paint), 0, 0, 0);
  place(body, card(rect(-1.0, 0.36, 2.0, 0.05), '#f3ead8', { depth: 0.01 }), 0, 0, 0.04);
  place(body, card(roundRect(-1.12, 0.16, 0.28, 0.1, 0.04), '#cfd3d6'), 0, 0, 0.03);
  place(body, card(roundRect(0.86, 0.16, 0.28, 0.1, 0.04), '#cfd3d6'), 0, 0, 0.03);

  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#fff6d6',
    map: paperTexture(),
    emissive: '#ffe08a',
    emissiveIntensity: 0,
  });
  place(body, card(circle(0, 0, 0.085), null, { depth: 0.02, material: headlightMat }), -0.97, 0.52, 0.04);

  for (const x of [-0.6, 0.6]) {
    place(group, card(circle(0, 0, 0.22), '#2f2a30'), x, 0.22, 0.06);
    place(group, card(circle(0, 0, 0.08), '#e9e1d2'), x, 0.22, 0.1);
  }
  return { group, body, headlightMat, exhaust: new THREE.Vector3(1.15, 0.24, 0.1) };
}

export function makeKite() {
  const group = new THREE.Group();
  place(group, card(poly([[0, 0.42], [0.28, 0], [0, -0.42], [-0.28, 0]]), '#e2574c'), 0, 0, 0);
  place(group, card(poly([[0, 0.42], [0.28, 0], [0, 0]]), '#f2c14e', { depth: 0.01 }), 0, 0, 0.04);
  place(group, card(poly([[0, -0.42], [-0.28, 0], [0, 0]]), '#f2c14e', { depth: 0.01 }), 0, 0, 0.04);
  const bows = [];
  for (let i = 0; i < 4; i++) {
    const bow = card(poly([[-0.08, 0.05], [0.08, -0.05], [0.08, 0.05], [-0.08, -0.05]]), i % 2 ? '#5f8fb5' : '#e2574c', { depth: 0.01 });
    group.add(bow);
    bows.push(bow);
  }
  return { group, bows };
}

/** The musician's straw boater. */
export function makeHat() {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.3, 0, 0.6, 0.06, 0.03), '#e8c77a'), 0, 0, 0);
  place(group, card(roundRect(-0.18, 0.04, 0.36, 0.18, 0.04), '#e8c77a'), 0, 0, -0.01);
  place(group, card(rect(-0.18, 0.07, 0.36, 0.05), '#b0453a', { depth: 0.01 }), 0, 0, 0.03);
  return group;
}

export function makeGuitar() {
  const group = new THREE.Group();
  place(group, card(rect(-0.03, 0.2, 0.06, 0.5), '#6b4636'), 0, 0, 0);
  place(group, card(roundRect(-0.05, 0.66, 0.1, 0.12, 0.02), '#4d3226'), 0, 0, 0);
  place(group, card(circle(0, 0, 0.18), '#c9813f'), 0, 0, 0.01);
  place(group, card(circle(0, 0.19, 0.13), '#c9813f'), 0, 0, 0.01);
  place(group, card(circle(0, 0.08, 0.05), '#3a2a24', { depth: 0.01 }), 0, 0, 0.05);
  return group;
}

/** Birthday cake with candles. Flames are returned so they can flicker and go out. */
export function makeCake() {
  const group = new THREE.Group();
  place(group, card(ellipse(0, 0, 0.36, 0.04), '#f6f1e6'), 0, 0, 0);
  place(group, card(roundRect(-0.28, 0.02, 0.56, 0.2, 0.04), '#f4b8c4'), 0, 0, 0.01);
  place(group, card(roundRect(-0.19, 0.2, 0.38, 0.15, 0.04), '#fbe4e9'), 0, 0, 0.02);
  for (let i = 0; i < 5; i++) place(group, card(circle(0, 0, 0.035), '#e2574c', { depth: 0.01 }), -0.2 + i * 0.1, 0.17, 0.06);
  const flames = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf5a').multiplyScalar(2.2) });
  for (let i = 0; i < 5; i++) {
    const x = -0.14 + i * 0.07;
    place(group, card(rect(-0.012, 0, 0.024, 0.12), i % 2 ? '#7fb3d6' : '#f2c14e', { depth: 0.01 }), x, 0.34, 0.03);
    const flame = card(teardrop(0.05, 0.09), null, { depth: 0.01, material: flameMat, shadows: false });
    place(group, flame, x, 0.47, 0.035);
    flames.push(flame);
  }
  return { group, flames };
}

export function makeBouquet() {
  const group = new THREE.Group();
  place(group, card(poly([[-0.05, 0], [0.05, 0], [0.1, 0.18], [-0.1, 0.18]]), '#6f9a5a'), 0, -0.18, 0);
  const colours = ['#f6a5b8', '#fbf1dc', '#f2c14e', '#f6a5b8', '#fbf1dc'];
  [[-0.08, 0.04], [0.08, 0.04], [0, 0.1], [-0.04, -0.03], [0.05, -0.02]].forEach(([x, y], i) => {
    place(group, card(circle(0, 0, 0.065), colours[i]), x, y, 0.01 * i);
  });
  return group;
}

export function makeFrisbee() {
  const group = new THREE.Group();
  place(group, card(ellipse(0, 0, 0.19, 0.06), '#e84a7a'), 0, 0, 0);
  place(group, card(ellipse(0, 0.01, 0.12, 0.03), '#f6a5b8', { depth: 0.01 }), 0, 0, 0.04);
  return group;
}

export function makeRingBox() {
  const group = new THREE.Group();
  place(group, card(roundRect(-0.08, -0.06, 0.16, 0.1, 0.02), '#b03050'), 0, 0, 0);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd46b').multiplyScalar(1.8) });
  place(group, card(circle(0, 0, 0.04), null, { depth: 0.01, material: ringMat, shadows: false }), 0, 0.06, 0.03);
  return group;
}
