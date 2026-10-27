/** Small, fast, seedable PRNG (mulberry32). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAX_EVENING = 9999;

export function randomEveningNumber() {
  return 1 + Math.floor(Math.random() * MAX_EVENING);
}

/**
 * One evening = one run. Everything that makes runs differ (sun position, clouds, when
 * moments happen, how they turn out, rare events, the night's request) is drawn from this
 * seeded generator, so the same number always gives the same evening.
 */
export class Evening {
  constructor(number) {
    this.number = number;
    this.random = mulberry32(number * 2654435761);
  }

  range(a, b) {
    return a + (b - a) * this.random();
  }

  chance(p) {
    return this.random() < p;
  }

  pick(list) {
    return list[Math.floor(this.random() * list.length)];
  }
}
