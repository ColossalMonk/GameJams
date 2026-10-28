import { defineStory } from '../Story.js';
import { makeBalloon } from '../../characters/Props.js';
import { sunCentre } from '../../world/Sky.js';

/** Rare: a hot-air balloon drifts right across the face of the sun. */
export default defineStory({
  id: 'balloon',
  slot: 'sky',
  rarity: 'rare',
  window: [6.0, 13.5],
  dur: 1.4,
  outcomes: {
    main: {
      tags: ['air'],
      captions: {
        peak: 'A balloon, crossing the sun.',
        near: 'A balloon, almost in front of the sun.',
        after: 'A balloon, drifting off somewhere nice.',
        idle: 'A balloon, drifting by.',
      },
    },
  },
  create({ slot, group, peak }) {
    const balloon = makeBalloon();
    group.add(balloon);
    const dur = 1.4;
    // The sun's position at the peak never changes during a run, so look it up once.
    const sun = sunCentre(peak);
    return {
      focus: () => [balloon],
      x: () => balloon.position.x,
      update(p, { wall }) {
        balloon.position.set(sun.x + (p - dur / 2) * 1.0, sun.y - 1.25 + Math.sin(wall * 0.7) * 0.12, slot.z);
        balloon.rotation.z = Math.sin(wall * 0.9) * 0.04;
      },
    };
  },
});
