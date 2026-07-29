import { PuzzleGate } from '../PuzzleGate.js';
import { TILE } from '../../world/TileGrid.js';

/** Explorer must stand on the sconce and interact to dispel the barrier for the jaguar. */
export class SpiritBarrierGate extends PuzzleGate {
  constructor(sconce, barrierRow, barrierCols) {
    super();
    this.sconce = sconce;
    this.barrierRow = barrierRow;
    this.barrierCols = barrierCols;
  }

  tryInteract(explorer, grid, renderer) {
    if (this.solved) return false;
    if (explorer.col !== this.sconce.col || explorer.row !== this.sconce.row) return false;
    for (const c of this.barrierCols) grid.set(c, this.barrierRow, TILE.GROUND);
    grid.set(this.sconce.col, this.sconce.row, TILE.GROUND);
    renderer.clearSpiritWalls(this.barrierCols, this.barrierRow);
    this.solved = true;
    return true;
  }
}
