import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, arc, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { rect } from '../../world/shapes.js';
import { makeFireTruck, makeLadderSection, makeHardHat, wearHat } from '../props/b-props.js';

const UP = new THREE.Vector3(0, 1, 0);
const FACE = new THREE.Vector3(0, 0, 1);

/** A fire engine finally comes for the cat on the windowsill. The cat has its own ideas. */
export default defineStory({
  id: 'fireTruck',
  slot: ['road', 'window'],
  window: [6.5, 13.5],
  dur: 1.0,
  cast: { firefighter: { dress: false, look: { top: '#c8423a', bottom: '#2f2a30' } }, cat: { kind: 'cat' } },
  outcomes: {
    main: {
      tags: ['animal', 'joy'],
      captions: {
        peak: '{firefighter} rescued {cat}.',
        near: '{firefighter}, up the ladder.',
        after: '{cat}, safe on the ground.',
        idle: '{cat}, stuck on a windowsill.',
      },
    },
    walk: {
      tags: ['animal'],
      captions: {
        peak: '{cat}, walking down past {firefighter}.',
        near: '{firefighter}, up the ladder.',
        after: '{cat}, rescued by nobody.',
        idle: '{cat}, stuck on a windowsill.',
      },
    },
    jump: {
      tags: ['animal', 'oops'],
      captions: {
        peak: "{cat} landed on {firefighter}'s head.",
        near: '{firefighter}, up the ladder.',
        after: '{cat}, riding off on {firefighter}.',
        idle: '{cat}, stuck on a windowsill.',
      },
    },
  },
  create({ slots, person, cat: makeCat, group, add }) {
    const [road, win] = slots;
    const side = win.x < -3.17 ? 1 : -1;
    const top = vec(win.x + side * 0.62, win.y - 0.4, win.z + 0.36);
    const truckZ = road.z - 0.3;
    const truck = makeFireTruck();
    add(truck.group, 16, 0, truckZ);
    const stopX = top.x + 0.25 - truck.turntable.x;
    const base = vec(stopX, 0, truckZ).add(truck.turntable);
    const dir = top.clone().sub(base);
    const len = dir.length();
    dir.normalize();
    const qStow = new THREE.Quaternion().setFromAxisAngle(FACE, Math.PI / 2);
    const qUp = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const ladder = new THREE.Group();
    group.add(ladder);
    const section = len * 0.56;
    ladder.add(makeLadderSection(section));
    const fly = makeLadderSection(section, 0.28);
    fly.position.z = 0.04;
    ladder.add(fly);

    place(group, card(rect(-0.32, -0.06, 0.64, 0.08), '#f2e8d6', { depth: 0.12 }), win.x, win.y, win.z + 0.02);
    const cat = makeCat('cat');
    cat.root.scale.setScalar(0.55);
    const sill = vec(win.x, win.y + 0.02, win.z + 0.12);
    add(cat.root, sill.x, sill.y, sill.z);
    const ff = person('firefighter', 16, 0, truckZ, 'L');
    wearHat(ff, makeHardHat('#f2c14e', { brim: 0.25, back: 0.12 }));
    const ground = vec(stopX + 2.45, 0, truckZ + 0.25);
    const reach = side > 0 ? 'armL' : 'armR';
    const dur = 1.0;
    const pos = vec();
    const normal = vec();
    const hL = vec();
    const hR = vec();
    const hop = vec();
    const leave = dur + 3.1;

    const along = (s, lift, target) => target.copy(base).addScaledVector(dir, s).addScaledVector(normal, lift);
    const truckX = (p) => {
      if (p < -2.9) return lerp(16, stopX, easeOut(seg(p, -4.4, -2.9)));
      return lerp(stopX, -17, easeIn(seg(p, leave, leave + 1.6)));
    };

    return {
      focus: () => [ff.root, cat.root],
      x: () => truck.group.position.x,
      visible: (p) => p > -4.0 && p < leave + 1.0,
      update(p, { wall, outcome }) {
        const tx = truckX(p);
        truck.group.position.x = tx;
        truck.body.position.y = tx !== stopX ? Math.abs(Math.sin(wall * 18)) * 0.02 : 0;
        truck.wheels.forEach((w) => (w.rotation.z = -tx / 0.27));
        const flash = Math.sin(wall * 14) > 0;
        truck.lights[0].visible = flash;
        truck.lights[1].visible = !flash;

        // Ladder: swings up, slides out, and later folds away again.
        const raise = smooth(seg(p, -2.9, -2.2)) * (1 - smooth(seg(p, dur + 2.4, dur + 3.0)));
        const extend = smooth(seg(p, -2.2, -1.5)) * (1 - smooth(seg(p, dur + 1.8, dur + 2.4)));
        ladder.position.set(tx, 0, truckZ).add(truck.turntable);
        ladder.quaternion.slerpQuaternions(qStow, qUp, raise);
        fly.position.y = extend * (len - section);
        normal.copy(FACE).applyQuaternion(qUp);

        // Where the firefighter is: s along the ladder, or riding on the back step.
        const main = outcome === 'main';
        const walk = outcome === 'walk';
        let s = 0;
        let onLadder = false;
        const climbTo = walk ? 0.55 : 1;
        if (p > -1.35 && p < dur + 1.6) {
          onLadder = true;
          const up = smooth(seg(p, -1.35, walk ? -0.1 : -0.2));
          const down = walk ? smooth(seg(p, dur + 0.4, dur + 1.2)) : smooth(seg(p, dur + 0.2, dur + 1.4));
          s = len * climbTo * up * (1 - down);
        }
        const toStep = vec(tx, 0, truckZ).add(truck.step);
        if (onLadder) {
          along(s, 0.1, pos);
          // Stepping aside to let the cat past.
          if (walk) pos.x -= 0.3 * smooth(seg(p, -0.5, -0.1)) * (1 - smooth(seg(p, dur + 0.2, dur + 0.4)));
        } else {
          pos.copy(toStep);
        }
        const board = p < 0 ? seg(p, -1.6, -1.35) : seg(p, dur + 1.6, dur + 1.9);
        if (board > 0 && board < 1) {
          const a = p < 0 ? toStep : along(0, 0.1, hop);
          const b = p < 0 ? along(0, 0.1, hop) : toStep;
          pos.lerpVectors(a, b, board).y += arc(board, 0.4);
        }
        ff.root.position.copy(pos);

        const climbing = onLadder && s > 0.05 && s < len * climbTo - 0.05;
        const step = Math.sin(wall * 12);
        if (climbing) {
          ff.pose({ armL: 2.5 + step * 0.35, armR: 2.5 - step * 0.35, legL: step * 0.3, legR: -step * 0.3, mouth: 0.4 });
        } else if (onLadder && p < 0) {
          ff.pose({ [reach]: 1.0, mouth: 0.6, lean: side * 0.1 });
        } else if (onLadder && main) {
          const lift = easeOut(seg(p, 0, 0.2));
          const hold = p < dur ? lerp(1.1, 2.85, lift) : 0.55;
          ff.pose({ armL: hold, armR: hold, bob: p < dur ? Math.abs(Math.sin(wall * 8)) * 0.05 * lift : 0, mouth: p < dur ? 1 : 0.6 });
        } else if (onLadder && walk) {
          ff.pose({ armL: 0.9, armR: 0.9, lean: 0.08, head: Math.sin(wall * 4) * 0.12, mouth: 0.8 });
        } else if (onLadder) {
          const flail = p < dur + 0.4;
          ff.pose(flail ? { armL: 2.2 + step * 0.7, armR: 2.2 - step * 0.7, bob: Math.abs(step) * 0.05, mouth: 1 } : { armL: 0.4, armR: 0.4, mouth: 0.5 });
        } else {
          ff.pose({ armR: 1.2, armL: 0.3, lean: -0.1, mouth: 0.4 });
        }
        ff.root.updateMatrixWorld(true);

        // The cat: on the sill, then carried, walking, or riding a helmet.
        let catPos = sill;
        let catScale = 0.55;
        if (main && p >= -0.15 && p < dur + 1.5) {
          ff.hand('L', hL);
          ff.hand('R', hR);
          catPos = hop.addVectors(hL, hR).multiplyScalar(0.5);
          catPos.y -= p < dur ? 0.12 : 0.3;
          catPos.z += 0.12;
          catPos.lerpVectors(sill, catPos, smooth(seg(p, -0.15, 0.1)));
        } else if (walk && p > -0.45 && p < dur + 0.9) {
          catPos = along(len * (1 - seg(p, -0.45, dur + 0.9)), 0.26, hop);
          catPos.x += 0.2;
          catPos.z += 0.25;
          catPos.y += Math.abs(Math.sin(wall * 10)) * 0.04;
        } else if (outcome === 'jump' && p >= 0) {
          catPos = ff.headTop(hop);
          catPos.y += 0.04;
          catPos.z += 0.08;
          if (p < 0.25) catPos.lerpVectors(sill, catPos, seg(p, 0, 0.25)).y += arc(seg(p, 0, 0.25), 0.5);
          catScale = 0.45;
        } else if (p >= (walk ? dur + 0.9 : dur + 1.5)) {
          const from = walk ? along(0, 0.26, hop) : ff.hand('R', hop);
          const u = seg(p, walk ? dur + 0.9 : dur + 1.5, walk ? dur + 1.3 : dur + 1.9);
          catPos = from.lerp(ground, u);
          catPos.y += arc(u, 0.5);
        }
        cat.root.position.copy(catPos);
        cat.root.scale.setScalar(catScale);
        const scared = outcome === 'jump' && p > 0 && p < dur + 0.4;
        cat.pose({ sway: Math.sin(wall * 2) * 0.3, stare: scared ? 0.6 : 0, stretch: walk && p > -0.45 ? 0.5 : 0 });
      },
    };
  },
});
