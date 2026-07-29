import { TILE } from '../TileGrid.js';
import * as Gen from '../ZoneGenerator.js';
import { RiverGate } from '../../mechanics/gates/RiverGate.js';
import { SpiritBarrierGate } from '../../mechanics/gates/SpiritBarrierGate.js';
import { CanopyGate } from '../../mechanics/gates/CanopyGate.js';
import { AncientDoor } from '../../mechanics/gates/AncientDoor.js';
import { PressurePlateGate } from '../../mechanics/gates/PressurePlateGate.js';
import { BlockManager } from '../../mechanics/BlockManager.js';
import { MapFragmentManager } from '../../mechanics/MapFragment.js';

/** Builds a plain-language checklist from the recipe so the objectives panel stays accurate. */
function buildObjectives(config) {
  const list = ['Find the key.'];
  if (config.features.includes('river')) list.push('Find the log and lay it across the river.');
  if (config.features.includes('barrier')) list.push('As the Explorer, dispel the spirit barrier at its sconce.');
  if (config.features.includes('vines')) list.push('As the Jaguar (right-click), wilt the vine cluster blocking the path.');
  if (config.features.includes('runes')) list.push('As the Jaguar, awaken all four corner runes.');
  const blockCount = config.features.filter((f) => f === 'blocks').length;
  if (blockCount === 1) list.push('Push or pull (Shift) the block onto its plate to hold the gate open, then pass through.');
  if (blockCount > 1) list.push(`Push or pull (Shift) each of the ${blockCount} blocks onto its plate to pass through both gates.`);
  list.push(`Collect ${config.fragmentCount} map fragment${config.fragmentCount > 1 ? 's' : ''}.`);
  if (config.requireTrust) list.push(`Reach ${Math.round(config.requireTrust * 100)}% trust between the two of you.`);
  list.push('Bring both of you to the door, then press [E] to open it.');
  return list;
}

/**
 * Turns a recipe ({width, height, features, fragmentCount, toZone, ...}) into a full zone
 * def matching the same shape as the hand-authored zone1-3 files, reusing the same gate
 * classes recombined per recipe rather than inventing new mechanics per zone.
 */
export function buildZone(config) {
  const { id, name, width, height, features, fragmentCount, toZone, introHint, entryRequirement, atmosphereDepth, requireTrust } = config;
  const midCol = Math.floor(width / 2);

  const usableTop = 3;
  const usableBottom = height - 4;
  const bandGap = (usableBottom - usableTop) / (features.length + 1);
  const featureRows = features.map((_, i) => Math.round(usableBottom - bandGap * (i + 1)));

  const reserved = new Set();
  featureRows.forEach((r) => [r - 1, r, r + 1, r + 2].forEach((rr) => reserved.add(rr)));

  const layout = Gen.carveTerrain(width, height, reserved);

  const gateCols = [midCol - 1, midCol];
  for (const c of gateCols) layout[0][c] = TILE.GATE;

  const featureData = features.map((type, i) => {
    const row = featureRows[i];
    if (type === 'river') return { type, ...Gen.placeRiver(layout, width, row, midCol) };
    if (type === 'barrier') return { type, ...Gen.placeBarrier(layout, width, row, midCol) };
    if (type === 'vines') return { type, ...Gen.placeVines(layout, width, row, midCol) };
    if (type === 'blocks') return { type, ...Gen.placeBlockChokepoint(layout, width, row, midCol) };
    return { type };
  });

  const hasRunes = features.includes('runes');
  const runeData = hasRunes ? Gen.placeRunes(layout, width, height) : null;
  Gen.placeKey(layout, width, height, midCol);
  const fragmentSpots = Gen.placeFragments(layout, width, height, fragmentCount, midCol);

  const start = {
    explorer: { col: midCol - 1, row: height - 2 },
    jaguar: { col: midCol + 1, row: height - 2 },
  };

  return {
    id,
    name,
    layout,
    start,
    fragments: fragmentSpots,
    exitGate: { cols: gateCols, row: 0, toZone },
    entryRequirement: entryRequirement || null,
    introHint,
    objectives: buildObjectives(config),
    atmosphereDepth: atmosphereDepth || 0,

    createRules(ctx) {
      const fragments = new MapFragmentManager(fragmentSpots);
      const visitedRunes = new Set();
      let riverGate = null;
      let barrierGate = null;
      let canopyGate = null;
      const blockStarts = [];
      const plateGates = [];

      for (const f of featureData) {
        if (f.type === 'river') riverGate = new RiverGate(f.bridgeTiles);
        else if (f.type === 'barrier') barrierGate = new SpiritBarrierGate(f.sconce, f.barrierRow, f.barrierCols);
        else if (f.type === 'vines') canopyGate = new CanopyGate(f.vineTiles);
        else if (f.type === 'blocks') {
          blockStarts.push(f.blockStart);
          plateGates.push(new PressurePlateGate(f.plate, f.gateCols, f.gateRow));
        }
      }

      const blockManager = blockStarts.length ? new BlockManager(ctx.renderer.group, ctx.grid, blockStarts) : null;
      for (const pg of plateGates) pg.addMarker(ctx.renderer.group, ctx.grid);
      const plateRewarded = plateGates.map(() => false);

      const door = new AncientDoor(gateCols, 0, toZone, () => {
        if (!ctx.explorer.hasKey) return false;
        if (riverGate && !riverGate.solved) return false;
        if (barrierGate && !barrierGate.solved) return false;
        if (canopyGate && !canopyGate.solved) return false;
        if (hasRunes && visitedRunes.size < runeData.runeSpots.length) return false;
        if (fragments.remaining.length > 0) return false;
        if (requireTrust && ctx.trustMeter.value < requireTrust) return false;
        return true;
      });
      const updateProgress = () => {
        const parts = [{ label: 'Fragments', done: fragments.total - fragments.remaining.length, total: fragments.total }];
        if (hasRunes) parts.push({ label: 'Runes', done: visitedRunes.size, total: runeData.runeSpots.length });
        ctx.hud.setProgress(parts);
      };
      updateProgress();

      return {
        door,
        blocks: blockManager,
        update() {
          plateGates.forEach((pg, i) => {
            const wasActive = pg.active;
            pg.update(ctx.grid, ctx.renderer, blockManager);
            if (pg.active && !wasActive && !plateRewarded[i]) {
              plateRewarded[i] = true;
              ctx.audio.gateOpenSting();
              ctx.trustMeter.addTrust(0.04);
            }
          });
        },
        interact() {
          if (ctx.layerManager.activeCharacter === 'jaguar') {
            if (canopyGate && canopyGate.tryInteract(ctx.jaguar, ctx.grid, ctx.renderer, ctx.layerManager.activeLayer)) {
              ctx.audio.dispelSting();
              ctx.trustMeter.addTrust(0.06);
              ctx.hud.showMessage('The jaguar wilts the vines.');
              return;
            }
            if (hasRunes) {
              const spot = runeData.runeSpots.find(([c, r]) => c === ctx.jaguar.col && r === ctx.jaguar.row);
              if (spot) {
                const key = `${spot[0]},${spot[1]}`;
                if (!visitedRunes.has(key)) {
                  visitedRunes.add(key);
                  ctx.renderer.activateRune(spot[0], spot[1]);
                  ctx.renderer.spawnPickupBurst(ctx.grid.worldPos(spot[0], spot[1]), 0xc4a8ff);
                  ctx.audio.runeSting();
                  ctx.trustMeter.addTrust(0.04);
                  ctx.hud.showMessage(`Rune awakens (${visitedRunes.size}/${runeData.runeSpots.length})`);
                  updateProgress();
                }
              }
            }
            return;
          }

          if (door.isReady(ctx.explorer, ctx.jaguar)) {
            door.open(ctx.grid, ctx.renderer);
            ctx.audio.gateOpenSting();
            ctx.trustMeter.addTrust(0.08);
            ctx.hud.showMessage('The ancient door opens...');
            return;
          }
          if (barrierGate && barrierGate.tryInteract(ctx.explorer, ctx.grid, ctx.renderer)) {
            ctx.audio.dispelSting();
            ctx.trustMeter.addTrust(0.06);
            ctx.hud.showMessage('The spirit barrier fades.');
            return;
          }
          const { col, row } = ctx.explorer;
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
            riverGate.buildBridge(ctx.grid, ctx.renderer);
            ctx.audio.pickupSting();
            ctx.trustMeter.addTrust(0.04);
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
          if (ctx.layerManager.activeCharacter === 'jaguar') {
            if (canopyGate && !canopyGate.solved) {
              const adjacent = canopyGate.vineTiles.some(
                ([c, r]) => Math.abs(c - ctx.jaguar.col) + Math.abs(r - ctx.jaguar.row) <= 1
              );
              if (adjacent) return '[Right-click] Wilt the vines';
            }
            if (hasRunes) {
              const spot = runeData.runeSpots.find(([c, r]) => c === ctx.jaguar.col && r === ctx.jaguar.row);
              if (spot && !visitedRunes.has(`${spot[0]},${spot[1]}`)) return '[Right-click] Awaken the rune';
            }
            return null;
          }
          const { col, row } = ctx.explorer;
          if (door.isReady(ctx.explorer, ctx.jaguar)) return '[E] Open the ancient door';
          if (barrierGate && !barrierGate.solved && col === barrierGate.sconce.col && row === barrierGate.sconce.row) {
            return '[E] Dispel the spirit barrier';
          }
          const t = ctx.grid.get(col, row);
          if (t === TILE.PICKUP_KEY) return '[E] Pick up the key';
          if (t === TILE.PICKUP_LOG) return '[E] Drag the log to the river';
          if (fragments.remaining.some((f) => f.col === col && f.row === row)) return '[E] Collect the map fragment';
          return null;
        },
      };
    },
  };
}
