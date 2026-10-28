import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { makeBouquet } from '../../characters/Props.js';
import { LAYOUT } from '../../world/Town.js';

/** Newlyweds on the church steps throw the bouquet — to the crowd, or onto the roof. */
export default defineStory({
  id: 'wedding',
  slot: 'church',
  window: [9.2, 13.0],
  dur: 0.7,
  cast: { thrower: { dress: true, look: { top: '#fbf6ee', veil: true, hairStyle: 'long' } }, partner: { look: { top: '#3a3550', bottom: '#3a3550' } } },
  outcomes: {
    main: {
      tags: ['love', 'air'],
      captions: {
        peak: 'The bouquet, airborne.',
        near: '{thrower}, winding up.',
        after: '{thrower} and {partner}, just married.',
        idle: '{thrower} and {partner}, just married.',
      },
      throws: { lands: 1.5, kinds: ['hand', 'mouth'], caption: '{target} caught the bouquet.', after: '{target}, holding the bouquet.' },
    },
    alt: {
      tags: ['love', 'air', 'oops'],
      captions: {
        peak: 'The bouquet, airborne. Very airborne.',
        near: '{thrower}, winding up.',
        after: 'The bouquet, on the church roof.',
        idle: '{thrower} and {partner}, just married.',
      },
    },
  },
  create({ slot, person, group, outcome, cross }) {
    const bride = person('thrower', slot.x - 0.42, 0, slot.z, 'R');
    const groom = person('partner', slot.x + 0.42, 0, slot.z, 'R');
    const bouquet = makeBouquet();
    group.add(bouquet);
    const landing = outcome === 'alt'
      ? vec(LAYOUT.church.x + 0.55, 4.0, LAYOUT.church.z + 0.25)
      : vec(slot.x + 1.4, 0.12, slot.z + 2.8);
    const flight = 1.5;
    const dur = 0.7;
    let start = null;
    const end = vec();

    return {
      focus: () => [bride.root],
      thrown: bouquet,
      update(p, { wall, outcome: o }) {
        const alt = o === 'alt';
        let armL = 0.3;
        if (p > -1.0 && p < -0.3) armL = lerp(0.3, -0.5, smooth(seg(p, -1.0, -0.3)));
        if (p >= -0.3) armL = lerp(-0.5, 2.9, easeOut(seg(p, -0.3, 0)));
        const cheer = p >= 0 && p < dur + 1.0;
        if (p > dur + 1.0) armL = lerp(2.9, 0.3, smooth(seg(p, dur + 1.0, dur + 1.6)));
        const oops = alt && p > flight - 0.2 && p < flight + 2.0;
        const sway = Math.sin(wall * 1.1) * 0.03;
        bride.pose({ lean: sway, armL: oops ? 2.75 : armL, armR: oops ? 2.75 : cheer ? 2.6 : 0.45, mouth: cheer || oops ? 0.9 : 0.4 });
        groom.pose({ lean: sway + (oops ? Math.sin(wall * 14) * 0.05 : 0), armL: cheer && !oops ? 2.4 : 0.45, armR: cheer && !oops ? 2.4 : 0.15, mouth: cheer || oops ? 0.9 : 0.35 });

        bride.root.updateMatrixWorld(true);
        if (p < 0) {
          bride.hand('L', bouquet.position);
          bouquet.position.z += 0.08;
          bouquet.position.y += 0.08;
          bouquet.rotation.z = 0;
        } else if (p < flight) {
          if (!start) {
            start = bride.hand('L', vec());
            start.y += 0.08;
          }
          const q = p / flight;
          if (cross?.active) cross.point(end);
          else end.copy(landing);
          bouquet.position.lerpVectors(start, end, q);
          bouquet.position.y += 4 * q * (1 - q) * (2.0 + 0.1 * start.distanceTo(end));
          bouquet.rotation.z = q * Math.PI * 3;
        } else if (cross?.active) {
          cross.land();
          cross.point(bouquet.position);
          bouquet.position.z += 0.06;
          bouquet.rotation.z = 0.3;
        } else {
          bouquet.position.copy(landing);
          bouquet.rotation.z = alt ? 0.5 : 1.4;
        }
      },
    };
  },
});
