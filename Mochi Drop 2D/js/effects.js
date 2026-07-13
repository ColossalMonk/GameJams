/* ═══════════════════════════════════════════════════════════════
   EFFECTS.JS
   ------------------------------------------------------------
   Purpose: all the "juice" — visual/screen feedback that isn't
   strictly necessary for the game to function, but makes merges
   and impacts feel satisfying: particle bursts, floating score
   popups, camera shake, and toast messages.

   Design note: everything here only ever ADDS data to the shared
   `bursts`/`popups` arrays (or bumps `shakeMag`) — it never draws
   anything itself. The actual drawing happens in render.js
   `drawScene`, and the actual aging/removal happens in physics.js
   `step`. This file is intentionally "dumb" — it just spawns effect
   *descriptions* for other files to animate and render.

   Loaded: 5th, after audio.js.
   Depends on: data.js (TIERS, MAX_TIER), state.js (CFG, bursts,
               popups, shakeMag).
   Used by: physics.js `step` (doShake on impacts), main.js `onMerge`
            (spawnBurst, spawnPopup, doShake, showEvoToast,
            showChainToast).
═══════════════════════════════════════════════════════════════ */

/**
 * spawnBurst(x, y, color1, color2) — creates a small particle
 * explosion at a point, used whenever two fruits merge.
 *
 * Produces two kinds of effect objects, both added to the shared
 * `bursts` array (declared in state.js):
 *   1. 16 small dots ("confetti") flying outward in a full circle,
 *      alternating between color1/color2 for a two-tone sparkle,
 *      each with a randomized angle, speed, size, and lifetime so
 *      the burst doesn't look mechanically uniform.
 *   2. One expanding "ring" — a circle outline that grows from
 *      radius 4 up to `TIERS[MAX_TIER].r * 0.9` over its lifetime,
 *      giving a "shockwave" feel.
 *
 * These objects are inert data until physics.js `step` ages them
 * (decrementing `life`, moving the dots by their velocity) and
 * render.js `drawScene` paints them (fading out as `life` approaches 0).
 *
 * @param {number} x,y        - world position where the merge happened
 * @param {string} color1     - hex color of the fruit that merged away
 *                               (TIERS[fromTier].base)
 * @param {string} color2     - hex color of the newly-created fruit
 *                               (TIERS[toTier].base)
 */
function spawnBurst(x, y, color1, color2){
  if (!CFG.particles) return; // respects the Settings > Particles toggle
  const n = 16;
  for (let i = 0; i < n; i++){
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4; // spread evenly around the circle, with a little jitter
    const d = 40 + Math.random() * 46;                     // outward speed
    bursts.push({
      x, y, vx: Math.cos(a) * d, vy: Math.sin(a) * d,
      r: 2.5 + Math.random() * 4,
      color: (i % 2 === 0) ? color1 : color2,
      life: 0.3 + Math.random() * 0.24, maxLife: 0.5
    });
  }
  // One ring per burst, expanding outward and fading — drawn as a
  // stroked circle in render.js (see the `p.ring` branch there).
  bursts.push({ ring:true, x, y, r:4, maxR: TIERS[MAX_TIER].r * 0.9, color: color2, life: 0.35, maxLife: 0.35 });
}

/**
 * spawnPopup(x, y, text, color) — creates a floating text label
 * (e.g. "+6") that drifts upward and fades out.
 *
 * Added to the shared `popups` array; animated (moved up, faded) in
 * physics.js `step`, drawn in render.js `drawScene` using the
 * 'Baloo 2' display font.
 *
 * @param {number} x,y     - world position to start the popup at
 *                            (usually the merge midpoint)
 * @param {string} text    - the label to display, e.g. '+10'
 * @param {string} color   - hex color for the text (usually the new
 *                            fruit's `dark` shade, for readability)
 */
function spawnPopup(x, y, text, color){
  popups.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
}

/**
 * doShake(mag) — increases the current screen-shake intensity.
 *
 * Called from multiple places whenever something impactful happens:
 * physics.js `step` (hard floor landings, hard ball-on-ball impacts)
 * and main.js `onMerge` (every merge, scaled up for bigger tiers).
 * Shake amounts from different sources simply ADD together (capped
 * at 10px) rather than overwrite each other, so e.g. a merge that
 * happens right as a fruit lands hard feels extra chaotic — which
 * is exactly the "juicy" feeling we want.
 *
 * The actual decay (shakeMag *= 0.82 each frame) lives in physics.js
 * `step`, and the actual visual jitter is applied in render.js
 * `drawScene` by nudging the canvas's translation randomly by up to
 * `shakeMag` pixels before drawing anything.
 *
 * @param {number} mag - how much shake to add, in pixels
 */
function doShake(mag){
  if (!CFG.shake) return; // respects the Settings > Screen shake toggle
  shakeMag = Math.min(10, shakeMag + mag);
}

/* setTimeout handles for the two toast messages below, kept here so
   a new toast can cancel/replace a still-visible older one instead of
   them fighting over when to hide. */
let evoTimer = null, chainToastTimer = null;

/**
 * showEvoToast(oldTier, newTier) — briefly shows a banner like
 * "Cherry → Strawberry!" in the middle of the play area.
 *
 * Called from main.js `onMerge` on every single merge. Reuses the
 * same DOM element (#toastEvo, defined in index.html) each time:
 * toggling the CSS class `.show` triggers the fade/scale transition
 * defined in style.css, and the pending hide-timer is always cleared
 * and restarted so rapid merges keep the toast fresh instead of
 * having it flicker hidden and re-shown between merges.
 *
 * @param {number} oldTier - tier index of the fruit that merged away
 * @param {number} newTier - tier index of the fruit it became
 */
function showEvoToast(oldTier, newTier){
  const el = document.getElementById('toastEvo');
  clearTimeout(evoTimer);
  el.textContent = TIERS[oldTier].name + ' → ' + TIERS[newTier].name + '!';
  el.classList.add('show');
  evoTimer = setTimeout(() => el.classList.remove('show'), 1000);
}

/**
 * showChainToast(n) — briefly shows "×N chain!" higher up on screen,
 * for quick back-to-back merges (see main.js `onMerge`'s `chainN`
 * tracking). Font size grows slightly with the chain count (capped
 * at +5 steps) so a big chain visually "shouts louder" than a small one.
 *
 * @param {number} n - current chain count (only called when n > 1)
 */
function showChainToast(n){
  const el = document.getElementById('toastChain');
  el.textContent = n + '× chain!';
  el.style.fontSize = (18 + Math.min(n, 5) * 2.5) + 'px';
  el.classList.add('show');
  clearTimeout(chainToastTimer);
  chainToastTimer = setTimeout(() => el.classList.remove('show'), 1000);
}
