import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, arc, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse, poly } from '../../world/shapes.js';
import { makeDove } from '../props/c-props.js';

const RABBITS = ['#fbf6ee', '#e9e1d4', '#d8c2a8'];
const CLOTHS = ['#b03050', '#3f6f8f', '#9a6fb0'];

/** A rabbit hanging by its ears: the ear tips are at the origin. */
function makeRabbit(fur) {
  const group = new THREE.Group();
  for (const s of [-1, 1]) {
    place(group, card(ellipse(s * 0.05, -0.13, 0.035, 0.13, s * 0.15), fur, { depth: 0.02 }), 0, 0, -0.005);
    place(group, card(ellipse(s * 0.05, -0.13, 0.015, 0.09, s * 0.15), '#f2b3bd', { depth: 0.005, shadows: false }), 0, 0, 0.016);
    place(group, card(circle(s * 0.04, -0.27, 0.013), '#2f2530', { depth: 0.005, shadows: false }), 0, 0, 0.035);
  }
  place(group, card(ellipse(0, -0.46, 0.13, 0.16), fur, { depth: 0.02 }), 0, 0, 0);
  place(group, card(circle(0, -0.29, 0.1), fur, { depth: 0.02 }), 0, 0, 0.012);
  place(group, card(circle(0, -0.32, 0.018), '#e7808a', { depth: 0.005, shadows: false }), 0, 0, 0.035);
  return group;
}

/** A top hat, upside down, so things can come out of it. Its crown is at the origin. */
function makeTopHat() {
  const group = new THREE.Group();
  place(group, card(rect(-0.16, 0, 0.32, 0.36), '#2f2a30'), 0, 0, 0);
  place(group, card(rect(-0.16, 0.22, 0.32, 0.06), '#b0453a', { depth: 0.01 }), 0, 0, 0.04);
  place(group, card(roundRect(-0.25, 0.33, 0.5, 0.06, 0.03), '#2f2a30'), 0, 0, 0.005);
  place(group, card(ellipse(0, 0.375, 0.19, 0.022), '#141018', { depth: 0.005, shadows: false }), 0, 0, 0.046);
  return group;
}

/** A street magician, one kid in the audience, and a hat with something in it. */
export default defineStory({
  id: 'magician',
  slot: 'pavement',
  window: [3.5, 13.0],
  dur: 0.9,
  cast: { magician: { kid: false }, kid: { kid: true } },
  outcomes: {
    main: {
      tags: ['animal', 'joy'],
      captions: {
        peak: '{magician} pulls a rabbit out of a hat.',
        near: '{magician}, about to do the trick.',
        after: '{magician}, taking a bow with a rabbit.',
        idle: '{magician}, doing magic for {kid}.',
      },
    },
    doves: {
      tags: ['animal', 'air', 'joy'],
      captions: {
        peak: "Doves, everywhere, out of {magician}'s hat.",
        near: '{magician}, about to do the trick.',
        after: '{magician} and {kid}, covered in doves.',
        idle: '{magician}, doing magic for {kid}.',
      },
    },
    giant: {
      tags: ['animal', 'oops'],
      captions: {
        peak: "{magician}'s rabbit. A lot of rabbit.",
        near: '{magician}, about to do the trick.',
        after: '{kid}, meeting a very large rabbit.',
        idle: '{magician}, doing magic for {kid}.',
      },
    },
  },
  create({ slot, person, group, evening, outcome }) {
    const mx = slot.x + 0.02;
    const kx = slot.x + 1.05;
    const mage = person('magician', mx, 0, slot.z, 'R');
    const kid = person('kid', kx, 0, slot.z + 0.1, 'R');
    // The table stands where the magician's left hand reaches down to.
    const hatX = mx - 0.77 * mage.options.height;
    const hatZ = slot.z + 0.18;
    const table = new THREE.Group();
    place(table, card(rect(-0.04, 0, 0.08, 0.72), '#3d3a40'), 0, 0, 0);
    place(table, card(poly([[-0.3, 0.76], [0.3, 0.76], [0.36, 0.3], [-0.36, 0.3]]), evening.pick(CLOTHS)), 0, 0, 0.12);
    place(table, card(rect(-0.33, 0.7, 0.66, 0.06), '#3d3a40'), 0, 0, 0.11);
    place(group, table, hatX, 0, slot.z);
    const hat = makeTopHat();
    place(group, hat, hatX, 0.76, hatZ);
    const rim = vec(hatX, 1.15, hatZ + 0.05);

    const wand = new THREE.Group();
    place(wand, card(rect(-0.015, -0.36, 0.03, 0.36), '#2f2a30', { depth: 0.02 }), 0, 0, 0);
    place(wand, card(rect(-0.017, -0.36, 0.034, 0.07), '#fbf6ee', { depth: 0.02 }), 0, 0, 0.005);
    place(mage.armR, wand, 0, -0.5, 0.07);

    const giant = outcome === 'giant';
    const rabbit = makeRabbit(evening.pick(RABBITS));
    group.add(rabbit);
    const sit = vec(hatX - 0.12, 0.62 * 2.6, hatZ - 0.07);

    // Doves fan out of the hat, then land on whoever is nearest.
    const doves = [];
    for (let i = 0; i < 6; i++) {
      const d = makeDove();
      place(group, d.group, rim.x, rim.y, rim.z);
      const a = -1.0 + i * 0.4 + evening.range(-0.12, 0.12);
      d.apex = rim.clone().add(vec(Math.sin(a) * 1.1, 0.7 + Math.cos(a) * 0.6, 0.05));
      d.land = vec();
      d.lands = 1.7 + i * 0.08;
      doves.push(d);
    }
    const perch = (i, target) => {
      if (i === 0) mage.headTop(target);
      else if (i === 1) mage.hand('L', target).y += 0.06;
      else if (i === 2) mage.hand('R', target).y += 0.06;
      else if (i === 3) kid.headTop(target);
      else if (i === 4) target.set(hatX + 0.22, 0.78, hatZ);
      else target.copy(rim);
      target.y += 0.05;
      target.z = slot.z + 0.28;
      return target;
    };

    const dur = 0.9;
    const hand = vec();

    return {
      focus: () => (outcome === 'doves' ? [mage.root, hat, ...doves.map((d) => d.group)] : [mage.root, rabbit]),
      update(p, { wall, outcome: o }) {
        const isDoves = o === 'doves';
        const chatter = 0.3 + Math.abs(Math.sin(wall * 7)) * 0.4;
        const lift = (giant ? smooth(seg(p, -0.15, 0.45)) : easeOut(seg(p, -0.15, 0.25)));
        if (p < -1.6) {
          mage.pose({ armR: 1.0 + Math.sin(wall * 3) * 0.4, armL: 1.2, mouth: chatter });
        } else if (p < -0.15) {
          mage.pose({ armR: 2.3 + Math.sin(wall * 8) * 0.35, armL: 1.2, lean: 0.05, mouth: chatter });
        } else if (isDoves) {
          const flung = p < dur + 0.2;
          mage.pose({ armL: flung ? 2.5 : 1.55, armR: flung ? 2.5 : 1.55, lean: flung ? -0.05 : 0, mouth: flung ? 1 : 0.6 });
        } else if (giant) {
          const letGo = smooth(seg(p, dur + 0.9, dur + 1.4));
          mage.pose({
            armL: lerp(lerp(1.2, 2.75, lift) + Math.sin(wall * 25) * 0.05 * lift, 0.4, letGo),
            armR: lerp(2.0, 0.3, letGo),
            lean: -0.22 * lift * (1 - letGo),
            eyes: 1.3,
            mouth: 1,
          });
        } else {
          const bow = p > dur + 0.8 && p < dur + 2.4 ? Math.sin(Math.PI * seg(p, dur + 0.8, dur + 2.4)) : 0;
          mage.pose({ armL: lerp(1.2, 2.75, lift), armR: lerp(2.3, 2.6, lift), head: -0.25 * bow, bob: -0.06 * bow, mouth: 0.9 });
        }
        hat.rotation.z = p < 0 ? Math.sin(wall * 20) * 0.05 * seg(p, -1.0, 0) : 0;

        if (p < -1.6) kid.pose({ armL: 0.3, armR: 0.2, bob: Math.abs(Math.sin(wall * 2)) * 0.01, head: 0.08 });
        else if (p < 0) kid.pose({ lean: 0.12, armL: 0.6, armR: 0.4, head: 0.1, mouth: 0.5 });
        else if (giant) kid.pose({ lean: -0.35 * (1 - seg(p, dur + 1.5, dur + 2.5)), armL: 2.2, armR: 2.2, eyes: 1.4, mouth: 1 });
        else if (isDoves) kid.pose({ armL: 2.8, armR: 2.8, bob: p < 0.5 ? arc(seg(p, 0, 0.5), 0.12) : 0, mouth: 1 });
        else kid.pose({ armL: 2.5 + Math.sin(wall * 10) * 0.15, armR: 2.5 - Math.sin(wall * 10) * 0.15, mouth: 0.9 });

        mage.root.updateMatrixWorld(true);
        kid.root.updateMatrixWorld(true);
        rabbit.visible = !isDoves && p > -0.2;
        mage.hand('L', hand);
        hand.y += 0.04;
        hand.z = hatZ - 0.07;
        const s = giant ? lerp(0.85, 2.6, easeOut(seg(p, -0.05, 0.45))) : 0.85;
        rabbit.scale.set(s, s, 1);
        if (giant) rabbit.position.lerpVectors(hand, sit, smooth(seg(p, dur + 0.9, dur + 1.4)));
        else rabbit.position.copy(hand);
        rabbit.rotation.z = Math.sin(wall * 3) * 0.08;

        doves.forEach((d, i) => {
          d.group.visible = isDoves && p >= 0;
          if (!d.group.visible) return;
          const flying = p < d.lands;
          if (p < 0.8) d.group.position.lerpVectors(rim, d.apex, easeOut(seg(p, 0, 0.8)));
          else {
            const v = smooth(seg(p, 0.8, d.lands));
            d.group.position.lerpVectors(d.apex, perch(i, d.land), v);
            d.group.position.y += arc(v, 0.3);
          }
          const flap = Math.sin(wall * 22 + i * 1.7) * 0.6;
          d.wingL.rotation.z = flying ? flap : 0.5;
          d.wingR.rotation.z = flying ? -flap : -0.5;
        });
      },
    };
  },
});
