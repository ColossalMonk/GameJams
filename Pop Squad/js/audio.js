// ===================================================================
// audio.js — synthesized sound effects & background music
// ===================================================================

let actx = null;
let masterGain, musicGain, sfxGain;
let soundOn = true;
let musicVol = 0.5, sfxVol = 0.8;
let musicTimer = null;

function ensureAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = actx.createGain(); masterGain.gain.value = soundOn ? 1 : 0;
  masterGain.connect(actx.destination);
  musicGain = actx.createGain(); musicGain.gain.value = musicVol * 0.25;
  musicGain.connect(masterGain);
  sfxGain = actx.createGain(); sfxGain.gain.value = sfxVol;
  sfxGain.connect(masterGain);
}

function playPop(sizeIdx, depth) {
  if (!actx || !soundOn) return;
  const t0 = actx.currentTime;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  const baseFreq = [660, 520, 400][sizeIdx] * Math.pow(1.06, depth);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t0 + 0.08);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
  osc.connect(gain); gain.connect(sfxGain);
  osc.start(t0); osc.stop(t0 + 0.18);
}

function playPowerUp(kind) {
  if (!actx || !soundOn) return;
  const t0 = actx.currentTime;
  if (kind === 'rainbow') {
    [523, 659, 784, 988].forEach((f, i) => {
      const osc = actx.createOscillator(), gain = actx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(f, t0 + i * 0.06);
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.06 + 0.22);
      osc.connect(gain); gain.connect(sfxGain);
      osc.start(t0 + i * 0.06); osc.stop(t0 + i * 0.06 + 0.24);
    });
  } else if (kind === 'bomb') {
    const osc = actx.createOscillator(), gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.28);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(t0); osc.stop(t0 + 0.34);
  } else if (kind === 'star') {
    [784, 988, 1318].forEach((f, i) => {
      const osc = actx.createOscillator(), gain = actx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(f, t0 + i * 0.08);
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.08 + 0.2);
      osc.connect(gain); gain.connect(sfxGain);
      osc.start(t0 + i * 0.08); osc.stop(t0 + i * 0.08 + 0.22);
    });
  }
}

function playOverflow() {
  if (!actx || !soundOn) return;
  const t0 = actx.currentTime;
  [220, 180, 140].forEach((f, i) => {
    const osc = actx.createOscillator(), gain = actx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f, t0 + i * 0.12);
    gain.gain.setValueAtTime(0.0001, t0 + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.12 + 0.3);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(t0 + i * 0.12); osc.stop(t0 + i * 0.12 + 0.32);
  });
}

function startMusic() {
  if (!actx) return;
  stopMusic();
  let step = 0;
  musicTimer = setInterval(() => {
    if (!soundOn) return;
    const t0 = actx.currentTime;
    const freq = PENTATONIC[step % PENTATONIC.length] / 2;
    const osc = actx.createOscillator(), gain = actx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    osc.connect(gain); gain.connect(musicGain);
    osc.start(t0); osc.stop(t0 + 0.55);
    step++;
  }, 520);
}
function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
