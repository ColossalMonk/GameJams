import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { makeHat, makeGuitar } from '../../characters/Props.js';

/** A street musician's last chord flings the hat into the air. It may not come back. */
export default defineStory({
  id: 'musician',
  slot: 'pavement',
  window: [5.2, 9.6],
  dur: 0.7,
  cast: { player: { kid: false } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: "{player}'s last chord.",
        near: '{player}, building up to something.',
        after: '{player}, taking a bow.',
        idle: '{player}, playing for the whole street.',
      },
    },
    alt: {
      tags: ['joy', 'oops'],
      captions: {
        peak: "{player}'s last chord, and the hat.",
        near: '{player}, building up to something.',
        after: "{player}'s hat, gone forever.",
        idle: '{player}, playing for the whole street.',
      },
    },
  },
  create({ slot, person, group }) {
    const lou = person('player', slot.x, 0, slot.z, 'L');
    const guitar = makeGuitar();
    guitar.position.set(0.1, 0.18, 0.08);
    guitar.rotation.z = 0.95;
    lou.hips.add(guitar);
    const hat = makeHat();
    group.add(hat);
    const top = vec();
    const landing = vec(slot.x + 1.5, 0.04, slot.z + 0.5);
    const dur = 0.7;
    const flight = 1.3;
    let from = null;

    return {
      focus: () => [lou.root],
      update(p, { wall, outcome }) {
        const alt = outcome === 'alt';
        const build = seg(p, -1.2, 0);
        const speed = 8 + 8 * build;
        let armR = -0.25 + Math.sin(wall * speed) * 0.18 * (1 + 1.6 * build);
        let lean = -0.06 * build;
        let mouth = 0.35 + 0.3 * build;
        if (p >= 0) {
          const up = easeOut(seg(p, 0, 0.15)) * (1 - smooth(seg(p, dur, dur + 0.6)));
          armR = lerp(-0.25, 2.8, up);
          lean = -0.13 * up;
          mouth = 0.35 + 0.6 * up;
        }
        const bow = !alt && p > dur + 0.6 && p < dur + 2.2 ? Math.sin(Math.PI * seg(p, dur + 0.6, dur + 2.2)) : 0;
        const bareHead = alt && p > flight && p < flight + 2.5;
        lou.pose({
          lean,
          armR,
          armL: bareHead ? 2.75 : 0.75,
          head: Math.sin(wall * 6) * 0.06 * (1 - bow) - bow * 0.25,
          bob: -bow * 0.06,
          mouth: bareHead ? 0.8 : mouth,
        });

        lou.root.updateMatrixWorld(true);
        lou.headTop(top);
        top.y -= 0.06;
        top.z += 0.02;
        const onHead = lou.hips.rotation.z + lou.neck.rotation.z;
        if (p < 0 || !alt) {
          hat.position.copy(top);
          hat.rotation.z = onHead;
          if (p >= 0 && p < flight) {
            const q = p / flight;
            hat.position.y += 4 * q * (1 - q) * 1.2;
            hat.position.x += Math.sin(Math.PI * q) * 0.25;
            hat.rotation.z += q * Math.PI * 4;
          }
        } else {
          from ??= top.clone();
          const q = seg(p, 0, flight);
          hat.position.lerpVectors(from, landing, q);
          hat.position.y += 4 * q * (1 - q) * 1.5;
          hat.rotation.z = q < 1 ? q * Math.PI * 5 : 0.25;
        }
      },
    };
  },
});
