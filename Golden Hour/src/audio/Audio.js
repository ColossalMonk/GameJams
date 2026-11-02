import * as Tone from 'tone';
import { GAME_LENGTH } from '../config.js';
import { Sfx } from './sfx.js';

/** Cmaj7 · Am7 · Fmaj7 · G6, one every 2.5 s. */
const CHORDS = [
  ['C3', 'E4', 'G4', 'B4'],
  ['A2', 'E4', 'G4', 'C5'],
  ['F2', 'E4', 'A4', 'C5'],
  ['G2', 'D4', 'G4', 'B4'],
];
const CUE_NOTES = ['E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'];
const CHORD_EVERY = 2.5;

/** Most music layers a run can earn. */
const MAX_LAYERS = 3;

/**
 * Everything is synthesised: a warm pad that swells as the sun grows, a soft chime that
 * tells you where to look when a moment is about to happen, the camera's shutter, and the
 * stories' own sound effects (sfx.js). Every peak you photograph adds a layer to the music
 * (bells, then strings, then a choir), so a good run sounds fuller by the end.
 */
export class Audio {
  constructor() {
    this.ready = false;
    this.lastChord = -1;
    this.cueIndex = 0;
    this.ending = false;
    this.layers = 0;
  }

  async start() {
    if (this.ready) return;
    await Tone.start();
    const master = new Tone.Volume(-4).toDestination();
    this.master = master;
    const reverb = new Tone.Reverb({ decay: 4.5, wet: 0.38 }).connect(master);

    this.padFilter = new Tone.Filter(700, 'lowpass').connect(reverb);
    this.padVolume = new Tone.Volume(-28).connect(this.padFilter);
    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 1.1, decay: 0.6, sustain: 0.7, release: 2.8 },
    }).connect(this.padVolume);

    this.panner = new Tone.Panner(0).connect(reverb);
    this.chime = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.9, sustain: 0, release: 0.8 },
      volume: -12,
    }).connect(this.panner);

    this.bird = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -26,
    }).connect(reverb);

    const shutterFilter = new Tone.Filter(2400, 'highpass').connect(master);
    this.shutterNoise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
      volume: -10,
    }).connect(shutterFilter);
    this.shutterClick = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
      volume: -8,
    }).connect(master);
    this.ticks = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0 },
      volume: -20,
    }).connect(shutterFilter);

    this.box = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 1.2, sustain: 0, release: 1.2 },
      volume: -14,
    }).connect(reverb);

    // Story effects: mostly dry, with a little of the room.
    const sfxBus = new Tone.Volume(-3);
    sfxBus.connect(master);
    sfxBus.connect(new Tone.Volume(-10).connect(reverb));
    this.effects = new Sfx(sfxBus);

    // Music layers earned by catching peaks.
    this.arp = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0, release: 0.6 },
      volume: -22,
    }).connect(reverb);
    const stringFilter = new Tone.Filter(1500, 'lowpass').connect(reverb);
    this.strings = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.9, decay: 0.4, sustain: 0.8, release: 2.2 },
      volume: -32,
    }).connect(stringFilter);
    this.choir = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsine', spread: 18, count: 3 },
      envelope: { attack: 1.2, decay: 0.3, sustain: 0.9, release: 2.5 },
      volume: -28,
    }).connect(reverb);

    this.ready = true;
  }

  startRun() {
    this.lastChord = -1;
    this.cueIndex = 0;
    this.ending = false;
    this.layers = 0;
    if (!this.ready) return;
    this.master.volume.cancelScheduledValues(Tone.now());
    this.master.volume.rampTo(-4, 0.1);
    this.padVolume.volume.value = -28;
    // The bird is one monophonic synth, so chirps must be scheduled in time order.
    let at = Tone.now() + 0.3;
    for (let i = 0; i < 5; i++) {
      this.chirp(at);
      at += 0.6 + Math.random() * 1.2;
    }
  }

  chirp(at) {
    const base = 2600 + Math.random() * 900;
    this.bird.triggerAttackRelease(base, 0.06, at);
    this.bird.frequency.exponentialRampToValueAtTime(base * 1.4, at + 0.05);
    this.bird.triggerAttackRelease(base * 1.1, 0.05, at + 0.12);
  }

  /** Called every frame while playing. */
  update(t) {
    if (!this.ready) return;
    const chord = Math.floor(t / CHORD_EVERY);
    if (chord !== this.lastChord && t < GAME_LENGTH - 2) {
      this.lastChord = chord;
      const notes = CHORDS[chord % CHORDS.length];
      this.pad.triggerAttackRelease(notes, CHORD_EVERY + 0.4);
      this.playLayers(notes);
    }
    const u = Math.min(1, t / 17);
    this.padVolume.volume.value = -28 + 16 * u;
    this.padFilter.frequency.value = 700 + 2600 * u;
    // The final swell is bigger the more layers the run earned.
    if (t > 16.5 && t < 18.4) this.padVolume.volume.value += this.layers * 1.5 * Math.min(1, (t - 16.5) / 1.5);
    if (t > 18.4 && !this.ending) {
      this.ending = true;
      this.master.volume.rampTo(-40, 1.6);
    }
  }

  /** One more peak caught: the music grows a layer. */
  addLayer() {
    this.layers = Math.min(MAX_LAYERS, this.layers + 1);
  }

  playLayers(notes) {
    const now = Tone.now();
    const up = (n, k) => Tone.Frequency(n).transpose(k).toNote();
    if (this.layers >= 1) notes.slice(1).concat(up(notes[1], 12)).forEach((n, i) => this.arp.triggerAttackRelease(up(n, 12), 0.3, now + i * 0.3));
    if (this.layers >= 2) this.strings.triggerAttackRelease(notes.slice(1).map((n) => up(n, -12)), CHORD_EVERY + 0.2, now);
    if (this.layers >= 3) this.choir.triggerAttackRelease(notes.slice(2), CHORD_EVERY + 0.2, now + 0.1);
  }

  /** A story's sound effect, panned to where it happens (world x). */
  sfx(name, x) {
    if (this.ready) this.effects.play(name, x / 11);
  }

  /** A moment is about to happen (or just happened) at world x: chime from that side. */
  cue(kind, x) {
    if (!this.ready) return;
    this.panner.pan.value = Math.max(-1, Math.min(1, x / 11));
    const note = CUE_NOTES[this.cueIndex++ % CUE_NOTES.length];
    if (kind === 'build') this.chime.triggerAttackRelease(note, 0.4);
    else this.chime.triggerAttackRelease([note, Tone.Frequency(note).transpose(7).toNote()], 0.6, undefined, 0.6);
  }

  shutter() {
    if (!this.ready) return;
    const now = Tone.now();
    this.shutterClick.triggerAttackRelease('C2', 0.05, now);
    this.shutterNoise.triggerAttackRelease(0.05, now);
    for (let i = 1; i <= 4; i++) this.ticks.triggerAttackRelease(0.02, now + 0.12 + i * 0.05);
  }

  /** A little music-box phrase for the album. */
  album() {
    if (!this.ready) return;
    this.master.volume.cancelScheduledValues(Tone.now());
    this.master.volume.rampTo(-4, 0.3);
    const notes = ['C5', 'E5', 'G5', 'B5', 'A5', 'G5', 'E5', 'G5', 'C6'];
    const now = Tone.now() + 0.6;
    notes.forEach((n, i) => this.box.triggerAttackRelease(n, 0.5, now + i * 0.28));
  }
}
