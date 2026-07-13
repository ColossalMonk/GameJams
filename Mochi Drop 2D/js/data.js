/* ═══════════════════════════════════════════════════════════════
   DATA.JS
   ------------------------------------------------------------
   Purpose: the "content" of the game — every fruit's stats, and
   the rules for which fruit gets randomly dropped next.

   This file has ZERO dependencies on any other file, and nothing
   in here reads or writes shared game state (no balls, no score).
   That's intentional: keeping pure data/config in its own file
   means you can reskin the whole game (different fruits, sizes,
   colors, scoring curve) without touching any game logic at all.

   Loaded: 1st (nothing else can run without TIERS existing).
   Read by: physics.js, render.js, ui.js, input.js, main.js —
            basically everyone reads TIERS, almost no one writes it.
═══════════════════════════════════════════════════════════════ */

/**
 * TIERS — the ordered list of fruit "evolution" stages, smallest first.
 *
 * Index in this array IS the fruit's tier number everywhere else in
 * the codebase. A ball's `tier` property (see physics.js `makeBall`)
 * is just an index into this array. Merging two fruits of tier N
 * always produces one fruit of tier N+1 (see physics.js `handleMerges`).
 *
 * Fields per fruit:
 *   name    - display name, shown in the "Next" bar and fruit guide (ui.js)
 *   r       - radius in pixels, used directly as the physics collision
 *             radius (physics.js) AND the drawn circle radius (render.js)
 *   pts     - score awarded when THIS tier is created by a merge.
 *             e.g. two Cherries merging into a Strawberry award
 *             Strawberry's `pts` value (1), not Cherry's (0).
 *             This is why tier 0 (Cherry) has pts:0 — you can never
 *             "create" a Cherry by merging, only by dropping it.
 *   base/light/dark - three shades used to build the radial gradient
 *             and outline for this fruit in render.js `drawFace`.
 *   pattern - which decorative overlay render.js `drawPattern` should
 *             draw on top of the fruit (seeds, segments, netting...).
 *             'none' means just the plain gradient + face, no overlay.
 */
const TIERS = [
  { name:'Cherry',     r:13, pts:0,  base:'#ff6b81', light:'#ffd6de', dark:'#e2495f', pattern:'none' },
  { name:'Strawberry', r:17, pts:1,  base:'#ff6f91', light:'#ffd0dc', dark:'#e2436a', pattern:'dots' },
  { name:'Grape',      r:21, pts:3,  base:'#b98af0', light:'#ecdcff', dark:'#8c5cd6', pattern:'none' },
  { name:'Tangerine',  r:25, pts:6,  base:'#ffab3d', light:'#ffe0ae', dark:'#ec8b12', pattern:'segments' },
  { name:'Lemon',      r:29, pts:10, base:'#ffe066', light:'#fff5cc', dark:'#e8c22e', pattern:'none' },
  { name:'Apple',      r:34, pts:15, base:'#ff6161', light:'#ffc0bf', dark:'#df3b3b', pattern:'none' },
  { name:'Pear',       r:40, pts:21, base:'#b3d94c', light:'#e8f5c2', dark:'#8bab2e', pattern:'none' },
  { name:'Peach',      r:47, pts:28, base:'#ffb199', light:'#ffe2d6', dark:'#f0846a', pattern:'none' },
  { name:'Pineapple',  r:54, pts:36, base:'#ffd93d', light:'#fff0b0', dark:'#e0b400', pattern:'grid' },
  { name:'Melon',      r:63, pts:45, base:'#8fd14f', light:'#dcf3c2', dark:'#5fa628', pattern:'net' },
  { name:'Watermelon', r:74, pts:55, base:'#4caf50', light:'#b7e8ba', dark:'#2e7d32', pattern:'stripes' }
];

/**
 * MAX_TIER — index of the last, biggest fruit (Watermelon).
 *
 * Used as a "can this still merge?" guard: physics.js `handleMerges`
 * refuses to merge two Watermelons because there's no tier beyond
 * MAX_TIER to promote them to. Also used by effects.js to size the
 * biggest possible merge-burst ring.
 */
const MAX_TIER = TIERS.length - 1;

/**
 * DROP_POOL — the "grab bag" that rndDrop() picks from.
 *
 * Only the first 5 tiers (Cherry..Lemon) are ever handed to the
 * player to drop — Suika-style games never drop anything bigger,
 * or the jar would fill up in seconds. Weighting is done simply by
 * repeating small indices more often in this array:
 *   tier 0 (Cherry)     appears 6 times  -> ~33% chance
 *   tier 1 (Strawberry) appears 5 times  -> ~28% chance
 *   tier 2 (Grape)      appears 4 times  -> ~22% chance
 *   tier 3 (Tangerine)  appears 2 times  -> ~11% chance
 *   tier 4 (Lemon)      appears 1 time   -> ~6%  chance
 * (percentages out of 18 total entries)
 */
const DROP_POOL = [0,0,0,0,0,0,1,1,1,1,1,2,2,2,2,3,3,4];

/**
 * rndDrop() — picks one random tier index from DROP_POOL.
 *
 * Called by: input.js `spawnCurrent()`, every time the player needs
 * a new fruit to aim and drop.
 *
 * @returns {number} a tier index between 0 and 4 (inclusive)
 */
function rndDrop(){
  return DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)];
}
