import { EffectComposer, RenderPass, BloomEffect, EffectPass } from 'postprocessing';
import { Settings } from '../core/Settings.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomEffect = new BloomEffect({
      intensity: 0.0,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.025,
      radius: 0.85,
    });

    this.composer.addPass(new EffectPass(camera, this.bloomEffect));
    this.bloomEnabled = Settings.get('bloom');
  }

  setBloomEnabled(enabled) {
    this.bloomEnabled = enabled;
  }

  /** blend in [0,1]: 0 = physical (no glow), 1 = spirit (heavy glow) */
  setBlend(blend) {
    this.bloomEffect.intensity = this.bloomEnabled ? blend * 2.5 : 0;
    this.bloomEffect.luminanceThreshold = 0.9 - blend * 0.6; // 0.9 -> 0.3
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
  }

  render(delta) {
    this.composer.render(delta);
  }
}
