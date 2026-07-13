// ===================================================================
// ui.js — screens (menu/settings/how-to/result), DOM stat updates
// ===================================================================

function updateScoreUI() {
  document.getElementById('scoreVal').textContent = score;
}
function updateBestChainUI() {
  document.getElementById('bestChainVal').textContent = bestChain;
}
function addBonusTime(seconds) {
  timeLeft = Math.min(GAME_LEN, timeLeft + seconds);
  document.getElementById('timeVal').textContent = timeLeft;
}

function showOverlay(id) {
  ['menuOverlay', 'howtoOverlay', 'settingsOverlay', 'resultOverlay'].forEach(o => {
    document.getElementById(o).classList.toggle('hidden', o !== id);
  });
}
function hideAllOverlays() {
  ['menuOverlay', 'howtoOverlay', 'settingsOverlay', 'resultOverlay'].forEach(o => {
    document.getElementById(o).classList.add('hidden');
  });
}

let settingsReturnsTo = 'menu'; // 'menu' or 'pause'

document.getElementById('playBtn').addEventListener('click', () => startGame());
document.getElementById('playAgainBtn').addEventListener('click', () => startGame());
document.getElementById('menuBackBtn').addEventListener('click', () => showOverlay('menuOverlay'));
document.getElementById('howtoBtn').addEventListener('click', () => showOverlay('howtoOverlay'));
document.getElementById('howtoBackBtn').addEventListener('click', () => showOverlay('menuOverlay'));
document.getElementById('settingsBtn').addEventListener('click', () => { settingsReturnsTo = 'menu'; showOverlay('settingsOverlay'); });

document.getElementById('pauseBtn').addEventListener('click', () => {
  if (!running) { settingsReturnsTo = 'menu'; showOverlay('settingsOverlay'); return; }
  paused = true;
  settingsReturnsTo = 'pause';
  showOverlay('settingsOverlay');
});
document.getElementById('settingsBackBtn').addEventListener('click', () => {
  if (settingsReturnsTo === 'pause') {
    paused = false;
    hideAllOverlays();
  } else {
    showOverlay('menuOverlay');
  }
});

// ---------- Settings controls ----------
const soundSwitch = document.getElementById('soundSwitch');
soundSwitch.addEventListener('click', () => {
  soundOn = !soundOn;
  soundSwitch.classList.toggle('on', soundOn);
  if (masterGain) masterGain.gain.value = soundOn ? 1 : 0;
});
document.getElementById('musicSlider').addEventListener('input', e => {
  musicVol = e.target.value / 100;
  if (musicGain) musicGain.gain.value = musicVol * 0.25;
});
document.getElementById('sfxSlider').addEventListener('input', e => {
  sfxVol = e.target.value / 100;
  if (sfxGain) sfxGain.gain.value = sfxVol;
});
document.querySelectorAll('.diffBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diffBtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
  });
});
