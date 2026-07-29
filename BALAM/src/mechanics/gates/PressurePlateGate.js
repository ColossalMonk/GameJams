import * as THREE from 'three';
import { PuzzleGate } from '../PuzzleGate.js';
import { TILE } from '../../world/TileGrid.js';

/**
 * The first *sustained*, re-closeable gate: a plate stays active only while a block
 * currently sits on it (not a character — this is a placement puzzle, not stand-and-wait).
 * While active it holds a linked gate open; the moment the block leaves, it closes again.
 */
export class PressurePlateGate extends PuzzleGate {
  constructor(plate, gateCols, gateRow) {
    super();
    this.plate = plate; // {col, row}
    this.gateCols = gateCols;
    this.gateRow = gateRow;
    this.active = false;
    this.marker = null;
  }

  addMarker(group, grid) {
    const pos = grid.worldPos(this.plate.col, this.plate.row);
    const geo = new THREE.CylinderGeometry(0.7, 0.7, 0.06, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, emissive: 0x3a2a10, emissiveIntensity: 0.3 });
    this.marker = new THREE.Mesh(geo, mat);
    this.marker.position.set(pos.x, 0.05, pos.z);
    group.add(this.marker);
  }

  /** Call every frame: syncs the gate open/closed state to whether a block is on the plate. */
  update(grid, renderer, blockManager) {
    const nowActive = blockManager.isBlockedAt(this.plate.col, this.plate.row);
    if (this.marker) this.marker.material.emissiveIntensity = nowActive ? 0.9 : 0.3;
    if (nowActive === this.active) return;
    this.active = nowActive;

    if (nowActive) {
      for (const col of this.gateCols) grid.set(col, this.gateRow, TILE.GROUND);
      renderer.openGate(this.gateCols, this.gateRow);
    } else {
      for (const col of this.gateCols) grid.set(col, this.gateRow, TILE.GATE);
      renderer.closeGate(this.gateCols, this.gateRow);
    }
  }
}
