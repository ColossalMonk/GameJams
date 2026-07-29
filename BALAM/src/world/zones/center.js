import { parseLayout } from '../TileGrid.js';

// 5x5 — The Center. A small clearing, one stone, one ancient tree.
const ROWS = [
  'T T T T T',
  'T . . . T',
  'T . X . T',
  'T . . . T',
  'T . . . T',
];

export const center = {
  id: 'center',
  name: 'The Center',
  layout: parseLayout(ROWS),
  start: {
    explorer: { col: 1, row: 4 },
    jaguar: { col: 3, row: 4 },
  },
  fragments: [],
  exitGate: null,
  entryRequirement: null,
  centerTile: { col: 2, row: 2 },

  createRules(ctx) {
    let triggered = false;
    return {
      update() {
        if (triggered) return;
        const { col, row } = center.centerTile;
        const explorerAt = ctx.explorer.col === col && ctx.explorer.row === row;
        const jaguarAt = Math.abs(ctx.jaguar.col - col) + Math.abs(ctx.jaguar.row - row) <= 1;
        if (explorerAt && jaguarAt) {
          triggered = true;
          ctx.onCenterReached && ctx.onCenterReached();
        }
      },
      interact() {},
    };
  },
};
