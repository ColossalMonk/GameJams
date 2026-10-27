import * as THREE from 'three';
import { card, place } from '../world/paper.js';
import { rect, roundRect, circle, ellipse, limb, poly } from '../world/shapes.js';

const LEG = 0.72;
const TORSO = 0.62;
const INK = '#2f2530';
const BLUSH = '#f19a8c';

const DEFAULTS = {
  skin: '#f1c7a3',
  top: '#d9644a',
  bottom: '#3f4a6b',
  hair: '#4a3326',
  shoes: '#3a2c2a',
  hairStyle: 'short',
  dress: false,
  height: 1,
  kid: false,
  beard: false,
  veil: false,
};

/**
 * A front-facing paper puppet. Every limb is its own card pinned at one end, so poses
 * are just rotations — like a split-pin paper doll. Feet are at the root's origin.
 */
export class Puppet {
  constructor(options = {}) {
    const o = { ...DEFAULTS, ...options };
    this.options = o;
    const hs = o.kid ? 1.3 : 1;

    this.root = new THREE.Group();
    this.figure = new THREE.Group();
    this.figure.scale.setScalar(o.height);
    this.root.add(this.figure);

    this.hips = new THREE.Group();
    this.hips.position.y = LEG;
    this.figure.add(this.hips);

    // Legs (behind the torso)
    const legColour = o.dress ? o.skin : o.bottom;
    this.legL = this.makeLimb(-0.1, 0, -0.04, 0.14, LEG, legColour, o.shoes, 'shoe');
    this.legR = this.makeLimb(0.1, 0, -0.04, 0.14, LEG, legColour, o.shoes, 'shoe');

    // Torso
    if (o.dress) {
      place(this.hips, card(poly([[-0.34, -0.36], [0.34, -0.36], [0.19, TORSO], [-0.19, TORSO]]), o.top), 0, 0, 0);
    } else {
      place(this.hips, card(roundRect(-0.2, -0.06, 0.4, TORSO + 0.06, 0.09), o.top), 0, 0, 0);
      place(this.hips, card(rect(-0.2, -0.06, 0.4, 0.14), o.bottom, { depth: 0.01 }), 0, 0, 0.04);
    }

    // Arms (in front of the torso)
    this.armL = this.makeLimb(-0.25, 0.56, 0.05, 0.12, 0.56, o.top, o.skin, 'hand');
    this.armR = this.makeLimb(0.25, 0.56, 0.05, 0.12, 0.56, o.top, o.skin, 'hand');

    // Head
    this.neck = new THREE.Group();
    this.neck.position.set(0, TORSO - 0.02, 0.01);
    this.hips.add(this.neck);
    place(this.neck, card(rect(-0.05, -0.04, 0.1, 0.14), o.skin), 0, 0, -0.01);
    this.head = new THREE.Group();
    this.head.position.y = 0.08;
    this.neck.add(this.head);
    const hy = 0.2 * hs;
    const hr = 0.21 * hs;
    this.headCentre = new THREE.Vector3(0, hy, 0);

    if (o.hairStyle === 'long' || o.veil) {
      place(this.head, card(roundRect(-hr - 0.04, hy - hr - 0.12, hr * 2 + 0.08, hr * 2 + 0.16, hr), o.veil ? '#fbf6ee' : o.hair), 0, 0, -0.03);
    }
    place(this.head, card(circle(0, hy, hr), o.skin), 0, 0, 0);
    if (o.hairStyle === 'short' || o.hairStyle === 'long' || o.hairStyle === 'bun') {
      place(this.head, card(ellipse(0, hy + hr * 0.42, hr * 1.04, hr * 0.68), o.hair), 0, 0, -0.012);
      place(this.head, card(ellipse(0, hy + hr * 0.62, hr * 0.92, hr * 0.42), o.hair, { depth: 0.01 }), 0, 0, 0.04);
    }
    if (o.hairStyle === 'bun') place(this.head, card(circle(0, hy + hr + 0.06, 0.09), o.hair), 0, 0, -0.01);
    if (o.hairStyle === 'bald') {
      place(this.head, card(circle(-hr, hy + 0.02, 0.06), o.hair), 0, 0, -0.01);
      place(this.head, card(circle(hr, hy + 0.02, 0.06), o.hair), 0, 0, -0.01);
    }

    // Face
    this.eyes = [];
    for (const side of [-1, 1]) {
      const eye = card(circle(0, 0, 0.026 * hs), INK, { depth: 0.01, shadows: false });
      place(this.head, eye, side * 0.075 * hs, hy + 0.02 * hs, 0.045);
      this.eyes.push(eye);
      place(this.head, card(circle(0, 0, 0.04 * hs), BLUSH, { depth: 0.005, shadows: false }), side * 0.125 * hs, hy - 0.05 * hs, 0.042);
    }
    if (o.beard) place(this.head, card(ellipse(0, hy - 0.11, 0.16, 0.12), o.hair, { depth: 0.01 }), 0, 0, 0.043);
    this.mouth = card(ellipse(0, 0, 0.045 * hs, 0.04 * hs), INK, { depth: 0.01, shadows: false });
    place(this.head, this.mouth, 0, hy - 0.08 * hs, 0.05);

    this.pose();
  }

  makeLimb(x, y, z, w, len, colour, endColour, end) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    this.hips.add(pivot);
    const piece = card(limb(w, len), colour);
    pivot.add(piece);
    const tip = end === 'shoe' ? card(ellipse(0, 0, 0.11, 0.065), endColour) : card(circle(0, 0, 0.07), endColour);
    place(pivot, tip, 0, -len + (end === 'shoe' ? 0.03 : 0), 0.005);
    pivot.userData.tip = tip;
    return pivot;
  }

  /**
   * Set a pose. Arm values are how far the arm is raised away from the body (0 = hanging,
   * π/2 = straight out to the side, π = straight up); negative swings it across the body.
   */
  pose({ lean = 0, bob = 0, armL = 0, armR = 0, legL = 0, legR = 0, head = 0, eyes = 1, mouth = 0.35 } = {}) {
    this.hips.rotation.z = lean;
    this.hips.position.y = LEG + bob;
    this.armL.rotation.z = -armL;
    this.armR.rotation.z = armR;
    this.legL.rotation.z = -legL;
    this.legR.rotation.z = legR;
    this.neck.rotation.z = head;
    for (const e of this.eyes) e.scale.y = Math.max(0.12, eyes);
    this.mouth.scale.y = mouth;
  }

  /** World position of a hand ('L' or 'R'). */
  hand(side, target = new THREE.Vector3()) {
    const arm = side === 'L' ? this.armL : this.armR;
    return arm.userData.tip.getWorldPosition(target);
  }

  /** World position of the top of the head. */
  headTop(target = new THREE.Vector3()) {
    const hs = this.options.kid ? 1.3 : 1;
    target.set(0, 0.2 * hs + 0.21 * hs, 0);
    return this.head.localToWorld(target);
  }
}
