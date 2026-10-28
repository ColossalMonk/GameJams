import { defineStory } from '../Story.js';
import { seg, smooth, easeIn, lerp } from '../anim.js';
import { card } from '../../world/paper.js';
import { roundRect } from '../../world/shapes.js';

const MATS = ['#9a6fb0', '#2f6f6a', '#e8a35a', '#7fb3d6', '#e2574c'];

/** A yoga class of three holds tree pose in the park. Or tips over, one into the next. */
export default defineStory({
  id: 'yoga',
  slot: 'park',
  window: [3.5, 14.0],
  dur: 1.0,
  cast: { teacher: {}, a: {}, b: {} },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: "{teacher}'s class, perfectly balanced.",
        near: "{teacher}'s class, finding balance.",
        after: '{a}, {teacher} and {b}, at peace.',
        idle: '{teacher}, teaching yoga in the park.',
      },
    },
    topple: {
      tags: ['oops', 'falling'],
      captions: {
        peak: '{a} wobbles, and down they all go.',
        near: '{a}, wobbling a little.',
        after: "{teacher}'s class, in a happy heap.",
        idle: '{teacher}, teaching yoga in the park.',
      },
    },
  },
  create({ slot, person, add, evening }) {
    // They fall one way or the other; {a} is always at the end that goes first.
    const dir = evening.chance(0.5) ? 1 : -1;
    const row = ['a', 'teacher', 'b'].map((role, k) => {
      const x = slot.x + dir * (k - 1) * 1.15;
      const z = slot.z + (2 - k) * 0.08;
      const mat = card(roundRect(-0.45, -0.3, 0.9, 0.6, 0.06), evening.pick(MATS), { depth: 0.01, shadows: false });
      mat.rotation.x = -Math.PI / 2;
      add(mat, x, 0.02, z);
      return person(role, x, 0, z, k % 2 ? 'L' : 'R');
    });
    // How far over each one has gone (radians), in the order they fall.
    const fall = [
      (p) => 0.62 * easeIn(seg(p, -0.1, 0.35)) + 0.63 * smooth(seg(p, 0.95, 1.3)),
      (p) => 0.5 * easeIn(seg(p, 0.25, 0.6)) + 0.85 * smooth(seg(p, 0.85, 1.2)),
      (p) => 1.5 * easeIn(seg(p, 0.45, 0.95)),
    ];
    const dur = 1.0;

    return {
      focus: () => row.map((pup) => pup.root),
      update(p, { wall, outcome }) {
        const topple = outcome === 'topple';
        const arms = smooth(seg(p, -1.6, -0.9)) * (topple ? 1 : 1 - smooth(seg(p, dur + 1.4, dur + 2.2)));
        const leg = smooth(seg(p, -1.1, -0.4)) * (topple ? 1 : 1 - smooth(seg(p, dur + 1.2, dur + 1.9)));
        row.forEach((pup, k) => {
          let wobble = 0.04 * (1 - seg(p, -0.4, 0));
          if (topple) wobble = k === 0 ? lerp(0.06, 0.16, seg(p, -1.2, 0)) : 0.04;
          if (p < -1.6 || (!topple && p >= 0)) wobble = 0;
          const angle = topple ? fall[k](p) : 0;
          pup.root.rotation.z = -dir * angle;
          pup.legR.scale.y = lerp(1, 0.55, leg);
          const breathe = Math.sin(wall * 1.2 + k) * 0.01;
          if (!topple || p < -0.1 + k * 0.3) {
            pup.pose({
              lean: Math.sin(wall * (5 + k)) * wobble,
              bob: breathe,
              armL: lerp(-0.35, 3.0, arms),
              armR: lerp(-0.35, 3.0, arms),
              legR: 1.2 * leg,
              eyes: !topple && p > -0.4 && p < dur + 1.4 ? 0.15 : 0.25,
              mouth: 0.25,
            });
          } else if (p < 1.3) {
            pup.pose({ armL: 2.6 + Math.sin(wall * 14 + k) * 0.4, armR: 2.2 - Math.sin(wall * 14 + k) * 0.4, legR: 1.2, eyes: 1.3, mouth: 1 });
          } else {
            const kick = Math.sin(wall * 7 + k * 2);
            pup.pose({ armL: 2.0 + kick * 0.2, armR: 1.6, legL: kick * 0.25, legR: 1.0 + kick * 0.2, mouth: 0.6 + Math.abs(Math.sin(wall * 9 + k)) * 0.3 });
          }
        });
      },
    };
  },
});
