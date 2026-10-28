import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { rect } from '../../world/shapes.js';
import { makeSheet } from '../props/a-props.js';

const SHEETS = ['#fbf6ee', '#f6a5b8', '#9fd3c7', '#f2c14e', '#b9cde0', '#c9a4c4'];
const POINTS = 10;

/** Washing day on the roof, at last. A gust takes a sheet, the whole line, or the washer. */
export default defineStory({
  id: 'laundry',
  slot: 'rooftop',
  window: [3.0, 13.5],
  dur: 0.9,
  cast: { hanger: {} },
  outcomes: {
    main: {
      tags: ['air'],
      captions: {
        peak: "{hanger}'s sheet, off haunting the sky.",
        near: '{hanger}, and a sudden gust.',
        after: 'A sheet, waving goodbye over town.',
        idle: '{hanger}, finally doing the washing.',
      },
      throws: { lands: 1.6, kinds: ['head'], caption: '{target}, suddenly a ghost.', after: '{target}, still a ghost.' },
    },
    line: {
      tags: ['air', 'oops'],
      captions: {
        peak: "{hanger}'s whole washing line, airborne.",
        near: '{hanger}, and a sudden gust.',
        after: "{hanger}'s washing, heading south.",
        idle: '{hanger}, finally doing the washing.',
      },
    },
    wrap: {
      tags: ['oops', 'joy'],
      captions: {
        peak: '{hanger}, wearing a sheet.',
        near: '{hanger}, and a sudden gust.',
        after: '{hanger}, haunting the roof.',
        idle: '{hanger}, finally doing the washing.',
      },
    },
  },
  create({ slot, person, group, evening, outcome, cross }) {
    const y0 = slot.y;
    const z = slot.z - 0.25;
    const x0 = slot.x - 1.3;
    const x1 = slot.x + 0.55;
    const lineY = y0 + 1.55;
    for (const px of [x0, x1]) place(group, card(rect(-0.035, 0, 0.07, 1.62), '#6b4636', { depth: 0.03 }), px, y0, z - 0.03);
    const hanger = person('hanger', x1 + 0.4, y0, slot.z, 'R');

    // Line and sheets live in one group (in world coordinates) so the whole line can fly off.
    const washing = new THREE.Group();
    group.add(washing);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3));
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#3d3a40' }));
    line.frustumCulled = false;
    washing.add(line);
    const sheets = [0, 1, 2].map((i) => {
      const s = makeSheet(evening.pick(SHEETS), 0.54, 0.74);
      s.x = x0 + 0.33 + i * 0.6;
      s.phase = evening.range(0, 6);
      washing.add(s.group);
      return s;
    });
    const flyer = outcome === 'main' ? sheets[1] : outcome === 'wrap' ? sheets[2] : null;
    const last = sheets[2];

    const dur = 0.9;
    const hand = vec();
    const head = vec();
    const from = vec();
    const end = vec();
    const sheetFlight = 1.6;
    const flying = outcome === 'line';
    const lineAt = (x, wall, f) => lineY - 0.07 * Math.sin((Math.PI * (x - x0)) / (x1 - x0)) + Math.sin(wall * 5 + x * 2) * 0.08 * f;

    return {
      focus: () => (outcome === 'main' ? [flyer.group] : outcome === 'line' ? [washing] : [hanger.root, flyer.group]),
      thrown: flyer?.group,
      x: () => (flyer ? flyer.group.position.x : washing.position.x + slot.x),
      visible: () => {
        const o = outcome === 'main' ? flyer.group.position : washing.position;
        return outcome === 'wrap' || (o.y < (outcome === 'main' ? 13.5 : 5.5) && Math.abs(o.x) < 15);
      },
      update(p, { wall }) {
        const gust = smooth(seg(p, -0.5, 0));
        const fly = flying ? smooth(seg(p, 0, 0.3)) : 0;
        if (flying && p >= 0) washing.position.set(1.4 * p + 0.25 * p * p, 0.9 * p + 0.12 * Math.sin(p * 3), 0.3 * Math.min(p, 1));
        else washing.position.set(0, 0, 0);

        // The hanger: pegs the last sheet up, admires it, then the gust.
        const reach = smooth(seg(p, -1.6, -1.0)) * (1 - smooth(seg(p, -0.75, -0.45)));
        const dismay = p >= 0 && p < dur + 1.2;
        const wrapped = outcome === 'wrap' && p >= 0.1;
        if (wrapped) {
          hanger.root.position.x = x1 + 0.4 + Math.sin(wall * 2.6) * 0.12 * smooth(seg(p, 0.1, 0.5));
          hanger.pose({ armL: 1.45 + Math.sin(wall * 7) * 0.15, armR: 1.45 - Math.sin(wall * 7) * 0.15, bob: Math.abs(Math.sin(wall * 5)) * 0.04, lean: Math.sin(wall * 2.6) * 0.06 });
        } else {
          hanger.root.position.x = x1 + 0.4;
          hanger.pose({
            armL: dismay ? 2.75 : p > dur + 1.2 && outcome !== 'wrap' ? 0.3 : lerp(p < -1.6 ? 0.9 + Math.sin(wall * 2) * 0.1 : 0.6, 2.1, reach),
            armR: dismay ? 2.75 : p > dur + 1.2 ? 2.2 + Math.sin(wall * 3) * 0.1 : 0.3 + 0.25 * reach,
            lean: -0.06 * gust + Math.sin(wall * 1.1) * 0.02,
            head: p > -0.6 && p < 0 ? -0.1 : 0,
            mouth: dismay ? 1 : 0.35 + 0.3 * gust,
          });
        }
        hanger.root.updateMatrixWorld(true);
        hanger.hand('L', hand);

        // The washing line.
        const arr = lineGeo.attributes.position.array;
        for (let i = 0; i < POINTS; i++) {
          const x = lerp(x0, x1, i / (POINTS - 1));
          arr[i * 3] = x;
          arr[i * 3 + 1] = lineAt(x, wall, fly);
          arr[i * 3 + 2] = z + 0.02;
        }
        lineGeo.attributes.position.needsUpdate = true;

        // Each sheet hangs from the line and billows in the gust.
        for (const [i, s] of sheets.entries()) {
          const g = s.group;
          g.position.set(s.x, lineAt(s.x, wall, fly), z + 0.03);
          g.scale.set(1, 1, 1);
          const breeze = 0.15 + 0.85 * Math.max(gust, fly);
          g.rotation.x = -0.5 * breeze * (gust || fly ? 1 + 0.3 * Math.sin(wall * 9 + s.phase) : 0.2);
          g.rotation.z = 0.04 * Math.sin(wall * 1.5 + s.phase) + 0.35 * Math.max(gust, fly) + Math.sin(wall * 6 + i) * 0.08 * gust;
          for (const e of s.eyes) e.visible = false;
          if (s === last && p < -0.85) {
            // Still in the hanger's hand, on its way up to the line.
            const u = smooth(seg(p, -1.1, -0.85));
            g.position.lerp(from.set(hand.x, hand.y + 0.05, slot.z + 0.12), 1 - u);
            g.rotation.set(0, 0, 0.1 * Math.sin(wall * 2));
          }
        }

        if (outcome === 'main' && p >= 0 && cross?.active) {
          // Off it goes, and down over someone else's head: a new ghost.
          const g = flyer.group;
          const u = smooth(seg(p, 0, sheetFlight));
          from.copy(g.position);
          cross.point(end);
          end.y += 0.1;
          end.z += 0.12;
          g.position.lerpVectors(from, end, u);
          g.position.y += 4 * u * (1 - u) * (1.2 + 0.1 * from.distanceTo(end));
          g.rotation.set(-0.4 * (1 - u), 0, Math.sin(wall * 4) * 0.25 * (1 - u) + Math.sin(wall * 2.6) * 0.05 * u);
          g.scale.set(lerp(1.1, 1.6, u), lerp(1, 1.9, u), 1);
          for (const e of flyer.eyes) e.visible = p > 0.15;
          if (u >= 1) cross.land();
        } else if (outcome === 'main' && p >= 0) {
          // Off it goes, like a small ghost.
          const g = flyer.group;
          g.position.x += 1.5 * p + 0.2 * Math.sin(p * 2);
          g.position.y += 0.95 * p + 0.15 * Math.sin(p * 3);
          g.position.z += 0.4 * Math.min(p, 1);
          g.rotation.set(0, 0, Math.sin(wall * 4) * 0.25);
          g.scale.set(1.1, 1 + Math.sin(wall * 6) * 0.08, 1);
          for (const e of flyer.eyes) e.visible = p > 0.15;
        } else if (outcome === 'wrap' && p >= 0) {
          // Straight onto the hanger, who is now a ghost with shoes.
          hanger.headTop(head);
          const u = smooth(seg(p, 0, 0.25));
          const g = flyer.group;
          g.position.lerp(from.set(head.x, head.y + 0.1, slot.z + 0.16), u);
          g.rotation.set(-0.5 * (1 - u), 0, (1 - u) * 0.35 + Math.sin(wall * 2.6) * 0.05 * u);
          g.scale.set(lerp(1, 1.6, u), lerp(1, 1.9, u), 1);
          for (const e of flyer.eyes) e.visible = p > 0.2;
        }
      },
    };
  },
});
