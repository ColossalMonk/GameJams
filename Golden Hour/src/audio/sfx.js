import * as Tone from 'tone';

/**
 * Story sound effects, all synthesised: a bark, a car sputtering into life, a church bell,
 * a crowd going "aww". Each effect is a short recipe played on a small pool of voices,
 * so several can overlap. A voice that is still busy is skipped rather than interrupted
 * (Tone refuses to schedule a voice back in time), so under heavy load a sound may drop.
 *
 * Names are listed in stories/Story.js (SFX_NAMES); stories cue them with `sounds`.
 */

const POOL = 4;

/** A pooled voice: a Tone instrument, an optional filter, and its own panner. */
function voices(make, dest, filter = false) {
  return Array.from({ length: POOL }, () => {
    const panner = new Tone.Panner(0).connect(dest);
    const f = filter ? new Tone.Filter(1000, 'bandpass').connect(panner) : null;
    const node = make().connect(f || panner);
    return { node, filter: f, panner, busy: 0 };
  });
}

export class Sfx {
  constructor(dest) {
    this.mono = voices(() => new Tone.Synth({ envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.08 } }), dest);
    this.noise = voices(() => new Tone.NoiseSynth({ envelope: { attack: 0.005, decay: 0.2, sustain: 0 } }), dest, true);
    this.membrane = voices(() => new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 4, envelope: { attack: 0.001, decay: 0.25, sustain: 0 } }), dest);
    this.metal = voices(() => new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.4, release: 0.2 }, harmonicity: 5.1, resonance: 3000, octaves: 1.2 }), dest);
    // Polyphonic instruments never clash, so they share one panner each.
    this.bellPan = new Tone.Panner(0).connect(dest);
    this.bells = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 12,
      envelope: { attack: 0.002, decay: 2.2, sustain: 0, release: 1.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.8, sustain: 0 },
      volume: -14,
    }).connect(this.bellPan);
    this.keysPan = new Tone.Panner(0).connect(dest);
    this.keys = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.5, sustain: 0, release: 0.4 },
      volume: -12,
    }).connect(this.keysPan);
  }

  /** Grab a free voice from a pool and reserve it for `dur` seconds. */
  take(pool, dur, pan) {
    const now = Tone.now();
    const v = pool.find((q) => q.busy <= now);
    if (!v) return null;
    v.busy = now + dur + 0.05;
    v.panner.pan.value = pan;
    return v;
  }

  /** Play effect `name` with stereo position pan in [-1, 1]. */
  play(name, pan = 0) {
    const recipe = RECIPES[name];
    if (!recipe) return;
    try {
      recipe(this, Tone.now() + 0.01, Math.max(-1, Math.min(1, pan)));
    } catch {
      // A voice scheduling conflict only costs one sound; never break the game for it.
    }
  }

  // ── Building blocks used by the recipes ──

  /** A pitched voice gliding through freqs over dur. */
  glide(t, pan, { type = 'sine', freqs, dur, vol = -14 }) {
    const v = this.take(this.mono, dur, pan);
    if (!v) return;
    v.node.oscillator.type = type;
    v.node.volume.value = vol;
    v.node.triggerAttackRelease(freqs[0], dur, t);
    const step = dur / (freqs.length - 1 || 1);
    freqs.forEach((f, i) => v.node.frequency.linearRampToValueAtTime(f, t + i * step));
  }

  /** A burst of filtered noise; sweep moves the filter from f0 to f1. */
  hiss(t, pan, { type = 'bandpass', f0 = 1000, f1 = f0, dur = 0.2, attack = 0.005, vol = -16, kind = 'white' }) {
    const v = this.take(this.noise, dur, pan);
    if (!v) return;
    v.node.noise.type = kind;
    v.node.volume.value = vol;
    v.node.envelope.attack = attack;
    v.node.envelope.decay = Math.max(0.01, dur - attack);
    v.filter.type = type;
    v.filter.frequency.setValueAtTime(f0, t);
    v.filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    v.node.triggerAttackRelease(dur, t);
  }

  thump(t, pan, { note = 'C2', dur = 0.2, vol = -10 }) {
    const v = this.take(this.membrane, dur, pan);
    if (!v) return;
    v.node.volume.value = vol;
    v.node.triggerAttackRelease(note, dur, t);
  }

  ring(t, pan, { freq = 800, dur = 0.3, vol = -24 }) {
    const v = this.take(this.metal, dur, pan);
    if (!v) return;
    v.node.volume.value = vol;
    v.node.envelope.decay = dur;
    v.node.triggerAttackRelease(freq, dur, t);
  }

  bell(t, pan, notes, dur = 2) {
    this.bellPan.pan.value = pan;
    this.bells.triggerAttackRelease(notes, dur, t);
  }

  notes(t, pan, seq, gap = 0.09, dur = 0.25) {
    this.keysPan.pan.value = pan;
    seq.forEach((n, i) => this.keys.triggerAttackRelease(n, dur, t + i * gap));
  }
}

/** Each recipe: (sfx, startTime, pan) => schedules the sound. */
const RECIPES = {
  bark: (s, t, p) => {
    s.glide(t, p, { type: 'square', freqs: [480, 260], dur: 0.1, vol: -20 });
    s.hiss(t, p, { f0: 900, dur: 0.08, vol: -24 });
    s.glide(t + 0.18, p, { type: 'square', freqs: [440, 240], dur: 0.1, vol: -21 });
  },
  meow: (s, t, p) => s.glide(t, p, { type: 'triangle', freqs: [520, 820, 760, 460], dur: 0.5, vol: -18 }),
  coo: (s, t, p) => {
    s.glide(t, p, { freqs: [330, 300, 320, 280], dur: 0.45, vol: -20 });
    s.glide(t + 0.5, p, { freqs: [320, 290, 270], dur: 0.35, vol: -22 });
  },
  flap: (s, t, p) => {
    for (let i = 0; i < 6; i++) s.hiss(t + i * 0.07, p, { f0: 1400, dur: 0.05, vol: -22 });
  },
  quack: (s, t, p) => {
    s.glide(t, p, { type: 'sawtooth', freqs: [320, 250], dur: 0.12, vol: -22 });
    s.glide(t + 0.17, p, { type: 'sawtooth', freqs: [330, 240], dur: 0.12, vol: -23 });
  },
  sputter: (s, t, p) => {
    for (let i = 0; i < 5; i++) s.thump(t + i * 0.08 + Math.random() * 0.02, p, { note: 'A0', dur: 0.06, vol: -12 });
    s.hiss(t, p, { type: 'lowpass', f0: 600, f1: 200, dur: 0.45, vol: -22, kind: 'brown' });
  },
  engine: (s, t, p) => {
    s.glide(t, p, { type: 'sawtooth', freqs: [48, 70, 62, 66], dur: 1.1, vol: -22 });
    s.hiss(t, p, { type: 'lowpass', f0: 400, dur: 0.9, vol: -26, kind: 'brown' });
  },
  honk: (s, t, p) => {
    s.glide(t, p, { type: 'square', freqs: [340, 330], dur: 0.16, vol: -22 });
    s.glide(t + 0.24, p, { type: 'square', freqs: [340, 330], dur: 0.26, vol: -22 });
  },
  siren: (s, t, p) => s.glide(t, p, { freqs: [700, 950, 700, 950, 700], dur: 1.4, vol: -22 }),
  jingle: (s, t, p) => s.notes(t, p, ['E6', 'C6', 'D6', 'G5', 'G5', 'D6', 'E6', 'C6'], 0.14, 0.18),
  whistle: (s, t, p) => {
    s.glide(t, p, { freqs: [1650, 1900, 1880], dur: 0.7, vol: -24 });
    s.hiss(t, p, { type: 'highpass', f0: 3000, dur: 0.7, attack: 0.05, vol: -28 });
  },
  brakes: (s, t, p) => s.hiss(t, p, { type: 'highpass', f0: 4000, f1: 2500, dur: 0.5, attack: 0.05, vol: -26 }),
  pop: (s, t, p) => s.thump(t, p, { note: 'G3', dur: 0.06, vol: -14 }),
  cork: (s, t, p) => {
    s.thump(t, p, { note: 'C4', dur: 0.05, vol: -10 });
    s.hiss(t + 0.02, p, { type: 'highpass', f0: 5000, dur: 0.4, vol: -26 });
  },
  clink: (s, t, p) => {
    s.ring(t, p, { freq: 2400, dur: 0.18, vol: -26 });
    s.ring(t + 0.06, p, { freq: 2900, dur: 0.15, vol: -28 });
  },
  splash: (s, t, p) => s.hiss(t, p, { type: 'lowpass', f0: 3500, f1: 400, dur: 0.6, vol: -16 }),
  splat: (s, t, p) => {
    s.hiss(t, p, { type: 'lowpass', f0: 900, f1: 300, dur: 0.14, vol: -16 });
    s.thump(t, p, { note: 'E2', dur: 0.08, vol: -16 });
  },
  crash: (s, t, p) => {
    s.thump(t, p, { note: 'A1', dur: 0.35, vol: -8 });
    s.hiss(t, p, { type: 'lowpass', f0: 6000, f1: 800, dur: 0.7, vol: -14 });
    s.ring(t + 0.02, p, { freq: 520, dur: 0.5, vol: -22 });
  },
  thud: (s, t, p) => s.thump(t, p, { note: 'B1', dur: 0.18, vol: -10 }),
  tear: (s, t, p) => {
    for (let i = 0; i < 7; i++) s.hiss(t + i * 0.035, p, { f0: 2600 + Math.random() * 800, dur: 0.03, vol: -22 });
  },
  whoosh: (s, t, p) => {
    s.hiss(t, p, { f0: 300, f1: 1800, dur: 0.25, attack: 0.12, vol: -20 });
    s.hiss(t + 0.25, p, { f0: 1800, f1: 400, dur: 0.25, vol: -24 });
  },
  swish: (s, t, p) => s.hiss(t, p, { type: 'highpass', f0: 2500, f1: 5000, dur: 0.15, attack: 0.05, vol: -22 }),
  bell: (s, t, p) => s.bell(t, p, ['G3', 'D4'], 2.4),
  chime: (s, t, p) => s.bell(t, p, ['C6', 'G6'], 1.2),
  ding: (s, t, p) => s.bell(t, p, ['E6'], 0.8),
  plink: (s, t, p) => s.notes(t, p, ['C5', 'G5', 'E5'], 0.12, 0.5),
  strum: (s, t, p) => s.notes(t, p, ['E3', 'B3', 'E4', 'G#4', 'B4', 'E5'], 0.025, 0.6),
  drum: (s, t, p) => {
    for (let i = 0; i < 6; i++) s.thump(t + i * 0.07, p, { note: 'D2', dur: 0.06, vol: -14 + i });
    s.ring(t + 0.45, p, { freq: 300, dur: 0.4, vol: -22 });
  },
  trumpet: (s, t, p) => {
    ['G4', 'C5', 'E5', 'G5'].forEach((n, i) => s.glide(t + i * 0.13, p, { type: 'sawtooth', freqs: [Tone.Frequency(n).toFrequency(), Tone.Frequency(n).toFrequency()], dur: i === 3 ? 0.45 : 0.11, vol: -26 }));
  },
  kazoo: (s, t, p) => s.glide(t, p, { type: 'sawtooth', freqs: [392, 440, 392, 494, 392], dur: 0.8, vol: -26 }),
  tada: (s, t, p) => {
    s.notes(t, p, ['C5', 'E5', 'G5'], 0.08, 0.2);
    s.notes(t + 0.26, p, ['C5', 'E5', 'G5', 'C6'], 0, 0.7);
  },
  cheer: (s, t, p) => {
    s.hiss(t, p, { f0: 1100, f1: 1500, dur: 0.9, attack: 0.15, vol: -22, kind: 'pink' });
    s.notes(t + 0.05, p, ['E5', 'G5', 'C6'], 0.06, 0.2);
  },
  aww: (s, t, p) => s.glide(t, p, { type: 'triangle', freqs: [560, 600, 470, 420], dur: 0.8, vol: -22 }),
  gasp: (s, t, p) => s.hiss(t, p, { type: 'highpass', f0: 1800, f1: 3000, dur: 0.25, attack: 0.15, vol: -24 }),
  laugh: (s, t, p) => {
    [520, 500, 470, 440, 420].forEach((f, i) => s.glide(t + i * 0.11, p, { type: 'triangle', freqs: [f, f * 0.92], dur: 0.07, vol: -22 }));
  },
  firework: (s, t, p) => {
    s.thump(t, p, { note: 'F1', dur: 0.3, vol: -10 });
    for (let i = 0; i < 5; i++) s.hiss(t + 0.15 + i * 0.09 + Math.random() * 0.05, p, { type: 'highpass', f0: 4000, dur: 0.04, vol: -24 });
  },
  camera: (s, t, p) => {
    s.thump(t, p, { note: 'C3', dur: 0.04, vol: -16 });
    s.hiss(t, p, { type: 'highpass', f0: 3000, dur: 0.06, vol: -20 });
  },
  ufo: (s, t, p) => s.glide(t, p, { freqs: [620, 780, 640, 820, 660, 900, 700], dur: 1.6, vol: -22 }),
  whale: (s, t, p) => s.glide(t, p, { freqs: [190, 150, 120, 170, 230], dur: 1.8, vol: -18 }),
};
