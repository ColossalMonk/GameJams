import { defineStory } from '../Story.js';
import { seg, smooth, lerp, vec } from '../anim.js';

const STEPS = 4;

/** Between two pairs of open arms, a toddler finally lets go and walks. Or sits. */
export default defineStory({
  id: 'toddler',
  slot: 'pavement',
  window: [3.0, 12.5],
  dur: 0.9,
  cast: { baby: { kid: true, look: { height: 0.5 } }, a: {}, b: {} },
  outcomes: {
    main: {
      tags: ['joy', 'love', 'finally'],
      captions: {
        peak: "{baby}'s first steps, into {b}'s arms.",
        near: '{baby}, letting go of {a}.',
        after: '{a} and {b}, still cheering for {baby}.',
        idle: '{a} and {b}, coaxing {baby} to walk.',
      },
      sounds: [[-0.9, 'gasp'], [0.35, 'cheer'], [0.7, 'aww']],
    },
    sits: {
      tags: ['oops', 'joy'],
      captions: {
        peak: '{baby} sits down. Hard. Then claps.',
        near: '{baby}, letting go of {a}.',
        after: '{baby}, very pleased anyway.',
        idle: '{a} and {b}, coaxing {baby} to walk.',
      },
      sounds: [[-0.9, 'gasp'], [0.1, 'thud'], [0.4, 'laugh']],
    },
  },
  create({ slot, person, particles, outcome }) {
    const a = person('a', slot.x - 1.05, 0, slot.z, 'L');
    const b = person('b', slot.x + 1.0, 0, slot.z, 'R');
    const baby = person('baby', slot.x - 0.6, 0, slot.z + 0.12, 'L');
    // The grown-ups kneel: lowered so their knees are hidden by the pavement.
    for (const who of [a, b]) who.root.position.y = -0.45 * who.options.height;
    const kneel = -0.45 * b.options.height;

    const sits = outcome === 'sits';
    const dur = 0.9;
    const x0 = slot.x - 0.6;
    const x1 = sits ? slot.x - 0.1 : slot.x + 0.45;
    const start = -0.9;
    const arrive = sits ? 0 : 0.3;
    const hL = vec();
    const hR = vec();
    const held = vec();
    let hearts = false;
    let plonk = false;

    return {
      focus: () => [a.root, b.root, baby.root],
      update(p, { wall }) {
        // The toddler: held, let go, a wobble, a few steps (each its own little lurch).
        const u = seg(p, start, arrive);
        const n = u * STEPS;
        const stepping = p > start && p < arrive;
        const lurch = Math.floor(n) + smooth(n - Math.floor(n));
        const foot = stepping ? (Math.floor(n) % 2 ? 1 : -1) * Math.sin(Math.PI * (n - Math.floor(n))) : 0;
        const wobble = p > -1.6 && p < arrive + 0.2 ? Math.sin(wall * 5.3) * 0.1 + Math.sin(wall * 8.1) * 0.05 : 0;
        baby.root.position.set(lerp(x0, x1, Math.min(1, lurch / STEPS)), Math.abs(foot) * 0.03, slot.z + 0.12);
        baby.root.rotation.z = wobble + foot * 0.12;

        const scoop = !sits ? smooth(seg(p, arrive, arrive + 0.25)) : 0;
        const sat = sits ? smooth(seg(p, 0, 0.12)) : 0;
        if (p < -1.6) {
          baby.pose({ armL: 1.2, armR: 1.2, bob: Math.abs(Math.sin(wall * 4)) * 0.04, mouth: 0.4 });
        } else if (p < arrive) {
          baby.pose({ armL: 1.5 + wobble * 2, armR: 1.5 - wobble * 2, legL: foot > 0 ? foot * 0.4 : 0, legR: foot < 0 ? -foot * 0.4 : 0, lean: -foot * 0.08, eyes: 1.25, brows: -0.5, mouth: 0.2 });
        } else if (sits) {
          const clap = p > 0.35 ? Math.abs(Math.sin(wall * 12)) : 0;
          baby.root.position.y = lerp(0, -0.72 * baby.options.height + 0.06, sat);
          baby.root.rotation.z = (1 - sat) * wobble;
          baby.pose({ legL: 1.25 * sat, legR: 1.25 * sat, armL: p > 0.35 ? -0.3 + 0.7 * clap : 1.8, armR: p > 0.35 ? -0.3 + 0.7 * clap : 1.8, eyes: p < 0.35 ? 1.35 : 0.2, mouth: p < 0.35 ? 0.6 : 1 });
        } else {
          baby.pose({ armL: lerp(1.5, 2.7, scoop), armR: lerp(1.5, 2.7, scoop), legL: 0.15 * scoop, legR: 0.15 * scoop, eyes: scoop > 0.5 ? 0.2 : 1, mouth: lerp(0.4, 1, scoop) });
          baby.root.rotation.z *= 1 - scoop;
        }

        // {a}: holds on, lets go, then cheers. {b}: open arms, then up with the little one.
        const letGo = smooth(seg(p, -1.6, -1.2));
        const cheer = p > arrive + 0.1 && p < dur + 1.6;
        a.pose({
          armR: cheer ? 2.7 : lerp(0.75, 1.2, letGo),
          armL: cheer ? 2.6 : lerp(0.4, 1.2, letGo),
          lean: -0.05 * letGo,
          legL: 0.25,
          legR: 0.25,
          eyes: p > start && p < arrive ? 1.25 : 1,
          mouth: cheer ? 1 : p > start ? 0.6 : 0.4,
        });
        b.root.position.y = lerp(kneel, 0, scoop);
        const beckon = p < arrive ? Math.sin(wall * 6) * 0.25 * (1 - seg(p, -0.6, 0)) : 0;
        if (sits && p > 0.2) {
          const clap = p > 0.35 ? Math.abs(Math.sin(wall * 12 + 1)) : 0;
          b.pose({ armL: -0.2 + 0.7 * clap, armR: -0.2 + 0.7 * clap, legL: 0.25, legR: 0.25, lean: 0.04, mouth: 1 });
        } else {
          b.pose({ armL: lerp(1.45, 2.5, scoop) + beckon, armR: lerp(1.3, 2.5, scoop), legL: 0.25 * (1 - scoop), legR: 0.25 * (1 - scoop), lean: 0.06 * (1 - scoop), mouth: lerp(0.5, 1, scoop) });
        }

        if (scoop > 0) {
          // Up into {b}'s hands, held high.
          b.root.updateMatrixWorld(true);
          b.hand('L', hL);
          b.hand('R', hR);
          held.addVectors(hL, hR).multiplyScalar(0.5);
          held.y -= 0.3;
          held.z = slot.z + 0.15;
          baby.root.position.lerp(held, scoop);
          baby.root.position.y += Math.abs(Math.sin(wall * 4)) * 0.04 * scoop;
          if (scoop >= 1 && !hearts) {
            hearts = true;
            baby.root.updateMatrixWorld(true);
            baby.headTop(held);
            for (let i = 0; i < 5; i++) particles.spawn('heart', held, vec((Math.random() - 0.5) * 0.9, 0.5 + Math.random() * 0.4, 0.15), { life: 1.4, scale: 0.6 + Math.random() * 0.3 });
          }
        }
        if (sits && sat >= 1 && !plonk) {
          plonk = true;
          for (let i = 0; i < 4; i++) particles.spawn('puff', vec(baby.root.position.x, 0.08, slot.z + 0.3), vec((Math.random() - 0.5) * 0.9, 0.2, 0.15), { life: 0.6, scale: 0.3 });
        }
      },
    };
  },
});
