import { TileGrid } from './TileGrid.js';
import { TileRenderer } from './TileRenderer.js';

export class ZoneLoader {
  constructor(scene) {
    this.scene = scene;
    this.current = null; // { def, grid, renderer }
  }

  load(zoneDef) {
    this.unload();
    const grid = new TileGrid(zoneDef.layout);
    const renderer = new TileRenderer(grid);
    this.scene.add(renderer.group);
    this.current = { def: zoneDef, grid, renderer };
    return this.current;
  }

  unload() {
    if (!this.current) return;
    this.scene.remove(this.current.renderer.group);
    this.current = null;
  }
}
