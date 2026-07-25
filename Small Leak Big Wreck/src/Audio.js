// Audio.js
// Web Audio graph + persisted volume model. No cue FILES are wired yet -
// MANIFEST is filled in during the asset-sourcing pass once real CC0 sound
// files are downloaded into assets/audio/; until then every entry is null
// and playSfx/playMusic on it is a silent no-op, so this module is safe to
// call from anywhere before assets exist. `registerBuffer` lets a caller
// (e.g. a procedural fallback for cues with no good real-file match) hand
// in an AudioBuffer directly instead of going through MANIFEST/fetch.

const STORAGE_KEY = 'slbw.audioSettings';
const DEFAULT_VOLUMES = { master: 1, music: 0.8, sfx: 1 };

// Logical cue name -> relative path under assets/audio/, sourced from
// three CC0 (public domain) Kenney.nl packs - see assets/audio/LICENSE_*.
// `leak.drip` and `fire.crackle` have no good match in any of them (impact/
// interface/music-jingles - none are ambient/fire-focused), so those two
// are synthesized at runtime instead (see synthDrip/synthCrackle below) -
// consistent with the project's existing "generate at runtime, no external
// asset" approach already used for Particles.js's canvas-drawn textures.
const MANIFEST = {
  'ui.click': 'assets/audio/ui_click.ogg',
  'mop.swipe': 'assets/audio/mop_swipe.ogg',
  splash: 'assets/audio/splash.ogg',
  ignite: 'assets/audio/ignite.ogg',
  sprinkler: 'assets/audio/sprinkler.ogg',
  stabilize: 'assets/audio/stabilize.ogg',
  fail: 'assets/audio/fail.ogg',
  'leak.drip': null,
  'fire.crackle': null,
};

// Short decaying-pitch "plink" - no real CC0 file matched a single water
// drip well enough, so this is generated sample-by-sample instead.
function synthDrip(ctx) {
  const duration = 0.18;
  const length = Math.floor(duration * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const startFreq = 1400;
  const endFreq = 600;
  for (let i = 0; i < length; i++) {
    const t = i / ctx.sampleRate;
    const freq = startFreq + (endFreq - startFreq) * (t / duration);
    const envelope = Math.pow(1 - t / duration, 2);
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.6;
  }
  return buffer;
}

// Short burst of low-pass-filtered noise with occasional sharper pops -
// reads as a crackle/pop rather than a hiss.
function synthCrackle(ctx) {
  const duration = 0.35;
  const length = Math.floor(duration * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let smoothed = 0;
  for (let i = 0; i < length; i++) {
    const t = i / ctx.sampleRate;
    const envelope = Math.pow(1 - t / duration, 1.5);
    const white = Math.random() * 2 - 1;
    smoothed = smoothed * 0.7 + white * 0.3;
    const pop = Math.random() < 0.03 ? (Math.random() * 2 - 1) * 0.8 : 0;
    data[i] = (smoothed * 0.5 + pop) * envelope;
  }
  return buffer;
}

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let volumes = { ...DEFAULT_VOLUMES };
const buffers = new Map(); // cue name -> AudioBuffer
let musicSource = null;

function loadStoredVolumes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOLUMES };
    return { ...DEFAULT_VOLUMES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_VOLUMES };
  }
}

function persistVolumes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
  } catch {
    // localStorage can throw in some sandboxed/private-browsing contexts -
    // audio still works for the session, it just won't remember next time.
  }
}

function ensureGraph() {
  if (ctx) return;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  musicGain = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(ctx.destination);
  applyGains();
}

function applyGains() {
  if (!ctx) return;
  masterGain.gain.value = volumes.master;
  musicGain.gain.value = volumes.music;
  sfxGain.gain.value = volumes.sfx;
}

export const Audio = {
  init() {
    volumes = loadStoredVolumes();
    ensureGraph();
  },

  // Browsers block audio playback until a real user gesture - call this
  // from the first click (the main menu's Play button is the natural hook).
  resume() {
    ensureGraph();
    if (ctx.state === 'suspended') ctx.resume();
  },

  async loadAll() {
    ensureGraph();
    const entries = Object.entries(MANIFEST).filter(([, path]) => path);
    await Promise.all(entries.map(async ([name, path]) => {
      try {
        const res = await fetch(path);
        const arr = await res.arrayBuffer();
        buffers.set(name, await ctx.decodeAudioData(arr));
      } catch (err) {
        console.warn(`Audio: failed to load cue "${name}" from ${path}`, err);
      }
    }));
    buffers.set('leak.drip', synthDrip(ctx));
    buffers.set('fire.crackle', synthCrackle(ctx));
  },

  // Lets a caller register an AudioBuffer directly (e.g. a synthesized
  // fallback cue) instead of going through the fetch-a-file path above.
  registerBuffer(name, buffer) {
    buffers.set(name, buffer);
  },

  get context() {
    ensureGraph();
    return ctx;
  },

  playSfx(name, { volume = 1 } = {}) {
    if (!ctx || ctx.state !== 'running') return;
    const buf = buffers.get(name);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(sfxGain);
    src.start();
  },

  playMusic(name, { loop = false } = {}) {
    if (!ctx || ctx.state !== 'running') return;
    const buf = buffers.get(name);
    if (!buf) return;
    if (musicSource) {
      try { musicSource.stop(); } catch { /* already stopped */ }
    }
    musicSource = ctx.createBufferSource();
    musicSource.buffer = buf;
    musicSource.loop = loop;
    musicSource.connect(musicGain);
    musicSource.start();
  },

  setVolume(bus, value) {
    volumes[bus] = Math.max(0, Math.min(1, value));
    applyGains();
    persistVolumes();
  },

  getVolumes() {
    return { ...volumes };
  },
};
