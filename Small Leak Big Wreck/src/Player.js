import * as THREE from 'three';
import { TileStepper } from './TileMotion.js';
import { buildHumanoid, applyWalkCycle } from './Humanoid.js';
import { Audio } from './Audio.js';

export class Player {
  constructor(scene, grid, tileSize) {
    this.scene = scene;
    this.grid = grid;
    this.tileSize = tileSize;
    this.mopRate = 22; // water removed per second while mopping

    const parts = buildHumanoid();
    this.mesh = parts.root; // kept as "mesh" so main.js/other files don't need changes
    this.parts = parts;
    this.walkCycle = 0;

    // Grid-snap movement: gridX/gridY (via stepper) are the source of
    // truth, mesh.position is derived from them each frame. This removes
    // the old free-roam ambiguity where mop() had to guess which tile a
    // mid-air position rounded to - it now always targets an exact tile.
    const startX = Math.floor(grid.width / 2);
    const startY = Math.floor(grid.height / 2);
    this.stepper = new TileStepper(startX, startY, 0.15);
    this.mesh.position.set(startX * tileSize, 0, startY * tileSize);
    scene.add(this.mesh);

    this.keys = {};
    this._bufferedDir = null;
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      const dir = this._dirFromCode(e.code);
      // Latch the most recent direction press so a tap during an in-flight
      // slide isn't dropped - it fires the instant the current step lands.
      if (dir) this._bufferedDir = dir;
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    // Alt-tabbing away while holding a key never fires its keyup (it happens
    // off-window), so without this the janitor keeps walking/mopping on
    // refocus until that same key is pressed again.
    this._onBlur = () => { this.keys = {}; this._bufferedDir = null; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  get gridX() { return this.stepper.gridX; }
  get gridY() { return this.stepper.gridY; }

  get isMopping() {
    // deliberately NOT Space - Space is reserved globally for advancing
    // story/score screens, so mopping needs its own key to avoid confusion.
    return !!this.keys['KeyE'];
  }

  _dirFromCode(code) {
    if (code === 'KeyW' || code === 'ArrowUp') return { dx: 0, dy: -1 };
    if (code === 'KeyS' || code === 'ArrowDown') return { dx: 0, dy: 1 };
    if (code === 'KeyA' || code === 'ArrowLeft') return { dx: -1, dy: 0 };
    if (code === 'KeyD' || code === 'ArrowRight') return { dx: 1, dy: 0 };
    return null;
  }

  // Reads currently-held movement keys into a single orthogonal direction
  // for continuous stepping while a key stays held. Fixed axis priority
  // (vertical wins) when both are held - simple/predictable; not as slick
  // as last-key-pressed priority, but that's a polish upgrade, not a v1 need.
  _pollHeldDir() {
    let dx = 0, dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    else if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (dy === 0) {
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
      else if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    }
    return (dx !== 0 || dy !== 0) ? { dx, dy } : null;
  }

  update(dt) {
    if (!this.stepper.isMoving) {
      const dir = this._bufferedDir || this._pollHeldDir();
      this._bufferedDir = null;
      if (dir) {
        const nx = this.stepper.gridX + dir.dx;
        const ny = this.stepper.gridY + dir.dy;
        if (this.grid.inBounds(nx, ny)) {
          this.stepper.startStep(dir.dx, dir.dy);
          this.mesh.rotation.y = Math.atan2(dir.dx, dir.dy);
        }
      }
    }

    const pos = this.stepper.update(dt);
    this.mesh.position.x = pos.x * this.tileSize;
    this.mesh.position.z = pos.y * this.tileSize;

    if (this.isMopping) {
      this.grid.mop(this.stepper.gridX, this.stepper.gridY, this.mopRate * dt);
    }

    this._animate(dt, this.stepper.isMoving);
  }

  // Shared leg/arm walk-cycle + idle bob (Humanoid.js), plus a Player-only
  // mop-swipe layer that overrides armL/armR/mopGroup while mopping - the
  // shared helper is told to skip arm swing in that case (swingArms).
  _animate(dt, moving) {
    const { armL, armR, mopGroup } = this.parts;

    if (moving) this.walkCycle += dt * 8;
    applyWalkCycle(this.parts, this.walkCycle, moving, { swingArms: !this.isMopping });

    if (this.isMopping) {
      this.mopSwipe = (this.mopSwipe ?? 0) + dt * 10;
      const swipe = Math.sin(this.mopSwipe) * 0.4;
      armR.rotation.x = 0.3 + swipe;
      armL.rotation.x = -0.2 - swipe * 0.3;
      mopGroup.rotation.z = swipe * 0.3;

      // Throttled - one swipe sound per swipe cycle, not one per frame.
      this._mopSoundCooldown = (this._mopSoundCooldown ?? 0) - dt;
      if (this._mopSoundCooldown <= 0) {
        Audio.playSfx('mop.swipe', { volume: 0.4 });
        this._mopSoundCooldown = 0.3;
      }
    } else {
      mopGroup.rotation.z = THREE.MathUtils.lerp(mopGroup.rotation.z, 0, 0.2);
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) obj.material.dispose?.();
    });
  }
}
