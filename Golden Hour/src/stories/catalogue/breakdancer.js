import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';
import { makeFlatBox, makeBoombox, makeStar, pinPuppet } from '../props/h-props.js';

const BOXES = ['#3d3a40', '#b03050', '#2f6f6a'];

/** A breakdancer on a flattened box: a windmill into a one-handed freeze. Or into the gutter. */
export default defineStory({
  id: 'breakdancer',
  slot: 'pavement',
  window: [2.5, 14.0],
  dur: 0.9,
  cast: { dancer: { kid: false } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{dancer}, frozen upside down.',
        near: '{dancer}, spinning on the cardboard.',
        after: '{dancer}, very cool about it.',
        idle: '{dancer}, warming up on a cardboard box.',
      },
      sounds: [[-0.75, 'whoosh'], [0, 'drum'], [0.9, 'cheer']],
    },
    spin: {
      tags: ['oops'],
      captions: {
        peak: '{dancer} spins right off the box.',
        near: '{dancer}, spinning on the cardboard.',
        after: '{dancer}, seeing stars.',
        idle: '{dancer}, warming up on a cardboard box.',
      },
      sounds: [[-0.75, 'whoosh'], [0.3, 'thud'], [0.6, 'chime']],
    },
  },
  create({ slot, person, group, add, evening, outcome }) {
    const x = slot.x;
    const z = slot.z;
    // Which way a spin-out skids; the boombox sits on the other side.
    const side = evening.chance(0.5) ? 1 : -1;
    add(makeFlatBox(1.5, 0.8), x, 0, z + 0.05);
    const boombox = makeBoombox(evening.pick(BOXES));
    add(boombox.group, x - side * 1.05, 0, z - 0.2);
    const dancer = person('dancer', x, 0, z + 0.05, 'L');
    const stars = [0, 1, 2].map(() => {
      const s = makeStar();
      s.visible = false;
      group.add(s);
      return s;
    });
    const spinOut = outcome === 'spin';
    const dur = 0.9;
    const h = dancer.options.height;

    // Points on the body that can be pinned to a spot while it turns.
    const feet = (v) => dancer.root.getWorldPosition(v);
    const torso = (v) => dancer.hips.localToWorld(v.set(0, 0.3, 0));
    const palm = (v) => dancer.hand('R', v);
    const a = vec();
    const b = vec();
    const at = vec();
    const head = vec();

    // Main: a turn and a half into a freeze on one straight arm, then the rest of the turn to land.
    const freezeAngle = 3 * Math.PI + 0.6;
    const mainAngle = (p) => {
      if (p < dur) return freezeAngle * smooth(seg(p, -0.75, -0.05));
      if (p < dur + 0.5) return freezeAngle + (Math.PI - 0.6) * smooth(seg(p, dur, dur + 0.5));
      return 0;
    };
    // Spin-out: nearly two turns that run down until the legs flop over, flat on the back;
    // later, sitting up.
    const outAngle = (p) => {
      const lying = 3.5 * Math.PI;
      if (p < dur + 1.5) return lying * smooth(seg(p, -0.75, 0.45));
      return lerp(lying, 4 * Math.PI - 0.1, smooth(seg(p, dur + 1.5, dur + 2.2)));
    };

    return {
      focus: () => [dancer.root],
      update(p, { wall }) {
        // ── Pose ──
        const step = Math.sin(p * 9);
        let pose;
        if (p < -1.6) pose = { bob: Math.abs(Math.sin(wall * 6)) * 0.03, head: Math.sin(wall * 6) * 0.06, armL: 0.25, armR: 0.25, mouth: 0.3 };
        else if (p < -0.75) pose = { bob: Math.abs(step) * 0.04, legL: Math.max(0, step) * 0.5, legR: Math.max(0, -step) * 0.5, armL: 0.6 + 0.4 * step, armR: 0.6 - 0.4 * step, mouth: 0.35, brows: -0.4 };
        else if (!spinOut) {
          if (p < -0.2) pose = { armL: 1.6, armR: 1.6, legL: 0.6, legR: 0.6, mouth: 0.6, eyes: 0.6 };
          else if (p < dur) pose = { armL: 1.3, armR: lerp(1.6, Math.PI - 0.6, smooth(seg(p, -0.2, -0.05))), legL: 0.8, legR: 0.3, head: 0.1, mouth: 0.3, brows: -0.5 };
          else if (p < dur + 0.5) pose = { armL: 1.6, armR: 1.6, legL: 0.4, legR: 0.4, mouth: 0.9 };
          else if (p < dur + 3.0) pose = { armL: -0.5, armR: -0.5, legL: 0.15, legR: 0.15, head: 0.15, mouth: 0.3, brows: -0.5 };
          else pose = { bob: Math.abs(Math.sin(wall * 6)) * 0.03, head: Math.sin(wall * 6) * 0.06, armL: 0.25, armR: 0.25, mouth: 0.3 };
        } else {
          const dizzy = Math.sin(wall * 5);
          if (p < 0.2) pose = { armL: 1.6, armR: 1.6, legL: 0.6, legR: 0.6, mouth: 0.6 + 0.4 * seg(p, -0.3, 0), eyes: lerp(0.6, 1.3, seg(p, -0.3, 0)) };
          // Flat on the back, head to +x: the left arm and leg flop up in the air.
          else if (p < dur + 1.5) pose = { armL: 1.5 + dizzy * 0.1, armR: 0.15, legL: 0.6, legR: 0.05, head: dizzy * 0.15, eyes: 0.35, mouth: 0.6 + dizzy * 0.1 };
          else {
            // Sitting up: the right leg (underneath) only swings out once upright.
            const up = smooth(seg(p, dur + 1.5, dur + 2.2));
            pose = { bob: -0.42 * up, legL: lerp(0.6, 1.2, up), legR: lerp(0.05, 1.2, smooth(seg(p, dur + 1.95, dur + 2.25))), armL: lerp(1.5, 0.5, up), armR: 0.5, head: dizzy * 0.12, eyes: 0.5, mouth: 0.5 };
          }
        }
        dancer.pose(pose);

        // ── Where the body is: pinned at the feet, the middle or one hand ──
        const toprock = 0.15 * Math.sin(p * 4.5) * (1 - seg(p, -1.0, -0.75)) * (p > -1.6 ? 1 : 0);
        const angle = spinOut ? outAngle(p) : mainAngle(p);
        const root = dancer.root.position;
        if (p < -0.75) {
          pinPuppet(dancer, 0, feet, at.set(x + toprock, 0, z + 0.05), root);
        } else if (!spinOut) {
          pinPuppet(dancer, angle, feet, at.set(x, 0, z + 0.05), a);
          pinPuppet(dancer, angle, torso, at.set(x, 1.0 * h, z + 0.05), b);
          // Into the spin from standing, and back out of it at the end.
          const standing = 1 - smooth(seg(p, -0.75, -0.6)) + smooth(seg(p, dur + 0.35, dur + 0.5));
          a.lerp(b, 1 - Math.min(1, standing));
          // The freeze balances on the right hand, arm straight down to the box.
          const onHand = smooth(seg(p, -0.2, -0.02)) * (1 - smooth(seg(p, dur, dur + 0.15)));
          if (onHand > 0) {
            pinPuppet(dancer, angle, palm, at.set(x - 0.1, 0.07, z + 0.05), b);
            a.lerp(b, onHand);
          }
          root.copy(a);
          dancer.root.rotation.z = angle;
        } else {
          const skid = side * 0.35 * smooth(seg(p, -0.1, 0.45));
          const y = lerp(lerp(1.0 * h, 0.3, smooth(seg(p, 0.15, 0.45))), 0.6 * h, smooth(seg(p, dur + 1.5, dur + 2.2)));
          pinPuppet(dancer, angle, torso, at.set(x + skid, y, z + 0.05), root);
        }
        dancer.root.updateMatrixWorld(true);

        // ── Dizzy stars and the music ──
        const seeing = spinOut && p > 0.3 && p < dur + 2.8;
        dancer.head.localToWorld(head.set(0, dancer.headCentre.y, 0));
        stars.forEach((s, k) => {
          s.visible = seeing;
          const ang = wall * 6 + (k * Math.PI * 2) / 3;
          s.position.set(head.x + Math.cos(ang) * 0.28, head.y + 0.32 + Math.sin(ang) * 0.07, head.z + 0.1 + Math.sin(ang) * 0.05);
          s.rotation.z = wall * 4 + k;
        });
        const thump = 1 + 0.12 * Math.abs(Math.sin(wall * 12));
        for (const sp of boombox.speakers) sp.scale.set(thump, thump, 1);
      },
    };
  },
});
