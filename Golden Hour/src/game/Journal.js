/**
 * The journal: a sticker book of every story ending you've photographed at its peak,
 * across all your evenings, kept in this browser. It is purely a record: it never
 * unlocks anything or changes what happens (the jam asks that every run stand alone).
 */
const KEY = 'golden-hour-journal';

export class Journal {
  constructor() {
    this.seen = {};
    this.crossovers = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      this.seen = saved.seen || {};
      this.crossovers = saved.crossovers || 0;
    } catch {
      // Storage can be blocked (private windows, some embeds): the journal just starts empty.
    }
  }

  /** A photo caught a story's ending at its peak. Returns true if it's a new sticker. */
  record(storyId, outcome) {
    const key = `${storyId}/${outcome}`;
    const fresh = !this.seen[key];
    this.seen[key] = true;
    this.save();
    return fresh;
  }

  recordCrossover() {
    this.crossovers++;
    this.save();
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ seen: this.seen, crossovers: this.crossovers }));
    } catch {
      // Not saved; nothing else depends on it.
    }
  }

  /** Every story's endings, with a generic caption and whether you've caught it. */
  pages(stories) {
    return stories.map((s) => ({
      id: s.id,
      rarity: s.rarity,
      endings: Object.entries(s.outcomes).map(([name, o]) => ({
        caption: o.captions.peak.replace(/\{\w+(\.last)?\}/g, 'Someone'),
        seen: !!this.seen[`${s.id}/${name}`],
      })),
    }));
  }

  count(stories) {
    let seen = 0;
    let total = 0;
    for (const s of stories) {
      for (const name of Object.keys(s.outcomes)) {
        total++;
        if (this.seen[`${s.id}/${name}`]) seen++;
      }
    }
    return { seen, total };
  }
}
