import * as THREE from 'three';
import { card, place } from '../world/paper.js';
import { circle, ellipse, limb, poly } from '../world/shapes.js';

const INK = '#2f2530';

/** A side-on paper dog facing +x. Flip with root.scale.x = -1. */
export class Dog {
  constructor({ coat = '#c98a4b', patch = '#f6e6c8', ear = '#8f5a32' } = {}) {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.body.position.y = 0.44;
    this.root.add(this.body);

    this.legs = [];
    for (const [x, z, shade] of [[-0.26, -0.03, ear], [0.24, -0.03, ear], [-0.2, 0.05, coat], [0.3, 0.05, coat]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, -0.06, z);
      pivot.add(card(limb(0.09, 0.36), shade));
      this.body.add(pivot);
      this.legs.push(pivot);
    }
    place(this.body, card(ellipse(0, 0, 0.42, 0.18), coat), 0, 0, 0);
    place(this.body, card(ellipse(0.22, -0.04, 0.15, 0.1), patch, { depth: 0.01 }), 0, 0, 0.04);

    this.tail = new THREE.Group();
    this.tail.position.set(-0.38, 0.06, -0.01);
    this.tail.add(card(limb(0.06, 0.3), coat));
    this.body.add(this.tail);

    this.head = new THREE.Group();
    this.head.position.set(0.4, 0.18, 0.02);
    this.body.add(this.head);
    place(this.head, card(circle(0, 0, 0.16), coat), 0, 0, 0);
    place(this.head, card(ellipse(0.14, -0.05, 0.12, 0.075), patch), 0, 0, 0.02);
    place(this.head, card(circle(0.25, -0.02, 0.035), INK, { depth: 0.01 }), 0, 0, 0.05);
    place(this.head, card(circle(0.05, 0.04, 0.026), INK, { depth: 0.01 }), 0, 0, 0.05);
    place(this.head, card(ellipse(-0.06, -0.02, 0.06, 0.13, 0.35), ear), 0, 0, 0.045);
    this.mouthPoint = new THREE.Vector3(0.3, -0.1, 0.08);

    this.pose();
  }

  /** jump: height off the ground; tilt: body pitch; run: leg swing amount; wag: tail angle. */
  pose({ jump = 0, crouch = 0, tilt = 0, legs = 0, wag = 0, head = 0 } = {}) {
    this.body.position.y = 0.44 + jump - crouch;
    this.body.rotation.z = tilt;
    this.legs.forEach((leg, i) => (leg.rotation.z = (i % 2 ? 1 : -1) * legs));
    this.tail.rotation.z = -2.3 + wag;
    this.head.rotation.z = head;
  }

  mouth(target = new THREE.Vector3()) {
    return this.head.localToWorld(target.copy(this.mouthPoint));
  }
}

/** A front-facing paper cat sitting down, made for yawning. */
export class Cat {
  constructor({ coat = '#e39a55', belly = '#f8dcb4', stripe = '#c47a3a' } = {}) {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);

    this.tail = new THREE.Group();
    this.tail.position.set(0.16, 0.08, 0.03);
    this.tail.add(card(limb(0.07, 0.42), coat));
    this.root.add(this.tail);

    place(this.body, card(ellipse(0, 0.28, 0.24, 0.3), coat), 0, 0, 0);
    place(this.body, card(ellipse(0, 0.22, 0.13, 0.2), belly, { depth: 0.01 }), 0, 0, 0.04);
    place(this.body, card(ellipse(-0.1, 0.03, 0.07, 0.045), belly), 0, 0, 0.05);
    place(this.body, card(ellipse(0.1, 0.03, 0.07, 0.045), belly), 0, 0, 0.05);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.62, 0.02);
    this.body.add(this.head);
    place(this.head, card(poly([[-0.19, 0.06], [-0.05, 0.15], [-0.17, 0.32]]), coat), 0, 0, -0.01);
    place(this.head, card(poly([[0.19, 0.06], [0.05, 0.15], [0.17, 0.32]]), coat), 0, 0, -0.01);
    place(this.head, card(circle(0, 0, 0.2), coat), 0, 0, 0);
    place(this.head, card(poly([[-0.05, 0.19], [0.05, 0.19], [0, 0.11]]), stripe, { depth: 0.01 }), 0, 0, 0.04);
    this.eyes = [];
    for (const side of [-1, 1]) {
      const eye = card(ellipse(0, 0, 0.03, 0.035), INK, { depth: 0.01, shadows: false });
      place(this.head, eye, side * 0.075, 0.03, 0.045);
      this.eyes.push(eye);
    }
    place(this.head, card(poly([[-0.025, -0.03], [0.025, -0.03], [0, -0.055]]), '#e7808a', { depth: 0.01 }), 0, 0, 0.046);
    this.mouth = card(ellipse(0, 0, 0.06, 0.075), '#7a2e3a', { depth: 0.01, shadows: false });
    place(this.head, this.mouth, 0, -0.1, 0.047);

    this.pose();
  }

  /** stretch: 0..1 sits up taller; yawn: 0..1 mouth open, eyes shut; stare: 0..1 wide eyes, puffed up; sway: tail. */
  pose({ stretch = 0, yawn = 0, stare = 0, sway = 0, head = 0 } = {}) {
    this.body.scale.set(1 + stare * 0.14, 1 + stretch * 0.12 + stare * 0.05, 1);
    this.head.rotation.z = head;
    this.head.position.y = 0.62 + yawn * 0.04;
    this.mouth.scale.set(1, Math.max(0.01, yawn), 1);
    for (const e of this.eyes) e.scale.set(1 + stare * 0.7, Math.max(0.1, 1 - yawn * 0.9) * (1 + stare * 0.7), 1);
    this.tail.rotation.z = 0.25 + sway + stare * (2.7 - sway);
  }
}
