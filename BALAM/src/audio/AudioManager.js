import * as Tone from 'tone';
import { Settings } from '../core/Settings.js';

const PENTATONIC = ['C4', 'D4', 'F4', 'G4', 'A4', 'C5'];

export class AudioManager {
  constructor() {
    this.ready = false;
  }

  async init() {
    if (this.ready) return;
    await Tone.start();

    this.masterBus = new Tone.Volume(Tone.gainToDb(Settings.get('masterVolume'))).toDestination();
    this.musicBus = new Tone.Volume(Tone.gainToDb(Settings.get('musicVolume'))).connect(this.masterBus);
    this.sfxBus = new Tone.Volume(Tone.gainToDb(Settings.get('sfxVolume'))).connect(this.masterBus);

    this.crossFade = new Tone.CrossFade(0).connect(this.musicBus);

    // --- Real background music (CC0, OpenGameArt.org) layered under the procedural textures ---
    this.physicalMusic = new Tone.Player({
      url: `${import.meta.env.BASE_URL}audio/jungle-music.ogg`, loop: true, autostart: true, volume: -10,
    }).connect(this.crossFade.a);
    this.spiritMusic = new Tone.Player({
      url: `${import.meta.env.BASE_URL}audio/dream-ambience.mp3`, loop: true, autostart: true, volume: -12,
    }).connect(this.crossFade.b);

    // --- Physical ambient: warm drone + occasional bird pings ---
    this.physicalDrone = new Tone.AMSynth({
      harmonicity: 1.5,
      envelope: { attack: 2, decay: 0.5, sustain: 1, release: 3 },
      volume: -24,
    }).connect(this.crossFade.a);
    this.physicalDrone.triggerAttack('C2');

    this.birdSynth = new Tone.PluckSynth({ volume: -14 }).connect(this.crossFade.a);
    this.birdLoop = new Tone.Loop((time) => {
      if (Math.random() > 0.6) {
        const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
        this.birdSynth.triggerAttack(note, time);
      }
    }, '2n').start(0);

    // --- Spirit ambient: reverb pad + slow pentatonic arpeggio ---
    this.spiritReverb = new Tone.Reverb({ decay: 6, wet: 0.6 }).connect(this.crossFade.b);
    this.spiritPad = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 3, decay: 1, sustain: 0.8, release: 4 },
      volume: -16,
    }).connect(this.spiritReverb);
    this.spiritPad.triggerAttack('C3');

    this.spiritArp = new Tone.Synth({ volume: -20 }).connect(this.spiritReverb);
    let arpIndex = 0;
    this.arpLoop = new Tone.Loop((time) => {
      this.spiritArp.triggerAttackRelease(PENTATONIC[arpIndex % PENTATONIC.length], '4n', time);
      arpIndex++;
    }, '2n').start(0);

    // --- One-shot stings ---
    this.trustLowSynth = new Tone.MetalSynth({ volume: -10 }).connect(this.sfxBus);
    this.trustHighSynth = new Tone.PolySynth(Tone.Synth, { volume: -8 }).connect(this.sfxBus);
    this.gateOpenSynth = new Tone.MembraneSynth({ volume: -6 }).connect(this.sfxBus);
    this.pickupSynth = new Tone.PluckSynth({ volume: -8, dampening: 3000 }).connect(this.sfxBus);
    this.blockThudSynth = new Tone.MembraneSynth({ volume: -10, octaves: 2, pitchDecay: 0.05 }).connect(this.sfxBus);
    this.runeSynth = new Tone.PolySynth(Tone.Synth, { volume: -10 }).connect(this.sfxBus);
    this.dispelSynth = new Tone.NoiseSynth({
      volume: -22, noise: { type: 'pink' }, envelope: { attack: 0.05, decay: 0.8, sustain: 0 },
    }).connect(this.sfxBus);
    this.footstepSynth = new Tone.MembraneSynth({ volume: -26, octaves: 1, pitchDecay: 0.01 }).connect(this.sfxBus);
    this.uiClickSynth = new Tone.PluckSynth({ volume: -16, dampening: 6000 }).connect(this.sfxBus);

    Tone.Transport.start();
    this.ready = true;
    this.ambientPlaying = true;
  }

  /** Stops all music/ambient (background tracks, drone, pad, bird/arp loops) — used when returning to the title screen. SFX stings are unaffected. */
  stopAmbient() {
    if (!this.ready || !this.ambientPlaying) return;
    this.physicalMusic.stop();
    this.spiritMusic.stop();
    this.physicalDrone.triggerRelease();
    this.spiritPad.triggerRelease();
    Tone.Transport.pause();
    this.ambientPlaying = false;
  }

  /** Resumes music/ambient after stopAmbient() — used when starting a new game from the title screen. */
  resumeAmbient() {
    if (!this.ready || this.ambientPlaying) return;
    Tone.Transport.start();
    this.physicalMusic.start();
    this.spiritMusic.start();
    this.physicalDrone.triggerAttack('C2');
    this.spiritPad.triggerAttack('C3');
    this.ambientPlaying = true;
  }

  /** blend 0 = physical, 1 = spirit */
  setLayerBlend(blend) {
    if (!this.ready) return;
    this.crossFade.fade.rampTo(blend, 0.5);
  }

  setMasterVolume(v) {
    if (this.masterBus) this.masterBus.volume.value = Tone.gainToDb(v);
  }

  setMusicVolume(v) {
    if (this.musicBus) this.musicBus.volume.value = Tone.gainToDb(v);
  }

  setSfxVolume(v) {
    if (this.sfxBus) this.sfxBus.volume.value = Tone.gainToDb(v);
  }

  trustLowSting() {
    if (!this.ready) return;
    this.trustLowSynth.triggerAttackRelease('C3', '8n');
  }

  trustHighSting() {
    if (!this.ready) return;
    this.trustHighSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '4n');
  }

  gateOpenSting() {
    if (!this.ready) return;
    this.gateOpenSynth.triggerAttackRelease('C1', '2n');
  }

  pickupSting() {
    if (!this.ready) return;
    const now = Tone.now();
    this.pickupSynth.triggerAttackRelease('C5', '32n', now);
    this.pickupSynth.triggerAttackRelease('E5', '32n', now + 0.06);
    this.pickupSynth.triggerAttackRelease('G5', '16n', now + 0.12);
  }

  blockThudSting() {
    if (!this.ready) return;
    this.blockThudSynth.triggerAttackRelease('C2', '8n');
  }

  runeSting() {
    if (!this.ready) return;
    this.runeSynth.triggerAttackRelease(['E4', 'G4', 'B4'], '8n');
  }

  dispelSting() {
    if (!this.ready) return;
    this.dispelSynth.triggerAttackRelease('4n');
  }

  footstepTick() {
    if (!this.ready) return;
    this.footstepSynth.triggerAttackRelease('C2', '32n');
  }

  uiClickSting() {
    if (!this.ready) return;
    this.uiClickSynth.triggerAttackRelease('A5', '32n');
  }
}
