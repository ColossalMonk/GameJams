import * as THREE from 'three';
import { Particles } from './Particles.js';
import { Audio } from './Audio.js';

const COLORS = {
  dry: new THREE.Color(0xd8c9a3),
  fire: new THREE.Color(0xff6a1a),
  burnt: new THREE.Color(0x2b2b2b),
  outlet: new THREE.Color(0xe0c860),
  flammable: new THREE.Color(0xc98b3a),
  critical: new THREE.Color(0x7a3ae0),
  water: new THREE.Color(0x2f8fd0),
};

// Hazard-tile glyph icons - drawn as vector shapes on a small canvas rather
// than font glyphs/emoji, so they render identically everywhere and match
// the flat-shaded, no-external-assets look already used for Particles.js's
// soft/ring textures. Tile TYPE color can collide with a per-level palette
// (it did once, level 6 vs the outlet color) - these icons give hazard
// meaning a second, palette-independent channel to read from.
function makeIconTexture(draw) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  return new THREE.CanvasTexture(canvas);
}

function drawBolt(ctx, size) {
  ctx.fillStyle = '#fff2a0';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size * 0.55, size * 0.06);
  ctx.lineTo(size * 0.26, size * 0.55);
  ctx.lineTo(size * 0.46, size * 0.55);
  ctx.lineTo(size * 0.4, size * 0.94);
  ctx.lineTo(size * 0.76, size * 0.4);
  ctx.lineTo(size * 0.54, size * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawFlame(ctx, size) {
  ctx.fillStyle = '#ffb04d';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.06);
  ctx.bezierCurveTo(size * 0.86, size * 0.34, size * 0.68, size * 0.5, size * 0.78, size * 0.72);
  ctx.bezierCurveTo(size * 0.78, size * 0.9, size * 0.62, size * 0.97, size * 0.5, size * 0.97);
  ctx.bezierCurveTo(size * 0.38, size * 0.97, size * 0.22, size * 0.9, size * 0.22, size * 0.72);
  ctx.bezierCurveTo(size * 0.32, size * 0.5, size * 0.14, size * 0.34, size * 0.5, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawWarning(ctx, size) {
  ctx.fillStyle = '#d9a6ff';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.06);
  ctx.lineTo(size * 0.94, size * 0.9);
  ctx.lineTo(size * 0.06, size * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(size * 0.46, size * 0.38, size * 0.08, size * 0.28);
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.76, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

// Built once, shared across every GridRenderer instance/level (like
// Particles.js's SOFT_TEX/RING_TEX) - never disposed per-level.
const ICON_TEXTURES = {
  outlet: makeIconTexture(drawBolt),
  flammable: makeIconTexture(drawFlame),
  critical: makeIconTexture(drawWarning),
};

export class GridRenderer {
  // `palette` optionally overrides { dry, wall, baseboard } per level, so
  // rooms don't all look identical - everything else (fire/water/hazard
  // colors) stays consistent across levels on purpose, for legend readability.
  constructor(scene, grid, tileSize = 1, palette = {}) {
    this.scene = scene;
    this.grid = grid;
    this.tileSize = tileSize;
    this.group = new THREE.Group();
    this.meshes = [];
    this.waterMeshes = [];
    this.dryColor = palette.dry != null ? new THREE.Color(palette.dry) : COLORS.dry;

    const geo = new THREE.PlaneGeometry(tileSize * 0.96, tileSize * 0.96);
    geo.rotateX(-Math.PI / 2);
    const waterGeo = new THREE.PlaneGeometry(tileSize * 0.98, tileSize * 0.98);
    waterGeo.rotateX(-Math.PI / 2);

    for (let y = 0; y < grid.height; y++) {
      const row = [];
      const waterRow = [];
      for (let x = 0; x < grid.width; x++) {
        // base floor tile - color reflects TYPE (dry/outlet/flammable/critical) or burnt state.
        // it never changes color for water anymore, so type stays readable underneath a puddle.
        const mat = new THREE.MeshStandardMaterial({ color: this.dryColor, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x * tileSize, 0, y * tileSize);
        mesh.receiveShadow = true;
        this.group.add(mesh);
        row.push(mesh);

        // separate transparent water plane, sits slightly above the floor.
        // opacity + height scale with water level so puddles actually read as water.
        const waterMat = new THREE.MeshStandardMaterial({
          color: COLORS.water,
          transparent: true,
          opacity: 0,
          roughness: 0.15,
          metalness: 0.1,
        });
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.set(x * tileSize, 0.02, y * tileSize);
        waterMesh.visible = false;
        this.group.add(waterMesh);
        waterRow.push(waterMesh);
      }
      this.meshes.push(row);
      this.waterMeshes.push(waterRow);
    }

    this._addWalls(grid, tileSize, palette);
    this._addHazardIcons(grid, tileSize);

    // pooled fire/smoke/splash VFX, owned here the same way fireSprites
    // used to be owned inline - see Particles.js.
    this.particles = new Particles(scene, grid, tileSize);

    // periodic splash burst at each leak source, purely visual - doesn't
    // touch Grid.js's simulation state at all.
    this._leakSplashTimers = grid.leakSources.map(() => Math.random() * 0.6);
    this._lastFlowTick = grid.tickCount;

    scene.add(this.group);
  }

  // Just two flat walls + a baseboard trim so the room reads as a space
  // rather than tiles floating in a void. Deliberately minimal - no windows,
  // no texture, just enough to give the camera something to frame against.
  _addWalls(grid, tileSize, palette = {}) {
    const w = grid.width * tileSize;
    const h = grid.height * tileSize;
    const wallHeight = 2.4;
    const wallMat = new THREE.MeshStandardMaterial({ color: palette.wall ?? 0x3a3f4a, roughness: 1 });
    const baseboardMat = new THREE.MeshStandardMaterial({ color: palette.baseboard ?? 0x24272e, roughness: 1 });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(w + 1, wallHeight), wallMat);
    backWall.position.set(w / 2 - tileSize / 2, wallHeight / 2, -tileSize / 2);
    this.group.add(backWall);

    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(h + 1, wallHeight), wallMat);
    sideWall.rotation.y = Math.PI / 2;
    sideWall.position.set(-tileSize / 2, wallHeight / 2, h / 2 - tileSize / 2);
    this.group.add(sideWall);

    const baseboardBack = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.15, 0.05), baseboardMat);
    baseboardBack.position.set(w / 2 - tileSize / 2, 0.08, -tileSize / 2 + 0.02);
    this.group.add(baseboardBack);

    const baseboardSide = new THREE.Mesh(new THREE.BoxGeometry(h + 1, 0.15, 0.05), baseboardMat);
    baseboardSide.rotation.y = Math.PI / 2;
    baseboardSide.position.set(-tileSize / 2 + 0.02, 0.08, h / 2 - tileSize / 2);
    this.group.add(baseboardSide);
  }

  // One static icon sprite per hazard tile (outlet/flammable/critical),
  // built once - not pooled, since hazard tile positions never move within
  // a level. Hidden once a tile is burnt or already ablaze (fire sprites
  // and the burnt color already carry that state, an icon there is clutter).
  _addHazardIcons(grid, tileSize) {
    this.hazardIcons = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        const tex = ICON_TEXTURES[tile.type];
        if (!tex) continue;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.34, 0.34, 0.34);
        sprite.position.set(x * tileSize, 0.32, y * tileSize);
        this.group.add(sprite);
        this.hazardIcons.push({ sprite, tile });
      }
    }
  }


  worldCenter() {
    return new THREE.Vector3(
      (this.grid.width - 1) * this.tileSize / 2,
      0,
      (this.grid.height - 1) * this.tileSize / 2
    );
  }

  update(dt = 0) {
    const now = performance.now();
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const t = this.grid.tiles[y][x];
        const mesh = this.meshes[y][x];
        const waterMesh = this.waterMeshes[y][x];

        // floor color reflects TYPE + burnt/fire state only - water no longer
        // muddies this, so tile purpose (outlet/flammable/critical) stays legible.
        let target;
        if (t.burnt) target = COLORS.burnt;
        else if (t.fire) target = COLORS.fire;
        else if (t.type === 'outlet') target = COLORS.outlet;
        else if (t.type === 'flammable') target = COLORS.flammable;
        else if (t.type === 'critical') target = COLORS.critical;
        else target = this.dryColor;
        mesh.material.color.lerp(target, 0.25);

        // water is its own transparent layer: opacity + slight rise scale with level,
        // so "wet" is unambiguously a puddle sitting on top of the floor. A small
        // per-tile sine term on both opacity and height gives a cheap ripple
        // without a custom shader.
        if (t.water > 2) {
          waterMesh.visible = true;
          const level = t.water / 100;
          const ripple = Math.sin(now * 0.002 + x * 0.7 + y * 0.9) * 0.05;
          waterMesh.material.opacity = THREE.MathUtils.lerp(waterMesh.material.opacity, 0.15 + level * 0.65 + ripple, 0.3);
          waterMesh.position.y = 0.02 + level * 0.08 + ripple * 0.03;
        } else {
          waterMesh.material.opacity = THREE.MathUtils.lerp(waterMesh.material.opacity, 0, 0.3);
          if (waterMesh.material.opacity < 0.02) waterMesh.visible = false;
        }
      }
    }

    for (const { sprite, tile } of this.hazardIcons) {
      sprite.visible = !tile.burnt && !tile.fire;
    }

    this.particles.update(dt);

    this.grid.leakSources.forEach((src, i) => {
      this._leakSplashTimers[i] -= dt;
      if (this._leakSplashTimers[i] <= 0) {
        this.particles.spawnSplash(src.x, src.y);
        Audio.playSfx('leak.drip', { volume: 0.35 });
        this._leakSplashTimers[i] = 0.5 + Math.random() * 0.3;
      }
    });

    // Spawn a flow streak per qualifying edge from the tick that just ran,
    // so water spread reads as visible movement rather than values jumping.
    // Grid.tickCount only advances once per sim tick (not every frame), so
    // this only fires when there's actually something new to show.
    if (this.grid.tickCount !== this._lastFlowTick) {
      this._lastFlowTick = this.grid.tickCount;
      const edges = [...this.grid.lastFlowEdges].sort((a, b) => b.amount - a.amount).slice(0, 8);
      for (const e of edges) {
        this.particles.spawnFlow(e.fx, e.fy, e.tx, e.ty, e.amount);
      }
    }
  }

  dispose() {
    this.particles.dispose();
    this.scene.remove(this.group);
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) obj.material.dispose?.();
    });
  }
}

// Simple "floating chaos" objects - not real physics, just position/rotation
// nudging when the tile beneath them is flooded enough. Cheap and reads fine
// from the fixed isometric camera.
export class FloatingObjects {
  constructor(scene, grid, tileSize, specs) {
    this.scene = scene;
    this.grid = grid;
    this.tileSize = tileSize;
    this.objects = [];

    const geoBox = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    for (const spec of specs || []) {
      const mat = new THREE.MeshStandardMaterial({ color: spec.color ?? 0x996633 });
      const mesh = new THREE.Mesh(geoBox, mat);
      mesh.position.set(spec.x * tileSize, 0.25, spec.y * tileSize);
      mesh.castShadow = true;
      scene.add(mesh);
      this.objects.push({
        mesh,
        gridX: spec.x,
        gridY: spec.y,
        vx: 0,
        vz: 0,
        floating: false,
      });
    }
  }

  update(dt) {
    for (const o of this.objects) {
      const gx = Math.round(o.mesh.position.x / this.tileSize);
      const gz = Math.round(o.mesh.position.z / this.tileSize);
      const tile = this.grid.getTile(gx, gz);
      const wet = tile && tile.water > 55;

      if (wet) {
        o.floating = true;
        o.vx += (Math.random() - 0.5) * 0.4 * dt;
        o.vz += (Math.random() - 0.5) * 0.4 * dt;
        o.vx = THREE.MathUtils.clamp(o.vx, -0.6, 0.6);
        o.vz = THREE.MathUtils.clamp(o.vz, -0.6, 0.6);
        o.mesh.position.x += o.vx * dt;
        o.mesh.position.z += o.vz * dt;
        o.mesh.position.y = 0.25 + Math.sin(performance.now() * 0.003 + o.gridX) * 0.05;
        o.mesh.rotation.y += o.vx * dt;
      } else if (o.floating) {
        // settles once water recedes
        o.vx *= 0.9;
        o.vz *= 0.9;
      }
    }
  }

  dispose() {
    for (const o of this.objects) {
      this.scene.remove(o.mesh);
      o.mesh.geometry.dispose?.();
      o.mesh.material.dispose?.();
    }
  }
}
