import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, arc, window01, vec } from '../anim.js';
import { makeUfo } from '../props/d-props.js';

const ALIENS = ['#8fd16a', '#9ad8c8', '#c9a4ff'];
const LIGHTS = ['#7affc8', '#ffd27a', '#ff7aa8', '#8ad8ff'];

/** Legendary: a little flying saucer comes down to watch the sun go, like everyone else. */
export default defineStory({
  id: 'ufo',
  slot: 'sky',
  rarity: 'legendary',
  window: [7.0, 14.0],
  dur: 1.0,
  outcomes: {
    main: {
      tags: ['air', 'joy'],
      captions: {
        peak: 'Someone came a long way to see this.',
        near: 'Something, coming down for a better look.',
        after: 'A UFO, watching the sun with everyone.',
        idle: 'A light in the sky, coming closer.',
      },
    },
    photo: {
      tags: ['air'],
      captions: {
        peak: 'The UFO took your photo first.',
        near: 'The alien, getting its camera out.',
        after: 'The alien, checking how you came out.',
        idle: 'A light in the sky, coming closer.',
      },
    },
  },
  create({ slot, group, evening, outcome, particles }) {
    const ship = makeUfo({ alien: evening.pick(ALIENS), light: evening.pick(LIGHTS) });
    ship.group.scale.setScalar(1.6);
    group.add(ship.group);

    const dur = 1.0;
    const leave = dur + 1.8;
    const from = evening.chance(0.5) ? 1 : -1;
    // Clear of the apartment block, where rooftop stories stand.
    const left = evening.range(-9, -6);
    const right = evening.range(-0.8, 8);
    const hx = evening.chance(0.3) ? left : right;
    const hy = slot.y + evening.range(-0.4, 0.8);
    const z = slot.z;
    const photo = outcome === 'photo';
    const flashes = [0.05, 0.6];
    const flashed = [false, false];
    const at = vec();
    let gone = false;

    return {
      focus: () => [ship.group],
      x: () => ship.group.position.x,
      visible: (p) => p > -2.0 && p < leave + 0.38,
      update(p, { wall }) {
        const land = easeOut(seg(p, -2.4, -0.3));
        const lift = easeIn(seg(p, leave, leave + 0.6));
        ship.group.visible = p > -2.4 && p < leave + 0.7;
        const hover = Math.sin(wall * 1.7) * 0.06 * land;
        ship.group.position.set(hx + from * 3 * (1 - land), hy + 9 * (1 - land) + 14 * lift + hover, z);
        ship.group.rotation.z = from * 0.18 * (1 - land) + Math.sin(wall * 1.2) * 0.04;

        // Lights chase round the rim on the way down, all on for the peak and the getaway.
        const chase = Math.floor(wall * 10) % ship.lights.length;
        const steady = Math.max(window01(p, 0, dur, 0.15) * (0.8 + 0.2 * Math.sin(wall * 6)), smooth(seg(p, leave - 0.4, leave)) * 1.4);
        ship.lights.forEach((mat, i) => {
          const level = Math.max(i === chase ? 1 : 0.15, steady);
          mat.color.copy(ship.light).multiplyScalar(0.4 + 2.4 * level);
        });

        if (!photo) {
          const wave = smooth(seg(p, -0.25, 0)) * (1 - smooth(seg(p, leave - 0.5, leave - 0.1)));
          ship.armR.rotation.z = (Math.PI - 0.85 + Math.sin(wall * 11) * 0.35) * wave;
          ship.armL.rotation.z = -0.15;
        } else {
          const raise = smooth(seg(p, -0.45, -0.1));
          ship.camera.position.y = lerp(0.05, 0.34, raise);
          ship.armL.rotation.z = (Math.PI - 0.5) * raise;
          ship.armR.rotation.z = -(Math.PI - 0.5) * raise;
          ship.print.position.y = lerp(-0.02, 0.13, smooth(seg(p, 0.85, 1.4)));
          let k = 0;
          flashes.forEach((ft, i) => {
            k = Math.max(k, arc(seg(p, ft, ft + 0.25), 1));
            if (p >= ft && !flashed[i]) {
              flashed[i] = true;
              ship.group.updateMatrixWorld(true);
              ship.flash.getWorldPosition(at);
              at.z += 0.2;
              for (let j = 0; j < 10; j++) {
                const a = (j / 10) * Math.PI * 2 + Math.random() * 0.3;
                const sp = 1.8 + Math.random() * 0.8;
                particles.spawn('spark', at, vec(Math.cos(a) * sp, Math.sin(a) * sp, 0), { life: 0.45, scale: 1.3, color: '#ffffff' });
              }
            }
          });
          ship.flash.visible = k > 0.01;
          ship.flash.scale.setScalar(Math.max(0.001, k * 1.6));
        }

        // A puff of light underneath as it shoots off.
        if (p >= leave && !gone) {
          gone = true;
          at.set(ship.group.position.x, ship.group.position.y - 0.3, z + 0.3);
          for (let j = 0; j < 8; j++) {
            particles.spawn('spark', at, vec((Math.random() - 0.5) * 2.4, -0.4 - Math.random(), 0), { life: 0.6, scale: 1.1, color: `#${ship.light.getHexString()}` });
          }
        }
      },
    };
  },
});
