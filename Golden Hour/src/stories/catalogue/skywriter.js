import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';
import { makeTowPlane } from '../props/a-props.js';
import { makeSkyPuff } from '../props/e-props.js';
import { sunCentre } from '../../world/Sky.js';

const PUFFS = 56;
/** Heart size: the classic 16 sin³ curve, about 3.8 wide. */
const K = 0.12;
/** Seconds to write the heart; the squiggle takes longer, at the same speed. */
const DRAW = 2.4;
/** How fast the plane pulls up and away once it's done (radians per second). */
const TURN = 5.5;
/** Where the heart can go (its centre x): right of the apartment roof and clear of the church. */
const SPOTS = [-0.2, 2.6, 5.4, 8.2];

/** Dip at the top → left lobe → bottom tip → right lobe → back to the dip, for u in [0, 1]. */
function heart(u, out) {
  const t = u * Math.PI * 2;
  const s = Math.sin(t);
  return out.set(-16 * s * s * s * K, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * K, 0);
}

/** The left half of a heart, a right half that sags and swells, then loop-de-loops off to the right. */
function oops(u, out) {
  if (u <= 0.45) return heart((u / 0.45) * 0.5, out);
  if (u <= 0.7) {
    const w = (u - 0.45) / 0.25;
    heart(0.5 + 0.25 * w, out);
    out.x *= 1 + 0.45 * w;
    out.y -= 0.35 * w;
    return out;
  }
  const v = (u - 0.7) / 0.3;
  const th = Math.PI * 2 * 3 * v;
  return out.set(16 * K * 1.45 + 0.14 * th - 0.3 * Math.sin(th), 4 * K - 0.35 + 0.3 * (1 - Math.cos(th)) + 0.6 * v, 0);
}

/** Length of a path, measured along n samples. */
function measure(shape, n = 400) {
  let len = 0;
  const a = shape(0, new THREE.Vector3());
  const b = new THREE.Vector3();
  for (let i = 1; i <= n; i++) {
    shape(i / n, b);
    len += a.distanceTo(b);
    a.copy(b);
  }
  return len;
}
const HEART_LENGTH = measure(heart);

/** A little plane writes in the sky at last: a heart, or something that started out as one. */
export default defineStory({
  id: 'skywriter',
  slot: 'sky',
  rarity: 'rare',
  window: [3.5, 11.0],
  dur: 1.2,
  cast: { pilot: {} },
  outcomes: {
    main: {
      tags: ['air', 'love', 'finally'],
      captions: {
        peak: '{pilot} wrote a heart across the sky.',
        near: '{pilot}, closing the loop.',
        after: "{pilot}'s heart, drifting over town.",
        idle: 'A little plane, doodling in the sky.',
      },
      sounds: [[-2.2, 'engine'], [0, 'aww']],
    },
    squiggle: {
      tags: ['air', 'oops'],
      captions: {
        peak: "{pilot}'s heart, now a squiggle.",
        near: '{pilot}, losing the thread.',
        after: 'A heart-ish squiggle, over town.',
        idle: 'A little plane, doodling in the sky.',
      },
      sounds: [[-2.2, 'engine'], [-1.0, 'sputter'], [0.1, 'laugh']],
    },
  },
  create({ slot, group, evening, outcome, peak, particles }) {
    const wobbly = outcome === 'squiggle';
    const shape = wobbly ? oops : heart;

    // Sample the path once and measure it, so the plane flies at a steady speed and the
    // puffs come out evenly spaced.
    const SAMPLES = 400;
    const table = [];
    const lengths = [0];
    for (let i = 0; i <= SAMPLES; i++) table.push(shape(i / SAMPLES, vec()));
    for (let i = 1; i <= SAMPLES; i++) lengths.push(lengths[i - 1] + table[i].distanceTo(table[i - 1]));
    const total = lengths[SAMPLES];
    const draw = (DRAW * total) / HEART_LENGTH;
    const speed = total / draw;
    /** Point at fraction s of the way along the path (by length), in path coordinates. */
    const along = (s, out) => {
      const d = Math.min(1, Math.max(0, s)) * total;
      let i = 1;
      while (i < SAMPLES && lengths[i] < d) i++;
      const q = (d - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1]);
      return out.lerpVectors(table[i - 1], table[i], q);
    };

    // Somewhere the sun isn't, so white puffs read against sky rather than glare.
    const sun = sunCentre(peak);
    const left = 16 * K;
    const right = wobbly ? table[SAMPLES].x + 0.3 : left;
    const spots = SPOTS.filter((x) => x + right < 13.5)
      .map((x) => ({ x, d: Math.abs(x + (right - left) / 2 - sun.x) }))
      .sort((a, b) => b.d - a.d);
    const cx = evening.pick(spots.slice(0, 2)).x;
    const cy = slot.y + 2.3 + evening.range(-0.2, 0.3);
    const z = slot.z;
    const origin = vec(cx, cy, z);

    const proto = makeSkyPuff();
    const material = proto.material;
    const trail = new THREE.Group();
    group.add(trail);
    const puffs = [];
    for (let i = 0; i < PUFFS; i++) {
      const m = i ? proto.clone() : proto;
      const s = i / (PUFFS - 1);
      along(s, m.position).add(origin);
      m.position.x += evening.range(-0.04, 0.04);
      m.position.y += evening.range(-0.04, 0.04);
      m.rotation.z = evening.range(0, Math.PI * 2);
      m.userData = { s, size: evening.range(0.85, 1.2), home: m.position.clone(), drift: evening.range(-0.04, 0.04) };
      m.scale.setScalar(0.001);
      trail.add(m);
      puffs.push(m);
    }

    const plane = makeTowPlane(evening.pick(['#e2574c', '#5f8fb5', '#2f6f6a', '#f2c14e']));
    group.add(plane.group);

    const dur = 1.2;
    const at = vec();
    const ahead = vec();
    const end = along(1, vec()).add(origin);
    along(0.995, ahead).add(origin);
    const endHeading = Math.atan2(end.y - ahead.y, end.x - ahead.x);
    const start = along(0, vec()).add(origin);
    along(0.01, ahead).add(origin);
    const startHeading = Math.atan2(ahead.y - start.y, ahead.x - start.x);
    // After the last puff it pulls up into a climb, turning whichever way is shorter.
    let turn = Math.PI / 2 + 0.25 - endHeading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    const w = Math.sign(turn) * TURN;
    const turnTime = Math.abs(turn) / TURN;
    const tail = vec();
    let nextPuff = 0;
    let coughed = false;

    return {
      focus: () => [trail],
      x: () => plane.group.position.x,
      visible: (p) => p > -draw - 0.5 && p < dur + 5.0,
      update(p, { wall }) {
        // The plane: flies in along the first stroke, traces the path, then climbs away.
        let heading;
        if (p < -draw) {
          heading = startHeading;
          at.copy(start).addScaledVector(vec(Math.cos(heading), Math.sin(heading), 0), speed * (p + draw));
        } else if (p < 0) {
          const s = seg(p, -draw, 0);
          along(s, at).add(origin);
          along(Math.min(1, s + 0.01), ahead).add(origin);
          heading = Math.atan2(ahead.y - at.y, ahead.x - at.x);
          if (wobbly && s > 0.7) heading += Math.sin(wall * 30) * 0.15;
        } else {
          const q = Math.min(p, turnTime);
          heading = endHeading + w * q;
          at.set(end.x + (speed / w) * (Math.sin(heading) - Math.sin(endHeading)), end.y - (speed / w) * (Math.cos(heading) - Math.cos(endHeading)), z);
          if (p > turnTime) at.addScaledVector(vec(Math.cos(heading), Math.sin(heading), 0), speed * (p - turnTime));
        }
        const upright = Math.cos(heading) < 0 ? -1 : 1;
        plane.group.position.set(at.x, at.y, z + 0.08);
        plane.group.rotation.z = heading;
        plane.group.scale.set(1.15, 1.15 * upright, 1);
        plane.group.visible = at.y < 16 && Math.abs(at.x) < 20;
        plane.prop.scale.y = 0.2 + Math.abs(Math.sin(wall * 40));

        // Puffs: each one appears as the plane passes, swells, then drifts and spreads.
        for (const m of puffs) {
          const born = -draw + m.userData.s * draw;
          const age = p - born;
          if (age < 0) {
            m.scale.setScalar(0.001);
            m.position.copy(m.userData.home);
            continue;
          }
          const grow = smooth(seg(age, 0, 0.3));
          const k = m.userData.size * (lerp(0.4, 1, grow) + 0.05 * age);
          m.scale.set(k, k, 1);
          m.position.set(m.userData.home.x + (0.06 + m.userData.drift) * age, m.userData.home.y + 0.025 * age, m.userData.home.z);
        }
        material.opacity = 1 - smooth(seg(p, dur + 2.5, dur + 5.0));

        // A little extra smoke straight from the tail while writing, and a cough when it goes wrong.
        if (p > -draw && p < 0 && wall >= nextPuff) {
          nextPuff = wall + 0.08;
          tail.set(at.x - Math.cos(heading) * 0.6, at.y - Math.sin(heading) * 0.6, z + 0.05);
          particles.spawn('puff', tail, vec((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0), { life: 0.6, scale: 0.6, color: '#ffffff' });
        }
        const coughAt = -draw * 0.3;
        if (wobbly && p >= coughAt && !coughed) {
          coughed = true;
          for (let i = 0; i < 4; i++) particles.spawn('soot', at, vec((Math.random() - 0.5) * 1.2, Math.random() * 0.8, 0.1), { life: 0.9, scale: 0.5 });
        } else if (p < coughAt) coughed = false;
      },
    };
  },
});
