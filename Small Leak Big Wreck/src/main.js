import * as THREE from 'three';
import { Grid } from './Grid.js';
import { GridRenderer, FloatingObjects } from './GridRenderer.js';
import { Player } from './Player.js';
import { Decor } from './Decor.js';
import { NPC } from './NPC.js';
import { PLAY_ORDER } from './levels.js';
import { CameraTween, CameraShake, gameplayCameraFrame, closeUpCameraFrame, outroCameraFrame } from './Cutscenes.js';
import { UI } from './UI.js';
import { Audio } from './Audio.js';

const TILE_SIZE = 1;

// ---- renderer / scene / camera ----
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111318);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// lighting
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(5, 10, 5);
dir.castShadow = true;
scene.add(dir);

// ---- game state ----
const STATE = { MENU: 'menu', INTRO: 'intro', PLAYING: 'playing', PAUSED: 'paused', SCORE: 'score', FINAL: 'final' };
const DEFAULT_DANGER_THRESHOLD = 50;
const MAX_RETRIES = 2; // 3 total attempts before pity-advancing, so nobody hard-stalls
let state = STATE.INTRO;
let currentPlayIndex = 0;
let currentGrid, currentRenderer, currentPlayer, currentFloaters, currentDecor;
let currentNPCs = [];
let timeRemaining = 0;
let levelFailed = false;
let cumulativeChaos = 0;
let spacePrevDown = false;
let retryAttempts = 0;
let currentGameplayFrame = null;
let prevSprinklerTriggered = false;
let prevCriticalLost = false;

const camTween = new CameraTween(camera);
const camShake = new CameraShake();

function disposeLevel() {
  if (currentRenderer) currentRenderer.dispose();
  if (currentPlayer) currentPlayer.dispose();
  if (currentFloaters) currentFloaters.dispose();
  if (currentDecor) currentDecor.dispose();
  currentNPCs.forEach((n) => n.dispose());
  currentNPCs = [];
}

function buildLevel(levelConfig) {
  disposeLevel();

  currentGrid = new Grid(levelConfig);
  currentRenderer = new GridRenderer(scene, currentGrid, TILE_SIZE, levelConfig.palette);
  currentPlayer = new Player(scene, currentGrid, TILE_SIZE);
  currentFloaters = new FloatingObjects(scene, currentGrid, TILE_SIZE, levelConfig.floatingObjects);
  currentDecor = new Decor(scene, levelConfig.decor, TILE_SIZE);
  currentNPCs = (levelConfig.npcs || []).map((spec) => new NPC(scene, currentGrid, TILE_SIZE, spec));

  timeRemaining = levelConfig.timeLimit;
  levelFailed = false;
  prevSprinklerTriggered = false;
  prevCriticalLost = false;
}

async function startLevel(index, { isRetry = false, retryReason = 'Not stabilized. Try again.' } = {}) {
  const levelConfig = PLAY_ORDER[index];
  buildLevel(levelConfig);

  state = STATE.INTRO;
  UI.hideHUD();

  if (isRetry) {
    // Fast path: don't re-run the how-to screen, time-skip caption, or full
    // intro narration/cutscene on every failed attempt - just a short beat,
    // then straight back into gameplay from the static wide frame.
    UI.showStory(levelConfig.title, retryReason);
    const wide = gameplayCameraFrame(currentRenderer);
    camera.position.copy(wide.pos);
    camera.lookAt(wide.look);
    await sleep(1200);
    UI.hideStory();
    state = STATE.PLAYING;
    currentGameplayFrame = wide;
    UI.showHUD(levelConfig);
    UI.setDanger(currentGrid.computeDangerScore(), levelConfig.dangerThreshold ?? DEFAULT_DANGER_THRESHOLD);
    return;
  }

  if (index === 0) {
    UI.showHowTo();
    await waitForSpace();
    UI.hideHowTo();
  }

  if (levelConfig.flashbackCaption) {
    UI.showTimeSkip(levelConfig.flashbackCaption);
    await sleep(1800);
    UI.hideTimeSkip();
  }

  UI.showStory(levelConfig.title, levelConfig.flashbackIntro ?? levelConfig.intro);

  const close = closeUpCameraFrame(currentRenderer);
  const wide = gameplayCameraFrame(currentRenderer);
  camera.position.copy(close.pos);
  camera.lookAt(close.look);

  // wait for space to begin, then tween camera into gameplay position
  await waitForSpace();
  UI.hideStory();
  await camTween.play(close.pos, close.look, wide.pos, wide.look, 1.4);

  state = STATE.PLAYING;
  currentGameplayFrame = wide;
  UI.showHUD(levelConfig);
  UI.setDanger(currentGrid.computeDangerScore(), levelConfig.dangerThreshold ?? DEFAULT_DANGER_THRESHOLD);
}

function waitForSpace() {
  // Discard any stray Space press that landed before this screen was shown
  // (e.g. mashed during gameplay) - only a press that happens while this
  // screen is actually up should be able to dismiss it.
  spacePrevDown = false;
  return new Promise((resolve) => {
    function check() {
      if (spacePrevDown) {
        spacePrevDown = false;
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    }
    check();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') spacePrevDown = true;
  if (e.code === 'Escape') {
    // A no-op everywhere except PLAYING/PAUSED sidesteps needing any other
    // state (INTRO/SCORE/FINAL/MENU) to be pause-aware - those all have
    // in-flight sleep()/waitForSpace()/camTween.play() awaits that don't
    // need to know pausing exists.
    if (state === STATE.PLAYING) pauseGame();
    else if (state === STATE.PAUSED) resumeGame();
  }
});

function showMainMenu() {
  state = STATE.MENU;
  UI.showMainMenu();
}

function pauseGame() {
  if (state !== STATE.PLAYING) return;
  state = STATE.PAUSED;
  UI.showPause();
}

function resumeGame() {
  if (state !== STATE.PAUSED) return;
  state = STATE.PLAYING;
  UI.hidePause();
}

function restartLevelFromPause() {
  UI.hidePause();
  startLevel(currentPlayIndex, { isRetry: true, retryReason: 'Restarting...' });
}

function quitToMainMenu() {
  UI.hidePause();
  UI.hideHUD();
  disposeLevel();
  // No level-select exists, so there's no other sensible place to land -
  // quitting resets run progress rather than resuming mid-run.
  cumulativeChaos = 0;
  currentPlayIndex = 0;
  retryAttempts = 0;
  showMainMenu();
}

function openSettings() {
  UI.showSettings(Audio.getVolumes());
}

function closeSettings() {
  UI.hideSettings();
}

UI.btnPlay.addEventListener('click', () => {
  Audio.resume();
  Audio.loadAll();
  Audio.playSfx('ui.click');
  UI.hideMainMenu();
  startLevel(0);
});
UI.btnSettingsMain.addEventListener('click', () => { Audio.playSfx('ui.click'); openSettings(); });
UI.btnSettingsPause.addEventListener('click', () => { Audio.playSfx('ui.click'); openSettings(); });
UI.btnSettingsBack.addEventListener('click', () => { Audio.playSfx('ui.click'); closeSettings(); });
UI.btnResume.addEventListener('click', () => { Audio.playSfx('ui.click'); resumeGame(); });
UI.btnRestart.addEventListener('click', () => { Audio.playSfx('ui.click'); restartLevelFromPause(); });
UI.btnQuit.addEventListener('click', () => { Audio.playSfx('ui.click'); quitToMainMenu(); });

UI.volMaster.addEventListener('input', (e) => Audio.setVolume('master', parseFloat(e.target.value)));
UI.volMusic.addEventListener('input', (e) => Audio.setVolume('music', parseFloat(e.target.value)));
UI.volSfx.addEventListener('input', (e) => Audio.setVolume('sfx', parseFloat(e.target.value)));

async function endLevel() {
  const levelConfig = PLAY_ORDER[currentPlayIndex];
  const chaos = currentGrid.computeChaosScore();
  const danger = currentGrid.computeDangerScore();
  const dangerLimit = levelConfig.dangerThreshold ?? DEFAULT_DANGER_THRESHOLD;
  const hardFail = !!levelConfig.failOnCritical && currentGrid.criticalTileLost;
  const stabilized = danger <= dangerLimit && !hardFail;

  Audio.playSfx(stabilized ? 'stabilize' : 'fail');

  retryAttempts = stabilized ? 0 : retryAttempts + 1;
  const forceAdvance = !stabilized && retryAttempts > MAX_RETRIES;
  const leaving = stabilized || forceAdvance;
  if (leaving) {
    cumulativeChaos += chaos; // only counted once per level, not per retry
    retryAttempts = 0; // don't let a pity-advance carry attempts into the next level
  }

  UI.hideHUD();

  const wide = gameplayCameraFrame(currentRenderer);
  const outroFrame = levelConfig.reveal ? closeUpCameraFrame(currentRenderer) : outroCameraFrame(currentRenderer);

  if (leaving && levelConfig.reveal) {
    // state flips to SCORE *before* the await, not after - otherwise
    // animate()'s `state === STATE.PLAYING` gate keeps re-entering endLevel()
    // on every frame for the full 3s tween (timeRemaining stays <= 0 the
    // whole time), each call re-adding to cumulativeChaos and restarting
    // the shared camTween's in-flight promise.
    state = STATE.SCORE;
    // Let the camera crane all the way onto the drip, in full view, before
    // the score/reveal text comes up - the payoff shot must not play out
    // hidden behind the near-opaque score overlay.
    await camTween.play(wide.pos, wide.look, outroFrame.pos, outroFrame.look, 3);
    UI.showScore(levelConfig, chaos, danger, dangerLimit, stabilized, forceAdvance);
  } else {
    state = STATE.SCORE;
    UI.showScore(levelConfig, chaos, danger, dangerLimit, stabilized, forceAdvance);
    if (leaving) {
      camTween.play(wide.pos, wide.look, outroFrame.pos, outroFrame.look, levelConfig.finale ? 4 : 2);
    }
  }

  await waitForSpace();
  UI.hideScore();

  if (leaving) {
    currentPlayIndex++;
    if (currentPlayIndex >= PLAY_ORDER.length) {
      showFinal();
    } else {
      startLevel(currentPlayIndex);
    }
  } else {
    startLevel(currentPlayIndex, { isRetry: true });
  }
}

function showFinal() {
  state = STATE.FINAL;
  const avgChaos = Math.round(cumulativeChaos / PLAY_ORDER.length);
  const moneyEstimate = Math.round(avgChaos * 42000 + Math.random() * 10000);
  UI.showFinal(avgChaos, moneyEstimate);
}

// ---- main loop ----
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  camTween.update(dt);

  if (state === STATE.PLAYING) {
    currentGrid.update(dt);
    currentPlayer.update(dt);
    currentFloaters.update(dt);
    currentNPCs.forEach((n) => n.update(dt));
    currentRenderer.update(dt);

    if (currentGrid.sprinklerTriggered && !prevSprinklerTriggered) {
      camShake.trigger(0.6);
      Audio.playSfx('sprinkler');
    }
    prevSprinklerTriggered = currentGrid.sprinklerTriggered;
    if (currentGrid.criticalTileLost && !prevCriticalLost) {
      camShake.trigger(0.8);
      Audio.playSfx('fail');
    }
    prevCriticalLost = currentGrid.criticalTileLost;

    if (!camTween.active && currentGameplayFrame) {
      camShake.applyTo(camera, currentGameplayFrame.pos, currentGameplayFrame.look, dt);
    }

    timeRemaining -= dt;
    UI.setTimer((timeRemaining / PLAY_ORDER[currentPlayIndex].timeLimit) * 100);

    const levelConfig = PLAY_ORDER[currentPlayIndex];
    UI.setDanger(currentGrid.computeDangerScore(), levelConfig.dangerThreshold ?? DEFAULT_DANGER_THRESHOLD);

    if (levelConfig.failOnCritical && currentGrid.criticalTileLost && !levelFailed) {
      levelFailed = true;
      UI.showFailBanner();
    }

    if (timeRemaining <= 0) {
      endLevel();
    }
  }

  renderer.render(scene, camera);
}

UI.init();
Audio.init();
showMainMenu();
animate();
