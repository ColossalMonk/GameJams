import * as THREE from 'three';

export const TILE_SIZE = 2;

export const TILE = {
  GROUND: 0,
  TREE: 1,
  WATER: 2,
  SPIRIT_WALL: 3,
  SPIRIT_PATH: 4,
  DENSE_VINES: 5,
  GATE: 6,
  PICKUP_MAP: 7,
  PICKUP_KEY: 8,
  TORCH_SCONCE: 9,
  RUNE: 10,
  CENTER: 11,
  PICKUP_LOG: 12,
};

const LEGEND = {
  '.': TILE.GROUND,
  T: TILE.TREE,
  W: TILE.WATER,
  S: TILE.SPIRIT_WALL,
  P: TILE.SPIRIT_PATH,
  V: TILE.DENSE_VINES,
  G: TILE.GATE,
  M: TILE.PICKUP_MAP,
  K: TILE.PICKUP_KEY,
  L: TILE.PICKUP_LOG,
  C: TILE.TORCH_SCONCE,
  R: TILE.RUNE,
  X: TILE.CENTER,
};

/** Converts an array of legend-character rows (space-separated) into a 2D TILE array. */
export function parseLayout(rows) {
  return rows.map((row) => row.split(' ').filter(Boolean).map((ch) => LEGEND[ch]));
}

/**
 * Picks a random open GROUND tile on a live grid, so item placement can vary every time a
 * zone loads instead of sitting at the same memorized spot. Optionally constrained to a row
 * or column range (e.g. "somewhere along this lane"), and excluding specific coordinates
 * (spawn points, other items already placed this load). Returns null if nothing qualifies.
 */
export function randomOpenTile(grid, { rows = null, cols = null, exclude = [] } = {}) {
  const [r0, r1] = rows || [1, grid.height - 2];
  const [c0, c1] = cols || [1, grid.width - 2];
  const candidates = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (grid.get(c, r) !== TILE.GROUND) continue;
      if (exclude.some(([ec, er]) => ec === c && er === r)) continue;
      candidates.push([c, r]);
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const PATH_DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

/**
 * BFS shortest path on the tile grid for a given layer's walkability rules.
 * Returns an array of [col,row] steps from (excluding) the start to (including) the
 * destination, an empty array if already there, or null if unreachable.
 */
export function findPath(grid, fromCol, fromRow, toCol, toRow, layer) {
  if (fromCol === toCol && fromRow === toRow) return [];
  if (!grid.isWalkable(toCol, toRow, layer)) return null;

  const startKey = `${fromCol},${fromRow}`;
  const queue = [[fromCol, fromRow]];
  const cameFrom = new Map();
  const visited = new Set([startKey]);

  while (queue.length) {
    const [c, r] = queue.shift();
    if (c === toCol && r === toRow) {
      const path = [];
      let cur = [c, r];
      let curKey = `${c},${r}`;
      while (curKey !== startKey) {
        path.unshift(cur);
        cur = cameFrom.get(curKey);
        curKey = `${cur[0]},${cur[1]}`;
      }
      return path;
    }
    for (const [dx, dy] of PATH_DIRS) {
      const nc = c + dx;
      const nr = r + dy;
      const key = `${nc},${nr}`;
      if (visited.has(key) || !grid.isWalkable(nc, nr, layer)) continue;
      visited.add(key);
      cameFrom.set(key, [c, r]);
      queue.push([nc, nr]);
    }
  }
  return null;
}

/**
 * Holds the static tile layout plus dynamic overrides (vines growth, opened gates,
 * consumed pickups) for a single zone.
 */
export class TileGrid {
  constructor(layout) {
    this.width = layout[0].length;
    this.height = layout.length;
    this.tiles = layout.map((row) => [...row]);
    this.overrides = new Map(); // "col,row" -> tile type override
  }

  key(col, row) {
    return `${col},${row}`;
  }

  get(col, row) {
    if (col < 0 || row < 0 || col >= this.width || row >= this.height) return TILE.TREE;
    const k = this.key(col, row);
    if (this.overrides.has(k)) return this.overrides.get(k);
    return this.tiles[row][col];
  }

  set(col, row, tileType) {
    this.overrides.set(this.key(col, row), tileType);
  }

  /** Center the grid on the world origin. Tile (0,0) top-left. */
  worldPos(col, row) {
    const x = (col - (this.width - 1) / 2) * TILE_SIZE;
    const z = (row - (this.height - 1) / 2) * TILE_SIZE;
    return new THREE.Vector3(x, 0, z);
  }

  isWalkable(col, row, layer) {
    const t = this.get(col, row);
    switch (t) {
      case TILE.GROUND:
      case TILE.PICKUP_MAP:
      case TILE.PICKUP_KEY:
      case TILE.PICKUP_LOG:
      case TILE.RUNE:
      case TILE.CENTER:
        return true;
      case TILE.TREE:
      case TILE.DENSE_VINES:
        return false;
      case TILE.WATER:
        return layer === 'spirit';
      case TILE.SPIRIT_WALL:
      case TILE.TORCH_SCONCE:
        return layer === 'physical';
      case TILE.SPIRIT_PATH:
        return layer === 'spirit';
      case TILE.GATE:
        return false; // gates only open via PuzzleGate logic replacing the tile
      default:
        return false;
    }
  }
}
