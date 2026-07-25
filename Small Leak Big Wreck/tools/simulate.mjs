// tools/simulate.mjs
// Headless tuning harness for Grid.js's per-level dangerThreshold values.
// Grid.js has zero THREE.js/browser dependency, so this runs directly under
// plain Node - `node tools/simulate.mjs` from the project root.
//
// For each level, runs an "idle" (no input) and an "active" (bot mops the
// globally-wettest tile every step) strategy for the level's timeLimit,
// N trials each (ignition/burnout are stochastic), and reports the median
// danger score for both. Output is for manual review - dangerThreshold in
// levels.js is not auto-written, since existing thresholds also encode
// narrative intent (e.g. level 1 is deliberately generous) that a human
// needs to weigh against the raw numbers.

import { Grid } from '../src/Grid.js';
import { LEVELS } from '../src/levels.js';

const TRIALS = 20;
const DT = 1 / 60;
const MOP_RATE = 22; // matches Player.js's mopRate

function wettestTile(grid) {
  let best = null;
  for (const row of grid.tiles) {
    for (const t of row) {
      if (!best || t.water > best.water) best = t;
    }
  }
  return best;
}

function runTrial(levelConfig, strategy) {
  const grid = new Grid(levelConfig);
  let elapsed = 0;
  while (elapsed < levelConfig.timeLimit) {
    if (strategy === 'active') {
      const t = wettestTile(grid);
      if (t && t.water > 0) grid.mop(t.x, t.y, MOP_RATE * DT);
    }
    grid.update(DT);
    elapsed += DT;
  }
  return grid.computeDangerScore();
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function runLevel(levelConfig) {
  const idle = [];
  const active = [];
  for (let i = 0; i < TRIALS; i++) {
    idle.push(runTrial(levelConfig, 'idle'));
    active.push(runTrial(levelConfig, 'active'));
  }
  return {
    id: levelConfig.id,
    subtitle: levelConfig.subtitle,
    currentThreshold: levelConfig.dangerThreshold,
    idleMedian: median(idle),
    idleRange: [Math.min(...idle), Math.max(...idle)],
    activeMedian: median(active),
    activeRange: [Math.min(...active), Math.max(...active)],
  };
}

function main() {
  console.log(`Simulating ${LEVELS.length} levels, ${TRIALS} trials/strategy...\n`);
  const rows = LEVELS.map(runLevel);
  const colWidths = { id: 4, subtitle: 16, cur: 6, idle: 18, active: 18 };
  console.log(
    'id'.padEnd(colWidths.id) +
    'subtitle'.padEnd(colWidths.subtitle) +
    'current'.padEnd(colWidths.cur) +
    'idle (med [range])'.padEnd(colWidths.idle) +
    'active (med [range])'.padEnd(colWidths.active)
  );
  for (const r of rows) {
    console.log(
      String(r.id).padEnd(colWidths.id) +
      r.subtitle.padEnd(colWidths.subtitle) +
      String(r.currentThreshold).padEnd(colWidths.cur) +
      `${r.idleMedian} [${r.idleRange[0]}-${r.idleRange[1]}]`.padEnd(colWidths.idle) +
      `${r.activeMedian} [${r.activeRange[0]}-${r.activeRange[1]}]`.padEnd(colWidths.active)
    );
  }
  console.log('\nSuggested dangerThreshold (between active median and idle median, closer to active + margin):');
  for (const r of rows) {
    const suggested = Math.round(r.activeMedian + (r.idleMedian - r.activeMedian) * 0.4);
    const flag = r.idleMedian <= r.activeMedian ? '  ⚠ idle not worse than active - review this level' : '';
    console.log(`  id${r.id} (${r.subtitle}): current=${r.currentThreshold} → suggested=${suggested}${flag}`);
  }
}

main();
