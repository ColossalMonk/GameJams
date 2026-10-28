import { defineStory } from '../Story.js';
import { seg, smooth, easeOut } from '../anim.js';

/** A cat on the garden wall: a huge yawn, or a long stare straight at the camera. */
export default defineStory({
  id: 'cat',
  slot: 'wall',
  window: [1.4, 3.6],
  dur: 0.8,
  cast: { cat: { kind: 'cat' } },
  outcomes: {
    main: {
      tags: ['animal'],
      captions: {
        peak: '{cat}, mid-yawn.',
        near: '{cat}, almost yawning.',
        after: '{cat}, back to not caring.',
        idle: '{cat}, unbothered by the sun.',
      },
    },
    alt: {
      tags: ['animal'],
      captions: {
        peak: '{cat}, staring straight at you.',
        near: '{cat} has noticed you.',
        after: '{cat}, still judging you.',
        idle: '{cat}, unbothered by the sun.',
      },
    },
  },
  create({ slot, cat: makeCat, add }) {
    const cat = makeCat('cat');
    cat.root.scale.setScalar(0.85);
    add(cat.root, slot.x, slot.y, slot.z);
    const dur = 0.8;
    return {
      focus: () => [cat.root],
      update(p, { wall, outcome }) {
        const build = smooth(seg(p, -1.0, 0));
        const sway = Math.sin(wall * 1.7) * 0.25;
        if (outcome === 'alt') {
          const stare = p < 0 ? 0 : easeOut(seg(p, 0, 0.2)) * (1 - smooth(seg(p, dur + 1.5, dur + 2.2)));
          cat.pose({ stare, sway, head: build * 0.12 * (1 - stare) });
          return;
        }
        const open = p < 0 ? 0 : p < dur ? easeOut(seg(p, 0, 0.25)) : 1 - smooth(seg(p, dur, dur + 0.5));
        cat.pose({
          stretch: build * (1 - seg(p, dur, dur + 0.6)),
          yawn: open,
          sway,
          head: open * 0.12 + Math.sin(wall * 0.7) * 0.05,
        });
      },
    };
  },
});
