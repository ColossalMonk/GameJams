import { parseLayout, randomOpenTile, TILE } from '../TileGrid.js';
import { AncientDoor } from '../../mechanics/gates/AncientDoor.js';
import { MapFragmentManager } from '../../mechanics/MapFragment.js';

// 12x12 — The Dreaming. Spirit-dominant, smaller and more intense.
// Fragments aren't baked into the layout — createRules() scatters them fresh every load.
const ROWS = [
  'T T T T T G G T T T T T',
  'T . . . . . . . . . . T',
  'T . . C . . . . C . . T',
  'T . . . . . . . . . . T',
  'T . . . . . . . . . . T',
  'T . . . . . . . . . . T',
  'T . . . . . . . . . . T',
  'T . . . . . . . . . . T',
  'T . . . . . . . . . . T',
  'T . . . . . . . . . . T',
  'T . . . . . . . . . . T',
  'T . . . . . . . . . . T',
];

export const zone3 = {
  id: 'zone3',
  name: 'The Dreaming',
  layout: parseLayout(ROWS),
  start: {
    explorer: { col: 5, row: 11 },
    jaguar: { col: 6, row: 11 },
  },
  fragmentCount: 2,
  exitGate: { cols: [5, 6], row: 0, toZone: 'zone4' },
  entryRequirement: { minTrust: 0.7 },
  introHint: 'No key. No ritual. Only trust opens what lies ahead. Stay close to the jaguar.',
  objectives: [
    'Collect both map fragments.',
    'As the Explorer, visit both sconces — the Jaguar is showing you the way, and each one builds trust.',
    'Reach 60% trust between the two of you.',
    'Bring both of you to the door and open it.',
  ],

  createRules(ctx) {
    const sconces = [{ col: 3, row: 2 }, { col: 8, row: 2 }];
    const spawnTiles = [[ctx.explorer.col, ctx.explorer.row], [ctx.jaguar.col, ctx.jaguar.row]];
    const fragmentSpots = [];
    for (let i = 0; i < zone3.fragmentCount; i++) {
      const spot = randomOpenTile(ctx.grid, { exclude: [...spawnTiles, ...fragmentSpots] });
      ctx.grid.set(spot[0], spot[1], TILE.PICKUP_MAP);
      ctx.renderer.placeFragment(spot[0], spot[1]);
      fragmentSpots.push(spot);
    }
    const fragments = new MapFragmentManager(fragmentSpots.map(([col, row]) => ({ col, row })));
    const usedSconces = new Set();

    const door = new AncientDoor(zone3.exitGate.cols, zone3.exitGate.row, zone3.exitGate.toZone, () => {
      return ctx.trustMeter.value >= 0.6;
    });
    const updateProgress = () => {
      ctx.hud.setProgress([{ label: 'Fragments', done: fragments.total - fragments.remaining.length, total: fragments.total }]);
    };
    updateProgress();

    return {
      door,
      update() {},
      interact() {
        if (ctx.layerManager.activeCharacter !== 'explorer') return;

        if (door.isReady(ctx.explorer, ctx.jaguar)) {
          door.open(ctx.grid, ctx.renderer);
          ctx.audio.gateOpenSting();
          ctx.hud.showMessage('Trust holds. The jungle lets you deeper.');
          return;
        }

        const match = sconces.find((s) => s.col === ctx.explorer.col && s.row === ctx.explorer.row);
        if (match) {
          const key = `${match.col},${match.row}`;
          if (!usedSconces.has(key)) {
            usedSconces.add(key);
            ctx.renderer.spawnPickupBurst(ctx.grid.worldPos(match.col, match.row), 0xf5d76e);
            ctx.trustMeter.addTrust(0.15);
            ctx.audio.trustHighSting();
            ctx.hud.showMessage('The jaguar showed you the way.');
            return;
          }
        }
        if (fragments.tryCollect(ctx.explorer, ctx.renderer)) {
          ctx.renderer.spawnPickupBurst(ctx.grid.worldPos(ctx.explorer.col, ctx.explorer.row), 0xf5d76e);
          ctx.audio.pickupSting();
          ctx.hud.showFragmentPopup();
          ctx.onFragmentCollected();
          updateProgress();
        }
      },
      hint() {
        if (ctx.layerManager.activeCharacter === 'explorer') {
          if (door.isReady(ctx.explorer, ctx.jaguar)) return '[E] Open the ancient door';
          const match = sconces.find((s) => s.col === ctx.explorer.col && s.row === ctx.explorer.row);
          if (match && !usedSconces.has(`${match.col},${match.row}`)) {
            return '[E] Let the jaguar show the way';
          }
          if (fragments.remaining.some((f) => f.col === ctx.explorer.col && f.row === ctx.explorer.row)) {
            return '[E] Collect the map fragment';
          }
        }
        if (ctx.trustMeter.value < 0.6) {
          return `Trust: ${Math.round(ctx.trustMeter.value * 100)}% — stay close to the jaguar`;
        }
        return null;
      },
    };
  },
};
