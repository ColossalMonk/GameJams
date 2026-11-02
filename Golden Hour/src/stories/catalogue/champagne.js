import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { circle } from '../../world/shapes.js';
import { makeBottle, makeCork, makeFlute } from '../props/f-props.js';
import { LAYOUT } from '../../world/Town.js';

const FOAM = '#fff1c4';
/** How long the cork is in the air. */
const FLIGHT = 1.3;

/** The bottle saved for a special evening, opened at the café table at last. */
export default defineStory({
  id: 'champagne',
  slot: 'cafe',
  window: [5.5, 13.8],
  dur: 0.9,
  cast: { host: {}, friend: {} },
  outcomes: {
    main: {
      tags: ['joy', 'air', 'finally'],
      captions: {
        peak: "{host}'s cork, off like a rocket.",
        near: '{host}, wrestling with the cork.',
        after: '{host} and {friend}, cheers at last.',
        idle: '{host} and {friend}, saving the bottle.',
      },
      throws: { lands: FLIGHT, kinds: ['head', 'hand'], caption: "{target} got {host}'s cork.", after: '{target}, keeping the cork.' },
      sounds: [[-0.02, 'cork'], [0.2, 'cheer'], [1.15, 'clink']],
    },
    spray: {
      tags: ['joy', 'oops'],
      captions: {
        peak: "{host}'s champagne, all over {friend}.",
        near: '{host}, wrestling with the cork.',
        after: '{host} and {friend}, sticky and happy.',
        idle: '{host} and {friend}, saving the bottle.',
      },
      sounds: [[-0.02, 'cork'], [0.1, 'splash'], [0.8, 'laugh']],
    },
  },
  create({ slot, person, group, outcome, particles, cross }) {
    const host = person('host', slot.x - 0.5, 0, slot.z - 0.5, 'L');
    const friend = person('friend', slot.x + 0.85, 0, slot.z - 0.1, 'R');

    // The bottle turns about the host's hand.
    const grip = new THREE.Group();
    group.add(grip);
    const bottle = makeBottle();
    bottle.group.position.y = -0.14;
    grip.add(bottle.group);
    const cork = makeCork();
    cork.scale.setScalar(2.2);
    group.add(cork);
    const flute = makeFlute();
    flute.group.scale.setScalar(1.4);
    group.add(flute.group);
    // Splashes of foam that stay on the friend after a spraying.
    const splats = [[-0.08, 0.36, 0.05], [0.09, 0.22, 0.045], [0.0, 0.06, 0.035]].map(([x, y, r]) => {
      const s = place(friend.head, card(circle(0, 0, r), FOAM, { depth: 0.01, shadows: false }), x, y, 0.06);
      s.visible = false;
      return s;
    });
    // If nobody catches it, the cork ends up on the café awning.
    const awning = vec(slot.x + 0.95, 2.31, LAYOUT.cafe.z + 0.45);

    const dur = 0.9;
    const hand = vec();
    const handF = vec();
    const mouth = vec();
    const dir = vec();
    const end = vec();
    let from = null;
    let near = true;
    let lastFoam = -1;

    return {
      focus: () => [host.root, friend.root, grip, ...(near ? [cork] : [])],
      thrown: cork,
      update(p, { wall, outcome: o }) {
        const spray = o === 'spray';
        // The host: shake, shake, a thumb on the cork, pop.
        const shake = p > -1.6 && p < -0.5 ? Math.sin(wall * 26) * 0.35 : 0;
        const aim = smooth(seg(p, -0.5, -0.2));
        const pour = !spray ? smooth(seg(p, 0.45, 0.65)) * (1 - smooth(seg(p, 0.95, 1.05))) : 0;
        const cheers = !spray && p > 1.05 ? smooth(seg(p, 1.05, 1.2)) * (1 - smooth(seg(p, 2.6, 3.0))) : 0;
        const jolt = spray && p >= 0 ? smooth(seg(p, 0, 0.08)) * (1 - smooth(seg(p, 0.8, 1.1))) : 0;
        const laugh = spray && p > 1.0;
        host.pose({
          armR: lerp(lerp(lerp(1.0 + shake * 0.3, 2.2, aim), 1.5, pour), 2.7, cheers) - 0.6 * jolt,
          armL: p > -0.5 && p < 0 ? 1.0 : p >= 0 && p < dur ? 2.4 : laugh ? 0.6 + Math.abs(Math.sin(wall * 12)) * 0.3 : 0.4,
          lean: -0.1 * aim * (1 - pour) + Math.sin(wall * 30) * 0.05 * jolt,
          bob: laugh ? Math.abs(Math.sin(wall * 10)) * 0.03 : 0,
          mouth: p >= 0 ? (jolt > 0.5 ? 0.6 : 1) : 0.3 + 0.2 * aim,
          eyes: p > -0.4 && p < 0 ? 0.25 : 1,
          brows: p > -0.4 && p < 0 ? -0.6 : null,
        });
        const soaked = spray && p > 0.08 && p < 1.1;
        friend.pose({
          armL: soaked ? 2.7 : lerp(lerp(1.1, 1.25, pour), 2.6, cheers),
          armR: soaked ? 2.7 : p >= 0 && p < dur && !spray ? 2.5 : laugh ? 0.6 + Math.abs(Math.sin(wall * 12 + 1)) * 0.3 : 0.3,
          lean: soaked ? -0.15 + Math.sin(wall * 20) * 0.03 : p < 0 ? -0.08 * aim : 0,
          eyes: soaked ? 0.15 : p > -0.4 && p < 0 ? 0.4 : 1,
          mouth: soaked ? 0.9 : p >= 0 ? 1 : 0.35,
          bob: laugh ? Math.abs(Math.sin(wall * 10 + 1)) * 0.03 : 0,
        });
        for (const s of splats) s.visible = spray && p > 0.15;

        host.root.updateMatrixWorld(true);
        friend.root.updateMatrixWorld(true);
        host.hand('R', hand);
        friend.hand('L', handF);
        grip.position.set(hand.x, hand.y, hand.z + 0.12);
        // Neck up while it's opened, tipped over the glass to pour, at the friend for a spray.
        let tilt = lerp(-0.6 + shake * 0.4, -0.25, aim);
        tilt = lerp(tilt, -2.1, pour);
        if (spray) tilt = lerp(tilt, -1.45 + Math.sin(wall * 14) * 0.25, jolt);
        grip.rotation.z = lerp(tilt, -0.2, cheers);
        grip.updateMatrixWorld(true);
        bottle.group.localToWorld(mouth.copy(bottle.mouth));

        flute.group.position.set(handF.x, handF.y - 0.1, handF.z + 0.1);
        flute.fill.scale.y = Math.max(0.001, !spray ? smooth(seg(p, 0.55, 0.95)) : smooth(seg(p, 0.1, 0.4)) * 0.6);

        // Foam: a fountain straight up, or a jet across the table.
        if (p >= 0 && p < (spray ? 0.75 : 0.4)) {
          const k = Math.floor(p / 0.035);
          if (k !== lastFoam) {
            lastFoam = k;
            dir.set(-Math.sin(grip.rotation.z), Math.cos(grip.rotation.z), 0.1).multiplyScalar(spray ? 3.6 : 2.6);
            particles.spawn('puff', mouth, dir.clone().add(vec((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 0)), { life: spray ? 0.6 : 0.8, scale: spray ? 0.32 : 0.26, color: FOAM });
          }
        }

        // The cork: on the bottle, then off like a rocket.
        if (p < 0) {
          cork.position.copy(mouth);
          cork.rotation.z = grip.rotation.z;
          near = true;
          return;
        }
        from ??= mouth.clone();
        const u = seg(p, 0, FLIGHT);
        if (o === 'main' && cross?.active) {
          cross.point(end);
          end.z += 0.05;
        } else if (o === 'main') end.copy(awning);
        else end.set(slot.x - 0.2, 0.86, slot.z - 0.1);
        cork.position.lerpVectors(from, end, easeOut(u) * 0.3 + u * 0.7);
        cork.position.y += 4 * u * (1 - u) * (o === 'main' ? 2.4 + 0.1 * from.distanceTo(end) : 1.2);
        cork.rotation.z = u < 1 ? u * Math.PI * 9 : 1.2;
        if (u >= 1 && o === 'main' && cross?.active) cross.land();
        near = p <= dur || cork.position.distanceTo(from) < 2.5;
      },
    };
  },
});
