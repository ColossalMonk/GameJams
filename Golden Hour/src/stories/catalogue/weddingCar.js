import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, vec } from '../anim.js';
import { makeWeddingCar, makeTinCan } from '../props/g-props.js';

const PAINTS = [
  { paint: '#fbf6ee', trim: '#b03050' },
  { paint: '#bfe3dc', trim: '#e2574c' },
  { paint: '#f6c6d0', trim: '#5f8fb5' },
];
const CANS = 4;

/** The just-married car rolls through town, honking, cans rattling behind. Usually behind. */
export default defineStory({
  id: 'weddingCar',
  slot: 'road',
  window: [5.0, 13.5],
  dur: 0.9,
  tags: ['wheels'],
  cast: { a: { dress: true, look: { top: '#fbf6ee', veil: true, hairStyle: 'long' } }, b: { look: { top: '#3a3550', bottom: '#3a3550' } } },
  outcomes: {
    main: {
      tags: ['love', 'joy'],
      captions: {
        peak: '{a} and {b}, waving: just married!',
        near: '{a} and {b}, honking all the way.',
        after: '{a} and {b}, off into the sunset.',
        idle: "{a} and {b}'s wedding car.",
      },
      sounds: [[-1.5, 'honk'], [-0.9, 'honk'], [0.05, 'cheer']],
    },
    cans: {
      tags: ['love', 'oops', 'falling'],
      captions: {
        peak: "{a} and {b}'s tin cans, set free.",
        near: '{a} and {b}, honking all the way.',
        after: '{a} and {b}, driving off without the cans.',
        idle: "{a} and {b}'s wedding car.",
      },
      sounds: [[-1.5, 'honk'], [0.05, 'crash'], [0.5, 'laugh']],
    },
  },
  create({ slot, person, group, evening, particles, outcome }) {
    // Stops left of the café, so the car never hides the table behind it.
    const stop = slot.x - 5.4 + evening.range(-0.25, 0.25);
    const vz = slot.z;
    const car = makeWeddingCar(evening.pick(PAINTS));
    car.group.position.set(-15.5, 0, vz);
    group.add(car.group);
    const a = person('a', 0, 0, 0, null);
    const b = person('b', 0, 0, 0, null);
    for (const [who, x] of [[a, -0.66], [b, 0.08]]) {
      car.inside.add(who.root);
      who.root.position.set(x, -0.22, 0);
      who.legL.visible = who.legR.visible = false;
    }

    // Tin cans on strings, tied to the boot. Each knows where it rattles and where it will roll.
    const cans = [];
    for (let i = 0; i < CANS; i++) {
      const can = makeTinCan();
      group.add(can);
      can.userData = {
        dx: -0.45 - i * 0.26,
        dz: [0.08, 0.3, 0.0, 0.2][i],
        roll: vec(evening.range(-1.1, 0.3), 0, evening.range(0.4, 1.1)),
        hop: evening.range(0.45, 0.75),
        spin: evening.range(-9, 9),
        from: null,
      };
      cans.push(can);
    }
    const stringGeo = new THREE.BufferGeometry();
    stringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CANS * 6), 3));
    const strings = new THREE.LineSegments(stringGeo, new THREE.LineBasicMaterial({ color: '#3a3340' }));
    strings.frustumCulled = false;
    group.add(strings);

    const dur = 0.9;
    const leave = dur + 1.0;
    const loose = outcome === 'cans';
    const tail = vec();
    const head = vec();
    const knot = vec();
    let hearts = false;
    let clatter = false;
    let lastP = -99;
    let nextSmoke = 0;

    const carX = (p) => {
      let x = lerp(-15.5, stop, easeOut(seg(p, -4.2, -1.2)));
      // With the cans coming loose the car is already creeping off at the peak.
      if (loose) x += 0.9 * smooth(seg(p, -0.1, dur));
      return x + (16 - x) * easeIn(seg(p, leave, leave + 3.4));
    };

    return {
      focus: () => (loose ? (lastP < leave + 0.8 ? [car.group, ...cans] : cans) : [car.group]),
      visible: (p) => p > -3.8 && (loose || p < leave + 2.6),
      x: () => (Math.abs(car.group.position.x) < 12 || !loose ? car.group.position.x : cans[0].position.x),
      update(p, { wall }) {
        lastP = p;
        const x = carX(p);
        const moving = Math.abs(carX(p + 0.05) - x) > 0.004;
        car.group.position.x = x;
        car.body.position.y = moving ? 0.02 * Math.abs(Math.sin(wall * 18)) : 0;
        car.body.rotation.z = -0.04 * Math.sin(Math.PI * seg(p, -1.6, -1.0));
        for (const w of car.wheels) w.rotation.z = -x / 0.22;
        if (moving && wall > nextSmoke && x > -14 && x < 14) {
          nextSmoke = wall + 0.35;
          particles.spawn('smoke', vec(x - 1.2, 0.3, vz + 0.25), vec(-0.4, 0.15, 0), { life: 0.9, scale: 0.8 });
        }

        // The couple: driving, then up on their feet to wave (or to watch the cans go).
        const up = smooth(seg(p, -0.35, 0.05)) * (1 - smooth(seg(p, leave - 0.4, leave)));
        a.root.position.y = b.root.position.y = lerp(-0.22, 0.02, up);
        const wave = Math.sin(wall * 10);
        if (p < 0) {
          a.pose({ armL: 0.4 + (p > -2.5 ? 1.8 * smooth(seg(p, -2.5, -2.1)) + wave * 0.3 : 0), armR: 0.3, head: 0.1, mouth: 0.8 });
          b.pose({ armL: 1.0, armR: 1.0 + (p > -1.6 && p < -0.8 ? 0.25 * Math.sin(wall * 20) : 0), mouth: 0.5 });
        } else if (p < leave) {
          if (loose) {
            const shock = p < dur + 0.3;
            a.pose({ armL: shock ? 2.7 : 1.4, armR: shock ? 2.5 : 0.4, head: 0.25, eyes: shock ? 1.35 : 1, mouth: shock ? 0.6 : 0.9 });
            b.pose({ armL: 0.4, armR: shock ? 2.9 : 1.0, head: 0.3, lean: 0.1, eyes: 1.3, mouth: shock ? 0.6 : 1 });
          } else {
            a.pose({ armL: 2.6 + wave * 0.3, armR: 2.5 - wave * 0.3, lean: -0.08, bob: Math.abs(wave) * 0.03, mouth: 1 });
            b.pose({ armL: 2.5 - wave * 0.3, armR: 2.6 + wave * 0.3, lean: 0.08, bob: Math.abs(wave) * 0.03, mouth: 1 });
          }
        } else {
          a.pose({ armL: 2.5 + wave * 0.3, armR: 0.3, head: 0.1, mouth: 0.8 });
          b.pose({ armL: 1.0, armR: 1.0, mouth: 0.5 });
        }
        car.group.updateMatrixWorld(true);
        if (!loose && p >= 0.05 && !hearts) {
          hearts = true;
          for (const who of [a, b]) {
            who.headTop(head);
            for (let i = 0; i < 3; i++) particles.spawn('heart', head, vec((Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.4, 0.1), { life: 1.3, scale: 0.6 + Math.random() * 0.3 });
          }
        }

        // The cans: rattling behind on their strings, or set free across the road.
        car.body.localToWorld(tail.copy(car.tail));
        const arr = stringGeo.attributes.position.array;
        cans.forEach((can, i) => {
          const d = can.userData;
          let end = tail;
          if (loose && p >= 0) {
            d.from ??= can.position.clone();
            const q = seg(p, 0, 1.4);
            const e = easeOut(q);
            can.position.set(d.from.x + d.roll.x * e, 0.08 + Math.abs(Math.sin(Math.PI * 2.5 * q)) * d.hop * (1 - q), d.from.z + d.roll.z * e);
            can.rotation.z = d.spin * e;
            // The broken string trails along behind its can.
            end = knot.set(can.position.x - 0.28, can.position.y + 0.03, can.position.z);
          } else {
            const rattle = moving ? Math.abs(Math.sin(wall * 20 + i * 1.7)) * 0.06 : 0;
            can.position.set(tail.x + d.dx, 0.08 + rattle, vz + d.dz);
            can.rotation.z = moving ? Math.sin(wall * 17 + i) * 0.4 : 0;
          }
          arr.set([end.x, end.y, end.z + 0.02, can.position.x + 0.08, can.position.y, can.position.z + 0.02], i * 6);
        });
        stringGeo.attributes.position.needsUpdate = true;
        if (loose && p >= 0.05 && !clatter) {
          clatter = true;
          for (const can of cans) particles.spawn('puff', can.position, vec((Math.random() - 0.5) * 0.6, 0.3, 0.2), { life: 0.6, scale: 0.3 });
        }
      },
    };
  },
});
