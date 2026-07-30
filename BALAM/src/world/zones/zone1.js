import { parseLayout, randomOpenTile, TILE } from '../TileGrid.js';
import { RiverGate } from '../../mechanics/gates/RiverGate.js';
import { SpiritBarrierGate } from '../../mechanics/gates/SpiritBarrierGate.js';
import { AncientDoor } from '../../mechanics/gates/AncientDoor.js';
import { MapFragmentManager } from '../../mechanics/MapFragment.js';

// 16x16 — The Threshold. Physical-dominant tutorial zone.
// Key/fragment/log/sconce are no longer baked into the layout — createRules() scatters them
// fresh every time this zone loads, so they don't sit at a memorized spot playthrough to playthrough.
const ROWS = [
  'T T T T T T G G T T T T T T T T',
  'T . . . . . . . . . . . . . . T',
  'T . T . . . . . . . . . . T . T',
  'T . . . . . . . . . . . . . . T',
  'T . T T . . . . . . . . T T . T',
  'T . . . . . . . . . . . . . . T',
  'T . . W W W W W W . . . . . . T',
  'T . . . . W W W W . . . . . . T',
  'T . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . T T . . T',
  'T S S S S S S S S S S S S S S T',
  'T . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . T',
  'T . . . . . . . . . . . . . . T',
];

export const zone1 = {
  id: 'zone1',
  name: 'The Threshold',
  layout: parseLayout(ROWS),
  start: {
    explorer: { col: 7, row: 14 },
    jaguar: { col: 8, row: 14 },
  },
  fragmentCount: 1,
  exitGate: { cols: [6, 7], row: 0, toZone: 'zone2' },
  entryRequirement: null,
  introHint: '[Tab]/[Space] swaps you between the Explorer and the Jaguar — each sees a different half of this jungle. A log lies near the water. A key glints somewhere in the threshold. Bring the jaguar to the door once both are yours.',
  objectives: [
    'Find the key hidden in the threshold.',
    'Collect the map fragment.',
    'Find the log and lay it across the river (optional shortcut).',
    'As the Explorer, dispel the spirit barrier at its sconce so the Jaguar can pass.',
    'Bring both the Explorer and the Jaguar to the ancient door, then press [E] to open it.',
  ],

  createRules(ctx) {
    const spawnTiles = [[ctx.explorer.col, ctx.explorer.row], [ctx.jaguar.col, ctx.jaguar.row]];

    // Sconce: a random column along its lane (the row just south of the barrier).
    const sconceRow = 12;
    const sconceCol = 1 + Math.floor(Math.random() * 14);
    ctx.grid.set(sconceCol, sconceRow, TILE.TORCH_SCONCE);
    ctx.renderer.placeSconce(sconceCol, sconceRow);

    // Log: a random open spot along the river's lane (its south bank, rows 6-7).
    const logSpot = randomOpenTile(ctx.grid, { rows: [6, 7] });
    ctx.grid.set(logSpot[0], logSpot[1], TILE.PICKUP_LOG);
    ctx.renderer.placeLog(logSpot[0], logSpot[1]);

    // Key: anywhere valid, avoiding spawn/log/sconce.
    const keySpot = randomOpenTile(ctx.grid, { exclude: [...spawnTiles, logSpot, [sconceCol, sconceRow]] });
    ctx.grid.set(keySpot[0], keySpot[1], TILE.PICKUP_KEY);
    ctx.renderer.placeKey(keySpot[0], keySpot[1]);

    // Fragment: anywhere valid, avoiding everything already placed.
    const fragSpot = randomOpenTile(ctx.grid, { exclude: [...spawnTiles, logSpot, [sconceCol, sconceRow], keySpot] });
    ctx.grid.set(fragSpot[0], fragSpot[1], TILE.PICKUP_MAP);
    ctx.renderer.placeFragment(fragSpot[0], fragSpot[1]);

    const river = new RiverGate([[5, 6], [5, 7]]);
    const barrier = new SpiritBarrierGate({ col: sconceCol, row: sconceRow }, 11, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const fragments = new MapFragmentManager([{ col: fragSpot[0], row: fragSpot[1] }]);
    const door = new AncientDoor(zone1.exitGate.cols, zone1.exitGate.row, zone1.exitGate.toZone, () => {
      return ctx.explorer.hasKey;
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
        const { col, row } = ctx.explorer;

        if (door.isReady(ctx.explorer, ctx.jaguar)) {
          door.open(ctx.grid, ctx.renderer);
          ctx.audio.gateOpenSting();
          ctx.trustMeter.addTrust(0.1);
          ctx.hud.showMessage('The ancient door opens...');
          return;
        }

        if (barrier.tryInteract(ctx.explorer, ctx.grid, ctx.renderer)) {
          ctx.audio.dispelSting();
          ctx.trustMeter.addTrust(0.08);
          ctx.hud.showMessage('The spirit barrier fades.');
          return;
        }

        const t = ctx.grid.get(col, row);
        if (t === TILE.PICKUP_KEY) {
          ctx.grid.set(col, row, TILE.GROUND);
          ctx.renderer.removeDecoration(col, row);
          ctx.renderer.spawnPickupBurst(ctx.grid.worldPos(col, row), 0xd4af37);
          ctx.explorer.hasKey = true;
          ctx.audio.pickupSting();
          ctx.hud.showMessage('You found an old key.');
          return;
        }
        if (t === TILE.PICKUP_LOG) {
          ctx.grid.set(col, row, TILE.GROUND);
          ctx.renderer.removeDecoration(col, row);
          ctx.renderer.spawnPickupBurst(ctx.grid.worldPos(col, row), 0xff8c42);
          ctx.explorer.hasLog = true;
          river.buildBridge(ctx.grid, ctx.renderer);
          ctx.audio.pickupSting();
          ctx.trustMeter.addTrust(0.05);
          ctx.hud.showMessage('You lay the log across the river.');
          return;
        }
        if (fragments.tryCollect(ctx.explorer, ctx.renderer)) {
          ctx.renderer.spawnPickupBurst(ctx.grid.worldPos(col, row), 0xf5d76e);
          ctx.audio.pickupSting();
          ctx.hud.showFragmentPopup();
          ctx.onFragmentCollected();
          updateProgress();
        }
      },
      hint() {
        if (ctx.layerManager.activeCharacter !== 'explorer') return null;
        if (door.isReady(ctx.explorer, ctx.jaguar)) return '[E] Open the ancient door';
        const { col, row } = ctx.explorer;
        if (!barrier.solved && col === barrier.sconce.col && row === barrier.sconce.row) return '[E] Dispel the spirit barrier';
        const t = ctx.grid.get(col, row);
        if (t === TILE.PICKUP_KEY) return '[E] Pick up the key';
        if (t === TILE.PICKUP_LOG) return '[E] Drag the log to the river';
        if (fragments.remaining.some((f) => f.col === col && f.row === row)) return '[E] Collect the map fragment';
        return null;
      },
    };
  },
};
