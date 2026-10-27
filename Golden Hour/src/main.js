import * as THREE from 'three';
import { Stage3D } from './core/Stage3D.js';
import { Viewfinder } from './core/Viewfinder.js';
import { Sky } from './world/Sky.js';
import { Town } from './world/Town.js';
import { Cast } from './characters/Cast.js';
import { Particles } from './characters/Particles.js';
import { scorePhoto } from './game/Scoring.js';
import { HUD } from './ui/HUD.js';
import { Album } from './ui/Album.js';
import { Audio } from './audio/Audio.js';
import { GAME_LENGTH, SHOTS, FILM_ADVANCE, WHITEOUT_START } from './config.js';

const app = document.getElementById('app');
const stage = new Stage3D(app);
const sky = new Sky(stage.scene);
const town = new Town(stage.scene);
const particles = new Particles(stage.scene);
const audio = new Audio();
const cast = new Cast(stage.scene, particles, { onCue: (kind, m) => audio.cue(kind, m.x) });
const hud = new HUD();
const album = new Album();
const viewfinder = new Viewfinder(app, document.getElementById('viewfinder'), { onShoot: requestShot });

/** 'title' → 'playing' → 'album' → 'playing' … */
let state = 'title';
let t = 0;
let wall = 0;
let photos = [];
let lockedUntil = 0;
let pendingShot = null;
let albumAt = 0;

const PHOTO_SIZE = 512;

function begin() {
  if (state === 'playing') return;
  audio.start().then(() => audio.startRun());
  state = 'playing';
  t = 0;
  photos = [];
  lockedUntil = 0;
  pendingShot = null;
  cast.reset();
  particles.clear();
  album.hide();
  hud.startRun();
  viewfinder.enabled = true;
}

function requestShot() {
  if (state !== 'playing' || photos.length >= SHOTS || t < lockedUntil || pendingShot) return;
  pendingShot = viewfinder.rect;
}

/** Copy the viewfinder's square out of the frame that was just rendered. */
function capture(rect) {
  const src = stage.renderer.domElement;
  const ratio = src.width / stage.width;
  const out = document.createElement('canvas');
  out.width = out.height = PHOTO_SIZE;
  const ctx = out.getContext('2d');
  ctx.drawImage(src, rect.x * ratio, rect.y * ratio, rect.size * ratio, rect.size * ratio, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  // Instant-film look: a touch of warmth and a soft vignette.
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(255, 196, 120, 0.35)';
  ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  ctx.globalCompositeOperation = 'multiply';
  const v = ctx.createRadialGradient(PHOTO_SIZE / 2, PHOTO_SIZE / 2, PHOTO_SIZE * 0.35, PHOTO_SIZE / 2, PHOTO_SIZE / 2, PHOTO_SIZE * 0.75);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(1, 'rgba(150,120,110,1)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  return out.toDataURL('image/jpeg', 0.9);
}

function takePhoto(rect) {
  const dataUrl = capture(rect);
  const result = scorePhoto({ t, rect, stage, cast });
  photos.push({ dataUrl, ...result, t });
  hud.shot(photos.length - 1, dataUrl);
  audio.shutter();
  lockedUntil = t + FILM_ADVANCE;
}

function endRun() {
  state = 'album';
  viewfinder.enabled = false;
  hud.endRun();
  while (photos.length < SHOTS) photos.push({ dataUrl: null, caption: 'You were too busy watching.', score: 0 });
  const total = photos.reduce((sum, p) => sum + p.score, 0);
  albumAt = wall + 0.7;
  setTimeout(() => {
    album.show(photos, total);
    audio.album();
  }, 700);
}

// ── Input outside the viewfinder ──
document.getElementById('title').addEventListener('click', begin);
document.getElementById('again').addEventListener('click', (e) => {
  e.stopPropagation();
  begin();
});
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  e.preventDefault();
  if (state === 'playing') requestShot();
  else if (state === 'title' || (state === 'album' && wall > albumAt + 0.4)) begin();
});

// ── Main loop ──
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  wall += dt;
  if (state === 'playing') t = Math.min(GAME_LENGTH, t + dt);

  sky.update(t);
  town.update(dt, wall);
  cast.update(t, dt, wall);
  particles.update(dt);
  stage.setParallax(state === 'playing' ? viewfinder.nx : 0);
  if (state === 'playing') {
    audio.update(t);
    if (t >= lockedUntil) hud.unlock();
    const u = Math.max(0, (t - WHITEOUT_START) / (GAME_LENGTH - WHITEOUT_START));
    hud.setWhiteout(Math.pow(u, 2.2));
  }

  stage.render(dt);

  if (pendingShot) {
    takePhoto(pendingShot);
    pendingShot = null;
  }
  if (state === 'playing' && t >= GAME_LENGTH) endRun();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
app.classList.add('menu');

// Debug hook for development.
window.__golden = { stage, cast, viewfinder, requestShot, get photos() { return photos; }, get t() { return t; }, set t(v) { t = v; } };
