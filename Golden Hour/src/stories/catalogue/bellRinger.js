import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, lerp, arc, vec } from '../anim.js';
import { makeBelfry, makePigeon } from '../props/a-props.js';
import { LAYOUT } from '../../world/Town.js';

const FLYERS = 6;
/** How many pigeons go and sit on the apartment roof when someone is up there tonight. */
const ROOSTERS = 4;
const ROOST_FLIGHT = 2.0;

/** Allowed to ring the church bell at last: the pigeons scatter, or the rope gives way. */
export default defineStory({
  id: 'bellRinger',
  slot: 'tower',
  window: [3.0, 13.5],
  dur: 0.9,
  cast: { ringer: {} },
  outcomes: {
    main: {
      tags: ['animal', 'joy', 'finally'],
      captions: {
        peak: '{ringer} rang the bell. The pigeons objected.',
        near: '{ringer}, one big pull.',
        after: 'Pigeons, all over town.',
        idle: '{ringer}, eyeing the bell rope.',
      },
    },
    snap: {
      tags: ['oops', 'falling'],
      captions: {
        peak: '{ringer}, the rope, and the ground.',
        near: '{ringer}, one big pull.',
        after: '{ringer}, still holding the rope.',
        idle: '{ringer}, eyeing the bell rope.',
      },
    },
    stubborn: {
      tags: ['animal', 'joy'],
      captions: {
        peak: 'One pigeon, staying put.',
        near: '{ringer}, one big pull.',
        after: 'One pigeon, still not moving.',
        idle: '{ringer}, eyeing the bell rope.',
      },
    },
  },
  create({ slot, person, group, evening, outcome, particles, tonight, moment }) {
    const snap = outcome === 'snap';
    const stubborn = outcome === 'stubborn';
    const belfry = makeBelfry();
    belfry.group.position.set(slot.x, slot.y, slot.z + 0.02);
    group.add(belfry.group);
    // Ringer stands left of the church steps, rope running up to the belfry.
    const ringer = person('ringer', slot.x - 1.45, 0, slot.z + 1.25, 'L');

    // Two pigeons on the sill, more hiding inside.
    const sill = slot.y - 0.32;
    const perched = [-0.24, 0.26].map((px, i) => {
      const pg = makePigeon();
      pg.group.position.set(slot.x + px, sill, slot.z + 0.12);
      pg.group.scale.set(i ? -1 : 1, 1, 1);
      group.add(pg.group);
      return pg;
    });
    const stayer = stubborn ? perched[0] : null;
    const flyers = [];
    for (let i = 0; i < FLYERS + 2; i++) {
      const pg = i < FLYERS ? makePigeon() : perched[i - FLYERS];
      if (pg === stayer) continue;
      const a = lerp(0.35, Math.PI - 0.35, (i % FLYERS) / (FLYERS - 1)) + evening.range(-0.2, 0.2);
      const v = vec(Math.cos(a), Math.sin(a) * 0.8 + 0.25, evening.range(0.1, 0.5)).multiplyScalar(evening.range(2.2, 3.0));
      if (i < FLYERS) {
        pg.group.visible = false;
        group.add(pg.group);
      }
      flyers.push({ pg, v, own: i < FLYERS, delay: evening.range(0, 0.15), phase: evening.range(0, 6), home: pg.group.position.clone() });
    }

    // Chain: if a rooftop story is on tonight, the first few pigeons fly over and sit with them.
    const roosting = !snap && (tonight.includes('rooftopKiss') || tonight.includes('laundry'));
    const roosters = [];
    if (roosting) {
      const A = LAYOUT.apartment;
      for (const f of flyers.filter((q) => q.own).slice(0, ROOSTERS)) {
        f.roost = vec(A.x - A.w / 2 + 0.35 + roosters.length * 0.72 + evening.range(-0.1, 0.1), A.h + 0.32, A.z + 0.6);
        roosters.push(f.pg.group);
      }
      moment({
        id: 'roost',
        at: ROOST_FLIGHT + 0.2,
        dur: 1.6,
        focus: () => roosters,
        visible: (p) => p > -0.6,
        tags: ['crossover', 'animal'],
        captions: {
          peak: "{ringer}'s pigeons, now on the roof.",
          near: 'Pigeons, heading for the roof.',
          after: 'Pigeons, watching the sunset from the roof.',
          idle: 'Pigeons, watching the sunset from the roof.',
        },
      });
    }

    const ropeGeo = new THREE.BufferGeometry();
    ropeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3));
    const rope = new THREE.LineSegments(ropeGeo, new THREE.LineBasicMaterial({ color: '#8a6a4a' }));
    rope.frustumCulled = false;
    group.add(rope);

    const dur = 0.9;
    const top = vec();
    const hand = vec();
    const at = vec();
    const mouthOfBelfry = vec(slot.x, slot.y + 0.05, slot.z + 0.15);
    let rung = 0;

    const clang = () => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        particles.spawn('spark', mouthOfBelfry, vec(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0.3), { life: 0.7, scale: 0.9, color: '#ffd27a' });
      }
    };

    return {
      focus: () => (snap ? [ringer.root] : stubborn ? [belfry.group, stayer.group] : [belfry.group]),
      update(p, { wall }) {
        // Two practice pulls, then the big one at the peak.
        const tug = (c, w) => Math.max(0, 1 - Math.abs(p - c) / w);
        let pull = Math.max(tug(-1.3, 0.3) * 0.5, tug(-0.6, 0.3) * 0.7, tug(0, 0.25));
        if (p < -1.6) pull = 0;
        const broke = snap && p >= 0;

        // The bell: small swings from the practice pulls, a big swing at the peak.
        let swing = -0.35 * Math.sin(Math.PI * seg(p, -1.3, -0.4)) - 0.5 * Math.sin(Math.PI * seg(p, -0.6, 0.3));
        if (p >= 0) {
          const amp = snap ? 0.5 * Math.exp(-p * 2) : 1.3 * Math.exp(-Math.max(0, p - 0.6) * 0.5);
          swing = -amp * Math.sin((2 * Math.PI * p) / 0.9);
        }
        belfry.bell.rotation.z = swing;
        belfry.clapper.rotation.z = -swing * 0.5;
        if (p >= 0 && rung === 0 && !snap) {
          rung = 1;
          clang();
        } else if (p >= 0.45 && rung === 1) {
          rung = 2;
          clang();
        } else if (p < 0) rung = 0;

        // The ringer.
        const sway = Math.sin(wall * 1.2) * 0.03;
        if (p < -1.6) {
          ringer.pose({ armL: 0.3, armR: 0.5 + Math.sin(wall * 2) * 0.1, lean: sway, head: 0.12, mouth: 0.35 });
          ringer.root.rotation.z = 0;
          ringer.root.position.y = 0;
        } else if (!broke) {
          const cheer = p > 0.2 && !snap;
          ringer.pose({
            armR: cheer && p < dur + 1.4 ? 2.9 : lerp(2.75, 1.95, pull),
            armL: cheer && p < dur + 1.4 ? 2.9 : -lerp(2.85, 2.05, pull),
            bob: -0.14 * pull,
            lean: 0.08 * pull + sway,
            head: 0.1,
            mouth: cheer ? 1 : 0.4 + 0.4 * pull,
          });
          ringer.root.rotation.z = 0;
          ringer.root.position.y = 0;
        } else {
          // Snapped: over backwards, legs in the air, then a slow sit-up.
          const fall = smooth(seg(p, 0, 0.3)) * (1 - smooth(seg(p, dur + 2.4, dur + 3.0)));
          ringer.root.rotation.z = 1.5 * fall;
          ringer.root.position.y = 0.2 * fall;
          ringer.pose({ armR: lerp(2.0, 2.9, fall), armL: -lerp(2.1, 2.9, fall), legL: -0.5 * fall, legR: 0.6 * fall + Math.sin(wall * 9) * 0.15 * fall, mouth: fall > 0.5 ? 0.9 : 0.5 });
        }

        // The rope: wheel → hands, or two loose ends once it snaps.
        belfry.group.updateMatrixWorld(true);
        ringer.root.updateMatrixWorld(true);
        belfry.bell.localToWorld(top.copy(belfry.rope));
        ringer.hand('R', hand);
        const arr = ropeGeo.attributes.position.array;
        if (!broke) {
          at.lerpVectors(top, hand, 0.5);
          arr.set([top.x, top.y, top.z, at.x, at.y, at.z, at.x, at.y, at.z, hand.x, hand.y, hand.z]);
        } else {
          const drop = smooth(seg(p, 0, 0.4));
          arr.set([top.x, top.y, top.z, top.x - 0.05, top.y - lerp(1.2, 0.7, drop), top.z]);
          arr.set([hand.x, hand.y, hand.z, hand.x + lerp(0.3, 0.7, drop), hand.y + lerp(1.0, 0.05, drop), hand.z + 0.05], 6);
        }
        ropeGeo.attributes.position.needsUpdate = true;

        // Pigeons.
        for (const [i, pg] of perched.entries()) {
          if (pg === stayer || p < 0 || snap) {
            pg.group.rotation.z = 0;
            pg.wing.rotation.z = 0;
            pg.group.position.y = sill + Math.max(0, Math.sin(wall * 3 + i * 2)) * 0.02;
          }
        }
        if (stayer) {
          // Puffed up and turned to face the noise, unmoved.
          const huff = smooth(seg(p, 0, 0.2)) * (1 - smooth(seg(p, dur + 1.5, dur + 2.0)));
          stayer.group.scale.set(p > 0.1 && p < dur + 1.8 ? -1.15 : 1, 1 + 0.15 * huff, 1);
        }
        for (const f of flyers) {
          const t = p - f.delay;
          if (f.roost) {
            // Over to the apartment roof, then settle on the parapet.
            f.pg.group.visible = t >= 0;
            if (t < 0) continue;
            const u = smooth(seg(t, 0, ROOST_FLIGHT));
            const pos = f.pg.group.position;
            pos.lerpVectors(mouthOfBelfry, f.roost, u);
            pos.y += arc(u, 1.4);
            f.pg.group.scale.x = u < 1 ? 1 : Math.sin(wall * 0.7 + f.phase) > 0 ? 1 : -1;
            f.pg.group.rotation.z = u < 1 ? 0.2 : 0;
            f.pg.wing.rotation.z = u < 1 ? Math.sin(wall * 22 + f.phase) * 0.9 : 0;
            continue;
          }
          const go = !snap && t >= 0 && t < 8;
          if (f.own) f.pg.group.visible = go;
          if (!go) {
            if (!f.own && !snap) f.pg.group.position.copy(f.home);
            continue;
          }
          const pos = f.pg.group.position;
          if (f.own) {
            pos.set(mouthOfBelfry.x, mouthOfBelfry.y, mouthOfBelfry.z).addScaledVector(f.v, t);
          } else {
            pos.copy(f.home).addScaledVector(f.v, t);
          }
          pos.y += Math.sin(wall * 3 + f.phase) * 0.05 * Math.min(1, t * 2);
          f.pg.group.scale.x = f.v.x < 0 ? -1 : 1;
          f.pg.group.rotation.z = Math.atan2(f.v.y, Math.abs(f.v.x)) * 0.5 * (f.v.x < 0 ? -1 : 1);
          f.pg.wing.rotation.z = Math.sin(wall * 22 + f.phase) * 0.9;
        }
      },
    };
  },
});
