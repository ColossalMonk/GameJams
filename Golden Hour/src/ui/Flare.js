/**
 * Lens flare: when the sun is inside the viewfinder, a few soft rings appear along the
 * line from the sun through the viewfinder's centre, the way light bounces around inside
 * a real lens. It also tells the player the shot will earn the sun bonus.
 */
const RINGS = [
  { at: 0.55, size: 70, colour: 'rgba(255, 220, 160, 0.30)' },
  { at: 1.0, size: 26, colour: 'rgba(255, 245, 210, 0.55)' },
  { at: 1.45, size: 110, colour: 'rgba(255, 170, 120, 0.16)' },
  { at: 1.9, size: 44, colour: 'rgba(190, 220, 255, 0.28)' },
];

export class Flare {
  constructor(container) {
    this.layer = document.createElement('div');
    this.layer.id = 'flare';
    this.rings = RINGS.map((r) => {
      const el = document.createElement('span');
      el.style.width = el.style.height = `${r.size}px`;
      el.style.background = `radial-gradient(circle, ${r.colour} 0%, ${r.colour} 45%, rgba(255,255,255,0) 70%)`;
      this.layer.appendChild(el);
      return { el, ...r };
    });
    container.appendChild(this.layer);
    this.strength = 0;
  }

  /**
   * sun: { x, y } in CSS pixels (or null when off screen); rect: the viewfinder square;
   * on: whether flares should show at all (only while playing).
   */
  update(sun, rect, on, dt) {
    const inside = on && sun && sun.x > rect.x && sun.x < rect.x + rect.size && sun.y > rect.y && sun.y < rect.y + rect.size;
    this.strength += ((inside ? 1 : 0) - this.strength) * Math.min(1, dt * 6);
    this.layer.style.opacity = this.strength.toFixed(3);
    if (this.strength < 0.01 || !sun) return;
    const cx = rect.x + rect.size / 2;
    const cy = rect.y + rect.size / 2;
    for (const r of this.rings) {
      const x = sun.x + (cx - sun.x) * r.at * 2 - r.size / 2;
      const y = sun.y + (cy - sun.y) * r.at * 2 - r.size / 2;
      r.el.style.transform = `translate(${x}px, ${y}px)`;
    }
  }
}
