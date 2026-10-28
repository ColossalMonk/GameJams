import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, lerp, vec } from '../anim.js';
import { makeCar } from '../../characters/Props.js';

/** An old car at the kerb finally starts. Or backfires, once, and gives up. */
export default defineStory({
  id: 'oldCar',
  slot: 'kerb',
  window: [8.0, 12.0],
  dur: 0.8,
  cast: { driver: { old: true, dress: false } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: '{driver} finally got it running.',
        near: '{driver}, one more try.',
        after: '{driver}, never been happier.',
        idle: '{driver} and a very old car.',
      },
    },
    alt: {
      tags: ['oops'],
      captions: {
        peak: "{driver}'s car, backfiring.",
        near: '{driver}, one more try.',
        after: "{driver}'s car, not today.",
        idle: '{driver} and a very old car.',
      },
    },
  },
  create({ slot, person, add, particles }) {
    const car = makeCar();
    add(car.group, slot.x, 0, slot.z);
    const okafor = person('driver', slot.x - 1.65, 0, slot.z + 0.2, 'L');
    const exhaust = vec();
    const dur = 0.8;
    let burst = false;
    let nextPuff = 0;

    return {
      focus: () => [okafor.root, car.group],
      update(p, { wall, outcome }) {
        const alt = outcome === 'alt';
        const build = seg(p, -1.6, 0);
        const running = p >= 0 && !alt;
        const shake = running ? lerp(0.07, 0.014, seg(p, 0, 1.2)) : p > -1.6 && p < 0 ? 0.035 * build : 0;
        car.body.position.y = shake * Math.abs(Math.sin(wall * 40));
        if (alt && p >= 0) car.body.position.y = 0.16 * Math.sin(Math.PI * seg(p, 0, 0.3));
        car.body.rotation.z = shake * Math.sin(wall * 33) * 0.8;
        car.headlightMat.emissiveIntensity = running ? 2.6 : p > -1.6 && p < 0.25 && Math.sin(wall * 25) > 0.6 ? 0.8 : 0;

        car.group.updateMatrixWorld(true);
        car.body.localToWorld(exhaust.copy(car.exhaust));
        if (p >= 0 && !burst) {
          burst = true;
          const kind = alt ? 'soot' : 'puff';
          for (let i = 0; i < 7; i++) {
            particles.spawn(kind, exhaust, new THREE.Vector3(0.6 + Math.random() * 1.1, 0.2 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3), { life: 1.6, scale: 0.8 + Math.random() * 0.8 });
          }
        } else if (p > -1.6 && (p < 0 || running) && wall > nextPuff) {
          nextPuff = wall + (running ? 0.5 : 0.32);
          particles.spawn('smoke', exhaust, new THREE.Vector3(0.5, 0.15, 0), { life: 1.2, scale: running ? 1.4 : 1 });
        }

        if (p < -1.6) {
          okafor.pose({ armL: 2.75 + Math.sin(wall * 6) * 0.08, armR: 0.45, lean: -0.04, head: 0.1 });
        } else if (p < 0) {
          okafor.pose({ armL: 0.9, armR: 1.25 + Math.sin(wall * 14) * 0.35, lean: -0.12, mouth: 0.2 });
        } else if (alt) {
          const flinch = p < dur;
          okafor.pose({
            armL: flinch ? 2.2 + Math.sin(wall * 20) * 0.3 : p < dur + 2 ? 2.75 : 0.3,
            armR: flinch ? 2.2 - Math.sin(wall * 20) * 0.3 : 0.3,
            bob: flinch ? Math.abs(Math.sin(wall * 12)) * 0.08 : 0,
            lean: flinch ? 0.1 : 0,
            head: !flinch && p < dur + 2 ? Math.sin(wall * 6) * 0.15 : 0,
            mouth: flinch ? 1 : 0.2,
          });
        } else if (p < dur) {
          okafor.pose({ armL: 2.8, armR: 2.8, bob: Math.abs(Math.sin(wall * 9)) * 0.12, mouth: 1 });
        } else {
          okafor.pose({ armL: 0.3, armR: 2.3 + Math.sin(wall * 8) * 0.3, mouth: 0.7 });
        }
      },
    };
  },
});
