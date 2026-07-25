import { buildHumanoid, applyWalkCycle } from './Humanoid.js';
import { TileStepper } from './TileMotion.js';

// Purely decorative background character - wander-with-pause AI, biased
// away from fire/deep water when picking its next tile. Only ever READS
// Grid state, never mutates it - same decoupling Decor.js/FloatingObjects
// already follow, so NPCs can't affect simulation balance or tuning.
export class NPC {
  constructor(scene, grid, tileSize, spec) {
    this.scene = scene;
    this.grid = grid;
    this.tileSize = tileSize;

    const parts = buildHumanoid({ ...spec.colors, withMop: false });
    this.mesh = parts.root;
    this.parts = parts;
    this.walkCycle = Math.random() * 10;

    this.stepper = new TileStepper(spec.x, spec.y, 0.22 + Math.random() * 0.08);
    this.mesh.position.set(spec.x * tileSize, 0, spec.y * tileSize);
    scene.add(this.mesh);

    this.idleTimer = Math.random() * 1.2;
  }

  // Orthogonal-only wander, even though Grid.neighbors() is 8-directional
  // now - movement adjacency and simulation adjacency are independent
  // concepts, no need to conflate them. Prefers a tile without fire/deep
  // water if one's available, falls back to any in-bounds tile otherwise
  // (never gets stuck if fully surrounded by hazard).
  _pickDirection() {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const safe = [];
    const anyValid = [];
    for (const [dx, dy] of dirs) {
      const nx = this.stepper.gridX + dx;
      const ny = this.stepper.gridY + dy;
      if (!this.grid.inBounds(nx, ny)) continue;
      anyValid.push([dx, dy]);
      const tile = this.grid.getTile(nx, ny);
      if (!tile.fire && tile.water < 60) safe.push([dx, dy]);
    }
    const pool = safe.length > 0 ? safe : anyValid;
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  update(dt) {
    if (!this.stepper.isMoving) {
      if (this.idleTimer > 0) {
        this.idleTimer -= dt;
      } else {
        const dir = this._pickDirection();
        if (dir) {
          this.stepper.startStep(dir[0], dir[1]);
          this.mesh.rotation.y = Math.atan2(dir[0], dir[1]);
        }
        this.idleTimer = 0.3 + Math.random() * 0.9;
      }
    }

    const pos = this.stepper.update(dt);
    this.mesh.position.x = pos.x * this.tileSize;
    this.mesh.position.z = pos.y * this.tileSize;

    if (this.stepper.isMoving) this.walkCycle += dt * 7;
    applyWalkCycle(this.parts, this.walkCycle, this.stepper.isMoving);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) obj.material.dispose?.();
    });
  }
}
