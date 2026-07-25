import * as THREE from 'three';

// Exported so TileMotion.js (Player/NPC grid-stepping) can reuse the same
// easing curve instead of duplicating it a third time.
export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Lerps the camera from (fromPos, fromLookAt) to (toPos, toLookAt) over `duration` seconds.
// Returns a promise that resolves when done. Call update(dt) each frame while active.
export class CameraTween {
  constructor(camera) {
    this.camera = camera;
    this.active = false;
  }

  play(fromPos, fromLookAt, toPos, toLookAt, duration) {
    this.fromPos = fromPos.clone();
    this.fromLookAt = fromLookAt.clone();
    this.toPos = toPos.clone();
    this.toLookAt = toLookAt.clone();
    this.duration = duration;
    this.elapsed = 0;
    this.active = true;

    this.camera.position.copy(this.fromPos);
    this.camera.lookAt(this.fromLookAt);

    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  update(dt) {
    if (!this.active) return;
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    const e = easeInOutQuad(t);

    const pos = new THREE.Vector3().lerpVectors(this.fromPos, this.toPos, e);
    const look = new THREE.Vector3().lerpVectors(this.fromLookAt, this.toLookAt, e);
    this.camera.position.copy(pos);
    this.camera.lookAt(look);

    if (t >= 1) {
      this.active = false;
      this._resolve?.();
    }
  }
}

// Trauma-based camera shake, applied on top of a static base frame during
// gameplay (sprinkler trigger, critical-tile loss). Resets from the cached
// base position/lookAt every call rather than mutating camera.position
// additively - otherwise it drifts permanently once trauma decays, since
// nothing else touches the camera while CameraTween is inactive.
export class CameraShake {
  constructor() {
    this.trauma = 0;
  }

  trigger(amount = 0.5) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  applyTo(camera, basePos, baseLook, dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    camera.position.copy(basePos);
    if (this.trauma > 0) {
      const power = this.trauma * this.trauma;
      camera.position.x += (Math.random() - 0.5) * 0.3 * power;
      camera.position.y += (Math.random() - 0.5) * 0.2 * power;
    }
    camera.lookAt(baseLook);
  }
}

// Standard wide isometric-ish shot used during gameplay for a given grid size.
export function gameplayCameraFrame(gridRenderer) {
  const center = gridRenderer.worldCenter();
  const span = Math.max(gridRenderer.grid.width, gridRenderer.grid.height);
  const pos = new THREE.Vector3(center.x - span * 0.6, span * 0.95, center.z + span * 0.9);
  return { pos, look: center };
}

// Close-up "drip" shot used at the start of the intro cutscene.
export function closeUpCameraFrame(gridRenderer) {
  const leak = gridRenderer.grid.leakSources[0] || { x: 0, y: 0 };
  const target = new THREE.Vector3(leak.x, 0, leak.y);
  const pos = new THREE.Vector3(leak.x + 0.8, 0.9, leak.y + 1.2);
  return { pos, look: target };
}

// Slow crane-up/back shot used for outro / finale.
export function outroCameraFrame(gridRenderer) {
  const center = gridRenderer.worldCenter();
  const span = Math.max(gridRenderer.grid.width, gridRenderer.grid.height);
  const pos = new THREE.Vector3(center.x - span * 1.3, span * 1.8, center.z + span * 1.6);
  return { pos, look: center };
}
