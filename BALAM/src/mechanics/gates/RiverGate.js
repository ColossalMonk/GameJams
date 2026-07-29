import { PuzzleGate } from '../PuzzleGate.js';
import { TILE } from '../../world/TileGrid.js';

/** Physical face: collecting the log auto-bridges the river tiles. */
export class RiverGate extends PuzzleGate {
  constructor(bridgeTiles) {
    super();
    this.bridgeTiles = bridgeTiles;
  }

  buildBridge(grid, renderer) {
    if (this.solved) return;
    for (const [c, r] of this.bridgeTiles) grid.set(c, r, TILE.GROUND);
    renderer.buildBridge(this.bridgeTiles);
    this.solved = true;
  }
}
