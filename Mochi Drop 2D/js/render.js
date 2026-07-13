/* ═══════════════════════════════════════════════════════════════
   RENDER.JS
   ------------------------------------------------------------
   Purpose: every pixel drawn on either canvas. This file only
   READS shared state (balls, current, bursts, popups, walls,
   CFG.guide) — it never mutates game logic. That separation
   (physics.js changes the world, render.js just paints a picture
   of it) is a common and useful pattern: you can completely
   redesign how the game LOOKS by only touching this file.

   Draw order inside `drawScene()` matters — later draws appear on
   top of earlier ones, like layers in an image editor:
     danger line → aim guide → falling "current" fruit → all
     settled fruits → particle bursts → score popups

   Loaded: 7th, after physics.js.
   Depends on: data.js (TIERS), state.js/dom.js (canvas/ctx/nctx,
               balls, current, bursts, popups, shakeMag, CFG.guide,
               W/H/WALL_L/WALL_R/FLOOR_Y/DANGER_Y).
   Used by: main.js `loop` (calls drawScene every frame), input.js/
            ui.js (call drawPreview/drawFace to render thumbnails).
═══════════════════════════════════════════════════════════════ */

/**
 * drawStem(c, r) — draws a small brown stem + green leaf at the top
 * of a fruit. Purely decorative, called by `drawFace` for every
 * single fruit regardless of tier, right before the face is drawn,
 * so the stem sits "under" the eyes/blush layer-wise... actually
 * it's drawn UNDER the shine highlight but OVER the pattern, giving
 * a subtle sense of depth without needing real 3D.
 *
 * Assumes the canvas has already been translated so (0,0) is the
 * fruit's center (see `drawFace`, which does `c.translate(x, y)`
 * before calling this) — that's why this function only ever draws
 * relative to the origin, never using `x`/`y` parameters itself.
 *
 * @param {CanvasRenderingContext2D} c - the context to draw into
 *        (either the main game `ctx` or the tiny preview `nctx`)
 * @param {number} r - this fruit's radius, used to scale everything
 *        proportionally so stems look right on both Cherries and
 *        Watermelons alike
 */
function drawStem(c, r){
  c.save();
  c.rotate(-0.35); // tilt the stem slightly for a hand-drawn feel
  c.strokeStyle = '#6b4a2a';
  c.lineWidth = Math.max(1.4, r * 0.09); // never thinner than 1.4px even on tiny fruits
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -r * 0.92);
  c.lineTo(0, -r * 1.28);
  c.stroke();
  c.restore();

  c.save();
  c.fillStyle = '#5fae3d';
  c.beginPath();
  c.ellipse(r * 0.22, -r * 1.18, r * 0.26, r * 0.13, -0.6, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/**
 * drawPattern(c, r, tier) — draws the tier-specific decorative
 * overlay (seeds, citrus segments, pineapple/melon netting,
 * watermelon stripes) on top of a fruit's base color.
 *
 * Which pattern to draw comes from `TIERS[tier].pattern` (data.js).
 * `drawFace` clips to the fruit's circle before calling this, so
 * every pattern here can just draw simple lines/shapes across the
 * full -r..r range without worrying about spilling outside the circle.
 *
 * Coordinates are all relative to the fruit's own center (0,0),
 * same convention as `drawStem` above.
 *
 * @param {CanvasRenderingContext2D} c - context to draw into
 * @param {number} r    - this fruit's radius (for proportional scaling)
 * @param {number} tier - tier index, used to look up TIERS[tier].pattern
 */
function drawPattern(c, r, tier){
  const t = TIERS[tier];
  c.save();
  if (t.pattern === 'dots'){
    // Strawberry seeds: a handful of small pale dots at fixed
    // relative positions (not randomized, so the seed layout looks
    // the same every time this fruit type is drawn — a randomized
    // pattern would look "noisy"/flickery across frames since we
    // redraw every fruit every single frame).
    c.fillStyle = 'rgba(255,255,255,0.55)';
    const pts = [[-0.25,0.15],[0.15,0.35],[-0.05,0.5],[0.3,0.05],[-0.35,-0.05]];
    pts.forEach(p => { c.beginPath(); c.arc(p[0]*r, p[1]*r, r*0.06, 0, Math.PI*2); c.fill(); });
  } else if (t.pattern === 'segments'){
    // Tangerine: lines radiating from the center like citrus segments.
    c.strokeStyle = 'rgba(180,100,10,0.28)';
    c.lineWidth = Math.max(1, r * 0.045);
    for (let i = 0; i < 5; i++){
      const a = (i / 5) * Math.PI * 2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
      c.stroke();
    }
  } else if (t.pattern === 'grid'){
    // Pineapple: a diamond/crosshatch grid of diagonal lines.
    c.strokeStyle = 'rgba(160,120,0,0.28)';
    c.lineWidth = Math.max(1, r * 0.04);
    for (let i = -2; i <= 2; i++){
      c.beginPath(); c.moveTo(-r, i*r*0.36); c.lineTo(r, i*r*0.36 + r*0.5); c.stroke();
      c.beginPath(); c.moveTo(-r, i*r*0.36 + r*0.5); c.lineTo(r, i*r*0.36); c.stroke();
    }
  } else if (t.pattern === 'net'){
    // Melon: a finer crosshatch, same idea as 'grid' but denser and
    // greener, to read as netted melon skin rather than pineapple scales.
    c.strokeStyle = 'rgba(60,120,20,0.3)';
    c.lineWidth = Math.max(1, r * 0.035);
    for (let i = -3; i <= 3; i++){
      c.beginPath(); c.moveTo(-r, i*r*0.28); c.lineTo(r, i*r*0.28 + r*0.35); c.stroke();
      c.beginPath(); c.moveTo(-r, i*r*0.28 + r*0.35); c.lineTo(r, i*r*0.28); c.stroke();
    }
  } else if (t.pattern === 'stripes'){
    // Watermelon: thick curved vertical stripes (quadratic curves
    // instead of straight lines, so they bow slightly like a real
    // watermelon's rind pattern rather than looking like a beach ball).
    c.strokeStyle = 'rgba(30,90,20,0.4)';
    c.lineWidth = r * 0.16;
    c.lineCap = 'round';
    for (let i = -2; i <= 2; i++){
      c.beginPath();
      c.moveTo(i*r*0.38, -r*0.9);
      c.quadraticCurveTo(i*r*0.5, 0, i*r*0.38, r*0.9);
      c.stroke();
    }
  }
  // t.pattern === 'none' falls through with no drawing at all —
  // those fruits rely on just the gradient fill for visual interest.
  c.restore();
}

/**
 * drawFace(c, x, y, r, tier, blinking, squish, pulse) — draws one
 * complete fruit: gradient body, tier pattern, stem, shine highlight,
 * eyes (open or blinking), blush, and smile. This is THE core visual
 * building block of the whole game — every fruit anywhere on screen
 * (falling, settled, in the "Next" preview, in the fruit guide, in
 * the intro screen's row of sample fruits) is drawn by this same
 * function, just with different arguments.
 *
 * Squish/pulse explanation: rather than actually deforming the
 * circle's path, we scale the WHOLE canvas non-uniformly right
 * before drawing (`c.scale(sx, sy)`) — squishing flattens vertically
 * and widens horizontally (`sy < 1 < sx`), which reads as "just got
 * squashed by an impact"; pulsing scales both axes up equally
 * (`scaleBoost > 1`), which reads as "just popped into existence".
 * Both are just numbers between 0-1 supplied by the caller (usually
 * a ball's own `.squish`/`.pulse` fields from physics.js), decaying
 * back toward 0 every frame in physics.js `step`.
 *
 * @param {CanvasRenderingContext2D} c - context to draw into (lets
 *        this same function serve both the big game canvas AND the
 *        tiny preview canvases used elsewhere)
 * @param {number} x,y       - where to center this fruit
 * @param {number} r         - radius to draw at (not always
 *        TIERS[tier].r directly — preview thumbnails pass a scaled-
 *        down radius so they fit in a small box)
 * @param {number} tier      - which TIERS entry to use for colors/pattern
 * @param {number} blinking  - >0 means "draw closed eyes right now"
 *        (a countdown in seconds, but only its sign is checked here)
 * @param {number} squish    - 0-1 impact-flatten amount
 * @param {number} pulse     - 0-1 "just born" scale-up amount
 */
function drawFace(c, x, y, r, tier, blinking, squish, pulse){
  const scaleBoost = 1 + (pulse || 0) * 0.22;
  const sx = (1 + squish * 0.22) * scaleBoost;
  const sy = (1 - squish * 0.22) * scaleBoost;
  c.save();
  c.translate(x, y);
  c.scale(sx, sy);
  // From this point on, (0,0) IS this fruit's center, and 1 unit of
  // x/y is already squish/pulse-adjusted — every helper called below
  // (drawPattern, drawStem) and every coordinate in this function can
  // just work in simple "relative to center" terms.

  const t = TIERS[tier];

  // Body: a radial gradient from `light` (upper-left, simulating a
  // light source) fading to `base` at the edges, giving each fruit a
  // soft glossy/rounded look instead of flat single-color circles.
  const grad = c.createRadialGradient(-r*0.35, -r*0.4, r*0.1, 0, 0, r*1.1);
  grad.addColorStop(0, t.light);
  grad.addColorStop(1, t.base);
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI*2);
  c.fillStyle = grad; c.fill();
  c.lineWidth = Math.max(1.5, r*0.05);
  c.strokeStyle = t.dark; c.stroke();

  // Clip to the fruit's own circle before drawing the tier pattern,
  // so segment lines/stripes/netting never spill outside the fruit's
  // silhouette even though drawPattern's own math draws from -r to r.
  c.save();
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI*2); c.clip();
  drawPattern(c, r, tier);
  c.restore();

  drawStem(c, r);

  // Shine: a soft white ellipse in the upper-left, the classic
  // "glossy candy" highlight trick.
  c.beginPath();
  c.ellipse(-r*0.32, -r*0.4, r*0.32, r*0.18, -0.5, 0, Math.PI*2);
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.fill();

  // Eyes: either two filled dots (open) or two short horizontal
  // lines (closed/blinking), chosen by the `blinking` countdown that
  // physics.js `step` ticks down on every ball.
  const eyeOffX = r*0.32, eyeY = r*0.02;
  if (blinking > 0){
    c.strokeStyle = '#5a3a4a';
    c.lineWidth = Math.max(1.2, r*0.09);
    c.beginPath();
    c.moveTo(-eyeOffX-r*0.14, eyeY); c.lineTo(-eyeOffX+r*0.14, eyeY);
    c.moveTo(eyeOffX-r*0.14, eyeY); c.lineTo(eyeOffX+r*0.14, eyeY);
    c.stroke();
  } else {
    const eyeR = Math.max(1.2, r*0.09);
    c.fillStyle = '#5a3a4a';
    c.beginPath();
    c.arc(-eyeOffX, eyeY, eyeR, 0, Math.PI*2);
    c.arc(eyeOffX, eyeY, eyeR, 0, Math.PI*2);
    c.fill();
  }

  // Blush: two soft pink ellipses below the eyes.
  c.fillStyle = 'rgba(255,120,150,0.42)';
  c.beginPath();
  c.ellipse(-r*0.55, r*0.28, r*0.18, r*0.11, 0, 0, Math.PI*2);
  c.ellipse(r*0.55, r*0.28, r*0.18, r*0.11, 0, 0, Math.PI*2);
  c.fill();

  // Smile: a short downward arc.
  c.strokeStyle = '#5a3a4a';
  c.lineWidth = Math.max(1.2, r*0.07);
  c.beginPath();
  c.arc(0, r*0.18, r*0.22, 0.15*Math.PI, 0.85*Math.PI);
  c.stroke();

  c.restore(); // undo the translate+scale, back to normal canvas coordinates
}

/**
 * drawPreview(tier) — redraws the small "Next fruit" thumbnail canvas.
 * Called from input.js `spawnCurrent` every time a new upcoming
 * fruit is chosen, so the HUD always shows what's coming next.
 *
 * @param {number} tier - tier index to preview
 */
function drawPreview(tier){
  nctx.clearRect(0, 0, NW, NH);
  drawFace(nctx, NW/2, NH/2, TIERS[tier].r * 0.6, tier, 0, 0, 0); // scaled down (*0.6) to fit the small box
}

/**
 * hexAlpha(hex, alpha) — converts a "#rrggbb" hex color string plus
 * a separate opacity value into an "rgba(r,g,b,a)" CSS color string.
 *
 * Why needed: TIERS colors (data.js) are stored as plain hex strings
 * for readability, but fading particle/popup effects need to animate
 * OPACITY over time, which hex strings can't express on their own.
 * This is the small conversion glue between "designer-friendly hex"
 * and "canvas-friendly rgba with alpha".
 *
 * @param {string} hex   - color like '#ff6b81'
 * @param {number} alpha - desired opacity, will be clamped to 0-1
 * @returns {string} e.g. 'rgba(255,107,129,0.5)'
 */
function hexAlpha(hex, alpha){
  alpha = Math.max(0, Math.min(1, alpha));
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0,2), 16);
  const g = parseInt(h.substring(2,4), 16);
  const b = parseInt(h.substring(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * drawScene() — clears and redraws the ENTIRE main game canvas for
 * the current frame. Called once per frame from main.js `loop`,
 * unconditionally (even while paused or dead), so the last frame's
 * picture stays frozen/visible under the pause/game-over overlays
 * instead of going blank.
 *
 * Draw order (each layer drawn on top of the previous):
 *   1. screen-shake camera offset (applied via ctx.translate, so
 *      EVERYTHING drawn after this point shifts together)
 *   2. dashed danger line
 *   3. (if a fruit is queued up) the dashed aim-guide line + the
 *      currently-held fruit itself, hovering above the jar
 *   4. every settled/falling fruit in `balls`
 *   5. particle bursts (dots + expanding rings)
 *   6. floating score popups (drawn last so text stays readable
 *      on top of everything else)
 */
function drawScene(){
  ctx.clearRect(0, 0, W, H);
  ctx.save();

  // Screen shake: nudge the whole drawing by a random small offset
  // each frame, shrinking as shakeMag decays (see physics.js `step`).
  if (shakeMag > 0.05){
    ctx.translate((Math.random()-0.5) * shakeMag, (Math.random()-0.5) * shakeMag);
  }

  // Danger line — the line fruit must stay below, or it's game over
  // (see physics.js `step`'s game-over check).
  ctx.strokeStyle = '#ffb3d9';
  ctx.setLineDash([6,6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WALL_L, DANGER_Y); ctx.lineTo(WALL_R, DANGER_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // The fruit currently being aimed (not yet dropped/added to `balls`).
  // Only drawn while actually playing — not during pause/dead, so it
  // doesn't hover oddly over the pause/game-over overlay.
  if (current && gameOn && !isDead && !isPaused){
    if (CFG.guide){ // Settings > Drop guide toggle
      ctx.strokeStyle = 'rgba(255,140,180,0.32)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4,6]);
      ctx.beginPath();
      ctx.moveTo(current.x, DANGER_Y - TIERS[current.tier].r);
      ctx.lineTo(current.x, FLOOR_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawFace(ctx, current.x, DANGER_Y - TIERS[current.tier].r - 6, TIERS[current.tier].r, current.tier, current.blinking > 0 ? current.blinking : 0, 0, 0);
  }

  // Every fruit actually in play.
  for (const b of balls){
    drawFace(ctx, b.x, b.y, b.r, b.tier, b.blinking, b.squish, b.pulse);
  }

  // Particle bursts from merges (see effects.js `spawnBurst`).
  for (const p of bursts){
    if (p.ring){
      const k = 1 - p.life / p.maxLife; // 0 -> 1 as the ring ages
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + k * p.maxR, 0, Math.PI*2); // grows over time
      ctx.strokeStyle = hexAlpha(p.color, 1-k);           // fades over time
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI*2); // shrinks as it fades
      ctx.fillStyle = hexAlpha(p.color, p.life / p.maxLife);
      ctx.fill();
    }
  }

  // Floating "+N" score popups (see effects.js `spawnPopup`).
  for (const s of popups){
    ctx.font = "700 15px 'Baloo 2', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = hexAlpha(s.color, s.life / s.maxLife);
    ctx.fillText(s.text, s.x, s.y);
  }

  ctx.restore(); // undo the screen-shake translate for the next frame
}
