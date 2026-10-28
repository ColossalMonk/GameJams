import { defineStory } from '../Story.js';
import { makePlane } from '../../characters/Props.js';

/** Rare: a paper plane comes across the street and loops the loop. */
export default defineStory({
  id: 'paperPlane',
  slot: 'lowsky',
  rarity: 'rare',
  window: [3.0, 15.0],
  dur: 0.9,
  outcomes: {
    main: {
      tags: ['air'],
      captions: {
        peak: 'A paper plane, mid-loop.',
        near: 'A paper plane, coming round.',
        after: 'A paper plane, gone with the wind.',
        idle: 'A paper plane, passing through.',
      },
    },
  },
  create({ slot, group, evening }) {
    const plane = makePlane();
    plane.scale.setScalar(1.3);
    group.add(plane);
    const dur = 0.9;
    const speed = 3.2;
    const radius = 0.8;
    const loopX = evening.range(-6, 6);
    const loopY = slot.y + evening.range(-0.8, 0.8);
    return {
      focus: () => [plane],
      x: () => plane.position.x,
      update(p, { wall }) {
        let x;
        let y;
        let angle = 0;
        if (p < 0) {
          x = loopX + speed * p;
          y = loopY + Math.sin(wall * 3) * 0.12;
        } else if (p < dur) {
          angle = (p / dur) * Math.PI * 2;
          x = loopX + radius * Math.sin(angle);
          y = loopY + radius * (1 - Math.cos(angle));
        } else {
          x = loopX + speed * (p - dur);
          y = loopY + Math.sin(wall * 3) * 0.12;
        }
        plane.position.set(x, y, slot.z);
        plane.rotation.z = angle;
      },
    };
  },
});
