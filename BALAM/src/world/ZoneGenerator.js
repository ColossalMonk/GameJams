import { TILE } from './TileGrid.js';

/** Border trees + open interior, with a forced-clear main corridor so the zone is always solvable. */
export function carveTerrain(width, height, reservedRows, treeDensity = 0.07) {
  const layout = [];
  for (let row = 0; row < height; row++) {
    const rowArr = new Array(width).fill(TILE.GROUND);
    if (row === 0 || row === height - 1) rowArr.fill(TILE.TREE);
    else {
      rowArr[0] = TILE.TREE;
      rowArr[width - 1] = TILE.TREE;
    }
    layout.push(rowArr);
  }

  const midCol = Math.floor(width / 2);
  for (let row = 1; row < height - 1; row++) {
    if (reservedRows.has(row)) continue;
    for (let col = 1; col < width - 1; col++) {
      if (Math.abs(col - midCol) <= 1) continue; // keep the main corridor clear
      if (Math.random() < treeDensity) layout[row][col] = TILE.TREE;
    }
  }
  return layout;
}

/** A two-row river band; the log bridges one column once collected. */
export function placeRiver(layout, width, row, midCol) {
  for (let c = 1; c < width - 1; c++) {
    layout[row][c] = TILE.WATER;
    layout[row + 1][c] = TILE.WATER;
  }
  layout[row + 1][midCol - 1] = TILE.PICKUP_LOG;
  return { bridgeTiles: [[midCol, row], [midCol, row + 1]] };
}

/** A solid, unbroken spirit wall — the sconce stands one tile in front of it (approach side), not in a gap in the wall itself. */
export function placeBarrier(layout, width, row, midCol) {
  const barrierCols = [];
  for (let c = 1; c < width - 1; c++) {
    layout[row][c] = TILE.SPIRIT_WALL;
    barrierCols.push(c);
  }
  const sconceRow = row + 1;
  layout[sconceRow][midCol] = TILE.TORCH_SCONCE;
  return { sconce: { col: midCol, row: sconceRow }, barrierRow: row, barrierCols };
}

/** A full-width vine wall the Jaguar must wilt in spirit form — no gap to walk around. */
export function placeVines(layout, width, row, midCol) {
  const vineTiles = [];
  for (let c = 1; c < width - 1; c++) {
    for (let r = row; r <= row + 1; r++) {
      layout[r][c] = TILE.DENSE_VINES;
      vineTiles.push([c, r]);
    }
  }
  return { vineTiles };
}

/**
 * A genuine physical chokepoint: the row is walled off except a narrow gate gap that
 * only stays open while a pushable block sits on the plate two rows south.
 */
export function placeBlockChokepoint(layout, width, row, midCol) {
  for (let c = 1; c < width - 1; c++) {
    if (c !== midCol && c !== midCol - 1) layout[row][c] = TILE.TREE;
  }
  layout[row][midCol - 1] = TILE.GATE;
  layout[row][midCol] = TILE.GATE;
  return {
    gateCols: [midCol - 1, midCol],
    gateRow: row,
    plate: { col: midCol, row: row + 2 },
    blockStart: [midCol - 2, row + 2],
  };
}

/** Four rune spots near the corners of the zone. */
export function placeRunes(layout, width, height) {
  const inset = 2;
  const runeSpots = [
    [inset, inset], [width - 1 - inset, inset],
    [inset, height - 1 - inset], [width - 1 - inset, height - 1 - inset],
  ];
  for (const [c, r] of runeSpots) layout[r][c] = TILE.RUNE;
  return { runeSpots };
}

/** Scatters the key onto an open ground tile, away from the corridor and away from spawn. */
export function placeKey(layout, width, height, midCol) {
  let tries = 0;
  while (tries < 300) {
    tries++;
    const c = 1 + Math.floor(Math.random() * (width - 2));
    const r = 2 + Math.floor(Math.random() * (height - 6));
    if (layout[r][c] !== TILE.GROUND) continue;
    if (Math.abs(c - midCol) <= 1) continue;
    layout[r][c] = TILE.PICKUP_KEY;
    return { col: c, row: r };
  }
  const fc = midCol + 3 <= width - 2 ? midCol + 3 : width - 2;
  const fr = height - 3;
  layout[fr][fc] = TILE.PICKUP_KEY;
  return { col: fc, row: fr };
}

/** Scatters `count` map fragments on open ground tiles, avoiding the main corridor. */
export function placeFragments(layout, width, height, count, midCol) {
  const spots = [];
  let tries = 0;
  while (spots.length < count && tries < 300) {
    tries++;
    const c = 1 + Math.floor(Math.random() * (width - 2));
    const r = 2 + Math.floor(Math.random() * (height - 4));
    if (layout[r][c] !== TILE.GROUND) continue;
    if (Math.abs(c - midCol) <= 1) continue;
    layout[r][c] = TILE.PICKUP_MAP;
    spots.push({ col: c, row: r });
  }
  return spots;
}
