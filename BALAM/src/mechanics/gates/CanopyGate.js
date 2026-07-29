import { PuzzleGate } from '../PuzzleGate.js';
import { TILE } from '../../world/TileGrid.js';

/** Jaguar, in spirit layer, stands on a vine tile to wilt it. */
export class CanopyGate extends PuzzleGate {
  constructor(vineTiles) {
    super();
    this.vineTiles = vineTiles;
  }

  /** Jaguar wilts the whole vine cluster at once when adjacent to it in spirit layer. */
  tryInteract(jaguar, grid, renderer, layer) {
    if (this.solved || layer !== 'spirit') return false;
    const adjacent = this.vineTiles.some(
      ([c, r]) => Math.abs(c - jaguar.col) + Math.abs(r - jaguar.row) <= 1
    );
    if (!adjacent) return false;
    for (const [c, r] of this.vineTiles) {
      grid.set(c, r, TILE.GROUND);
      renderer.removeDecoration(c, r);
    }
    this.solved = true;
    return true;
  }
}
