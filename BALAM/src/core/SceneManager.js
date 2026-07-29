import * as THREE from 'three';
import { PALETTE } from '../rendering/LayerMaterials.js';
import { Settings } from './Settings.js';

const CAMERA_OFFSET = new THREE.Vector3(20, 18, 20);
const SPIRIT_Y_LIFT = 1.5;

export class SceneManager {
  constructor(canvasContainer) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.physical.fog);
    this.scene.fog = new THREE.Fog(PALETTE.physical.fog, 25, 70);

    this.renderer = new THREE.WebGLRenderer({ antialias: Settings.get('antialiasing') });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = Settings.get('shadows');
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    canvasContainer.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.zoom = 1;
    this._targetZoom = 1;
    this.depthTint = 0;
    this.camera.position.copy(CAMERA_OFFSET);
    this.camera.lookAt(this.cameraTarget);

    this._buildLights();

    window.addEventListener('resize', () => this._onResize());
    this._onResize();
  }

  _buildLights() {
    this.physicalSun = new THREE.DirectionalLight(0xffd580, 2.2);
    this.physicalSun.position.set(10, 20, 10);
    this.physicalSun.castShadow = true;
    this.physicalSun.shadow.mapSize.set(1024, 1024);
    this.physicalSun.shadow.camera.left = -25;
    this.physicalSun.shadow.camera.right = 25;
    this.physicalSun.shadow.camera.top = 25;
    this.physicalSun.shadow.camera.bottom = -25;
    this.scene.add(this.physicalSun);

    this.physicalAmbient = new THREE.AmbientLight(0x4a7a3a, 0.6);
    this.scene.add(this.physicalAmbient);

    this.spiritMoon = new THREE.DirectionalLight(0x8b7fd4, 0);
    this.spiritMoon.position.set(-10, 15, -10);
    this.scene.add(this.spiritMoon);

    this.spiritAmbient = new THREE.AmbientLight(0x1a1040, 0);
    this.scene.add(this.spiritAmbient);
  }

  /** blend in [0,1]: 0 physical, 1 spirit */
  setLayerBlend(blend) {
    this.physicalSun.intensity = THREE.MathUtils.lerp(2.2, 0.4, blend);
    this.physicalAmbient.intensity = THREE.MathUtils.lerp(0.6, 0.15, blend);
    this.spiritMoon.intensity = THREE.MathUtils.lerp(0, 1.8, blend);
    this.spiritAmbient.intensity = THREE.MathUtils.lerp(0, 0.8, blend);

    const bg = new THREE.Color(PALETTE.physical.fog).lerp(new THREE.Color(PALETTE.spirit.fog), blend);
    bg.multiplyScalar(1 - this.depthTint * 0.45);
    this.scene.background = bg;
    this.scene.fog.color = bg;
    this.scene.fog.near = THREE.MathUtils.lerp(25, 10, this.depthTint);
    this.scene.fog.far = THREE.MathUtils.lerp(70, 38, this.depthTint);

    this.camera.position.set(
      this.cameraTarget.x + CAMERA_OFFSET.x * this.zoom,
      this.cameraTarget.y + CAMERA_OFFSET.y * this.zoom + blend * SPIRIT_Y_LIFT,
      this.cameraTarget.z + CAMERA_OFFSET.z * this.zoom
    );
    this.camera.lookAt(this.cameraTarget);
  }

  /** Smoothly follow a world position (the active character). */
  followTarget(worldPos, dt) {
    const lerpFactor = 1 - Math.pow(0.001, dt);
    this.cameraTarget.lerp(worldPos, lerpFactor);
  }

  /** Nudges the zoom target by `delta` (positive = zoom out), clamped to a sane range. */
  setZoomTarget(delta) {
    this._targetZoom = THREE.MathUtils.clamp(this._targetZoom + delta, 0.5, 2.2);
  }

  /** Smoothly eases the current zoom toward its target — call once per frame. */
  updateZoom(dt) {
    const lerpFactor = 1 - Math.pow(0.001, dt);
    this.zoom += (this._targetZoom - this.zoom) * lerpFactor;
  }

  setShadows(enabled) {
    this.renderer.shadowMap.enabled = enabled;
  }

  /** depth in [0,1]: how far into the jungle this zone is — darkens/thickens the fog. */
  setDepthTint(depth) {
    this.depthTint = depth;
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.onResize) this.onResize(w, h);
  }
}
