import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, vec } from '../anim.js';
import { makeTowPlane, makeBanner } from '../props/a-props.js';

const TEXT = { main: 'MARRY ME', thanks: 'THANKS FOR EVERYTHING' };
const INK = { 'MARRY ME': '#b03050', 'THANKS FOR EVERYTHING': '#3f6f8f', 'BYE!': '#3f4a6b' };

/** A little plane finally says it in the sky — on a banner, until the banner has other plans. */
export default defineStory({
  id: 'bannerPlane',
  slot: 'sky',
  window: [4.0, 14.0],
  dur: 1.0,
  cast: { pilot: {} },
  outcomes: {
    main: {
      tags: ['air', 'love'],
      captions: {
        peak: '{pilot}\'s banner: MARRY ME.',
        near: 'A little plane, towing a question.',
        after: 'A banner, asking the whole town.',
        idle: 'A little plane, towing something.',
      },
    },
    thanks: {
      tags: ['air', 'joy'],
      captions: {
        peak: '{pilot}\'s banner: THANKS FOR EVERYTHING.',
        near: 'A little plane, towing a message.',
        after: '{pilot}, saying it to everyone.',
        idle: 'A little plane, towing something.',
      },
    },
    tear: {
      tags: ['air', 'oops'],
      captions: {
        peak: '{pilot}\'s banner, making a break for it.',
        near: 'A banner, tugging at its rope.',
        after: 'A banner, fluttering off alone.',
        idle: 'A little plane, towing something.',
      },
    },
  },
  create({ slot, group, evening, outcome, particles }) {
    const text = TEXT[outcome] || evening.pick(['MARRY ME', 'THANKS FOR EVERYTHING', 'BYE!']);
    const w = 0.7 + 0.25 * text.length;
    const h = 0.62;
    const dir = evening.chance(0.5) ? 1 : -1;
    const plane = makeTowPlane(evening.pick(['#e2574c', '#5f8fb5', '#2f6f6a']));
    plane.group.scale.set(1.3 * dir, 1.3, 1);
    group.add(plane.group);
    const banner = makeBanner(text, w, h, INK[text]);
    group.add(banner.mesh);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([vec(), vec()]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#3d3a40' }));
    line.frustumCulled = false;
    group.add(line);

    const dur = 1.0;
    const speed = 2.4;
    const cx = evening.range(-2.5, 2.5);
    const y = slot.y + evening.range(-0.4, 0.8);
    const z = slot.z;
    const tow = 0.7;
    const tail = 0.6 * 1.3;
    const held = dir > 0 ? w / 2 : -w / 2;
    const tear = outcome === 'tear';
    const snap = vec();
    let torn = false;

    return {
      focus: () => [banner.mesh],
      x: () => banner.mesh.position.x,
      visible: () => Math.abs(banner.mesh.position.x) < 16 + w / 2,
      update(p, { wall }) {
        const bx = cx + dir * speed * (p - dur / 2);
        const bob = Math.sin(wall * 0.8) * 0.1;
        plane.group.position.set(bx + dir * (w / 2 + tow + tail), y + bob + 0.05, z + 0.05);
        plane.group.rotation.z = Math.sin(wall * 1.1) * 0.04;
        plane.prop.scale.y = 0.2 + Math.abs(Math.sin(wall * 40));
        const tailX = plane.group.position.x - dir * tail;
        const tailY = plane.group.position.y;

        if (!tear || p < 0) {
          const jerk = tear ? smooth(seg(p, -0.6, 0)) : 0;
          banner.mesh.position.set(bx, y + bob, z);
          banner.mesh.rotation.z = Math.sin(wall * 1.3) * 0.02 + jerk * Math.sin(wall * 18) * 0.05;
          banner.ripple(wall, 0.08 + jerk * 0.12, held);
        } else {
          if (!torn) {
            torn = true;
            snap.set(tailX - dir * tow, tailY, z + 0.1);
            for (let i = 0; i < 4; i++) particles.spawn('puff', snap, vec((Math.random() - 0.5) * 0.8, Math.random() * 0.6, 0.2), { life: 0.9, scale: 0.6 });
          }
          // Released: it keeps a little speed, then drifts and sinks, flapping.
          const free = (1 - Math.exp(-1.3 * p)) / 1.3;
          const x0 = cx + dir * speed * (-dur / 2);
          banner.mesh.position.set(x0 + dir * speed * free, y + bob - 0.3 * p - 0.15 * Math.sin(p * 2), z);
          banner.mesh.rotation.z = -dir * 0.3 * smooth(seg(p, 0, 0.5)) + Math.sin(wall * 2.2) * 0.12;
          banner.ripple(wall * 1.6, 0.3, held);
        }

        const arr = lineGeo.attributes.position.array;
        arr[0] = tailX;
        arr[1] = tailY;
        arr[2] = z + 0.05;
        if (tear && p >= 0) {
          arr[3] = tailX - dir * 0.45;
          arr[4] = tailY - 0.35;
        } else {
          arr[3] = banner.mesh.position.x + held;
          arr[4] = banner.mesh.position.y;
        }
        arr[5] = z;
        lineGeo.attributes.position.needsUpdate = true;
      },
    };
  },
});
