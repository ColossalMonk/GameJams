import { defineStory } from '../Story.js';
import { seg, smooth, easeIn, lerp, vec } from '../anim.js';
import { makeGull } from '../props/b-props.js';
import { makeChipCone, makeChip } from '../props/h-props.js';

const LAMPS = [-4.6, 5.1];
const GULL = 1.1;

/** Chips on the pavement, at last. A gull swoops: it gets the best chip, or meets its match. */
export default defineStory({
  id: 'gullsChips',
  slot: ['pavement', 'lowsky'],
  window: [2.5, 14.0],
  dur: 0.8,
  tags: ['animal'],
  cast: { eater: {} },
  outcomes: {
    main: {
      tags: ['air', 'oops'],
      captions: {
        peak: "A gull, off with {eater}'s best chip.",
        near: '{eater}, and a gull with a plan.',
        after: '{eater}, guarding the rest now.',
        idle: '{eater}, finally opening the chips.',
      },
      sounds: [[-0.45, 'whoosh'], [0, 'gasp'], [0.7, 'flap']],
    },
    defend: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{eater} stares down a gull.',
        near: '{eater}, and a gull with a plan.',
        after: '{eater}, victorious, eating chips.',
        idle: '{eater}, finally opening the chips.',
      },
      sounds: [[-0.45, 'whoosh'], [0, 'flap'], [0.9, 'cheer']],
    },
  },
  create({ slot, person, group, evening, outcome, particles }) {
    const x = slot.x;
    const z = slot.z;
    // The gull comes in from side s; the chip is in the hand on that side, the cone in the other.
    const s = evening.chance(0.5) ? 1 : -1;
    const near = s > 0 ? 'R' : 'L';
    const far = s > 0 ? 'L' : 'R';
    const eater = person('eater', x, 0, z, near);
    const cone = makeChipCone();
    const chip = makeChip();
    const gull = makeGull();
    group.add(cone.group, chip, gull.group);
    const defend = outcome === 'defend';
    const dur = 0.8;
    // A gull faces -x; flipped, +x. sx is its x scale for flying in the direction d.
    const facing = (d) => (d < 0 ? GULL : -GULL);
    const arms = (n, f) => (s > 0 ? { armR: n, armL: f } : { armL: n, armR: f });

    const from = vec(x + s * 6.5, 6.2, z + 0.7);
    const via = vec(x + s * 2.4, 0.9, z + 0.5);
    const hover = vec(x + s * 1.0, 1.75, z + 0.45);
    const away = vec(x - s * 6.5, 7.0, z + 0.8);
    const lamp = LAMPS.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
    const perch = vec(lamp, 3.62, 0.8);
    const target = vec();
    const beak = vec();
    const hand = vec();
    const coneHand = vec();
    const prev = vec();
    const catchAt = 0;
    let steam = false;
    let gullNear = false;

    // Where the gull's body goes so its beak lands on a point.
    const beakTo = (point, sx, out) => out.set(point.x - gull.beak.x * sx, point.y - gull.beak.y * GULL, point.z - gull.beak.z * GULL);

    return {
      focus: () => (gullNear ? [eater.root, gull.group] : [eater.root]),
      update(p, { wall, dt }) {
        // ── The eater ──
        const open = smooth(seg(p, -1.6, -1.3));
        const raise = smooth(seg(p, -1.0, -0.15));
        let pose;
        if (p < -1.6) pose = { ...arms(0.3, 0.55), head: 0.12 * -s, mouth: 0.35 };
        else if (p < 0 && !(defend && p > -0.4)) pose = { ...arms(lerp(0.3, 2.15, raise), 0.55), head: 0.08 * -s * (1 - raise), mouth: 0.35 + 0.5 * raise, eyes: 1 - 0.6 * raise };
        else if (!defend) {
          if (p < dur + 0.4) pose = { ...arms(2.7 + Math.sin(wall * 16) * 0.2, 1.2), lean: s * 0.15, mouth: 1, eyes: 1.3 };
          else if (p < dur + 1.8) pose = { ...arms(2.6 + Math.sin(wall * 14) * 0.25, 0.55), head: 0.1 * s, mouth: 0.6, brows: -1 };
          else pose = { ...arms(-0.4, -0.5), head: 0.08 * Math.sin(wall * 2), mouth: 0.3, brows: -0.5 };
        } else {
          // The brave pose: feet planted, cone hugged, a palm out at the gull.
          const brave = smooth(seg(p, -0.4, -0.15));
          const won = p > dur + 1.4;
          if (!won) pose = { ...arms(lerp(2.15, 2.4, brave), lerp(0.55, -0.45, brave)), lean: -s * 0.12 * brave, legL: 0.35 * brave, legR: 0.35 * brave, head: 0.1 * s * brave, mouth: 0.3, brows: -1 };
          else {
            const munch = Math.sin(wall * 3) > 0.2;
            pose = { ...arms(munch ? 2.15 : 0.8, 0.55), mouth: munch ? 0.6 : 0.3, eyes: munch ? 0.3 : 1 };
          }
        }
        eater.pose(pose);
        eater.root.updateMatrixWorld(true);
        eater.hand(near, hand);
        eater.hand(far, coneHand);

        // ── The chips: the cone in one hand, unwrapped; one good chip in the other ──
        cone.group.position.copy(coneHand).add(vec(0, -0.04, 0.08));
        cone.group.rotation.z = -s * 0.15;
        cone.flap.rotation.z = -2.6 * open;
        cone.flap.visible = open < 1;
        for (const c of cone.chips) c.scale.y = Math.max(0.01, open);
        if (p >= -1.3 && !steam) {
          steam = true;
          for (let i = 0; i < 3; i++) particles.spawn('smoke', vec(coneHand.x, coneHand.y + 0.35, coneHand.z + 0.1), vec((Math.random() - 0.5) * 0.2, 0.4, 0), { life: 1.4, scale: 0.8 });
        }
        const stolen = !defend && p >= catchAt;
        const tucked = defend && p > -0.3 && p < dur + 1.4;
        chip.visible = p > -1.2 && !tucked;
        if (!stolen) {
          chip.position.copy(hand).add(vec(0, 0.04, 0.09));
          chip.rotation.z = s * 0.3;
        }

        // ── The gull ──
        const g = gull.group;
        prev.copy(g.position);
        let sx = facing(-s);
        let flap = Math.sin(wall * 14);
        let shown = p > -1.6;
        if (p < (defend ? 0 : catchAt)) {
          // Circling in, then a long swoop down to the chip (or to a hover in front of it).
          const u = smooth(seg(p, -1.6, defend ? 0 : catchAt));
          const end = defend ? hover : beakTo(target.copy(chip.position).add(vec(0, 0.1, 0)), sx, target);
          g.position.set(0, 0, 0).addScaledVector(from, (1 - u) * (1 - u)).addScaledVector(via, 2 * u * (1 - u)).addScaledVector(end, u * u);
          if (p > -0.55) flap = 0.35;
        } else if (!defend) {
          // Off with it, over the street and away.
          const u = seg(p, catchAt, catchAt + 2.2);
          g.position.set(lerp(target.x, away.x, u), lerp(target.y, away.y, easeIn(u)), lerp(target.z, away.z, u));
          shown = u < 1;
        } else if (p < dur) {
          // Brakes hard, flapping like mad in front of the palm.
          g.position.copy(hover);
          g.position.y += Math.sin(wall * 9) * 0.05;
          g.position.x += s * 0.25 * seg(p, 0, dur);
          flap = Math.sin(wall * 26);
        } else {
          // Retreats to the nearest lamp post to sulk.
          const u = smooth(seg(p, dur, dur + 1.6));
          const back = hover.clone().add(vec(s * 0.25, 0, 0));
          g.position.lerpVectors(back, perch, u);
          g.position.y += Math.sin(Math.PI * u) * 0.8;
          if (u >= 1) {
            sx = facing(x - lamp);
            flap = 0.3;
            g.position.y += Math.abs(Math.sin(wall * 1.5)) * 0.02;
          } else sx = facing(lamp - x);
        }
        g.visible = shown;
        g.scale.set(sx, GULL, GULL);
        const v = prev.sub(g.position).negate();
        // Nose up when climbing: a flipped gull (nose to +x) turns the other way.
        const dir = sx < 0 ? 1 : -1;
        const braking = defend && p >= 0 && p < dur;
        const tilt = braking ? -s * 0.45 : v.lengthSq() > 1e-8 ? Math.max(-0.6, Math.min(0.6, Math.atan2(v.y, Math.abs(v.x) + 1e-6))) * dir : 0;
        g.rotation.z += (tilt - g.rotation.z) * Math.min(1, dt * 8);
        gull.flap(flap);
        g.updateMatrixWorld(true);
        if (stolen) {
          g.localToWorld(beak.copy(gull.beak));
          chip.position.copy(beak).add(vec(0, -0.1, 0.02));
          chip.rotation.z = 1.4;
        }
        gullNear = shown && g.position.distanceTo(eater.root.position) < 3.2;
      },
    };
  },
});
