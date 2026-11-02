import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { makeChessBoard, makePiece } from '../props/f-props.js';

const LIGHT = '#fbf1dc';
const DARK = '#3a3340';
/** Pieces still on the board after thirty years: kind, colour, square (u across, v back→front). */
const PIECES = [
  ['king', DARK, 0.31, -0.25],
  ['pawn', DARK, 0.06, -0.25],
  ['pawn', DARK, 0.19, 0.0],
  ['king', LIGHT, -0.31, 0.25],
  ['pawn', LIGHT, -0.06, 0.25],
];
/** Where the queen comes down: next to the dark king. */
const MATE = [0.19, -0.25];

/** Two old friends, one game, thirty years. Tonight it ends: checkmate, or the board goes flying. */
export default defineStory({
  id: 'chess',
  slot: 'cafe',
  window: [2.8, 12.8],
  dur: 1.0,
  cast: { elder: { old: true }, rival: { old: true } },
  outcomes: {
    main: {
      tags: ['joy', 'finally'],
      captions: {
        peak: 'Checkmate! {elder}, after thirty years.',
        near: '{elder}, reaching for the queen.',
        after: '{rival}, already asking for a rematch.',
        idle: '{elder} and {rival}, year thirty of one game.',
      },
      sounds: [[0, 'thud'], [0.1, 'tada'], [0.55, 'cheer']],
    },
    flip: {
      tags: ['oops', 'falling'],
      captions: {
        peak: '{rival} flipped the board. Thirty years!',
        near: '{elder}, reaching for the queen.',
        after: '{elder} and {rival}, hunting for pieces.',
        idle: '{elder} and {rival}, year thirty of one game.',
      },
      sounds: [[0, 'thud'], [0.12, 'whoosh'], [0.85, 'crash']],
    },
  },
  create({ slot, person, group, evening, outcome }) {
    const elder = person('elder', slot.x - 0.85, 0, slot.z - 0.45, 'L');
    const rival = person('rival', slot.x + 0.85, 0, slot.z - 0.45, 'R');
    // The board sits on the table (top at y ≈ 0.82), leaning towards us like a shop display.
    const board = makeChessBoard();
    const home = vec(slot.x, 0.95, slot.z - 0.05);
    board.group.position.copy(home);
    group.add(board.group);
    const at = vec();
    const pieces = PIECES.map(([kind, colour, u, v], i) => {
      const pc = makePiece(kind, colour);
      pc.scale.setScalar(1.25);
      board.at(u, v, at);
      pc.position.copy(at);
      board.group.add(pc);
      // For the flip: a spin, and a spot on the ground to land.
      const side = u < 0 ? -1 : 1;
      return { pc, kind, home: at.clone(), spin: evening.range(5, 9) * (i % 2 ? 1 : -1), vx: side * evening.range(0.6, 1.4), vy: evening.range(2.2, 3.0), land: null };
    });
    const queen = makePiece('queen', LIGHT);
    queen.scale.setScalar(1.25);
    board.group.add(queen);
    const king = pieces[0];
    const mate = board.at(MATE[0], MATE[1], vec());
    const queenStart = board.at(-0.44, 0.25, vec());

    const dur = 1.0;
    const hand = vec();
    const world = vec();
    // Pieces fly in world coordinates once the board is gone.
    const flyers = new THREE.Group();
    group.add(flyers);
    let flipped = false;

    return {
      focus: () => [elder.root, rival.root, board.group, ...(flipped ? [flyers] : [])],
      x: () => slot.x,
      update(p, { wall, outcome: o }) {
        // Thinking, for thirty years; then the elder reaches for the queen and slams it down.
        const reach = smooth(seg(p, -1.5, -1.0));
        const hover = p > -1.0 && p < -0.35;
        const down = smooth(seg(p, -0.35, 0));
        const think = Math.sin(wall * 1.3) * 0.05;
        const won = o === 'main' && p >= 0.05 && p < dur + 1.4;
        const shock = o === 'flip' && p >= 0 && p < dur + 0.6;
        const hunting = o === 'flip' && p > dur + 0.9;
        const shake = o === 'main' && p > dur + 1.6 ? smooth(seg(p, dur + 1.6, dur + 1.9)) : 0;
        elder.pose({
          armR: won ? 2.8 : shock ? 2.7 : hunting ? 0.6 : lerp(lerp(-2.2, 1.45, reach), 1.1, down) + (hover ? Math.sin(wall * 5) * 0.06 : 0) + shake * 0.5,
          armL: won ? 2.8 : shock ? 2.7 : hunting ? 0.6 : -0.45,
          lean: (p < 0 ? 0.12 * reach : 0) + think * (p < -1.5 ? 1 : 0),
          head: p < 0 ? 0.12 : 0,
          bob: won ? Math.abs(Math.sin(wall * 9)) * 0.08 : hunting ? -0.12 : 0,
          mouth: won ? 1 : shock ? 1 : p > -0.35 && p < 0 ? 0.25 : 0.3,
          eyes: p < -1.5 ? 0.45 : hover ? 0.7 : 1,
          brows: p < 0 && p > -1.0 ? -0.7 : null,
        });
        const flipping = o === 'flip' && p >= -0.05 && p < 0.25;
        rival.pose({
          armL: o === 'main' ? (p > 0.1 && p < dur + 1.5 ? 2.75 : -0.45 + shake * 1.7) : flipping ? lerp(0.2, 2.6, seg(p, -0.05, 0.12)) : shock ? 2.7 : hunting ? 0.6 : -0.45,
          armR: o === 'main' ? (p > 0.1 && p < dur + 1.5 ? 2.75 : -2.2) : shock ? 2.7 : hunting ? 0.6 : -2.2,
          lean: p < 0 ? -0.1 * reach - think * (p < -1.5 ? 1 : 0) : o === 'flip' && p < 0.3 ? -0.15 : 0,
          head: p < 0 ? -0.12 : 0,
          bob: hunting ? -0.12 : 0,
          mouth: p > 0.05 && p < dur + 1.5 ? 1 : o === 'main' && p > dur + 1.5 ? 0.35 : 0.2,
          eyes: p < -1.5 ? 0.45 : 1,
          brows: p > -1.0 && p < 0 ? -0.8 : p > 0.05 && p < dur ? 1 : null,
        });

        // The queen: in the elder's hand, hovering, then down next to the king.
        elder.root.updateMatrixWorld(true);
        elder.hand('R', hand);
        board.group.updateMatrixWorld(true);
        if (p < -1.25) queen.position.copy(queenStart);
        else {
          // Held just in front of the board, then set down on its square.
          board.group.worldToLocal(world.copy(hand));
          world.y -= 0.1;
          world.z = 0.12;
          queen.position.lerpVectors(world, mate, down);
        }
        queen.rotation.z = p > -1.25 && p < -0.35 ? Math.sin(wall * 5) * 0.1 : 0;

        if (o === 'main') {
          // The king topples, slowly, as kings do.
          king.pc.rotation.z = -1.45 * easeOut(seg(p, 0.1, 0.5));
          king.pc.position.copy(king.home);
          board.group.position.copy(home);
          board.group.rotation.set(0, 0, 0);
          return;
        }

        // Flipped: up goes the board, out go the pieces, down they all come.
        const t = p - 0.05;
        if (t < 0) {
          board.group.position.copy(home);
          board.group.rotation.set(0, 0, 0);
          return;
        }
        if (!flipped) {
          flipped = true;
          pieces.push({ pc: queen, spin: 7, vx: 0.3, vy: 2.8, land: null });
          for (const pc of pieces) {
            pc.pc.getWorldPosition(world);
            flyers.add(pc.pc);
            pc.pc.position.copy(world);
            pc.from = world.clone();
          }
        }
        // The board: a half somersault towards the elder, landing flat on its back on the ground.
        const u = seg(t, 0, 0.75);
        board.group.position.set(home.x - 0.55 * u, home.y + 4 * u * (1 - u) * 0.9 - (home.y - 0.08) * u * u, home.z + 0.35 * u);
        board.group.rotation.set(-1.0 * u, 0, 2.6 * easeOut(u));
        for (const pc of pieces) {
          if (!pc.from) continue;
          const y = pc.from.y + pc.vy * t - 4.9 * t * t;
          if (y > 0.06 && !pc.land) {
            pc.pc.position.set(pc.from.x + pc.vx * t, y, pc.from.z + 0.5 * t);
            pc.pc.rotation.z = pc.spin * t;
          } else {
            pc.land ??= pc.pc.position.clone().setY(0.02);
            pc.pc.position.copy(pc.land);
            pc.pc.rotation.z = Math.PI / 2;
          }
        }
      },
    };
  },
});
