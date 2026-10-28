import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, arc, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { rect, circle, poly } from '../../world/shapes.js';
import { makeWheel, makeSign } from '../props/c-props.js';

const PAINTS = [
  { paint: '#f6c6d0', trim: '#e2574c' },
  { paint: '#bfe3dc', trim: '#e2574c' },
  { paint: '#fbe7a8', trim: '#5f8fb5' },
];
const SCOOPS = ['#f6a5b8', '#fbf1dc', '#8a5a3a', '#bfe3a0'];
const WAFFLE = '#e0a95e';

/** An ice-cream van facing +x. The seller stands in `inside` and shows through the hatch. */
function makeVan({ paint, trim }) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const outline = [[-1.3, 0.25], [1.35, 0.25], [1.35, 0.95], [1.0, 1.02], [0.75, 1.55], [0.55, 1.6], [0.55, 1.9], [-1.3, 1.9]];
  place(body, card(poly(outline), paint), 0, 0, 0);
  place(body, card(rect(-1.05, 0.93, 1.3, 0.79), '#6d5a6a', { depth: 0.01 }), 0, 0, 0.04);
  const inside = new THREE.Group();
  inside.position.z = 0.09;
  body.add(inside);
  // Front panels frame the hatch, in front of the seller.
  const front = (shape) => place(body, card(shape, paint, { depth: 0.03 }), 0, 0, 0.32);
  front(rect(-1.3, 0.25, 2.65, 0.68));
  front(rect(-1.3, 0.93, 0.25, 0.97));
  front(rect(-1.05, 1.72, 1.3, 0.18));
  front(poly([[0.25, 0.93], [1.35, 0.93], [1.35, 0.95], [1.0, 1.02], [0.75, 1.55], [0.55, 1.6], [0.55, 1.9], [0.25, 1.9]]));
  place(body, card(poly([[0.62, 1.05], [0.97, 1.05], [0.74, 1.48], [0.62, 1.5]]), '#d6e8f2', { depth: 0.01 }), 0, 0, 0.35);
  place(body, card(rect(-1.3, 0.5, 2.65, 0.08), trim, { depth: 0.01 }), 0, 0, 0.35);
  place(body, card(rect(-1.1, 0.88, 1.4, 0.07), '#fbf1dc', { depth: 0.2 }), 0, 0, 0.3);
  for (let i = 0; i < 5; i++) place(body, card(circle(0, 0, 0.13), i % 2 ? '#fbf1dc' : trim, { depth: 0.02 }), -0.93 + i * 0.29, 1.72, 0.36);
  place(body, card(circle(0, 0, 0.07), '#fff6d6', { depth: 0.01 }), 1.3, 0.75, 0.35);
  // A giant cone on the roof.
  place(body, card(poly([[-0.15, 0.4], [0.15, 0.4], [0, 0]]), WAFFLE), -0.75, 1.9, 0.1);
  place(body, card(circle(0, 0, 0.19), '#f6a5b8'), -0.75, 2.42, 0.08);
  // The sign flips from ICE CREAM to SOLD OUT.
  const flip = new THREE.Group();
  place(body, flip, -0.4, 0.72, 0.4);
  flip.add(makeSign('ICE CREAM', 0.9, 0.26, { ink: trim }));
  const back = makeSign('SOLD OUT', 0.9, 0.26, { bg: '#e2574c', ink: '#fbf1dc' });
  back.rotation.y = Math.PI;
  flip.add(back);
  const wheels = [-0.8, 0.85].map((x) => place(group, makeWheel(0.24), x, 0.24, 0.38));
  return { group, body, inside, flip, wheels };
}

/** The ice-cream van stops one last time. The very last cone, for one kid — nearly. */
export default defineStory({
  id: 'iceCreamVan',
  slot: 'road',
  window: [5.0, 13.5],
  dur: 0.8,
  tags: ['wheels'],
  cast: { seller: {}, kid: { kid: true } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: '{kid} gets the very last cone.',
        near: '{kid}, running for the van.',
        after: '{kid} and the last cone of summer.',
        idle: "{seller}'s ice-cream van.",
      },
    },
    drop: {
      tags: ['oops', 'falling'],
      captions: {
        peak: "{kid}'s last scoop, falling.",
        near: '{kid}, running for the van.',
        after: '{kid} and one empty cone.',
        idle: "{seller}'s ice-cream van.",
      },
    },
    soldOut: {
      tags: ['oops'],
      captions: {
        peak: '{seller} flips the sign: SOLD OUT.',
        near: '{kid}, running for the van.',
        after: '{kid}, one van too late.',
        idle: "{seller}'s ice-cream van.",
      },
    },
  },
  create({ slot, person, group, evening, particles }) {
    // Stops left of the café, so the van never hides the table behind it.
    const stop = slot.x - 6.2 + evening.range(-0.2, 0.2);
    const vz = slot.z;
    const van = makeVan(evening.pick(PAINTS));
    van.group.position.set(-15.5, 0, vz);
    group.add(van.group);
    const seller = person('seller', 0, 0, 0, null);
    van.inside.add(seller.root);
    seller.root.position.set(-0.5, -0.3, 0);
    seller.legL.visible = seller.legR.visible = false;

    const kidFrom = vec(stop - 2.0, 0, vz + 0.85);
    const kidTo = vec(stop + 0.55, 0, vz + 0.7);
    const kid = person('kid', kidFrom.x, 0, kidFrom.z, 'R');
    const cone = card(poly([[-0.07, 0.12], [0.07, 0.12], [0, -0.12]]), WAFFLE, { depth: 0.02 });
    const scoop = card(circle(0, 0, 0.085), evening.pick(SCOOPS), { depth: 0.03 });
    group.add(cone, scoop);

    const dur = 0.8;
    const leave = dur + 1.8;
    const hand = vec();
    const from = vec();
    const splat = vec(kidTo.x - 0.2, 0.05, kidTo.z + 0.25);
    let fallFrom = null;
    let hearts = false;
    let puffed = false;
    let lastP = -99;
    let nextSmoke = 0;

    const vanX = (p) => (p < leave ? lerp(-15.5, stop, easeOut(seg(p, -4.6, -2.2))) : lerp(stop, 16, easeIn(seg(p, leave, leave + 3.4))));

    return {
      focus: () => (lastP < leave + 0.8 ? [van.group, kid.root] : [kid.root]),
      visible: (p) => p > -4.1,
      x: () => (lastP < leave + 0.8 ? van.group.position.x : kid.root.position.x),
      update(p, { wall, outcome }) {
        lastP = p;
        const sold = outcome === 'soldOut';
        const drop = outcome === 'drop';

        // The van: in, a little nose-dip as it brakes, and out again after.
        const x = vanX(p);
        const moving = Math.abs(vanX(p + 0.05) - x) > 0.004;
        van.group.position.x = x;
        van.body.position.y = moving ? 0.025 * Math.abs(Math.sin(wall * 18)) : 0;
        van.body.rotation.z = -0.05 * Math.sin(Math.PI * seg(p, -2.6, -1.9));
        for (const w of van.wheels) w.rotation.z = -x / 0.24;
        const flipAt = sold ? -0.12 : dur + 0.8;
        van.flip.rotation.y = Math.PI * smooth(seg(p, flipAt, flipAt + 0.3));
        if (moving && wall > nextSmoke && x > -14 && x < 14) {
          nextSmoke = wall + 0.3;
          particles.spawn('smoke', vec(x - 1.35, 0.35, vz + 0.3), vec(-0.4, 0.15, 0), { life: 1.0 });
        }

        // The seller: waves the van in, holds up the last cone, then cheers, gasps or shrugs.
        const wave = 2.5 + Math.sin(wall * 9) * 0.3;
        if (p < -2.2) seller.pose({ armL: 0.3, armR: 0.3, head: Math.sin(wall * 2) * 0.05 });
        else if (p < -1.6) seller.pose({ armL: wave, armR: 0.4, mouth: 0.8 });
        else if (p < 0) {
          const up = smooth(seg(p, -1.6, -1.2));
          if (sold) seller.pose({ armL: 1.2, armR: lerp(1.2, 1.8, seg(p, -0.3, 0)), head: -0.12, mouth: 0.35 });
          else seller.pose({ armL: 0.5, armR: lerp(0.4, 2.2, up) - 0.4 * smooth(seg(p, -0.25, 0)), mouth: 0.4 + 0.4 * up });
        } else if (p < leave) {
          if (sold) seller.pose({ armL: 1.35, armR: 1.35, head: 0.2, mouth: 0.5 });
          else if (drop && p > 0.3) seller.pose({ armL: 2.75, armR: 2.75, mouth: 1 });
          else seller.pose({ armL: 2.6, armR: 2.4, mouth: 0.9, bob: Math.abs(Math.sin(wall * 9)) * 0.03 });
        } else seller.pose({ armL: wave, armR: 0.4, mouth: 0.6 });

        // The kid: waits at the kerb, runs for the van, reaches up.
        const run = smooth(seg(p, -1.6, -0.45));
        kid.root.position.lerpVectors(kidFrom, kidTo, run);
        const stride = run > 0 && run < 1 ? Math.sin(wall * 16) : 0;
        if (p < -1.6) {
          const excited = p > -3.4;
          kid.pose({ bob: excited ? Math.abs(Math.sin(wall * 8)) * 0.05 : 0, armR: excited ? 2.4 : 0.9 + Math.sin(wall * 3) * 0.1, armL: 0.3, head: 0.15 });
        } else if (p < -0.45) {
          kid.pose({ lean: -0.15, bob: Math.abs(stride) * 0.05, legL: stride * 0.5, legR: stride * 0.5, armL: 0.5 - stride * 0.4, armR: 0.5 + stride * 0.4, mouth: 0.7 });
        } else if (p < 0.05) {
          kid.pose({ armL: 2.5, armR: 0.4, bob: 0.03, mouth: 0.7 });
        } else if (sold) {
          const shock = p < dur + 0.4;
          kid.pose({ armL: shock ? 0.15 : 0.1, armR: 0.1, head: shock ? 0 : -0.2, eyes: shock ? 1.3 : 0.7, mouth: shock ? 0.95 : 0.2 });
        } else if (drop) {
          const shock = p < dur + 0.6;
          kid.pose({ armL: shock ? 2.6 : 1.2, armR: shock ? 2.7 : 0.2, head: shock ? 0 : 0.3, eyes: shock ? 1.3 : 0.8, mouth: shock ? 1 : 0.2 });
        } else if (p < dur + 0.6) {
          kid.pose({ armL: 3.0, armR: 2.7, bob: 0.15 * Math.sin(Math.PI * seg(p, 0, 0.5)), mouth: 1 });
        } else {
          kid.pose({ armL: 2.0, armR: 0.3, head: 0.22, mouth: 0.35 + Math.abs(Math.sin(wall * 5)) * 0.4 });
        }

        // The last cone: seller's hand → kid's hand. The scoop sits on top, unless it doesn't.
        van.group.updateMatrixWorld(true);
        kid.root.updateMatrixWorld(true);
        cone.visible = !sold && p > -1.5;
        if (p < -0.25) {
          seller.hand('R', cone.position);
          cone.position.y += 0.12;
          cone.position.z = vz + 0.42;
        } else {
          seller.hand('R', from);
          from.y += 0.12;
          from.z = vz + 0.42;
          kid.hand('L', hand);
          hand.y += 0.1;
          hand.z += 0.12;
          cone.position.lerpVectors(from, hand, smooth(seg(p, -0.25, 0.05)));
        }
        scoop.visible = cone.visible;
        if (!drop || p < 0.1) {
          scoop.position.copy(cone.position);
          scoop.position.y += 0.17;
          scoop.position.z -= 0.005;
          scoop.scale.set(1, 1, 1);
        } else {
          fallFrom ??= scoop.position.clone();
          const u = seg(p, 0.1, 0.65);
          scoop.position.lerpVectors(fallFrom, splat, u);
          scoop.position.y = lerp(fallFrom.y, splat.y, easeIn(u)) + arc(u, 0.15);
          if (u >= 1) {
            scoop.scale.set(1.35, 0.5, 1);
            if (!puffed) {
              puffed = true;
              for (let i = 0; i < 4; i++) particles.spawn('puff', splat, vec((Math.random() - 0.5) * 0.8, 0.3, 0.1), { life: 0.7, scale: 0.35 });
            }
          }
        }
        if (outcome === 'main' && p >= 0.05 && !hearts) {
          hearts = true;
          kid.headTop(hand);
          for (let i = 0; i < 4; i++) particles.spawn('heart', hand, vec((Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.4, 0.1), { life: 1.3, scale: 0.6 + Math.random() * 0.3 });
        }
      },
    };
  },
});
