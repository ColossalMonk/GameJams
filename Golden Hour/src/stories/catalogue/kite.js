import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { makeKite } from '../../characters/Props.js';
import { hillHeight } from '../../world/Town.js';

/** A kid on the hill gets a kite up at last — or watches it loop and nosedive. */
export default defineStory({
  id: 'kite',
  slot: 'hill',
  window: [2.4, 6.0],
  dur: 0.8,
  cast: { kid: { kid: true } },
  outcomes: {
    main: {
      tags: ['air', 'joy', 'finally'],
      captions: {
        peak: "{kid}'s kite, finally up.",
        near: '{kid}, running flat out.',
        after: "{kid}'s kite, higher than the birds.",
        idle: '{kid} and a kite that will not fly.',
      },
    },
    alt: {
      tags: ['air', 'oops', 'falling'],
      captions: {
        peak: "{kid}'s kite, briefly.",
        near: '{kid}, running flat out.',
        after: "{kid}'s kite, face down in the grass.",
        idle: '{kid} and a kite that will not fly.',
      },
    },
  },
  create({ slot, person, group }) {
    const kx = slot.x;
    const ky = slot.y;
    const kz = slot.z;
    const kid = person('kid', kx, ky - 0.03, kz, 'L');
    const kite = makeKite();
    group.add(kite.group);
    const points = 14;
    const stringGeo = new THREE.BufferGeometry();
    stringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points * 3), 3));
    const string = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: '#3a3340' }));
    string.frustumCulled = false;
    group.add(string);
    const ground = vec(kx + 0.75, hillHeight(kx + 0.75) + 0.14, kz + 0.05);
    const dragEnd = ground.clone().add(vec(0.35, 0.55, 0));
    const crash = vec(kx - 0.95, hillHeight(kx - 0.95) + 0.12, kz + 0.05);
    const hand = vec();
    const dur = 0.8;
    let top = null;

    return {
      focus: () => [kite.group],
      update(p, { wall, outcome }) {
        const alt = outcome === 'alt';
        if (p < -1.6) {
          kid.pose({ bob: Math.abs(Math.sin(wall * 3)) * 0.03, armR: 0.5, armL: 0.2, mouth: 0.35 });
          kite.group.position.copy(ground);
          kite.group.rotation.z = 1.25;
        } else if (p < 0) {
          const u = seg(p, -1.6, 0);
          const stride = Math.sin(wall * 16);
          kid.pose({ lean: 0.18, bob: Math.abs(stride) * 0.06, legL: stride * 0.55, legR: stride * 0.55, armR: 0.9, armL: 0.6 - stride * 0.4, mouth: 0.6 });
          kite.group.position.lerpVectors(ground, dragEnd, u);
          kite.group.position.y += Math.abs(Math.sin(wall * 10)) * 0.15 * u;
          kite.group.rotation.z = 1.25 * (1 - u);
        } else if (!alt) {
          const u = easeOut(seg(p, 0, 0.7));
          const high = vec(kx - 1.7 + Math.sin(wall * 0.9) * 0.25, ky + 3.5 + Math.sin(wall * 1.3) * 0.15, kz);
          kite.group.position.lerpVectors(dragEnd, high, u);
          kite.group.rotation.z = Math.sin(wall * 1.5) * 0.15;
          if (p < dur) kid.pose({ bob: Math.abs(Math.sin(wall * 9)) * 0.1, armL: 2.6, armR: 2.6, mouth: 1 });
          else kid.pose({ bob: Math.abs(Math.sin(wall * 3)) * 0.02, armR: 2.0, armL: 0.3, mouth: 0.5 });
        } else if (p < dur) {
          const u = easeOut(seg(p, 0, 0.4));
          kite.group.position.copy(dragEnd);
          kite.group.position.x += (-0.5 + Math.sin(wall * 5) * 0.3) * u;
          kite.group.position.y += (1.7 + Math.sin(wall * 7) * 0.25) * u;
          kite.group.rotation.z = wall * 7;
          top = kite.group.position.clone();
          kid.pose({ bob: Math.abs(Math.sin(wall * 9)) * 0.1, armL: 2.6, armR: 2.6, mouth: 1 });
        } else {
          const u = smooth(seg(p, dur, dur + 0.55));
          kite.group.position.lerpVectors(top || dragEnd, crash, u);
          kite.group.rotation.z = lerp(kite.group.rotation.z, 2.4, u);
          const dismay = p < dur + 2.2;
          kid.pose({ armL: dismay ? 2.75 : 0.3, armR: dismay ? 2.75 : 0.5, mouth: dismay ? 0.9 : 0.25, head: dismay ? Math.sin(wall * 5) * 0.08 : -0.1 });
        }
        kite.bows.forEach((bow, i) => {
          bow.position.set(Math.sin(wall * 3 + i) * 0.06 * (i + 1), -0.5 - i * 0.17, 0.01);
          bow.rotation.z = Math.sin(wall * 4 + i) * 0.4;
        });
        kid.root.updateMatrixWorld(true);
        kid.hand('R', hand);
        const kp = kite.group.position;
        const taut = p >= 0 && !(alt && p > dur) ? 0.15 : 0.35;
        const arr = stringGeo.attributes.position.array;
        for (let i = 0; i < points; i++) {
          const k = i / (points - 1);
          arr[i * 3] = lerp(hand.x, kp.x, k);
          arr[i * 3 + 1] = lerp(hand.y, kp.y, k) - Math.sin(Math.PI * k) * taut;
          arr[i * 3 + 2] = lerp(hand.z, kp.z, k);
        }
        stringGeo.attributes.position.needsUpdate = true;
      },
    };
  },
});
