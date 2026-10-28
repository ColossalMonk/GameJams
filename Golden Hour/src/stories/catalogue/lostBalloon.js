import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, arc, vec } from '../anim.js';
import { makeToyBalloon } from '../props/a-props.js';

const COLOURS = ['#e2574c', '#f2c14e', '#5f8fb5', '#e84a7a', '#7fae6a', '#9a6fb0'];
const LAMPS = [-4.6, 5.1];
const STRING = 1.0;
const POINTS = 12;

/** A kid points at the sun with the balloon hand. Up it goes — or someone jumps for it. */
export default defineStory({
  id: 'lostBalloon',
  slot: ['pavement', 'lowsky'],
  window: [2.0, 14.0],
  dur: 0.9,
  cast: { kid: { kid: true }, helper: {} },
  outcomes: {
    main: {
      tags: ['air', 'oops'],
      captions: {
        peak: "{kid}'s balloon, going up and up.",
        near: "{kid}'s balloon, slipping away.",
        after: "{kid}'s balloon, over the rooftops.",
        idle: '{kid}, holding a balloon very tightly.',
      },
    },
    catch: {
      tags: ['joy'],
      captions: {
        peak: "{helper} caught {kid}'s balloon!",
        near: "{kid}'s balloon, slipping away.",
        after: '{kid}, holding on with both hands now.',
        idle: '{kid}, holding a balloon very tightly.',
      },
    },
    snag: {
      tags: ['oops'],
      captions: {
        peak: "{kid}'s balloon, stuck on a lamp post.",
        near: "{kid}'s balloon, slipping away.",
        after: "{kid}'s balloon, keeping the lamp company.",
        idle: '{kid}, holding a balloon very tightly.',
      },
    },
  },
  create({ slot, person, group, evening, outcome }) {
    const kx = slot.x;
    const kz = slot.z;
    const snag = outcome === 'snag';
    const catches = outcome === 'catch';
    const lamp = LAMPS.reduce((a, b) => (Math.abs(b - kx) < Math.abs(a - kx) ? b : a));
    const side = snag ? Math.sign(lamp - kx) || 1 : evening.chance(0.5) ? 1 : -1;
    const kid = person('kid', kx, 0, kz, side > 0 ? 'L' : 'R');
    const helper = catches ? person('helper', kx + side * 2.6, 0, kz + 0.15, side > 0 ? 'R' : 'L') : null;
    const grabArm = helper && (side > 0 ? helper.armL : helper.armR);
    const balloon = makeToyBalloon(evening.pick(COLOURS));
    group.add(balloon.group);
    const stringGeo = new THREE.BufferGeometry();
    stringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3));
    const string = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: '#3a3340' }));
    string.frustumCulled = false;
    group.add(string);

    const dur = 0.9;
    // A far lamp needs an earlier gust to get there.
    const rel = snag ? Math.max(-1.6, -0.7 - 0.25 * Math.abs(lamp - kx)) : -0.7;
    const catchAt = 0.15;
    const handBack = dur + 1.0;
    const snagAt = vec(lamp + side * 0.28, 3.92, 0.8);
    const wrap = vec(lamp + side * 0.08, 3.38, 0.78);
    const kidHand = vec();
    const helperHand = vec();
    const knot = vec();
    const held = vec();
    const offset = vec();
    let released = null;
    let caught = null;

    const arms = (b, o) => (side > 0 ? { armR: b, armL: o } : { armL: b, armR: o });
    // Where the balloon floats when someone holds it by the string.
    const heldBy = (hand, wall, target) => target.set(hand.x + side * 0.1 + Math.sin(wall * 1.7) * 0.05, hand.y + STRING + 0.36, hand.z + 0.05);
    const setString = (fn) => {
      const arr = stringGeo.attributes.position.array;
      for (let i = 0; i < POINTS; i++) {
        const q = fn(i / (POINTS - 1));
        arr[i * 3] = q.x;
        arr[i * 3 + 1] = q.y;
        arr[i * 3 + 2] = q.z;
      }
      stringGeo.attributes.position.needsUpdate = true;
    };
    const tmp = vec();

    return {
      focus: () => (catches ? [balloon.group, grabArm] : [balloon.group]),
      x: () => balloon.group.position.x,
      visible: () => balloon.group.position.y < 12.3,
      update(p, { wall }) {
        // ── The kid ──
        let pose;
        if (p < rel - 0.45) {
          pose = { bob: Math.abs(Math.sin(wall * 5)) * 0.04, ...arms(0.55, 0.25), head: Math.sin(wall * 1.3) * 0.06, mouth: 0.5 };
        } else if (p < rel) {
          const u = smooth(seg(p, rel - 0.45, rel - 0.1));
          pose = { ...arms(lerp(0.55, 2.3, u), 0.25), mouth: 0.5 + 0.4 * u };
        } else if (p < 0) {
          const u = smooth(seg(p, rel, rel + 0.35));
          pose = { bob: 0.05 * u, ...arms(lerp(2.3, 2.9, u), lerp(0.25, 2.8, u)), mouth: 1 };
        } else if (outcome === 'main') {
          const reach = p < dur + 0.4;
          const bye = p > dur + 1.6;
          pose = reach
            ? { bob: arc((p * 2.2) % 1, 0.12), ...arms(2.9, 2.8), mouth: 1 }
            : { ...arms(0.25, bye ? 2.4 + Math.sin(wall * 8) * 0.3 : 0.2), head: 0.08 * side, mouth: 0.15 };
        } else if (catches) {
          pose = p < handBack
            ? { bob: Math.abs(Math.sin(wall * 9)) * 0.06, ...arms(2.7, 2.7), mouth: 1 }
            : { bob: Math.abs(Math.sin(wall * 5)) * 0.05, ...arms(0.6, 0.6), mouth: 0.8 };
        } else {
          pose = p < dur + 0.4
            ? { ...arms(2.75, 2.75), bob: Math.abs(Math.sin(wall * 10)) * 0.05, mouth: 1 }
            : { ...arms(2.4, 0.2), head: 0.1 * side, mouth: 0.25 };
        }
        kid.pose(pose);
        kid.root.updateMatrixWorld(true);
        kid.hand(side > 0 ? 'R' : 'L', kidHand);

        // ── The passer-by (catch only) ──
        if (helper) {
          const walk = seg(p, -2.2, -0.7);
          helper.root.position.x = kx + side * lerp(2.6, 0.85, smooth(walk));
          const moving = walk > 0 && walk < 1 ? 1 : 0;
          const stride = Math.sin(wall * 10) * 0.45 * moving;
          const jump = arc(seg(p, -0.25, 0.55), 0.6) - 0.12 * smooth(seg(p, -0.5, -0.3)) * (1 - seg(p, -0.3, -0.2));
          const up = smooth(seg(p, -0.35, -0.1));
          const offer = smooth(seg(p, handBack - 0.5, handBack - 0.2)) * (1 - smooth(seg(p, handBack + 0.2, handBack + 0.6)));
          const grab = lerp(lerp(0.2, 2.95, up), 1.2, offer) * (p > handBack + 0.2 ? 1 - smooth(seg(p, handBack + 0.2, handBack + 0.6)) * 0.85 : 1);
          const free = 0.25 + 0.6 * smooth(seg(p, -0.3, 0)) * (1 - smooth(seg(p, 0.6, 1.0)));
          helper.pose({
            bob: jump + Math.abs(stride) * 0.04,
            legL: stride + 0.3 * up * (p < 0.55 ? 1 : 0),
            legR: stride + 0.3 * up * (p < 0.55 ? 1 : 0),
            ...(side > 0 ? { armL: grab, armR: free } : { armR: grab, armL: free }),
            head: p > -1 && p < 0.6 ? 0.12 * side : 0,
            mouth: p > -0.4 && p < handBack + 1 ? 0.8 : 0.35,
          });
          helper.root.updateMatrixWorld(true);
          helper.hand(side > 0 ? 'L' : 'R', helperHand);
        }

        // ── The balloon ──
        const bp = balloon.group.position;
        if (p < rel) {
          released = null;
          heldBy(kidHand, wall, bp);
        } else {
          if (!released) released = bp.clone();
          const t = p - rel;
          if (snag) {
            const u = easeOut(seg(p, rel, 0));
            bp.lerpVectors(released, snagAt, u);
            bp.y += arc(u, 0.35) + (p > 0 ? 0.14 * Math.sin(p * 9) * Math.exp(-p * 2.5) + Math.sin(wall * 2) * 0.03 : 0);
            bp.x += p > 0 ? Math.sin(wall * 1.6) * 0.04 : 0;
          } else {
            bp.set(
              released.x + side * 0.3 * t + Math.sin(wall * 1.3) * 0.06 * Math.min(1, t),
              released.y + 1.05 * t + 0.06 * t * t,
              released.z + Math.min(0.7, 0.2 * t),
            );
            if (catches && p >= catchAt) {
              if (!caught) caught = bp.clone().sub(helperHand);
              const home = smooth(seg(p, catchAt, catchAt + 0.5));
              offset.copy(caught).lerp(tmp.set(-side * 0.05, STRING + 0.36, 0.05), home);
              bp.copy(helperHand).add(offset);
              if (p > handBack) bp.lerp(heldBy(kidHand, wall, held), smooth(seg(p, handBack, handBack + 0.4)));
            } else caught = null;
          }
        }
        balloon.group.rotation.z = Math.sin(wall * 1.4) * 0.08;
        balloon.group.updateMatrixWorld(true);
        balloon.group.localToWorld(knot.copy(balloon.knot));

        // ── The string ──
        const holder = p < rel ? kidHand : catches && caught ? (p > handBack + 0.2 ? kidHand : helperHand) : null;
        if (holder) {
          setString((k) => tmp.lerpVectors(holder, knot, k).add(held.set(Math.sin(Math.PI * k) * 0.05 * side, 0, 0)));
        } else if (snag && p >= 0) {
          setString((k) => (k < 0.5
            ? tmp.lerpVectors(knot, wrap, k * 2)
            : tmp.lerpVectors(wrap, held.set(wrap.x - side * 0.06 + Math.sin(wall * 2) * 0.04, wrap.y - 0.42, wrap.z), (k - 0.5) * 2)));
        } else {
          setString((k) => tmp.set(knot.x + Math.sin(wall * 2.3 + k * 2.5) * 0.09 * k, knot.y - STRING * k, knot.z));
        }
      },
    };
  },
});
