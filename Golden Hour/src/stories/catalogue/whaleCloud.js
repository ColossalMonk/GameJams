import { defineStory } from '../Story.js';
import { seg, smooth, window01, vec } from '../anim.js';
import { makeWhaleCloud } from '../props/d-props.js';
import { sunCentre } from '../../world/Sky.js';

const LOOKS = [
  { body: '#fff4e4', belly: '#fffaf2', fin: '#ecdccb' },
  { body: '#eef0f8', belly: '#f8f9ff', fin: '#d8dbec' },
  { body: '#f8e9ee', belly: '#fff5f7', fin: '#e8d2da' },
];

/** Legendary: a cloud shaped exactly like a whale swims across the sky, and spouts. */
export default defineStory({
  id: 'whaleCloud',
  slot: 'sky',
  rarity: 'legendary',
  window: [5.0, 14.0],
  dur: 1.2,
  outcomes: {
    main: {
      tags: ['air'],
      captions: {
        peak: 'A cloud, shaped exactly like a whale.',
        near: 'That cloud is taking a deep breath.',
        after: 'The whale cloud, drifting on, pleased.',
        idle: 'That cloud looks a bit like a whale.',
      },
    },
    sun: {
      tags: ['air'],
      captions: {
        peak: 'The whale cloud, crossing the sun.',
        near: 'A whale cloud, swimming toward the sun.',
        after: 'The whale cloud, swimming into the glow.',
        idle: 'That cloud looks a bit like a whale.',
      },
    },
  },
  create({ slot, group, evening, outcome, peak, particles }) {
    const whale = makeWhaleCloud(evening.pick(LOOKS));
    group.add(whale.group);

    const dur = 1.2;
    const speed = 0.45;
    const dir = evening.chance(0.5) ? 1 : -1;
    const z = evening.range(-10.2, -9.3);
    const crossing = outcome === 'sun';
    // The sun's position at the peak never changes during a run, so look it up once.
    const sun = sunCentre(peak);
    let cx;
    let y;
    if (crossing) {
      cx = sun.x;
      y = Math.max(sun.y + 0.4, 6.9) + evening.range(0, 0.5);
    } else {
      // Well clear of the sun, so the spout reads against plain sky.
      const side = sun.x > 1 ? -1 : 1;
      cx = sun.x + side * evening.range(6, 8.5);
      y = slot.y + evening.range(0.2, 1.3);
    }
    const hole = vec();
    let nextPuff = 0;

    return {
      focus: () => [whale.body],
      x: () => whale.group.position.x,
      visible: () => Math.abs(whale.group.position.x) < 18.5,
      update(p, { wall }) {
        const breathe = smooth(seg(p, -0.7, -0.05)) * (1 - smooth(seg(p, 0, 0.3)));
        const spout = crossing ? 0 : window01(p, 0, 0.8, 0.25);
        whale.group.position.set(cx + dir * speed * (p - dur / 2), y + Math.sin(wall * 0.5) * 0.08, z);
        whale.group.rotation.z = dir * (Math.sin(wall * 0.4) * 0.02 + 0.05 * spout - 0.02 * breathe);
        whale.group.scale.set(dir, 1 + 0.04 * breathe, 1);
        whale.eye.scale.y = 1 - 0.75 * spout;
        whale.flipper.rotation.z = 2.5 + Math.sin(wall * 0.9) * 0.08;
        whale.rim(crossing ? smooth(seg(p, -0.8, 0)) * (1 - smooth(seg(p, dur, dur + 0.9))) : 0);

        if (!crossing && p >= 0 && p < 0.75 && wall >= nextPuff) {
          nextPuff = wall + 0.07;
          whale.group.updateMatrixWorld(true);
          whale.group.localToWorld(hole.copy(whale.blowhole));
          hole.z += 0.15;
          for (const s of [-1, 1]) {
            particles.spawn('puff', hole, vec(s * (0.4 + Math.random() * 0.5), 2.6 + Math.random() * 0.8, 0), { life: 1.5, scale: 0.7 + Math.random() * 0.5, color: '#ffffff' });
          }
        }
      },
    };
  },
});
