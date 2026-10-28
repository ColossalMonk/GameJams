import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, arc, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, ellipse } from '../../world/shapes.js';
import { makeWheel, makeSign } from '../props/c-props.js';
import { sunCentre } from '../../world/Sky.js';

const PAINTS = [
  { paint: '#e2574c', trim: '#fbf1dc' },
  { paint: '#f2c14e', trim: '#3f6f8f' },
  { paint: '#5f8fb5', trim: '#fbf1dc' },
];
const GLASS = '#d6e8f2';
const WINDOWS = [-0.75, -0.1, 0.55, 1.2];

/** A paper head seen through a bus window. */
function head(parent, look, x, y) {
  const g = new THREE.Group();
  place(g, card(circle(0, 0, 0.13), look.skin, { depth: 0.01 }), 0, 0, 0);
  place(g, card(ellipse(0, 0.07, 0.14, 0.08), look.hair, { depth: 0.01 }), 0, 0, 0.012);
  return place(parent, g, x, y, 0.052);
}

/** A town bus facing −x, door at the front. Heads show in the windows until people get off. */
function makeBus({ paint, trim }, looks, driverLook) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  place(body, card(roundRect(-1.8, 0.28, 3.6, 1.72, 0.22), paint), 0, 0, 0);
  for (const x of WINDOWS) place(body, card(roundRect(x - 0.25, 1.12, 0.5, 0.54, 0.06), GLASS, { depth: 0.01 }), 0, 0, 0.04);
  place(body, card(roundRect(-1.76, 1.0, 0.3, 0.7, 0.06), GLASS, { depth: 0.01 }), 0, 0, 0.04);
  place(body, card(rect(-1.38, 0.32, 0.5, 1.38), '#4a4450', { depth: 0.01 }), 0, 0, 0.04);
  place(body, card(rect(-0.85, 0.62, 2.65, 0.1), trim, { depth: 0.01 }), 0, 0, 0.04);
  const doorL = place(body, card(rect(0, 0, 0.25, 1.36), GLASS, { depth: 0.01 }), -1.38, 0.33, 0.06);
  const doorR = place(body, card(rect(-0.25, 0, 0.25, 1.36), GLASS, { depth: 0.01 }), -0.88, 0.33, 0.06);
  place(body, makeSign('SUNSET', 0.8, 0.2, { bg: '#2f2a30', ink: '#ffd27a', depth: 0.02 }), -0.35, 1.83, 0.04);
  const heads = looks.map((look, i) => head(body, look, WINDOWS[i + 1], 1.32));
  const driver = head(body, driverLook, -1.6, 1.3);
  const wheels = [-1.05, 1.1].map((x) => place(group, makeWheel(0.27), x, 0.27, 0.08));
  return { group, body, doorL, doorR, heads, driver, wheels };
}

/** The last bus stops and everyone gets off to watch the sun. Sometimes the driver too. */
export default defineStory({
  id: 'bus',
  slot: 'road',
  window: [5.5, 13.5],
  dur: 0.9,
  tags: ['wheels'],
  cast: { driver: {}, a: {}, b: { kid: true }, c: { old: true } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: '{a}, {b} and {c}, off to see the sun.',
        near: '{a} and {b}, first off the bus.',
        after: '{a}, {b} and {c} let the bus go.',
        idle: "{driver}'s bus, the last one tonight.",
      },
    },
    alt: {
      tags: ['joy', 'oops'],
      captions: {
        peak: "{driver}'s bus, leaving without {driver}.",
        near: '{driver}, getting off too.',
        after: '{driver}, off duty at last.',
        idle: "{driver}'s bus, the last one tonight.",
      },
    },
  },
  create({ slot, person, group, evening, particles, names, peak, outcome }) {
    // Stops left of the café, so the bus never hides the table behind it.
    const stop = slot.x - 5.6 + evening.range(-0.2, 0.2);
    const vz = slot.z;
    const roles = ['a', 'b', 'c'];
    const bus = makeBus(evening.pick(PAINTS), roles.map((r) => names[r].look), names.driver.look);
    bus.group.position.set(17.5, 0, vz);
    group.add(bus.group);
    // The bus-stop sign on the kerb.
    const pole = new THREE.Group();
    place(pole, card(rect(-0.04, 0, 0.08, 2.1), '#3d3a40'), 0, 0, 0);
    place(pole, card(circle(0, 0, 0.2), '#e2574c'), 0, 2.1, 0.02);
    place(pole, card(circle(0, 0, 0.12), '#fbf1dc', { depth: 0.01 }), 0, 2.1, 0.06);
    place(group, pole, stop - 2.8, 0, vz + 0.95);

    // Everyone points at where the sun will be at the peak.
    const sunX = sunCentre(peak).x;
    const door = vec(stop - 1.13, 0.22, vz + 0.12);
    const alt = outcome === 'alt';
    const riders = [
      { role: 'a', to: vec(stop - 2.1, 0, vz + 0.75), at: -1.5 },
      { role: 'b', to: vec(stop - 1.3, 0, vz + 0.85), at: -1.08 },
      { role: 'c', to: vec(stop - 0.5, 0, vz + 0.75), at: -0.66 },
      ...(alt ? [{ role: 'driver', to: vec(stop + 0.35, 0, vz + 0.8), at: -0.55 }] : []),
    ];
    for (const r of riders) {
      r.side = sunX >= r.to.x ? 'R' : 'L';
      r.puppet = person(r.role, door.x, door.y, door.z, r.side);
      r.puppet.root.visible = false;
      r.window = r.role === 'driver' ? bus.driver : bus.heads[roles.indexOf(r.role)];
    }
    const people = riders.map((r) => r.puppet.root);

    const dur = 0.9;
    const leave = dur + 1.3;
    let nextSmoke = 0;
    const busX = (p) => {
      let x = lerp(17.5, stop, easeOut(seg(p, -5.0, -2.4)));
      if (alt) x -= 1.4 * smooth(seg(p, 0.05, 1.8));
      else x = lerp(x, -17, easeIn(seg(p, leave, leave + 3.0)));
      return x;
    };

    return {
      focus: () => (alt ? [bus.group, ...people] : people.slice(0, 3)),
      visible: (p) => p > -4.0,
      x: () => (Math.abs(bus.group.position.x) < 12 ? bus.group.position.x : stop - 1.2),
      update(p, { wall }) {
        const x = busX(p);
        const moving = Math.abs(busX(p + 0.05) - x) > 0.004;
        bus.group.position.x = x;
        bus.body.position.y = moving ? 0.02 * Math.abs(Math.sin(wall * 15)) : 0;
        bus.body.rotation.z = 0.04 * Math.sin(Math.PI * seg(p, -2.8, -2.1));
        for (const w of bus.wheels) w.rotation.z = -x / 0.27;
        const open = smooth(seg(p, -2.2, -1.8)) * (alt ? 1 : 1 - smooth(seg(p, dur + 0.8, dur + 1.1)));
        bus.doorL.scale.x = bus.doorR.scale.x = 1 - 0.8 * open;
        if (moving && wall > nextSmoke && x > -14 && x < 14) {
          nextSmoke = wall + 0.3;
          particles.spawn('smoke', vec(x + 1.85, 0.35, vz + 0.1), vec(0.4, 0.15, 0), { life: 1.0 });
        }

        for (const r of riders) {
          const pup = r.puppet;
          const out = p >= r.at;
          pup.root.visible = out;
          r.window.visible = !out;
          const u = seg(p, r.at, r.at + 0.55);
          pup.root.position.lerpVectors(door, r.to, smooth(u));
          pup.root.position.y = lerp(door.y, 0, seg(u, 0, 0.4)) + arc(seg(u, 0, 0.4), 0.06);
          const point = r.side === 'R' ? { armR: 2.4, armL: 0.35 } : { armL: 2.4, armR: 0.35 };
          const tilt = r.side === 'R' ? -0.12 : 0.12;
          if (u < 1) {
            const stride = Math.sin(wall * 14);
            pup.pose({ legL: stride * 0.4, legR: stride * 0.4, armL: 0.3 - stride * 0.3, armR: 0.3 + stride * 0.3, bob: Math.abs(stride) * 0.03 });
          } else if (p < 0) {
            pup.pose({ armL: 0.3, armR: 0.3, head: Math.sin(wall * 2.5 + r.at * 5) * 0.12, mouth: 0.5 });
          } else if (r.role === 'driver' && p > dur + 0.2 && p < dur + 2.2) {
            pup.pose({ armL: 2.75, armR: 2.75, head: 0.15 + Math.sin(wall * 5) * 0.1, mouth: 0.8 });
          } else if (p < dur + 1.5 || r.role === 'driver') {
            pup.pose({ ...point, head: tilt, bob: p < dur ? Math.abs(Math.sin(wall * 8 + r.at)) * 0.04 : 0, mouth: p < dur + 0.5 ? 0.9 : 0.5 });
          } else {
            pup.pose({ armL: 0.25, armR: 0.25, head: tilt + Math.sin(wall * 0.8 + r.at) * 0.04, mouth: 0.35 });
          }
        }
      },
    };
  },
});
