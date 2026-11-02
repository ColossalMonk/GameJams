import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, easeIn, lerp, vec } from '../anim.js';
import { makeGuitar } from '../../characters/Props.js';
import { makeOpenWindow, makeNote } from '../props/b-props.js';
import { hideLegs, makeWindowBox, makeRose, makeBucket, makeWaterBlob } from '../props/f-props.js';

const SHUTTERS = ['#2f6f6a', '#b5524a', '#3f6f8f', '#6d5a7a'];
/** How long the rose takes to reach the player's hand. */
const CATCH = 0.8;
/** How long the rose takes when it sails past. */
const WIDE = 1.3;
/** When the bucket's water reaches the player. */
const SPLASH = 0.5;

/** A guitarist on the pavement, singing up at a window. The answer: a rose, or a bucket of water. */
export default defineStory({
  id: 'serenade',
  slot: ['window', 'pavement'],
  window: [5.0, 13.5],
  dur: 0.9,
  cast: { player: { look: { top: '#b0453a' } }, love: {} },
  outcomes: {
    main: {
      tags: ['love', 'finally'],
      captions: {
        peak: "{player} caught {love}'s rose.",
        near: '{player}, hitting the big note.',
        after: '{player}, strumming with a rose.',
        idle: '{player}, serenading a closed window.',
      },
      sounds: [[-0.5, 'strum'], [0, 'whoosh'], [CATCH + 0.05, 'aww']],
    },
    wide: {
      weight: 1,
      tags: ['love', 'air', 'oops'],
      captions: {
        peak: "{love}'s rose, sailing past {player}.",
        near: '{player}, hitting the big note.',
        after: '{player}, watching the rose go.',
        idle: '{player}, serenading a closed window.',
      },
      throws: { lands: WIDE, kinds: ['hand', 'mouth'], caption: "{target} caught {love}'s rose.", after: '{target}, holding a rose.' },
      sounds: [[-0.5, 'strum'], [0, 'whoosh'], [WIDE, 'gasp']],
    },
    bucket: {
      tags: ['oops', 'falling'],
      captions: {
        peak: "{love}'s reply: a bucket of water.",
        near: '{player}, hitting the big note.',
        after: '{player}, soaked, still strumming.',
        idle: '{player}, serenading a closed window.',
      },
      sounds: [[-0.5, 'strum'], [SPLASH, 'splash'], [SPLASH + 0.4, 'laugh']],
    },
  },
  create({ slots, person, group, evening, outcome, particles, cross }) {
    const [win, pav] = slots;
    const bucketing = outcome === 'bucket';

    // Upstairs: the window, a flower box, and whoever is about to answer.
    const w = makeOpenWindow({ shutter: evening.pick(SHUTTERS), slats: 2 });
    w.group.position.set(win.x, win.y, win.z);
    group.add(w.group);
    w.group.add(makeWindowBox(['#f6a5b8', '#fbf1dc', '#f6a5b8']));
    const height = 0.88;
    const love = person('love', win.x, win.y - 0.32 - 0.72 * height, win.z - 0.25, 'L', { height });
    hideLegs(love);

    // Downstairs: the player, edging along the pavement towards the window.
    const px = pav.x + THREE.MathUtils.clamp(win.x - pav.x, -0.9, 0.9);
    const player = person('player', px, 0, pav.z, 'L');
    const guitar = makeGuitar();
    guitar.position.set(0.1, 0.18, 0.08);
    guitar.rotation.z = 0.95;
    player.hips.add(guitar);
    const look = Math.sign(win.x - px) * 0.12;

    const rose = makeRose();
    rose.scale.setScalar(1.5);
    group.add(rose);
    rose.visible = !bucketing;
    // The bucket hangs from one hand by its handle, and tips from there.
    const bucket = makeBucket();
    const hook = new THREE.Group();
    hook.visible = bucketing;
    group.add(hook);
    bucket.group.position.y = -0.44;
    hook.add(bucket.group);
    bucket.group.scale.setScalar(1.3);
    const water = makeWaterBlob(0.6);
    water.visible = false;
    group.add(water);
    const drop = makeWaterBlob(0.25);
    drop.visible = false;
    group.add(drop);
    const note = makeNote('#b0453a');
    group.add(note);

    const dur = 0.9;
    const hand = vec();
    const handL = vec();
    const from = vec();
    const end = vec();
    const head = vec();
    const landing = vec(px + Math.sign(px - win.x || 1) * 1.3, 0.04, pav.z + 0.5);
    let released = null;
    let caught = false;
    let splashed = false;

    return {
      focus: () => [love.root, w.group, player.root],
      thrown: rose,
      update(p, { wall, outcome: o }) {
        // Shutters open, then the face at the window.
        w.shutters(p < -1.6 ? Math.abs(Math.sin(wall * 2)) * 0.03 : easeOut(seg(p, -1.6, -1.1)));
        const out = smooth(seg(p, -1.1, -0.7));
        love.root.position.z = win.z + lerp(-0.25, 0.14, out);
        love.root.visible = p > -1.2;

        // The player: strumming, faster as the big note comes.
        const build = smooth(seg(p, -1.6, 0));
        const strum = Math.sin(wall * (8 + 10 * build)) * 0.2 * (1 + build);
        const soaked = o === 'bucket' && p >= SPLASH;
        const reach = o === 'main' ? smooth(seg(p, 0.2, CATCH - 0.1)) * (1 - smooth(seg(p, dur + 1.6, dur + 2.2))) : 0;
        const miss = o === 'wide' && p > 0.4 && p < WIDE + 1.5 ? smooth(seg(p, 0.4, 0.8)) : 0;
        if (soaked) {
          const shock = 1 - smooth(seg(p, SPLASH + 1.2, SPLASH + 1.8));
          player.pose({
            armL: lerp(0.75, 1.5, shock),
            armR: lerp(-0.25 + Math.sin(wall * 6) * 0.12, 1.5, shock),
            lean: Math.sin(wall * 30) * 0.03 * shock,
            eyes: lerp(1, 0.15, shock),
            mouth: lerp(0.3, 0.6, shock),
            brows: lerp(-0.6, 0.4, shock),
            head: look,
          });
        } else {
          player.pose({
            armL: o === 'main' && p >= 0 ? lerp(0.75, 2.55, reach) : miss ? lerp(0.75, 2.2, miss) : 0.75,
            armR: -0.25 + strum * (p < dur + 0.4 ? 1 : 0.5),
            lean: -0.08 * build + (miss ? -0.15 * miss * Math.sign(win.x - px || 1) : 0),
            head: look + Math.sin(wall * 6) * 0.05,
            mouth: p < 0 ? 0.35 + 0.6 * build : caught || miss ? 0.9 : 0.6,
            eyes: p > -0.6 && p < 0 ? 0.3 : 1,
          });
        }

        // The answer at the window: a rose, or a bucket.
        const wind = smooth(seg(p, -0.3, 0));
        const tip = easeIn(seg(p, -0.15, 0.1));
        if (bucketing) {
          const lean = smooth(seg(p, -0.6, -0.2));
          love.pose({ armL: p > SPLASH ? 2.6 : 0.3, armR: lerp(0.3, 1.9, lean), mouth: p > SPLASH ? 0.9 : 0.3, eyes: p > SPLASH ? 1 : 0.6, brows: p > SPLASH ? 0.8 : -0.4 });
          love.hips.rotation.x = 0.2 * lean;
        } else {
          const swoon = p < 0 ? smooth(seg(p, -0.8, -0.4)) : 0;
          love.pose({
            armL: p < -0.3 ? lerp(0.3, -0.5, swoon) : 0.3,
            armR: p < -0.3 ? lerp(0.3, -0.5, swoon) : lerp(-0.5, 2.6, wind),
            head: -0.12 * swoon,
            mouth: p >= 0 ? 0.9 : 0.3,
            eyes: swoon > 0.5 && p < -0.3 ? 0.2 : 1,
          });
          love.hips.rotation.x = 0.2 * (p >= -0.3 && p < dur + 0.8 ? 1 : 0);
        }
        love.root.updateMatrixWorld(true);
        love.hand('R', hand);

        if (bucketing) {
          hook.position.copy(hand);
          hook.position.z += 0.3;
          hook.rotation.z = 2.4 * tip + Math.sin(wall * 5) * 0.05 * (1 - tip);
          hook.visible = p > -1.0;
          // The water: one wobbling lump, all the way down to the player's head.
          player.root.updateMatrixWorld(true);
          player.headTop(head);
          water.visible = p >= 0 && p < SPLASH;
          if (water.visible) {
            if (!released) {
              hook.updateMatrixWorld(true);
              released = bucket.group.localToWorld(bucket.mouth.clone());
            }
            const u = easeIn(seg(p, 0, SPLASH));
            water.position.lerpVectors(released, head, u);
            water.position.y += 0.15 * (1 - u);
            water.scale.set(1 - 0.2 * u, 1 + 1.2 * u, 1);
            water.rotation.z = Math.sin(wall * 9) * 0.1;
            // A smaller splash of it, just behind.
            const v = easeIn(seg(p, 0.08, SPLASH + 0.08));
            drop.position.lerpVectors(released, head, v);
            drop.position.y += 0.4 * (1 - v);
          }
          drop.visible = p >= 0.08 && p < SPLASH + 0.08;
          if (p >= SPLASH && !splashed) {
            splashed = true;
            for (let i = 0; i < 8; i++) {
              const a = Math.PI * (0.1 + 0.8 * (i / 7));
              particles.spawn('puff', head, vec(Math.cos(a) * 1.8, Math.sin(a) * 1.4, 0.3), { life: 0.9, scale: 0.4, color: '#bfe3f2' });
            }
          }
          note.visible = false;
          return;
        }

        // The rose: in hand, then thrown.
        player.root.updateMatrixWorld(true);
        player.hand('L', handL);
        if (p < 0) {
          rose.position.copy(hand);
          rose.position.z += 0.06;
          rose.rotation.z = 0.4;
          rose.visible = p > -1.0;
        } else if (o === 'main') {
          released ??= hand.clone();
          const u = seg(p, 0, CATCH);
          if (u < 1) {
            rose.position.lerpVectors(released, handL, easeOut(u));
            rose.position.y += Math.sin(Math.PI * u) * 0.6;
            rose.rotation.z = 0.4 + u * Math.PI * 4;
          } else {
            rose.position.copy(handL);
            rose.position.y += 0.12;
            rose.position.z += 0.06;
            rose.rotation.z = 0.2;
            if (!caught) {
              caught = true;
              particles.spawn('heart', vec(handL.x, handL.y + 0.4, handL.z + 0.1), vec(0, 0.5, 0), { life: 1.6, scale: 1.3 });
            }
          }
        } else {
          released ??= hand.clone();
          const u = seg(p, 0, WIDE);
          if (cross?.active) cross.point(end);
          else end.copy(landing);
          rose.position.lerpVectors(released, end, u);
          rose.position.y += Math.sin(Math.PI * u) * (1.6 + 0.08 * released.distanceTo(end));
          rose.rotation.z = u < 1 ? 0.4 + u * Math.PI * 5 : cross?.active ? 0.3 : 1.5;
          if (u >= 1 && cross?.active) cross.land();
        }

        // One paper note floating up from the guitar on the big note.
        const nt = p + 0.6;
        note.visible = nt >= 0 && nt < 1.4;
        if (note.visible) {
          note.position.set(px + 0.3 + 0.3 * nt, 1.4 + 0.9 * nt, pav.z + 0.2);
          note.rotation.z = Math.sin(nt * 5) * 0.3;
          note.scale.setScalar(Math.min(1, nt * 6) * (1 - smooth(seg(nt, 1.0, 1.4))) * 1.3);
        }
      },
    };
  },
});
