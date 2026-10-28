import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, lerp, arc, vec } from '../anim.js';
import { makeToyBalloon } from '../props/c-props.js';

const COLOURS = ['#e2574c', '#f2c14e', '#7fb3d6', '#f6a5b8', '#9fd3c7', '#c9a4ff', '#e8a35a', '#7fae6a'];
/** Where each balloon sits in the bunch, around its centre. */
const BUNCH = [[-0.42, 0.0], [-0.14, -0.08], [0.16, -0.04], [0.44, 0.02], [-0.3, 0.36], [0.0, 0.3], [0.3, 0.38], [0.04, 0.66]];
const KEPT = 3;

/** A balloon seller lets the whole bunch go at last. Or nearly goes with it. */
export default defineStory({
  id: 'balloonSeller',
  slot: 'pavement',
  window: [3.0, 12.5],
  dur: 0.9,
  cast: { seller: {}, kid: { kid: true } },
  outcomes: {
    main: {
      tags: ['air', 'joy'],
      captions: {
        peak: '{seller} lets every balloon go.',
        near: '{seller}, loosening the knot.',
        after: "{seller}'s balloons, off to the sun.",
        idle: '{seller} and eight balloons.',
      },
    },
    lifted: {
      tags: ['air', 'oops'],
      captions: {
        peak: '{seller}, briefly airborne.',
        near: '{seller}, loosening the knot.',
        after: '{seller}, back down, holding on tight.',
        idle: '{seller} and eight balloons.',
      },
    },
    keepOne: {
      tags: ['air', 'joy'],
      captions: {
        peak: '{kid} keeps just one balloon.',
        near: '{kid}, reaching for a string.',
        after: '{kid} and the very last balloon.',
        idle: '{seller} and eight balloons.',
      },
    },
  },
  create({ slot, person, group, evening, outcome, site, moment }) {
    const seller = person('seller', slot.x - 0.3, 0, slot.z, 'L');
    const kid = person('kid', slot.x + 0.75, 0, slot.z + 0.15, 'R');
    const balloons = BUNCH.map(([x, y], i) => {
      const b = makeToyBalloon(evening.pick(COLOURS));
      b.userData = { x, y, z: 0.15 + i * 0.012, phase: evening.range(0, 6) };
      group.add(b);
      return b;
    });
    const stringGeo = new THREE.BufferGeometry();
    stringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BUNCH.length * 6), 3));
    const strings = new THREE.LineSegments(stringGeo, new THREE.LineBasicMaterial({ color: '#3a3340' }));
    strings.frustumCulled = false;
    group.add(strings);

    const dur = 0.9;
    const hand = vec();
    const kidHand = vec();
    const centre = vec();
    const gather = vec();
    const tied = vec();
    let lastP = -99;
    // How far the released bunch has risen p seconds after letting go.
    const rise = (p) => (p > 0 ? 0.55 * p + 0.32 * p * p : 0);

    // Chain: with the crane up tonight, the released bunch drifts over and snags on its jib.
    const snag = outcome === 'main' && site ? vec(Math.min(Math.max(slot.x, site.jib.x0 + 0.4), site.jib.x1 - 0.4), site.jib.y - 0.35, site.z + 0.3) : null;
    const SNAG_FROM = 0.6;
    const SNAG_AT = 3.6;
    if (snag) {
      moment({
        id: 'crane',
        at: SNAG_AT,
        dur: 1.6,
        focus: () => balloons,
        tags: ['crossover', 'air'],
        captions: {
          peak: "{seller}'s balloons, caught on the crane.",
          near: 'Balloons, drifting toward the crane.',
          after: "{seller}'s balloons, still on the crane.",
          idle: "{seller}'s balloons, still on the crane.",
        },
      });
    }

    return {
      focus: () => {
        if (outcome === 'lifted') return [seller.root, ...balloons];
        if (outcome === 'keepOne' && lastP > dur + 0.4) return [kid.root, balloons[KEPT]];
        return balloons;
      },
      visible: (p) => outcome !== 'main' || p < 4.0 || !!snag,
      x: () => slot.x,
      update(p, { wall, outcome }) {
        lastP = p;
        const lifted = outcome === 'lifted';
        const keep = outcome === 'keepOne';
        const free = !lifted && p >= 0;

        // Lifted: the bunch takes the seller up, then lets them back down.
        const up = lifted ? 0.55 * smooth(seg(p, 0, 0.7)) * (1 - smooth(seg(p, dur + 0.5, dur + 1.6))) : 0;
        seller.root.position.y = up + (up > 0.05 ? Math.sin(wall * 3) * 0.04 : 0);
        seller.root.rotation.z = up > 0 ? Math.sin(wall * 2) * 0.1 * (up / 0.55) : 0;
        const tug = Math.sin(wall * 1.4) * 0.08;
        if (p < -1.6) {
          seller.pose({ armR: 2.6 + tug * 0.5, armL: 0.35 + Math.sin(wall * 2) * 0.1, mouth: 0.4 });
        } else if (p < 0) {
          const loosen = smooth(seg(p, -1.0, -0.2));
          seller.pose({ armR: 2.6, armL: lerp(0.35, 2.4, loosen), head: -0.1 * loosen, mouth: 0.4 + 0.3 * loosen });
        } else if (lifted) {
          const kick = Math.sin(wall * 10) * 0.4 * (up / 0.55);
          seller.pose({ armR: 2.75, armL: p < dur + 1.6 ? 2.0 + Math.sin(wall * 9) * 0.4 : 0.3, legL: kick, legR: -kick, eyes: up > 0.1 ? 1.4 : 1, mouth: up > 0.1 ? 1 : 0.5 });
        } else {
          const cheer = p < dur + 1.4;
          seller.pose({ armR: cheer ? 2.8 : 0.3, armL: cheer ? 2.8 : 0.3, bob: cheer ? Math.abs(Math.sin(wall * 8)) * 0.05 : 0, head: cheer ? 0 : -0.08, mouth: cheer ? 0.9 : 0.5 });
        }

        const reach = keep ? smooth(seg(p, -0.7, -0.3)) : 0;
        if (p < 0) kid.pose({ armL: lerp(0.4, 2.5, reach), armR: 0.3, head: 0.12, bob: reach * 0.03, mouth: 0.4 + 0.3 * reach });
        else if (keep) kid.pose({ armL: 2.5, armR: p < dur + 1.2 ? 2.6 : 0.3, bob: p < 0.6 ? arc(seg(p, 0, 0.6), 0.12) : 0, mouth: 0.9 });
        else if (lifted) kid.pose({ armL: 2.7, armR: 2.7, bob: up > 0.1 ? Math.abs(Math.sin(wall * 9)) * 0.1 : 0, mouth: 1 });
        else kid.pose({ armL: 2.4, armR: 2.4, head: 0.1, mouth: 0.8 });

        seller.root.updateMatrixWorld(true);
        kid.root.updateMatrixWorld(true);
        seller.hand('R', hand);
        kid.hand('L', kidHand);
        const r = free ? rise(p) : 0;
        if (free) centre.set(hand.x + 0.15 * p + Math.sin(wall * 0.9) * 0.08, hand.y + 1.3 + r, slot.z);
        else centre.set(hand.x + tug, hand.y + 1.3, slot.z);
        if (snag && p > SNAG_FROM) {
          // Drawn off toward the crane, then caught by the strings under the jib.
          const u = smooth(seg(p, SNAG_FROM, SNAG_AT));
          const hang = vec(snag.x + Math.sin(wall * 1.2) * 0.12, snag.y - 1.1, snag.z);
          centre.lerp(hang, u);
        }
        if (!free) gather.copy(hand);
        else {
          tied.set(centre.x, centre.y - 1.1, slot.z + 0.2);
          if (snag && p > SNAG_AT - 0.3) tied.lerp(snag, smooth(seg(p, SNAG_AT - 0.3, SNAG_AT)));
          gather.lerpVectors(hand, tied, smooth(seg(p, 0, 0.3)));
          if (p > 0.3) gather.copy(tied);
        }
        const spread = free ? Math.min(1.6, 1 + 0.12 * p) : 1;
        const arr = stringGeo.attributes.position.array;
        balloons.forEach((b, i) => {
          const d = b.userData;
          const bob = Math.sin(wall * 1.3 + d.phase) * 0.04;
          b.position.set(centre.x + d.x * spread, centre.y + d.y * spread - 0.28 + bob, slot.z + d.z);
          b.rotation.z = Math.sin(wall * 1.1 + d.phase) * 0.08;
          let end = gather;
          if (keep && i === KEPT && p > -0.3) {
            const held = vec(kidHand.x - 0.1 + Math.sin(wall * 1.3) * 0.05, kidHand.y + 1.0, slot.z + d.z);
            b.position.lerp(held, smooth(seg(p, -0.3, 0.4)));
            end = kidHand;
          }
          arr.set([b.position.x, b.position.y, b.position.z, end.x, end.y, end.z + 0.02], i * 6);
        });
        stringGeo.attributes.position.needsUpdate = true;
      },
    };
  },
});
