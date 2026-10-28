import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, easeOut, lerp, vec } from '../anim.js';
import { card } from '../../world/paper.js';
import { teardrop } from '../../world/shapes.js';

const COLOURS = ['#ffd27a', '#ff7a8a', '#9fd3c7', '#fff1cf', '#c9a4ff'];

/** Rare: someone sets the fireworks off early, behind the houses. */
export default defineStory({
  id: 'fireworks',
  slot: 'farsky',
  rarity: 'rare',
  window: [13.2, 16.6],
  dur: 1.0,
  outcomes: {
    main: {
      tags: ['air', 'joy'],
      captions: {
        peak: 'Someone started the fireworks early.',
        near: 'A rocket, going up.',
        after: 'Fireworks, fading into the glow.',
        idle: 'Fireworks, fading into the glow.',
      },
    },
  },
  create({ slot, group, evening, particles }) {
    const rocketMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1cf').multiplyScalar(2) });
    const rocket = card(teardrop(0.07, 0.3), null, { depth: 0.01, material: rocketMat, shadows: false });
    rocket.visible = false;
    group.add(rocket);
    // Invisible target the size of a burst, so the photo can be scored.
    const burst = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ visible: false }));
    group.add(burst);
    const dur = 1.0;
    const x = evening.range(-1.5, 5.5);
    const y = slot.y + evening.range(-0.5, 0.9);
    const colours = [evening.pick(COLOURS), evening.pick(COLOURS)];
    burst.position.set(x + 0.5, y + 0.3, slot.z);
    let first = false;
    let second = false;
    const spawnBurst = (bx, by, colour) => {
      const at = vec(bx, by, slot.z + 0.2);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const sp = 2.2 + Math.random() * 0.6;
        particles.spawn('spark', at, vec(Math.cos(a) * sp, Math.sin(a) * sp, 0), { life: 1.4, scale: 1.2, color: colour });
      }
    };
    return {
      focus: () => [burst],
      x: () => burst.position.x,
      visible: (p) => p > -0.8 && p < dur + 1.5,
      update(p) {
        rocket.visible = p > -0.8 && p < 0;
        if (rocket.visible) {
          const u = seg(p, -0.8, 0);
          rocket.position.set(x + Math.sin(u * 6) * 0.05, lerp(2.4, y, easeOut(u)), slot.z);
        }
        if (p >= 0 && !first) {
          first = true;
          spawnBurst(x, y, colours[0]);
        }
        if (p >= 0.45 && !second) {
          second = true;
          spawnBurst(x + 1.1, y + 0.6, colours[1]);
        }
      },
    };
  },
});
