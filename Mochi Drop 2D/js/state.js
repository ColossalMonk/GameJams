/* ═══════════════════════════════════════════════════════════════
   STATE.JS
   ------------------------------------------------------------
   Purpose: every piece of "mutable truth" the game needs, declared
   in ONE place so every other file can read and change it.

   Why a shared-state file at all, instead of passing values as
   function arguments everywhere? Because this project is split into
   plain <script> tags (not ES modules), and all classic scripts on
   a page share the same global scope. That means a `let` declared
   here is visible to every file loaded after this one — no imports,
   no exports, no build step. It's the simplest possible way to share
   data across files, at the cost of everything being "global".
   (If this project grows much further, the natural next step is to
   convert these into ES modules with explicit `export`/`import`.)

   Loaded: 2nd, right after data.js.
   Depends on: nothing (just declares variables/constants).
   Used by: literally every other file.
═══════════════════════════════════════════════════════════════ */

/**
 * CFG — player-toggleable settings, changed from the Settings screen
 * (ui.js `refreshToggles`) and read by:
 *   - audio.js   (CFG.sound   — mute/unmute all sfx)
 *   - physics.js (CFG.shake   — via effects.js `doShake`)
 *   - effects.js (CFG.particles — skip spawning burst particles)
 *   - render.js  (CFG.guide   — show/hide the dashed aim line)
 *
 * NOTE: this resets to defaults on every page reload. This file
 * deliberately avoids localStorage/sessionStorage because this
 * project runs inside an environment where that API isn't
 * supported — see the note in main.js boot section too.
 */
const CFG = { sound:true, shake:true, particles:true, guide:true };

/** Best score ever reached this session. Updated in main.js `onMerge`
 *  (checked after every merge) and read by ui.js to show the "Best"
 *  badge on the intro screen and in-game HUD. */
let bestScore = 0;

/** Score from the most recently finished run, or null if the player
 *  hasn't lost a game yet this session. Set in main.js `triggerGameOver`
 *  and `btnQuit`'s handler, read by ui.js `setupIntro`. */
let lastScore = null;

/**
 * balls — every fruit currently bouncing around in the jar.
 * Each entry is an object created by physics.js `makeBall`.
 * This array is:
 *   - grown by input.js `dropCurrent` (push a freshly dropped fruit)
 *   - simulated in-place by physics.js `step` (positions/velocities)
 *   - rebuilt (filtered + merged results pushed) by physics.js
 *     `handleMerges` whenever two matching fruits touch
 *   - read (never mutated) by render.js `drawScene` to draw every fruit
 */
let balls = [];

/**
 * bursts — short-lived particle-effect objects spawned on merges
 * (small flying dots + one expanding ring per merge). Created by
 * effects.js `spawnBurst`, animated + culled in physics.js `step`,
 * drawn in render.js `drawScene`.
 */
let bursts = [];

/**
 * popups — floating "+N" score text objects that drift upward and
 * fade out after a merge. Created by effects.js `spawnPopup`,
 * animated + culled in physics.js `step`, drawn in render.js `drawScene`.
 */
let popups = [];

/**
 * idCounter — a simple ever-increasing counter used to give every
 * ball a unique `id` (see physics.js `makeBall`). We need unique IDs
 * because `handleMerges` builds a `Set` of "which balls got consumed
 * by a merge this frame" — comparing object references directly
 * would also work, but IDs make debugging/logging much easier.
 */
let idCounter = 1;

/* ---------- run stats (all reset by main.js `resetGame`) ---------- */

/** Current run's score. Incremented in main.js `onMerge`. */
let score = 0;
/** Total number of merges this run. Incremented in main.js `onMerge`,
 *  shown on the Game Over screen. */
let merges = 0;
/** Total number of fruits dropped this run. Incremented in
 *  input.js `dropCurrent`, shown on the Game Over screen. */
let drops = 0;
/** Highest tier index reached this run (e.g. 10 if you made a
 *  Watermelon). Updated in main.js `onMerge`, shown on Game Over. */
let biggestTier = 0;

/** How many merges have happened back-to-back within the "chain
 *  window" (see main.js `onMerge`'s chainTimer). Drives the
 *  "×N chain!" toast in effects.js `showChainToast`. */
let chainN = 0;
/** Handle for the setTimeout that resets chainN back to 0 once the
 *  player stops chaining merges. Re-armed on every merge in
 *  main.js `onMerge`. */
let chainTimer = null;

/* ---------- flow flags — control which "mode" the game is in ---------- */

/** True while a run is actively playable (not on the intro/pause/
 *  game-over screens). Checked by physics.js `step` (only simulates
 *  when true) and input.js `dropCurrent` (only allows drops when true). */
let gameOn = false;
/** True while the Pause screen is showing. Freezes physics.js `step`
 *  from running (see main.js `loop`) without resetting any state,
 *  so resuming picks up exactly where it left off. */
let isPaused = false;
/** True once the jar has overflowed and the run is over. Sits between
 *  "gameOn just turned false" and "the Game Over screen is showing"
 *  during the brief 500ms transition delay in main.js `triggerGameOver`. */
let isDead = false;

/** Counts down (in seconds) after every drop before another drop is
 *  allowed, so you can't spam-click and dump fruits on top of each
 *  other with no reaction time. Decremented every frame in main.js
 *  `loop`, reset to DROP_COOLDOWN in input.js `dropCurrent`. */
let dropCooldown = 0;

/** The fruit currently "held" above the jar, following the player's
 *  pointer, waiting to be dropped. `null` whenever no fruit is queued
 *  up (briefly, between a drop and the next `spawnCurrent` call).
 *  Shape: { tier, x, blinking }. Set by input.js `spawnCurrent`,
 *  cleared by input.js `dropCurrent`, drawn by render.js `drawScene`. */
let current = null;

/** The player's last known horizontal pointer position in canvas
 *  coordinates, updated on every `pointermove` (input.js) and used
 *  both to position `current` and, in dom.js `fitCanvas`, as a
 *  sensible default before the player has moved the mouse at all. */
let pointerX = 0;

/** Current intensity of the "screen shake" effect (in pixels). Ramped
 *  up by effects.js `doShake` on hard impacts/merges, decayed every
 *  frame in physics.js `step`, and applied as a random camera jitter
 *  in render.js `drawScene`. */
let shakeMag = 0;

/** Timestamp (ms) of the previous animation frame, used by main.js
 *  `loop` to compute `dt` (delta time) — how many seconds passed
 *  since the last frame. `null` until the very first frame runs. */
let lastTime = null;

/* ---------- canvas + jar geometry ----------
   These start out as reasonable defaults, but the REAL values are
   computed by dom.js `fitCanvas()` based on the actual rendered size
   of the .game-area element (so the jar always fits its container,
   including on resize). Every physics/render calculation that needs
   "where's the left wall" etc. reads these same shared variables. */

/** Logical canvas width/height in CSS pixels (not device pixels —
 *  see dom.js for the devicePixelRatio scaling). */
let W = 360, H = 520;
/** Left/right wall x-positions, floor y-position, and the y-position
 *  of the danger line fruit must stay below. All in the same
 *  coordinate space as `balls[i].x/y` and everything drawn on canvas. */
let WALL_L = 14, WALL_R = 346, FLOOR_Y = 506, DANGER_Y = 90;

/* ---------- physics tuning constants ----------
   Tweak these to change how the game *feels*. They're grouped here
   (rather than scattered as magic numbers in physics.js) so you can
   find and adjust the whole "feel" of the simulation in one spot. */

/** Downward acceleration in pixels/second². Higher = fruits fall
 *  and land faster. Used every physics substep in physics.js `step`. */
const GRAVITY = 1400;
/** Velocity retained (0-1) after bouncing off a side wall. Lower =
 *  fruits stick to walls more instead of bouncing off them. */
const WALL_REST = 0.32;
/** Velocity retained (0-1) after bouncing off the floor. */
const FLOOR_REST = 0.26;
/** Velocity retained (0-1) after two fruits collide with each other.
 *  Kept low so stacks feel soft/"squishy" rather than bouncy. */
const BALL_REST = 0.16;
/** Per-substep velocity multiplier that very gently slows everything
 *  down over time (air resistance), preventing perpetual jitter. */
const AIR_DAMP = 0.999;
/** Minimum time (ms) that must pass after a ball merges before it's
 *  allowed to merge again. Prevents the same freshly-created fruit
 *  from instantly re-merging with a neighbor in an unstable chain. */
const MERGE_COOLDOWN = 150;
/** Minimum time (seconds) between drops, see `dropCooldown` above. */
const DROP_COOLDOWN = 0.32;

/**
 * clamp(v, lo, hi) — restrict a number to a range.
 *
 * Tiny helper used throughout the codebase (input.js, dom.js) any
 * time we need to keep a value (usually an x-position) from going
 * outside the jar's walls.
 *
 * @param {number} v  - the value to clamp
 * @param {number} lo - minimum allowed value
 * @param {number} hi - maximum allowed value
 * @returns {number} v, or lo/hi if v was outside that range
 */
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
