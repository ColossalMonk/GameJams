import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, arc, vec } from '../anim.js';
import { makeOpenWindow } from '../props/b-props.js';
import { hideLegs, makeWindowBox, makeCage, makeParrot } from '../props/f-props.js';

const SHUTTERS = ['#2f6f6a', '#b5524a', '#3f6f8f', '#6d5a7a'];
const FEATHERS = ['#3fa36b', '#e2574c', '#4f8fd0'];
/** The loop-the-loop: when it starts and how long it takes. */
const LOOP_AT = 0.15;
const LOOP = 0.85;
/** How long the parrot takes to find a new perch. */
const PERCH = 1.4;
/** The lamp post nearest the apartment: where the parrot sits if nobody's head is free. */
const LAMP = vec(-4.6, 3.43, 0.76);

/** The cage door, opened for one cracker, and the parrot is out. A loop of joy, or a new perch. */
export default defineStory({
  id: 'parrot',
  slot: 'window',
  window: [2.6, 13.0],
  dur: 0.9,
  cast: { owner: {} },
  outcomes: {
    main: {
      tags: ['animal', 'air', 'finally'],
      captions: {
        peak: "{owner}'s parrot, looping the loop.",
        near: '{owner}, opening the cage door.',
        after: "{owner}'s parrot, free over Elm Street.",
        idle: "{owner}'s parrot, eyeing the cage door.",
      },
      sounds: [[-0.9, 'plink'], [0, 'flap'], [0.5, 'whistle']],
    },
    perch: {
      tags: ['animal', 'oops'],
      captions: {
        peak: "{owner}'s parrot, out of the cage!",
        near: '{owner}, opening the cage door.',
        after: '{owner}, calling the parrot home.',
        idle: "{owner}'s parrot, eyeing the cage door.",
      },
      throws: { lands: PERCH, kinds: ['head'], caption: '{target} has a parrot now.', after: '{target}, wearing a parrot.' },
      sounds: [[-0.9, 'plink'], [0, 'flap'], [PERCH, 'laugh']],
    },
  },
  create({ slot, person, group, evening, outcome, particles, cross }) {
    const w = makeOpenWindow({ shutter: evening.pick(SHUTTERS), slats: 2 });
    w.group.position.set(slot.x, slot.y, slot.z);
    group.add(w.group);
    w.group.add(makeWindowBox(['#f2c14e', '#f6a5b8', '#f2c14e']));
    const cage = makeCage();
    cage.group.position.set(0.12, 0.0, 0.34);
    cage.group.scale.setScalar(0.9);
    w.group.add(cage.group);
    const height = 0.88;
    const owner = person('owner', slot.x - 0.2, slot.y - 0.32 - 0.72 * height, slot.z - 0.25, 'L', { height });
    hideLegs(owner);

    const bird = makeParrot(evening.pick(['#3fa36b', '#3fa36b', '#4f8fd0']));
    group.add(bird.group);

    // Where the loop happens: out in front of the window, off to the open side of the building.
    const side = slot.x < -3.17 ? -1 : 1;
    const centre = vec(slot.x + side * 0.9, slot.y + 0.7, slot.z + 0.8);
    const r = 0.55;
    const away = vec(slot.x + side * 6, slot.y + 4.5, slot.z - 1.0);

    const dur = 0.9;
    const inCage = vec();
    const door = vec();
    const launch = vec();
    const end = vec();
    const loopIn = vec(centre.x, centre.y - r, centre.z);
    let near = true;
    let puffed = false;

    return {
      focus: () => [owner.root, w.group, ...(near ? [bird.group] : [])],
      thrown: bird.group,
      update(p, { wall, outcome: o }) {
        w.shutters(1);
        // The owner leans out with a cracker, opens the little door, and gets a fright.
        const out = smooth(seg(p, -1.6, -1.2));
        owner.root.position.z = slot.z + lerp(-0.25, 0.14, out);
        owner.root.visible = p > -1.7;
        const open = smooth(seg(p, -1.0, -0.75));
        const reach = smooth(seg(p, -1.1, -0.8)) * (1 - smooth(seg(p, -0.1, 0.05)));
        const fright = p >= 0 && p < dur + 0.6;
        const calling = o === 'perch' && p > PERCH;
        owner.pose({
          armL: fright ? 2.75 : calling ? 2.3 + Math.sin(wall * 8) * 0.3 : 0.3,
          armR: fright ? 2.75 : lerp(0.3, 1.25, reach),
          head: p < 0 ? 0.08 * reach : 0,
          mouth: fright ? 1 : calling ? 0.6 : 0.35,
          brows: fright ? 1 : null,
        });
        owner.hips.rotation.x = 0.15 * out;
        cage.door.rotation.y = -1.9 * open * (1 - smooth(seg(p, dur + 2.0, dur + 2.4)));

        w.group.updateMatrixWorld(true);
        cage.group.localToWorld(inCage.set(0, 0.17, 0.0));
        cage.group.localToWorld(door.copy(cage.doorway));
        const flap = Math.sin(wall * 24);
        // Small enough for the cage inside, a bit bigger once out (so it reads from the street).
        const size = lerp(0.6, 1.2, smooth(seg(p, -0.2, 0.1)));
        bird.group.rotation.set(0, 0, 0);
        bird.group.scale.set(size, size, 1);

        if (p < -0.2) {
          // Inside, bobbing, more and more excited about the cracker.
          const keen = smooth(seg(p, -1.0, -0.4));
          bird.group.position.copy(inCage);
          bird.group.position.y += Math.abs(Math.sin(wall * (3 + 6 * keen))) * 0.03 * (1 + keen);
          bird.group.position.z -= 0.02;
          bird.group.scale.x = Math.sin(wall * 1.3) > 0 ? size : -size;
          bird.wing.rotation.z = 0;
          return;
        }
        if (p < 0) {
          // Squeezing out of the door.
          bird.group.position.lerpVectors(inCage, door, smooth(seg(p, -0.2, 0)));
          bird.wing.rotation.z = flap * 0.2;
          return;
        }
        if (!puffed) {
          puffed = true;
          launch.copy(door);
          for (let i = 0; i < 3; i++) {
            particles.spawn('puff', door, vec(side * (0.5 + Math.random()), 0.6 + Math.random() * 0.5, 0.3), { life: 0.9, scale: 0.18, color: evening.pick(FEATHERS) });
          }
        }
        bird.wing.rotation.z = flap * 0.9;

        if (o === 'main') {
          const pos = bird.group.position;
          if (p < LOOP_AT) {
            // Out of the door and down into the bottom of the loop.
            pos.lerpVectors(launch, loopIn, easeOut(seg(p, 0, LOOP_AT)));
            bird.group.scale.x = side * size;
          } else if (p < LOOP_AT + LOOP) {
            // Round once, head over tail.
            const a = -Math.PI / 2 + side * 2 * Math.PI * smooth(seg(p, LOOP_AT, LOOP_AT + LOOP));
            pos.set(centre.x + Math.cos(a) * r, centre.y + Math.sin(a) * r, centre.z);
            bird.group.scale.x = side * size;
            bird.group.rotation.z = a + Math.PI / 2;
          } else {
            // And away towards the sun, swooping.
            const u = seg(p, LOOP_AT + LOOP, LOOP_AT + LOOP + 4);
            pos.lerpVectors(loopIn, away, u);
            pos.y += Math.sin(u * 14) * 0.15;
            bird.group.scale.x = side * size * (1 - 0.4 * u);
            bird.group.scale.y = size * (1 - 0.4 * u);
            bird.group.rotation.z = side * 0.3;
          }
          near = p < LOOP_AT + LOOP + 0.4;
          bird.group.visible = p < LOOP_AT + LOOP + 4;
          return;
        }

        // A fluttering, unsteady flight to a new perch: someone's head, or the lamp post.
        const u = seg(p, 0, PERCH);
        if (cross?.active) {
          cross.point(end);
          end.y += 0.1;
        } else end.copy(LAMP);
        const pos = bird.group.position;
        pos.lerpVectors(launch, end, smooth(u));
        pos.y += arc(u, 1.0 + 0.06 * launch.distanceTo(end)) + Math.sin(u * 20) * 0.08 * (1 - u);
        bird.group.scale.x = (end.x < launch.x ? -1 : 1) * size;
        if (u >= 1) {
          bird.group.scale.x = Math.sin(wall * 0.8) > 0 ? size : -size;
          bird.wing.rotation.z = 0;
          pos.y += Math.abs(Math.sin(wall * 4)) * 0.02;
          if (cross?.active) cross.land();
        }
        near = pos.distanceTo(launch) < 2.2;
      },
    };
  },
});
