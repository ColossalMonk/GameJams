import { defineStory } from '../Story.js';
import { seg, smooth, lerp, arc, vec } from '../anim.js';
import { makeTelescope, makeSparkle } from '../props/e-props.js';
import { sunCentre } from '../../world/Sky.js';

/** Tripod height: tall enough that the eyepiece meets a standing face when aimed high. */
const TRIPOD = 1.9;
/** From the hips' pivot up to the middle of a puppet's head. */
const NECK = 0.88;

/** Someone sets up a telescope on the roof, at last. The first star comes out — or they find you. */
export default defineStory({
  id: 'stargazer',
  slot: 'rooftop',
  window: [4.0, 13.5],
  dur: 1.0,
  cast: { gazer: {} },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{gazer} found the first star.',
        near: '{gazer}, eye to the telescope.',
        after: '{gazer}, pointing out the first star.',
        idle: '{gazer}, setting up a telescope.',
      },
      sounds: [[-1.4, 'swish'], [0, 'chime'], [0.2, 'gasp']],
    },
    you: {
      tags: ['joy'],
      captions: {
        peak: '{gazer} found you instead. Hello!',
        near: '{gazer}, swinging the telescope round.',
        after: '{gazer}, back to the stars.',
        idle: '{gazer}, setting up a telescope.',
      },
      sounds: [[-0.8, 'swish'], [0, 'ding'], [0.2, 'laugh']],
    },
  },
  create({ slot, person, group, evening, outcome, peak, particles }) {
    const y0 = slot.y;
    // The star comes out on whichever side of the roof is further from the sun.
    const s = sunCentre(peak).x > slot.x ? -1 : 1;
    const star = makeSparkle('#fff4c8', 0.3, 3.2);
    star.position.set(slot.x + s * evening.range(1.8, 2.6), y0 + evening.range(3.2, 3.8), slot.z - 2.5);
    star.scale.setScalar(0.001);
    group.add(star);

    const tx = slot.x + s * 0.3;
    const px = tx - s * 0.65;
    const scope = makeTelescope(TRIPOD, evening.pick(['#3f4a6b', '#7a3b3b', '#2f6f6a']));
    scope.group.position.set(tx, y0, slot.z - 0.1);
    group.add(scope.group);
    const gazer = person('gazer', px, y0, slot.z + 0.05, s < 0 ? 'R' : 'L');

    const toStar = Math.atan2(star.position.y - (y0 + TRIPOD), star.position.x - tx);
    // At you: pointing down at the seats, foreshortened to a stub with the lens facing out.
    let swing = -Math.PI / 2 - s * 0.15 - toStar;
    swing = Math.atan2(Math.sin(swing), Math.cos(swing));
    const you = outcome === 'you';
    const dur = 1.0;
    const eye = vec();
    let burst = false;
    let lastP = -99;

    /** Lean (and dip) so the gazer's eye meets the eyepiece. */
    const peer = (k) => {
      scope.group.updateMatrixWorld(true);
      scope.tube.localToWorld(eye.copy(scope.eyepiece));
      const sin = Math.max(-0.6, Math.min(0.6, (px - eye.x + s * 0.12) / NECK));
      const lean = Math.asin(sin);
      const bob = Math.max(-0.14, Math.min(0.06, eye.y - y0 + 0.02 - (0.72 + NECK * Math.cos(lean))));
      return { lean: lean * k, bob: bob * k, head: lean * 0.3 * k };
    };

    return {
      focus: () => (you || lastP < 0 ? [gazer.root, scope.group] : [gazer.root, scope.group, star]),
      x: () => slot.x,
      update(p, { wall }) {
        lastP = p;
        // Aim: hunting about the sky, settling on the star; or swung round to face you.
        let aim = toStar + Math.sin(wall * 0.5) * 0.25 * (1 - smooth(seg(p, -1.6, -1.0)));
        let foreshorten = 0;
        if (you) {
          const turn = smooth(seg(p, -0.9, -0.25)) * (1 - smooth(seg(p, dur + 1.6, dur + 2.4)));
          aim = toStar + swing * turn;
          foreshorten = turn;
        }
        scope.pivot.rotation.z = aim;
        scope.pivot.scale.y = Math.cos(aim) < 0 ? -1 : 1;
        scope.tube.scale.x = lerp(1, 0.28, foreshorten);
        scope.lens.position.x = scope.front * scope.tube.scale.x;
        scope.lens.scale.setScalar(Math.max(0.001, 1.25 * smooth(seg(foreshorten, 0.5, 1))));

        // The star: a glimmer just before the peak, then out it pops, twinkling.
        const shine = you ? 0 : p < 0 ? 0.25 * smooth(seg(p, -0.5, 0)) : 1;
        const twinkle = 1 + 0.2 * Math.sin(wall * 9) + 0.6 * Math.max(0, 1 - p * 3) * (p >= 0 ? 1 : 0);
        star.scale.setScalar(Math.max(0.001, shine * twinkle));
        star.rotation.z = Math.sin(wall * 2) * 0.15;
        if (!you && p >= 0 && !burst) {
          burst = true;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            particles.spawn('spark', star.position, vec(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.2), { life: 0.7, scale: 0.8, color: '#fff4c8' });
          }
        } else if (p < 0) burst = false;

        // The gazer.
        const sway = Math.sin(wall * 1.2) * 0.015;
        const near = s < 0 ? 'armL' : 'armR';
        const far = s < 0 ? 'armR' : 'armL';
        if (!you && p >= 0 && p < dur + 1.4) {
          // Straight up from the eyepiece, pointing at it.
          const up = smooth(seg(p, 0, 0.15));
          const look = peer(1 - up);
          gazer.pose({
            lean: look.lean + sway,
            bob: look.bob + (p < 0.6 ? arc(seg(p, 0.1, 0.5), 0.1) : 0),
            head: look.head - s * 0.14 * up,
            [near]: lerp(0.5, 2.35 + Math.sin(wall * 6) * 0.05, up),
            [far]: lerp(0.3, 1.1, up),
            mouth: 0.95,
            eyes: 1.2,
          });
        } else if (you && p > -0.9 && p < dur + 1.6) {
          // Turns the scope on you, peeks round it, and waves.
          const wave = smooth(seg(p, -0.05, 0.15));
          const peek = smooth(seg(p, -0.6, -0.25)) * (1 - wave);
          gazer.pose({
            lean: -s * 0.12 * peek + sway,
            head: -s * 0.18 * peek,
            [near]: lerp(1.2, 1.0, wave),
            [far]: wave > 0 ? lerp(0.3, 2.6 + Math.sin(wall * 10) * 0.35, wave) : 0.3,
            mouth: wave > 0 ? 0.95 : 0.55,
            eyes: peek > 0.5 ? 1.25 : 1,
          });
        } else {
          // At the eyepiece, a hand on the tube.
          const look = peer(1);
          gazer.pose({ lean: look.lean + sway, bob: look.bob, head: look.head, [near]: 1.05 + Math.sin(wall * 0.5) * 0.08, [far]: 0.3, eyes: 0.5, mouth: p > -0.5 && p < 0 ? 0.5 : 0.35 });
        }
      },
    };
  },
});
