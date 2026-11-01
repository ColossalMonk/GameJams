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
  GodRaysEffect,
} from 'postprocessing';
import { fitCamera } from './framing.js';

/** Highest and lowest pixel ratios we render at; adapt() moves between them. */
const MAX_RATIO = 1.5;
const MIN_RATIO = 0.75;
const RATIO_STEP = 0.25;

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
    // Phones and small machines start at a lower resolution, without multisampling.
    this.lowTier = window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
    this.maxRatio = Math.min(window.devicePixelRatio, this.lowTier ? 1 : MAX_RATIO);
    this.ratio = this.maxRatio;
    this.sampleTime = 0;
    this.samples = 0;
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Redrawn only when the stop-motion cast takes a step (see main.js).
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    container.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
    this.target = new THREE.Vector3();
    this.basePosition = new THREE.Vector3();
    this.parallax = 0;

    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: this.lowTier ? 0 : Math.min(4, this.renderer.capabilities.maxSamples),
    });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new BloomEffect({
      intensity: 0.9,
      luminanceThreshold: 0.72,
      luminanceSmoothing: 0.25,
      mipmapBlur: true,
      radius: 0.75,
    });
    this.vignette = new VignetteEffect({ offset: 0.32, darkness: 0.5 });
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
    this.grain = new NoiseEffect({ premultiply: true });
    this.grain.blendMode.opacity.value = 0.32;
    this.rays = null;
    this.effectPass = new EffectPass(this.camera, this.bloom, this.tone, this.vignette, this.grain);
    this.composer.addPass(this.effectPass);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Adaptive resolution: every two seconds, if frames are slow, drop the pixel ratio a step
   * and never go back above it; if there's clear headroom, climb back toward the cap.
   * The game is fill-bound (bloom and half-float buffers), so this is the knob that matters.
   */
  adapt(dt) {
    if (dt > 0.08) return; // a stall or a background tab, not a real frame time
    this.sampleTime += dt;
    this.samples++;
    if (this.sampleTime < 2) return;
    const avg = this.sampleTime / this.samples;
    this.sampleTime = 0;
    this.samples = 0;
    let next = this.ratio;
    if (avg > 1 / 40 && this.ratio > MIN_RATIO) {
      next = Math.max(MIN_RATIO, this.ratio - RATIO_STEP);
      this.maxRatio = next;
    } else if (avg < 1 / 58 && this.ratio < this.maxRatio) {
      next = Math.min(this.maxRatio, this.ratio + RATIO_STEP);
    }
    if (next === this.ratio) return;
    this.ratio = next;
    this.renderer.setPixelRatio(next);
    this.resize();
  }

  /**
   * Sun rays streaming between the buildings, with the sun disc as the light source.
   * Skipped on the low tier: it's a few extra full-screen passes.
   */
  enableSunRays(sun) {
    if (this.lowTier) return;
    this.rays = new GodRaysEffect(this.camera, sun, {
      resolutionScale: 0.5,
      density: 0.9,
      decay: 0.9,
      weight: 0.22,
      exposure: 0.3,
      samples: 48,
      clampMax: 0.9,
    });
    this.composer.removePass(this.effectPass);
    this.effectPass = new EffectPass(this.camera, this.rays, this.bloom, this.tone, this.vignette, this.grain);
    this.composer.addPass(this.effectPass);
  }

  /** How strong the rays are right now (the sky's keyframes drive this). */
  setSunRays(strength) {
    if (this.rays) this.rays.blendMode.opacity.value = strength;
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
    fitCamera(this.camera, this.target, this.basePosition);
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
