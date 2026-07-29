const TRANSITION_TIME = 0.6;

export class LayerManager {
  constructor() {
    this.activeLayer = 'physical';
    this.activeCharacter = 'explorer';
    this.blend = 0; // 0 = physical, 1 = spirit
    this._targetBlend = 0;
    this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onSwitch = null;
  }

  switch() {
    this.activeLayer = this.activeLayer === 'physical' ? 'spirit' : 'physical';
    this.activeCharacter = this.activeCharacter === 'explorer' ? 'jaguar' : 'explorer';
    this._targetBlend = this.activeLayer === 'spirit' ? 1 : 0;
    if (this.reducedMotion) this.blend = this._targetBlend;
    if (this.onSwitch) this.onSwitch(this.activeLayer, this.activeCharacter);
  }

  update(dt) {
    if (this.blend === this._targetBlend) return;
    const step = dt / TRANSITION_TIME;
    if (this.blend < this._targetBlend) this.blend = Math.min(this._targetBlend, this.blend + step);
    else this.blend = Math.max(this._targetBlend, this.blend - step);
  }
}
