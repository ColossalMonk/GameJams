import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, vec } from '../anim.js';
import { makeCake } from '../../characters/Props.js';

/** Ninety candles at the café table: out in one breath, or trick candles that relight. */
export default defineStory({
  id: 'birthday',
  slot: 'cafe',
  window: [6.2, 10.6],
  dur: 0.8,
  cast: { elder: { old: true }, kid: { kid: true } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: '{elder}, ninety today, every candle in one go.',
        near: '{elder}, taking a deep breath.',
        after: '{elder}, ninety years and one minute.',
        idle: '{elder} and a very large cake.',
      },
    },
    alt: {
      tags: ['joy', 'oops'],
      captions: {
        peak: '{elder} vs. trick candles.',
        near: '{elder}, taking a deep breath.',
        after: '{elder} won, eventually.',
        idle: '{elder} and a very large cake.',
      },
    },
  },
  create({ slot, person, add, particles }) {
    const rosa = person('elder', slot.x - 0.38, 0, slot.z - 0.5, 'L');
    const pip = person('kid', slot.x + 0.82, 0, slot.z - 0.1, 'R');
    const cake = makeCake();
    add(cake.group, slot.x + 0.05, 0.82, slot.z - 0.05);
    const pos = vec();
    const dur = 0.8;
    const relight = 0.45;
    const secondBlow = 1.35;
    let blown = false;
    let blownAgain = false;
    const smoke = () => {
      for (const f of cake.flames) {
        f.getWorldPosition(pos);
        particles.spawn('smoke', pos, new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.5, 0), { life: 1.8 });
      }
    };

    return {
      focus: () => [rosa.root, cake.group],
      update(p, { wall, outcome }) {
        const alt = outcome === 'alt';
        const lit = p < 0 || (alt && p > relight && p < secondBlow);
        cake.flames.forEach((f, i) => {
          f.visible = lit;
          f.scale.set(1 + Math.sin(wall * 23 + i * 2) * 0.12, 1 + Math.sin(wall * 17 + i) * 0.15, 1);
        });
        if (p >= 0 && !blown) {
          blown = true;
          smoke();
        }
        if (alt && p >= secondBlow && !blownAgain) {
          blownAgain = true;
          smoke();
        }
        let leanIn = smooth(seg(p, -1.0, -0.15)) * (1 - smooth(seg(p, 0.15, 0.8)));
        if (alt) leanIn = Math.max(leanIn, smooth(seg(p, 0.8, 1.25)) * (1 - smooth(seg(p, 1.4, 1.9))));
        const cheerFrom = alt ? secondBlow : 0;
        const cheer = p >= cheerFrom && p < cheerFrom + dur + 1.2;
        const shocked = alt && p > relight && p < 0.8;
        const clap = Math.abs(Math.sin(wall * 10)) * 0.3;
        const arms = cheer ? (p < cheerFrom + dur ? 2.4 : 0.6 + clap) : shocked ? 1.2 : 0.2;
        rosa.pose({
          lean: -0.3 * leanIn + Math.sin(wall * 0.9) * 0.02,
          head: -0.15 * leanIn,
          armL: arms,
          armR: arms,
          mouth: shocked ? 1 : p < 0 || leanIn > 0.3 ? 0.35 + 0.6 * leanIn : 0.7,
        });
        const kidCheer = cheer || shocked;
        pip.pose({
          bob: kidCheer ? Math.abs(Math.sin(wall * 10)) * 0.12 : Math.abs(Math.sin(wall * 4)) * 0.03,
          armL: kidCheer ? 2.7 : 0.3,
          armR: kidCheer ? 2.7 : 0.3,
          mouth: kidCheer ? 1 : 0.4,
        });
      },
    };
  },
});
