/* ═══════════════════════════════════════════════════════════════
   DOM.JS
   ------------------------------------------------------------
   Purpose: grab every canvas/element reference the game needs once,
   and own the logic for sizing the canvas correctly (including for
   high-DPI/"retina" screens and window resizing).

   Loaded: 3rd, right after state.js (it assigns into state.js's
   `W, H, WALL_L, WALL_R, FLOOR_Y, DANGER_Y, pointerX` variables).
   Depends on: state.js (writes several of its variables).
   Used by: physics.js/render.js (via `ctx`, `canvas`), input.js
            (via `canvas` for event listeners), ui.js (via `dpr`
            when building crisp preview thumbnails).
═══════════════════════════════════════════════════════════════ */

/** The main jar/game canvas element and its 2D drawing context. */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/** The small "Next fruit" preview canvas in the HUD, and its context.
 *  Drawn onto by render.js `drawPreview` whenever input.js `spawnCurrent`
 *  picks a new upcoming fruit. */
const nextCanvas = document.getElementById('nextCanvas');
const nctx = nextCanvas.getContext('2d');

/** The flex container that the main canvas fills — we measure THIS
 *  element's rendered size (not the canvas's own, which is what
 *  we're about to set) to know how big to make the canvas. */
const gameArea = document.querySelector('.game-area');

/**
 * dpr — devicePixelRatio, e.g. 2 or 3 on most phones and retina
 * displays, 1 on standard desktop monitors.
 *
 * Canvases have two separate sizes: their CSS/layout size (how many
 * pixels they occupy on screen) and their internal pixel-buffer size
 * (how many pixels are actually being drawn into). If we only set the
 * CSS size, the canvas gets stretched and looks blurry on high-DPI
 * screens. The fix, used throughout this file: make the internal
 * buffer `dpr` times bigger than the CSS size, then scale the drawing
 * context by `dpr` so all our drawing code can keep using simple
 * "1 unit = 1 CSS pixel" coordinates without knowing about dpr at all.
 */
const dpr = Math.max(1, window.devicePixelRatio || 1);

/* The next-fruit preview canvas is a fixed size, so we can set up its
   high-DPI scaling once, right here, instead of inside a resize handler. */
const NW = 96, NH = 96;
nextCanvas.width = NW * dpr; nextCanvas.height = NH * dpr;
nctx.setTransform(dpr, 0, 0, dpr, 0, 0);

/**
 * fitCanvas() — (re)sizes the main game canvas to exactly fill its
 * container, and recomputes the jar's wall/floor/danger-line
 * positions to match the new size.
 *
 * Called:
 *   - once at boot, from main.js's boot sequence at the bottom of
 *     main.js, so the canvas is correctly sized before the first
 *     frame ever draws
 *   - again on every browser 'resize' event (see the listener below),
 *     so rotating a phone or resizing a window doesn't leave the jar
 *     the wrong shape or size
 *
 * Side effects: overwrites the shared `W, H, WALL_L, WALL_R, FLOOR_Y,
 * DANGER_Y` variables from state.js, and resizes+rescales `canvas`/`ctx`.
 * Every other file that reads those variables (physics.js for
 * collisions, render.js for drawing, input.js for clamping the
 * aim position) automatically sees the updated values on the very
 * next frame — no extra wiring needed, thanks to shared global state.
 */
function fitCanvas(){
  const rect = gameArea.getBoundingClientRect();
  W = rect.width; H = rect.height;

  // Internal pixel buffer is dpr× bigger than the CSS-visible size...
  canvas.width = W * dpr; canvas.height = H * dpr;
  // ...but the CSS size (what the layout/user actually sees) stays 1:1.
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  // Scale the context so every future ctx.drawX(x, y) call can keep
  // using plain CSS-pixel coordinates; the browser handles the rest.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Jar geometry, recomputed for the new size:
  WALL_L = 14;                          // fixed 14px margin from the left edge
  WALL_R = W - 14;                      // fixed 14px margin from the right edge
  FLOOR_Y = H - 14;                     // fixed 14px margin from the bottom edge
  DANGER_Y = Math.max(70, H * 0.16);    // ~16% down from the top, but never less than 70px

  // If the player hasn't moved their pointer yet (very first load),
  // default the aim position to dead-center instead of the edge.
  if (!pointerX) pointerX = W / 2;
}

// Keep the jar correctly sized/shaped if the browser window (or the
// mobile viewport, e.g. on rotation) changes size after we've booted.
window.addEventListener('resize', fitCanvas);
