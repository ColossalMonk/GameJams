import { parseLayout, randomOpenTile, TILE } from '../TileGrid.js';
import { CanopyGate } from '../../mechanics/gates/CanopyGate.js';
import { AncientDoor } from '../../mechanics/gates/AncientDoor.js';
import { MapFragmentManager } from '../../mechanics/MapFragment.js';

// 20x20 — The Understory. Mixed, cooperation-focused zone.
// Fragments aren't baked into the layout — createRules() scatters them fresh every load.
const ROWS = [
  'T T T T T T T T T G G T T T T T T T T T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . R . . . . . . . . . . . . . . R . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T V V V V V V V V V V V V V V V V V V T',
  'T V V V V V V V V V V V V V V V V V V T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . T T . . . . . . . . . . T T . . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . T T . . . . . . . . . . T T . . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . R . . . . . . . . . . . . . . R . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . . . . . T',
];

const VINE_TILES = [];
for (let c = 1; c <= 18; c++) {
  VINE_TILES.push([c, 4]);
  VINE_TILES.push([c, 5]);
}
const RUNES = [[2, 2], [17, 2], [2, 16], [17, 16]];

export const zone2 = {
  id: 'zone2',
  name: 'The Understory',
  layout: parseLayout(ROWS),
  start: {
    explorer: { col: 9, row: 18 },
    jaguar: { col: 10, row: 18 },
  },
  fragmentCount: 2,
  exitGate: { cols: [9, 10], row: 0, toZone: 'zone3' },
  entryRequirement: null,
  introHint: 'The vines block the way north — the jaguar can wilt them in spirit form. Four runes wait in the corners, and two fragments in the understory. The door needs trust as well as ritual.',
  objectives: [
    'Collect both map fragments.',
    'As the Jaguar (spirit mode, right-click), wilt the vines blocking the north path.',
    'As the Jaguar, awaken all four corner runes.',
    'Reach 70% trust between the two of you.',
    'Bring both of you to the door — it opens once every condition above is met.',
  ],

  createRules(ctx) {
    const spawnTiles = [[ctx.explorer.col, ctx.explorer.row], [ctx.jaguar.col, ctx.jaguar.row]];
    const fragmentSpots = [];
    for (let i = 0; i < zone2.fragmentCount; i++) {
      const spot = randomOpenTile(ctx.grid, { exclude: [...spawnTiles, ...fragmentSpots] });
      ctx.grid.set(spot[0], spot[1], TILE.PICKUP_MAP);
      ctx.renderer.placeFragment(spot[0], spot[1]);
      fragmentSpots.push(spot);
    }

    const canopy = new CanopyGate(VINE_TILES);
    const fragments = new MapFragmentManager(fragmentSpots.map(([col, row]) => ({ col, row })));
    const visitedRunes = new Set();

    const door = new AncientDoor(zone2.exitGate.cols, zone2.exitGate.row, zone2.exitGate.toZone, () => {
      return (
        fragments.remaining.length === 0 &&
        visitedRunes.size === RUNES.length &&
        ctx.trustMeter.value >= 0.7
      );
    });
    const updateProgress = () => {
      ctx.hud.setProgress([
        { label: 'Fragments', done: fragments.total - fragments.remaining.length, total: fragments.total },
        { label: 'Runes', done: visitedRunes.size, total: RUNES.length },
      ]);
    };
    updateProgress();

    return {
      door,
      update() {},
      interact() {
        if (ctx.layerManager.activeCharacter === 'jaguar') {
          if (canopy.tryInteract(ctx.jaguar, ctx.grid, ctx.renderer, ctx.layerManager.activeLayer)) {
            ctx.audio.dispelSting();
            ctx.trustMeter.addTrust(0.08);
            ctx.hud.showMessage('The jaguar wilts the vines.');
            return;
          }
          const isRune = RUNES.some(([c, r]) => c === ctx.jaguar.col && r === ctx.jaguar.row);
          if (isRune) {
            const key = `${ctx.jaguar.col},${ctx.jaguar.row}`;
            if (!visitedRunes.has(key)) {
              visitedRunes.add(key);
              ctx.renderer.activateRune(ctx.jaguar.col, ctx.jaguar.row);
              ctx.renderer.spawnPickupBurst(ctx.grid.worldPos(ctx.jaguar.col, ctx.jaguar.row), 0xc4a8ff);
              ctx.audio.runeSting();
              ctx.trustMeter.addTrust(0.05);
              ctx.hud.showMessage(`Rune awakens (${visitedRunes.size}/${RUNES.length})`);
              updateProgress();
            }
          }
          return;
        }
        if (door.isReady(ctx.explorer, ctx.jaguar)) {
          door.open(ctx.grid, ctx.renderer);
          ctx.audio.gateOpenSting();
          ctx.trustMeter.addTrust(0.05);
          ctx.hud.showMessage("Trust and the jaguar's ritual open the way...");
          return;
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
        if (ctx.layerManager.activeCharacter === 'jaguar') {
          if (!canopy.solved) {
            const adjacent = VINE_TILES.some(
              ([c, r]) => Math.abs(c - ctx.jaguar.col) + Math.abs(r - ctx.jaguar.row) <= 1
            );
            if (adjacent) return '[Right-click] Wilt the vines';
          }
          const isRune = RUNES.some(([c, r]) => c === ctx.jaguar.col && r === ctx.jaguar.row);
          if (isRune && !visitedRunes.has(`${ctx.jaguar.col},${ctx.jaguar.row}`)) {
            return '[Right-click] Awaken the rune';
          }
          if (fragments.remaining.length === 0 && visitedRunes.size < RUNES.length) {
            return `Runes awakened: ${visitedRunes.size}/${RUNES.length}`;
          }
          return null;
        }
        if (door.isReady(ctx.explorer, ctx.jaguar)) return '[E] Open the ancient door';
        if (fragments.remaining.some((f) => f.col === ctx.explorer.col && f.row === ctx.explorer.row)) {
          return '[E] Collect the map fragment';
        }
        return null;
      },
    };
  },
};
