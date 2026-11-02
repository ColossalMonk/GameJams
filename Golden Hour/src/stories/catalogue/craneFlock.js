import { defineStory } from '../Story.js';
import { seg, smooth, lerp, window01, vec } from '../anim.js';
import { makeCraneBird } from '../props/e-props.js';
import { sunCentre } from '../../world/Sky.js';
import { LAYOUT } from '../../world/Town.js';

/** Birds per arm of the V, behind the leader. */
const ARM = 3;
/** Spacing along the V: back and out per bird. */
const DX = 0.95;
const DY = 0.5;
/** Roughly where the theatre camera sits, to put the V in line with the sun from the seats. */
const EYE = vec(0, 7.3, 26);

/** Migrating cranes cross the sun in a perfect V. Nearly perfect: one of them forgot something. */
export default defineStory({
  id: 'craneFlock',
  slot: 'sky',
  window: [4.5, 11.0],
  dur: 1.0,
  cast: {},
  outcomes: {
    main: {
      tags: ['air', 'animal'],
      captions: {
        peak: 'Cranes, flying south across the sun.',
        near: 'A V of cranes, nearly at the sun.',
        after: 'The cranes, off somewhere warm.',
        idle: 'Cranes, flying in a V.',
      },
      sounds: [[-1.2, 'flap'], [0.2, 'aww']],
    },
    wrongWay: {
      tags: ['air', 'animal', 'oops'],
      captions: {
        peak: 'One crane, going the wrong way.',
        near: 'One crane, having second thoughts.',
        after: 'The lost crane, catching up.',
        idle: 'Cranes, flying in a V.',
      },
      sounds: [[-1.2, 'flap'], [0.1, 'gasp'], [1.9, 'flap']],
    },
  },
  create({ slot, group, evening, outcome, peak }) {
    const dir = evening.chance(0.5) ? 1 : -1;
    const z = slot.z;
    const size = 1.1;
    const birds = [];
    // The leader, then the upper and lower arms of the V.
    const spots = [[0, 0]];
    for (let k = 1; k <= ARM; k++) for (const a of [1, -1]) spots.push([k, a]);
    for (const [k, a] of spots) {
      const b = makeCraneBird();
      b.group.scale.set(dir * size, size, 1);
      group.add(b.group);
      birds.push({ ...b, k, a, phase: evening.range(0, Math.PI * 2) - k * 0.5, home: vec(-dir * k * DX, a * k * DY, 0) });
    }
    // Shift so the V's middle (not its leader) is what crosses the sun.
    const mid = birds.reduce((m, b) => m.add(b.home), vec()).multiplyScalar(1 / birds.length);
    for (const b of birds) b.home.sub(mid);
    const stray = outcome === 'wrongWay' ? evening.pick(birds.filter((b) => b.k === ARM)) : null;

    // Where the sun's centre is, seen from the seats, at the V's depth.
    const sun = sunCentre(peak);
    const k = (EYE.z - z) / (EYE.z - sun.z);
    const cx = EYE.x + (sun.x - EYE.x) * k;
    let cy = EYE.y + (sun.y - EYE.y) * k;
    // Keep the lower arm above the house row, and above the apartment if the sun is behind it.
    const A = LAYOUT.apartment;
    const behindFlats = Math.abs(cx - A.x) < A.w / 2 + 1.5;
    cy = Math.max(cy, behindFlats ? 7.6 : 6.0);

    const dur = 1.0;
    const speed = 1.4;
    const centre = vec();

    /** How far the stray has fallen behind its place in the V, and which way it faces. */
    const straying = (p) => {
      if (p < -1.0) return { d: 0, face: dir, lift: 0 };
      if (p < -0.3) return { d: 0.5 * smooth(seg(p, -1.0, -0.3)), face: dir, lift: 0 };
      if (p < dur + 0.3) return { d: 0.5 + 1.7 * (p + 0.3), face: -dir, lift: 0.35 * smooth(seg(p, -0.3, 0.4)) };
      const out = 0.5 + 1.7 * (dur + 0.6);
      if (p < dur + 0.8) {
        // Hovers, looks both ways…
        const look = p < dur + 0.55 ? -dir : dir;
        return { d: out + speed * (p - dur - 0.3), face: look, lift: 0.35 };
      }
      // …and flaps hard to catch up.
      const back = out + speed * 0.5;
      return { d: back * (1 - smooth(seg(p, dur + 0.8, dur + 4.2))), face: dir, lift: 0.35 * (1 - smooth(seg(p, dur + 0.8, dur + 4.2))) };
    };

    return {
      focus: () => birds.map((b) => b.group),
      x: () => centre.x,
      visible: () => Math.abs(centre.x) < 17,
      update(p, { wall }) {
        centre.set(cx + dir * speed * (p - dur / 2), cy + Math.sin(wall * 0.6) * 0.08, z);
        for (const b of birds) {
          const pos = b.group.position;
          pos.copy(centre).add(b.home);
          pos.y += Math.sin(wall * 2.2 + b.phase) * 0.04;
          let face = dir;
          let beat = 4.2;
          if (b === stray) {
            const s = straying(p);
            pos.x -= dir * s.d;
            pos.y += b.a * s.lift;
            face = s.face;
            // Flapping harder while it's lost and while it hurries back.
            beat = lerp(4.2, 7, window01(p, -0.3, dur + 3.5, 0.3));
          }
          b.group.scale.x = face * size;
          b.group.rotation.z = face * Math.sin(wall * 1.1 + b.phase) * 0.04;
          b.flap(Math.sin(wall * beat + b.phase));
        }
      },
    };
  },
});
