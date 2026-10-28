import { defineStory } from '../Story.js';
import { seg, smooth, vec } from '../anim.js';
import { makeViaduct, makeTrain } from '../props/a-props.js';
import { sunCentre } from '../../world/Sky.js';

const ENGINES = ['#b5524a', '#3f6f5a', '#3f4a6b'];
const CARS = ['#5f8fb5', '#f2c14e', '#9fd3c7', '#e8a35a', '#c9a4c4', '#f3ead8'];

/** The evening train crosses the viaduct — everyone waving, or it stops to watch the sun. */
export default defineStory({
  id: 'train',
  slot: 'horizon',
  window: [7.5, 14.5],
  dur: 1.0,
  cast: { driver: {} },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: 'Everyone on the train, waving.',
        near: 'The evening train, coming across.',
        after: 'The train, off into the glow.',
        idle: 'The evening train, on the viaduct.',
      },
    },
    stop: {
      tags: ['joy'],
      captions: {
        peak: '{driver} stopped the train for the sun.',
        near: 'The train, slowing down.',
        after: 'The whole train, watching the sun.',
        idle: 'The evening train, on the viaduct.',
      },
    },
  },
  create({ slot, group, evening, outcome, peak, particles }) {
    const deck = 3.8;
    const viaduct = makeViaduct(-18, 18, deck);
    viaduct.position.set(0, 0, slot.z - 0.1);
    group.add(viaduct);
    const cars = [evening.pick(CARS), evening.pick(CARS), evening.pick(CARS)];
    const train = makeTrain(evening, { engine: evening.pick(ENGINES), cars });
    const dir = evening.chance(0.5) ? 1 : -1;
    train.group.scale.x = dir;
    group.add(train.group);

    const dur = 1.0;
    const speed = 2.4;
    const brake = 2.0;
    const leave = dur + 2.4;
    const stops = outcome === 'stop';
    // The sun's position at the peak never changes during a run, so look it up once.
    const sun = sunCentre(peak);
    const chimney = vec();
    let nextPuff = 0;
    let whistled = false;

    // Distance along the track from the sun, in the direction of travel.
    const along = (p) => {
      if (!stops) return speed * (p - dur / 2);
      if (p < -brake) return -speed * brake / 2 + speed * (p + brake);
      if (p < 0) return (-speed * p * p) / (2 * brake);
      if (p < leave) return 0;
      return (speed * (p - leave) ** 2) / (2 * brake);
    };
    const onScreen = () => Math.abs(train.group.position.x) < 17 + train.length / 2;

    return {
      focus: () => [train.group],
      x: () => train.group.position.x,
      visible: () => onScreen(),
      update(p, { wall }) {
        const moving = !stops || p < 0 || p > leave;
        const rattle = moving ? Math.abs(Math.sin(wall * 14)) * 0.012 : 0;
        train.group.position.set(sun.x + dir * along(p), deck + 0.1 + rattle, slot.z + 0.05);
        train.group.visible = onScreen();

        const wave = !stops ? smooth(seg(p, -0.6, -0.3)) * (1 - smooth(seg(p, dur + 1.5, dur + 2.0))) : 0;
        const look = stops ? smooth(seg(p, -0.3, 0.1)) * (1 - smooth(seg(p, leave - 0.3, leave))) : 0;
        for (const ps of train.passengers) {
          ps.arm.visible = wave > 0.01;
          ps.arm.rotation.z = (Math.PI - 0.5 + Math.sin(wall * 12 + ps.phase) * 0.45) * wave;
          ps.head.position.y = 0.4 + 0.09 * look + Math.sin(wall * 9 + ps.phase) * 0.015 * wave;
        }
        train.driver.position.x = train.length / 2 - 1.17 + 0.1 * look;

        if (!train.group.visible) return;
        train.group.updateMatrixWorld(true);
        train.group.localToWorld(chimney.copy(train.chimney));
        if (p >= 0 && !whistled) {
          whistled = true;
          for (let i = 0; i < (stops ? 6 : 3); i++) {
            particles.spawn('puff', chimney, vec(-dir * 0.2 + (Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.5, 0), { life: 1.8, scale: 1.1 + Math.random() * 0.5 });
          }
        } else if (p < 0) whistled = false;
        if (moving && wall > nextPuff) {
          nextPuff = wall + 0.32;
          particles.spawn('puff', chimney, vec(-dir * 0.5, 0.5, 0), { life: 1.4, scale: 0.8 });
        }
      },
    };
  },
});
