import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, arc, vec } from '../anim.js';
import { makeDove } from '../props/c-props.js';
import { makeBasket } from '../props/f-props.js';
import { sunCentre } from '../../world/Sky.js';

const DOVES = 7;
/** When the stubborn dove settles on the keeper's head. */
const PERCH = 0.85;

/** A basket of white doves, finally let go from the roof. One of them may have other plans. */
export default defineStory({
  id: 'doves',
  slot: 'rooftop',
  window: [3.0, 13.5],
  dur: 1.0,
  cast: { keeper: { look: { top: '#fbf6ee' } } },
  outcomes: {
    main: {
      tags: ['animal', 'air', 'finally'],
      captions: {
        peak: "{keeper}'s doves, off into the sun.",
        near: '{keeper}, opening the basket.',
        after: "{keeper}'s doves, specks in the sun.",
        idle: '{keeper} and a very restless basket.',
      },
      sounds: [[-0.4, 'coo'], [0, 'flap'], [0.3, 'cheer']],
    },
    stays: {
      tags: ['animal', 'oops'],
      captions: {
        peak: "{keeper}'s doves, all but one.",
        near: '{keeper}, opening the basket.',
        after: '{keeper}, wearing a dove.',
        idle: '{keeper} and a very restless basket.',
      },
      sounds: [[-0.4, 'coo'], [0, 'flap'], [PERCH + 0.1, 'laugh']],
    },
  },
  create({ slot, person, group, evening, outcome, peak, particles }) {
    const keeper = person('keeper', slot.x + 0.15, slot.y, slot.z, 'R');
    const basket = makeBasket();
    group.add(basket.group);

    // Each dove bursts out in a fan, then turns for the sun.
    const doves = Array.from({ length: DOVES }, (_, i) => {
      const d = makeDove();
      d.group.visible = false;
      group.add(d.group);
      const a = Math.PI / 2 + lerp(-1.1, 1.1, i / (DOVES - 1)) + evening.range(-0.15, 0.15);
      return { ...d, v: vec(Math.cos(a), Math.sin(a), evening.range(0.05, 0.3)).multiplyScalar(evening.range(2.2, 2.9)), delay: evening.range(0, 0.18), phase: evening.range(0, 6) };
    });
    const stayer = outcome === 'stays' ? doves[Math.floor(DOVES / 2)] : null;
    if (stayer) stayer.delay = 0.02;

    const dur = 1.0;
    const handL = vec();
    const handR = vec();
    const start = vec();
    const head = vec();
    const toSun = vec();
    const floor = vec(slot.x - 0.5, slot.y, slot.z + 0.15);
    const launch = vec();
    let aimed = false;
    let burst = false;

    return {
      focus: () => [keeper.root, basket.group, ...(stayer ? [stayer.group] : [])],
      update(p, { wall }) {
        // The keeper: basket at the waist, a crouch, a fling up over the head, and down again.
        const crouch = smooth(seg(p, -0.6, -0.15)) * (1 - smooth(seg(p, -0.1, 0.1)));
        const lift = smooth(seg(p, -0.15, 0.08)) * (1 - smooth(seg(p, 0.45, 0.8)));
        const set = stayer ? 0 : smooth(seg(p, dur + 0.4, dur + 0.8));
        const low = -0.42;
        const high = 2.95;
        const perched = stayer && p >= PERCH;
        const sway = Math.sin(wall * 1.2) * 0.02;
        const waving = !stayer && p > dur + 0.8;
        const arms = lerp(lerp(low, high, lift), 0.2, set);
        keeper.pose({
          lean: sway,
          bob: -0.08 * crouch,
          armL: arms,
          armR: waving ? lerp(0.2, 2.5 + Math.sin(wall * 9) * 0.35, smooth(seg(p, dur + 0.8, dur + 1.1))) : arms,
          head: p < -0.6 ? -0.12 + Math.sin(wall * 2) * 0.04 : perched ? 0.06 * Math.sin(wall * 2.5) : 0,
          mouth: perched ? (p < PERCH + 1.6 ? 0.6 : 0.3) : p >= 0 && p < dur + 1.2 ? 1 : 0.35 + 0.25 * crouch,
          brows: perched ? 0.9 : crouch > 0.3 ? -0.5 : null,
          eyes: perched ? 1.3 : 1,
        });

        // The basket rides in both hands (then, once the doves are off, sits on the roof).
        // The lid rattles, then flips open at the peak.
        keeper.root.updateMatrixWorld(true);
        keeper.hand('L', handL);
        keeper.hand('R', handR);
        basket.group.position.lerpVectors(handL, handR, 0.5);
        basket.group.position.y -= lerp(0.2, 0.13, lift);
        basket.group.position.z += 0.12;
        if (set > 0) basket.group.position.lerp(floor, set);
        const rattle = p < 0 ? Math.abs(Math.sin(wall * 17)) * lerp(0.05, 0.2, smooth(seg(p, -1.6, 0))) : 0;
        basket.lid.rotation.z = p >= -0.05 ? lerp(rattle, 2.3, easeOut(seg(p, -0.05, 0.15))) * (1 - smooth(seg(p, dur + 0.8, dur + 1.1))) : rattle;
        basket.group.rotation.z = p < 0 ? Math.sin(wall * 13) * rattle * 0.3 : 0;
        basket.group.updateMatrixWorld(true);
        basket.group.localToWorld(start.copy(basket.top));

        if (p >= 0 && !burst) {
          burst = true;
          launch.copy(start);
          for (let i = 0; i < 5; i++) particles.spawn('puff', start, vec((Math.random() - 0.5) * 2, 1 + Math.random(), 0.2), { life: 0.9, scale: 0.35 });
        }
        if (!aimed && p >= 0) {
          aimed = true;
          const sun = sunCentre(peak + 2);
          toSun.set(sun.x - start.x, Math.max(sun.y + 1.5 - start.y, 1.5), 0).normalize();
        }

        for (const d of doves) {
          const t = p - d.delay;
          d.group.visible = t >= 0 && (d === stayer || t < 6);
          if (!d.group.visible) {
            d.group.position.copy(start);
            continue;
          }
          const flap = Math.sin(wall * 20 + d.phase);
          if (d === stayer) {
            // Up out of the basket, a little flutter, and down onto the keeper's head.
            // Out with the others, a loop up over the keeper, and down onto the head.
            keeper.headTop(head);
            const u = smooth(seg(t, 0, PERCH));
            d.group.position.lerpVectors(launch, head, u);
            d.group.position.x += Math.sin(u * Math.PI * 2) * 0.35;
            d.group.position.y += arc(u, 0.9) + 0.07 * u;
            d.group.position.z += 0.05;
            d.group.rotation.z = u < 1 ? flap * 0.1 : Math.sin(wall * 3) * 0.05;
            const fold = u < 1 ? flap * 0.7 : -0.5 + Math.max(0, Math.sin(wall * 2.3)) * 0.3;
            d.wingL.rotation.z = -fold;
            d.wingR.rotation.z = fold;
            d.group.scale.setScalar(1.15);
            continue;
          }
          // A fan-shaped burst that slows, then a steady pull towards the sun.
          const k = (1 - Math.exp(-2.2 * t)) / 2.2;
          const pull = (1.6 * t * t) / (1 + 0.45 * t);
          d.group.position.set(launch.x + d.v.x * k + toSun.x * pull, launch.y + d.v.y * k + toSun.y * pull, launch.z + d.v.z * k - 0.4 * t);
          d.group.rotation.z = Math.sin(wall * 4 + d.phase) * 0.15 - toSun.x * 0.25 * seg(t, 0.3, 1);
          d.group.scale.setScalar(lerp(1, 0.55, seg(t, 0, 3)));
          d.wingL.rotation.z = -flap * 0.7;
          d.wingR.rotation.z = flap * 0.7;
        }
      },
    };
  },
});
