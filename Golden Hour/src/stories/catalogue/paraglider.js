import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { hillHeight } from '../../world/Town.js';
import { sunCentre } from '../../world/Sky.js';
import { makeWing, makeStrings } from '../props/h-props.js';

const WINGS = [['#e2574c', '#f2c14e'], ['#5f8fb5', '#fbf6ee'], ['#9a6fb0', '#f6a5b8'], ['#2f6f6a', '#f2c14e']];
/** Wing above the pilot's feet, when flying. */
const UP = 2.05;

/** A paraglider runs off the hilltop at last: up and away towards the sun, or a wing like a tent. */
export default defineStory({
  id: 'paraglider',
  slot: 'hill',
  window: [3.0, 12.5],
  dur: 0.9,
  cast: { pilot: {} },
  outcomes: {
    main: {
      tags: ['air', 'joy', 'finally'],
      captions: {
        peak: '{pilot}, finally airborne.',
        near: '{pilot}, running off the hill.',
        after: '{pilot}, flying off towards the sun.',
        idle: '{pilot}, waiting for the right wind.',
      },
      sounds: [[-1.0, 'flap'], [0, 'whoosh'], [0.5, 'cheer']],
    },
    flop: {
      tags: ['oops'],
      captions: {
        peak: "{pilot}'s wing, folding up like a tent.",
        near: '{pilot}, running off the hill.',
        after: '{pilot}, sitting under a paper wing.',
        idle: '{pilot}, waiting for the right wind.',
      },
      sounds: [[-1.0, 'flap'], [-0.1, 'aww'], [0.35, 'thud']],
    },
  },
  create({ slot, person, group, evening, outcome, peak }) {
    const z = slot.z + 0.1;
    const xs = slot.x + 0.6;
    const rig = new THREE.Group();
    group.add(rig);
    const pilot = person('pilot', 0, 0, 0, 'L');
    rig.add(pilot.root);
    pilot.root.position.set(0, 0, 0);
    const wing = makeWing(evening.pick(WINGS));
    rig.add(wing.group);
    const lines = makeStrings(6, 1, '#3a3340');
    group.add(lines.lines);
    // Crumple directions for the flop, one per cell.
    const crumple = wing.cells.map(() => evening.range(-0.4, 0.4));
    const flop = outcome === 'flop';
    const dur = 0.9;

    // On the ground: a run down from the top, picking up speed.
    const run = (p) => xs - 1.5 * seg(p, -1.6, 0) ** 1.3;
    const lift = (p) => 1.1 * smooth(seg(p, -0.35, 0.9));
    const P1 = vec();
    const C = vec();
    const T = vec();
    let soaring = false;
    const handL = vec();
    const handR = vec();
    const tie = vec();

    return {
      focus: () => [rig],
      x: () => rig.position.x,
      visible: () => rig.position.y < 10.3 && Math.abs(rig.position.x) < 12.4,
      update(p, { wall }) {
        // ── Where the pilot is ──
        let x;
        let y;
        let s = 1;
        let tilt = 0;
        if (!flop && p >= 0.9) {
          // Up and away over the town, towards the sun, getting smaller.
          if (!soaring) {
            soaring = true;
            const fx = run(0) - 1.1 * 0.9;
            P1.set(fx, hillHeight(run(0)) + lift(0.9), z);
            T.set(THREE.MathUtils.clamp(sunCentre(peak).x, 1.0, 6.5), 6.8, z);
            C.set(P1.x - 1.2, P1.y + 2.4, z);
          }
          const u = seg(p, 0.9, 8.5);
          x = (1 - u) * (1 - u) * P1.x + 2 * u * (1 - u) * C.x + u * u * T.x;
          y = (1 - u) * (1 - u) * P1.y + 2 * u * (1 - u) * C.y + u * u * T.y + Math.sin(wall * 1.1) * 0.08;
          s = lerp(1, 0.7, u);
          tilt = Math.sin(wall * 1.3) * 0.06;
        } else if (!flop) {
          x = p < 0 ? run(p) : run(0) - 1.1 * p;
          y = hillHeight(p < 0 ? x : run(0)) + lift(p);
        } else {
          // The flop: the run peters out and the pilot sits down on the slope.
          x = p < -0.35 ? run(p) : run(-0.35) - 0.3 * easeOut(seg(p, -0.35, 0.3));
          y = hillHeight(x) - 0.03;
          tilt = Math.atan((hillHeight(x + 0.05) - hillHeight(x - 0.05)) / 0.1) * 0.6 * smooth(seg(p, -0.1, 0.35));
        }
        rig.position.set(x, y, z);
        rig.scale.setScalar(s);
        rig.rotation.z = tilt;

        // ── The wing: laid out behind, swung up overhead like a kite, then flying (or not) ──
        const up = smooth(seg(p, -1.6, -0.7));
        const a = lerp(0.12, Math.PI / 2, up);
        const g = wing.group;
        const behind = hillHeight(xs + 1.9) - hillHeight(x) - 0.2;
        g.position.set(1.95 * Math.cos(a), lerp(behind, 0.1, up) + 1.95 * Math.sin(a), -0.05);
        g.rotation.z = (a - Math.PI / 2) * smooth(seg(up, 0.15, 1));
        g.scale.set(1, lerp(0.18, 1, up), 1);
        const c = flop ? smooth(seg(p, -0.4, 0.4)) : 0;
        if (c > 0) {
          // Collapsing down over the pilot's head, like a tent.
          g.position.set(lerp(0, 0.05, c), lerp(UP, 0.5, c), -0.05 + 0.12 * c);
          g.scale.set(lerp(1, 0.85, c), lerp(1, 0.62, c), 1);
          g.rotation.z = Math.sin(wall * 5) * 0.06 * (1 - seg(p, 0.4, 1.0));
        } else if (p > -0.7) g.rotation.z += Math.sin(wall * 2.3) * 0.04;
        wing.cells.forEach((cell, k) => {
          const off = k - (wing.cells.length - 1) / 2;
          cell.pivot.position.copy(cell.home);
          cell.pivot.position.y -= Math.abs(off) * 0.15 * c;
          cell.pivot.rotation.z = (off * 0.35 + crumple[k] * 0.5) * c;
        });

        // ── The pilot ──
        const stride = Math.sin(wall * 14);
        if (p < -1.6) {
          pilot.pose({ armL: 0.5, armR: 0.5 + (Math.sin(wall * 0.8) > 0.6 ? 1.8 : 0), head: 0.1, mouth: 0.35 });
        } else if (p < 0 && !(flop && p > -0.35)) {
          pilot.pose({ lean: 0.15, bob: Math.abs(stride) * 0.05, legL: stride * 0.55, legR: stride * 0.55, armL: 2.3, armR: 2.3, mouth: 0.6, brows: -0.6 });
        } else if (!flop) {
          const pedal = p < 0.3 ? Math.sin(wall * 16) * 0.5 : 0;
          const cheer = p < dur + 0.6;
          pilot.pose({ bob: -0.22 * smooth(seg(p, 0.2, 0.6)), legL: 0.25 + pedal, legR: 0.1 + pedal, armL: 2.45, armR: 2.45 + (cheer ? Math.sin(wall * 8) * 0.15 : 0), mouth: cheer ? 1 : 0.6, eyes: cheer ? 0.3 : 1 });
        } else {
          const sit = smooth(seg(p, -0.1, 0.35));
          const shrug = p > dur + 0.8;
          pilot.pose({
            bob: -0.42 * sit,
            // Legs out down the slope.
            legL: 1.25 * sit,
            legR: -0.9 * sit,
            armL: shrug ? 1.0 : 2.6 + Math.sin(wall * 12) * 0.3 * (1 - sit),
            armR: shrug ? 1.0 : 2.6 - Math.sin(wall * 12) * 0.3 * (1 - sit),
            head: shrug ? 0.15 : 0,
            mouth: shrug ? 0.3 : 0.9,
            eyes: shrug ? 1 : 1.3,
          });
        }

        // ── Lines from the cells to the hands (cell 0 is the right-hand tip) ──
        rig.updateMatrixWorld(true);
        pilot.hand('L', handL);
        pilot.hand('R', handR);
        wing.cells.forEach((cell, k) => {
          cell.pivot.localToWorld(tie.copy(cell.anchor));
          if (k <= 2) lines.set(k, tie, handR, c * 0.2);
          if (k >= 2) lines.set(k + 1, tie, handL, c * 0.2);
        });
      },
    };
  },
});
