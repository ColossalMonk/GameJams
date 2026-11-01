import * as THREE from 'three';
import { card, place } from '../world/paper.js';
import { rect, roundRect, circle, ellipse, limb, poly } from '../world/shapes.js';

const LEG = 0.72;
const TORSO = 0.62;
const INK = '#2f2530';
const BLUSH = '#f19a8c';
const MOUTH = '#5e2531';

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
  glasses: false,
  scarf: null,
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** A thin arched brow, tapered to points at both ends. */
function brow(w, t, arch) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.quadraticCurveTo(0, arch * 2 + t, w, 0);
  s.quadraticCurveTo(0, arch * 2 - t, -w, 0);
  return s;
}

/** A smile crescent hanging below y = 0. */
function smile(w, d) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.quadraticCurveTo(0, -2 * d, w, 0);
  s.quadraticCurveTo(0, -0.7 * d, -w, 0);
  return s;
}

/** A wide open grin: flat top, round bottom. */
function grin(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.lineTo(w, 0);
  s.bezierCurveTo(w, -1.33 * h, -w, -1.33 * h, -w, 0);
  return s;
}

/** A circle with a round hole in it. */
function ring(cx, cy, r, inner) {
  const s = circle(cx, cy, r);
  const hole = new THREE.Path();
  hole.absarc(cx, cy, inner, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

/**
 * A front-facing paper puppet. Every limb is its own card pinned at one end, so poses
 * are just rotations — like a split-pin paper doll. Feet are at the root's origin.
 */
export class Puppet {
  constructor(options = {}) {
    const o = { ...DEFAULTS, ...options };
    this.options = o;
    const hs = o.kid ? 1.3 : 1;
    this.hs = hs;

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

    // Scarf: a band at the neck with one fringed tail down the front
    if (o.scarf) {
      const tail = card(poly([[-0.04, 0], [0.04, 0], [0.045, -0.3], [0.0225, -0.27], [0, -0.3], [-0.0225, -0.27], [-0.045, -0.3]]), o.scarf, { depth: 0.01 });
      place(this.hips, tail, 0.075, TORSO - 0.01, 0.043).rotation.z = 0.07;
      place(this.hips, card(roundRect(-0.125, TORSO - 0.05, 0.25, 0.09, 0.04), o.scarf, { depth: 0.012 }), 0, 0, 0.045);
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
    const eyeY = hy + 0.02 * hs;
    this.eyes = [];
    for (const side of [-1, 1]) {
      const eye = card(circle(0, 0, 0.026 * hs), INK, { depth: 0.01, shadows: false });
      place(this.head, eye, side * 0.075 * hs, eyeY, 0.045);
      this.eyes.push(eye);
      place(this.head, card(circle(0, 0, 0.04 * hs), BLUSH, { depth: 0.005, shadows: false }), side * 0.125 * hs, hy - 0.05 * hs, 0.042);
    }
    if (o.glasses) {
      const x = 0.075 * hs;
      const frame = [
        ring(-x, 0, 0.044 * hs, 0.034 * hs),
        ring(x, 0, 0.044 * hs, 0.034 * hs),
        rect(-0.034 * hs, 0.002 * hs, 0.068 * hs, 0.01 * hs),
        rect(-0.198 * hs, 0.008 * hs, 0.08 * hs, 0.009 * hs),
        rect(0.118 * hs, 0.008 * hs, 0.08 * hs, 0.009 * hs),
      ];
      place(this.head, card(frame, INK, { depth: 0.008, shadows: false }), 0, eyeY, 0.05);
    }
    this.browY = eyeY + (o.glasses ? 0.062 : 0.046) * hs;
    this.brows = [-1, 1].map((side) => {
      const b = place(this.head, card(brow(0.036 * hs, 0.018 * hs, 0.008 * hs), INK, { depth: 0.008, shadows: false }), side * 0.078 * hs, this.browY, 0.052);
      b.userData.side = side;
      return b;
    });
    if (o.beard) place(this.head, card(ellipse(0, hy - 0.11, 0.16, 0.12), o.hair, { depth: 0.01 }), 0, 0, 0.043);

    // Mouth: a smile, a small "o" or a wide grin, picked by how open it is
    const my = hy - 0.08 * hs;
    this.mouths = [
      place(this.head, card(smile(0.05 * hs, 0.03 * hs), INK, { depth: 0.01, shadows: false }), 0, my + 0.012 * hs, 0.05),
      place(this.head, card(ellipse(0, 0, 0.032 * hs, 0.04 * hs), MOUTH, { depth: 0.01, shadows: false }), 0, my, 0.05),
      place(this.head, card(grin(0.064 * hs, 0.058 * hs), MOUTH, { depth: 0.01, shadows: false }), 0, my + 0.018 * hs, 0.05),
    ];
    // `mouth.scale.y` reads and sets how open the mouth is, as it did when the mouth was one card.
    const puppet = this;
    this.mouth = { scale: { get y() { return puppet.mouthOpen; }, set y(v) { puppet.setMouth(v); } } };

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
   * `mouth` is how open (≤0.4 smile, to 0.75 a small "o", above that a wide grin).
   * `brows` (−1 frown … 0 neutral … 1 raised) is optional; left out, the brows follow
   * the mouth and eyes.
   */
  pose({ lean = 0, bob = 0, armL = 0, armR = 0, legL = 0, legR = 0, head = 0, eyes = 1, mouth = 0.35, brows = null } = {}) {
    this.hips.rotation.z = lean;
    this.hips.position.y = LEG + bob;
    this.armL.rotation.z = -armL;
    this.armR.rotation.z = armR;
    this.legL.rotation.z = -legL;
    this.legR.rotation.z = legR;
    this.neck.rotation.z = head;
    for (const e of this.eyes) e.scale.y = Math.max(0.12, eyes);
    this.eyesOpen = eyes;
    this.browsSet = brows;
    this.setMouth(mouth);
  }

  /** How open the mouth is (same scale as pose's `mouth`); picks the shape. */
  setMouth(v) {
    this.mouthOpen = v;
    const [sm, oh, wide] = this.mouths;
    sm.visible = v <= 0.4;
    oh.visible = v > 0.4 && v <= 0.75;
    wide.visible = v > 0.75;
    if (sm.visible) sm.scale.y = clamp(0.35 + 1.6 * v, 0.3, 1);
    else if (oh.visible) {
      const u = (v - 0.4) / 0.35;
      oh.scale.set(0.85 + 0.25 * u, 0.7 + 0.4 * u, 1);
    } else wide.scale.y = clamp(0.8 + (v - 0.75), 0.8, 1.1);
    this.setBrows(this.browsSet ?? this.autoBrows());
  }

  /** Surprised or delighted (a big open mouth, wide eyes) raises the brows. */
  autoBrows() {
    return Math.max(clamp((this.mouthOpen - 0.65) / 0.25, 0, 1), clamp((this.eyesOpen - 1.05) / 0.3, 0, 1));
  }

  /** −1 frown / determined, 0 resting, 1 raised and arched. */
  setBrows(b) {
    b = clamp(b, -1, 1);
    const hs = this.hs;
    for (const br of this.brows) {
      const side = br.userData.side;
      br.position.x = side * (0.078 + 0.006 * Math.min(b, 0)) * hs;
      br.position.y = this.browY + (b > 0 ? 0.018 * b : 0.01 * b) * hs;
      br.rotation.z = b < 0 ? -side * 0.42 * b : 0;
      br.scale.y = 1 + 0.4 * Math.max(b, 0);
    }
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
