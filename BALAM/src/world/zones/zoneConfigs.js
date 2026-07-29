/**
 * Hand-authored escalation recipes for zones 4-10 (zones 1-3 stay hand-authored, as the
 * tutorial opening). Sizes grow every zone; mechanic combinations stack rather than just
 * swapping one mechanic for another. Reuses the same four gate types throughout — the
 * escalation comes from size, count, and combination, not new one-off systems.
 */
export const ZONE_CONFIGS = [
  {
    id: 'zone4', name: 'The Hollow', width: 20, height: 20,
    features: ['river', 'barrier'], fragmentCount: 1,
    toZone: 'zone5', atmosphereDepth: 0.15,
    introHint: 'Deeper now. A river and a spirit barrier both bar the way — the explorer and the jaguar will each need to answer for themselves.',
  },
  {
    id: 'zone5', name: 'The Root Maze', width: 22, height: 24,
    features: ['vines', 'blocks'], fragmentCount: 1,
    toZone: 'zone6', atmosphereDepth: 0.3,
    introHint: 'A collapsed canopy, and something new: a stone door held shut until weight rests on the plate beyond it. Push what you find.',
  },
  {
    id: 'zone6', name: 'The Sunken Court', width: 24, height: 26,
    features: ['barrier', 'blocks', 'runes'], fragmentCount: 2,
    toZone: 'zone7', atmosphereDepth: 0.45,
    introHint: 'A barrier, a weighted door, and old runes at the corners of this place — all must answer before the way opens.',
  },
  {
    id: 'zone7', name: 'The Flooded Path', width: 26, height: 28,
    features: ['river', 'vines', 'blocks'], fragmentCount: 2,
    toZone: 'zone8', atmosphereDepth: 0.55,
    introHint: 'Water, vines, and a plate-held door in sequence. The jungle is not making this easier.',
  },
  {
    id: 'zone8', name: 'The Deep Runes', width: 28, height: 30,
    features: ['barrier', 'runes', 'blocks', 'vines'], fragmentCount: 2,
    toZone: 'zone9', atmosphereDepth: 0.7,
    introHint: 'Everything you have learned, together: barrier, runes, a weighted door, and vines. Take it one gate at a time.',
  },
  {
    id: 'zone9', name: 'The Last Threshold', width: 30, height: 32,
    features: ['river', 'barrier', 'blocks', 'runes'], fragmentCount: 2,
    toZone: 'zone10', atmosphereDepth: 0.85,
    introHint: 'Almost there. The jungle throws everything it has left.',
  },
  {
    id: 'zone10', name: 'The Dreaming Deep', width: 32, height: 34,
    features: ['vines', 'barrier', 'blocks', 'blocks', 'runes'], fragmentCount: 3,
    toZone: 'center', atmosphereDepth: 1.0, requireTrust: 0.9,
    entryRequirement: { minTrust: 0.7 },
    introHint: 'The center is close. Full trust will be needed before the last door opens — stay close to each other.',
  },
];
