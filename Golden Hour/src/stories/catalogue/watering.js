import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { roundRect } from '../../world/shapes.js';
import { makeOpenWindow } from '../props/b-props.js';
import { hideLegs, makeBloom, makeWateringCan, makeStream, makeWaterBlob, makeUmbrella } from '../props/f-props.js';

const SHUTTERS = ['#2f6f6a', '#b5524a', '#3f6f8f', '#6d5a7a'];
const PETALS = ['#f6a5b8', '#e2574c', '#c9a4f0', '#fbf1dc', '#f29a4a'];
const UMBRELLAS = ['#e2574c', '#3f6f8f', '#f2c14e', '#2f6f6a'];
/** Flowers in the box: x, final stem length, head radius. The middle one is the show-off. */
const FLOWERS = [[-0.27, 0.24, 0.13], [-0.14, 0.34, 0.15], [0, 0.56, 0.21], [0.14, 0.32, 0.15], [0.27, 0.22, 0.13]];
/** When the passer-by's umbrella goes up (too late). */
const UMBRELLA = 0.6;
/** When the water stops pouring. */
const DRY = 0.8;

/** Watering the window box at last. The flowers burst open, or the water finds someone below. */
export default defineStory({
  id: 'watering',
  slot: 'window',
  window: [3.4, 13.0],
  dur: 0.9,
  cast: { gardener: { old: true }, passer: {} },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: "{gardener}'s flowers, finally in bloom.",
        near: '{gardener}, watering the window box.',
        after: '{gardener}, admiring the flowers.',
        idle: "{gardener}'s flowers, still just buds.",
      },
      sounds: [[-1.2, 'swish'], [0, 'pop'], [0.1, 'chime']],
    },
    drench: {
      tags: ['oops', 'falling'],
      captions: {
        peak: '{passer}, watered by {gardener}.',
        near: '{gardener}, watering rather a lot.',
        after: '{passer}, umbrella up. Too late.',
        idle: "{gardener}'s flowers, still just buds.",
      },
      sounds: [[-1.0, 'swish'], [0.02, 'splash'], [UMBRELLA + 0.05, 'pop']],
    },
  },
  create({ slot, person, group, evening, outcome, particles }) {
    const drench = outcome === 'drench';
    const w = makeOpenWindow({ shutter: evening.pick(SHUTTERS), slats: 2 });
    w.group.position.set(slot.x, slot.y, slot.z);
    group.add(w.group);
    place(w.group, card(roundRect(-0.38, -0.44, 0.76, 0.32, 0.04), '#8a5a3e', { depth: 0.08 }), 0, 0, 0.28);
    const blooms = FLOWERS.map(([fx, stem, r], i) => {
      const b = makeBloom(PETALS[(i + Math.floor(evening.range(0, 5))) % PETALS.length], { r, stem: 1 });
      b.group.position.set(fx, -0.16, 0.33 + (i % 2) * 0.012);
      w.group.add(b.group);
      return { ...b, final: stem, delay: Math.abs(i - 2) * 0.06 };
    });

    const height = 0.88;
    const gardener = person('gardener', slot.x - 0.15, slot.y - 0.32 - 0.72 * height, slot.z + 0.14, 'L', { height });
    hideLegs(gardener);
    const can = makeWateringCan(evening.pick(['#6f9a8a', '#5f8fb5', '#c46a4a']));
    group.add(can.group);
    const stream = makeStream(0.04);
    group.add(stream);

    // Only on a drenching evening: someone strolling past underneath, and a torrent.
    let passer = null;
    let umbrella = null;
    let torrent = null;
    let blob = null;
    const below = vec(slot.x - 0.32, 0, slot.z + 0.6);
    if (drench) {
      passer = person('passer', below.x - 2.4, 0, below.z, 'R');
      umbrella = makeUmbrella(evening.pick(UMBRELLAS));
      group.add(umbrella.group);
      torrent = makeStream(0.16);
      torrent.visible = false;
      group.add(torrent);
      blob = makeWaterBlob(0.34);
      blob.visible = false;
      group.add(blob);
    }

    const dur = 0.9;
    const hand = vec();
    const tip = vec();
    const head = vec();
    const boxFront = slot.y - 0.44;
    let popped = false;
    let lastSplash = -1;

    return {
      focus: () => [gardener.root, w.group, ...(passer ? [passer.root] : [])],
      x: () => slot.x,
      update(p, { wall, outcome: o }) {
        w.shutters(1);
        // The gardener: can out over the box, tipping it; then delight, or a hand over the mouth.
        const pour = smooth(seg(p, -1.4, -1.1)) * (1 - smooth(seg(p, o === 'drench' ? DRY : -0.15, o === 'drench' ? DRY + 0.3 : 0.05)));
        const overdo = o === 'drench' ? smooth(seg(p, -0.45, -0.1)) : 0;
        const joy = o === 'main' && p >= 0 && p < dur + 1.4;
        const oops = o === 'drench' && p >= 0.05 && p < DRY + 1.4;
        gardener.pose({
          armR: joy ? 2.6 : 1.55 + 0.1 * pour,
          armL: joy ? 2.6 : oops ? -2.3 : 0.3,
          head: oops ? 0.12 : p < 0 ? -0.08 * pour : 0,
          bob: joy ? Math.abs(Math.sin(wall * 9)) * 0.04 : 0,
          mouth: joy ? 1 : oops ? 0.6 : 0.3,
          eyes: oops ? 1.3 : pour > 0.5 && !joy ? 0.6 : 1,
          brows: oops ? 1 : null,
        });
        gardener.hips.rotation.x = 0.12 + 0.12 * overdo;
        gardener.root.updateMatrixWorld(true);
        gardener.hand('R', hand);
        can.group.position.set(hand.x, hand.y + 0.02, hand.z + 0.45);
        can.group.rotation.z = 0.55 * pour + 0.7 * overdo;
        can.group.updateMatrixWorld(true);
        can.group.localToWorld(tip.copy(can.spout));

        // A thin stream from the spout into the box.
        const flowing = pour > 0.6;
        stream.visible = flowing;
        stream.position.copy(tip);
        stream.scale.y = Math.max(0.01, tip.y - (slot.y - 0.12));
        stream.scale.x = 1 + Math.sin(wall * 20) * 0.15;

        // The flowers: buds that perk up with the water, then burst open at the peak.
        for (const b of blooms) {
          const grow = smooth(seg(p, -1.2, -0.1));
          const q = p - b.delay;
          let stem = lerp(0.07, 0.6 * b.final, grow);
          let open = 0.25;
          if (o === 'main') {
            stem = q < 0 ? stem : lerp(0.6 * b.final, b.final, easeOut(seg(q, 0, 0.25)));
            if (q >= 0) open = q < 0.2 ? lerp(0.25, 1.25, easeOut(q / 0.2)) : lerp(1.25, 1, smooth(seg(q, 0.2, 0.45)));
          }
          b.stem.scale.y = stem;
          b.head.position.y = stem;
          b.head.scale.setScalar(open);
          b.head.rotation.z = o === 'main' && q > 0.45 ? Math.sin(wall * 1.6 + b.final * 9) * 0.08 : 0;
        }
        if (o === 'main' && p >= 0 && !popped) {
          popped = true;
          const top = vec(slot.x, slot.y + 0.45, slot.z + 0.5);
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            particles.spawn('spark', top, vec(Math.cos(a) * 1.4, Math.sin(a) * 1.4 + 0.6, 0.3), { life: 0.8, scale: 0.8, color: evening.pick(PETALS) });
          }
        }
        if (!drench) return;

        // The passer-by: a stroll along under the window, a stop, a soaking, an umbrella.
        const walk = smooth(seg(p, -1.6, -0.35));
        passer.root.position.x = lerp(below.x - 2.4, below.x, walk);
        const stepping = p > -1.6 && p < -0.35;
        const step = stepping ? Math.sin(wall * 11) * 0.45 : 0;
        const soaked = p >= 0 && p < DRY + 0.2;
        const brolly = smooth(seg(p, UMBRELLA - 0.15, UMBRELLA + 0.05));
        if (p < 0) {
          passer.pose({ legL: step, legR: -step, armL: -step * 0.6, armR: step * 0.6, bob: Math.abs(step) * 0.04, head: p > -0.3 ? 0.1 : 0, mouth: 0.35 });
        } else {
          passer.pose({
            armL: lerp(soaked ? 1.4 + Math.sin(wall * 25) * 0.08 : 0.3, 2.75, brolly),
            armR: soaked ? 1.4 - Math.sin(wall * 25) * 0.08 : 0.3,
            eyes: soaked ? 0.15 : 0.5,
            mouth: soaked ? 0.6 : 0.15,
            brows: soaked ? 0.6 : -0.7,
            lean: soaked ? Math.sin(wall * 30) * 0.02 : 0,
          });
        }
        passer.root.updateMatrixWorld(true);
        passer.headTop(head);
        passer.hand('L', hand);
        umbrella.group.visible = brolly > 0;
        umbrella.group.position.set(hand.x + 0.02, hand.y - 0.05, hand.z + 0.08);
        umbrella.group.rotation.z = -0.65;
        umbrella.open(smooth(seg(p, UMBRELLA, UMBRELLA + 0.15)));

        // The torrent: over the front of the box and straight down onto the head.
        const front = smooth(seg(p, -0.15, 0));
        const tail = smooth(seg(p, DRY - 0.1, DRY + 0.25));
        const top = lerp(boxFront, head.y, tail);
        const bottom = lerp(boxFront, head.y, front);
        torrent.visible = p > -0.15 && tail < 1;
        torrent.position.set(below.x, top, lerp(slot.z + 0.42, below.z, 0.5));
        torrent.scale.set(1 + Math.sin(wall * 17) * 0.12, Math.max(0.01, top - bottom), 1);
        blob.visible = p > -0.15 && p < 0;
        blob.position.set(below.x, bottom, torrent.position.z + 0.02);
        if (p >= 0 && p < DRY && Math.floor(p / 0.12) !== lastSplash) {
          lastSplash = Math.floor(p / 0.12);
          for (const s of [-1, 1]) particles.spawn('puff', head, vec(s * (0.9 + Math.random() * 0.5), 0.6 + Math.random() * 0.4, 0.2), { life: 0.6, scale: 0.28, color: '#bfe3f2' });
        }
      },
    };
  },
});
