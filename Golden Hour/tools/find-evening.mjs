/**
 * Find evenings with something specific in them, for testing in the browser:
 *
 *   node tools/find-evening.mjs crossover        evenings with a crossover
 *   node tools/find-evening.mjs ufo              evenings with the ufo story
 */
import { STORIES } from '../src/stories/registry.js';
import { planEvening } from '../src/director/Director.js';
import { Evening } from '../src/game/Evening.js';
import { SLOTS } from '../src/world/Town.js';

const want = process.argv[2] || 'crossover';
const found = [];
for (let n = 1; n <= 9999 && found.length < 8; n++) {
  const evening = new Evening(n);
  evening.range(-5, 7); // the sun's position, drawn first in main.js
  const plan = planEvening(evening, { stories: STORIES, slots: SLOTS });
  const hits =
    want === 'crossover'
      ? plan.filter((i) => i.cross).map((i) => `${i.story.id}/${i.outcome} → ${i.cross.target.story.id} lands ${(i.peak + i.story.outcomes[i.outcome].throws.lands).toFixed(1)}s`)
      : plan.filter((i) => i.story.id === want).map((i) => `${i.story.id}/${i.outcome} peak ${i.peak.toFixed(1)}s`);
  if (hits.length) found.push(`evening ${n}: ${hits.join('; ')}`);
}
console.log(found.join('\n') || 'none found');
