export class MapFragmentManager {
  constructor(fragmentTiles) {
    this.remaining = fragmentTiles.map((f) => ({ ...f }));
    this.total = fragmentTiles.length;
  }

  /** Auto-collects a fragment if the explorer is standing on one. Returns true if collected. */
  tryCollect(explorer, renderer) {
    const idx = this.remaining.findIndex((f) => f.col === explorer.col && f.row === explorer.row);
    if (idx === -1) return false;
    const f = this.remaining.splice(idx, 1)[0];
    renderer.removeDecoration(f.col, f.row);
    explorer.mapFragments++;
    return true;
  }
}
