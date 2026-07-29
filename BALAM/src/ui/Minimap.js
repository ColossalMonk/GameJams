import { TILE } from '../world/TileGrid.js';

const TILE_COLORS = {
  [TILE.GROUND]: '#5a7a3a',
  [TILE.TREE]: '#2d5a1b',
  [TILE.WATER]: '#3a6b8a',
  [TILE.SPIRIT_WALL]: '#4a2080',
  [TILE.SPIRIT_PATH]: '#c4a8ff',
  [TILE.DENSE_VINES]: '#3a5a1b',
  [TILE.GATE]: '#8a8070',
  [TILE.PICKUP_MAP]: '#f5d76e',
  [TILE.PICKUP_KEY]: '#d4af37',
  [TILE.PICKUP_LOG]: '#6b4423',
  [TILE.TORCH_SCONCE]: '#f5d76e',
  [TILE.RUNE]: '#c4a8ff',
  [TILE.CENTER]: '#ffffff',
};

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = 120;
    this.canvas.height = 120;
    this.grid = null;
    this.explored = new Set();
  }

  setGrid(grid) {
    this.grid = grid;
    this.explored = new Set();
  }

  reveal(col, row, radius = 3) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        this.explored.add(`${col + dc},${row + dr}`);
      }
    }
  }

  draw(explorerTile, jaguarTile) {
    if (!this.grid) return;
    const { ctx, grid } = this;
    const cw = this.canvas.width / grid.width;
    const ch = this.canvas.height / grid.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        if (!this.explored.has(`${col},${row}`)) continue;
        const t = grid.get(col, row);
        ctx.fillStyle = TILE_COLORS[t] || '#222';
        ctx.fillRect(col * cw, row * ch, cw + 0.5, ch + 0.5);
      }
    }

    ctx.fillStyle = '#c4a882';
    ctx.beginPath();
    ctx.arc((explorerTile.col + 0.5) * cw, (explorerTile.row + 0.5) * ch, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c4a8ff';
    ctx.beginPath();
    ctx.arc((jaguarTile.col + 0.5) * cw, (jaguarTile.row + 0.5) * ch, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
