import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, arc, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { circle } from '../../world/shapes.js';
import { hillHeight } from '../../world/Town.js';

const R = 0.28;

function makeCheese() {
  const group = new THREE.Group();
  place(group, card(circle(0, 0, R), '#d9a03a'), 0, 0, 0);
  place(group, card(circle(0, 0, R * 0.8), '#f6d36b', { depth: 0.01 }), 0, 0, 0.04);
  for (const [x, y, r] of [[0.09, 0.07, 0.04], [-0.08, 0.02, 0.03], [0.02, -0.11, 0.035]]) {
    place(group, card(circle(x, y, r), '#e2b04a', { depth: 0.005, shadows: false }), 0, 0, 0.05);
  }
  return group;
}

/** A cheese wheel goes down the hill with three people after it. Someone gets it. Or not. */
export default defineStory({
  id: 'cheeseRolling',
  slot: 'hill',
  window: [3.0, 13.0],
  dur: 0.9,
  tags: ['wheels'],
  cast: { a: {}, b: {}, c: { kid: true } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: '{a} catches the cheese at last.',
        near: '{a}, gaining on the cheese.',
        after: '{a}, champion of the hill.',
        idle: '{a}, {b} and {c}, eyeing a cheese.',
      },
    },
    alt: {
      tags: ['oops'],
      captions: {
        peak: 'The cheese, one hop ahead of {a}.',
        near: '{a}, gaining on the cheese.',
        after: 'The cheese wins. {a}, face down.',
        idle: '{a}, {b} and {c}, eyeing a cheese.',
      },
    },
  },
  create({ slot, person, group, outcome }) {
    const x0 = slot.x - 0.25;
    const z = slot.z;
    const won = outcome === 'alt';
    const cheese = makeCheese();
    group.add(cheese);
    const a = person('a', x0 + 0.9, 0, z + 0.05, 'L');
    const b = person('b', x0 + 1.3, 0, z + 0.02, 'R');
    // The kid tumbles head over heels, so spin the kid around the middle, not the feet.
    const c = person('c', 0, 0, 0, 'L');
    const tumble = new THREE.Group();
    group.add(tumble);
    tumble.add(c.root);
    c.root.position.set(0, -0.4, 0);
    const cz = z + 0.15;

    // Down the hill, faster and faster; the cheese that wins hops and rolls off behind the café.
    const roll = (p) => {
      const u = seg(p, -1.6, 0.15);
      return x0 - 4.15 * (0.3 * u + 0.7 * u * u);
    };
    const hopFrom = roll(0);
    const cheeseAt = (p, out) => {
      if (!won || p < 0) {
        out.set(roll(p), 0, cz);
        out.y = hillHeight(out.x) + R + Math.abs(Math.sin(out.x * 2.2)) * 0.1 * seg(p, -1.6, -0.8);
      } else if (p < 0.75) {
        const u = seg(p, 0, 0.75);
        out.set(lerp(hopFrom, 3.6, u), 0, cz);
        out.y = hillHeight(out.x) + R + arc(u, 0.95);
      } else {
        out.set(lerp(3.6, -0.6, easeOut(seg(p, 0.75, 3.4))), 0, cz);
        out.y = hillHeight(out.x) + R;
      }
      return out;
    };
    const lagged = vec();
    const chaser = (p, lag, gap, stopAt) => Math.max(roll(Math.min(p - lag, 0.15)) + gap, stopAt);

    const dur = 0.9;
    const diveFrom = chaser(-0.05, 0.12, 0.9, 0);
    const hand = vec();
    let lastP = -99;

    const run = (pup, wall, k) => {
      const stride = Math.sin(wall * 16 + k);
      pup.pose({ lean: 0.25, bob: Math.abs(stride) * 0.06, legL: stride * 0.6, legR: stride * 0.6, armL: 0.6 + stride * 0.5, armR: 0.6 - stride * 0.5, mouth: 0.8 });
    };

    return {
      focus: () => (won && lastP > dur + 0.3 ? [a.root] : [a.root, cheese]),
      x: () => (lastP < 0 ? cheese.position.x : a.root.position.x),
      update(p, { wall }) {
        lastP = p;
        cheeseAt(p, cheese.position);
        cheese.visible = !(won && cheese.position.x < -0.4);
        cheese.rotation.z = (x0 - cheese.position.x) / R;

        // The leader: lines up, runs, dives.
        let ax;
        if (p < -0.05) ax = chaser(p, 0.12, 0.9, 0);
        else if (p < 0.3) ax = lerp(diveFrom, won ? 6.5 : 6.35, easeOut(seg(p, -0.05, 0.3)));
        else ax = won ? 6.5 : lerp(6.35, 6.2, smooth(seg(p, 0.3, 0.45)));
        a.root.position.set(ax, hillHeight(ax) - 0.03, z + 0.05);
        if (p < -1.6) a.pose({ lean: 0.15, bob: -0.08, legL: 0.2, legR: 0.2, armL: 0.5, armR: 0.5, head: -0.05 });
        else if (p < -0.05) run(a, wall, 0);
        else if (p < 0.3) {
          const d = easeOut(seg(p, -0.05, 0.15));
          a.pose({ lean: 1.9 * d, bob: -0.6 * d, armL: 3.0, armR: 3.0, legL: 0.3, legR: -0.1, mouth: 1 });
        } else if (won) {
          const up = smooth(seg(p, dur + 0.6, dur + 1.3));
          a.pose({ lean: lerp(2.05, 0.1, up), bob: lerp(-0.62, -0.3, up), legL: 0.6 * up, armL: lerp(3.0, 1.4, up), armR: lerp(3.0, 1.4, up), head: up * 0.2, mouth: 0.8 });
        } else {
          const sitUp = smooth(seg(p, 0.25, 0.5));
          const cheer = p > dur + 0.4 ? Math.sin(wall * 8) * 0.12 : 0;
          a.pose({ lean: lerp(1.9, 0, sitUp), bob: lerp(-0.6, -0.3, sitUp), legL: 0.6 * sitUp, legR: 0.15 * sitUp, armL: lerp(3.0, 2.9, sitUp) + cheer, armR: 2.9 - cheer, mouth: 1 });
        }

        // The others, a little behind; they stop where the leader went down.
        const bx = chaser(p, 0.3, 1.3, 6.85);
        b.root.position.set(bx, hillHeight(bx) - 0.03, z + 0.02);
        const bRunning = p > -1.2 && bx > 6.86;
        if (p < -1.6) b.pose({ lean: 0.15, bob: -0.08, legL: 0.2, legR: 0.2, armL: 0.4, armR: 0.4 });
        else if (bRunning) run(b, wall, 1);
        else if (won) b.pose({ armL: 2.75, armR: 2.75, head: Math.sin(wall * 5) * 0.1, mouth: 0.9 });
        else b.pose({ armL: 2.6 + Math.sin(wall * 10) * 0.2, armR: 2.6 - Math.sin(wall * 10) * 0.2, bob: Math.abs(Math.sin(wall * 9)) * 0.06, mouth: 1 });

        const cx = chaser(p, 0.45, 1.7, 7.4);
        const spin = smooth(seg(p, -0.9, -0.2));
        tumble.position.set(cx, hillHeight(cx) - 0.03 + 0.4 + arc(spin, 0.3), z - 0.02);
        tumble.rotation.z = Math.PI * 2 * spin;
        if (p < -1.6) c.pose({ bob: Math.abs(Math.sin(wall * 6)) * 0.03, armL: 2.4, armR: 0.3, mouth: 0.6 });
        else if (spin > 0 && spin < 1) c.pose({ armL: 2.8, armR: 2.8, legL: 0.5, legR: 0.5, mouth: 1 });
        else if (cx > 7.41) run(c, wall, 2);
        else c.pose({ bob: -0.25, legL: 1.2, legR: 1.2, armL: 2.4, armR: 2.4, head: 0.1, mouth: 0.8 });

        // Caught: the cheese goes up in the leader's hands.
        if (!won && p >= 0.12) {
          a.root.updateMatrixWorld(true);
          a.hand('L', lagged);
          a.hand('R', hand);
          hand.lerp(lagged, 0.5);
          hand.y += 0.18;
          hand.z = cz;
          const grab = smooth(seg(p, 0.12, 0.26));
          cheese.position.lerp(hand, grab);
          cheese.rotation.z *= 1 - grab;
        }
      },
    };
  },
});
