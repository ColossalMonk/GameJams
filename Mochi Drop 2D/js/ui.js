/* ═══════════════════════════════════════════════════════════════
   UI.JS
   ------------------------------------------------------------
   Purpose: everything about the menu SCREENS (not the in-jar game
   itself) — showing/hiding them, and populating their dynamic
   content (score badges, the fruit guide list, settings toggles).

   Screen system explained: index.html contains six sibling <div
   class="screen"> elements (intro/game/pause/gameover/settings/guide),
   all stacked on top of each other via CSS (`position:absolute;
   inset:0` — see style.css `.screen`). Only the one(s) with the
   `.active` class are visible/interactive (`.screen.active` sets
   opacity:1 + pointer-events:auto; see style.css). `showScreen()`
   below is the ONLY function that toggles `.active` — every button
   handler in main.js calls it rather than fiddling with classList
   directly, so there's exactly one place that understands "what does
   it mean to navigate to screen X".

   Loaded: 8th, after render.js.
   Depends on: data.js (TIERS, MAX_TIER), state.js (CFG, bestScore,
               lastScore), dom.js (dpr), render.js (drawFace).
   Used by: main.js (every navigation button handler calls
            showScreen/setupIntro/buildGuide/refreshToggles).
═══════════════════════════════════════════════════════════════ */

/** The six screen names, matching the `id="scr-NAME"` elements in
 *  index.html exactly (used to build the SCR lookup below). */
const SCREEN_IDS = ['intro', 'game', 'pause', 'gameover', 'settings', 'guide'];

/** SCR — a name -> DOM element lookup, so the rest of this file
 *  never has to repeat `document.getElementById('scr-' + ...)`. */
const SCR = {};
SCREEN_IDS.forEach(id => SCR[id] = document.getElementById('scr-' + id));

/** Remembers which screen should be returned to when the player
 *  closes Settings or the Fruit Guide — see `showScreen`'s
 *  `returnTo` option and main.js's `btnSettingsClose`/`btnGuideClose`
 *  handlers, which read this value back out. */
let _returnTo = 'intro';

/**
 * showScreen(to, opts) — the single function that controls which
 * screen(s) are visible. All navigation in this game goes through
 * this one function.
 *
 * Two ways it can be used:
 *   - showScreen('game') — hide everything except the 'game' screen.
 *     A normal full-screen switch, e.g. Play button -> game screen.
 *   - showScreen('pause', {overlay:true}) — show 'pause' AND KEEP
 *     'game' visible underneath it. Used for anything that should
 *     visually float on top of the still-visible jar (pause menu,
 *     settings/guide opened mid-game, game-over screen) rather than
 *     replacing it outright. This works because `drawScene()` in
 *     render.js keeps rendering the frozen game canvas regardless of
 *     which screen is active — the overlay screens have a
 *     semi-transparent background (see style.css) so the jar shows
 *     through underneath.
 *
 * @param {string} to - one of SCREEN_IDS; the screen to show
 * @param {object} [opts]
 * @param {boolean} [opts.overlay] - if true, also keep the 'game'
 *        screen active underneath `to`
 * @param {string} [opts.returnTo] - if provided, remembers which
 *        screen a subsequent Settings/Guide "close" button should
 *        return to (stored in `_returnTo`, read by main.js)
 */
function showScreen(to, opts){
  opts = opts || {};
  const overlay = !!opts.overlay;
  if (opts.returnTo) _returnTo = opts.returnTo;
  SCREEN_IDS.forEach(id => {
    const el = SCR[id];
    const keep = (id === to) || (overlay && id === 'game');
    el.classList.toggle('active', keep);
  });
}

/**
 * refreshHud() — pushes the current `score`/`bestScore` values (from
 * state.js) into every HUD element that displays them: the in-game
 * score block AND the pause screen's score summary (both exist as
 * separate DOM elements, so both need updating whenever either
 * value changes).
 *
 * Called from: main.js `onMerge` (score just changed) and
 * main.js `resetGame` (score just reset to 0).
 */
function refreshHud(){
  document.getElementById('scoreVal').textContent = score;
  document.getElementById('bestValGame').textContent = bestScore;
  document.getElementById('pauseScore').textContent = score;
  document.getElementById('pauseBest').textContent = bestScore;
}

/**
 * drawFaceOnto(c, sz, tier) — small helper that clears a thumbnail-
 * sized canvas and draws one centered fruit into it. Used by both
 * `setupIntro` (the row of sample fruits) and `buildGuide` (one row
 * per tier) so they don't each duplicate the same three lines.
 *
 * @param {CanvasRenderingContext2D} c - the thumbnail's own 2D context
 * @param {number} sz   - the thumbnail canvas's CSS size in pixels
 *        (square — used for both centering and radius scaling)
 * @param {number} tier - which fruit tier to draw
 */
function drawFaceOnto(c, sz, tier){
  c.clearRect(0, 0, sz, sz);
  drawFace(c, sz/2, sz/2, TIERS[tier].r * 0.55, tier, 0, 0, 0);
}

/**
 * setupIntro() — refreshes everything dynamic on the intro/main-menu
 * screen: the Best/Last score badges, and the decorative row of five
 * small sample fruits at the top.
 *
 * Called from: main.js's boot sequence (so the menu is populated
 * before the player even sees it), and again every time the player
 * returns to the menu (`btnQuit`, `btnToMenu` handlers in main.js) —
 * re-running it picks up an updated `bestScore`/`lastScore`.
 *
 * The sample-fruit row is built by creating one small <canvas>
 * element PER fruit (rather than one shared canvas), appending it
 * into #introFruits, then drawing into it — a simple way to lay out
 * several independent little canvases using normal CSS flexbox
 * (see style.css `.intro-fruits`) instead of manually positioning
 * circles on one big canvas.
 */
function setupIntro(){
  document.getElementById('introBest').textContent = bestScore;
  document.getElementById('introLast').textContent = lastScore !== null ? lastScore : '\u2014';

  const row = document.getElementById('introFruits');
  row.innerHTML = ''; // clear any previous run's thumbnails before rebuilding
  [0, 1, 2, 3, 4].forEach(idx => {
    const sz = 26 + idx * 7; // each sample fruit a little bigger than the last
    const cv = document.createElement('canvas');
    // Same high-DPI technique as dom.js: internal buffer at `dpr`×
    // resolution, CSS size at the true intended size, then scale the
    // context so drawing code can ignore dpr entirely.
    cv.width = sz * dpr; cv.height = sz * dpr;
    cv.style.width = sz + 'px'; cv.style.height = sz + 'px';
    cv.className = 'mini';
    const cc = cv.getContext('2d');
    cc.setTransform(dpr, 0, 0, dpr, 0, 0);
    row.appendChild(cv);
    drawFaceOnto(cc, sz, idx);
  });
}

/**
 * buildGuide() — (re)builds the Fruit Evolution Guide screen's list:
 * one row per tier, each showing a small drawn fruit, its name, how
 * many points it awards on merge (or "base drop" for Cherry, which
 * can only ever be dropped, never merged into), and a "→" arrow
 * pointing to the next tier (omitted for the last, Watermelon, tier).
 *
 * Called every time the guide is opened (from main.js's
 * `btnGuideHome`/`btnGuideGame`/`btnPauseGuide` handlers) rather than
 * once at boot — cheap enough to rebuild each time, and guarantees
 * the list is never stale.
 */
function buildGuide(){
  const list = document.getElementById('guideList');
  list.innerHTML = '';
  TIERS.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'guide-row';

    const sz = 24 + t.r * 0.6; // bigger fruits get a bigger thumbnail
    const cv = document.createElement('canvas');
    cv.width = sz * dpr; cv.height = sz * dpr;
    cv.style.width = sz + 'px'; cv.style.height = sz + 'px';
    cv.className = 'guide-ball';
    const cc = cv.getContext('2d');
    cc.setTransform(dpr, 0, 0, dpr, 0, 0);

    const info = document.createElement('div');
    info.className = 'guide-info';
    info.innerHTML = '<div class="guide-name">' + t.name + '</div><div class="guide-pts">' +
      (i === 0 ? 'base drop' : '+' + t.pts + ' pts on merge') + (i === MAX_TIER ? ' &middot; top tier' : '') + '</div>';

    row.appendChild(cv);
    row.appendChild(info);
    if (i < MAX_TIER){
      const arr = document.createElement('div');
      arr.className = 'guide-arr'; arr.textContent = '→';
      row.appendChild(arr);
    }
    list.appendChild(row);
    drawFaceOnto(cc, sz, i);
  });
}

/**
 * refreshToggles() — wires up (and visually syncs) every settings
 * toggle button on the Settings screen.
 *
 * Each toggle button in index.html has a `data-key` attribute
 * matching one of CFG's keys (e.g. `data-key="sound"` maps to
 * `CFG.sound`, see state.js). This function does two things for
 * every `.tog` button found:
 *   1. Sets its CSS class to 'tog on' or 'tog off' to match the
 *      CURRENT value of CFG[key] (the visual on/off slider look
 *      comes from the .tog.on/.tog.off rules in style.css).
 *   2. Re-attaches its click handler, which flips CFG[key] and
 *      updates the class again — so the toggle immediately reflects
 *      the new state.
 *
 * Called every time the Settings screen is opened (from main.js's
 * `btnSettingsHome`/`btnPauseSettings` handlers) rather than once at
 * boot. Re-running `onclick = ...` each time is harmless (it just
 * replaces the previous identical handler) and keeps this function
 * simple — no need to track whether listeners were already attached.
 */
function refreshToggles(){
  document.querySelectorAll('.tog').forEach(btn => {
    const k = btn.dataset.key;
    btn.className = 'tog ' + (CFG[k] ? 'on' : 'off');
    btn.onclick = () => {
      CFG[k] = !CFG[k];
      btn.className = 'tog ' + (CFG[k] ? 'on' : 'off');
    };
  });
}
