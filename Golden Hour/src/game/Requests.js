/**
 * Each evening the town asks for one kind of photo. Taking it is worth a flat bonus, and
 * it gives every run its own goal on top of chasing the score.
 */
export const REQUEST_BONUS = 600;

const byTag = (tag) => (photos) => photos.some((p) => p.tags?.includes(tag));

const REQUESTS = [
  { id: 'air', text: 'Something in the air', test: byTag('air') },
  { id: 'love', text: 'Love at the end of the world', test: byTag('love') },
  { id: 'animal', text: 'A very good animal', test: byTag('animal') },
  { id: 'joy', text: 'Someone celebrating', test: byTag('joy') },
  { id: 'oops', text: 'Something going wrong', test: byTag('oops'), needs: (cast) => cast.moments.some((m) => m.active && m.variant === 'alt') },
  { id: 'rare', text: "Something you won't see every evening", test: byTag('rare'), needs: (cast) => cast.moments.some((m) => m.active && m.rare) },
  { id: 'crowd', text: 'Three people in one shot', test: (photos) => photos.some((p) => p.people >= 3) },
  { id: 'sun', text: 'The sun, as big as it gets', test: (photos) => photos.some((p) => p.sunInside && p.t > 15) },
];

/** Pick tonight's request from the ones this evening can actually satisfy. */
export function pickRequest(evening, cast) {
  return evening.pick(REQUESTS.filter((r) => !r.needs || r.needs(cast)));
}
