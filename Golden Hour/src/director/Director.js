import { RARITY_CHANCE, pickOutcome, offersOf } from '../stories/Story.js';
import { GROUP_WAVE } from '../config.js';

/** Peaks closer than this would ask the player to be in two places at once. */
const MIN_GAP = 0.6;
/** How long a typical build-up runs before its peak. */
const BUILD = 1.5;
/** At most this many build-ups can overlap. */
const MAX_OVERLAP = 2;
/** Tonight's story count is drawn from this range (inclusive). */
const COUNT = [8, 10];
/** At least one story should be able to peak this early, so the first seconds aren't empty. */
const EARLY = 3.0;

/** How often a throw that could land in another story actually does. */
const CROSS_CHANCE = 0.9;
/** How far (in x) a thrown thing can travel to another story. */
const CROSS_REACH = 9;
/** A target's own peak must be at least this far from the landing, so neither is spoiled. */
const CROSS_CLEAR = 1.2;
/** Slots whose people stand still enough to catch something. */
const CATCH_SLOTS = new Set(['pavement', 'park', 'cafe', 'church', 'wall', 'hill', 'kerb', 'rooftop', 'window', 'tower']);

const third = (x) => (x < -4 ? 0 : x > 4 ? 2 : 1);

/**
 * Plans an evening: which stories happen tonight, where, how they turn out and when they
 * peak. Everything is drawn from the evening's seeded generator.
 *
 * Returns [{ story, slots: [slot…], outcome, peak, cross? }]. cross.target is the planned
 * story this one's thrown prop lands in.
 */
export function planEvening(evening, { stories, slots, place = 'elm', only = null }) {
  // 1. Who's eligible tonight: rarity is rolled per story.
  let pool = stories.filter((s) => s.places.includes(place));
  if (only) pool = only.map((id) => pool.find((s) => s.id === id)).filter(Boolean);
  else pool = shuffle(pool.filter((s) => evening.chance(RARITY_CHANCE[s.rarity] ?? 1)), evening);

  // 2. Make sure something happens in the first few seconds: put an early-capable story
  //    first in line, and later schedule it inside the opening seconds.
  let opener = null;
  if (!only) {
    const early = pool.findIndex((s) => s.window[0] <= EARLY);
    if (early >= 0) {
      opener = pool[early];
      pool.unshift(...pool.splice(early, 1));
    }
  }

  // 3. Give each story the slot(s) it needs, until tonight's count is reached.
  const target = only ? pool.length : COUNT[0] + Math.floor(evening.range(0, COUNT[1] - COUNT[0] + 1));
  const used = new Set();
  const chosen = [];
  for (const story of pool) {
    if (chosen.length >= target) break;
    const taken = [];
    for (const type of story.slots) {
      const free = slots.filter((sl) => sl.type === type && !used.has(sl.id) && !taken.includes(sl));
      if (!free.length) break;
      taken.push(evening.pick(free));
    }
    if (taken.length !== story.slots.length) continue;
    for (const sl of taken) used.add(sl.id);
    chosen.push({ story, slots: taken, outcome: pickOutcome(story, evening), peak: 0 });
  }

  // 4. Schedule peaks: the opener first, then the tightest windows.
  const width = (item) => item.story.window[1] - item.story.window[0];
  const order = [...chosen].sort((a, b) => (b.story === opener) - (a.story === opener) || width(a) - width(b));
  const placed = [];
  for (const item of order) {
    let [w0, w1] = item.story.window;
    if (item.story === opener) w1 = Math.min(w1, Math.max(w0, EARLY));
    const where = third(item.slots[0].x);
    let best = null;
    for (let i = 0; i < 40; i++) {
      const peak = evening.range(w0, w1);
      const gap = placed.reduce((g, q) => Math.min(g, Math.abs(q.peak - peak)), Infinity);
      const overlaps = placed.filter((q) => Math.abs(q.peak - peak) < BUILD).length;
      // Prefer the neighbouring peaks in time to be in a different third of the screen.
      const neighbour = placed.reduce((n, q) => (!n || Math.abs(q.peak - peak) < Math.abs(n.peak - peak) ? q : n), null);
      let score = (neighbour && neighbour.where === where ? 0 : 1) + evening.random() * 0.5;
      if (gap < MIN_GAP) score -= 100 - gap * 10; // a clash: only if nothing else fits, and then the least bad
      if (overlaps >= MAX_OVERLAP) score -= 10;
      if (!best || score > best.score) best = { peak, score };
    }
    item.peak = best.peak;
    placed.push({ peak: item.peak, where });
  }

  // 5. Chain: a banner plane on a night with a proposal or a wedding asks the obvious question.
  const banner = chosen.find((item) => item.story.id === 'bannerPlane');
  if (banner?.outcome === 'thanks' && chosen.some((item) => item.story.id === 'proposal' || item.story.id === 'wedding')) {
    banner.outcome = 'main';
  }

  // 6. Crossovers: things thrown in one story land on someone in another nearby.
  if (!only) {
    const targeted = new Set();
    for (const item of chosen) {
      const throws = item.story.outcomes[item.outcome].throws;
      if (!throws || !evening.chance(CROSS_CHANCE)) continue;
      const lands = item.peak + throws.lands;
      if (lands > GROUP_WAVE.start - 0.3) continue;
      const candidates = chosen.filter(
        (o) =>
          o !== item &&
          !targeted.has(o) &&
          CATCH_SLOTS.has(o.slots[0].type) &&
          Math.abs(o.slots[0].x - item.slots[0].x) <= CROSS_REACH &&
          Math.abs(o.peak - lands) > CROSS_CLEAR &&
          throws.kinds.some((k) => offersOf(o.story).has(k)),
      );
      if (!candidates.length) continue;
      const target = evening.pick(candidates);
      targeted.add(target);
      item.cross = { target };
    }
  }
  return chosen;
}

function shuffle(list, evening) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(evening.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
