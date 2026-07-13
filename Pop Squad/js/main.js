// ===================================================================
// main.js — game state, timer, render loop, input, start/loss flow
// ===================================================================

let difficulty = 'normal';
let running = false;
let paused = false;
let score = 0;
let timeLeft = GAME_LEN;
let bestChain = 0;
let spawnInterval = 550;
let lastSpawn = 0;
let lastTime = 0;
let shakeAmt = 0;
let timerHandle = null;

// ---------- Input ----------
canvas.addEventListener('pointerdown', e => {
  if (!running || paused) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const c = Math.floor(x / cell), r = Math.floor(y / cell);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) popChain(r, c);
});

// ---------- Loss ----------
function triggerLoss(reason) {
  if (!running) return;
  running = false;
  clearInterval(timerHandle);
  timerHandle = null;
  stopMusic();
  if (reason === 'overflow') playOverflow();
  document.getElementById('resultTitle').textContent = reason === 'overflow' ? 'Squad Overflow!' : "Time's Up!";
  document.getElementById('resultMascot').textContent = reason === 'overflow' ? '😵' : '🎉';
  document.getElementById('bigScore').textContent = score;
  document.getElementById('resultSub').textContent =
    `Best chain: ${bestChain}` + (reason === 'overflow' ? ' — the grid filled up before you could clear it.' : '');
  showOverlay('resultOverlay');
}

// ---------- Render loop ----------
function frame(t) {
  requestAnimationFrame(frame);
  if (!lastTime) lastTime = t;
  const dt = Math.min(60, t - lastTime); lastTime = t;

  ctx.save();
  if (shakeAmt > 0.1) {
    const sx = (Math.random() - 0.5) * shakeAmt, sy = (Math.random() - 0.5) * shakeAmt;
    ctx.translate(sx, sy);
    shakeAmt *= 0.85;
  }
  ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);
  drawBackdrop();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) drawNode(r, c, grid[r][c], t);
  drawParticles();
  ctx.restore();

  if (running && !paused) {
    lastSpawn += dt;
    if (lastSpawn > spawnInterval) {
      lastSpawn = 0;
      trySpawn();
    }
  }
}
requestAnimationFrame(frame);

// ---------- Timer ----------
function startTimer() {
  timeLeft = GAME_LEN;
  document.getElementById('timeVal').textContent = timeLeft;
  document.getElementById('timeStat').classList.remove('low');
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (!running || paused) return;
    timeLeft--;
    document.getElementById('timeVal').textContent = timeLeft;
    if (timeLeft <= 15) document.getElementById('timeStat').classList.add('low');
    const d = DIFFICULTIES[difficulty];
    spawnInterval = Math.max(d.minInterval, d.startInterval - (GAME_LEN - timeLeft) * d.ramp);
    if (timeLeft <= 0) {
      triggerLoss('time');
    }
  }, 1000);
}

// ---------- Start ----------
function startGame() {
  ensureAudio();
  emptyGrid();
  particles = [];
  score = 0; bestChain = 0; shakeAmt = 0;
  updateScoreUI();
  updateBestChainUI();
  hideAllOverlays();
  const d = DIFFICULTIES[difficulty];
  spawnInterval = d.startInterval; lastSpawn = 0;
  for (let i = 0; i < 8; i++) trySpawn();
  running = true; paused = false;
  startTimer();
  startMusic();
}

// ---------- Init ----------
showOverlay('menuOverlay');
