import * as THREE from 'three';

// Small procedurally-generated soft-circle / ring textures so fire, smoke
// and splash sprites read as blobs/rings instead of flat squares - no
// external image assets, just two tiny canvases drawn once at module load
// and shared across every sprite material below.
function makeRadialTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makeRingTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

function makeArrowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.04);
  ctx.lineTo(size * 0.92, size * 0.6);
  ctx.lineTo(size * 0.63, size * 0.6);
  ctx.lineTo(size * 0.63, size * 0.96);
  ctx.lineTo(size * 0.37, size * 0.96);
  ctx.lineTo(size * 0.37, size * 0.6);
  ctx.lineTo(size * 0.08, size * 0.6);
  ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

const SOFT_TEX = makeRadialTexture();
const RING_TEX = makeRingTexture();
const ARROW_TEX = makeArrowTexture();

function makeSprite(map, color, opacity, additive) {
  const mat = new THREE.SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const s = new THREE.Sprite(mat);
  s.visible = false;
  return s;
}

// Pooled billboard-sprite VFX for fire/smoke/splash, following the same
// fixed-pool-array pattern GridRenderer already used for its old inline
// fireSprites - sized once, reused, never allocated per-frame.
export class Particles {
  constructor(scene, grid, tileSize) {
    this.scene = scene;
    this.grid = grid;
    this.tileSize = tileSize;

    // 2 sprites per potential fire tile (outer flicker + hot core), capped
    // well under grid.width*grid.height since only a fraction of tiles are
    // ever on fire at once.
    const maxFire = Math.max(4, Math.ceil(grid.width * grid.height * 0.5));
    this.firePool = [];
    for (let i = 0; i < maxFire; i++) {
      const outer = makeSprite(SOFT_TEX, 0xff7a1a, 0.85, true);
      const core = makeSprite(SOFT_TEX, 0xffe14a, 0.9, true);
      scene.add(outer, core);
      this.firePool.push({ outer, core });
    }

    const maxSmoke = Math.max(6, Math.ceil(grid.width * grid.height * 0.35));
    this.smokePool = [];
    for (let i = 0; i < maxSmoke; i++) {
      const sprite = makeSprite(SOFT_TEX, 0x555555, 0, false);
      scene.add(sprite);
      this.smokePool.push({ sprite, active: false, age: 0, life: 0, driftX: 0, driftZ: 0 });
    }
    // recently-burnt tiles get a slow-fading smoke emitter. Kept here, not
    // on Grid tiles - Grid.js is intentionally rendering-free.
    this._burntSeen = new Set();
    this._smokeTimers = new Map(); // "x,y" -> seconds until next puff

    const maxSplash = 10;
    this.splashPool = [];
    for (let i = 0; i < maxSplash; i++) {
      const sprite = makeSprite(RING_TEX, 0xbfe6ff, 0, false);
      scene.add(sprite);
      this.splashPool.push({ sprite, active: false, age: 0, life: 0.5 });
    }

    // Directional flow streaks - makes water diffusion (Grid.js's
    // lastFlowEdges, recomputed each sim tick) read as visible movement
    // between tiles instead of values just changing. Small fixed cap since
    // at most a handful of edges qualify per tick even on the largest grid.
    const maxFlow = 8;
    this.flowPool = [];
    for (let i = 0; i < maxFlow; i++) {
      const sprite = makeSprite(ARROW_TEX, 0x9fd8ff, 0, true);
      scene.add(sprite);
      this.flowPool.push({ sprite, active: false, age: 0, life: 0.5, fromX: 0, fromY: 0, toX: 0, toY: 0 });
    }

    // Rising embers, spawned probabilistically per burning tile per frame.
    const maxEmbers = 24;
    this.emberPool = [];
    for (let i = 0; i < maxEmbers; i++) {
      const sprite = makeSprite(SOFT_TEX, 0xffb04d, 0, true);
      scene.add(sprite);
      this.emberPool.push({ sprite, active: false, age: 0, life: 0, driftX: 0, driftZ: 0 });
    }

    // Real dynamic flicker light, deliberately capped and reused across
    // whichever fire tiles are currently burning - never one light per
    // tile, since a 12x9 room can have well over a dozen simultaneous fire
    // tiles and per-tile dynamic lights would be a real perf risk.
    const MAX_FIRE_LIGHTS = 4;
    this.fireLights = [];
    for (let i = 0; i < MAX_FIRE_LIGHTS; i++) {
      const light = new THREE.PointLight(0xff8a3d, 0, 2.4, 2);
      light.castShadow = false;
      scene.add(light);
      this.fireLights.push(light);
    }
  }

  updateFire(dt) {
    const now = performance.now();
    let idx = 0;
    let lightIdx = 0;
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        if (!this.grid.tiles[y][x].fire) continue;

        if (idx < this.firePool.length) {
          const slot = this.firePool[idx++];
          const flickOuter = 1 + Math.sin(now * 0.012 + x * 1.7 + y * 2.3) * 0.18;
          const flickCore = 1 + Math.sin(now * 0.02 + x * 3.1 + y * 0.9) * 0.25;
          slot.outer.visible = true;
          slot.outer.position.set(x * this.tileSize, 0.42, y * this.tileSize);
          slot.outer.scale.set(0.55 * flickOuter, 0.85 * flickOuter, 0.55 * flickOuter);
          slot.core.visible = true;
          slot.core.position.set(x * this.tileSize, 0.5, y * this.tileSize);
          slot.core.scale.set(0.26 * flickCore, 0.4 * flickCore, 0.26 * flickCore);
        }

        if (Math.random() < 1.1 * dt) this._spawnEmber(x, y);

        if (lightIdx < this.fireLights.length) {
          const light = this.fireLights[lightIdx++];
          const flicker = 0.85 + Math.sin(now * 0.02 + x * 2.1 + y * 3.3) * 0.25 + (Math.random() - 0.5) * 0.15;
          light.position.set(x * this.tileSize, 0.55, y * this.tileSize);
          light.intensity = Math.max(0, 1.2 * flicker);
        }
      }
    }
    for (let i = idx; i < this.firePool.length; i++) {
      this.firePool[i].outer.visible = false;
      this.firePool[i].core.visible = false;
    }
    for (let i = lightIdx; i < this.fireLights.length; i++) {
      this.fireLights[i].intensity = 0;
    }
  }

  _spawnEmber(x, y) {
    const p = this.emberPool.find((p) => !p.active);
    if (!p) return;
    p.active = true;
    p.age = 0;
    p.life = 0.6 + Math.random() * 0.5;
    p.driftX = (Math.random() - 0.5) * 0.3;
    p.driftZ = (Math.random() - 0.5) * 0.3;
    p.sprite.visible = true;
    p.sprite.scale.set(0.06, 0.06, 0.06);
    p.sprite.material.opacity = 0.9;
    p.sprite.position.set(
      (x + (Math.random() - 0.5) * 0.3) * this.tileSize,
      0.45,
      (y + (Math.random() - 0.5) * 0.3) * this.tileSize
    );
  }

  updateEmbers(dt) {
    for (const p of this.emberPool) {
      if (!p.active) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) { p.active = false; p.sprite.visible = false; continue; }
      p.sprite.position.y += dt * 0.7;
      p.sprite.position.x += p.driftX * dt;
      p.sprite.position.z += p.driftZ * dt;
      p.sprite.material.opacity = 0.9 * (1 - t);
    }
  }

  updateSmoke(dt) {
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const key = x + ',' + y;
        if (this.grid.tiles[y][x].burnt && !this._burntSeen.has(key)) {
          this._burntSeen.add(key);
          this._smokeTimers.set(key, 0);
        }
      }
    }
    for (const [key, timer] of this._smokeTimers) {
      const next = timer - dt;
      if (next <= 0) {
        const [x, y] = key.split(',').map(Number);
        this._spawnSmoke(x, y);
        this._smokeTimers.set(key, 0.5 + Math.random() * 0.4);
      } else {
        this._smokeTimers.set(key, next);
      }
    }
    for (const p of this.smokePool) {
      if (!p.active) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) { p.active = false; p.sprite.visible = false; continue; }
      p.sprite.position.y = 0.5 + t * 1.3;
      p.sprite.position.x += p.driftX * dt;
      p.sprite.position.z += p.driftZ * dt;
      const scale = 0.4 + t * 0.7;
      p.sprite.scale.set(scale, scale, scale);
      p.sprite.material.opacity = 0.35 * (1 - t);
    }
  }

  _spawnSmoke(x, y) {
    const p = this.smokePool.find((p) => !p.active);
    if (!p) return;
    p.active = true;
    p.age = 0;
    p.life = 2.2 + Math.random() * 0.8;
    p.driftX = (Math.random() - 0.5) * 0.15;
    p.driftZ = (Math.random() - 0.5) * 0.15;
    p.sprite.visible = true;
    p.sprite.position.set(x * this.tileSize, 0.5, y * this.tileSize);
    p.sprite.scale.set(0.4, 0.4, 0.4);
    p.sprite.material.opacity = 0.35;
  }

  // One-shot ring/droplet burst - call periodically from GridRenderer at
  // leak-source tiles.
  spawnSplash(x, y) {
    const p = this.splashPool.find((p) => !p.active);
    if (!p) return;
    p.active = true;
    p.age = 0;
    p.life = 0.5;
    p.sprite.visible = true;
    p.sprite.position.set(x * this.tileSize, 0.06, y * this.tileSize);
    p.sprite.scale.set(0.1, 0.1, 0.1);
    p.sprite.material.opacity = 0.8;
  }

  updateSplashes(dt) {
    for (const p of this.splashPool) {
      if (!p.active) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) { p.active = false; p.sprite.visible = false; continue; }
      const scale = 0.1 + t * 0.9;
      p.sprite.scale.set(scale, scale, scale);
      p.sprite.material.opacity = 0.8 * (1 - t);
    }
  }

  // One-shot streak sliding from (fromX,fromY) to (toX,toY) - called by
  // GridRenderer whenever it sees Grid.tickCount advance, once per
  // qualifying entry in Grid.lastFlowEdges (already capped to a handful).
  spawnFlow(fromX, fromY, toX, toY, amount) {
    const p = this.flowPool.find((p) => !p.active);
    if (!p) return;
    p.active = true;
    p.age = 0;
    p.life = 0.45;
    p.fromX = fromX;
    p.fromY = fromY;
    p.toX = toX;
    p.toY = toY;
    // Sprite "up" points toward +y in its own texture; atan2(dx,dy) matches
    // the same convention Player.js/NPC.js use for facing rotation.
    const angle = Math.atan2(toX - fromX, toY - fromY);
    p.sprite.material.rotation = -angle;
    p.sprite.visible = true;
    const strength = THREE.MathUtils.clamp(amount / 8, 0.3, 1);
    p.sprite.scale.set(0.22 * strength, 0.32 * strength, 0.22 * strength);
    p.sprite.material.opacity = 0.8;
    p.sprite.position.set(fromX * this.tileSize, 0.07, fromY * this.tileSize);
  }

  updateFlows(dt) {
    for (const p of this.flowPool) {
      if (!p.active) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) { p.active = false; p.sprite.visible = false; continue; }
      const x = THREE.MathUtils.lerp(p.fromX, p.toX, t);
      const y = THREE.MathUtils.lerp(p.fromY, p.toY, t);
      p.sprite.position.set(x * this.tileSize, 0.07, y * this.tileSize);
      p.sprite.material.opacity = 0.8 * (1 - t);
    }
  }

  update(dt) {
    this.updateFire(dt);
    this.updateEmbers(dt);
    this.updateSmoke(dt);
    this.updateSplashes(dt);
    this.updateFlows(dt);
  }

  dispose() {
    const sprites = [
      ...this.firePool.flatMap((p) => [p.outer, p.core]),
      ...this.smokePool.map((p) => p.sprite),
      ...this.splashPool.map((p) => p.sprite),
      ...this.flowPool.map((p) => p.sprite),
      ...this.emberPool.map((p) => p.sprite),
    ];
    for (const s of sprites) {
      this.scene.remove(s);
      s.material.dispose?.();
    }
    for (const light of this.fireLights) {
      this.scene.remove(light);
    }
  }
}
