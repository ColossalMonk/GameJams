import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';
import { makeRingBox } from '../../characters/Props.js';

/** Down on one knee on the pavement. A yes — or it turns out they both brought rings. */
export default defineStory({
  id: 'proposal',
  slot: 'pavement',
  window: [10.2, 13.8],
  dur: 0.8,
  cast: { asker: {}, answer: {} },
  outcomes: {
    main: {
      tags: ['love', 'joy', 'finally'],
      captions: {
        peak: '{answer} said yes.',
        near: '{asker}, down on one knee.',
        after: '{answer} and {asker}, engaged at the end of the world.',
        idle: '{answer} and {asker}, out for a walk.',
      },
    },
    alt: {
      tags: ['love', 'joy'],
      captions: {
        peak: 'They both brought rings.',
        near: '{asker}, down on one knee. {answer}, reaching for a pocket.',
        after: '{answer} and {asker}, twice engaged.',
        idle: '{answer} and {asker}, out for a walk.',
      },
    },
  },
  create({ slot, person, group, particles }) {
    const jo = person('asker', slot.x - 0.45, 0, slot.z, 'L');
    const sam = person('answer', slot.x + 0.45, 0, slot.z, 'R');
    const ring = makeRingBox();
    const ring2 = makeRingBox();
    group.add(ring, ring2);
    const between = vec(slot.x, 1.7, slot.z + 0.2);
    const dur = 0.8;
    let hearts = false;

    return {
      focus: () => [jo.root, sam.root],
      update(p, { wall, outcome }) {
        const alt = outcome === 'alt';
        const kneel = smooth(seg(p, -1.6, -0.9)) * (1 - smooth(seg(p, dur + 0.6, dur + 1.3)));
        const offer = smooth(seg(p, -1.0, -0.6)) * (1 - smooth(seg(p, dur + 0.6, dur + 1.0)));
        const counter = alt ? smooth(seg(p, -0.7, -0.3)) * (1 - smooth(seg(p, 0, 0.15))) : 0;
        const hug = smooth(seg(p, dur + 0.9, dur + 1.6));
        const chat = p < -1.6 ? Math.sin(wall * 2.2) * 0.08 : 0;
        jo.pose({ bob: -0.3 * kneel, legL: 0.6 * kneel, legR: 0.15 * kneel, armR: 1.3 * offer + 0.6 * hug, lean: -0.15 * hug, head: chat, mouth: 0.35 });
        const surprised = smooth(seg(p, -0.9, -0.4));
        const jumpU = seg(p, 0, 0.5);
        const yes = p >= 0 && p < dur + 0.6;
        const toCheeks = lerp(0.2, 2.75, surprised) * (1 - hug);
        sam.pose({
          bob: yes ? 0.25 * Math.sin(Math.PI * jumpU) : 0,
          armL: yes ? 3.0 : alt ? lerp(toCheeks, 1.3, counter) + 0.6 * hug : toCheeks + 0.6 * hug,
          armR: yes ? 3.0 : toCheeks + 0.3 * hug,
          lean: 0.15 * hug,
          head: -chat,
          mouth: yes ? 1 : 0.35 + 0.55 * surprised,
        });

        jo.root.updateMatrixWorld(true);
        sam.root.updateMatrixWorld(true);
        ring.visible = p > -1.0 && p < dur + 0.8;
        jo.hand('R', ring.position);
        ring.position.z += 0.08;
        ring.position.y += 0.04;
        ring2.visible = alt && p > -0.6 && p < 0.1;
        sam.hand('L', ring2.position);
        ring2.position.z += 0.08;
        ring2.position.y += 0.04;
        if (p >= 0 && !hearts) {
          hearts = true;
          for (let i = 0; i < (alt ? 12 : 6); i++) {
            particles.spawn('heart', between, new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 0.8, 0.1), { life: 1.6, scale: 0.8 + Math.random() * 0.6 });
          }
        }
      },
    };
  },
});
