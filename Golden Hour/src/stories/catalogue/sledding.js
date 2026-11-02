import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, arc, vec } from '../anim.js';
import { hillHeight } from '../../world/Town.js';
import { makeSled } from '../props/h-props.js';

const slope = (x) => Math.atan((hillHeight(x + 0.05) - hillHeight(x - 0.05)) / 0.1);

/** Someone finally sleds down the grassy hill on a flattened box. All the way. Or not quite. */
export default defineStory({
  id: 'sledding',
  slot: 'hill',
  window: [3.0, 13.5],
  dur: 0.9,
  cast: { rider: {} },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{rider}, gliding to the bottom, arms up!',
        near: '{rider}, picking up speed.',
        after: '{rider}, already planning another go.',
        idle: '{rider}, working up the courage.',
      },
      sounds: [[-1.4, 'swish'], [0, 'cheer']],
    },
    tumble: {
      tags: ['oops', 'falling'],
      captions: {
        peak: '{rider}, head over heels down the hill.',
        near: '{rider}, picking up speed.',
        after: '{rider}, okay. Mostly.',
        idle: '{rider}, working up the courage.',
      },
      sounds: [[-0.3, 'gasp'], [0.35, 'thud'], [1.4, 'laugh']],
    },
  },
  create({ slot, person, group, outcome, particles }) {
    const z = slot.z + 0.1;
    const x0 = slot.x - 0.1;
    // The box, side-on, tilted to the slope. The rider sits in a pivot of their own, so a
    // tumble can spin them around the middle.
    const rig = new THREE.Group();
    rig.add(makeSled());
    group.add(rig);
    const spin = new THREE.Group();
    group.add(spin);
    const rider = person('rider', 0, 0, 0, 'R');
    spin.add(rider.root);
    rider.root.position.set(0, -0.45, 0);
    const seat = vec(0.05, 0.26, 0.06);
    const seatAt = vec();
    const lying = vec();
    const tumbles = outcome === 'tumble';
    const dur = 0.9;
    let lastPuff = -1;

    // Down the slope, a little faster all the way; then (main) the long glide to a stop.
    const slide = (p) => {
      const q = seg(p, -1.4, 0);
      return x0 - 3.5 * (0.72 * q + 0.28 * q * q);
    };
    const glide = (p) => (p < 0 ? slide(p) : 6.0 - 2.1 * easeOut(seg(p, 0, 1.3)));
    // The tumble: off the box at a bump, three hops, and a heap at the bottom.
    const launch = -0.3;
    const xL = slide(launch);
    const tumbleX = (p) => lerp(xL, 4.2, easeOut(seg(p, launch, 1.2)));
    const hops = (p) => arc(seg(p, launch, 0.35), 1.0) + arc(seg(p, 0.35, 0.75), 0.4) + arc(seg(p, 0.75, 1.05), 0.15);

    const seated = (wall, cheer) => ({
      bob: -0.42,
      legL: 1.45,
      legR: -1.3,
      armL: cheer ? 2.7 + Math.sin(wall * 9) * 0.12 : 0.9,
      armR: cheer ? 2.7 - Math.sin(wall * 9) * 0.12 : -0.5,
      mouth: cheer ? 1 : 0.35,
    });

    return {
      focus: () => (tumbles ? [spin] : [rig, spin]),
      x: () => spin.position.x,
      update(p, { wall }) {
        // ── The box ──
        let sx = glide(p);
        let lift = 0;
        let flip = 0;
        if (tumbles && p > launch) {
          // Kicked up and over, then it slides on by itself.
          lift = arc(seg(p, launch, 0.4), 0.55);
          flip = Math.PI * 2 * smooth(seg(p, launch, 0.4));
          sx = p < 0 ? slide(p) : 6.0 - 2.3 * easeOut(seg(p, 0, 1.3));
        }
        const rock = p > -1.6 && p < -1.4 ? Math.sin(wall * 14) * 0.05 : 0;
        rig.position.set(sx, hillHeight(sx) + lift, z);
        rig.rotation.z = slope(sx) + flip + rock;
        rig.updateMatrixWorld(true);

        // Bits of grass flicking up behind a fast box.
        if (p > -1.0 && p < (tumbles ? launch : 1.0) && wall - lastPuff > 0.09) {
          lastPuff = wall;
          particles.spawn('puff', vec(sx + 0.55, hillHeight(sx + 0.55) + 0.05, z + 0.1), vec(0.6 + Math.random() * 0.4, 0.5 + Math.random() * 0.5, 0), { life: 0.5, scale: 0.25, color: '#a3c27c' });
        }

        // ── The rider ──
        rig.localToWorld(seatAt.copy(seat));
        if (!tumbles || p < launch) {
          spin.position.copy(seatAt);
          spin.rotation.z = rig.rotation.z;
          const cheer = p > -0.1 && p < dur + 1.2;
          const nerves = p > -1.6 && p < -1.0;
          rider.pose({ ...seated(wall, cheer), head: nerves ? Math.sin(wall * 12) * 0.05 : 0, eyes: nerves ? 1.3 : cheer ? 0.25 : 1, mouth: nerves ? 0.6 : seated(wall, cheer).mouth });
          return;
        }
        const x = tumbleX(p);
        lying.set(x, hillHeight(x) + 0.45 + hops(p), z);
        spin.position.lerpVectors(seatAt, lying, smooth(seg(p, launch, launch + 0.12)));
        // Two forward rolls, then a quarter more: flat on the back, head downhill.
        const settle = smooth(seg(p, 0.9, 1.2));
        spin.rotation.z = rig.rotation.z * (1 - smooth(seg(p, launch, launch + 0.2))) + (Math.PI * 4.5) * smooth(seg(p, launch, 1.15)) + slope(x) * settle;
        spin.position.y -= 0.25 * settle;
        if (p < 1.0) {
          rider.pose({ bob: -0.15, armL: 2.8, armR: 2.8, legL: 0.5, legR: 0.5, mouth: 1, eyes: 1.3 });
        } else {
          // Lying with the left side down: the right arm comes up to say "I'm okay".
          const okay = p > dur + 1.0;
          rider.pose({ armL: 0.1, armR: okay ? 2.6 + Math.sin(wall * 6) * 0.25 : 1.5, legL: 0, legR: 0.4, head: Math.sin(wall * 4) * 0.08, eyes: okay ? 1 : 0.35, mouth: okay ? 0.3 : 0.6 });
        }
      },
    };
  },
});
