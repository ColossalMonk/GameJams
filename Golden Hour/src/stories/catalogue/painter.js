import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, poly } from '../../world/shapes.js';
import { makeEasel, makeBeret, makePalette, makeBrush, makeSparkle } from '../props/e-props.js';

const BERETS = ['#3a3550', '#b0453a', '#2f6f6a'];
const PAINTS = ['#e8734a', '#f2c14e', '#b0458a', '#f19a8c'];

/** A painter on the roof finally finishes the sunset. Or decides you're the better subject. */
export default defineStory({
  id: 'painter',
  slot: 'rooftop',
  window: [4.0, 13.5],
  dur: 0.9,
  cast: { artist: {} },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{artist} finished the sunset. Ta-da!',
        near: '{artist}, one last brushstroke.',
        after: '{artist}, admiring two sunsets.',
        idle: '{artist}, painting the sunset.',
      },
      sounds: [[-0.9, 'swish'], [0, 'tada'], [0.25, 'whoosh']],
      throws: { lands: 1.5, kinds: ['head'], caption: '{target}, suddenly an artist.', after: "{target}, wearing {artist}'s beret." },
    },
    you: {
      tags: ['joy'],
      captions: {
        peak: '{artist} painted you instead.',
        near: '{artist}, squinting at you.',
        after: "{artist}'s portrait of you. Flattering.",
        idle: '{artist}, painting the sunset.',
      },
      sounds: [[-1.5, 'swish'], [-0.6, 'swish'], [0, 'tada']],
    },
  },
  create({ slot, person, group, evening, outcome, particles, cross }) {
    const y0 = slot.y;
    const px = slot.x - 0.55;
    const artist = person('artist', px, y0, slot.z + 0.05, 'L');
    const easel = makeEasel();
    easel.group.position.set(slot.x + 0.45, y0, slot.z - 0.12);
    group.add(easel.group);
    const brush = place(artist.armR, makeBrush(evening.pick(PAINTS)), 0, -0.56, 0.03);
    const palette = place(artist.armL, makePalette(), 0, -0.6, 0.04);
    palette.rotation.z = 0.6;
    const beret = makeBeret(evening.pick(BERETS));
    group.add(beret);

    // The painting, in layers: sky wash, a glow along the horizon, the sun, the hills.
    const cv = easel.canvas;
    const wash = place(cv, card(rect(-0.37, -0.56, 0.74, 0.56), evening.pick(['#f7c58a', '#f6b48f', '#f2c1a0']), { depth: 0.005, shadows: false }), 0, 0.59, 0.002);
    const band = place(cv, card(rect(0, 0, 0.74, 0.14), '#f19a8c', { depth: 0.005, shadows: false }), -0.37, 0.12, 0.008);
    const sun = place(cv, card(circle(0, 0, 0.1), '#ff7a3a', { depth: 0.005, shadows: false }), evening.range(-0.08, 0.12), 0.22, 0.014);
    const ridge = [[-0.37, 0], [0.37, 0]];
    for (let i = 8; i >= 0; i--) ridge.push([-0.37 + (0.74 * i) / 8, 0.1 + 0.05 * Math.sin(i * 1.4 + 0.5)]);
    const hills = place(cv, card(poly(ridge), '#6d5a7a', { depth: 0.005, shadows: false }), 0, 0.03, 0.02);
    // …or a little portrait of the photographer, camera and all.
    const you = place(cv, new THREE.Group(), -0.17, 0.06, 0.026);
    place(you, card(roundRect(-0.05, 0, 0.1, 0.17, 0.04), '#3a3340', { depth: 0.005, shadows: false }), 0, 0, 0);
    place(you, card(circle(0, 0.23, 0.055), '#3a3340', { depth: 0.005, shadows: false }), 0, 0, 0);
    place(you, card(roundRect(0.03, 0.1, 0.13, 0.08, 0.02), '#2f2a30', { depth: 0.005, shadows: false }), 0, 0, 0.004);
    const flash = place(you, makeSparkle('#ffffff', 0.09, 3), 0.15, 0.2, 0.008);
    you.scale.setScalar(0.001);

    const painted = outcome === 'you';
    const dur = 0.9;
    const flight = 1.5;
    const top = vec();
    const end = vec();
    const tip = vec();
    const landing = vec(px - 0.75, y0 + 0.24, slot.z + 0.15);
    let from = null;
    let flicked = false;

    return {
      focus: () => [artist.root, easel.group],
      thrown: painted ? null : beret,
      x: () => slot.x,
      update(p, { wall }) {
        // The painting fills in over the evening; the painted sun grows like the real one.
        wash.scale.y = Math.max(0.001, smooth(seg(p, -9, -6.5)));
        band.scale.x = Math.max(0.001, smooth(seg(p, -7, -5)));
        const dab = !painted && p >= 0 ? 0.15 * Math.sin(Math.PI * seg(p, 0, 0.4)) : 0;
        sun.scale.setScalar(Math.max(0.001, smooth(seg(p, -6, -0.2)) + dab));
        hills.scale.y = Math.max(0.001, smooth(seg(p, -3.2, -1.8)));
        you.scale.setScalar(painted ? Math.max(0.001, smooth(seg(p, -0.9, -0.1))) : 0.001);
        flash.scale.setScalar(painted && p > 0 ? 1 + 0.4 * Math.sin(wall * 12) : 0.001);

        // The painter. Ordinary painting: dabbing at the canvas, leaning in.
        const stroke = (speed) => 1.35 + 0.45 * (0.5 + 0.5 * Math.sin(wall * speed));
        const sway = Math.sin(wall * 1.3) * 0.02;
        if (!painted && p >= -0.4 && p < dur + 0.6) {
          // The last stroke, and a flourish so big the beret takes off.
          const wind = smooth(seg(p, -0.4, -0.05));
          const swoop = easeOut(seg(p, 0, 0.2));
          artist.pose({
            armR: p < 0 ? lerp(stroke(5), 1.3, wind) : lerp(1.3, 2.95, swoop),
            armL: lerp(0.5, 1.4, swoop),
            lean: lerp(0.05, -0.08, swoop) + sway,
            head: -0.08 * swoop,
            mouth: p < 0 ? 0.5 : 1,
            eyes: p < 0 ? 0.8 : 1.2,
            brows: p < 0 ? -0.6 : null,
          });
        } else if (!painted && p >= dur + 0.6) {
          // A step back, head on one side, admiring it.
          const back = smooth(seg(p, dur + 0.6, dur + 1.2));
          artist.root.position.x = px - 0.18 * back;
          artist.pose({ armR: lerp(2.95, 0.45, back), armL: lerp(1.4, 0.7, back), head: -0.15 * back, lean: 0.04 * back + sway, mouth: 0.3 });
        } else if (painted && p >= -1.6 && p < -0.9) {
          // Brush held out at arm's length, one eye on you.
          const hold = smooth(seg(p, -1.6, -1.35));
          artist.pose({ armR: lerp(stroke(5), 1.6 + Math.sin(wall * 3) * 0.04, hold), armL: 0.5, head: -0.1 * hold, eyes: lerp(1, 0.35, hold), mouth: 0.4, lean: sway });
        } else if (painted && p >= -0.9 && p < 0) {
          // Quick, before you move.
          artist.pose({ armR: stroke(15), armL: 0.6, lean: 0.06 + Math.sin(wall * 15) * 0.02, head: -0.05, mouth: 0.55, brows: -0.7 });
        } else if (painted && p >= 0 && p < dur + 1.2) {
          // There you are. Brush at the canvas, palette waving at you.
          const show = smooth(seg(p, 0, 0.15));
          artist.pose({ armR: lerp(1.4, 1.3, show), armL: lerp(0.6, 2.5 + Math.sin(wall * 10) * 0.3, show), head: -0.12 * show, lean: sway, mouth: 0.95, eyes: 1.15 });
        } else {
          artist.root.position.x = px;
          artist.pose({ armR: stroke(5), armL: 0.5, lean: 0.05 + Math.sin(wall * 2.5) * 0.02, head: -0.06, mouth: 0.3 });
        }
        if (p < dur + 0.6) artist.root.position.x = px;

        artist.root.updateMatrixWorld(true);
        // A flick of paint off the brush at the flourish.
        if (!painted && p >= 0.05 && !flicked) {
          flicked = true;
          brush.localToWorld(tip.set(0, -0.36, 0.02));
          for (let i = 0; i < 7; i++) {
            const a = Math.PI * (0.15 + 0.7 * (i / 6));
            particles.spawn('spark', tip, vec(Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0.3), { life: 0.7, scale: 0.8, color: PAINTS[i % PAINTS.length] });
          }
        } else if (p < 0.05) flicked = false;

        // The beret: on the head, or off on the flourish.
        artist.headTop(top);
        top.y -= 0.07;
        top.z += 0.03;
        const onHead = artist.hips.rotation.z + artist.neck.rotation.z - 0.22;
        if (painted || p < 0.05) {
          beret.position.copy(top);
          beret.rotation.z = onHead;
          return;
        }
        from ??= top.clone();
        const q = seg(p, 0.05, flight);
        if (cross?.active) {
          cross.point(end);
          end.y -= 0.06;
          end.z += 0.03;
        } else end.copy(landing);
        beret.position.lerpVectors(from, end, q);
        beret.position.y += 4 * q * (1 - q) * (1.2 + 0.1 * from.distanceTo(end));
        beret.rotation.z = q < 1 ? onHead + q * Math.PI * 6 : cross?.active ? -0.2 : 0.3;
        if (q >= 1 && cross?.active) cross.land();
      },
    };
  },
});
