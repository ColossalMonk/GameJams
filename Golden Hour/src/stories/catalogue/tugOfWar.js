import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, vec } from '../anim.js';
import { makeRope, makeRibbon, span, pinPuppet } from '../props/h-props.js';

const RED = '#e2574c';
const BLUE = '#5f8fb5';

/** Tug of war in the park, two against two. One side finally wins. Or the rope gives up. */
export default defineStory({
  id: 'tugOfWar',
  slot: 'park',
  window: [3.0, 14.0],
  dur: 0.8,
  cast: { a: { look: { top: RED } }, b: { look: { top: RED } }, c: { look: { top: BLUE } }, d: { look: { top: BLUE } } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{a} and {b} win the tug of war!',
        near: '{a} and {c}, pulling with everything.',
        after: '{a} and {b}, champions of the park.',
        idle: '{a} and {b} versus {c} and {d}.',
      },
      sounds: [[-1.0, 'drum'], [0, 'cheer'], [0.3, 'thud']],
    },
    snap: {
      tags: ['oops', 'falling'],
      captions: {
        peak: 'Snap! {a}, {b}, {c} and {d}, all down.',
        near: '{a} and {c}, pulling with everything.',
        after: '{a} and {c}, holding half a rope each.',
        idle: '{a} and {b} versus {c} and {d}.',
      },
      sounds: [[-1.0, 'drum'], [0, 'tear'], [0.3, 'thud']],
    },
  },
  create({ slot, person, group, add, evening, outcome }) {
    const cx = slot.x + 0.15;
    const z = slot.z;
    // {a} and {b} are the side that wins; which end of the rope they hold is up to the evening.
    // s is each puller's "away from the middle" direction.
    const w = evening.chance(0.5) ? -1 : 1;
    const team = [
      { role: 'a', s: w, off: 0.55, dz: 0.1 },
      { role: 'b', s: w, off: 1.05, dz: 0 },
      { role: 'c', s: -w, off: 0.55, dz: 0.1 },
      { role: 'd', s: -w, off: 1.05, dz: 0 },
    ].map((m, k) => ({ ...m, k, pup: person(m.role, cx + m.s * m.off, 0, z + m.dz, m.s < 0 ? 'L' : 'R'), hand: vec() }));
    const [a, b, c, d] = team;
    const ropes = [0, 1, 2, 3].map(() => {
      const r = makeRope();
      group.add(r);
      return r;
    });
    const ribbon = makeRibbon();
    add(ribbon, cx, 1.0, z + 0.12);
    const snap = outcome === 'snap';
    const dur = 0.8;

    const hips = (pup) => (v) => pup.hips.getWorldPosition(v);
    const stand = vec();
    const fall = vec();
    const at = vec();
    const ribbonAt0 = vec();
    const endA = vec();
    const endC = vec();
    const tail = vec();
    const tail2 = vec();

    // Arms out towards the middle, rope hand first; legs braced or kicking. All by side.
    const toward = (s, lead, across) => (s < 0 ? { armR: lead, armL: across } : { armL: lead, armR: across });
    const legsTo = (s, front, back) => (s < 0 ? { legR: front, legL: back } : { legL: front, legR: back });
    // The rope wanders as both sides heave; it ends up with the winners (main only).
    const shift = (p) => 0.12 * Math.sin(p * 4.3) * seg(p, -1.8, -0.6) * (1 - seg(p, -0.25, -0.1)) + (snap ? 0 : w * 0.35 * easeOut(seg(p, -0.25, 0.1)));

    /** Straining, standing: the start of everything. */
    const strain = (m, p, wall) => {
      const pull = p > -1.8 ? 1 : 0.4;
      const heave = Math.sin(wall * 6 + m.k) * 0.04 * pull;
      return { lean: -m.s * (0.12 + 0.2 * pull) + heave, bob: -0.05 * pull, ...toward(m.s, 1.3, -0.9), ...legsTo(m.s, 0.35 * pull, -0.05), brows: -pull, mouth: p > -1.8 ? 0.55 : 0.35 };
    };
    /** Down on their backs, legs and rope in the air. */
    const sprawl = (m, p, wall, cheer) => {
      const kick = Math.sin(wall * 10 + m.k) * 0.15;
      return { ...toward(m.s, 2.3 + (cheer ? kick : 0), -1.9), ...legsTo(m.s, 0.9 + kick, -0.5 - kick), mouth: 1, eyes: cheer ? 0.2 : 1.3 };
    };

    return {
      focus: () => team.map((m) => m.pup.root),
      update(p, { wall }) {
        const sh = shift(p);
        for (const m of team) {
          const pup = m.pup;
          const x = cx + m.s * m.off + sh;
          const falls = snap || m.s === w;
          const u = falls ? easeOut(seg(p, -0.05, 0.3)) : 0;
          const angle = -m.s * 0.85 * u;
          if (p < -0.05) pup.pose(strain(m, p, wall));
          else if (falls) pup.pose(u < 1 ? { ...strain(m, p, wall), ...toward(m.s, 2.0, -1.4) } : sprawl(m, p, wall, !snap || p > dur + 1.2));
          else {
            // The losing side lurches in after the rope, down on hands and knees.
            const go = smooth(seg(p, -0.1, 0.35));
            const front = m.off < 1;
            const laugh = p > dur + 1.2;
            pup.pose({ lean: m.s * lerp(0.2, front ? 0.85 : 0.5, go), bob: -lerp(0.05, front ? 0.38 : 0.26, go), ...toward(m.s, 2.4, 2.0), ...legsTo(m.s, 0.2, 0.2), mouth: laugh ? 0.9 : 0.6, eyes: laugh ? 0.2 : 1.3 });
          }
          if (!falls || p < -0.05) {
            pup.root.rotation.z = 0;
            pup.root.position.set(falls ? x : x - m.s * 0.2 * easeOut(seg(p, -0.15, 0.3)), 0, z + m.dz);
          } else {
            // Falling back: turned away from the middle, hips dropping to the grass behind the feet.
            const hipY = pup.hips.position.y * pup.options.height;
            pinPuppet(pup, angle, hips(pup), at.set(x + m.s * 0.25 * u, lerp(hipY, 0.3, u), z + m.dz), fall);
            pup.root.position.lerpVectors(stand.set(x, 0, z + m.dz), fall, u);
          }
          pup.root.updateMatrixWorld(true);
          pup.hand(m.s < 0 ? 'R' : 'L', m.hand);
        }

        // ── Ribbon and rope ──
        const rib = ribbon.position;
        const loser = team.find((m) => m.s !== w && m.off < 1);
        const winner = team.find((m) => m.s === w && m.off < 1);
        if (p < 0 || (!snap && p < 0.05)) {
          rib.set(cx + sh, (a.hand.y + c.hand.y) / 2, z + 0.12);
          if (!snap && p > -0.1) rib.lerp(at.copy(winner.hand).add(vec(-w * 0.45, -0.1, 0)), smooth(seg(p, -0.1, 0.05)));
          ribbon.rotation.z = Math.sin(wall * 5) * 0.08 * seg(p, -1.8, -0.6);
          ribbonAt0.copy(rib);
        } else if (!snap) {
          rib.copy(winner.hand).add(at.set(-w * 0.45, -0.1, 0));
          rib.z = z + 0.12;
          ribbon.rotation.z = Math.sin(wall * 3) * 0.1;
        } else {
          // Snapped: the bow flutters down on its own.
          const u = seg(p, 0, 1.4);
          rib.set(ribbonAt0.x + Math.sin(wall * 4) * 0.12 * (1 - u), lerp(ribbonAt0.y, 0.08, easeIn(u)), ribbonAt0.z);
          ribbon.rotation.z = u < 1 ? Math.sin(wall * 6) * 0.5 : 0.2;
        }

        // Pieces: back → front on each side, then front → the middle (or a loose end).
        const [w1, w2] = [team.find((m) => m.s === w && m.off > 1), winner];
        const [l1, l2] = [team.find((m) => m.s !== w && m.off > 1), loser];
        span(ropes[0], w1.hand, w2.hand);
        span(ropes[2], l1.hand, l2.hand);
        if (!snap) {
          span(ropes[1], w2.hand, rib);
          if (p < 0.05) span(ropes[3], rib, l2.hand);
          else {
            // Let go: the rope end lies in the grass.
            tail.set(rib.x - w * 0.9, 0.05, rib.z);
            span(ropes[3], rib, tail);
            span(ropes[2], tail, tail2.set(tail.x - w * 0.5, 0.05, rib.z));
          }
        } else {
          if (p < 0) {
            span(ropes[1], w2.hand, rib);
            span(ropes[3], rib, l2.hand);
          } else {
            // Each free end whips up and over, then drops.
            for (const [m, end, piece] of [[w2, endA, ropes[1]], [l2, endC, ropes[3]]]) {
              const up = easeOut(seg(p, 0, 0.3));
              const down = easeIn(seg(p, 0.3, 0.7));
              end.lerpVectors(ribbonAt0, at.copy(m.hand).add(vec(m.s * 0.15, 0.55, 0)), up);
              end.lerp(at.set(m.hand.x - m.s * 0.5, 0.05, m.hand.z), down);
              span(piece, m.hand, end);
            }
          }
        }
        for (const r of ropes) r.position.z = z + 0.13;
      },
    };
  },
});
