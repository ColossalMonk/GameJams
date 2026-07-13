/* ═══════════════════════════════════════════════════════════════
   PHYSICS.JS
   ------------------------------------------------------------
   Purpose: the actual game simulation — turning fruits into
   physical circles that fall, bounce, collide, and merge.

   This is a hand-rolled 2D physics engine (no external library).
   The core technique is called "substepping with positional
   correction", explained in detail in `step()` below — it's the
   same family of technique used by real physics engines like Box2D
   or Matter.js, just simplified down to only what circles need.

   Loaded: 6th, after effects.js.
   Depends on: data.js (TIERS, MAX_TIER), state.js (balls, bursts,
               popups, walls, tuning constants), effects.js (doShake).
   Calls into main.js at runtime: `onMerge()` and `triggerGameOver()`
   are DEFINED in main.js but CALLED from this file. That's safe even
   though main.js loads after physics.js, because by the time these
   functions actually get called (during gameplay, well after page
   load), every file has already finished loading and defining its
   functions. Load order only matters for code that *runs immediately*
   at the top level of a file — function bodies are free to reference
   things defined later, as long as they're not CALLED until later too.
═══════════════════════════════════════════════════════════════ */

/**
 * makeBall(x, y, tier, vx, vy) — factory function that creates one
 * fruit's physics/animation state object.
 *
 * Every fruit in the game — whether just dropped (input.js
 * `dropCurrent`) or just created by a merge (this file's
 * `handleMerges`) — is built by this one function, so every fruit
 * always has a consistent, complete set of fields.
 *
 * Field reference:
 *   id        - unique number (see state.js `idCounter`), used by
 *               `handleMerges` to track "which balls got consumed
 *               this frame" without relying on object identity
 *   x, y      - center position, in the same coordinate space as
 *               WALL_L/WALL_R/FLOOR_Y/DANGER_Y
 *   tier      - index into TIERS (data.js) — determines size, color,
 *               points, and pattern
 *   vx, vy    - current velocity (pixels/second), updated every
 *               physics substep in `step()`
 *   r         - collision + draw radius, copied from TIERS so the
 *               physics code never has to look it up repeatedly
 *   squish    - 0-1 "impact flatten" amount, spikes on hard landings/
 *               collisions and decays every frame; render.js uses
 *               this to squash the fruit's drawn shape briefly
 *   pulse     - 0-1 "just born" scale-up amount, set to 1 when a
 *               merge creates this ball, decays every frame; makes
 *               new fruits visibly "pop" into existence a bit bigger
 *               before settling to normal size
 *   age       - seconds since this ball was created, counted up in
 *               `step()`; used to (a) give freshly dropped/merged
 *               balls a brief grace period before they're allowed to
 *               merge again or trigger game-over, and (b) drive the
 *               blink timer
 *   blink/blinking - countdown timers that make the fruit's eyes
 *               close briefly every few seconds (purely cosmetic,
 *               read by render.js `drawFace`)
 *   lastMerge - timestamp (ms) this ball last took part in a merge;
 *               enforces MERGE_COOLDOWN in `handleMerges`
 *   merging   - true for exactly one frame while this ball is in the
 *               process of being consumed by a merge, so it can't
 *               accidentally be matched into a second simultaneous
 *               merge in the same pass
 *
 * @returns {object} a new ball object, NOT yet added to `balls` —
 *          callers are responsible for pushing it themselves.
 */
function makeBall(x, y, tier, vx, vy){
  return {
    id: idCounter++, x, y, tier,
    vx: vx || 0, vy: vy || 0,
    r: TIERS[tier].r,
    squish: 0, pulse: 0,
    age: 0,
    blink: 1 + Math.random() * 3, blinking: 0,
    lastMerge: 0, merging: false
  };
}

/**
 * step(dt) — advances the entire simulation forward by `dt` seconds.
 * This is the single most important function in the whole project;
 * called once per animation frame from main.js `loop`, but only
 * while `gameOn && !isPaused && !isDead`.
 *
 * ── Why "substep" at all? ──────────────────────────────────────
 * If we moved every ball by its full velocity just once per frame,
 * fast-moving or overlapping balls could "tunnel" through each other
 * or through walls, and collision response would look jittery/harsh
 * because we'd be correcting large overlaps in one big jump. Instead,
 * we split each frame into `SUB` (8) smaller slices of time, and
 * fully resolve gravity + collisions within each slice. This is
 * exactly the technique real 2D physics engines use — smaller time
 * steps = a more accurate, more stable simulation, at the cost of
 * doing more math per frame.
 *
 * ── What happens inside each of the 8 substeps ─────────────────
 *   1. Integrate motion: apply gravity, move every ball by its
 *      velocity, apply air drag, and bounce off walls/floor.
 *   2. Resolve ball-vs-ball collisions: push overlapping balls apart
 *      and apply a velocity impulse (like a soft bounce).
 *   3. Run 4 extra "positional correction" passes that ONLY push
 *      balls apart (no velocity changes) — this is what makes big
 *      resting stacks of fruit settle into a stable pile instead of
 *      jittering forever. Impulse-based collision alone tends to
 *      leave tiny overlaps that reintroduce energy into the system
 *      each frame; pure position correction squeezes those out.
 *
 * ── After all substeps, once per frame ─────────────────────────
 *   - decay `squish`/`pulse` (the "juice" animation values)
 *   - age every ball, tick blink timers
 *   - check for merges (`handleMerges`)
 *   - age/move/cull particle bursts and score popups
 *   - decay the screen-shake magnitude
 *   - check the game-over condition
 *
 * @param {number} dt - seconds since the last frame (already capped
 *                       by main.js `loop` indirectly via this
 *                       function's own `Math.min(dt, 1/30)` safety
 *                       clamp, so e.g. switching browser tabs and
 *                       coming back doesn't cause one giant, physics-
 *                       breaking jump)
 */
function step(dt){
  dt = Math.min(dt, 1 / 30); // never simulate more than 1/30s in one go,
                             // even if the real frame gap was longer
                             // (prevents tunneling/explosions after a lag spike)
  const SUB = 8;
  const sdt = dt / SUB;      // each substep advances time by 1/8th of the frame

  for (let s = 0; s < SUB; s++){

    /* ---- 1. integrate motion + wall/floor collisions ---- */
    for (const b of balls){
      if (b.dead) continue;
      b.vy += GRAVITY * sdt;         // gravity pulls every ball downward
      b.vx *= (1 - 0.12);            // extra horizontal drag so fruits
                                      // don't slide around forever once
                                      // they're resting on top of others
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      b.vx *= AIR_DAMP; b.vy *= AIR_DAMP; // gentle overall damping

      // Left/right walls: clamp position back inside, and reverse+
      // dampen horizontal velocity (a soft bounce) only if the ball
      // was still moving INTO the wall (prevents re-reversing a ball
      // that's already moving away, which would add energy for free).
      if (b.x - b.r < WALL_L){ b.x = WALL_L + b.r; if (b.vx < 0) b.vx = -b.vx * WALL_REST; }
      if (b.x + b.r > WALL_R){ b.x = WALL_R - b.r; if (b.vx > 0) b.vx = -b.vx * WALL_REST; }

      // Floor: same idea, plus a couple of "juice" side effects on
      // hard landings — squish the ball visually and shake the screen,
      // scaled by how fast it was falling (`impact`). The `s === 0`
      // guard only triggers this once per FRAME rather than once per
      // substep, so a single hard landing doesn't stack 8 shakes/squishes.
      if (b.y + b.r > FLOOR_Y){
        const impact = b.vy;
        b.y = FLOOR_Y - b.r;
        if (b.vy > 0) b.vy = -b.vy * FLOOR_REST;
        b.vx *= 0.95; // floor friction
        if (impact > 140 && s === 0){
          b.squish = Math.min(1, impact / 1100);
          doShake(Math.min(impact / 260, 3));
        }
      }
    }

    /* ---- 2. ball-vs-ball collision + impulse response ----
       Checks every unique PAIR of balls (i,j with j > i so we never
       compare a pair twice or a ball with itself) — an O(n²) approach.
       That's perfectly fine here because a jar only ever holds up to
       maybe 60-100 fruits at once; a spatial grid/quadtree would be
       overkill for this scale. */
    for (let i = 0; i < balls.length; i++){
      const a = balls[i]; if (a.dead) continue;
      for (let j = i + 1; j < balls.length; j++){
        const b = balls[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx*dx + dy*dy;           // squared distance (cheaper than sqrt)
        const minD = a.r + b.r;             // distance at which the circles just touch
        if (d2 < minD*minD && d2 > 0.0001){ // overlapping (and not exactly coincident)
          const d = Math.sqrt(d2), nx = dx/d, ny = dy/d, ov = minD - d; // ov = how deep they overlap

          // Push the two balls apart along the collision normal,
          // split proportionally to MASS — heavier (bigger) balls
          // move less, lighter balls move more. Mass is approximated
          // as r² (area of a circle scales with r², which feels more
          // physically right than using r directly — a Watermelon
          // should barely budge when a Cherry bumps into it).
          const ma = a.r*a.r, mb = b.r*b.r, mt = ma + mb;
          a.x -= nx*ov*(mb/mt); a.y -= ny*ov*(mb/mt);
          b.x += nx*ov*(ma/mt); b.y += ny*ov*(ma/mt);

          // Velocity impulse: only apply if the balls are still
          // moving TOWARD each other (veln < 0) along the collision
          // normal — otherwise they're already separating and we'd
          // just be adding energy for no reason.
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
          const veln = rvx*nx + rvy*ny;
          if (veln < 0){
            const imp = -(1 + BALL_REST) * veln / 2; // BALL_REST = "bounciness"
            // The 1.4 multiplier here is a hand-tuned "feel" factor —
            // makes collisions a bit snappier than the strict physics
            // formula alone would, so stacks of fruit visibly react
            // to a new fruit landing on them instead of feeling mushy.
            a.vx -= imp*nx*(mb/mt)*1.4; a.vy -= imp*ny*(mb/mt)*1.4;
            b.vx += imp*nx*(ma/mt)*1.4; b.vy += imp*ny*(ma/mt)*1.4;

            const impact = Math.abs(veln);
            if (impact > 160){
              a.squish = Math.min(1, impact/1100); b.squish = Math.min(1, impact/1100);
              doShake(Math.min(impact/320, 2));
            }
          }
        }
      }
    }

    /* ---- 3. extra positional-correction passes (no velocity change) ----
       Runs the SAME overlap-detection as step 2, four more times, but
       ONLY pushes balls apart — it never touches velocity. This is
       what keeps a tall resting stack of fruit visually stable instead
       of slowly jittering/sinking into itself. Real physics engines
       call this general idea "sequential impulse" or "Baumgarte
       stabilization" — running position correction as its own pass,
       separate from velocity resolution, converges toward "no overlaps"
       much faster and more stably than trying to do it all in one shot. */
    for (let pass = 0; pass < 4; pass++){
      for (let i = 0; i < balls.length; i++){
        const a = balls[i]; if (a.dead) continue;
        for (let j = i + 1; j < balls.length; j++){
          const b = balls[j]; if (b.dead) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx*dx + dy*dy;
          const minD = a.r + b.r;
          if (d2 < minD*minD && d2 > 0.0001){
            // Note the extra *0.6 here: we only correct 60% of the
            // overlap per pass rather than 100%, so four passes
            // smoothly converge on "no overlap" instead of the balls
            // overshooting back and forth past each other.
            const d = Math.sqrt(d2), nx = dx/d, ny = dy/d, ov = (minD - d) * 0.6;
            const ma = a.r*a.r, mb = b.r*b.r, mt = ma + mb;
            a.x -= nx*ov*(mb/mt); a.y -= ny*ov*(mb/mt);
            b.x += nx*ov*(ma/mt); b.y += ny*ov*(ma/mt);
          }
        }
      }
    }
  } // end of the 8-substep loop

  /* ---- once-per-frame bookkeeping (not per substep) ---- */
  for (const b of balls){
    b.squish *= 0.85; // exponential decay back toward 0 ("un-squish")
    b.pulse *= 0.82;  // exponential decay back toward 0 ("un-pop")
    b.age += dt;
    b.blink -= dt;
    if (b.blink <= 0){ b.blinking = 0.12; b.blink = 2 + Math.random() * 3; } // trigger a blink, schedule the next one
    if (b.blinking > 0) b.blinking -= dt;
  }

  handleMerges(); // check if any touching same-tier pair should combine

  // Age out and move particle bursts (see effects.js `spawnBurst`).
  // Ring effects don't move, only fade; dot effects fly outward and
  // gradually slow down (the *0.92 velocity decay each frame).
  for (let i = bursts.length - 1; i >= 0; i--){
    bursts[i].life -= dt;
    if (bursts[i].life <= 0) bursts.splice(i, 1);
    else if (!bursts[i].ring){
      bursts[i].x += bursts[i].vx * dt; bursts[i].y += bursts[i].vy * dt;
      bursts[i].vx *= 0.92; bursts[i].vy *= 0.92;
    }
  }
  // Age out and float up score popups (see effects.js `spawnPopup`).
  for (let i = popups.length - 1; i >= 0; i--){
    popups[i].life -= dt; popups[i].y -= 46 * dt; // drift upward at 46px/sec
    if (popups[i].life <= 0) popups.splice(i, 1);
  }

  shakeMag *= 0.82; // screen shake decays back toward 0 every frame

  /* ---- game-over check ----
     A ball triggers game over once it's (a) old enough that it's
     had a fair chance to settle or merge away (b.age > 1.6s — this
     is what stops a fruit that's merely IN TRANSIT past the danger
     line, e.g. bouncing on its way down, from instantly ending the
     game) AND (b) its topmost point is still above the danger line.
     We stop at the very first offending ball each frame — we only
     need to know "is there at least one", not count them all. */
  if (!isDead){
    for (const b of balls){
      if (b.age > 1.6 && (b.y - b.r) < DANGER_Y){ triggerGameOver(); break; }
    }
  }
}

/**
 * handleMerges() — finds every pair of touching, same-tier, not-
 * already-merging balls and combines each pair into one ball of the
 * next tier up. Called once per frame from the end of `step()`.
 *
 * Algorithm, in plain terms:
 *   1. Loop over every unique pair of balls (same O(n²) approach as
 *      collision detection above — simple and fast enough at this scale).
 *   2. Skip pairs that don't qualify: different tiers, already at
 *      MAX_TIER (nothing to merge into), already claimed by another
 *      merge this frame (`consumed`/`merging`), too young
 *      (`a.age > 0.1`) to avoid instantly re-merging a ball the
 *      moment it's created, or still on MERGE_COOLDOWN from a
 *      previous merge.
 *   3. For each qualifying pair: mark both as consumed, compute their
 *      midpoint, create ONE new ball there at the next tier up
 *      (inheriting a damped average of their velocity, with a little
 *      upward "pop" of -70 so the new fruit visibly hops rather than
 *      just silently appearing), and hand off to main.js `onMerge`
 *      for all the score/effects/sound side effects.
 *   4. After scanning every pair, actually remove the consumed balls
 *      and add the newly-created ones — done as a single batch
 *      update at the end (rather than mutating `balls` while looping
 *      over it) to avoid subtle bugs from changing an array's length
 *      mid-iteration.
 *
 * Why `overlap > -2` instead of requiring the circles to overlap
 * (`overlap > 0`)? A small negative tolerance means two same-tier
 * fruits merge as soon as they're touching or very nearly touching,
 * rather than needing to visibly push into each other first — this
 * makes merges feel prompt and responsive instead of delayed.
 *
 * Why the per-ball `merging` flag AND a `consumed` Set? `merging` is
 * checked at the top of each loop iteration to skip a ball that a
 * PREVIOUS pair in this same pass already claimed; `consumed` is the
 * actual bookkeeping used afterward to filter the `balls` array. Both
 * exist so a single ball can never be merged twice in the same frame.
 */
function handleMerges(){
  const now = performance.now();
  const consumed = new Set();
  const toAdd = [];
  for (let i = 0; i < balls.length; i++){
    const a = balls[i]; if (consumed.has(a.id) || a.merging) continue;
    for (let j = i + 1; j < balls.length; j++){
      const b = balls[j]; if (consumed.has(b.id) || b.merging) continue;
      if (a.tier !== b.tier || a.tier >= MAX_TIER) continue;

      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const overlap = a.r + b.r - dist;

      if (overlap > -2 && a.age > 0.1 && b.age > 0.1 &&
          now - a.lastMerge > MERGE_COOLDOWN && now - b.lastMerge > MERGE_COOLDOWN){
        consumed.add(a.id); consumed.add(b.id);
        a.merging = true; b.merging = true;

        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const newTier = a.tier + 1;
        // Average their horizontal velocity (damped by 0.4 so the
        // result doesn't go flying), give it a small upward pop (-70)
        // so the new fruit visibly "hops" into being.
        const nb = makeBall(mx, my, newTier, (a.vx + b.vx) / 2 * 0.4, -70);
        nb.pulse = 1; // triggers the "just born" scale-up animation in render.js
        toAdd.push(nb);

        onMerge(a.tier, newTier, mx, my); // score, sound, particles, toasts (main.js)
        break; // `a` is now consumed — stop looking for a second match for it
      }
    }
  }
  if (consumed.size){
    balls = balls.filter(b => !consumed.has(b.id));
    for (const nb of toAdd) balls.push(nb);
  }
}
