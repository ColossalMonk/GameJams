import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';
import { makeLantern, makeAerial } from '../props/e-props.js';
import { LAYOUT } from '../../world/Town.js';

const COLOURS = ['#ffb45a', '#ff9a7a', '#ffd27a', '#ff8fa8'];
/** The water tower's peak, where the TV aerial stands (see Town.js). */
const A = LAYOUT.apartment;
const TOWER = { x: A.x + 0.85, y: A.h + 0.08 + 1.02, z: A.z - 0.33 };

/** Two neighbours finally let their paper lanterns go from the roof. One of them doesn't get far. */
export default defineStory({
  id: 'lanterns',
  slot: 'rooftop',
  window: [4.0, 13.5],
  dur: 1.0,
  cast: { a: {}, b: {} },
  outcomes: {
    main: {
      tags: ['air', 'joy', 'finally'],
      captions: {
        peak: '{a} and {b}, letting the lanterns go.',
        near: '{a} and {b}, lanterns glowing.',
        after: 'Two lanterns, rising over town.',
        idle: '{a} and {b}, unfolding paper lanterns.',
      },
      sounds: [[-1.3, 'plink'], [0, 'whoosh'], [0.5, 'aww']],
    },
    snag: {
      tags: ['air', 'oops'],
      captions: {
        peak: "{b}'s lantern, stuck on the aerial.",
        near: '{a} and {b}, lanterns glowing.',
        after: "{b}'s lantern, still on the aerial.",
        idle: '{a} and {b}, unfolding paper lanterns.',
      },
      sounds: [[-1.3, 'plink'], [0.35, 'clink'], [0.8, 'laugh']],
    },
  },
  create({ slot, person, group, evening, outcome }) {
    const y0 = slot.y;
    const a = person('a', slot.x - 0.85, y0, slot.z, 'L');
    const b = person('b', slot.x + 0.1, y0, slot.z + 0.04, 'R');
    const aerial = makeAerial(1.6);
    aerial.group.position.set(TOWER.x, TOWER.y - 0.04, TOWER.z);
    group.add(aerial.group);
    const tip = vec(TOWER.x, TOWER.y - 0.04 + 1.6, TOWER.z + 0.35);

    const colours = [...COLOURS];
    const lanterns = [a, b].map((who, i) => {
      const l = makeLantern(colours.splice(Math.floor(evening.range(0, colours.length)), 1)[0]);
      group.add(l.group);
      return { ...l, who, litAt: i ? -1.1 : -1.4, phase: evening.range(0, 6), drift: i ? evening.range(-0.25, -0.05) : evening.range(-0.3, -0.1), held: vec(), release: vec() };
    });
    const snag = outcome === 'snag';
    const stuck = lanterns[1];

    const dur = 1.0;
    const hL = vec();
    const hR = vec();
    const from = vec();
    let lastP = -99;

    return {
      focus: () => {
        if (snag) return [b.root, stuck.group, aerial.group];
        if (lastP > dur + 1.2) return lanterns.map((l) => l.group);
        return [a.root, b.root, ...lanterns.map((l) => l.group)];
      },
      x: () => slot.x,
      visible: (p) => snag || p < dur + 3.6,
      update(p, { wall }) {
        lastP = p;
        // Lift: the lanterns come up from the chest to overhead while they're lit.
        const lift = smooth(seg(p, -1.6, -0.9));
        const cheer = p >= 0 && p < dur + 0.9;
        const settle = smooth(seg(p, dur + 0.9, dur + 1.6));
        for (const [i, who] of [a, b].entries()) {
          const l = lanterns[i];
          const lost = snag && l === stuck && p > 0.3;
          let arm = lerp(-0.35, 2.95, lift);
          if (p >= 0) arm = lost && p < dur + 1.8 ? 2.6 + Math.sin(wall * 9) * 0.15 : cheer ? 2.75 + Math.sin(wall * 7 + i) * 0.12 : lerp(2.75, 0.35, settle);
          const lean = p > dur + 1.2 && !snag ? (i ? 1 : -1) * 0.06 * settle : 0;
          who.pose({
            armL: arm,
            armR: arm,
            bob: p > -0.9 && p < 0 ? 0.03 + Math.sin(wall * 5 + i) * 0.01 : 0,
            lean: lean + Math.sin(wall * 1.1 + i) * 0.015,
            head: p < -1.6 ? -0.12 : p > dur + 1.2 ? -lean * 0.8 : 0,
            mouth: lost ? 0.7 : cheer ? 0.95 : p > -1.6 ? 0.5 : 0.35,
            eyes: lost ? 1.3 : 1,
          });
          who.root.updateMatrixWorld(true);
        }

        for (const l of lanterns) {
          // Lit one after the other, then glowing brighter as the air inside warms.
          const lit = p >= l.litAt;
          l.flame.visible = lit;
          l.flame.scale.set(1 + Math.sin(wall * 17 + l.phase) * 0.15, 1 + Math.sin(wall * 23 + l.phase) * 0.2, 1);
          l.light(lerp(0.75, 2.4, smooth(seg(p, l.litAt, l.litAt + 0.6))));
          // Filled with warm air, the paper goes from crumpled to round.
          l.group.scale.set(1, lerp(0.6, 1, smooth(seg(p, l.litAt - 0.2, l.litAt + 0.5))), 1);

          l.who.hand('L', hL);
          l.who.hand('R', hR);
          l.held.addVectors(hL, hR).multiplyScalar(0.5);
          l.held.y += 0.06;
          l.held.z = slot.z + 0.12;
          const pos = l.group.position;
          if (p < 0) {
            // Where it leaves the hands, for the flight afterwards.
            l.release.copy(l.held);
            pos.copy(l.held);
            pos.y += p > -0.9 ? 0.03 * Math.max(0, Math.sin(wall * 6 + l.phase)) : 0;
            l.group.rotation.z = 0;
            continue;
          }
          if (snag && l === stuck) {
            // Off it goes, sideways, straight onto the aerial.
            const u = smooth(seg(p, 0, 0.35));
            if (u < 1) {
              pos.lerpVectors(l.release, from.copy(tip).setY(tip.y - 0.06), u);
              pos.y += Math.sin(Math.PI * u) * 0.2;
              l.group.rotation.z = -0.2 * u;
            } else {
              // Caught on the mast, tugging upward now and then.
              const tug = Math.max(0, Math.sin(wall * 2.4 + l.phase));
              pos.set(tip.x, tip.y - 0.06 + 0.05 * tug, tip.z);
              l.group.rotation.z = 0.22 + Math.sin(wall * 2.4 + l.phase) * 0.08;
            }
            continue;
          }
          // Free: rising faster and faster, drifting a little, and away into the evening.
          from.copy(l.release);
          pos.set(from.x + l.drift * p + Math.sin(p * 1.3 + l.phase) * 0.08, from.y + 0.45 * p + 0.1 * p * p, from.z - 0.3 * p);
          l.group.rotation.z = Math.sin(wall * 1.6 + l.phase) * 0.06;
        }
      },
    };
  },
});
