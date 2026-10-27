import { VIEWFINDER } from '../config.js';

const TAP_SLOP = 12;

/**
 * The square viewfinder that follows the pointer.
 * Mouse: move to aim, click to shoot, wheel to zoom.
 * Touch: drag to aim, pinch to zoom, tap to shoot where you tapped.
 */
export class Viewfinder {
  constructor(container, el, { onShoot }) {
    this.container = container;
    this.el = el;
    this.onShoot = onShoot;
    this.enabled = false;
    this.cx = container.clientWidth / 2;
    this.cy = container.clientHeight / 2;
    this.size = VIEWFINDER.start;
    this.touches = new Map();
    this.pinch = null;
    this.gesture = null;

    container.addEventListener('pointermove', (e) => this.onMove(e));
    container.addEventListener('pointerdown', (e) => this.onDown(e));
    container.addEventListener('pointerup', (e) => this.onUp(e));
    container.addEventListener('pointercancel', (e) => this.touches.delete(e.pointerId));
    container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('resize', () => this.render());
    this.render();
  }

  get height() {
    return this.container.clientHeight;
  }

  get width() {
    return this.container.clientWidth;
  }

  /** The frame in CSS pixels, clamped to stay on screen. */
  get rect() {
    const s = Math.min(this.size * this.height, this.width, this.height);
    const x = Math.min(Math.max(this.cx - s / 2, 0), this.width - s);
    const y = Math.min(Math.max(this.cy - s / 2, 0), this.height - s);
    return { x, y, size: s };
  }

  /** Pointer x in [-1, 1], for camera parallax. */
  get nx() {
    return (this.cx / this.width) * 2 - 1;
  }

  zoomBy(factor) {
    this.size = Math.min(VIEWFINDER.max, Math.max(VIEWFINDER.min, this.size * factor));
    this.render();
  }

  aim(x, y) {
    this.cx = x;
    this.cy = y;
    this.render();
  }

  local(e) {
    const r = this.container.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onMove(e) {
    const p = this.local(e);
    if (e.pointerType === 'mouse') {
      this.aim(p.x, p.y);
      return;
    }
    if (!this.touches.has(e.pointerId)) return;
    this.touches.set(e.pointerId, p);
    if (this.touches.size >= 2 && this.pinch) {
      const d = this.pinchDistance();
      this.zoomBy(d / this.pinch);
      this.pinch = d;
      return;
    }
    if (this.gesture && Math.hypot(p.x - this.gesture.x, p.y - this.gesture.y) > TAP_SLOP) this.gesture.moved = true;
    this.aim(p.x, p.y);
  }

  onDown(e) {
    if (!this.enabled) return;
    const p = this.local(e);
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      this.aim(p.x, p.y);
      this.onShoot();
      return;
    }
    this.touches.set(e.pointerId, p);
    if (this.touches.size === 1) {
      this.gesture = { x: p.x, y: p.y, moved: false, pinched: false };
      this.aim(p.x, p.y);
    } else if (this.touches.size === 2) {
      this.pinch = this.pinchDistance();
      if (this.gesture) this.gesture.pinched = true;
    }
  }

  onUp(e) {
    if (e.pointerType === 'mouse' || !this.touches.has(e.pointerId)) return;
    this.touches.delete(e.pointerId);
    if (this.touches.size < 2) this.pinch = null;
    if (this.touches.size === 0 && this.gesture) {
      const g = this.gesture;
      this.gesture = null;
      if (this.enabled && !g.moved && !g.pinched) this.onShoot();
    }
  }

  onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    this.zoomBy(Math.exp(e.deltaY * 0.0012));
  }

  pinchDistance() {
    const [a, b] = [...this.touches.values()];
    return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  }

  render() {
    const { x, y, size } = this.rect;
    this.el.style.width = `${size}px`;
    this.el.style.height = `${size}px`;
    this.el.style.transform = `translate(${x}px, ${y}px)`;
  }
}
