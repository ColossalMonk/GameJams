// ===================================================================
// config.js — all tunable constants for Pop Squad
// ===================================================================

const COLS = 7, ROWS = 9;
const GAME_LEN = 90; // seconds

const COLORS = [
  { name: 'coral', c: '#FF8B8B', d: '#E0615F' },
  { name: 'sunny', c: '#FFE066', d: '#E0B92E' },
  { name: 'mint',  c: '#6EE7B7', d: '#3FBF8F' },
  { name: 'sky',   c: '#7CB4FF', d: '#4C7FDB' },
];

const SIZES = [
  { name: 's', scale: 0.60 },
  { name: 'm', scale: 0.80 },
  { name: 'l', scale: 1.00 },
];

// Power-up critters: colorIdx is -1, identified by `power`.
// chance = probability a spawn roll produces this power-up instead of a normal critter.
const POWER_UPS = {
  rainbow: {
    chance: 0.045,
    label: 'Rainbow',
    ring: ['#FF8B8B', '#FFE066', '#6EE7B7', '#7CB4FF', '#C7A6FF'],
    core: '#FFFDF8',
  },
  bomb: {
    chance: 0.035,
    label: 'Bomb',
    ring: ['#4A3B6B', '#6B5590'],
    core: '#2E2545',
  },
  star: {
    chance: 0.035,
    label: 'Star',
    ring: ['#FFE066', '#FFC93C'],
    core: '#FFF6D6',
  },
};
const POWER_UP_TOTAL_CHANCE = Object.values(POWER_UPS).reduce((s, p) => s + p.chance, 0);

const DIFFICULTIES = {
  easy:   { startInterval: 650, minInterval: 320, ramp: 2.4 },
  normal: { startInterval: 550, minInterval: 220, ramp: 4.0 },
  hard:   { startInterval: 420, minInterval: 150, ramp: 5.5 },
};

const PENTATONIC = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3]; // C D E G A C
