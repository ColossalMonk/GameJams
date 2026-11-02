import * as THREE from 'three';
import { Stage3D } from './core/Stage3D.js';
import { Viewfinder } from './core/Viewfinder.js';
import { Sky } from './world/Sky.js';
import { Town, SLOTS } from './world/Town.js';
import { Facades } from './world/Facades.js';
import { Show } from './stories/Show.js';
import { STORIES, usesSite } from './stories/registry.js';
import { planEvening } from './director/Director.js';
import { Particles } from './characters/Particles.js';
import { scorePhoto } from './game/Scoring.js';
import { HUD } from './ui/HUD.js';
import { Album } from './ui/Album.js';
import { Audio } from './audio/Audio.js';
import { Evening, randomEveningNumber } from './game/Evening.js';
import { pickRequest, REQUEST_BONUS } from './game/Requests.js';
import { setSunX, sunCentre } from './world/Sky.js';
import { GAME_LENGTH, SHOTS, FILM_ADVANCE, WHITEOUT_START, VIEWFINDER, PUPPET_FPS } from './config.js';
import { develop } from './game/PhotoLab.js';
import { Journal } from './game/Journal.js';
import { Strings } from './world/Strings.js';
import { Season } from './world/Season.js';
import { Backdrop } from './world/Backdrop.js';
import { Flare } from './ui/Flare.js';

const app = document.getElementById('app');
const stage = new Stage3D(app);
const sky = new Sky(stage.scene);
if (stage.lowTier) sky.light.shadow.mapSize.set(1024, 1024);
stage.enableSunRays(sky.sun);
const town = new Town(stage.scene);
const particles = new Particles(stage.scene);
const audio = new Audio();
const facades = new Facades(stage.scene, town.windowGlow);
const show = new Show(stage.scene, particles, {
  onCue: (kind, m) => {
    audio.cue(kind, m.x());
    if (kind === 'build' && state === 'playing') sparkle(m);
  },
  onSfx: (name, x) => audio.sfx(name, x),
});
const hud = new HUD();
const journal = new Journal();
let freshStickers = 0;
const strings = new Strings(stage.scene);
const season = new Season(stage.scene, { town, sky, camera: stage.camera });
const backdrop = new Backdrop(stage.scene);
const flare = new Flare(app);
/** Players who ask their system for less motion get no camera drift and an instant opening. */
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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
let evening = null;
let request = null;
let requestDone = false;

const PHOTO_SIZE = 512;
/** Stories living in these slots hang from paper-theatre strings. */
const STRUNG = ['sky', 'lowsky'];
/** At the end the paper town folds flat, like a pop-up book closing, under the whiteout. */
const FOLD_START = 19.2;

/**
 * Every evening is a random surprise for players. The URL switches below (?evening=,
 * ?story=, ?all=) only work in the dev server, for testing; the published build ignores them.
 */
const DEV = import.meta.env.DEV;
const params = new URLSearchParams(DEV ? location.search : '');

/**
 * Every run is a numbered evening. The number seeds where the sun sets, the street's
 * houses, which stories happen and where, who is in them, how they turn out, when they
 * peak, the clouds, and the request. ?evening=123 in the URL picks a specific one.
 *
 * options.only / options.outcome / options.peak force stories for the gallery tool.
 */
function prepareEvening(number, options = {}) {
  evening = new Evening(number);
  setSunX(evening.range(-5, 7));
  // Season and weather first: tonight's residents dress for it (scarves in winter).
  season.apply(evening);
  // Tonight's far distance: hills, the sea, mountains or a city.
  backdrop.build(evening);
  const plan = planEvening(evening, { stories: STORIES, slots: SLOTS, only: options.only, stress: options.stress });
  for (const item of plan) {
    if (options.outcome && item.story.outcomes[options.outcome]) item.outcome = options.outcome;
    if (options.peak != null) item.peak = options.peak;
  }
  facades.build(evening, { site: usesSite(plan) });
  show.load(plan, evening, { site: facades.site });
  strings.clear();
  for (const o of [...town.clouds, ...town.birds]) strings.attach(o);
  for (const m of show.moments) {
    if (!m.instance || !STRUNG.includes(m.story.slots[0]) || m.story.id === 'skywriter') continue;
    for (const o of m.focus()) strings.attach(o);
  }
  particles.clear();
  town.reseed(evening);
  request = pickRequest(evening, show);
  requestDone = false;
  hud.setRequest(evening.number, request.text);
}

/**
 * The town pops up out of the page like a pop-up book: the street first, then the house
 * row, then tonight's cast, each with a little overshoot. Plays on load and before every
 * new evening; a tap or Space skips it. It isn't part of the 20 seconds.
 */
const OPENING = reducedMotion ? 0.05 : 1.1;
let opening = { at: 0, then: null };

function popUp(u) {
  const back = (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
  [backdrop.group, town.group, facades.group, show.group].forEach((g, i) => {
    if (!g) return;
    const k = Math.min(1, Math.max(0, (u - i * 0.15) / 0.7));
    g.scale.y = k <= 0 ? 0.001 : back(k);
  });
}

/** A small burst of gold sparks over a story that's about to peak: where to look. */
const hintBox = new THREE.Box3();
function sparkle(m) {
  hintBox.makeEmpty();
  for (const o of m.focus()) hintBox.expandByObject(o);
  if (hintBox.isEmpty()) return;
  const top = new THREE.Vector3((hintBox.min.x + hintBox.max.x) / 2, hintBox.max.y + 0.25, hintBox.max.z + 0.1);
  for (let i = 0; i < 6; i++) {
    particles.spawn('spark', top, new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.2 + Math.random() * 0.8, 0), { life: 0.9, scale: 1.3, color: '#fff1b0' });
  }
}

/** The book closing: every layer of the town lies back down flat (u: 0 → 1). */
function fold(u) {
  const k = u * u * (3 - 2 * u);
  for (const g of [backdrop.group, town.group, facades.group, show.group]) if (g) g.scale.y = Math.max(0.001, 1 - k);
}

/** Where the sun is on screen, for the lens flare. */
const sunOnScreen = new THREE.Vector3();
function updateFlare(dt) {
  sunOnScreen.copy(sunCentre(t)).project(stage.camera);
  const visible = Math.abs(sunOnScreen.x) < 1 && Math.abs(sunOnScreen.y) < 1;
  const sun = visible ? { x: ((sunOnScreen.x + 1) / 2) * stage.width, y: ((1 - sunOnScreen.y) / 2) * stage.height } : null;
  flare.update(sun, viewfinder.rect, state === 'playing' && t < 18, dt);
}

/** mode: 'current' (from the title, tonight is already built) or 'new' (from the album). */
function begin(mode = 'current') {
  if (state === 'playing' || state === 'opening') return;
  audio.start();
  album.hide();
  if (mode === 'current') {
    startRun();
    return;
  }
  prepareEvening(randomEveningNumber());
  t = 0;
  hud.setWhiteout(0);
  state = 'opening';
  popUp(0);
  opening = { at: wall, then: startRun };
}

function startRun() {
  audio.start().then(() => audio.startRun());
  state = 'playing';
  t = 0;
  photos = [];
  freshStickers = 0;
  lockedUntil = 0;
  pendingShot = null;
  particles.clear();
  hud.startRun();
  trackAim(0);
  aim.vx = aim.vy = 0;
  viewfinder.enabled = true;
}

function requestShot() {
  if (state !== 'playing' || photos.length >= SHOTS || t < lockedUntil || pendingShot) return;
  pendingShot = viewfinder.rect;
}

/** How fast the viewfinder is moving, for motion blur in photos (smoothed over ~60 ms). */
const aim = { x: 0, y: 0, vx: 0, vy: 0 };

function trackAim(dt) {
  const r = viewfinder.rect;
  const ax = r.x + r.size / 2;
  const ay = r.y + r.size / 2;
  if (dt > 0) {
    const k = 1 - Math.exp(-dt / 0.06);
    aim.vx += ((ax - aim.x) / dt - aim.vx) * k;
    aim.vy += ((ay - aim.y) / dt - aim.vy) * k;
  }
  aim.x = ax;
  aim.y = ay;
}

/** Develop the viewfinder's square of the frame that was just rendered into an instant photo. */
function capture(rect) {
  const src = stage.renderer.domElement;
  const speed = Math.hypot(aim.vx, aim.vy);
  return develop(src, rect, {
    ratio: src.width / stage.width,
    // Log scale, because zooming multiplies the size: the starting size stays sharp.
    zoom: Math.log(VIEWFINDER.max / viewfinder.size) / Math.log(VIEWFINDER.max / VIEWFINDER.min),
    speed,
    dir: speed > 0 ? { x: aim.vx / speed, y: aim.vy / speed } : { x: 0, y: 0 },
    t,
    size: PHOTO_SIZE,
  });
}

function takePhoto(rect) {
  const dataUrl = capture(rect);
  const result = scorePhoto({ t, rect, stage, cast: show });
  photos.push({ dataUrl, ...result, t });
  hud.shot(photos.length - 1, dataUrl);
  audio.shutter();
  if (result.kind === 'peak') {
    audio.addLayer();
    const m = show.moments.find((q) => q.id === result.id);
    if (m?.story && journal.record(m.story.id, m.variant)) freshStickers++;
    else if (m && !m.story) journal.recordCrossover();
  }
  lockedUntil = t + FILM_ADVANCE;
  if (!requestDone && request.test(photos)) {
    requestDone = true;
    hud.requestDone();
  }
}

/**
 * The evening in a line for the album ("You caught 3 of tonight's 9 stories at their peak.
 * You missed a rare one: “A balloon, crossing the sun.”") and a spoiler-free share line.
 */
function summarise(total) {
  const stories = show.moments.filter((m) => m.instance);
  const shotAt = (kind) => new Set(photos.filter((p) => p.id && (!kind || p.kind === kind)).map((p) => p.id));
  const peaked = shotAt('peak');
  const seen = shotAt();
  const caught = stories.filter((m) => peaked.has(m.id)).length;
  let epilogue = `You caught ${caught} of tonight's ${stories.length} stories at their peak.`;
  const missed = stories.find((m) => m.rarity === 'legendary' && !seen.has(m.id)) || stories.find((m) => m.rare && !seen.has(m.id));
  if (missed) {
    epilogue += ` You missed a rare one: “${missed.caption('peak')}”`;
  }
  const marks = photos.map((p) => (!p.dataUrl ? '⬜' : p.legendary ? '🌟' : p.rare ? '✨' : p.kind === 'peak' ? '📸' : '🖼️')).join('');
  const share = `Golden Hour · Evening No. ${evening.number} · ${total.toLocaleString()} · ${marks}`;
  return { epilogue, share };
}

function endRun() {
  state = 'album';
  viewfinder.enabled = false;
  hud.endRun();
  const fulfilled = request.test(photos);
  const bonus = fulfilled ? REQUEST_BONUS : 0;
  while (photos.length < SHOTS) photos.push({ dataUrl: null, caption: 'You were too busy watching.', score: 0 });
  const total = photos.reduce((sum, p) => sum + p.score, 0) + bonus;
  const night = {
    evening: evening.number,
    request: request.text,
    fulfilled,
    bonus,
    ...summarise(total),
    journal: { pages: journal.pages(STORIES), ...journal.count(STORIES), fresh: freshStickers },
  };
  albumAt = wall + 0.7;
  setTimeout(() => {
    album.show(photos, total, night);
    audio.album();
  }, 700);
}

// ── Input outside the viewfinder ──
document.getElementById('title').addEventListener('click', () => begin('current'));
document.getElementById('again').addEventListener('click', (e) => {
  e.stopPropagation();
  begin('new');
});
app.addEventListener('pointerdown', () => {
  if (state === 'opening') opening.at = -Infinity;
});
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  e.preventDefault();
  if (state === 'playing') requestShot();
  else if (state === 'opening') opening.at = -Infinity;
  else if (state === 'title') begin('current');
  else if (state === 'album' && wall > albumAt + 0.4) begin('new');
});

const firstEvening = Number(params.get('evening')) || randomEveningNumber();
if (params.has('story')) {
  // Gallery tool: ?story=kite[,crane]&outcome=alt&peak=6
  state = 'gallery';
  const gallery = {
    only: params.get('story').split(','),
    outcome: params.get('outcome'),
    peak: params.has('peak') ? Number(params.get('peak')) : 6,
  };
  prepareEvening(firstEvening, gallery);
  import('./tools/gallery.js').then(({ startGallery }) =>
    startGallery({
      stage,
      show,
      stories: STORIES,
      options: gallery,
      evening: () => evening,
      prepare: (o) => prepareEvening(evening.number, o),
      getTime: () => t,
      setTime: (v) => (t = v),
    }),
  );
} else if (params.has('all')) {
  // Stress test: every story at once, sharing slots. Not a real evening.
  prepareEvening(firstEvening, { only: STORIES.map((s) => s.id), stress: true });
} else {
  prepareEvening(firstEvening);
}

// ── Main loop ──
const clock = new THREE.Clock();
const STEP = 1 / PUPPET_FPS;
let lastStep = -1;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  viewfinder.update(dt);
  trackAim(dt);
  wall += dt;
  if (state === 'playing') t = Math.min(GAME_LENGTH, t + dt);

  sky.update(t);
  season.update(t, dt);
  stage.setSunRays(sky.state.rays);
  town.update(dt, wall);
  backdrop.update(dt, wall);
  if (opening) {
    const u = (wall - opening.at) / OPENING;
    popUp(Math.min(1, u));
    stage.renderer.shadowMap.needsUpdate = true;
    if (u >= 1) {
      const then = opening.then;
      opening = null;
      then?.();
    }
  }

  // Stop-motion: the cast moves in steps, and the shadow map only needs redrawing then.
  const step = Math.floor(wall / STEP);
  if (step !== lastStep) {
    lastStep = step;
    show.update(Math.floor(t / STEP) * STEP, STEP, step * STEP);
    stage.renderer.shadowMap.needsUpdate = true;
  }
  particles.update(dt);
  stage.setParallax(state === 'playing' && !reducedMotion ? viewfinder.nx : 0);
  if (state === 'playing') {
    audio.update(t);
    if (t >= lockedUntil) hud.unlock();
    const u = Math.max(0, (t - WHITEOUT_START) / (GAME_LENGTH - WHITEOUT_START));
    hud.setWhiteout(Math.pow(u, 2.2));
    if (t > FOLD_START) {
      fold(Math.min(1, (t - FOLD_START) / (GAME_LENGTH - FOLD_START)));
      stage.renderer.shadowMap.needsUpdate = true;
    }
  }
  strings.update();
  updateFlare(dt);

  stage.render(dt);
  stage.adapt(dt);

  if (pendingShot) {
    takePhoto(pendingShot);
    pendingShot = null;
  }
  if (state === 'playing' && t >= GAME_LENGTH) endRun();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
app.classList.add('menu');

// Debug hook for development only.
if (DEV) window.__golden = { stage, show, audio, viewfinder, requestShot, get photos() { return photos; }, get evening() { return evening; }, get request() { return request; }, get t() { return t; }, set t(v) { t = v; } };
