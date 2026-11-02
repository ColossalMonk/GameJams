/**
 * Sound cues for the stories written before stories could declare their own `sounds`.
 * Keyed by story id, then by outcome ('all' applies to every outcome without its own
 * entry). Each cue is [p, name]: play effect `name` when the story reaches p = t − peak.
 * A story's own `sounds` (in its file) win over this table.
 */
export const STORY_SOUNDS = {
  cat: { all: [[0.02, 'meow']] },
  kite: {
    main: [[-1.2, 'swish'], [0, 'whoosh'], [0.15, 'cheer']],
    alt: [[0, 'whoosh'], [0.85, 'thud'], [0.95, 'aww']],
  },
  frisbee: {
    main: [[-0.4, 'whoosh'], [0.05, 'bark'], [0.9, 'cheer']],
    alt: [[-0.4, 'whoosh'], [0.1, 'bark'], [0.9, 'laugh']],
  },
  musician: { all: [[-1.2, 'strum'], [-0.6, 'strum'], [0, 'strum'], [0.1, 'cheer']] },
  birthday: {
    main: [[0, 'whoosh'], [0.15, 'cheer']],
    alt: [[0, 'whoosh'], [0.45, 'pop'], [1.35, 'whoosh'], [1.5, 'cheer']],
  },
  oldCar: {
    main: [[-1.5, 'sputter'], [-0.7, 'sputter'], [0, 'engine'], [0.25, 'cheer']],
    alt: [[-1.5, 'sputter'], [-0.7, 'sputter'], [0, 'crash'], [0.3, 'gasp']],
  },
  wedding: {
    main: [[-2.5, 'bell'], [-0.2, 'whoosh'], [0.05, 'cheer']],
    alt: [[-2.5, 'bell'], [-0.2, 'whoosh'], [1.5, 'thud'], [1.6, 'laugh']],
  },
  proposal: {
    main: [[-0.6, 'gasp'], [0, 'cheer'], [0.2, 'aww']],
    alt: [[-0.3, 'gasp'], [0, 'cheer'], [0.25, 'laugh']],
  },
  rooftopKiss: { main: [[0.05, 'aww']], alt: [[0, 'laugh']] },
  balloon: { all: [[-0.2, 'whoosh']] },
  paperPlane: { all: [[0, 'swish'], [0.6, 'swish']] },
  fireworks: { all: [[-0.8, 'whistle'], [0, 'firework'], [0.45, 'firework']] },
  bannerPlane: { all: [[-1.4, 'engine']], tear: [[-1.4, 'engine'], [0, 'tear'], [0.2, 'gasp']] },
  lostBalloon: {
    main: [[-0.7, 'gasp'], [0.4, 'aww']],
    catch: [[-0.7, 'gasp'], [0.15, 'cheer']],
    snag: [[-0.7, 'gasp'], [0, 'aww']],
  },
  bellRinger: {
    main: [[0, 'bell'], [0.1, 'flap'], [0.35, 'coo']],
    snap: [[-0.1, 'tear'], [0.1, 'thud']],
    stubborn: [[0, 'bell'], [0.1, 'flap'], [0.4, 'coo']],
  },
  train: { main: [[-1, 'whistle'], [0.2, 'chime']], stop: [[-1.5, 'brakes'], [0, 'whistle']] },
  laundry: {
    main: [[-0.5, 'whoosh'], [0.3, 'laugh']],
    line: [[-0.5, 'whoosh'], [0.2, 'gasp']],
    wrap: [[-0.5, 'whoosh'], [0.3, 'laugh']],
  },
  cranePiano: {
    main: [[0, 'plink'], [0.2, 'cheer']],
    swing: [[-0.3, 'whoosh'], [0, 'gasp']],
    drop: [[-0.6, 'tear'], [0, 'crash']],
  },
  beamLunch: { main: [[0, 'clink'], [0.1, 'cheer']], gull: [[-0.55, 'gasp'], [0, 'whoosh'], [0.3, 'laugh']] },
  lastBeamFlag: { main: [[-0.5, 'thud'], [0, 'cheer']], alt: [[0.25, 'whoosh'], [0.4, 'gasp']] },
  opera: {
    main: [[-0.3, 'gasp'], [0, 'aww']],
    crack: [[0, 'aww'], [0.15, 'clink'], [0.45, 'crash']],
    slam: [[0, 'aww'], [0.15, 'thud']],
  },
  fireTruck: {
    main: [[-4, 'siren'], [0, 'meow'], [0.2, 'cheer']],
    walk: [[-4, 'siren'], [0, 'meow']],
    jump: [[-4, 'siren'], [0, 'meow'], [0.1, 'gasp']],
  },
  iceCreamVan: {
    main: [[-4.4, 'jingle'], [0, 'cheer']],
    drop: [[-4.4, 'jingle'], [0, 'splat'], [0.1, 'aww']],
    soldOut: [[-4.4, 'jingle'], [0, 'aww']],
  },
  bus: { main: [[-2.6, 'brakes'], [-2.3, 'honk'], [0, 'cheer']], alt: [[-2.6, 'brakes'], [-2.3, 'honk'], [0.4, 'laugh']] },
  magician: {
    main: [[-0.5, 'drum'], [0, 'tada']],
    doves: [[-0.5, 'drum'], [0, 'flap'], [0.1, 'tada']],
    giant: [[-0.5, 'drum'], [0, 'gasp'], [0.3, 'laugh']],
  },
  balloonSeller: {
    main: [[0, 'whoosh'], [0.2, 'aww']],
    lifted: [[0, 'gasp'], [0.5, 'laugh']],
    keepOne: [[0, 'whoosh'], [0.2, 'cheer']],
  },
  yoga: { main: [[0, 'chime']], topple: [[0, 'thud'], [0.3, 'thud'], [0.6, 'laugh']] },
  cheeseRolling: { main: [[-1, 'cheer'], [0, 'thud'], [0.2, 'cheer']], alt: [[0, 'thud'], [0.3, 'laugh']] },
  ufo: { main: [[-2.2, 'ufo'], [0, 'chime']], photo: [[-2.2, 'ufo'], [0.05, 'camera'], [0.6, 'camera']] },
  whaleCloud: { main: [[0, 'whale']], sun: [[-0.5, 'whale']] },
};

/** The cues for a story's outcome: its own `sounds` if it has any, else this table. */
export function soundsFor(story, outcome) {
  const own = story.outcomes[outcome].sounds;
  if (own?.length) return own;
  const row = STORY_SOUNDS[story.id];
  return row?.[outcome] ?? row?.all ?? [];
}
