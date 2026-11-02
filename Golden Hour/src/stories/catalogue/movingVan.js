import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, arc, vec } from '../anim.js';
import { makeMovingVan, makeSofa } from '../props/g-props.js';
import { sunCentre } from '../../world/Sky.js';

const PAINTS = ['#e8a35a', '#5f8fb5', '#7fae6a'];
const SOFAS = [
  { colour: '#5f8fb5', cushion: '#7fb3d6' },
  { colour: '#b5524a', cushion: '#d9644a' },
  { colour: '#7fae6a', cushion: '#9cc276' },
  { colour: '#9a6fb0', cushion: '#c9a4c4' },
];
const MOVERS = { dress: false, look: { top: '#e8a35a', bottom: '#3f4a6b' } };

/** Last job of the day: one sofa, off the van. The movers try it out, or the tail-lift does. */
export default defineStory({
  id: 'movingVan',
  slot: 'road',
  window: [6.0, 13.5],
  dur: 0.9,
  tags: ['wheels'],
  cast: { a: MOVERS, b: MOVERS },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{a} and {b}, finally sitting down.',
        near: '{a} and {b}, one last sofa.',
        after: '{a} and {b}, front-row seats for the sun.',
        idle: "{a} and {b}'s removals van.",
      },
      sounds: [[-3.4, 'brakes'], [-0.05, 'thud'], [0.3, 'laugh']],
    },
    slide: {
      tags: ['oops', 'falling'],
      captions: {
        peak: "{a} and {b}'s sofa, leaving the lift.",
        near: '{a} and {b}, lowering the sofa.',
        after: '{a}, sitting on an upside-down sofa.',
        idle: "{a} and {b}'s removals van.",
      },
      sounds: [[-3.4, 'brakes'], [0.1, 'gasp'], [0.55, 'crash']],
    },
  },
  create({ slot, person, group, evening, particles, outcome, peak }) {
    // Stops left of the café, so the van never hides the table behind it.
    const stop = slot.x - 5.2 + evening.range(-0.2, 0.2);
    const vz = slot.z;
    const van = makeMovingVan(evening.pick(PAINTS));
    van.group.position.set(-15.5, 0, vz);
    group.add(van.group);
    const s = evening.pick(SOFAS);
    const sofa = makeSofa(s.colour, s.cushion);
    group.add(sofa.group);
    const a = person('a', 0, 0, 0, 'L');
    const b = person('b', 0, 0, 0, 'R');

    const slide = outcome === 'slide';
    const dur = 0.9;
    const leave = dur + (slide ? 2.6 : 2.0);
    const lift = vec(stop - 2.4, 0.48, vz + 0.12);
    const kerb = vec(stop - 1.0, 0.42, vz + 1.15);
    const landed = vec(stop - 3.55, 0.46, vz + 0.45);
    const seat = 0.46;
    // Where each mover gets out (the back door, the cab) and where they wait for the sofa.
    const aFrom = vec(stop - 1.7, van.floor, vz + 0.2);
    const bFrom = vec(stop + 1.0, 0, vz + 0.3);
    const aTo = slide ? vec(stop - 2.25, 0, vz + 0.85) : vec(lift.x - 0.95, 0, lift.z + 0.25);
    const bTo = slide ? vec(stop - 1.1, 0, vz + 0.75) : vec(lift.x + 0.95, 0, lift.z + 0.25);
    const sunX = sunCentre(peak).x;
    const tilt = (x) => (sunX > x ? -0.14 : 0.14);
    let lastP = -99;
    let puffed = false;
    let nextSmoke = 0;
    let fallFrom = null;

    const vanX = (p) => lerp(-15.5, stop, easeOut(seg(p, -5.2, -3.2))) + (16 - stop) * easeIn(seg(p, leave, leave + 3.4));
    const walk = (who, from, to, t0, t1, p, wall) => {
      const u = smooth(seg(p, t0, t1));
      who.root.position.lerpVectors(from, to, u);
      who.root.position.y = lerp(from.y, to.y, seg(u, 0, 0.25)) + (from.y > 0 ? arc(seg(u, 0, 0.25), 0.15) : 0);
      const stride = u > 0 && u < 1 ? Math.sin(wall * 14) : 0;
      who.pose({ legL: stride * 0.4, legR: stride * 0.4, armL: 0.3 - stride * 0.3, armR: 0.3 + stride * 0.3, bob: Math.abs(stride) * 0.03, mouth: 0.4 });
      return u;
    };
    // Sitting: hips on the seat, legs out, a little sway.
    const sit = (who, x, y, z, wall, k) => {
      who.root.position.set(x, y - 0.72 * who.options.height, z);
      return { legL: 0.55 + 0.1 * Math.sin(wall * 2.2 + k), legR: 0.55 + 0.1 * Math.sin(wall * 2.2 + k + 1.8) };
    };

    return {
      focus: () => [sofa.group, a.root, b.root],
      visible: (p) => p > -4.5,
      x: () => (lastP < -2.5 ? van.group.position.x : sofa.group.position.x),
      update(p, { wall }) {
        lastP = p;
        const x = vanX(p);
        const moving = Math.abs(vanX(p + 0.05) - x) > 0.004;
        van.group.position.x = x;
        van.body.position.y = moving ? 0.02 * Math.abs(Math.sin(wall * 16)) : 0;
        van.body.rotation.z = -0.04 * Math.sin(Math.PI * seg(p, -3.6, -2.9));
        for (const w of van.wheels) w.rotation.z = -x / 0.28;
        if (moving && wall > nextSmoke && x > -14 && x < 14) {
          nextSmoke = wall + 0.3;
          particles.spawn('smoke', vec(x - 1.6, 0.35, vz + 0.2), vec(-0.4, 0.15, 0), { life: 1.0 });
        }

        // Back door open, tail-lift down, and everything folded away again before leaving.
        const shut = smooth(seg(p, leave - 0.9, leave - 0.6));
        van.door.scale.x = Math.max(0.02, smooth(seg(p, -3.1, -2.8)) * (1 - shut));
        van.lift.rotation.z = -Math.PI / 2 * (1 - smooth(seg(p, -2.8, -2.5)) + smooth(seg(p, leave - 0.6, leave - 0.2)));
        const lowered = slide ? 0.42 - 0.18 * smooth(seg(p, -1.4, -0.1)) : 0.42 - 0.36 * smooth(seg(p, -2.1, -1.7));
        const tipped = slide ? 0.28 * smooth(seg(p, -0.3, 0.05)) : 0;
        van.lift.position.y = lerp(lowered, van.floor, smooth(seg(p, leave - 1.2, leave - 0.9)));
        if (!(p > leave - 0.6)) van.lift.rotation.z += tipped * (1 - smooth(seg(p, dur + 0.6, dur + 1.2)));

        // The sofa: inside, slid out onto the lift, then carried to the kerb or sent flying.
        const g = sofa.group;
        g.rotation.z = 0;
        sofa.inner.scale.y = 1;
        if (p < -2.5) {
          g.position.set(x - 0.8, van.floor + 0.42, vz - 0.35);
        } else if (p < -2.1 || (slide && p < -0.1)) {
          const u = smooth(seg(p, -2.5, -2.1));
          g.position.set(lerp(stop - 0.8, lift.x, u), van.lift.position.y + 0.42, lerp(vz - 0.35, lift.z, seg(u, 0.5, 1)));
          g.rotation.z = slide ? tipped : 0;
        } else if (slide) {
          if (p < 0.2) {
            const u = easeIn(seg(p, -0.1, 0.2));
            g.position.set(lerp(lift.x, stop - 3.1, u), van.lift.position.y + 0.42 - 0.25 * u, lift.z);
            g.rotation.z = tipped;
          } else {
            fallFrom ??= g.position.clone();
            const v = seg(p, 0.2, 0.55);
            g.position.lerpVectors(fallFrom, landed, v);
            g.position.y = lerp(fallFrom.y, landed.y, easeIn(v)) + arc(v, 0.3) + (v >= 1 ? 0.05 * Math.abs(Math.sin(Math.PI * seg(p, 0.55, 0.75))) : 0);
            g.rotation.z = lerp(0.28, Math.PI, smooth(v));
          }
        } else {
          const up = smooth(seg(p, -1.5, -1.3)) * (1 - smooth(seg(p, -0.5, -0.25)));
          const carry = smooth(seg(p, -1.3, -0.5));
          g.position.lerpVectors(lift, kerb, carry);
          g.position.y = lerp(van.lift.position.y + 0.42, kerb.y, carry) + 0.3 * up;
          sofa.inner.scale.y = 1 - 0.08 * Math.sin(Math.PI * seg(p, 0, 0.3));
        }
        if (p >= (slide ? 0.55 : 0) && !puffed) {
          puffed = true;
          for (let i = 0; i < 5; i++) particles.spawn('puff', vec(g.position.x + (Math.random() - 0.5) * 1.2, 0.15, g.position.z + 0.3), vec((Math.random() - 0.5) * 0.8, 0.3, 0.2), { life: 0.8, scale: 0.4 });
        }

        // The movers.
        const aOut = p > -2.75;
        a.root.visible = aOut;
        b.root.visible = p > -3.0;
        if (p < -1.7 || (slide && p < 0)) {
          const ua = walk(a, aFrom, aTo, -2.75, -1.8, p, wall);
          walk(b, bFrom, bTo, -3.0, -1.8, p, wall);
          if (slide && p > -1.8) {
            // Waiting below the lift: one guiding it down, one on the controls.
            const worry = smooth(seg(p, -0.4, 0));
            a.pose({ armL: lerp(1.8, 2.6, worry), armR: lerp(1.8, 2.6, worry) + Math.sin(wall * 4) * 0.1, lean: -0.05, eyes: 1 + 0.3 * worry, mouth: 0.4 + 0.3 * worry });
            b.pose({ armL: 1.4, armR: 0.3, lean: 0.06, head: 0.12, mouth: 0.4 + 0.3 * worry });
          } else if (ua >= 1 && !slide) {
            a.pose({ armR: 0.6, armL: 0.3, head: -0.1, mouth: 0.4 });
            b.pose({ armL: 0.6, armR: 0.3, head: 0.1, mouth: 0.4 });
          }
        } else if (slide) {
          // The sofa goes; the movers react, then one of them sits on what's left.
          const shock = p < dur + 0.5;
          if (p < dur + 1.3) {
            a.root.position.copy(aTo);
            a.root.position.x += 0.3 * smooth(seg(p, 0.1, 0.4));
            a.pose({ armL: shock ? 2.8 : 1.4, armR: shock ? 2.8 : 1.4, lean: shock ? -0.12 : 0, bob: p < 0.4 ? arc(seg(p, 0.1, 0.4), 0.15) : 0, eyes: 1.3, mouth: shock ? 1 : 0.6 });
          } else {
            const u = smooth(seg(p, dur + 1.3, dur + 1.8));
            const legs = sit(a, landed.x, sofa.height + 0.02, landed.z + 0.3, wall, 0);
            const top = a.root.position.clone();
            a.root.position.lerpVectors(vec(aTo.x + 0.3, 0, aTo.z), top, u);
            a.root.position.y += arc(u, 0.3);
            a.pose({ ...legs, armL: 0.35, armR: 0.35, head: tilt(landed.x), mouth: 0.4 });
          }
          b.root.position.copy(bTo);
          b.pose({ armL: shock ? 2.7 : 2.5, armR: shock ? 2.7 : 0.3, head: shock ? 0 : Math.sin(wall * 5) * 0.12, eyes: shock ? 1.3 : 1, mouth: shock ? 1 : 0.5 });
        } else {
          // Grab, lift, carry, set it down, and drop onto it.
          const gp = g.position;
          if (p < -0.25) {
            const stride = p > -1.3 && p < -0.5 ? Math.sin(wall * 14) : 0;
            const strain = p > -1.5 && p < -0.25;
            a.root.position.set(gp.x - 0.95, 0, gp.z + 0.25);
            b.root.position.set(gp.x + 0.95, 0, gp.z + 0.25);
            a.pose({ armR: 0.9, armL: -0.5, lean: strain ? 0.06 : 0, legL: stride * 0.3, legR: stride * 0.3, bob: Math.abs(stride) * 0.03 - (strain ? 0 : 0.05), brows: strain ? -0.8 : 0, mouth: strain ? 0.2 : 0.4 });
            b.pose({ armL: 0.9, armR: -0.5, lean: strain ? -0.06 : 0, legL: stride * 0.3, legR: stride * 0.3, bob: Math.abs(stride) * 0.03 - (strain ? 0 : 0.05), brows: strain ? -0.8 : 0, mouth: strain ? 0.2 : 0.4 });
          } else {
            const u = smooth(seg(p, -0.25, 0.05));
            const flop = p >= 0 && p < 0.45;
            for (const [who, side, k] of [[a, -1, 0], [b, 1, 2]]) {
              const legs = sit(who, gp.x + side * 0.36, seat, gp.z, wall, k);
              const sat = who.root.position.clone();
              who.root.position.set(lerp(gp.x + side * 0.95, sat.x, u), lerp(0, sat.y, u) + arc(u, 0.2), lerp(gp.z + 0.25, sat.z, u));
              const outer = flop ? 2.75 : 0.55;
              const inner = flop ? 2.75 : p < 0 ? 0.4 : 1.45;
              who.pose({
                ...(u > 0.5 ? legs : {}),
                armL: side < 0 ? outer : inner,
                armR: side < 0 ? inner : outer,
                head: p > dur ? tilt(gp.x) : 0,
                eyes: flop ? 0.2 : 1,
                mouth: flop ? 1 : p > dur + 0.5 ? 0.3 : 0.5,
              });
            }
          }
        }
      },
    };
  },
});
