import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { rect, circle } from '../../world/shapes.js';
import { makeHardHat, wearHat } from '../props/b-props.js';

const BEAM = 3.62;
const POST = 3.7;
const FX = 3.36;
const FLAGS = [['#e2574c', '#fbf6ee'], ['#3f6f8f', '#f2c14e'], ['#2f6f6a', '#fbf6ee'], ['#9a6fb0', '#f2c14e']];

/** The frame is finished: a worker plants a little flag on top. Or the wind takes it. */
export default defineStory({
  id: 'lastBeamFlag',
  slot: 'site',
  window: [2.0, 14.0],
  dur: 0.8,
  cast: { worker: { dress: false, look: { top: '#f08a3c' } } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: "{worker}'s flag, up at last.",
        near: '{worker}, planting the flag.',
        after: '{worker}, saluting the finished frame.',
        idle: '{worker}, up on the last beam.',
      },
    },
    alt: {
      tags: ['air', 'oops'],
      captions: {
        peak: "{worker}'s flag, off on the wind.",
        near: '{worker}, planting the flag.',
        after: '{worker}, holding a bare pole.',
        idle: '{worker}, up on the last beam.',
      },
      throws: { lands: 1.65, kinds: ['hand'], caption: "{target} caught {worker}'s flag.", after: '{target}, flying the flag.' },
    },
  },
  create({ site, person, group, evening, particles, cross }) {
    const z = site.z + 0.25;
    const worker = person('worker', FX, BEAM, z, 'L');
    wearHat(worker, makeHardHat('#fbf6ee'));
    const [cloth, mark] = evening.pick(FLAGS);
    const pole = new THREE.Group();
    place(pole, card(rect(-0.022, 0, 0.044, 0.95), '#6b4636', { depth: 0.03 }), 0, 0, 0);
    place(pole, card(circle(0, 0.96, 0.04), '#e8c77a', { depth: 0.03 }), 0, 0, 0.01);
    group.add(pole);
    const flag = new THREE.Group();
    flag.position.set(0.02, 0.92, 0.02);
    pole.add(flag);
    const strips = [];
    for (let i = 0; i < 3; i++) {
      const strip = place(flag, card(rect(i * 0.18, -0.34, 0.185, 0.34), cloth, { depth: 0.02 }), 0, 0, i * 0.003);
      strips.push(strip);
    }
    place(strips[1], card(circle(0.27, -0.17, 0.08), mark, { depth: 0.01 }), 0, 0, 0.02);
    const planted = vec(POST, BEAM, z - 0.06);
    const hand = vec();
    const dur = 0.8;
    const gust = 0.25;
    let puffed = false;
    let loose = false;
    let flying = false;
    const flyFrom = vec();
    const end = vec();

    return {
      focus: () => (flying ? [worker.root, flag] : [worker.root, pole]),
      thrown: flag,
      x: () => POST,
      update(p, { wall, outcome }) {
        const alt = outcome === 'alt';
        const sway = Math.sin(wall * 1.2) * 0.03;
        const lift = smooth(seg(p, -1.6, -0.8));
        const plunge = easeOut(seg(p, -0.7, -0.3));
        const salute = !alt && p > dur + 0.4;
        let pose;
        if (p < -0.7) {
          pose = { lean: sway, armR: lerp(0.45, 2.85, lift), armL: 0.25 + 0.3 * lift, head: 0.08 * Math.sin(wall * 0.8), mouth: 0.4 };
        } else if (p < 0) {
          pose = { lean: -0.12 * plunge * (1 - smooth(seg(p, -0.25, 0))), bob: -0.04 * plunge, armR: lerp(2.85, 1.3, plunge), armL: 0.5, mouth: 0.6 };
        } else if (!alt) {
          pose = salute
            ? { armR: -2.55, armL: 0.2, mouth: 0.5 }
            : { armL: 2.75, armR: 2.75, bob: Math.abs(Math.sin(wall * 9)) * 0.07, mouth: 1 };
        } else {
          const chase = p < dur + 1.2;
          pose = chase
            ? { lean: -0.2, bob: 0.05 * Math.abs(Math.sin(wall * 10)), armR: 2.5 + Math.sin(wall * 12) * 0.2, armL: 1.2, mouth: 1 }
            : { armR: 1.0, armL: 0.6, head: -0.2, mouth: 0.15 };
        }
        worker.pose(pose);
        worker.root.updateMatrixWorld(true);

        // The pole: on the shoulder, raised high, then driven into the top of the post.
        if (p < -0.7) {
          worker.hand('R', hand);
          pole.position.set(hand.x, hand.y - 0.35 * lift - 0.4 * (1 - lift), hand.z + 0.06);
          pole.rotation.z = lerp(-0.5, 0, lift);
        } else {
          worker.hand('R', hand);
          const from = vec(hand.x, hand.y - 0.35, hand.z + 0.06);
          pole.position.lerpVectors(from, planted, p < 0 ? plunge : 1);
          pole.rotation.z = 0;
        }
        if (p >= -0.3 && !puffed) {
          puffed = true;
          particles.spawn('puff', planted, new THREE.Vector3(0.3, 0.3, 0.1), { life: 0.9, scale: 0.5 });
          particles.spawn('puff', planted, new THREE.Vector3(-0.3, 0.3, 0.1), { life: 0.9, scale: 0.5 });
        }

        // The cloth: rolled up, then unfurled and waving (or gone with the gust).
        const open = p < 0 ? 0.08 : easeOut(seg(p, 0, 0.3));
        strips.forEach((s, i) => {
          s.position.y = Math.sin(wall * 8 - i * 1.1) * 0.03 * i * open;
          s.rotation.z = Math.sin(wall * 8 - i * 1.1 + 0.6) * 0.06 * open;
        });
        if (alt && p >= gust && !loose) {
          loose = true;
          group.attach(flag);
          flyFrom.copy(flag.position);
        }
        flying = loose && p < gust + 1.4;
        if (loose && cross?.active) {
          // Down to someone in the street, who catches it.
          const u = smooth(seg(p, gust, gust + 1.4));
          cross.point(end);
          flag.position.lerpVectors(flyFrom, end, u);
          flag.position.y += 4 * u * (1 - u) * (1.0 + 0.08 * flyFrom.distanceTo(end));
          flag.position.z += 0.06;
          flag.rotation.z = (1 - u) * -(p - gust) * 3.2;
          flag.scale.set(open, 1, 1);
          flag.visible = true;
          if (u >= 1) cross.land();
        } else if (loose) {
          const t = p - gust;
          flag.position.set(flyFrom.x + 2.6 * t + 0.4 * t * t, flyFrom.y + 1.1 * t + 0.25 * Math.sin(t * 5), flyFrom.z);
          flag.rotation.z = -t * 3.2;
          flag.scale.set(open, 1 - 0.3 * Math.abs(Math.sin(t * 6)), 1);
          flag.visible = flag.position.x < 16;
        } else {
          flag.scale.x = open;
        }
      },
    };
  },
});
