import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, vec } from '../anim.js';
import { makeHardHat, wearHat, makeFlask, makeSandwich, makeGull } from '../props/b-props.js';

const BEAM = 3.62;
const GRAVITY = 9.8;

/** Lunch on the top beam, legs dangling: a toast to the sun, or a gull takes the sandwich. */
export default defineStory({
  id: 'beamLunch',
  slot: 'site',
  window: [3.0, 12.0],
  dur: 0.8,
  cast: { a: { dress: false, look: { top: '#f08a3c' } }, b: { dress: false, look: { top: '#f2c14e' } } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: '{a} and {b}, toasting the sun.',
        near: '{a} and {b}, raising a flask.',
        after: '{a} and {b}, lunch at the top.',
        idle: '{a} and {b}, lunch on a steel beam.',
      },
    },
    gull: {
      tags: ['animal', 'air', 'oops', 'falling'],
      captions: {
        peak: "A gull took {b}'s sandwich.",
        near: "{b}'s sandwich, slipping.",
        after: '{a}, sharing half a sandwich with {b}.',
        idle: '{a} and {b}, lunch on a steel beam.',
      },
    },
  },
  create({ site, person, group, particles, outcome, tonight }) {
    const z = site.z + 0.25;
    const a = person('a', 0, 0, z, 'L');
    const b = person('b', 0, 0, z, 'R');
    wearHat(a, makeHardHat('#fbf6ee'));
    wearHat(b, makeHardHat('#f2c14e'));
    const sandA = makeSandwich();
    const sandB = makeSandwich();
    const flaskA = makeFlask('#5f8fb5');
    const flaskB = makeFlask('#e2574c');
    const gull = makeGull();
    gull.group.scale.set(-1.25, 1.25, 1.25);
    gull.group.visible = false;
    group.add(sandA, sandB, flaskA, flaskB, gull.group);
    const dur = 0.8;
    const release = -0.55;
    const catchAt = 0.05;
    const beak = vec();
    const from = vec();
    const via = vec();
    const to = vec();
    const toG = vec();
    const away = vec();
    let xa = 0;
    let laidOut = false;
    let dropFrom = null;
    let clinked = false;
    let gullOn = false;

    // Laid out on the first frame: leave room for the piano if the crane story is on tonight.
    const layout = () => {
      laidOut = true;
      xa = tonight.includes('cranePiano') ? 2.72 : 1.75;
      for (const [who, x] of [[a, xa], [b, xa + 0.58]]) who.root.position.set(x, BEAM - 0.72 * who.options.height, z);
      // Where {b}'s sandwich will be when the gull gets there.
      b.pose({ armR: 1.3 });
      b.root.updateMatrixWorld(true);
      const t = catchAt - release;
      b.hand('R', to).add(vec(0.25 * t, -0.5 * GRAVITY * t * t, 0.08));
      toG.set(gull.beak.x * 1.25, -gull.beak.y * 1.25, -gull.beak.z * 1.25).add(to);
      from.set(toG.x - 7, 6.2, toG.z);
      via.set(toG.x - 2.4, toG.y - 1.0, toG.z);
      away.set(toG.x + 6, 7.2, toG.z);
    };
    const dangle = (wall, k) => ({ legL: 0.1 + 0.16 * Math.sin(wall * 2.6 + k), legR: 0.1 + 0.16 * Math.sin(wall * 2.6 + k + 1.8) });
    const bite = (wall, k) => (Math.sin(wall * 1.6 + k) > 0.55 ? -2.35 : -0.5);
    const holdAt = (prop, who, side) => {
      who.hand(side, prop.position);
      prop.position.z += 0.08;
    };

    return {
      focus: () => (gullOn ? [a.root, b.root, gull.group] : [a.root, b.root]),
      x: () => xa + 0.3,
      update(p, { wall, dt, outcome: o }) {
        if (!laidOut) layout();
        const sway = Math.sin(wall * 1.1) * 0.03;
        // Sandwiches in the outer hands, flasks in the inner ones.
        let poseA = { lean: sway, armL: bite(wall, 0), armR: 0.25, mouth: 0.4 };
        let poseB = { lean: -sway, armR: bite(wall, 2.4), armL: 0.25, mouth: 0.4 };
        let flasks = false;
        let share = 0;

        if (o === 'main' && p > -1.6) {
          const down = smooth(seg(p, -1.6, -1.3)) * (1 - easeOut(seg(p, -0.9, 0)));
          const up = easeOut(seg(p, -0.9, 0));
          flasks = p > -1.3 && p < dur + 2.5;
          const raise = lerp(lerp(0.25, -0.2, down), 3.08, up) * (1 - smooth(seg(p, dur + 0.8, dur + 1.4))) + 0.25 * smooth(seg(p, dur + 0.8, dur + 1.4));
          const cheer = p >= 0 && p < dur + 0.6;
          poseA = { lean: -0.06 * up + sway, armR: raise, armL: p > dur + 1.4 ? bite(wall, 0) : 0.25, mouth: cheer ? 1 : 0.5, eyes: cheer ? 0.2 : 1 };
          poseB = { lean: 0.06 * up - sway, armL: raise, armR: p > dur + 1.4 ? bite(wall, 2.4) : 0.25, mouth: cheer ? 1 : 0.5, eyes: cheer ? 0.2 : 1 };
          if (p >= 0 && !clinked) {
            clinked = true;
            a.root.updateMatrixWorld(true);
            const at = a.hand('R', vec()).add(vec(0.05, 0.15, 0.1));
            for (let i = 0; i < 9; i++) {
              const ang = (i / 9) * Math.PI * 2;
              particles.spawn('spark', at, new THREE.Vector3(Math.cos(ang) * 1.4, Math.sin(ang) * 1.4 + 0.6, 0), { life: 0.9, scale: 0.8 });
            }
          }
        } else if (o === 'gull' && p > -1.4) {
          const chat = p < release;
          const after = p > dur + 0.8;
          share = smooth(seg(p, dur + 1.2, dur + 1.8));
          poseB = chat
            ? { armR: 1.3 + Math.sin(wall * 9) * 0.5 * (1 - seg(p, -0.9, release)), armL: 0.25, mouth: 0.3 + Math.abs(Math.sin(wall * 14)) * 0.6 }
            : after
              ? { lean: 0.05, armR: 0.2, armL: 0.25 + 0.5 * share, head: 0.25 * (1 - share), mouth: 0.2 + 0.4 * share, eyes: 0.5 + 0.5 * share }
              : { lean: 0.12, armR: 1.6, armL: 1.1, mouth: 1 };
          const laugh = !chat && !after;
          poseA = { lean: sway + (laugh ? Math.sin(wall * 16) * 0.05 : 0), armR: laugh ? 1.5 : lerp(0.25, 1.5, share), armL: share > 0 ? 0.25 : bite(wall, 0), mouth: laugh ? 1 : 0.4, eyes: laugh ? 0.2 : 1 };
        }
        a.pose({ ...poseA, ...dangle(wall, 0) });
        b.pose({ ...poseB, ...dangle(wall, 1.3) });
        a.root.updateMatrixWorld(true);
        b.root.updateMatrixWorld(true);

        flaskA.visible = flaskB.visible = flasks;
        if (flasks) {
          holdAt(flaskA, a, 'R');
          holdAt(flaskB, b, 'L');
          flaskA.rotation.z = -0.2;
          flaskB.rotation.z = 0.2;
        }
        // Half of {a}'s sandwich changes hands once the gull has gone.
        holdAt(sandA, a, share > 0 ? 'R' : 'L');
        sandA.scale.setScalar(share > 0 ? 0.65 : 1);

        // {b}'s sandwich: in hand, then (for the gull) falling, then in the gull's beak.
        sandB.visible = !(o === 'gull' && p >= catchAt + 2.4);
        if (o !== 'gull' || p < release) {
          holdAt(sandB, b, 'R');
          sandB.rotation.z = 0;
        } else if (p < catchAt) {
          if (!dropFrom) dropFrom = sandB.position.clone();
          const t = p - release;
          sandB.position.set(dropFrom.x + 0.25 * t, dropFrom.y - 0.5 * GRAVITY * t * t, dropFrom.z);
          sandB.rotation.z = -t * 9;
        }

        gullOn = o === 'gull' && p > -1.5 && p < catchAt + 2.4;
        gull.group.visible = gullOn;
        if (gullOn) {
          const prev = gull.group.position.clone();
          if (p < catchAt) {
            const u = seg(p, -1.5, catchAt);
            gull.group.position.set(0, 0, 0)
              .addScaledVector(from, (1 - u) * (1 - u))
              .addScaledVector(via, 2 * u * (1 - u))
              .addScaledVector(toG, u * u);
          } else {
            const u = seg(p, catchAt, catchAt + 2.4);
            gull.group.position.set(lerp(toG.x, away.x, u), lerp(toG.y, away.y, easeIn(u)), toG.z);
          }
          const v = gull.group.position.clone().sub(prev);
          const tilt = v.lengthSq() > 1e-8 ? Math.max(-0.6, Math.min(0.6, Math.atan2(v.y, v.x))) : 0;
          gull.group.rotation.z += (tilt - gull.group.rotation.z) * Math.min(1, dt * 8);
          const gliding = p > -0.5 && p < catchAt;
          gull.flap(gliding ? 0.35 : Math.sin(wall * 14));
          if (p >= catchAt) {
            gull.group.updateMatrixWorld(true);
            gull.group.localToWorld(beak.copy(gull.beak));
            sandB.position.copy(beak);
            sandB.position.z += 0.02;
            sandB.rotation.z = gull.group.rotation.z;
          }
        }
      },
    };
  },
});
