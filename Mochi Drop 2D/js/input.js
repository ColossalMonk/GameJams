/* ═══════════════════════════════════════════════════════════════
   INPUT.JS
   ------------------------------------------------------------
   Purpose: turn raw pointer (mouse/touch/pen) input on the canvas
   into game actions — aiming the held fruit, and dropping it.

   Uses Pointer Events (`pointermove`/`pointerdown`) rather than
   separate mouse and touch event listeners — Pointer Events are a
   unified browser API that fires the same way whether the input
   came from a mouse, a finger, or a stylus, so this one set of
   listeners handles desktop AND mobile without any extra branching.

   Loaded: 9th, after ui.js.
   Depends on: data.js (TIERS, rndDrop), state.js (current,
               dropCooldown, gameOn/isPaused/isDead, WALL_L/WALL_R,
               DANGER_Y, clamp), dom.js (canvas, W), audio.js (sfxDrop),
               render.js (drawPreview).
   Calls into physics.js: `makeBall` (builds the dropped fruit's
   physics object).
═══════════════════════════════════════════════════════════════ */

/**
 * pickTier() — thin wrapper around data.js `rndDrop()`.
 *
 * Exists mainly for readability at the call site in `spawnCurrent`
 * ("pick a tier" reads more clearly than "rndDrop" in context) — it's
 * a good example of how a one-line wrapper can still be worth having
 * purely for naming clarity in the code that calls it.
 *
 * @returns {number} a tier index (0-4) for the next droppable fruit
 */
function pickTier(){ return rndDrop(); }

/**
 * spawnCurrent() — chooses the next fruit and puts it "in hand",
 * hovering above the jar for the player to aim.
 *
 * Sets the shared `current` object (state.js) to
 * `{ tier, x, blinking }`, where `x` starts wherever the player's
 * pointer currently is (`pointerX`), clamped so the fruit's edge
 * never starts outside the jar walls. Also updates the "Next" label
 * in the HUD and redraws the small preview thumbnail.
 *
 * Called from:
 *   - main.js `resetGame()`, to queue up the very first fruit of a run
 *   - this file's own `dropCurrent()`, ~60ms after a drop, to queue
 *     up the fruit that follows (the short delay just gives the
 *     drop animation a beat before the next fruit appears)
 */
function spawnCurrent(){
  const tier = pickTier();
  current = {
    tier,
    x: clamp(pointerX, WALL_L + TIERS[tier].r, WALL_R - TIERS[tier].r),
    blinking: 0
  };
  document.getElementById('nextName').textContent = TIERS[tier].name;
  drawPreview(tier);
}

/**
 * dropCurrent() — releases the currently-held fruit into the jar as
 * a real physics object, if the game will currently allow it.
 *
 * Guard conditions (all must pass, checked in this order):
 *   - `gameOn` must be true (not on the intro/game-over screen)
 *   - `!isPaused` (not paused)
 *   - `!isDead` (run hasn't already ended)
 *   - `dropCooldown <= 0` (enough time has passed since the last
 *     drop — see state.js DROP_COOLDOWN — so players can't spam-drop)
 *   - `current` must actually exist (there's a fruit ready to drop)
 *
 * On a successful drop: creates a new ball via physics.js `makeBall`
 * at the held fruit's x position, positioned just above the danger
 * line with a small downward starting velocity (60), pushes it into
 * the shared `balls` array, bumps the `drops` counter, plays the
 * drop sound, resets the cooldown timer, clears `current` (nothing
 * is "in hand" for a brief moment), and schedules `spawnCurrent()`
 * to queue up the next fruit shortly after.
 *
 * Called from: the `pointerdown` listener below (tap/click to drop).
 */
function dropCurrent(){
  if (!gameOn || isPaused || isDead || dropCooldown > 0 || !current) return;
  const t = TIERS[current.tier];
  balls.push(makeBall(current.x, DANGER_Y - t.r - 6, current.tier, 0, 60));
  drops++;
  sfxDrop();
  dropCooldown = DROP_COOLDOWN;
  current = null;
  setTimeout(() => { if (gameOn && !isDead) spawnCurrent(); }, 60);
}

/**
 * pointermove listener — keeps the held fruit following the
 * player's pointer horizontally while they aim.
 *
 * `e.clientX - rect.left` converts the pointer's page-relative
 * position into a position relative to the canvas element itself;
 * multiplying by `(W / rect.width)` then converts from the canvas's
 * on-screen CSS size to our internal logical coordinate space (`W`)
 * — these can differ if the canvas is scaled by CSS/layout, so this
 * conversion keeps aiming accurate regardless of the canvas's actual
 * rendered size on screen.
 */
canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = (e.clientX - rect.left) * (W / rect.width);
  if (current) current.x = clamp(pointerX, WALL_L + TIERS[current.tier].r, WALL_R - TIERS[current.tier].r);
});

/**
 * pointerdown listener — handles both aiming AND dropping in one
 * go, for touch/click input that doesn't necessarily fire a
 * `pointermove` first (e.g. a tap on mobile jumps straight to
 * pointerdown at the touched position, with no preceding hover).
 * Updates `current.x` to the tapped position first, THEN drops —
 * so a single tap anywhere in the jar aims-and-drops in one motion,
 * which feels natural on a touchscreen.
 */
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = (e.clientX - rect.left) * (W / rect.width);
  if (current) current.x = clamp(pointerX, WALL_L + TIERS[current.tier].r, WALL_R - TIERS[current.tier].r);
  dropCurrent();
});
