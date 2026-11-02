import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { makePigeon } from '../props/a-props.js';
import { makeStrings } from '../props/h-props.js';

const ROLES = ['dog1', 'dog2', 'dog3', 'dog4'];
const SIZE = 0.55;

/** A dog walker with four small dogs on four leads. They all sit at once. Or see a pigeon. */
export default defineStory({
  id: 'dogWalker',
  slot: 'park',
  window: [3.0, 14.0],
  dur: 0.9,
  tags: ['animal'],
  cast: { walker: {}, dog1: { kind: 'dog' }, dog2: { kind: 'dog' }, dog3: { kind: 'dog' }, dog4: { kind: 'dog' } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: "{walker}'s four dogs, all sitting at once.",
        near: '{walker}: sit… sit… sit…',
        after: '{walker}, handing out treats.',
        idle: '{walker}, walking four small dogs.',
      },
      sounds: [[-1.3, 'whistle'], [0, 'tada'], [1.2, 'bark']],
    },
    pigeon: {
      tags: ['oops'],
      captions: {
        peak: '{walker}, towed off by four small dogs.',
        near: '{dog1} has spotted a pigeon.',
        after: '{walker}, face down in the grass.',
        idle: '{walker}, walking four small dogs.',
      },
      sounds: [[-0.55, 'bark'], [0, 'whoosh'], [0.9, 'thud']],
    },
  },
  create({ slot, person, dog: makeDog, add, group, evening, outcome, particles }) {
    const z = slot.z;
    const x0 = slot.x - 1.6;
    const walker = person('walker', x0, 0, z, 'L');
    const dogs = ROLES.map((role, k) => {
      const d = makeDog(role);
      d.home = vec(slot.x - 0.8 + k * 0.52, 0, z + [0.12, -0.1, 0.2, -0.04][k]);
      d.phase = evening.range(0, 6);
      d.root.scale.setScalar(SIZE);
      add(d.root, d.home.x, 0, d.home.z);
      return d;
    });
    const leads = makeStrings(dogs.length, 5);
    group.add(leads.lines);
    const towed = outcome === 'pigeon';
    const pigeon = towed ? makePigeon() : null;
    if (pigeon) {
      pigeon.group.scale.set(-1, 1, 1);
      group.add(pigeon.group);
    }
    const land = vec(slot.x + 2.1, 0.12, z + 0.35);
    const from = vec(slot.x + 4.2, 4.2, z + 0.35);

    const dur = 0.9;
    const hand = vec();
    const collar = vec();
    const neck = vec(-0.1, -0.08, 0);
    let hearts = false;
    // How far the pack has dashed after the pigeon.
    const dash = (p) => 1.25 * easeOut(seg(p, -0.05, 0.8));
    const sit = (wag) => ({ tilt: 0.45, crouch: 0.13, legs: -0.45, head: -0.3, wag });

    return {
      focus: () => [walker.root, ...dogs.map((d) => d.root)],
      update(p, { wall }) {
        // ── The dogs ──
        dogs.forEach((d, k) => {
          const ph = d.phase;
          const wander = 0.08 * Math.sin(wall * 0.7 + ph);
          const sniff = Math.sin(wall * 1.3 + ph) > 0.4 ? -0.45 : 0;
          const idle = { legs: Math.sin(wall * 10 + ph) * 0.2 * Math.abs(Math.cos(wall * 0.7 + ph)), wag: Math.sin(wall * 9 + ph) * 0.4, head: sniff };
          let face = 1;
          let x = d.home.x + wander;
          let pose = idle;
          if (!towed) {
            const turn = -1.3 + k * 0.25;
            const settled = p > -1.6 && p < dur + 2.6;
            if (settled && p > turn) {
              face = -1;
              x = d.home.x;
              pose = { jump: Math.abs(Math.sin(wall * 9 + ph)) * 0.06, wag: Math.sin(wall * 16 + ph) * 0.6, head: 0.15 };
            }
            if (p > -0.15 && p < dur + 2.6) {
              const s = smooth(seg(p, -0.15, 0));
              // The treat: a little hop up to catch it.
              const hop = p > dur + 0.35 && p < dur + 0.75 ? Math.sin(Math.PI * seg(p, dur + 0.35, dur + 0.75)) * 0.25 : 0;
              const st = sit(Math.sin(wall * 16 + ph) * 0.6);
              pose = { tilt: st.tilt * s, crouch: st.crouch * s - hop, legs: st.legs * s, head: lerp(0.15, st.head, s), wag: st.wag };
            }
          } else if (p > -0.6) {
            if (p < -0.05) pose = { crouch: 0.04, head: 0.3, wag: 1.0 };
            else if (p < 0.85) {
              const g = Math.sin(wall * 20 + ph);
              pose = { jump: Math.abs(Math.sin(wall * 10 + ph)) * 0.08, tilt: g * 0.1, legs: g * 0.6, head: 0.2, wag: 0.9 };
            } else if (p < dur + 2.0) pose = { jump: Math.abs(Math.sin(wall * 7 + ph)) * 0.15, head: 0.5, tilt: 0.2, wag: Math.sin(wall * 14 + ph) * 0.5 };
            else pose = sit(Math.sin(wall * 9 + ph) * 0.4);
            x = d.home.x + dash(p) + wander * (p > dur + 2.0 ? 1 : 0);
          }
          d.root.scale.x = face * SIZE;
          d.root.position.x = x;
          d.pose(pose);
        });

        // ── The walker ──
        const wx = towed ? x0 + dash(p - 0.08) : x0;
        walker.root.position.x = wx;
        if (!towed) {
          const ask = smooth(seg(p, -1.5, -1.2));
          const proud = p >= 0 && p < dur + 0.3;
          const toss = p >= dur + 0.3 && p < dur + 0.6;
          walker.pose({
            armR: 0.6,
            armL: toss ? 1.2 : p > dur + 2.2 ? 0.2 : lerp(0.2, 2.4, ask) + (proud ? 0.2 + Math.sin(wall * 8) * 0.1 : 0),
            bob: proud ? Math.abs(Math.sin(wall * 8)) * 0.04 : 0,
            head: -0.08,
            mouth: proud ? 0.9 : p > -1.5 && p < 0 ? 0.3 + 0.4 * Math.abs(Math.sin(wall * 6)) : 0.35,
            brows: p > -1.5 && p < 0 ? 0.5 : null,
          });
        } else if (p < -0.6) {
          walker.pose({ armR: 0.6, armL: 0.2, head: -0.08, mouth: 0.35 });
        } else if (p < -0.05) {
          walker.pose({ armR: 0.9, armL: 0.2, lean: -0.05, head: 0.05, mouth: 0.6, eyes: 1.3 });
        } else if (p < 0.85) {
          const flutter = Math.sin(wall * 14);
          walker.pose({ lean: lerp(-0.2, -1.25, smooth(seg(p, -0.05, 0.15))), bob: 0.06, armR: 2.9, armL: 2.9, legL: 0.2 + flutter * 0.25, legR: 0.2 - flutter * 0.25, mouth: 1, eyes: 1.3 });
        } else {
          const down = smooth(seg(p, 0.85, 1.0));
          const okay = p > dur + 1.6;
          // Face down, both arms still out towards the dogs (a little further round, to clear the grass).
          walker.pose({ lean: lerp(-1.25, -1.62, down), bob: lerp(0.06, -0.52, down), armR: lerp(2.9, 3.3, down), armL: okay ? 2.2 + Math.sin(wall * 5) * 0.15 : 2.9, legL: 0.1, legR: 0.1, mouth: okay ? 0.3 : 0.6 });
        }
        walker.root.updateMatrixWorld(true);
        walker.hand('R', hand);

        // ── The leads: loose, or taut when the dogs pull ──
        const taut = towed && p > -0.6 && p < 0.85;
        dogs.forEach((d, k) => {
          d.root.updateMatrixWorld(true);
          d.head.localToWorld(collar.copy(neck));
          leads.set(k, hand, collar, taut ? 0.01 : 0.1 + 0.03 * k);
        });

        if (!towed && p >= 0.05 && !hearts) {
          hearts = true;
          for (const d of dogs) {
            d.head.localToWorld(collar.set(0, 0.25, 0));
            particles.spawn('heart', collar, vec((Math.random() - 0.5) * 0.3, 0.7, 0), { life: 1.3, scale: 0.55 });
          }
        }

        // ── The pigeon (towed only): lands, pecks, and is gone before anyone gets there ──
        if (pigeon) {
          const g = pigeon.group;
          g.visible = p > -1.5 && p < 1.4;
          if (p < -0.8) {
            const u = smooth(seg(p, -1.5, -0.8));
            g.position.lerpVectors(from, land, u);
            g.scale.x = -1;
            pigeon.wing.rotation.z = Math.sin(wall * 30) * 0.8;
            g.rotation.z = 0;
          } else if (p < 0.05) {
            g.position.copy(land);
            g.scale.x = -1;
            pigeon.wing.rotation.z = 0;
            g.rotation.z = Math.sin(wall * 9) > 0.3 ? 0.45 : 0;
          } else {
            const u = seg(p, 0.05, 1.4);
            g.position.set(land.x + 2.6 * u, land.y + 1.6 * u + 3 * u * u, land.z);
            g.scale.x = 1;
            pigeon.wing.rotation.z = Math.sin(wall * 30) * 0.8;
            g.rotation.z = 0.3;
          }
        }
      },
    };
  },
});
