/**
 * A story is one small thing that happens in town tonight: someone finally doing
 * something before the end. Stories are data plus a create() function:
 *
 *   defineStory({
 *     id: 'kite',
 *     slot: 'hill',                // or ['road', 'window'] for a story that needs two places
 *     rarity: 'common',            // common | rare | legendary
 *     window: [2.4, 6.0],          // when the peak can happen (seconds into the run)
 *     dur: 0.8,                    // how long the peak lasts
 *     cast: { ada: { kid: true } },// roles, filled by tonight's residents
 *     outcomes: {
 *       main: { weight: 2, tags: ['air'], captions: { peak, near, after, idle } },
 *       alt:  { weight: 1, tags: ['oops'], captions: { … } },
 *     },
 *     create(ctx) {                // build meshes once per evening; ctx.tonight lists tonight's story ids
 *       return {
 *         focus: () => [object3D, …],   // what has to be in frame
 *         update(p, f) { … },           // p = t − peak; f = { wall, dt, outcome }
 *         x: () => number,              // optional: where it is, for the audio pan
 *         visible: (p) => boolean,      // optional: when it can be photographed
 *       };
 *     },
 *   })
 *
 * Captions may use {role} for a resident's first name or {role.last} for their surname.
 */

export const RARITY_CHANCE = { common: 1, rare: 0.3, legendary: 0.02 };

const KINDS = ['peak', 'near', 'after', 'idle'];

export function defineStory(def) {
  const fail = (msg) => {
    throw new Error(`story "${def.id}": ${msg}`);
  };
  if (!def.id) fail('needs an id');
  if (!def.slot) fail('needs a slot');
  if (!Array.isArray(def.window) || def.window.length !== 2) fail('window must be [from, to]');
  if (!(def.dur > 0)) fail('dur must be > 0');
  if (typeof def.create !== 'function') fail('needs create(ctx)');
  if (!def.outcomes?.main) fail('needs outcomes.main');
  for (const [name, o] of Object.entries(def.outcomes)) {
    for (const k of KINDS) if (typeof o.captions?.[k] !== 'string') fail(`outcome "${name}" is missing captions.${k}`);
    o.weight ??= name === 'main' ? 2 : 1;
    o.tags ??= [];
  }
  return {
    rarity: 'common',
    places: ['elm'],
    cast: {},
    ...def,
    slots: Array.isArray(def.slot) ? def.slot : [def.slot],
  };
}

/** Weighted pick of tonight's outcome. */
export function pickOutcome(story, evening) {
  const entries = Object.entries(story.outcomes);
  let r = evening.random() * entries.reduce((s, [, o]) => s + o.weight, 0);
  for (const [name, o] of entries) {
    r -= o.weight;
    if (r <= 0) return name;
  }
  return entries[0][0];
}

/** Replace {role} / {role.last} with tonight's residents' names. */
export function fillCaption(text, names) {
  return text.replace(/\{(\w+)(\.last)?\}/g, (m, role, last) => {
    const who = names[role];
    if (!who) return m;
    return last ? who.last : who.first;
  });
}
