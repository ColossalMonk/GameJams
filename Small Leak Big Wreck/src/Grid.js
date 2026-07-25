// Grid.js
// Pure simulation state for a level. No rendering here on purpose —
// keeps the water/fire logic testable and debuggable independent of Three.js.

export const TileType = {
  FLOOR: 'floor',
  OUTLET: 'outlet',       // ignites when water is high
  FLAMMABLE: 'flammable', // paper, curtains, etc - fire spreads here fast
  CRITICAL: 'critical',   // server rack etc - burning this fails the level
};

// Diagonal neighbors are physically farther than orthogonal ones, so flow/
// ignition across them happens at a reduced rate. 1/sqrt(2) is the
// physically-motivated default (diagonal distance vs. orthogonal distance)
// - a deliberately tunable constant, not load-bearing physics.
const DIAGONAL_RATE = 1 / Math.SQRT2;

export class Grid {
  constructor(config) {
    this.width = config.width;
    this.height = config.height;
    this.tickRate = config.tickRate ?? 0.4; // seconds between sim ticks
    this.greaseFire = !!config.greaseFire;  // twist: water fuels fire instead of extinguishing
    this.sprinklerThreshold = config.sprinklerThreshold ?? Infinity;
    this.sprinklerTriggered = false;

    this._tickAccum = 0;

    // stats tracked for chaos score
    this.stats = {
      tilesFlooded: 0,
      tilesBurnt: 0,
      sprinklerEvents: 0,
    };

    this.criticalTileLost = false;

    // Visual-only bookkeeping for GridRenderer's flow-arrow effect - plain
    // data fields, same pattern as `stats`, so Grid.js stays renderer-free
    // and usable by tools/simulate.mjs. tickCount lets the renderer detect
    // "a new tick happened" without polling; lastFlowEdges is overwritten
    // (not accumulated) each tick.
    this.tickCount = 0;
    this.lastFlowEdges = [];

    // build tile array
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          x, y,
          type: TileType.FLOOR,
          water: 0,     // 0-100
          fire: false,
          burnt: false,
        });
      }
      this.tiles.push(row);
    }

    // apply type overrides from config
    (config.outlets || []).forEach(([x, y]) => this._setType(x, y, TileType.OUTLET));
    (config.flammable || []).forEach(([x, y]) => this._setType(x, y, TileType.FLAMMABLE));
    (config.critical || []).forEach(([x, y]) => this._setType(x, y, TileType.CRITICAL));

    // seed an "already in chaos" starting state for levels played early in
    // the reverse-chronology order (the wreck comes first, the drip comes
    // last). Applied directly to tiles rather than via mop()/_simTick(), so
    // it never inflates stats.tilesBurnt/tilesFlooded - the player didn't
    // cause this, they walked into it.
    const seed = config.initialState || {};
    (seed.water || []).forEach(([x, y, amount]) => {
      const t = this.getTile(x, y);
      if (t) t.water = Math.min(100, amount);
    });
    (seed.fire || []).forEach(([x, y]) => {
      const t = this.getTile(x, y);
      if (t) t.fire = true;
    });
    (seed.burnt || []).forEach(([x, y]) => {
      const t = this.getTile(x, y);
      if (t) { t.burnt = true; t.fire = false; }
    });

    this.leakSources = (config.leakSources || []).map(([x, y]) => ({ x, y }));
  }

  _setType(x, y, type) {
    if (this.inBounds(x, y)) this.tiles[y][x].type = type;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.tiles[y][x];
  }

  // All 8 surrounding tiles (orthogonal + diagonal), each tagged with
  // whether it's diagonal so callers can apply DIAGONAL_RATE.
  neighborsWithKind(x, y) {
    const dirs = [
      [1, 0, false], [-1, 0, false], [0, 1, false], [0, -1, false],
      [1, 1, true], [1, -1, true], [-1, 1, true], [-1, -1, true],
    ];
    return dirs
      .filter(([dx, dy]) => this.inBounds(x + dx, y + dy))
      .map(([dx, dy, diagonal]) => ({ tile: this.tiles[y + dy][x + dx], diagonal }));
  }

  neighbors(x, y) {
    return this.neighborsWithKind(x, y).map((n) => n.tile);
  }

  // Player calls this while mopping. On grease-fire tiles, "mopping" backfires.
  mop(x, y, amount) {
    const t = this.getTile(x, y);
    if (!t) return;
    if (t.fire && this.greaseFire) {
      // twist: adding water to a grease fire feeds it instead of dousing it.
      // Deliberately NOT calling _tryIgniteNeighbors here - mop() runs every
      // rendered frame while E is held (unlike _simTick, which is paced by
      // tickRate), so an immediate ignite-neighbors call would spread fire
      // ~60x faster than every other path in this file. The water increase
      // alone already keeps this tile primed for the normal tick-paced
      // spread in _simTick to punish.
      t.water = Math.min(100, t.water + amount * 1.5);
      return;
    }
    t.water = Math.max(0, t.water - amount);
  }

  update(dt) {
    this._tickAccum += dt;
    if (this._tickAccum < this.tickRate) return;
    this._tickAccum = 0;
    this._simTick();
  }

  _simTick() {
    // 1. leak sources add water
    for (const src of this.leakSources) {
      const t = this.getTile(src.x, src.y);
      if (t) t.water = Math.min(100, t.water + 15);
    }

    // 2. water spreads to neighbors (simple diffusion), including diagonals
    // at DIAGONAL_RATE
    const deltas = [];
    this.lastFlowEdges = [];
    for (const row of this.tiles) {
      for (const t of row) {
        if (t.water > 20) {
          const ns = this.neighborsWithKind(t.x, t.y).filter(({ tile: n }) => n.water < t.water - 10);
          for (const { tile: n, diagonal } of ns) {
            const flow = Math.min(8, (t.water - n.water) / 4) * (diagonal ? DIAGONAL_RATE : 1);
            deltas.push({ tile: t, delta: -flow });
            deltas.push({ tile: n, delta: flow });
            // Visual-only: record noticeable flows so the renderer can show
            // a directional streak - this is purely for GridRenderer/
            // Particles.js to read, the water math above is untouched.
            if (flow > 1.5) {
              this.lastFlowEdges.push({ fx: t.x, fy: t.y, tx: n.x, ty: n.y, amount: flow });
            }
          }
        }
      }
    }
    for (const d of deltas) {
      d.tile.water = Math.max(0, Math.min(100, d.tile.water + d.delta));
    }

    // 3. ignition: outlets ignite when wet, flammables ignite near fire
    for (const row of this.tiles) {
      for (const t of row) {
        if (t.burnt || t.fire) continue;
        if (t.type === TileType.OUTLET && t.water > 60 && Math.random() < 0.35) {
          t.fire = true;
        }
      }
    }

    // 4. fire spreads to flammable/critical neighbors, and burns out over time
    const newFires = [];
    for (const row of this.tiles) {
      for (const t of row) {
        if (!t.fire) continue;
        this._tryIgniteNeighbors(t, newFires);
      }
    }
    newFires.forEach(t => { t.fire = true; });

    // 5. fire naturally consumes tile -> burnt (unless being fed by grease water)
    for (const row of this.tiles) {
      for (const t of row) {
        if (t.fire && Math.random() < 0.15) {
          t.fire = false;
          t.burnt = true;
          this.stats.tilesBurnt++;
          if (t.type === TileType.CRITICAL) {
            this.criticalTileLost = true;
          }
        }
      }
    }

    // 6. sprinkler check
    const fireCount = this._countFire();
    if (!this.sprinklerTriggered && fireCount >= this.sprinklerThreshold) {
      this.sprinklerTriggered = true;
      this.stats.sprinklerEvents++;
      for (const row of this.tiles) {
        for (const t of row) {
          t.water = Math.min(100, t.water + 40);
          if (t.fire && !this.greaseFire) t.fire = false; // sprinklers douse normal fire
        }
      }
    }

    // stats: flooded tile count (water > 50)
    this.stats.tilesFlooded = this._countFlooded();

    this.tickCount++;
  }

  _tryIgniteNeighbors(t, collector) {
    const ns = this.neighborsWithKind(t.x, t.y);
    for (const { tile: n, diagonal } of ns) {
      if (n.burnt || n.fire) continue;
      const canBurn = n.type === TileType.FLAMMABLE || n.type === TileType.CRITICAL || n.type === TileType.OUTLET;
      let chance = n.type === TileType.FLAMMABLE ? 0.5 : 0.2;
      if (diagonal) chance *= DIAGONAL_RATE;
      if (canBurn && Math.random() < chance) {
        if (collector) collector.push(n);
        else n.fire = true;
      }
    }
  }

  _countFire() {
    let c = 0;
    for (const row of this.tiles) for (const t of row) if (t.fire) c++;
    return c;
  }

  _countFlooded() {
    let c = 0;
    for (const row of this.tiles) for (const t of row) if (t.water > 50) c++;
    return c;
  }

  _countBurnt() {
    let c = 0;
    for (const row of this.tiles) for (const t of row) if (t.burnt) c++;
    return c;
  }

  _avgWater() {
    let sum = 0;
    for (const row of this.tiles) for (const t of row) sum += t.water;
    return sum / (this.width * this.height);
  }

  // Live 0-100 read of "how bad does this room look right now" - used only
  // for the timer-expiry stabilize check, distinct from the cumulative
  // computeChaosScore() below (which is score-screen flavor). Weighted
  // toward average water level rather than a >50-tile-count threshold:
  // fire is short-lived by design (15%/tick burnout in _simTick step 5), so
  // a snapshot fire count swings too wildly to gate progression on, but
  // water level responds directly and continuously to mopping - the one
  // lever the player actually has.
  computeDangerScore() {
    const totalTiles = this.width * this.height;
    const avgWater = this._avgWater();
    const fireRatio = this._countFire() / totalTiles;
    const burntRatio = this._countBurnt() / totalTiles;
    const criticalPenalty = this.criticalTileLost ? 25 : 0;
    const raw = avgWater * 0.55 + fireRatio * 100 * 0.25 + burntRatio * 100 * 0.2 + criticalPenalty;
    return Math.min(100, Math.round(raw));
  }

  // 0-100 chaos rating for this level, used for score screen
  computeChaosScore() {
    const totalTiles = this.width * this.height;
    const floodPct = this.stats.tilesFlooded / totalTiles;
    const burntPct = this.stats.tilesBurnt / totalTiles;
    const sprinklerBonus = this.stats.sprinklerEvents > 0 ? 0.15 : 0;
    const raw = floodPct * 40 + burntPct * 50 + sprinklerBonus * 100;
    return Math.min(100, Math.round(raw));
  }
}
