import { PuzzleGate } from '../PuzzleGate.js';
import { TILE } from '../../world/TileGrid.js';

/**
 * Generic zone-exit door. `conditionFn()` decides the puzzle-state half of readiness
 * (key found, ritual done, trust reached, etc) — proximity to the gate itself is
 * handled here generically, since both characters must physically be present.
 * Opening is a deliberate act (Explorer presses [E]), not automatic.
 */
export class AncientDoor extends PuzzleGate {
  constructor(cols, row, toZone, conditionFn, proximity = 2) {
    super();
    this.cols = cols;
    this.row = row;
    this.toZone = toZone;
    this.conditionFn = conditionFn;
    this.proximity = proximity;
  }

  _nearGate(character) {
    const colDist = Math.min(...this.cols.map((c) => Math.abs(c - character.col)));
    const rowDist = Math.abs(this.row - character.row);
    return Math.max(colDist, rowDist) <= this.proximity;
  }

  /** Puzzle-state solved AND both characters present at the gate. */
  isReady(explorer, jaguar) {
    if (this.solved) return false;
    return this.conditionFn() && this._nearGate(explorer) && this._nearGate(jaguar);
  }

  /** Explorer presses [E] once isReady() — actually mutates the tiles/visuals. */
  open(grid, renderer) {
    if (this.solved) return false;
    for (const col of this.cols) grid.set(col, this.row, TILE.GROUND);
    renderer.openGate(this.cols, this.row);
    this.solved = true;
    return true;
  }
}
