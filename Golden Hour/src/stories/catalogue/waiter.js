import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { roundRect } from '../../world/shapes.js';
import { makePlate, makeCup } from '../props/f-props.js';

const RIMS = ['#5f8fb5', '#e2574c', '#2f6f6a', '#c9a24a'];
/** The tower, bottom to top: plates and cups, and how tall each layer is. */
const STACK = ['plate', 'plate', 'plate', 'cup', 'plate', 'plate', 'cup', 'plate', 'cup', 'cup'];
const LAYER = { plate: 0.065, cup: 0.15 };
/** Where the walk starts, to the right of the table (x offset from the slot). */
const START = 2.5;

/** A waiter's tallest order yet, carried to the café table. A perfect delivery, or a very loud one. */
export default defineStory({
  id: 'waiter',
  slot: 'cafe',
  window: [4.0, 13.6],
  dur: 0.9,
  cast: { waiter: { dress: false, look: { top: '#fbf6ee', bottom: '#2f2a30' } }, diner: { old: true } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{waiter}, delivering the tower. Bravo!',
        near: '{waiter}, wobbling to the table.',
        after: '{diner}, wondering where to start.',
        idle: '{waiter}, carrying a very tall order.',
      },
      sounds: [[-0.7, 'clink'], [0.02, 'ding'], [0.3, 'cheer']],
    },
    topple: {
      tags: ['oops', 'falling'],
      captions: {
        peak: "{waiter}'s tower: going, going, gone.",
        near: '{waiter}, wobbling to the table.',
        after: '{waiter}, sweeping up the café.',
        idle: '{waiter}, carrying a very tall order.',
      },
      sounds: [[-0.7, 'clink'], [0.05, 'gasp'], [0.62, 'crash']],
    },
  },
  create({ slot, person, group, evening, outcome, particles }) {
    const diner = person('diner', slot.x - 0.4, 0, slot.z - 0.5, 'L');
    const stop = vec(slot.x + 0.95, 0, slot.z - 0.05);
    const waiter = person('waiter', slot.x + START, 0, stop.z, 'L');

    // The tray and the tower live in world coordinates, so the tower can come apart.
    const stack = new THREE.Group();
    group.add(stack);
    const tray = place(stack, card(roundRect(-0.3, -0.02, 0.6, 0.04, 0.02), '#8a8f96', { depth: 0.06 }), 0, 0, 0);
    let y = 0.02;
    const items = STACK.map((kind, i) => {
      const obj = kind === 'plate' ? makePlate('#fbf6ee', evening.pick(RIMS)) : makeCup(evening.pick(['#fbf6ee', '#f6e2c8']));
      stack.add(obj);
      const h = LAYER[kind];
      const item = { obj, kind, y: y + (kind === 'plate' ? h / 2 : 0), x: kind === 'cup' ? evening.range(-0.06, 0.06) : 0, phase: i * 0.7, land: null, broke: false };
      y += h;
      // Off it goes in the topple: mostly left and forwards, the top flying furthest.
      const reach = 0.4 + i * 0.13;
      item.v = vec(-reach * evening.range(0.8, 1.5) + evening.range(-0.3, 0.3), evening.range(0.6, 1.6), evening.range(0.3, 0.8));
      item.spin = evening.range(4, 9) * (i % 2 ? 1 : -1);
      return item;
    });
    const onTable = vec(slot.x + 0.3, 0.86, slot.z - 0.02);

    const dur = 0.9;
    const hand = vec();
    const base = vec();
    const from = vec();
    const base0 = vec();
    const axis = new THREE.Vector3(0, 0, 1);
    let released = false;

    return {
      focus: () => [diner.root, waiter.root, stack],
      x: () => waiter.root.position.x,
      update(p, { wall, outcome: o }) {
        // The walk in from the right, wobbling more with every step.
        const walk = smooth(seg(p, -1.5, -0.35));
        waiter.root.position.x = lerp(slot.x + START, stop.x, walk);
        const walking = p > -1.5 && p < -0.35;
        const step = walking ? Math.sin(wall * 10) * 0.4 : 0;
        const wobble = (p < -1.5 ? 0.25 : 0.4 + 0.6 * smooth(seg(p, -1.5, -0.2))) * (p < 0 ? 1 : 0);
        const topple = o === 'topple';
        const setDown = !topple ? smooth(seg(p, -0.3, 0)) : 0;
        const bow = !topple ? smooth(seg(p, 0, 0.2)) * (1 - smooth(seg(p, dur + 0.3, dur + 0.7))) : 0;
        const lunge = topple && p >= 0 ? smooth(seg(p, 0, 0.2)) * (1 - smooth(seg(p, dur + 0.8, dur + 1.3))) : 0;
        const sweep = topple && p > dur + 1.3;
        waiter.pose({
          legL: step,
          legR: -step,
          bob: Math.abs(step) * 0.04 - 0.1 * lunge,
          armR: bow ? lerp(1.4, 1.75, bow) : lunge ? lerp(2.5, 1.9, lunge) : sweep ? -0.5 + Math.sin(wall * 6) * 0.3 : lerp(2.55 + Math.sin(wall * 7) * 0.12 * wobble, 1.4, setDown),
          armL: bow ? -0.5 * bow : lunge ? 1.8 : sweep ? -0.4 + Math.sin(wall * 6) * 0.3 : 0.9 + Math.sin(wall * 5) * 0.4 * wobble,
          lean: Math.sin(wall * 6) * 0.06 * wobble - 0.2 * lunge,
          head: bow ? 0.15 * bow : -0.05 * wobble,
          mouth: lunge ? 1 : bow ? 0.3 : 0.35,
          eyes: bow ? 0.15 : lunge ? 1.3 : 1,
          brows: wobble > 0.5 ? -0.6 : lunge ? 1 : null,
        });
        waiter.hips.rotation.x = 0.5 * bow;
        const delight = !topple && p >= 0.05 && p < dur + 1.6;
        const fright = topple && p >= 0.1 && p < dur + 1.2;
        const clap = Math.abs(Math.sin(wall * 10)) * 0.3;
        diner.pose({
          armL: delight ? (p < dur ? 2.5 : 0.6 + clap) : fright ? 2.75 : 0.3,
          armR: delight ? (p < dur ? 2.5 : 0.6 + clap) : fright ? 2.75 : 0.3,
          lean: p < 0 ? -0.1 * smooth(seg(p, -1.0, -0.3)) : 0,
          mouth: delight || fright ? 1 : 0.35,
          eyes: fright ? 1.3 : 1,
        });

        // The tray: on the waiter's hand, then on the table (or falling).
        waiter.root.updateMatrixWorld(true);
        waiter.hand('R', hand);
        hand.y += 0.07;
        hand.z += 0.1;
        base.lerpVectors(hand, onTable, setDown);
        tray.position.copy(base);
        tray.rotation.z = 0;

        const lean = Math.sin(wall * 6) * 0.05 * wobble;
        if (!topple || p < 0) {
          for (const it of items) {
            // A snake-like sway: higher layers swing further.
            const k = it.y / y;
            it.obj.position.set(base.x + it.x + Math.sin(wall * 6 - it.phase * 0.3) * 0.12 * wobble * k * k - lean * it.y, base.y + it.y, base.z + 0.02);
            it.obj.rotation.z = Math.sin(wall * 6 - it.phase * 0.3) * 0.15 * wobble * k;
          }
          return;
        }

        // Topple: the tower leans over, then everything is on its own.
        if (!released) {
          released = true;
          base0.copy(base);
          for (const it of items) it.from = it.obj.position.clone();
        }
        const t = p;
        const tip = smooth(seg(t, 0, 0.18)) * 0.5;
        tray.position.set(base.x, base.y, base.z);
        tray.rotation.z = 0.5 * tip;
        for (const it of items) {
          const q = Math.max(0, t - 0.12 - 0.02 * (STACK.length - items.indexOf(it)));
          // Pivot the leaning tower about the tray, then send each piece flying.
          from.copy(it.from).sub(base0).applyAxisAngle(axis, tip).add(base0);
          const yy = from.y + it.v.y * q - 4.9 * q * q;
          if (yy > 0.05 && !it.land) {
            it.obj.position.set(from.x + it.v.x * q, yy, from.z + it.v.z * q);
            it.obj.rotation.z = tip + it.spin * q;
          } else {
            it.land ??= it.obj.position.clone().setY(0.04);
            it.obj.position.copy(it.land);
            it.obj.rotation.z = it.kind === 'cup' ? Math.PI / 2 : 0.15;
            if (!it.broke) {
              it.broke = true;
              it.obj.scale.set(0.8, 0.7, 1);
              particles.spawn('puff', it.land, vec((Math.random() - 0.5) * 0.8, 0.5, 0.2), { life: 0.6, scale: 0.25 });
            }
          }
        }
      },
    };
  },
});
