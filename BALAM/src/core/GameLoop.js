export class GameLoop {
  constructor(update) {
    this.update = update;
    this.lastTime = performance.now();
    this.running = false;
    this._tick = this._tick.bind(this);
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
  }

  _tick(now) {
    if (!this.running) return;
    let delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (delta > 0.1) delta = 0.1; // clamp on tab-back-in
    this.update(delta);
    requestAnimationFrame(this._tick);
  }
}
