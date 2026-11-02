import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, arc, vec } from '../anim.js';
import { place } from '../../world/paper.js';
import { makeShako, makeDrum, makeCymbal, makeBeater, makeTrumpet, makeTuba } from '../props/g-props.js';
import { wearHat } from '../props/b-props.js';

const UNIFORMS = [
  { top: '#c8423a', hat: '#2f2a30' },
  { top: '#3f4a6b', hat: '#fbf6ee' },
  { top: '#2f6f6a', hat: '#c8423a' },
];

/** The smallest marching band in the world plays its very last number. Mostly. */
export default defineStory({
  id: 'marchingBand',
  slot: 'road',
  rarity: 'rare',
  window: [4.0, 13.0],
  dur: 0.9,
  cast: { a: { dress: false }, b: { dress: false }, c: { dress: false } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: '{a}, {b} and {c}: the big finish!',
        near: '{a}, {b} and {c}, building up.',
        after: "{a}'s band, marching into the sunset.",
        idle: 'A tiny marching band, out at last.',
      },
      sounds: [[-1.6, 'drum'], [-0.6, 'trumpet'], [0, 'crash']],
    },
    stuck: {
      tags: ['oops'],
      captions: {
        peak: "{c}'s tuba, now a hat.",
        near: '{c}, lifting the tuba high.',
        after: '{c}, marching on inside the tuba.',
        idle: 'A tiny marching band, out at last.',
      },
      sounds: [[-1.6, 'drum'], [0.2, 'thud'], [0.6, 'kazoo']],
    },
  },
  create({ slot, person, evening, particles, outcome }) {
    const hx = slot.x - 3.4 + evening.range(-0.3, 0.3);
    const z = slot.z + 0.2;
    const kit = evening.pick(UNIFORMS);
    const dress = { top: kit.top, bottom: '#2f2a30' };
    // Front to back as they march to the right: drum, trumpet, tuba.
    const a = person('a', hx + 1.05, 0, z, 'L', dress);
    const b = person('b', hx, 0, z, 'L', dress);
    const c = person('c', hx - 1.05, 0, z, 'R', dress);
    const band = [a, b, c];
    const hats = band.map((who) => wearHat(who, makeShako(kit.hat)));
    place(a.hips, makeDrum(), 0, 0.22, 0.12);
    const cymbal = place(a.armL, makeCymbal(), 0, -0.58, 0.08);
    place(a.armR, makeBeater(), 0, -0.5, 0.08);
    const trumpet = place(b.head, makeTrumpet(), 0.03, b.headCentre.y - 0.085 * b.hs, 0.07);
    trumpet.scale.setScalar(1.35);
    const tuba = makeTuba();
    place(c.hips, tuba.group, -0.12, 0.25, 0.14);
    tuba.group.scale.setScalar(1.15);

    const stuck = outcome === 'stuck';
    const dur = 0.9;
    const leaveAt = dur + 1.2;
    const crashAt = vec();
    let crashed = false;
    const offset = (p) => (p < leaveAt ? -13 * (1 - easeOut(seg(p, -6.0, -1.8))) : 1.5 * (p - leaveAt));

    return {
      focus: () => band.map((who) => who.root),
      visible: (p) => p > -4.5 && Math.abs(hx + offset(p)) < 12,
      x: () => b.root.position.x,
      update(p, { wall }) {
        const off = offset(p);
        const marching = p < -1.8 || p > leaveAt;
        const build = seg(p, -1.8, 0);
        const phase = wall * (7 + 4 * build);
        const stride = p < 0 || p > leaveAt ? Math.sin(phase) * (marching ? 1 : 0.6) : 0;
        const finale = p >= 0 && p < dur + 0.6;
        const jump = !stuck && p >= 0 ? arc(seg(p, 0, 0.35), 0.18) : 0;
        const bow = !stuck && p > dur + 0.4 && p < leaveAt ? Math.sin(Math.PI * seg(p, dur + 0.4, leaveAt)) : 0;
        const step = { legL: stride * 0.45, legR: stride * 0.45, bob: Math.abs(stride) * (0.03 + 0.03 * build) - bow * 0.06 };
        band.forEach((who, i) => who.root.position.set(hx + (1 - i) * 1.05 + off, jump, z));

        // Drum: beating time, then the cymbal held high for one great crash.
        const beat = -0.15 + 0.45 * Math.max(0, Math.sin(phase * 2));
        if (finale && !stuck) a.pose({ armL: 2.9, armR: p < 0.12 ? lerp(2.0, 2.45, seg(p, 0, 0.12)) : 2.2, mouth: 1, eyes: 0.2 });
        else if (finale) a.pose({ armL: 0.5, armR: 0.2, head: 0.22, eyes: 1.3, mouth: 0.6 });
        else a.pose({ ...step, armL: 0.5 + 0.3 * build, armR: beat, head: -bow * 0.25, mouth: 0.35 + 0.3 * build });
        cymbal.rotation.z = !stuck && p >= 0 ? Math.sin(wall * 30) * 0.35 * (1 - seg(p, 0, 1.2)) : 0;

        // Trumpet: bell lifting with the crescendo, pointing at the sky for the last note.
        const lift = finale && !stuck ? 1 : build;
        if (finale && stuck) b.pose({ armR: 1.6, armL: 2.6, head: 0.15 + Math.sin(wall * 9) * 0.06, bob: Math.abs(Math.sin(wall * 9)) * 0.03, mouth: 1 });
        else b.pose({ ...step, armR: lerp(1.95, 2.35, lift), armL: finale ? 2.6 : 0.3 - stride * 0.3, head: 0.05 + 0.35 * lift - bow * 0.25, mouth: 0.3 });

        // Tuba: on the chest; raised for the finish, or lifted, flipped and down over the head.
        const tg = tuba.group;
        if (stuck && p > -0.6) {
          const up = smooth(seg(p, -0.6, 0));
          const down = smooth(seg(p, 0, 0.22));
          tg.position.set(lerp(-0.12, 0.1, up), lerp(0.25, 2.05, up) - 0.62 * down, 0.14);
          tg.rotation.z = lerp(0.35, Math.PI, up);
          hats[2].visible = down < 0.5;
          const flail = p > 0.1 ? Math.sin(wall * 9) : 0;
          if (p < 0.1) c.pose({ armL: lerp(0.6, 2.85, up), armR: lerp(-0.6, 2.85, up), lean: 0.03 * Math.sin(wall * 6), mouth: 0.8 });
          else {
            c.pose({ ...(p > leaveAt ? step : {}), armL: 1.9 + flail * 0.5, armR: 1.9 - flail * 0.5, lean: Math.sin(wall * 3.1) * (p < dur + 0.6 ? 0.12 : 0.05) });
            c.root.position.x += Math.sin(wall * 3.1) * 0.08;
          }
        } else {
          const raise = finale && !stuck ? easeOut(seg(p, 0, 0.2)) : 0;
          tg.position.set(-0.12, 0.25 + 0.4 * raise, 0.14);
          tg.rotation.z = lerp(0.35, 0.08, raise);
          c.pose({ ...(finale ? {} : step), armL: lerp(0.6, 2.2, raise), armR: lerp(-0.6, 1.0, raise), head: -bow * 0.25, mouth: raise > 0 ? 1 : 0.6 });
        }

        if (!stuck && p >= 0 && !crashed) {
          crashed = true;
          a.root.updateMatrixWorld(true);
          cymbal.getWorldPosition(crashAt);
          for (let i = 0; i < 14; i++) {
            const t = (i / 14) * Math.PI * 2;
            particles.spawn('spark', crashAt, vec(Math.cos(t) * 1.6, Math.sin(t) * 1.6 + 0.8, 0.2), { life: 0.9, scale: 1.2, color: '#ffd27a' });
          }
        }
      },
    };
  },
});
