import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { VIEW_BOX } from '../config.js';

/**
 * Renderer, camera and post-processing. The camera is fixed (a paper theatre seen from
 * the audience) and always fits VIEW_BOX on screen, with a little parallax from the pointer.
 */
export class Stage3D {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      stencil: false,
      depth: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
    this.target = new THREE.Vector3();
    this.basePosition = new THREE.Vector3();
    this.parallax = 0;

    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: Math.min(4, this.renderer.capabilities.maxSamples),
    });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new BloomEffect({
      intensity: 0.9,
      luminanceThreshold: 0.72,
      luminanceSmoothing: 0.25,
      mipmapBlur: true,
      radius: 0.75,
    });
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.5 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
    const grain = new NoiseEffect({ premultiply: true });
    grain.blendMode.opacity.value = 0.32;
    this.composer.addPass(new EffectPass(this.camera, this.bloom, tone, vignette, grain));

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  get width() {
    return this.container.clientWidth;
  }

  get height() {
    return this.container.clientHeight;
  }

  resize() {
    const w = this.width;
    const h = this.height;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.fit();
  }

  /** Back the camera off until all of VIEW_BOX is visible. */
  fit() {
    const cam = this.camera;
    const halfW = (VIEW_BOX.right - VIEW_BOX.left) / 2;
    const halfH = (VIEW_BOX.top - VIEW_BOX.bottom) / 2;
    const cx = (VIEW_BOX.right + VIEW_BOX.left) / 2;
    const vTan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const hTan = vTan * cam.aspect;
    const d = Math.max(halfW / hTan, halfH / vTan);
    // Any spare height goes to the sky rather than the pavement.
    const visibleHalfH = d * vTan;
    this.target.set(cx, VIEW_BOX.bottom + visibleHalfH, 0);
    this.basePosition.set(cx, this.target.y + d * 0.07, d);
    cam.updateProjectionMatrix();
    this.applyCamera();
  }

  /** nx in [-1, 1]: a gentle sideways drift that makes the layers slide past each other. */
  setParallax(nx) {
    this.parallax += (nx - this.parallax) * 0.06;
    this.applyCamera();
  }

  applyCamera() {
    this.camera.position.copy(this.basePosition);
    this.camera.position.x += this.parallax * 0.35;
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  render(dt) {
    this.composer.render(dt);
  }
}
