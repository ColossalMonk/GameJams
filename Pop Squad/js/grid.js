// ===================================================================
// grid.js — board state, spawning, and chain-reaction resolution
// ===================================================================

let grid = [];
let idCounter = 0;

function emptyGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(null);
    grid.push(row);
  }
}
emptyGrid();

function makeNormalCell(colorIdx, sizeIdx) {
  return {
    colorIdx, sizeIdx, power: null,
    id: idCounter++, spawnT: performance.now(), popping: false,
    wobble: Math.random() * Math.PI * 2,
  };
}
function makePowerCell(power) {
  return {
    colorIdx: -1, sizeIdx: 1, power,
    id: idCounter++, spawnT: performance.now(), popping: false,
    wobble: Math.random() * Math.PI * 2,
  };
}

function emptyCells() {
  const out = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!grid[r][c]) out.push([r, c]);
  return out;
}

function rollPowerUp() {
  const roll = Math.random();
  if (roll > POWER_UP_TOTAL_CHANCE) return null;
  let acc = 0;
  for (const key of Object.keys(POWER_UPS)) {
    acc += POWER_UPS[key].chance;
    if (roll <= acc) return key;
  }
  return null;
}

function trySpawn() {
  const empties = emptyCells();
  if (empties.length === 0) { triggerLoss('overflow'); return; }
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];

  const powerKind = rollPowerUp();
  if (powerKind) {
    grid[r][c] = makePowerCell(powerKind);
    return;
  }
  const sizeRoll = Math.random();
  const sizeIdx = sizeRoll < 0.55 ? 0 : (sizeRoll < 0.88 ? 1 : 2);
  const colorIdx = Math.floor(Math.random() * COLORS.length);
  grid[r][c] = makeNormalCell(colorIdx, sizeIdx);
}

// 8-directional neighbors (orthogonal + diagonal)
function neighborsRC(r, c) {
  return [
    [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
    [r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1],
  ];
}

function resolvePop(r, c, depth, chainSizeRef) {
  const node = grid[r][c];
  if (!node) return;
  node.popping = true;
  setTimeout(() => {
    if (grid[r][c] !== node) return;
    const chainLen = chainSizeRef.n;
    const pts = Math.round(10 * (node.sizeIdx + 1) * Math.pow(chainLen, 1.35) / chainLen);
    score += pts;
    updateScoreUI();
    spawnParticles(r, c, node);
    playPop(node.sizeIdx, depth);
    if (depth === 0 || chainLen > 4) floatScoreAt(r, c, chainLen > 1 ? `+${pts} x${chainLen}` : `+${pts}`, chainLen);
    grid[r][c] = null;
    if (chainLen >= 5) shakeAmt = Math.min(14, chainLen * 1.6);
  }, depth * 65);
}

// Normal color-chain BFS (rainbow critters act as wildcards inside the chain).
function popChain(startR, startC) {
  const startNode = grid[startR][startC];
  if (!startNode || startNode.popping) return;

  if (startNode.power === 'bomb') { popBomb(startR, startC); return; }
  if (startNode.power === 'star') { popStar(startR, startC); return; }

  // rainbow tapped directly, or a normal color start
  const targetColor = startNode.colorIdx; // -1 if rainbow
  const visited = new Set([startR + ',' + startC]);
  const toPop = [[startR, startC, 0]];
  const queue = [[startR, startC, 0]];

  while (queue.length) {
    const [r, c, depth] = queue.shift();
    const current = grid[r][c];
    const isWild = current && current.power === 'rainbow';
    neighborsRC(r, c).forEach(([nr, nc]) => {
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
      const key = nr + ',' + nc;
      if (visited.has(key)) return;
      const node = grid[nr][nc];
      if (!node) return;
      if (node.power === 'bomb' || node.power === 'star') return; // don't auto-sweep these
      const matches = isWild || node.power === 'rainbow' ||
        (targetColor !== -1 && node.colorIdx === targetColor) ||
        (targetColor === -1); // rainbow start matches everything
      if (!matches) return;
      visited.add(key);
      toPop.push([nr, nc, depth + 1]);
      queue.push([nr, nc, depth + 1]);
    });
  }

  bestChain = Math.max(bestChain, toPop.length);
  updateBestChainUI();
  if (startNode.power === 'rainbow') playPowerUp('rainbow');

  const chainSizeRef = { n: toPop.length };
  toPop.forEach(([r, c, depth]) => resolvePop(r, c, depth, chainSizeRef));
}

function popBomb(r, c) {
  const node = grid[r][c];
  playPowerUp('bomb');
  shakeAmt = 14;
  const cells = [[r, c], ...neighborsRC(r, c)].filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && grid[rr][cc]);
  bestChain = Math.max(bestChain, cells.length);
  updateBestChainUI();
  const chainSizeRef = { n: cells.length };
  cells.forEach(([rr, cc], i) => resolvePop(rr, cc, Math.floor(i / 3), chainSizeRef));
}

function popStar(r, c) {
  const node = grid[r][c];
  node.popping = true;
  playPowerUp('star');
  setTimeout(() => {
    if (grid[r][c] !== node) return;
    grid[r][c] = null;
    spawnParticles(r, c, { colorIdx: 1 });
    score += 120;
    updateScoreUI();
    floatScoreAt(r, c, '+120 ⭐', 3);
    addBonusTime(3);
  }, 40);
}
