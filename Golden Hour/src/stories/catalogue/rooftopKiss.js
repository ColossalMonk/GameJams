import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';

/** Two people on the rooftop: a kiss against the sun — or they spot you and wave. */
export default defineStory({
  id: 'rooftopKiss',
  slot: 'rooftop',
  window: [11.2, 14.6],
  dur: 0.8,
  cast: { a: {}, b: {} },
  outcomes: {
    main: {
      tags: ['love'],
      captions: {
        peak: '{a} and {b}, on the roof.',
        near: '{a} and {b}, almost.',
        after: '{a} and {b}, watching it come.',
        idle: '{a} and {b}, up on the roof.',
      },
    },
    alt: {
      tags: ['joy'],
      captions: {
        peak: '{a} and {b}, waving at you.',
        near: '{a} and {b}, noticing the camera.',
        after: '{a} and {b}, back to the view.',
        idle: '{a} and {b}, up on the roof.',
      },
    },
  },
  create({ slot, person, particles }) {
    const june = person('a', slot.x - 0.45, slot.y, slot.z, 'L');
    const theo = person('b', slot.x + 0.45, slot.y, slot.z, 'R');
    const above = vec(slot.x, slot.y + 2.0, slot.z + 0.2);
    const dur = 0.8;
    let heart = false;

    return {
      focus: () => [june.root, theo.root],
      update(p, { wall, outcome }) {
        const sway = Math.sin(wall * 1.2) * 0.02;
        if (outcome === 'alt') {
          const wave = p >= 0 && p < dur + 1.2 ? smooth(seg(p, 0, 0.2)) : 0;
          const w = 2.6 + Math.sin(wall * 10) * 0.35;
          june.pose({ lean: sway, armL: lerp(0.2, w, wave), armR: 0.45 * (1 - wave), mouth: 0.35 + 0.6 * wave, head: smooth(seg(p, -1, 0)) * 0.1 });
          theo.pose({ lean: sway, armR: lerp(0.15, w, wave), armL: 0.45 * (1 - wave), mouth: 0.35 + 0.6 * wave, head: -smooth(seg(p, -1, 0)) * 0.1 });
          return;
        }
        const toward = smooth(seg(p, -1.2, 0)) * 0.3 * (1 - 0.6 * smooth(seg(p, dur + 1.2, dur + 2.0)));
        const closed = p >= -0.1 && p < dur + 1.2;
        june.pose({ lean: -toward + sway, head: -toward * 0.4, armR: 0.45, eyes: closed ? 0.15 : 1, mouth: 0.3 });
        theo.pose({ lean: toward + sway, head: toward * 0.4, armL: 0.45, eyes: closed ? 0.15 : 1, mouth: 0.3 });
        if (p >= 0.05 && !heart) {
          heart = true;
          particles.spawn('heart', above, new THREE.Vector3(0, 0.4, 0), { life: 1.8, scale: 1.6 });
        }
      },
    };
  },
});
