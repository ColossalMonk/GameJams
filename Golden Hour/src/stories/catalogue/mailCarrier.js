import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';
import { makeLetter, makePostBox, makeCap, makeSatchel } from '../props/g-props.js';
import { wearHat } from '../props/b-props.js';

/** The last round of the day: one letter left, for someone who has waited a very long time. */
export default defineStory({
  id: 'mailCarrier',
  slot: 'pavement',
  window: [3.5, 12.5],
  dur: 0.8,
  cast: { carrier: { look: { top: '#3f6f8f', bottom: '#2f2a30' } }, waiter: { old: true } },
  outcomes: {
    main: {
      tags: ['love', 'finally'],
      captions: {
        peak: '{waiter} hugs the very last letter.',
        near: '{carrier}, with the very last letter.',
        after: '{waiter}, reading it for the third time.',
        idle: '{waiter}, waiting by the post box.',
      },
      sounds: [[-1.6, 'whistle'], [0, 'swish'], [0.3, 'aww']],
    },
    blown: {
      tags: ['air', 'oops'],
      captions: {
        peak: "{waiter}'s letter, off on the wind.",
        near: '{carrier}, with the very last letter.',
        after: '{carrier} and {waiter}, still looking up.',
        idle: '{waiter}, waiting by the post box.',
      },
      sounds: [[-1.6, 'whistle'], [0, 'whoosh'], [0.25, 'gasp']],
      throws: { lands: 1.4, kinds: ['hand'], caption: "{target} caught {carrier}'s letter.", after: "{target}, holding {waiter}'s letter." },
    },
  },
  create({ slot, person, group, add, particles, outcome, cross }) {
    add(makePostBox(), slot.x + 1.3, 0, slot.z - 0.25);
    const waiter = person('waiter', slot.x + 0.7, 0, slot.z, 'R');
    const carrier = person('carrier', slot.x - 1.25, 0, slot.z + 0.1, 'L');
    wearHat(carrier, makeCap('#2f4a6b'));
    carrier.hips.add(makeSatchel('#8a5a3a'));
    const letter = makeLetter();
    letter.scale.setScalar(1.4);
    group.add(letter);

    const blown = outcome === 'blown';
    const dur = 0.8;
    const flight = 1.4;
    const walkFrom = slot.x - 1.25;
    const walkTo = slot.x - 0.55;
    const give = vec();
    const take = vec();
    const chest = vec();
    const end = vec();
    let from = null;
    let hearts = false;
    let lastP = -99;

    return {
      focus: () => (blown && lastP > -0.1 && lastP < dur ? [carrier.root, waiter.root, letter] : [carrier.root, waiter.root]),
      thrown: letter,
      update(p, { wall }) {
        lastP = p;
        // The carrier: checks the address, walks up whistling, holds the letter out.
        const walk = smooth(seg(p, -2.2, -1.2));
        carrier.root.position.x = lerp(walkFrom, walkTo, walk);
        const stride = walk > 0 && walk < 1 ? Math.sin(wall * 12) : 0;
        const offer = smooth(seg(p, -0.45, -0.1));
        const check = p > -1.1 && p < -0.45 ? Math.sin(Math.PI * seg(p, -1.1, -0.45)) : 0;
        if (p < 0) {
          carrier.pose({
            legL: stride * 0.4,
            legR: stride * 0.4,
            armL: 0.3 - stride * 0.3,
            armR: lerp(p < -2.2 ? 1.9 : 0.5 + stride * 0.3, 1.25, offer) + check * 1.1,
            head: p < -2.2 ? -0.15 : check * -0.15,
            bob: Math.abs(stride) * 0.03,
            mouth: p > -2.0 && p < -1.0 ? 0.5 : 0.4 + 0.2 * offer,
          });
        } else if (!blown) {
          const proud = p < dur + 1.2;
          carrier.pose({ armL: proud ? 2.75 : 0.3, armR: lerp(1.25, 0.3, smooth(seg(p, 0.1, 0.4))), head: proud ? 0.08 : 0, mouth: proud ? 0.9 : 0.4 });
        } else {
          const look = p < dur + 1.6;
          carrier.pose({ armR: look ? 2.7 : 0.3, armL: look ? 2.2 : 0.3, head: look ? -0.25 : Math.sin(wall * 4) * 0.1, eyes: look ? 1.35 : 1, mouth: look ? 0.6 : 0.3 });
        }

        // The one waiting: tapping a foot, perking up, then the letter.
        if (p < -1.2) {
          waiter.pose({ armL: -0.35, armR: -0.35, legR: Math.max(0, Math.sin(wall * 6)) * 0.15, head: 0.14 + Math.sin(wall * 0.7) * 0.05, mouth: 0.3 });
        } else if (p < 0) {
          waiter.pose({ armL: lerp(-0.35, 1.25, offer), armR: -0.35, head: 0.1, bob: Math.abs(Math.sin(wall * 7)) * 0.03 * (1 - offer), eyes: 1.2, mouth: 0.6 });
        } else if (!blown) {
          const hug = smooth(seg(p, 0.1, 0.3)) * (1 - smooth(seg(p, dur + 1.2, dur + 1.6)));
          const read = smooth(seg(p, dur + 1.2, dur + 1.6));
          waiter.pose({
            armL: lerp(lerp(1.25, -0.55, hug), 0.9, read),
            armR: lerp(lerp(-0.35, -0.55, hug), 0.9, read),
            lean: Math.sin(wall * 2.4) * 0.06 * hug,
            head: -0.1 * read,
            eyes: hug > 0.5 ? 0.2 : 1,
            mouth: hug > 0.5 ? 0.35 : 0.5,
          });
        } else {
          const look = p < dur + 1.6;
          waiter.pose({ armL: look ? 2.8 : 0.3, armR: look ? 2.6 : 0.3, head: look ? -0.3 : 0, eyes: look ? 1.35 : 1, mouth: look ? 1 : 0.2 });
        }

        // The letter: carrier's hand, then the waiter's chest, or the wind.
        carrier.root.updateMatrixWorld(true);
        waiter.root.updateMatrixWorld(true);
        carrier.hand('R', give);
        give.z += 0.08;
        waiter.hand('L', take);
        take.z += 0.08;
        letter.rotation.z = 0;
        if (p < 0) {
          letter.position.copy(give);
          letter.position.y += 0.06;
          letter.rotation.z = 0.15;
        } else if (!blown) {
          waiter.hips.localToWorld(chest.set(0, 0.36, 0.14));
          const u = smooth(seg(p, 0, 0.2));
          if (p < 0.2) letter.position.lerpVectors(give, take, u);
          else if (p < dur + 1.4) letter.position.copy(chest);
          else {
            waiter.hand('R', end);
            letter.position.lerpVectors(take, end, 0.5);
            letter.position.y += 0.08;
            letter.position.z += 0.1;
          }
          if (p >= 0.25 && !hearts) {
            hearts = true;
            for (let i = 0; i < 5; i++) particles.spawn('heart', chest, vec((Math.random() - 0.5) * 0.9, 0.5 + Math.random() * 0.4, 0.15), { life: 1.4, scale: 0.6 + Math.random() * 0.3 });
          }
        } else if (cross?.active) {
          // Off on the wind, and down into someone's hand.
          from ??= give.clone();
          const q = seg(p, 0, flight);
          cross.point(end);
          end.z += 0.08;
          letter.position.lerpVectors(from, end, q);
          letter.position.y += 4 * q * (1 - q) * (1.6 + 0.08 * from.distanceTo(end)) + Math.sin(q * 14) * 0.08 * (1 - q);
          letter.rotation.z = q < 1 ? Math.sin(wall * 9) * 0.8 : 0.2;
          if (q >= 1) cross.land();
        } else {
          from ??= give.clone();
          letter.position.set(from.x + 1.0 * p + 0.25 * Math.sin(p * 4), from.y + 1.1 * p + 0.2 * p * p, from.z + 0.3 * Math.min(p, 1));
          letter.rotation.z = Math.sin(wall * 9) * 0.8;
          letter.visible = letter.position.y < 14;
        }
      },
    };
  },
});
