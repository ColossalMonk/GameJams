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
 *     tags: ['wheels'],            // optional: added to every outcome's tags
 *     outcomes: {
 *       main: { weight: 2, tags: ['air'], captions: { peak, near, after, idle } },
 *       alt:  { weight: 1, tags: ['oops'], captions: { … },
 *               // optional: this outcome throws something that can land in another story.
 *               // lands: seconds after the peak; kinds: 'hand' | 'head' | 'mouth'.
 *               throws: { lands: 1.3, kinds: ['head'], caption: '{target} has a new hat.' } },
 *     },
 *     create(ctx) {                // build meshes once per evening; ctx.tonight lists tonight's story ids
 *       return {
 *         focus: () => [object3D, …],   // what has to be in frame
 *         update(p, f) { … },           // p = t − peak; f = { wall, dt, outcome }
 *         x: () => number,              // optional: where it is, for the audio pan
 *         visible: (p) => boolean,      // optional: when it can be photographed
 *         thrown: object3D,             // optional: the prop that ctx.cross sends to a target
 *       };
 *     },
 *   })
 *
 * Captions may use {role} for a resident's first name or {role.last} for their surname.
 *
 * Crossovers: when the director pairs a throwing outcome with another story tonight,
 * ctx.cross.active is true. The story then flies its prop to ctx.cross.point() (a hand, a
 * head or a mouth in the other story), calls ctx.cross.land() when it arrives, and keeps the
 * prop at ctx.cross.point() afterwards.
 */

export const RARITY_CHANCE = { common: 1, rare: 0.3, legendary: 0.03 };

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
    o.tags = [...new Set([...(o.tags ?? []), ...(def.tags ?? [])])];
    if (o.throws) {
      const t = o.throws;
      if (!(t.lands > 0) || !t.kinds?.length || typeof t.caption !== 'string') fail(`outcome "${name}" throws needs lands, kinds and caption`);
    }
  }
  return {
    rarity: 'common',
    places: ['elm'],
    cast: {},
    ...def,
    slots: Array.isArray(def.slot) ? def.slot : [def.slot],
  };
}

/** What a story's cast can catch: people take things in a hand or on the head, dogs in the mouth, cats on the head. */
export function offersOf(story) {
  const kinds = new Set();
  for (const spec of Object.values(story.cast)) {
    if (spec.kind === 'dog') kinds.add('mouth');
    else if (spec.kind === 'cat') kinds.add('head');
    else {
      kinds.add('hand');
      kinds.add('head');
    }
  }
  return kinds;
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
