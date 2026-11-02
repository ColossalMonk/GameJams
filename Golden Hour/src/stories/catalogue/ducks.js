import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';
import { makeDuck, makeDuckling, makeStopSign } from '../props/g-props.js';

const MOTHERS = [
  { feather: '#fbf6ee', head: '#fbf6ee', wing: '#e9e1d4' },
  { feather: '#b08a68', head: '#8a6a4a', wing: '#8a6a4a' },
  { feather: '#c9a27e', head: '#3f6f5a', wing: '#8a6a4a' },
];
/** When each duck sets off after the mother, and where it queues before that (along the path). */
const DELAY = [0, 0.6, 0.95, 1.3, 1.65];
const QUEUE = [0, -0.22, -0.32, -0.42, -0.52];
/** Seconds to cross. */
const CROSS = 2.6;

/** A lollipop warden finally gets to stop the traffic for something that matters: ducks. */
export default defineStory({
  id: 'ducks',
  slot: 'road',
  window: [3.0, 13.0],
  dur: 0.9,
  tags: ['animal'],
  cast: { guard: { old: true, look: { top: '#f2c14e' } } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{guard} holds up traffic for five ducks.',
        near: 'Ducks at the kerb. {guard} steps out.',
        after: 'Five ducks, safely across.',
        idle: '{guard}, minding the crossing.',
      },
      sounds: [[-2.1, 'whistle'], [0, 'quack'], [1.6, 'aww']],
    },
    back: {
      tags: ['oops', 'joy'],
      captions: {
        peak: 'One duckling turns back. {guard} waits.',
        near: 'Ducks at the kerb. {guard} steps out.',
        after: 'All five across. {guard} breathes out.',
        idle: '{guard}, minding the crossing.',
      },
      sounds: [[-2.1, 'whistle'], [0.1, 'quack'], [1.5, 'aww']],
    },
  },
  create({ slot, person, group, evening, outcome }) {
    // A crossing between the lamp post and the café table.
    const cx = slot.x - 2.6 + evening.range(-0.3, 0.3);
    const from = vec(cx - 1.5, 0, slot.z - 0.8);
    const to = vec(cx + 0.7, 0, slot.z + 1.2);
    const ducks = [makeDuck(evening.pick(MOTHERS))];
    ducks[0].group.scale.setScalar(1.15);
    for (let i = 1; i < DELAY.length; i++) {
      const d = makeDuckling();
      d.group.scale.setScalar(1.3);
      ducks.push(d);
    }
    for (const d of ducks) group.add(d.group);
    const guard = person('guard', cx + 1.75, 0, slot.z + 1.2, 'L');
    const sign = makeStopSign();
    group.add(sign);
    const kerb = vec(cx + 1.75, 0, slot.z + 1.2);
    const road = vec(cx + 1.75, 0, slot.z + 0.25);

    const back = outcome === 'back';
    const dur = 0.9;
    const t0 = -1.5;
    const hand = vec();
    // In the turn-back outcome everyone waits for the straggler: crossing time stands still.
    const hold = dur + 0.6;
    const clock = (p) => (!back || p < 0 ? p : p < hold ? 0.12 * smooth(seg(p, 0, 0.3)) : 0.12 + p - hold);

    return {
      focus: () => [guard.root, sign, ...ducks.map((d) => d.group)],
      update(p, { wall }) {
        const tau = clock(p);
        ducks.forEach((d, i) => {
          let s = Math.max(QUEUE[i], (tau - t0 - DELAY[i]) / CROSS);
          let facing = 1;
          let hurry = 1;
          if (back && i === DELAY.length - 1) {
            // The last duckling has second thoughts, then hurries back to the line.
            const away = 0.16 * smooth(seg(p, 0, 0.5)) * (1 - smooth(seg(p, dur + 0.4, dur + 1.4)));
            s -= away;
            if (p > 0 && p < dur + 0.4) facing = -1;
            if (p > dur + 0.4 && p < dur + 1.4) hurry = 1.8;
          }
          if (back && i === 0 && p > 0.15 && p < hold) facing = -1;
          const walking = (s > QUEUE[i] && s < 1.25) || hurry > 1 || facing < 0;
          // Off the far kerb they keep pottering along the pavement.
          const past = Math.max(0, s - 1);
          d.group.position.lerpVectors(from, to, Math.min(1, s));
          d.group.position.x += past * 0.6;
          const step = wall * 12 * hurry + i * 1.3;
          d.group.position.y = walking ? Math.abs(Math.sin(step)) * 0.025 : 0;
          d.body.rotation.z = walking ? Math.sin(step) * 0.12 : 0;
          d.group.scale.x = facing * Math.abs(d.group.scale.y);
          const quack = i === 0 && ((p > -0.05 && p < 0.3) || (back && p > 0.2 && p < dur));
          d.neck.rotation.z = quack ? 0.35 + Math.sin(wall * 16) * 0.12 : walking ? Math.sin(step) * 0.08 : 0.05 * Math.sin(wall * 2 + i);
        });

        // The warden: out into the road, sign up, and back to the kerb when it's all over.
        const out = smooth(seg(p, -2.6, -2.0)) * (1 - smooth(seg(p, (back ? hold : 0) + 2.9, (back ? hold : 0) + 3.5)));
        const raised = smooth(seg(p, -2.0, -1.7)) * (1 - smooth(seg(p, (back ? hold : 0) + 2.6, (back ? hold : 0) + 2.9)));
        guard.root.position.lerpVectors(kerb, road, out);
        const moving = (p > -2.6 && p < -2.0) || (out > 0 && out < 1 && p > 0);
        const stride = moving ? Math.sin(wall * 12) : 0;
        const fuss = back && p > 0.1 && p < hold;
        guard.pose({
          armR: lerp(0.35, 1.3, raised) + (raised > 0.99 && p < 0.1 ? Math.sin(wall * 3) * 0.05 : 0),
          armL: fuss ? 2.75 : p > -1.7 && p < 0 ? 1.5 : p >= 0 && raised > 0.5 ? 1.4 + Math.sin(wall * 8) * 0.3 : 0.3 - stride * 0.3,
          legL: stride * 0.35,
          legR: stride * 0.35,
          bob: Math.abs(stride) * 0.03,
          head: fuss ? Math.sin(wall * 5) * 0.12 : p > -1.5 && p < 2.5 ? 0.12 : 0,
          brows: p > -1.7 && p < 0 ? -0.6 : null,
          eyes: fuss ? 1.3 : 1,
          mouth: fuss ? 0.6 : p >= 0 && p < dur + 0.6 ? 0.9 : 0.35,
        });
        guard.root.updateMatrixWorld(true);
        guard.hand('R', hand);
        sign.position.set(hand.x, hand.y - 0.5, hand.z + 0.05);
        sign.rotation.z = -0.08 * raised;
      },
    };
  },
});
