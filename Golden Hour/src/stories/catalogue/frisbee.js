import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { makeFrisbee } from '../../characters/Props.js';

/** A dog in the park leaps for a frisbee: a mid-air catch, or a jump at nothing. */
export default defineStory({
  id: 'frisbee',
  slot: 'park',
  window: [4.2, 8.6],
  dur: 0.7,
  cast: { thrower: {}, dog: { kind: 'dog' } },
  outcomes: {
    main: {
      tags: ['animal', 'air'],
      captions: {
        peak: '{dog}, mid-catch.',
        near: '{dog}, almost.',
        after: '{dog}, very proud.',
        idle: '{dog}, waiting patiently.',
      },
    },
    alt: {
      tags: ['animal', 'air', 'oops'],
      captions: {
        peak: '{dog}, missed by a mile.',
        near: '{dog}, almost.',
        after: '{dog}, pretending that was the plan.',
        idle: '{dog}, waiting patiently.',
      },
      throws: { lands: 0.95, kinds: ['hand'], caption: "{target} caught {dog}'s frisbee.", after: "{target}, keeping {dog}'s frisbee." },
    },
  },
  create({ slot, person, dog: makeDog, add, group, cross }) {
    const fz = slot.z;
    const throwerX = slot.x - 1.8;
    const dogX = slot.x + 1.7;
    const kai = person('thrower', throwerX, 0, fz, 'R');
    const dog = makeDog('dog');
    dog.root.scale.set(-0.9, 0.9, 0.9);
    add(dog.root, dogX, 0, fz + 0.1);
    const frisbee = makeFrisbee();
    group.add(frisbee);
    const release = -0.35;
    const catchAt = 0.15;
    const jump = (p) => (p > -0.25 && p < 0.75 ? 1.5 * Math.sin(Math.PI * (p + 0.25)) : 0);
    const dogPose = (p, wall, missed = false) => {
      const inAir = p > -0.25 && p < 0.75;
      const crouch = p > -0.6 && p <= -0.25 ? 0.09 * smooth(seg(p, -0.6, -0.3)) : 0;
      const excited = p > -1.2;
      const landed = p >= 0.75;
      dog.pose({
        jump: jump(p) + (landed && !missed ? Math.abs(Math.sin(wall * 7)) * 0.06 * (1 - seg(p, 0.75, 2.5)) : 0),
        crouch,
        tilt: inAir ? 0.45 * Math.cos(Math.PI * (p + 0.25)) : 0,
        legs: inAir ? 0.55 : 0,
        wag: Math.sin(wall * (excited && !(missed && landed) ? 16 : 4)) * (excited ? 0.5 : 0.25),
        head: inAir ? 0.2 : missed && landed ? -0.5 : 0,
      });
    };
    // Where the dog's mouth is at the moment of the catch — the frisbee flies there.
    dogPose(catchAt, 0);
    dog.root.updateMatrixWorld(true);
    const catchPoint = dog.mouth(vec());
    const throwFrom = vec(throwerX + 0.75, 1.15, fz + 0.12);
    const missPoint = vec(dogX + 1.7, 0.06, fz + 0.35);
    const missFlight = 1.3;
    const end = vec();

    return {
      focus: () => [dog.root],
      thrown: frisbee,
      update(p, { wall, outcome }) {
        const alt = outcome === 'alt';
        const wind = smooth(seg(p, -1.1, -0.45));
        const fling = easeOut(seg(p, -0.45, release + 0.1));
        let armR = lerp(0.3 + Math.sin(wall * 1.5) * 0.05, -0.7, wind);
        if (p > -0.45) armR = lerp(-0.7, 1.7, fling);
        if (p > release + 0.5) armR = lerp(1.7, 0.4, smooth(seg(p, release + 0.5, release + 1.0)));
        const cheering = !alt && p > catchAt && p < 2.5;
        const facepalm = alt && p > 0.6 && p < 2.4;
        const clap = Math.abs(Math.sin(wall * 10)) * 0.3;
        kai.pose({
          lean: lerp(0, 0.08, wind) - 0.12 * fling * (1 - seg(p, 0.3, 1)),
          armR: cheering && p > release + 1.0 ? 0.6 + clap : armR,
          armL: cheering ? 0.6 + clap : facepalm ? 2.75 : 0.15,
          mouth: cheering ? 0.9 : facepalm ? 0.7 : 0.35,
        });
        dogPose(p, wall, alt);

        kai.root.updateMatrixWorld(true);
        dog.root.updateMatrixWorld(true);
        if (p < release) {
          kai.hand('R', frisbee.position);
          frisbee.position.z += 0.06;
          frisbee.rotation.z = 0;
        } else if (alt) {
          const u = seg(p, release, release + missFlight);
          if (cross?.active) cross.point(end);
          else end.copy(missPoint);
          frisbee.position.lerpVectors(throwFrom, end, u);
          frisbee.position.y += Math.sin(Math.PI * u) * 1.9;
          frisbee.rotation.z = u < 1 ? -0.2 : 0;
          if (u >= 1 && cross?.active) {
            cross.land();
            frisbee.position.z += 0.06;
          }
        } else if (p < catchAt) {
          const u = seg(p, release, catchAt);
          frisbee.position.lerpVectors(throwFrom, catchPoint, u);
          frisbee.position.y += Math.sin(Math.PI * u) * 0.5;
          frisbee.rotation.z = -0.2;
        } else {
          dog.mouth(frisbee.position);
          frisbee.position.z += 0.05;
          frisbee.rotation.z = -dog.body.rotation.z;
        }
      },
    };
  },
});
