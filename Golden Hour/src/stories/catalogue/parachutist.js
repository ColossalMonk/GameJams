import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, arc, vec } from '../anim.js';
import { makeCanopy } from '../props/e-props.js';

const CANOPIES = [['#e2574c', '#fbf1dc'], ['#5f8fb5', '#f2c14e'], ['#2f6f6a', '#fbf1dc'], ['#b0458a', '#ffd27a']];
/** Seconds of descent shown before touchdown, and the height it starts from (feet). */
const FALL = 6.0;
const HIGH = 14;
/** From the canopy's hem down to the jumper's feet. */
const DROP = 3.05;

/** A parachutist finally comes down, right on the park. Neatly, or wearing the parachute. */
export default defineStory({
  id: 'parachutist',
  slot: ['sky', 'park'],
  rarity: 'rare',
  window: [4.0, 14.0],
  dur: 1.0,
  cast: { jumper: { look: { top: '#e8a35a', bottom: '#e8a35a' } } },
  outcomes: {
    main: {
      tags: ['air', 'falling', 'joy'],
      captions: {
        peak: '{jumper}, landing right on the spot.',
        near: '{jumper}, coming in to land.',
        after: '{jumper}, down safe in the park.',
        idle: 'A parachute, drifting down.',
      },
      sounds: [[-1.2, 'whoosh'], [-0.05, 'thud'], [0.2, 'cheer']],
    },
    tangled: {
      tags: ['air', 'falling', 'oops'],
      captions: {
        peak: '{jumper}, wearing the parachute.',
        near: '{jumper}, coming in to land.',
        after: '{jumper}, still looking for the way out.',
        idle: 'A parachute, drifting down.',
      },
      sounds: [[-1.2, 'whoosh'], [-0.05, 'thud'], [0.5, 'laugh']],
    },
  },
  create({ slots, person, group, evening, outcome }) {
    const park = slots[1];
    const fx = park.x;
    const z = park.z;
    const jumper = person('jumper', fx, 0, z, 'L');
    const chute = makeCanopy(evening.pick(CANOPIES));
    group.add(chute.group);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(chute.anchors.length * 6), 3));
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: '#3d3a40' }));
    lines.frustumCulled = false;
    group.add(lines);

    const side = evening.chance(0.5) ? 1 : -1;
    const from = side * evening.range(1.8, 3.0);
    // Where the canopy ends up after a neat landing: on the grass, upwind.
    const flop = -side;
    const tangled = outcome === 'tangled';
    const dur = 1.0;
    const hem = vec();
    const at = vec();
    const harness = [vec(-0.17, 0.5, 0.05), vec(0.17, 0.5, 0.05)];
    const strap = vec();

    return {
      focus: () => [jumper.root, chute.group],
      x: () => jumper.root.position.x,
      visible: (p) => p > -FALL + 0.6,
      update(p, { wall }) {
        // The descent: slower and slower, swinging gently under the canopy.
        const q = seg(-p, 0, FALL);
        const feet = HIGH * Math.pow(q, 1.25);
        const swing = Math.sin(wall * 1.3) * 0.12 * Math.min(1, q * 4);
        hem.set(fx + from * q + Math.sin(p * 0.8) * 0.25 * q, feet + DROP, z - 0.15);

        const air = p < 0;
        if (air) {
          jumper.root.position.set(hem.x + Math.sin(swing) * DROP, hem.y - Math.cos(swing) * DROP, z);
          jumper.root.rotation.z = swing;
          chute.group.position.copy(hem);
          chute.group.rotation.z = swing * 0.4;
          chute.group.scale.set(1, 1 + Math.sin(wall * 2.2) * 0.03, 1);
          // Hands up on the toggles; a pull down to flare just before the ground.
          const flare = smooth(seg(p, -0.5, -0.1));
          const dangle = Math.sin(wall * 1.7) * 0.12 * (1 - flare);
          jumper.pose({ armL: lerp(2.6, 2.15, flare), armR: lerp(2.6, 2.15, flare), legL: dangle, legR: -dangle, mouth: p > -0.6 ? 0.6 : 0.35, brows: p > -0.6 ? -0.5 : null });
        } else if (!tangled) {
          // Touchdown, a knee-bend, arms up. The canopy sighs down onto the grass beside.
          jumper.root.position.set(fx, 0, z);
          jumper.root.rotation.z = 0;
          const knees = Math.sin(Math.PI * seg(p, 0, 0.3));
          const hop = p > 0.3 && p < dur + 0.6 ? arc(seg(p, 0.35, 0.75), 0.1) : 0;
          const cheer = p > 0.15 && p < dur + 1.6;
          const shake = Math.sin(wall * 9) * 0.12;
          jumper.pose({
            armL: cheer ? 2.7 + shake : lerp(2.15, 0.3, smooth(seg(p, dur + 1.6, dur + 2.0))),
            armR: cheer ? 2.7 - shake : p < 0.15 ? 2.15 : lerp(2.7, 0.35, smooth(seg(p, dur + 1.6, dur + 2.0))),
            bob: -0.14 * knees + hop,
            mouth: cheer ? 0.95 : 0.35,
            eyes: cheer ? 1.15 : 1,
          });
          const fall = easeOut(seg(p, 0, 1.1));
          chute.group.position.set(lerp(fx, fx + flop * 1.25, fall), lerp(DROP, 0.15, fall), z - 0.15);
          chute.group.rotation.z = -flop * 1.3 * smooth(seg(p, 0, 1.1));
          chute.group.scale.set(1, lerp(1, 0.4, smooth(seg(p, 0.2, 1.3))), 1);
        } else {
          // Touchdown, and the whole canopy comes down on top: a wriggling parachute with shoes.
          const drop = easeOut(seg(p, 0, 0.35));
          const shuffle = Math.sin(wall * 2.3) * 0.22 * smooth(seg(p, 0.35, 0.8));
          jumper.root.position.set(fx + shuffle, 0, z);
          jumper.root.rotation.z = Math.sin(wall * 5) * 0.06;
          const kick = Math.sin(wall * 11) * 0.35 * smooth(seg(p, 0.3, 0.6));
          jumper.pose({ armL: 2.4 + Math.sin(wall * 8) * 0.4, armR: 2.4 - Math.sin(wall * 8) * 0.4, legL: Math.max(0, kick), legR: Math.max(0, -kick), mouth: 0.7 });
          chute.group.position.set(fx + shuffle * 1.1, lerp(DROP, 0.5, drop), lerp(z - 0.15, z + 0.25, smooth(seg(p, 0, 0.15))));
          chute.group.rotation.z = Math.sin(wall * 4.6) * 0.1 * smooth(seg(p, 0.3, 0.6));
          chute.group.scale.set(lerp(1, 0.66, drop), lerp(1, 2.2, drop) + Math.sin(wall * 6) * 0.06 * drop, 1);
        }

        // Lines from the hem to the harness; slack (and hidden) once it's all on the ground.
        jumper.root.updateMatrixWorld(true);
        chute.group.updateMatrixWorld(true);
        lines.visible = air || (!tangled && p < 0.9);
        const arr = lineGeo.attributes.position.array;
        chute.anchors.forEach((anchor, i) => {
          chute.group.localToWorld(at.copy(anchor));
          jumper.hips.localToWorld(strap.copy(harness[i < 2 ? 0 : 1]));
          arr.set([at.x, at.y, at.z, strap.x, strap.y, strap.z], i * 6);
        });
        lineGeo.attributes.position.needsUpdate = true;
      },
    };
  },
});
