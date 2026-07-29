import * as THREE from 'three';
import { stoneNameTexture } from '../rendering/ProceduralTextures.js';

const STATE = {
  WALK: 'walk',
  REVEAL: 'reveal',
  THREAD: 'thread',
  TEXT: 'text',
  FADE: 'fade',
  DONE: 'done',
};

const WALK_TIME = 1.2;
const REVEAL_TIME = 2.5;
const THREAD_TIME = 2.0;
const TEXT_HOLD = 5.0;
const FADE_TIME = 2.0;

export class CenterSequence {
  constructor({ scene, explorer, jaguar, trustBond, hud, centerWorldPos, playerName, onComplete }) {
    this.scene = scene;
    this.explorer = explorer;
    this.jaguar = jaguar;
    this.trustBond = trustBond;
    this.hud = hud;
    this.centerWorldPos = centerWorldPos;
    this.playerName = playerName || 'THE EXPLORER';
    this.onComplete = onComplete;

    this.state = STATE.WALK;
    this.t = 0;

    this.explorerStart = explorer.worldPosition.clone();
    this.jaguarStart = jaguar.worldPosition.clone();
    this.explorerEnd = centerWorldPos.clone().add(new THREE.Vector3(-0.6, 0, 0.4));
    this.jaguarEnd = centerWorldPos.clone().add(new THREE.Vector3(0.7, 0, 0.5));

    const geo = new THREE.PlaneGeometry(1.1, 1.1);
    const mat = new THREE.MeshBasicMaterial({ map: stoneNameTexture(this.playerName, 0), transparent: true });
    this.nameplate = new THREE.Mesh(geo, mat);
    this.nameplate.position.copy(centerWorldPos).add(new THREE.Vector3(0, 1.6, -0.3));
    this.nameplate.rotation.x = -0.2;
    this.scene.add(this.nameplate);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.03, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffb830, transparent: true, opacity: 0 })
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.copy(centerWorldPos).add(new THREE.Vector3(0, 0.1, 0));
    this.scene.add(this.ring);
  }

  update(dt) {
    this.t += dt;

    if (this.state === STATE.WALK) {
      const p = Math.min(1, this.t / WALK_TIME);
      this.explorer.mesh.position.lerpVectors(this.explorerStart, this.explorerEnd, p);
      this.jaguar.mesh.position.lerpVectors(this.jaguarStart, this.jaguarEnd, p);
      if (p >= 1) this._next(STATE.REVEAL);
    } else if (this.state === STATE.REVEAL) {
      const p = Math.min(1, this.t / REVEAL_TIME);
      this.nameplate.material.map = stoneNameTexture(this.playerName, p);
      this.nameplate.material.map.needsUpdate = true;
      if (p >= 1) this._next(STATE.THREAD);
    } else if (this.state === STATE.THREAD) {
      const p = Math.min(1, this.t / THREAD_TIME);
      this.trustBond.update(1.0);
      this.ring.material.opacity = Math.sin(p * Math.PI) * 0.9;
      this.ring.scale.setScalar(1 + p * 14);
      if (p >= 1) this._next(STATE.TEXT);
    } else if (this.state === STATE.TEXT) {
      if (this.t === 0 || this._justEnteredText) {
        this._justEnteredText = false;
      }
      if (this.t <= dt * 1.5) this.hud.showEndingText('"The jungle has always known who would come."');
      if (this.t >= TEXT_HOLD) this._next(STATE.FADE);
    } else if (this.state === STATE.FADE) {
      // fade handled by caller via getFadeAlpha()
      if (this.t >= FADE_TIME) this._next(STATE.DONE);
    } else if (this.state === STATE.DONE) {
      if (this.onComplete) {
        this.onComplete();
        this.onComplete = null;
      }
    }
  }

  getFadeAlpha() {
    if (this.state !== STATE.FADE && this.state !== STATE.DONE) return 0;
    return Math.min(1, this.t / FADE_TIME);
  }

  _next(state) {
    this.state = state;
    this.t = 0;
  }

  dispose() {
    this.scene.remove(this.nameplate);
    this.scene.remove(this.ring);
    this.nameplate.geometry.dispose();
    this.nameplate.material.map?.dispose();
    this.nameplate.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
  }
}
