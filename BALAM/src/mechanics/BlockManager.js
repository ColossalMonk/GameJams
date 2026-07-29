import * as THREE from 'three';
import { toonMaterial } from '../rendering/LayerMaterials.js';

/** Tracks pushable block positions for a zone — not baked into the static TileGrid since they move. */
export class BlockManager {
  constructor(group, grid, positions) {
    this.grid = grid;
    this.group = group;
    this.blocks = positions.map(([col, row]) => this._createBlock(col, row));
  }

  _createBlock(col, row) {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = toonMaterial(0x8a6a4a);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    const pos = this.grid.worldPos(col, row);
    mesh.position.set(pos.x, 0.75, pos.z);
    this.group.add(mesh);
    return { col, row, mesh };
  }

  isBlockedAt(col, row) {
    return this.blocks.some((b) => b.col === col && b.row === row);
  }

  blockAt(col, row) {
    return this.blocks.find((b) => b.col === col && b.row === row) || null;
  }

  /** Pushes whatever block sits at (col,row) one further tile in (dx,dy). Returns true if it moved. */
  tryPush(col, row, dx, dy) {
    const block = this.blockAt(col, row);
    if (!block) return false;
    const nc = col + dx;
    const nr = row + dy;
    if (!this.grid.isWalkable(nc, nr, 'physical') || this.isBlockedAt(nc, nr)) return false;
    block.col = nc;
    block.row = nr;
    const pos = this.grid.worldPos(nc, nr);
    block.mesh.position.set(pos.x, block.mesh.position.y, pos.z);
    return true;
  }

  /**
   * Pulls the block directly behind the player (opposite the direction they're about to
   * move) into the tile the player is vacating. Returns true if a block moved this way.
   */
  tryPull(playerCol, playerRow, dx, dy) {
    const behindCol = playerCol - dx;
    const behindRow = playerRow - dy;
    const block = this.blockAt(behindCol, behindRow);
    if (!block) return false;
    const destCol = playerCol + dx;
    const destRow = playerRow + dy;
    if (!this.grid.isWalkable(destCol, destRow, 'physical') || this.isBlockedAt(destCol, destRow)) return false;
    block.col = playerCol;
    block.row = playerRow;
    const pos = this.grid.worldPos(playerCol, playerRow);
    block.mesh.position.set(pos.x, block.mesh.position.y, pos.z);
    return true;
  }
}
