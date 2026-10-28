/**
 * Each evening the town asks for one kind of photo. Taking it is worth a flat bonus, and
 * it gives every run its own goal on top of chasing the score.
 */
export const REQUEST_BONUS = 600;

/** A request met by any photo whose subject carries the tag. Only offered when tonight has one. */
const byTag = (id, tag, text) => ({
  id,
  text,
  test: (photos) => photos.some((p) => p.tags?.includes(tag)),
  needs: (show) => show.moments.some((m) => m.tags.includes(tag)),
});

const REQUESTS = [
  byTag('air', 'air', 'Something in the air'),
  byTag('love', 'love', 'Love at the end of the world'),
  byTag('animal', 'animal', 'A very good animal'),
  byTag('joy', 'joy', 'Someone celebrating'),
  byTag('oops', 'oops', 'Something going wrong'),
  byTag('rare', 'rare', "Something you won't see every evening"),
  byTag('wheels', 'wheels', 'Something on wheels'),
  byTag('finally', 'finally', 'Someone finally finishing something'),
  byTag('falling', 'falling', 'Something falling'),
  byTag('crossover', 'crossover', 'One story landing in another'),
  { id: 'crowd', text: 'Three people in one shot', test: (photos) => photos.some((p) => p.people >= 3) },
  { id: 'sun', text: 'The sun, as big as it gets', test: (photos) => photos.some((p) => p.sunInside && p.t > 15) },
];

/** Pick tonight's request from the ones this evening can actually satisfy. */
export function pickRequest(evening, show) {
  return evening.pick(REQUESTS.filter((r) => !r.needs || r.needs(show)));
}
