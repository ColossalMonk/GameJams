import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { InputManager } from './core/InputManager.js';
import { GameLoop } from './core/GameLoop.js';
import { LayerManager } from './core/LayerManager.js';
import { Settings } from './core/Settings.js';
import { ZoneLoader } from './world/ZoneLoader.js';
import { TILE, TILE_SIZE } from './world/TileGrid.js';
import { Explorer } from './characters/Explorer.js';
import { Jaguar } from './characters/Jaguar.js';
import { TrustBond } from './characters/TrustBond.js';
import { TrustMeter, FAR_TILES } from './mechanics/TrustMeter.js';
import { HUD } from './ui/HUD.js';
import { Minimap } from './ui/Minimap.js';
import { AudioManager } from './audio/AudioManager.js';
import { PostProcessing } from './rendering/PostProcessing.js';
import { CenterSequence } from './ending/CenterSequence.js';
import { zone1 } from './world/zones/zone1.js';
import { zone2 } from './world/zones/zone2.js';
import { zone3 } from './world/zones/zone3.js';
import { center } from './world/zones/center.js';
import { buildZone } from './world/zones/buildZone.js';
import { ZONE_CONFIGS } from './world/zones/zoneConfigs.js';

const ZONES = { zone1, zone2, zone3, center };
for (const config of ZONE_CONFIGS) ZONES[config.id] = buildZone(config);

const TOTAL_FRAGMENTS = Object.values(ZONES).reduce((sum, z) => sum + (z.fragments ? z.fragments.length : 0), 0);

const appEl = document.getElementById('app');
const sceneManager = new SceneManager(appEl);
const inputManager = new InputManager(sceneManager.renderer.domElement);
const layerManager = new LayerManager();
const trustMeter = new TrustMeter();
const hud = new HUD();
const minimap = new Minimap(document.getElementById('minimap'));
const audio = new AudioManager();
const postFx = new PostProcessing(sceneManager.renderer, sceneManager.scene, sceneManager.camera);
const zoneLoader = new ZoneLoader(sceneManager.scene);
const fadeOverlay = document.getElementById('fade-overlay');
const menuOverlay = document.getElementById('menu-overlay');
const startBtn = document.getElementById('start-btn');
const nameInput = document.getElementById('player-name');
const storyScreen = document.getElementById('story-screen');
const storyText = document.getElementById('story-text');
const storySkipBtn = document.getElementById('story-skip');
const creditsScreen = document.getElementById('credits-screen');
const creditsStats = document.getElementById('credits-stats');
const creditsThanks = document.getElementById('credits-thanks');
const creditsRestartBtn = document.getElementById('credits-restart');
const pauseScreen = document.getElementById('pause-screen');
const pauseResumeBtn = document.getElementById('pause-resume');
const pauseRestartBtn = document.getElementById('pause-restart');
const pauseSettingsBtn = document.getElementById('pause-settings');
const pauseTitleBtn = document.getElementById('pause-title');
const settingsScreen = document.getElementById('settings-screen');
const menuSettingsBtn = document.getElementById('menu-settings-btn');
const hudSettingsBtn = document.getElementById('hud-settings-btn');
const settingsCloseBtn = document.getElementById('settings-close');
const volMaster = document.getElementById('vol-master');
const volMusic = document.getElementById('vol-music');
const volSfx = document.getElementById('vol-sfx');
const chkShadows = document.getElementById('chk-shadows');
const chkBloom = document.getElementById('chk-bloom');
const selParticles = document.getElementById('sel-particles');
const chkAA = document.getElementById('chk-aa');

const STORY_LINES = [
  'A dying explorer and a jaguar spirit strike a deal at the edge of a magical jungle.',
  'The explorer holds an ancient map. The jaguar holds the spiritual keys.',
  'Neither can reach the center alone.',
  '"Two worlds. One path. Neither alone."',
];

/** Plays the narrative lines one at a time, then calls onDone. Skippable at any point. */
function playStory(onDone) {
  storyScreen.classList.remove('hidden');
  let i = 0;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    storyScreen.classList.add('hidden');
    storyText.style.opacity = 0;
    onDone();
  };
  const advance = () => {
    if (done) return;
    if (i >= STORY_LINES.length) {
      finish();
      return;
    }
    storyText.style.opacity = 0;
    setTimeout(() => {
      if (done) return;
      storyText.textContent = STORY_LINES[i];
      storyText.style.opacity = 1;
      i++;
      setTimeout(advance, 3000);
    }, 450);
  };
  advance();
  storySkipBtn.onclick = finish;
}

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
}

function showCredits() {
  const elapsed = journeyStartTime ? (performance.now() - journeyStartTime) / 1000 : 0;
  creditsStats.innerHTML =
    `Time in the jungle: ${formatTime(elapsed)}<br>` +
    `Map fragments found: ${totalFragmentsCollected}/${TOTAL_FRAGMENTS}<br>` +
    `Trust between two worlds: full`;
  creditsThanks.innerHTML =
    `Thank you for walking two worlds, ${playerName}.<br>` +
    `<span style="font-size:11px;opacity:0.6;">Music: "Jungle Music" by enprogames &amp; "Dream Ambience" (CC0, OpenGameArt.org)</span>`;
  creditsScreen.classList.remove('hidden');
}

creditsRestartBtn.addEventListener('click', () => {
  creditsScreen.classList.add('hidden');
  nameInput.value = '';
  menuOverlay.classList.remove('hidden');
  audio.stopAmbient();
});

let settingsReturnTo = 'menu';

function refreshSettingsUI() {
  volMaster.value = Math.round(Settings.get('masterVolume') * 100);
  volMusic.value = Math.round(Settings.get('musicVolume') * 100);
  volSfx.value = Math.round(Settings.get('sfxVolume') * 100);
  chkShadows.checked = Settings.get('shadows');
  chkBloom.checked = Settings.get('bloom');
  selParticles.value = Settings.get('particleDensity');
  chkAA.checked = Settings.get('antialiasing');
}

function openSettings(returnTo) {
  settingsReturnTo = returnTo;
  refreshSettingsUI();
  settingsScreen.classList.remove('hidden');
}

menuSettingsBtn.addEventListener('click', () => {
  menuOverlay.classList.add('hidden');
  openSettings('menu');
});
pauseSettingsBtn.addEventListener('click', () => {
  pauseScreen.classList.add('hidden');
  openSettings('pause');
});
settingsCloseBtn.addEventListener('click', () => {
  settingsScreen.classList.add('hidden');
  if (settingsReturnTo === 'pause') pauseScreen.classList.remove('hidden');
  else if (settingsReturnTo === 'game') paused = false;
  else menuOverlay.classList.remove('hidden');
});
hudSettingsBtn.addEventListener('click', () => {
  if (!currentZone || cinematic) return;
  paused = true;
  openSettings('game');
});

volMaster.addEventListener('input', () => {
  const v = Number(volMaster.value) / 100;
  Settings.set('masterVolume', v);
  audio.setMasterVolume(v);
});
volMusic.addEventListener('input', () => {
  const v = Number(volMusic.value) / 100;
  Settings.set('musicVolume', v);
  audio.setMusicVolume(v);
});
volSfx.addEventListener('input', () => {
  const v = Number(volSfx.value) / 100;
  Settings.set('sfxVolume', v);
  audio.setSfxVolume(v);
});
chkShadows.addEventListener('change', () => {
  Settings.set('shadows', chkShadows.checked);
  sceneManager.setShadows(chkShadows.checked);
});
chkBloom.addEventListener('change', () => {
  Settings.set('bloom', chkBloom.checked);
  postFx.setBloomEnabled(chkBloom.checked);
});
selParticles.addEventListener('change', () => {
  Settings.set('particleDensity', selParticles.value);
  hud.showMessage('Particle density will update on the next zone.', 2500);
});
chkAA.addEventListener('change', () => {
  Settings.set('antialiasing', chkAA.checked);
  hud.showMessage('Antialiasing will apply after reloading.', 2500);
});

pauseResumeBtn.addEventListener('click', () => {
  paused = false;
  pauseScreen.classList.add('hidden');
});
pauseRestartBtn.addEventListener('click', () => {
  pauseScreen.classList.add('hidden');
  loadZone(currentZone.def.id);
});
pauseTitleBtn.addEventListener('click', () => {
  pauseScreen.classList.add('hidden');
  menuOverlay.classList.remove('hidden');
  audio.stopAmbient();
});

sceneManager.onResize = (w, h) => postFx.setSize(w, h);

sceneManager.renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  sceneManager.setZoomTarget(Math.sign(e.deltaY) * 0.12);
}, { passive: false });

let currentZone = null;
let cinematic = null;
let paused = false;
let playerName = 'THE EXPLORER';
let senseFlash = 0;
let introHintTimeout = null;
let bumpCooldown = 0;
let journeyStartTime = null;
let totalFragmentsCollected = 0;

/** Contextual nudge shown when the Explorer's WASD move is blocked by a physical-world obstacle. */
function getBumpHint(tileType) {
  if (tileType === TILE.WATER) {
    return 'Deep water — the jaguar can cross in spirit form. [Tab] to switch.';
  }
  if (tileType === TILE.SPIRIT_PATH) {
    return 'These stepping stones only hold in spirit form. [Tab] to switch.';
  }
  if (tileType === TILE.GATE) {
    return 'The door remains sealed.';
  }
  if (tileType === TILE.DENSE_VINES) {
    return 'Thick vines block the way.';
  }
  return null;
}

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** Converts a mouse client position to the nearest tile in the current zone's grid, or null. */
function screenToTile(clientX, clientY) {
  if (!currentZone) return null;
  const rect = sceneManager.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, sceneManager.camera);
  const point = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, point)) return null;
  const { grid } = currentZone;
  const col = Math.round(point.x / TILE_SIZE + (grid.width - 1) / 2);
  const row = Math.round(point.z / TILE_SIZE + (grid.height - 1) / 2);
  return { col, row };
}

function collectVineCandidates(grid) {
  const list = [];
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (grid.tiles[row][col] === TILE.GROUND) list.push([col, row]);
    }
  }
  return list;
}

function requestTransition(toZoneId) {
  const def = ZONES[toZoneId];
  if (!def) return;
  if (def.entryRequirement && def.entryRequirement.minTrust && trustMeter.value < def.entryRequirement.minTrust) {
    hud.showMessage('The jungle does not yet trust you enough to go further.');
    return;
  }
  loadZone(toZoneId);
}

function loadZone(id) {
  const def = ZONES[id];
  paused = false;
  pauseScreen.classList.add('hidden');
  if (cinematic) {
    cinematic.dispose();
    cinematic = null;
  }
  const { grid, renderer } = zoneLoader.load(def);
  sceneManager.setDepthTint(def.atmosphereDepth || 0);

  const explorer = new Explorer(grid, def.start.explorer.col, def.start.explorer.row);
  const jaguar = new Jaguar(grid, def.start.jaguar.col, def.start.jaguar.row);
  renderer.group.add(explorer.mesh, jaguar.mesh);

  const trustBond = new TrustBond(explorer, jaguar);
  renderer.group.add(trustBond.mesh);

  explorer.setLayerBlend(layerManager.blend);
  jaguar.setLayerBlend(layerManager.blend);
  renderer.updateLayerBlend(layerManager.blend);

  minimap.setGrid(grid);
  minimap.reveal(explorer.col, explorer.row, 4);
  minimap.reveal(jaguar.col, jaguar.row, 4);

  const ctx = {
    grid,
    renderer,
    explorer,
    jaguar,
    trustMeter,
    hud,
    audio,
    layerManager,
    onCenterReached: () => startEnding(),
    onFragmentCollected: () => { totalFragmentsCollected += 1; },
  };
  const rules = def.createRules(ctx);

  const zoneTimeLimit = Math.round(420 + def.layout[0].length * def.layout.length * 0.6);

  currentZone = {
    def,
    grid,
    renderer,
    explorer,
    jaguar,
    trustBond,
    rules,
    blocks: rules.blocks || null,
    vineCandidates: collectVineCandidates(grid),
    tempVines: new Set(),
    vineTimer: 0,
    timeRemaining: zoneTimeLimit,
  };

  hud.showMessage(def.name, 2200);
  hud.setObjectives(def.name, def.objectives || []);
  hud.showObjectives();
  hud.setZoneTimer(zoneTimeLimit);

  clearTimeout(introHintTimeout);
  if (def.introHint) {
    introHintTimeout = setTimeout(() => hud.showZoneHint(def.introHint), 2400);
  }
}

function softReset() {
  if (!currentZone) return;
  hud.showMessage('Lost in the jungle... finding your way back.', 3000);
  trustMeter.reset(0.5);
  loadZone(currentZone.def.id);
}

function timeUpReset() {
  if (!currentZone) return;
  hud.showMessage('Time slips away... the jungle resets around you.', 3200);
  trustMeter.reset(0.5);
  loadZone(currentZone.def.id);
}

trustMeter.onLost = softReset;
trustMeter.onMilestone = (kind, active) => {
  if (kind === 'vines' && active) {
    hud.showMessage('The jungle grows uneasy...');
    audio.trustLowSting();
  }
  if (kind === 'bleed' && active) {
    hud.showMessage('The spirit world bleeds through...');
  }
};

layerManager.onSwitch = (layer, character) => {
  hud.setLayer(layer);
  hud.setActiveCharacter(character);
};

inputManager.onSwitch = () => {
  if (cinematic || paused) return;
  if (currentZone) {
    const { explorer, jaguar } = currentZone;
    const dist = Math.max(Math.abs(explorer.col - jaguar.col), Math.abs(explorer.row - jaguar.row));
    if (dist > FAR_TILES) {
      trustMeter.penalizeSeparation();
      hud.showMessage('Leaving them behind stretches the bond thin.', 2000);
    }
  }
  layerManager.switch();
};
inputManager.onInteract = () => {
  if (!cinematic && !paused && currentZone && layerManager.activeLayer === 'physical') {
    currentZone.rules.interact();
  }
};
inputManager.onPause = () => {
  if (cinematic || !currentZone) return;
  paused = !paused;
  pauseScreen.classList.toggle('hidden', !paused);
};
inputManager.onLeftClick = (x, y) => {
  if (cinematic || paused || !currentZone || layerManager.activeLayer !== 'spirit') return;
  const tile = screenToTile(x, y);
  if (!tile) return;
  if (!currentZone.jaguar.setPathTarget(tile.col, tile.row)) {
    hud.showMessage('The jaguar cannot reach there.', 1600);
  }
};
inputManager.onRightClick = () => {
  if (cinematic || paused || !currentZone || layerManager.activeLayer !== 'spirit') return;
  currentZone.rules.interact();
};

startBtn.addEventListener('click', async () => {
  playerName = (nameInput.value || 'THE EXPLORER').toUpperCase();
  menuOverlay.classList.add('hidden');
  const wasReady = audio.ready;
  await audio.init();
  if (wasReady) audio.resumeAmbient();
  totalFragmentsCollected = 0;
  playStory(() => {
    journeyStartTime = performance.now();
    loadZone('zone1');
  });
});

function startEnding() {
  const { grid, explorer, jaguar, trustBond, renderer } = currentZone;
  const centerPos = grid.worldPos(currentZone.def.centerTile.col, currentZone.def.centerTile.row);
  cinematic = new CenterSequence({
    scene: renderer.group,
    explorer,
    jaguar,
    trustBond,
    hud,
    centerWorldPos: centerPos,
    playerName,
    onComplete: () => {
      hud.hideEndingText();
      fadeOverlay.style.opacity = 0;
      showCredits();
    },
  });
}

function updateVines(dt) {
  const zone = currentZone;
  zone.vineTimer += dt;
  if (trustMeter.value < 0.3) {
    if (zone.vineTimer > 2.5) {
      zone.vineTimer = 0;
      const candidates = zone.vineCandidates.filter(([c, r]) => {
        const key = `${c},${r}`;
        if (zone.tempVines.has(key)) return false;
        if (Math.abs(c - zone.explorer.col) + Math.abs(r - zone.explorer.row) <= 1) return false;
        if (Math.abs(c - zone.jaguar.col) + Math.abs(r - zone.jaguar.row) <= 1) return false;
        return true;
      });
      if (candidates.length) {
        const [c, r] = candidates[Math.floor(Math.random() * candidates.length)];
        zone.renderer.growVine(c, r);
        zone.tempVines.add(`${c},${r}`);
      }
    }
  } else if (zone.tempVines.size) {
    for (const key of zone.tempVines) {
      const [c, r] = key.split(',').map(Number);
      zone.renderer.clearVine(c, r);
    }
    zone.tempVines.clear();
  }
}

const loop = new GameLoop((dt) => {
  layerManager.update(dt);
  sceneManager.updateZoom(dt);
  sceneManager.setLayerBlend(layerManager.blend);
  postFx.setBlend(layerManager.blend);
  audio.setLayerBlend(layerManager.blend);

  if (cinematic) {
    cinematic.update(dt);
    fadeOverlay.style.opacity = cinematic.getFadeAlpha();
    currentZone.trustBond.update(1.0);
    sceneManager.followTarget(currentZone.explorer.worldPosition, dt);
    hud.setInteractPrompt(null);
  } else if (currentZone && !paused) {
    const { explorer, jaguar, rules, renderer } = currentZone;
    const active = layerManager.activeCharacter === 'explorer' ? explorer : jaguar;

    // Explorer only responds to WASD while in physical mode. The Jaguar's movement
    // (queued by mouse clicks in spirit mode) is entirely self-driven inside jaguar.update().
    if (layerManager.activeLayer === 'physical') {
      const dir = inputManager.getMoveDirection();
      if (dir) {
        const nc = explorer.col + dir[0];
        const nr = explorer.row + dir[1];
        const blocks = currentZone.blocks;
        const pulling = blocks && (inputManager.keys.has('ShiftLeft') || inputManager.keys.has('ShiftRight'));
        if (pulling && blocks.tryPull(explorer.col, explorer.row, dir[0], dir[1])) {
          audio.blockThudSting();
          explorer.tryMove(dir[0], dir[1], 'physical');
          audio.footstepTick();
        } else {
          let blockedByCrate = false;
          if (blocks && blocks.isBlockedAt(nc, nr)) {
            blockedByCrate = !blocks.tryPush(nc, nr, dir[0], dir[1]);
            if (!blockedByCrate) audio.blockThudSting();
          }
          if (blockedByCrate) {
            if (bumpCooldown <= 0) {
              hud.showMessage("The block won't budge.", 1800);
              bumpCooldown = 3.5;
            }
          } else if (explorer.tryMove(dir[0], dir[1], 'physical')) {
            audio.footstepTick();
          } else if (bumpCooldown <= 0) {
            const blockedTile = currentZone.grid.get(nc, nr);
            const bumpMsg = getBumpHint(blockedTile);
            if (bumpMsg) {
              hud.showMessage(bumpMsg, 2400);
              bumpCooldown = 3.5;
            }
          }
        }
      }
    }

    explorer.update(dt);
    jaguar.update(dt, layerManager.activeCharacter === 'jaguar');
    if (jaguar.justSensed) senseFlash = 0.4;

    explorer.setLayerBlend(layerManager.blend);
    jaguar.setLayerBlend(layerManager.blend);
    renderer.updateLayerBlend(layerManager.blend);

    minimap.reveal(explorer.col, explorer.row, 4);
    minimap.reveal(jaguar.col, jaguar.row, 4);

    const tileDistance = Math.max(Math.abs(explorer.col - jaguar.col), Math.abs(explorer.row - jaguar.row));
    trustMeter.update(dt, tileDistance);
    hud.setTrust(trustMeter.value);

    updateVines(dt);

    currentZone.trustBond.update(trustMeter.value);
    rules.update();
    hud.setInteractPrompt(rules.hint ? rules.hint() : null);

    if (rules.door && rules.door.solved && currentZone.def.exitGate) {
      const g = currentZone.def.exitGate;
      const atGate = (c, r) => r === g.row && g.cols.includes(c);
      if (atGate(explorer.col, explorer.row) || atGate(jaguar.col, jaguar.row)) {
        requestTransition(g.toZone);
      }
    }

    sceneManager.followTarget(active.worldPosition, dt);

    currentZone.timeRemaining -= dt;
    hud.setZoneTimer(currentZone.timeRemaining);
    if (currentZone.timeRemaining <= 0) timeUpReset();
  } else if (paused) {
    hud.setInteractPrompt(null);
  }

  if (senseFlash > 0) {
    senseFlash = Math.max(0, senseFlash - dt);
    if (postFx.bloomEnabled) postFx.bloomEffect.intensity += (senseFlash / 0.4) * 1.2;
  }
  if (bumpCooldown > 0) bumpCooldown = Math.max(0, bumpCooldown - dt);

  if (currentZone) {
    currentZone.renderer.updateDust(dt);
    currentZone.renderer.updateDecorations(dt);
    minimap.draw(currentZone.explorer, currentZone.jaguar);
  }


  postFx.render(dt);
});

loop.start();
