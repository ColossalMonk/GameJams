import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { makePiano, makeSlings, makeBurst, makeHardHat, wearHat } from '../props/b-props.js';

const BEAM = 3.62;
const PX = 1.95;
const WX = 1.12;
const SLING = 0.5;
const HANG = 0.12 + SLING + 0.9;
const WOODS = ['#3a2a2e', '#7a4a32', '#f3ead8'];
const Z = new THREE.Vector3(0, 0, 1);

/** The crane finally gets the piano up to the top of the frame — gently, wildly, or not at all. */
export default defineStory({
  id: 'cranePiano',
  slot: 'site',
  window: [6.0, 13.5],
  dur: 1.0,
  cast: { worker: { dress: false, look: { top: '#f08a3c' } } },
  outcomes: {
    main: {
      tags: ['air', 'joy', 'finally'],
      captions: {
        peak: '{worker} guided the piano home.',
        near: '{worker}, waving the piano in.',
        after: '{worker}, playing piano on the top beam.',
        idle: 'A piano, going up on the crane.',
      },
    },
    swing: {
      tags: ['air', 'oops'],
      captions: {
        peak: 'The piano, swinging at {worker}.',
        near: '{worker}, waving the piano in.',
        after: "{worker}'s piano, down at last.",
        idle: 'A piano, going up on the crane.',
      },
    },
    drop: {
      tags: ['oops', 'falling'],
      captions: {
        peak: "{worker}'s piano went plonk.",
        near: 'The piano, leaving the rope.',
        after: 'The piano, parked in the fence.',
        idle: 'A piano, going up on the crane.',
      },
    },
  },
  create({ site, person, group, evening, particles, outcome }) {
    const z = site.z + 0.25;
    const worker = person('worker', WX, BEAM, z, 'L');
    wearHat(worker, makeHardHat('#f2c14e'));
    const piano = makePiano(evening.pick(WOODS));
    const slings = makeSlings(SLING);
    const burst = makeBurst();
    burst.visible = false;
    burst.position.set(PX, 1.35, site.z + 0.75);
    group.add(piano, slings, burst);
    const dur = 1.0;
    const snap = -0.62;
    const fallFrom = 4.2;
    const landY = 0.42;
    const g = (2 * (fallFrom - landY)) / (snap * snap);
    const offset = vec();
    let puffed = false;
    let plonked = false;

    // Where the hook is, how far the load swings, and whether the piano still hangs from it.
    const hookAt = (p, wall, o) => {
      const lift = smooth(seg(p, -4.4, -1.8));
      let y = lerp(HANG, 4.55 + HANG, lift);
      let x = PX;
      let swing = Math.sin(wall * 2.1) * 0.05 * lift * (1 - smooth(seg(p, -1.4, -0.3)));
      const low = o === 'main' ? BEAM : o === 'swing' ? 4.3 : fallFrom;
      if (p > -1.8) y = lerp(4.55 + HANG, low + HANG, easeOut(seg(p, -1.8, o === 'main' ? 0 : o === 'drop' ? snap : -0.3)));
      if (o === 'main' && p > 0.7) y = lerp(BEAM + HANG, 6.4, smooth(seg(p, 0.7, 1.8)));
      if (o === 'swing' && p > -0.3) {
        const q = p + 0.3;
        swing = -0.9 * Math.sin(q * 5.4) * Math.exp(-q * 0.75) * (1 - smooth(seg(p, dur + 1.4, dur + 2.3)));
        x = PX + 0.25 * Math.sin(q * 5.4 + 0.6) * Math.exp(-q * 0.9);
        y = lerp(4.3 + HANG, BEAM + HANG, smooth(seg(p, dur + 1.6, dur + 2.4)));
        if (p > dur + 2.6) y = lerp(BEAM + HANG, 6.4, smooth(seg(p, dur + 2.6, dur + 3.6)));
      }
      if (o === 'drop' && p > snap) y = 4.2 + HANG + 0.25 * Math.sin(Math.PI * seg(p, snap, snap + 0.5));
      return { x, y, swing };
    };

    return {
      focus: () => (outcome === 'drop' ? [piano, burst] : [piano, worker.root]),
      x: () => PX,
      update(p, { wall, outcome: o }) {
        const { x, y, swing } = hookAt(p, wall, o);
        site.setHook(x, y);
        slings.position.set(x, y - 0.12, site.z - 0.12);
        slings.rotation.z = swing;
        const hanging = !(o === 'main' && p > 0) && !(o === 'swing' && p > dur + 2.4) && !(o === 'drop' && p > snap);
        slings.scale.y = hanging || (o === 'main' && p < 0.7) ? 1 : 0.45;

        if (hanging) {
          offset.set(0, -HANG, 0).applyAxisAngle(Z, swing);
          piano.position.set(x + offset.x, y + offset.y, site.z - 0.05);
          piano.rotation.z = swing;
          if (y - HANG < 0.01) piano.position.y = 0;
        } else if (o === 'drop') {
          const t = Math.min(p - snap, -snap);
          const land = p >= 0;
          piano.position.set(PX + 0.25 * seg(p, snap, 0), land ? landY : fallFrom - 0.5 * g * t * t, lerp(site.z - 0.05, site.z + 0.5, seg(p, snap, 0)));
          piano.rotation.z = land ? 0.28 + 0.08 * Math.sin(Math.PI * seg(p, 0, 0.25)) : -0.5 * seg(p, snap, 0);
          if (land && !plonked) {
            plonked = true;
            const at = vec(PX + 0.2, 0.8, site.z + 0.7);
            for (let i = 0; i < 10; i++) {
              particles.spawn('puff', at, new THREE.Vector3((Math.random() - 0.5) * 3, 0.3 + Math.random() * 1.2, 0.2), { life: 1.6, scale: 1 + Math.random() * 0.8 });
            }
          }
          burst.visible = p >= 0 && p < dur;
          burst.scale.setScalar(easeOut(seg(p, 0, 0.15)) * (1 + 0.06 * Math.sin(wall * 20)));
        } else {
          const settle = o === 'main' ? 0.04 * Math.sin(Math.PI * seg(p, 0, 0.3)) : 0;
          piano.position.set(PX, BEAM + settle, site.z - 0.05);
          piano.rotation.z = 0;
          if (!puffed) {
            puffed = true;
            for (const s of [-1, 1]) particles.spawn('puff', vec(PX + s * 0.45, BEAM + 0.05, site.z + 0.3), new THREE.Vector3(s * 0.8, 0.2, 0), { life: 1.0, scale: 0.5 });
          }
        }

        // The worker on the top beam.
        let wx = WX;
        const sway = Math.sin(wall * 1.3) * 0.03;
        if (p < -1.8) {
          worker.pose({ lean: sway, armR: 2.5 + Math.sin(wall * 6) * 0.35, armL: 0.3, mouth: 0.5 });
        } else if (p < (o === 'drop' ? snap : 0)) {
          const reach = smooth(seg(p, -1.8, -0.8));
          worker.pose({ lean: -0.08 * reach + sway, armR: lerp(2.5, 1.75, reach) + Math.sin(wall * 5) * 0.15, armL: lerp(0.3, 0.9, reach), mouth: 0.6 });
        } else if (o === 'main') {
          if (p < dur) worker.pose({ armL: 2.75, armR: 2.75, bob: Math.abs(Math.sin(wall * 9)) * 0.08, mouth: 1 });
          else {
            const walk = seg(p, dur + 0.3, dur + 1.0);
            wx = lerp(WX, PX - 0.05, smooth(walk));
            const step = walk > 0 && walk < 1 ? Math.sin(wall * 14) * 0.4 : 0;
            const play = walk >= 1 ? Math.sin(wall * 12) : 0;
            worker.pose({ legL: step, legR: -step, armL: walk >= 1 ? 0.55 + play * 0.12 : 0.3, armR: walk >= 1 ? 0.55 - play * 0.12 : 0.3, bob: Math.abs(play) * 0.03, head: Math.sin(wall * 3) * 0.12, mouth: 0.8 });
          }
        } else if (o === 'swing') {
          const duck = p < dur + 0.8 ? 1 - smooth(seg(p, dur + 0.4, dur + 0.8)) : 0;
          const relief = p > dur + 2.4 ? 1 : 0;
          worker.pose({ bob: -0.2 * duck, legL: 0.75 * duck, legR: 0.75 * duck, armL: lerp(0.3, 2.95, duck) + relief * 2.4, armR: lerp(0.3, 2.95, duck), head: duck ? Math.sin(wall * 8) * 0.1 : 0, mouth: duck ? 1 : 0.4 });
        } else {
          const horror = p < dur + 1.5;
          worker.pose({ lean: horror ? 0.05 : 0, armL: horror ? 2.75 : 0.9, armR: horror ? 2.75 : 0.9, head: horror ? Math.sin(wall * 5) * 0.1 : 0.2, mouth: horror ? 1 : 0.3 });
        }
        worker.root.position.x = wx;
      },
    };
  },
});
