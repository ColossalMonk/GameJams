/* ═══════════════════════════════════════════════════════════════
   MAIN.JS
   ------------------------------------------------------------
   Purpose: the "glue" file — ties every other module together.
   Three jobs live here:
     1. Game lifecycle functions that don't belong to any single
        subsystem: `onMerge` (scoring + effects + sound, all at once),
        `triggerGameOver`, `resetGame`.
     2. Navigation wiring: every button's click handler, calling
        into ui.js `showScreen` and friends.
     3. The main loop itself, and the boot sequence that starts
        everything running.

   This file is loaded LAST on purpose — it's the only file that
   needs literally everything else (data, state, dom, audio, effects,
   physics, render, ui, input) to already be defined before it can
   wire buttons up and start the loop.
═══════════════════════════════════════════════════════════════ */

/**
 * onMerge(fromTier, toTier, x, y) — the single place that reacts to
 * "two fruits just became one bigger fruit". Called from physics.js
 * `handleMerges` at the exact moment a merge is detected.
 *
 * Deliberately bundles together everything a merge should DO,
 * rather than physics.js doing it inline — this keeps physics.js
 * focused purely on simulation, and keeps all the "what does a merge
 * mean to the player" logic (scoring, sound, visuals, combo tracking)
 * in one readable place.
 *
 * Steps, in order:
 *   1. Bump the `merges` counter and track `biggestTier` (both shown
 *      on the Game Over screen).
 *   2. Award points for the NEW tier (see data.js TIERS' `pts` field
 *      doc comment for why it's the new tier's points, not the old
 *      tier's) and update `bestScore` if this run just beat it.
 *   3. Refresh the on-screen score displays (ui.js `refreshHud`).
 *   4. Play the merge sound, scaled by tier (audio.js `sfxMerge`).
 *   5. Trigger screen shake, scaled by tier — bigger merges shake
 *      the screen a bit harder (effects.js `doShake`).
 *   6. Spawn a particle burst + floating "+N" popup at the merge
 *      point (effects.js `spawnBurst`/`spawnPopup`).
 *   7. Show the "OldFruit → NewFruit!" toast (effects.js `showEvoToast`).
 *   8. Chain tracking: increment `chainN`, and if this is the SECOND
 *      (or later) merge within the current chain window, play the
 *      chain sound and show the chain toast. Every merge resets a
 *      1.4-second timer that, if it ever fires uninterrupted, zeroes
 *      `chainN` back out — so a "chain" is really just "merges that
 *      kept happening faster than once every 1.4 seconds".
 *
 * @param {number} fromTier - tier index of the fruit that merged away
 * @param {number} toTier   - tier index of the fruit that was created
 * @param {number} x,y      - world position where the merge happened
 */
function onMerge(fromTier, toTier, x, y){
  merges++;
  if (toTier > biggestTier) biggestTier = toTier;

  const pts = TIERS[toTier].pts;
  score += pts;
  if (score > bestScore) bestScore = score;
  refreshHud();

  sfxMerge(toTier);
  doShake(1.2 + toTier * 0.3);
  spawnBurst(x, y, TIERS[fromTier].base, TIERS[toTier].base);
  spawnPopup(x, y, '+' + pts, TIERS[toTier].dark);
  showEvoToast(fromTier, toTier);

  chainN++;
  clearTimeout(chainTimer);
  if (chainN > 1){ sfxChain(chainN); showChainToast(chainN); }
  chainTimer = setTimeout(() => { chainN = 0; }, 1400);
}

/**
 * triggerGameOver() — ends the current run once a fruit has been
 * resting above the danger line for too long (the actual DETECTION
 * of this condition lives in physics.js `step`, which calls this
 * function the moment it notices).
 *
 * Flips the flow flags (`isDead = true`, `gameOn = false`) so
 * `step()` stops simulating and `dropCurrent()` stops accepting
 * input immediately — but the actual Game Over SCREEN is shown
 * after a 500ms delay, giving the player a beat to see the jar
 * overflow before the modal covers it, rather than an abrupt cut.
 *
 * Populates every stat on the Game Over screen (final score, total
 * merges, total drops, biggest fruit reached) and shows/hides the
 * "New best" badge depending on whether this run's score matches or
 * beats `bestScore` (and is greater than zero — so a 0-point instant
 * loss never shows "New best").
 *
 * Called from: physics.js `step`, exactly once per run (guarded by
 * the `!isDead` check there, so it can't fire twice for one run).
 */
function triggerGameOver(){
  isDead = true; gameOn = false;
  sfxGameOver();
  lastScore = score;

  const isNewBest = score >= bestScore && score > 0;
  document.getElementById('goScore').textContent = score;
  document.getElementById('goMerges').textContent = merges;
  document.getElementById('goDrops').textContent = drops;
  document.getElementById('goBiggest').textContent = TIERS[biggestTier].name;
  document.getElementById('goNewBest').style.display = isNewBest ? 'inline-block' : 'none';

  setTimeout(() => showScreen('gameover', { overlay: true }), 500);
}

/**
 * resetGame() — (re)initializes everything needed to start a fresh
 * run: empties the jar and all effect arrays, zeroes every run stat,
 * clears the flow flags back to "playing", refreshes the HUD, queues
 * up the first fruit to drop, and finally sets `gameOn = true` (which
 * is what allows `step()` and `dropCurrent()` to start doing anything).
 *
 * Called from: main.js's own `btnPlay` and `btnAgain` handlers below
 * (this is literally what "Play" and "Play again" DO).
 */
function resetGame(){
  balls = []; bursts = []; popups = [];
  score = 0; merges = 0; drops = 0; biggestTier = 0; chainN = 0;
  isDead = false; isPaused = false; dropCooldown = 0; shakeMag = 0;
  refreshHud();
  spawnCurrent();
  gameOn = true;
}

/* ═══════════════════ navigation wiring ═══════════════════
   `wire(id, fn)` is a tiny helper so each line below reads as
   "button X does Y" without repeating the
   `document.getElementById(...).addEventListener('click', ...)`
   boilerplate ten times over. Every screen transition in the whole
   game is one of these lines — if you want to see everything the UI
   can do, this block is the map. */
function wire(id, fn){ document.getElementById(id).addEventListener('click', fn); }

/* ---- from the intro/main-menu screen ---- */
wire('btnPlay', () => { resetGame(); showScreen('game'); });
wire('btnGuideHome', () => { buildGuide(); showScreen('guide', { returnTo:'intro' }); });
wire('btnSettingsHome', () => { refreshToggles(); showScreen('settings', { returnTo:'intro' }); });

/* ---- from inside an active game ---- */
wire('btnPause', () => { isPaused = true; showScreen('pause', { overlay:true }); });
wire('btnGuideGame', () => { buildGuide(); showScreen('guide', { overlay:true, returnTo:'game' }); });

/* ---- from the pause screen ---- */
wire('btnResume', () => { isPaused = false; showScreen('game'); });
wire('btnPauseGuide', () => { buildGuide(); showScreen('guide', { overlay:true, returnTo:'pause' }); });
wire('btnPauseSettings', () => { refreshToggles(); showScreen('settings', { overlay:true, returnTo:'pause' }); });
wire('btnQuit', () => {
  // Quitting mid-run counts as ending it for scoring purposes (so
  // `lastScore` reflects the abandoned run), but deliberately does
  // NOT go through `triggerGameOver()` — there's no jar-overflow
  // game-over screen to show, just a plain return to the main menu.
  gameOn = false; isPaused = false; isDead = false;
  lastScore = score;
  setupIntro(); showScreen('intro');
});

/* ---- from the game-over screen ---- */
wire('btnAgain', () => { resetGame(); showScreen('game'); });
wire('btnToMenu', () => { setupIntro(); showScreen('intro'); });

/* ---- closing Settings/Guide returns to wherever they were opened
   FROM, using the `_returnTo` value ui.js's `showScreen` recorded.
   The `overlay` flag is re-derived here (rather than also stored)
   because it only depends on whether we're heading back to 'pause'
   or 'game' (both of which need the jar to stay visible underneath)
   versus 'intro' (which shouldn't show any leftover game screen). ---- */
wire('btnSettingsClose', () => {
  const ov = (_returnTo === 'pause' || _returnTo === 'game');
  showScreen(_returnTo, { overlay: ov });
});
wire('btnGuideClose', () => {
  const ov = (_returnTo === 'pause' || _returnTo === 'game');
  showScreen(_returnTo, { overlay: ov });
});

/**
 * loop(ts) — the main animation loop, driven by
 * `requestAnimationFrame` (which calls this function right before
 * the browser's next repaint, typically ~60 times per second).
 *
 * Responsibilities each frame:
 *   1. Compute `dt`, the elapsed time in SECONDS since the previous
 *      frame, from the timestamp `ts` the browser provides. This is
 *      what makes the game's speed independent of frame rate — a
 *      device running at 30fps still simulates physics at the
 *      correct real-world speed, just in bigger dt steps, rather
 *      than running the whole game in slow motion.
 *   2. Count down `dropCooldown` (always, even while paused — a
 *      deliberate choice: pausing shouldn't "bank" extra drop-speed
 *      for when you unpause, and it doesn't hurt anything either way).
 *   3. Only advance the physics simulation (`step(dt)`) while
 *      actually playing (`gameOn && !isPaused && !isDead`) — this is
 *      THE mechanism that makes pausing work: the loop keeps running
 *      and drawing every frame, it just skips simulating.
 *   4. Always redraw (`drawScene()`), so the last real frame stays
 *      visible (frozen) under the pause/game-over overlay.
 *   5. Schedule itself again via `requestAnimationFrame`, forever
 *      (there's no stop condition — the loop runs for the entire
 *      lifetime of the page).
 *
 * @param {number} ts - a high-resolution timestamp in milliseconds,
 *        passed automatically by `requestAnimationFrame`
 */
function loop(ts){
  if (lastTime === null) lastTime = ts; // first-ever frame: nothing to diff against yet
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;

  if (dropCooldown > 0) dropCooldown -= dt;
  if (gameOn && !isPaused && !isDead) step(dt);
  drawScene();

  requestAnimationFrame(loop);
}

/* ═══════════════════ boot sequence ═══════════════════
   Runs once, immediately, when this script (the last one loaded)
   finishes evaluating — by this point every function/element these
   calls need already exists. Order matters here: the canvas must be
   correctly sized (fitCanvas) before we draw anything or compute any
   wall positions, and the intro screen's content should be ready
   before the player ever sees it. */
fitCanvas();
setupIntro();
refreshToggles();
requestAnimationFrame(loop); // kicks off the loop defined above — from
                             // this point on, the game is "alive" and
                             // will keep drawing every frame, even
                             // though `gameOn` is still false until
                             // the player presses Play.
