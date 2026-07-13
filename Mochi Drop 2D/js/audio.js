/* ═══════════════════════════════════════════════════════════════
   AUDIO.JS
   ------------------------------------------------------------
   Purpose: every sound effect in the game, synthesized on the fly
   with the Web Audio API — no external .mp3/.wav files to load.

   Why synthesize instead of using sound files? It keeps the whole
   game self-contained (no assets folder, nothing that can 404), and
   a handful of short sine/triangle/sawtooth "beeps" is enough to
   give drops, merges, chains, and game-over each their own distinct
   feel. If you wanted richer sound, this file is where you'd swap
   `beep(...)` calls for `new Audio('drop.mp3').play()` instead.

   Loaded: 4th, after dom.js.
   Depends on: state.js (reads CFG.sound to respect the mute toggle).
   Used by: input.js (sfxDrop), physics.js indirectly via main.js
            (sfxMerge/sfxChain/sfxGameOver are all called from
            main.js `onMerge` / `triggerGameOver`).
═══════════════════════════════════════════════════════════════ */

/**
 * actx — the single shared AudioContext for the whole game.
 * Lazily created (see getCtx below) rather than at page load,
 * because browsers block audio from starting until the user has
 * interacted with the page at least once (autoplay policy).
 */
let actx = null;

/**
 * getCtx() — returns the shared AudioContext, creating it the first
 * time it's needed (which will always be after some user click/tap,
 * satisfying the browser's autoplay restrictions).
 *
 * @returns {AudioContext}
 */
function getCtx(){
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
}

/**
 * beep(freq, type, dur, vol, delay) — plays one short synthesized tone.
 *
 * This is the low-level building block every sfxX() function below
 * is made of; a "sound effect" in this game is just one or two beeps
 * layered together with slightly different pitch/timing.
 *
 * How it works: creates an oscillator (the actual tone generator) and
 * a gain node (volume control) just for this one beep, wires
 * oscillator -> gain -> speakers, then:
 *   - sets the pitch instantly (`setValueAtTime`)
 *   - starts the volume at `vol`
 *   - exponentially fades the volume down to (near) silent by the end
 *     of the duration, using `exponentialRampToValueAtTime` — this is
 *     what makes each beep sound like a short "pluck" or "blip"
 *     instead of an abrupt on/off click
 *   - schedules the oscillator to stop exactly when the fade finishes
 *
 * Both nodes are single-use and garbage-collected automatically once
 * they've finished playing — nothing to clean up manually.
 *
 * @param {number} freq  - pitch in Hz (higher = higher-pitched)
 * @param {string} type  - waveform shape: 'sine' (soft/rounded),
 *                         'triangle' (a bit brighter), or 'sawtooth'
 *                         (buzzy, used for the game-over sound)
 * @param {number} dur   - fade-out duration in seconds
 * @param {number} [vol] - starting volume, 0-1 (default 0.12)
 * @param {number} [delay] - seconds to wait before this beep starts,
 *                           used to layer two beeps as a tiny "riff"
 *                           instead of both starting simultaneously
 */
function beep(freq, type, dur, vol, delay){
  if (!CFG.sound) return; // respects the Settings > Sound FX toggle
  vol = vol || 0.12; delay = delay || 0;
  try{
    const a = getCtx(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime + delay);
    g.gain.setValueAtTime(vol, a.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + delay + dur);
    o.start(a.currentTime + delay); o.stop(a.currentTime + delay + dur);
  }catch(e){
    // Swallow errors silently — e.g. if the browser blocks audio for
    // some reason, the game should keep playing without sound rather
    // than crash.
  }
}

/** Played when a fruit is dropped (input.js `dropCurrent`).
 *  Two quick descending beeps for a light "plop" feel. */
function sfxDrop(){
  beep(280,'sine',0.07,0.09);
  beep(200,'sine',0.09,0.05,0.05);
}

/**
 * Played when two fruits merge (main.js `onMerge`).
 * Pitch scales up with `tier` so bigger merges sound "bigger"/deeper
 * progress rather than every merge sounding identical.
 * @param {number} tier - the tier index of the newly-created fruit
 */
function sfxMerge(tier){
  const f = 200 + tier * 45;
  beep(f, 'triangle', 0.15, 0.14);
  beep(f * 1.5, 'sine', 0.12, 0.09, 0.06);
}

/** Played once when the jar overflows (main.js `triggerGameOver`).
 *  Low, buzzy, descending — a deliberately "sad" sound. */
function sfxGameOver(){
  beep(150,'sawtooth',0.28,0.16);
  beep(110,'sawtooth',0.36,0.12,0.16);
}

/**
 * Played on every merge beyond the first in a quick chain
 * (main.js `onMerge`, when chainN > 1). Pitch rises with the chain
 * count so consecutive chained merges sound like an ascending run.
 * @param {number} n - current chain count (2, 3, 4...)
 */
function sfxChain(n){
  beep(300 + n*35, 'sine', 0.12, 0.13);
  beep(450 + n*35, 'sine', 0.1, 0.09, 0.09);
}
