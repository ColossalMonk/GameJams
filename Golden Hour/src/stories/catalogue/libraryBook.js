import { defineStory } from '../Story.js';
import { seg, smooth, easeIn, lerp, vec } from '../anim.js';
import { makeBook, makeStamp, makeBooth, makePurse, makeCoinPile } from '../props/g-props.js';
import { makeBurst } from '../props/b-props.js';

const COVERS = ['#7a4a32', '#2f6f6a', '#6d5a7a', '#b5524a'];
const BOOTHS = ['#5f8fb5', '#2f6f6a', '#c9a27e'];
/** How far the librarian's arm swings out to bring the stamp down on the counter. */
const SLAM = 1.3;

/** A library book comes home, forty years late. The fine is settled with ceremony, or coins. */
export default defineStory({
  id: 'libraryBook',
  slot: 'pavement',
  window: [3.0, 13.0],
  dur: 0.9,
  cast: { librarian: { look: { glasses: true } }, borrower: { old: true } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: '{librarian} stamps it: RETURNED.',
        near: '{borrower}, 40 years late.',
        after: '{borrower}, forgiven at last.',
        idle: '{librarian}, minding the book return.',
      },
      sounds: [[-1.0, 'gasp'], [0, 'thud'], [0.35, 'tada']],
    },
    coins: {
      tags: ['finally', 'falling'],
      captions: {
        peak: '{borrower} pays the fine. In coins.',
        near: '{borrower}, 40 years late.',
        after: '{librarian}, counting a lot of coins.',
        idle: '{librarian}, minding the book return.',
      },
      sounds: [[-1.0, 'gasp'], [0, 'jingle'], [0.6, 'laugh']],
    },
  },
  create({ slot, person, group, add, evening, particles, outcome }) {
    const bx = slot.x + 0.55;
    const bz = slot.z - 0.15;
    const librarian = person('librarian', bx, 0, bz, 'R');
    // The counter sits where the stamp comes down, so it fits tonight's librarian.
    const hand = vec();
    librarian.pose({ armL: SLAM });
    librarian.root.updateMatrixWorld(true);
    librarian.hand('L', hand);
    const counterY = hand.y - 0.17;
    const spot = vec(hand.x, counterY + 0.1, slot.z + 0.05);
    add(makeBooth(counterY, evening.pick(BOOTHS)), bx, 0, bz);
    const borrower = person('borrower', slot.x - 1.3, 0, slot.z + 0.25, 'L');

    const book = makeBook(evening.pick(COVERS));
    book.scale.setScalar(1.3);
    const stamp = makeStamp();
    const burst = makeBurst();
    burst.scale.setScalar(0.4);
    burst.visible = false;
    burst.position.set(spot.x, spot.y + 0.02, spot.z - 0.04);
    const purse = makePurse();
    const pile = makeCoinPile();
    pile.position.set(spot.x + 0.12, counterY, spot.z + 0.1);
    group.add(book, stamp, burst, purse, pile);

    const coins = outcome === 'coins';
    const dur = 0.9;
    const give = vec();
    const top = vec();
    let dusted = false;
    let stamped = false;
    let nextCoin = 0;

    return {
      focus: () => [librarian.root, borrower.root, book],
      update(p, { wall }) {
        // The borrower: a slow walk up, the book handed over at last.
        const walk = smooth(seg(p, -2.6, -1.4));
        borrower.root.position.x = lerp(slot.x - 1.3, slot.x - 0.95, walk);
        const stride = walk > 0 && walk < 1 ? Math.sin(wall * 8) : 0;
        const handOver = Math.sin(Math.PI * seg(p, -1.3, -0.7));
        const tip = coins ? smooth(seg(p, -0.5, -0.1)) : 0;
        if (p < 0) {
          borrower.pose({ legL: stride * 0.25, legR: stride * 0.25, armR: 0.45 + 1.1 * handOver + 2.0 * tip, armL: 0.25, lean: 0.05, head: -0.05, mouth: 0.3 });
        } else if (coins) {
          const pour = p < dur;
          borrower.pose({ armR: pour ? 2.45 + Math.sin(wall * 16) * 0.08 : 0.3, armL: pour ? 0.25 : 1.0 + Math.sin(wall * 10) * 0.2, mouth: pour ? 0.4 : 0.9 });
        } else {
          const cheer = p > 0.1 && p < dur + 1.0;
          borrower.pose({ armL: cheer ? 2.7 : 0.3, armR: cheer ? 2.7 : 0.3, bob: cheer ? Math.abs(Math.sin(wall * 8)) * 0.05 : 0, eyes: cheer ? 0.2 : 1, mouth: cheer ? 1 : 0.4 });
        }

        // The librarian: reads the date, then the stamp (or the outstretched hand).
        const shock = p > -1.0 && p < -0.4;
        const windUp = smooth(seg(p, -0.4, -0.05));
        let armL = 0.5;
        if (!coins) {
          if (p < -0.4) armL = 0.5;
          else if (p < 0) armL = lerp(0.5, 2.9, windUp);
          else if (p < 0.1) armL = lerp(2.9, SLAM, easeIn(seg(p, 0, 0.1)));
          else if (p < 0.3) armL = SLAM;
          else armL = lerp(SLAM, 2.7, smooth(seg(p, 0.3, 0.55))) * (1 - smooth(seg(p, dur + 0.6, dur + 1.0))) + 0.5 * smooth(seg(p, dur + 0.6, dur + 1.0));
          librarian.pose({ armL, armR: p >= 0.3 && p < dur + 0.6 ? 2.0 : 0.4, lean: shock ? 0.1 : 0, eyes: shock ? 1.35 : 1, mouth: shock ? 0.6 : p > 0.3 && p < dur + 0.6 ? 1 : 0.35 });
        } else {
          const count = p > dur + 0.6;
          armL = p < -0.4 ? 0.5 : p < 0 ? lerp(0.5, SLAM, windUp) : count ? 1.2 + Math.sin(wall * 9) * 0.15 : 2.6;
          librarian.pose({ armL, armR: p > 0 && !count ? 2.6 : 0.4, lean: shock ? 0.1 : 0, head: count ? Math.sin(wall * 9) * 0.05 : 0, eyes: shock || (p > 0 && !count) ? 1.35 : 1, mouth: shock ? 0.6 : p > 0 && !count ? 0.95 : 0.4 });
        }

        librarian.root.updateMatrixWorld(true);
        borrower.root.updateMatrixWorld(true);
        // The stamp stays upright in the librarian's left hand.
        librarian.hand('L', stamp.position);
        stamp.position.z = spot.z + 0.04;
        stamp.rotation.z = !coins && p > 0.3 && p < 0.55 ? Math.PI * 2 * smooth(seg(p, 0.3, 0.55)) : 0;

        // The book: in the borrower's hand, then on the counter for good.
        borrower.hand('R', give);
        give.z += 0.08;
        const placed = smooth(seg(p, -1.0, -0.75));
        if (p < -1.0) book.position.copy(give);
        else book.position.lerpVectors(give, spot, placed);
        book.rotation.z = !coins && p > 0 && p < 0.08 ? 0.04 : 0;
        if (p >= -0.75 && !dusted) {
          dusted = true;
          for (let i = 0; i < 4; i++) particles.spawn('puff', spot, vec((Math.random() - 0.5) * 0.5, 0.35, 0.15), { life: 0.9, scale: 0.35 });
        }
        burst.visible = !coins && p >= 0.08 && p < 0.5;
        if (!coins && p >= 0.08 && !stamped) {
          stamped = true;
          for (let i = 0; i < 4; i++) particles.spawn('puff', spot, vec((Math.random() - 0.5) * 1.0, 0.25, 0.15), { life: 0.7, scale: 0.3 });
        }

        // The fine: a purse upended over the counter, and a shower of gold.
        purse.visible = coins && p > -0.6 && p < dur + 0.8;
        if (purse.visible) {
          borrower.hand('R', purse.position);
          purse.position.z += 0.1;
          purse.rotation.z = Math.PI * tip;
        }
        pile.visible = coins && p > 0.05;
        pile.scale.setScalar(coins ? lerp(0.3, 1, smooth(seg(p, 0.05, dur))) : 1);
        if (coins && p >= 0 && p < dur && wall > nextCoin) {
          nextCoin = wall + 1 / 30;
          top.copy(purse.position);
          top.y -= 0.02;
          particles.spawn('spark', top, vec((Math.random() - 0.5) * 0.8, Math.random() * 0.5, 0.1), { life: 0.8, scale: 1.1, color: '#ffd27a' });
        }
      },
    };
  },
});
