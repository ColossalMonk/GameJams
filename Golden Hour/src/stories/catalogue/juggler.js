import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, arc, vec } from '../anim.js';
import { makeBall } from '../props/h-props.js';

const BALLS = ['#e2574c', '#f2c14e', '#5f8fb5', '#7fae6a', '#9a6fb0'];
const GRAVITY = 9.8;
const FLOOR = 0.08;

/** Height of a ball dropped from y0 going up at vy, t seconds later, bouncing on the pavement. */
function bounce(y0, vy, t) {
  let y = y0;
  let v = vy;
  for (let k = 0; k < 4; k++) {
    const hit = (v + Math.sqrt(Math.max(0, v * v + 2 * GRAVITY * (y - FLOOR)))) / GRAVITY;
    if (t < hit) return y + v * t - 0.5 * GRAVITY * t * t;
    t -= hit;
    v = -0.45 * (v - GRAVITY * hit);
    y = FLOOR;
    if (v < 0.4) break;
  }
  return FLOOR;
}

/** A juggler on the pavement goes for the big finish: every ball in the air at once. */
export default defineStory({
  id: 'juggler',
  slot: 'pavement',
  window: [3.0, 14.0],
  dur: 0.8,
  cast: { juggler: { kid: false } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: "{juggler}'s big finish: all of them up.",
        near: '{juggler}, juggling faster and faster.',
        after: '{juggler}, taking a bow.',
        idle: '{juggler}, juggling for the street.',
      },
      sounds: [[-0.35, 'whoosh'], [0.9, 'tada'], [1.4, 'cheer']],
    },
    drop: {
      tags: ['oops', 'falling'],
      captions: {
        peak: "{juggler}'s balls, everywhere at once.",
        near: '{juggler}, juggling faster and faster.',
        after: '{juggler}, picking up the pieces.',
        idle: '{juggler}, juggling for the street.',
      },
      throws: { lands: 1.3, kinds: ['hand', 'head', 'mouth'], caption: "{juggler}'s ball, all the way to {target}.", after: "{target}, keeping {juggler}'s ball." },
      sounds: [[-0.2, 'gasp'], [0.25, 'thud'], [1.2, 'laugh']],
    },
  },
  create({ slot, person, group, evening, outcome, cross, particles }) {
    const jx = slot.x;
    const z = slot.z;
    const juggler = person('juggler', jx, 0, z, 'R');
    const n = evening.pick([3, 4, 5]);
    const colours = [...BALLS];
    const balls = Array.from({ length: n }, () => {
      const b = makeBall(colours.splice(Math.floor(evening.random() * colours.length), 1)[0]);
      group.add(b);
      return b;
    });
    const dur = 0.8;
    const drop = outcome === 'drop';

    // Throws per second: steady, then faster through the build-up. tau(p) counts throws.
    const r0 = 3.0;
    const r1 = 4.6;
    const tau = (p) => r0 * p + (r1 - r0) * (p < -1.6 ? 0 : p < -0.4 ? (p + 1.6) ** 2 / 2.4 : 0.6 + (p + 0.4));
    // How much of each throw-to-throw interval a ball spends in the hand.
    const dwell = 0.6;
    const hands = [vec(), vec()];
    const height = (p) => 0.45 + 0.1 * n + 0.35 * smooth(seg(p, -1.6, -0.4));

    /** A three-, four- or five-ball cascade: ball i, throw count t, into out. */
    const cascade = (i, t, h, out) => {
      const k = i + n * Math.floor((t - i) / n);
      const local = t - k;
      const from = hands[((k % 2) + 2) % 2];
      const to = hands[(((k + n) % 2) + 2) % 2];
      const air = n - dwell;
      if (local < air) {
        const u = local / air;
        out.lerpVectors(from, to, u);
        out.y += arc(u, h);
        if (from === to) out.x += Math.sign(from.x - jx) * Math.sin(Math.PI * u) * 0.18;
      } else {
        const u = (local - air) / dwell;
        out.copy(to);
        out.x += Math.sign(jx - to.x) * Math.sin(Math.PI * u) * 0.12;
        out.y -= Math.sin(Math.PI * u) * 0.06;
      }
      out.z = z + 0.15 + i * 0.01;
      return out;
    };

    // The finish: a fan of balls over the head.
    const fan = balls.map((_, i) => {
      const rel = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
      return vec(jx + rel * 0.55, 2.45 + 0.18 * (1 - rel * rel), z + 0.15 + i * 0.01);
    });
    // The mess: where each ball goes when it all goes wrong.
    const dropAt = -0.15;
    const bonkAt = 0.22;
    const scatter = balls.map((_, i) => ({ vx: evening.range(0.5, 1.6) * (i % 2 ? 1 : -1), vy: evening.range(0.8, 2.6), from: vec() }));
    const head = vec();
    const thrownFrom = vec();
    const end = vec();
    const tmp = vec();
    let snapped = false;
    let bonked = false;
    const thrown = drop && cross?.active ? balls[0] : null;

    const setHands = (p, wall) => {
      // Hands lift as they throw, alternating.
      const beat = tau(p) * Math.PI;
      return { armL: 0.75 + 0.18 * Math.max(0, Math.sin(beat)), armR: 0.75 + 0.18 * Math.max(0, -Math.sin(beat)), bob: Math.abs(Math.sin(wall * 3)) * 0.015 };
    };

    return {
      focus: () => (thrown ? [juggler.root, ...balls.slice(1)] : [juggler.root, ...balls]),
      thrown: balls[0],
      update(p, { wall }) {
        // ── The juggler ──
        let pose = { ...setHands(p, wall), mouth: 0.35, head: Math.sin(wall * 2) * 0.03 };
        if (p > -1.6 && p < dropAt + 0.05) pose = { ...pose, mouth: 0.25, brows: -0.6 * smooth(seg(p, -1.6, -0.6)), lean: drop ? Math.sin(wall * 11) * 0.04 * seg(p, -1.2, dropAt) : 0 };
        if (!drop) {
          const up = easeOut(seg(p, -0.4, -0.15));
          if (p > -0.4 && p < dur) pose = { armL: lerp(0.9, 2.6, up), armR: lerp(0.9, 2.6, up), mouth: 0.35 + 0.65 * up, eyes: 1.2 };
          else if (p >= dur && p < dur + 2.2) {
            const bow = p > dur + 0.45 && p < dur + 2.0 ? Math.sin(Math.PI * seg(p, dur + 0.45, dur + 2.0)) : 0;
            pose = { armL: lerp(2.6, 1.0, smooth(seg(p, dur, dur + 0.3))), armR: lerp(2.6, 1.0, smooth(seg(p, dur, dur + 0.3))), head: -0.3 * bow, bob: -0.07 * bow, mouth: 0.9, eyes: bow > 0.3 ? 0.2 : 1 };
          } else if (p >= dur + 2.2) pose = { ...setHands(p, wall), mouth: 0.3 };
        } else if (p >= dropAt) {
          const flail = Math.sin(wall * 18);
          if (p < dur + 0.4) pose = { armL: 2.4 + flail * 0.4, armR: 2.4 - flail * 0.4, lean: Math.sin(wall * 9) * 0.06, head: p > bonkAt && p < bonkAt + 0.3 ? 0.25 : 0, bob: p > bonkAt && p < bonkAt + 0.2 ? -0.05 : 0, mouth: 1, eyes: 1.3 };
          else if (p < dur + 1.6) pose = { armL: 2.75, armR: 0.3, head: 0.1, mouth: 0.6 };
          else pose = { armL: 0.9, armR: 0.9, head: Math.sin(wall * 2) * 0.12, mouth: 0.9, brows: 0.8 };
        }
        juggler.pose(pose);
        juggler.root.updateMatrixWorld(true);
        juggler.hand('L', hands[0]);
        juggler.hand('R', hands[1]);
        for (const h of hands) h.y += 0.06;

        // ── The balls ──
        const h = height(p);
        balls.forEach((b, i) => {
          const pos = b.position;
          b.rotation.z = (tau(p) + i) * 1.3;
          if (!drop) {
            if (p < -0.4) cascade(i, tau(p), h, pos);
            else if (p < 0) {
              cascade(i, tau(-0.4), h, tmp);
              const u = easeOut(seg(p, -0.4, 0));
              pos.lerpVectors(tmp, fan[i], u);
              pos.y += arc(u, 0.35);
            } else if (p < dur) {
              pos.copy(fan[i]);
              pos.y += Math.sin(Math.PI * p / dur) * 0.1;
            } else if (p < dur + 2.4) {
              const side = i < n / 2 ? 0 : 1;
              tmp.copy(hands[side]);
              tmp.y += 0.05 + (i % 3) * 0.07;
              tmp.z = fan[i].z;
              pos.lerpVectors(fan[i], tmp, easeIn(seg(p, dur, dur + 0.3)));
            } else {
              tmp.copy(hands[i < n / 2 ? 0 : 1]);
              tmp.y += 0.05 + (i % 3) * 0.07;
              tmp.z = fan[i].z;
              pos.lerpVectors(tmp, cascade(i, tau(p), height(-2), vec()), smooth(seg(p, dur + 2.4, dur + 2.8)));
            }
            return;
          }
          if (p < dropAt) {
            cascade(i, tau(p), h, pos);
            return;
          }
          if (!snapped) {
            snapped = true;
            balls.forEach((bb, k) => cascade(k, tau(dropAt), h, scatter[k].from));
            juggler.headTop(head);
            thrownFrom.copy(scatter[0].from);
          }
          if (b === thrown) {
            // Off over the crowd and into someone else's story.
            const q = seg(p, dropAt, 1.3);
            cross.point(end);
            end.z += 0.08;
            pos.lerpVectors(thrownFrom, end, q);
            pos.y += arc(q, 1.4 + 0.1 * thrownFrom.distanceTo(end));
            if (q >= 1) cross.land();
            return;
          }
          const s = scatter[i];
          // The second ball comes down on the juggler's head first.
          if (i === 1 && p < bonkAt) {
            const u = seg(p, dropAt, bonkAt);
            pos.lerpVectors(s.from, head, u);
            pos.y += arc(u, 0.5);
            return;
          }
          if (i === 1 && !bonked) {
            bonked = true;
            particles.spawn('puff', head, vec(0, 0.6, 0), { life: 0.5, scale: 0.4 });
          }
          const t0 = i === 1 ? bonkAt : dropAt;
          const t = p - t0;
          const x0 = i === 1 ? head.x : s.from.x;
          const y0 = i === 1 ? head.y : s.from.y;
          pos.set(x0 + s.vx * (1 - Math.exp(-2 * t)) / 2, bounce(y0, s.vy, t), s.from.z);
          b.rotation.z = -s.vx * (1 - Math.exp(-2 * t)) / 2 / 0.075;
        });
      },
    };
  },
});
