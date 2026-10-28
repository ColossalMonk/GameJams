/**
 * Tonight's townspeople. Every role a story asks for ("the kid with the kite", "the old
 * driver") is filled by a freshly generated resident: a look for their paper puppet and a
 * name for the captions. Captions only ever use names, never pronouns.
 */

const FIRST = [
  'Ada', 'Kai', 'Lou', 'Rosa', 'Pip', 'June', 'Theo', 'Sam', 'Jo', 'Noor', 'Ezra', 'Mina', 'Tomas',
  'Ife', 'Hana', 'Rafi', 'Lena', 'Omar', 'Bea', 'Kofi', 'Yuki', 'Marta', 'Dev', 'Priya', 'Arlo',
  'Nell', 'Sol', 'Ines', 'Wren', 'Amara', 'Felix', 'Zara', 'Otto', 'Leila', 'Ravi', 'Cleo', 'Bruno',
  'Mei', 'Iris', 'Elio', 'Tess', 'Kenji', 'Asha', 'Milo', 'Rhea', 'Abe', 'Vera', 'Luca', 'Ola',
  'Gus', 'Esme', 'Nico', 'Tilda', 'Rami', 'Suki', 'Hugo', 'Fern', 'Idris', 'Maya', 'Basil',
];
const LAST = [
  'Okafor', 'Lee', 'Alvarez', 'Nakamura', 'Haddad', 'Novak', 'Mensah', 'Rossi', 'Kowalski', 'Singh',
  'Byrne', 'Costa', 'Lindqvist', 'Abara', 'Moreau', 'Tanaka', 'Petrov', 'Osei', 'Fischer', 'Reyes',
  'Duarte', 'Kim', 'Brennan', 'Ito', 'Varga', 'Hale', 'Quinn', 'Adeyemi', 'Sato', 'Marsh',
];
const DOG_NAMES = ['Biscuit', 'Pickles', 'Noodle', 'Waffles', 'Bean', 'Pepper', 'Mochi', 'Gravy', 'Turnip', 'Sprout'];
const CAT_NAMES = ['Mittens', 'Socks', 'Marmalade', 'Professor', 'Fig', 'Pudding', 'Miso', 'Captain'];

const SKIN = ['#f1c7a3', '#eebf9a', '#e0a77e', '#d9a07a', '#c68a5e', '#a8714e', '#8a5a3e', '#6e4630'];
const HAIR = ['#2f2226', '#4a3326', '#6b4636', '#8a5a3a', '#b0453a', '#d9b04a', '#1f1a22', '#3a2a24'];
const GREY = ['#ece6dc', '#d8d2cc', '#bdb6b0'];
const TOPS = ['#d9644a', '#e2574c', '#f2c14e', '#7fae6a', '#3f6f8f', '#2f6f6a', '#c9a4c4', '#7fb3d6', '#b5524a', '#f3ead8', '#e8a35a', '#5f8fb5', '#9a6fb0'];
const BOTTOMS = ['#3f4a6b', '#2f2a30', '#4a3f5c', '#5a4a3a', '#e9d9b6', '#5f8fb5', '#6b4636'];
const DOG_COATS = [
  { coat: '#c98a4b', patch: '#f6e6c8', ear: '#8f5a32' },
  { coat: '#3a3340', patch: '#e9e1d4', ear: '#2a2430' },
  { coat: '#e9e1d4', patch: '#ffffff', ear: '#c9b8a6' },
  { coat: '#8a6a4a', patch: '#d9c2a2', ear: '#5a4030' },
];
const CAT_COATS = [
  { coat: '#e39a55', belly: '#f8dcb4', stripe: '#c47a3a' },
  { coat: '#4a4450', belly: '#d8d2cc', stripe: '#2f2a30' },
  { coat: '#d8d2cc', belly: '#ffffff', stripe: '#a8a09a' },
];

export class Residents {
  constructor(evening) {
    this.evening = evening;
    this.usedFirst = new Set();
    this.usedLast = new Set();
  }

  unique(list, used) {
    const free = list.filter((n) => !used.has(n));
    const name = this.evening.pick(free.length ? free : list);
    used.add(name);
    return name;
  }

  /**
   * A resident for a role.
   * spec: { kind: 'person' | 'dog' | 'cat', kid, old, dress, look: { …Puppet overrides } }
   */
  cast(spec = {}) {
    const e = this.evening;
    if (spec.kind === 'dog') return { first: this.unique(DOG_NAMES, this.usedFirst), last: '', look: { ...e.pick(DOG_COATS), ...spec.look } };
    if (spec.kind === 'cat') return { first: this.unique(CAT_NAMES, this.usedFirst), last: '', look: { ...e.pick(CAT_COATS), ...spec.look } };

    const kid = !!spec.kid;
    const old = !kid && !!spec.old;
    const dress = spec.dress ?? (!kid && e.chance(0.4));
    let hairStyle;
    if (old) hairStyle = e.pick(dress ? ['bun', 'short', 'long'] : ['bald', 'bald', 'short', 'bun']);
    else hairStyle = e.pick(dress ? ['long', 'long', 'bun', 'short'] : ['short', 'short', 'short', 'bun', 'long']);
    const look = {
      kid,
      dress,
      skin: e.pick(SKIN),
      hair: old ? e.pick(GREY) : e.pick(HAIR),
      hairStyle,
      top: e.pick(TOPS),
      bottom: e.pick(BOTTOMS),
      beard: !dress && !kid && e.chance(old ? 0.45 : 0.15),
      height: kid ? e.range(0.58, 0.66) : old ? e.range(0.88, 0.95) : e.range(0.93, 1.04),
      ...spec.look,
    };
    return { first: this.unique(FIRST, this.usedFirst), last: this.unique(LAST, this.usedLast), look };
  }
}
