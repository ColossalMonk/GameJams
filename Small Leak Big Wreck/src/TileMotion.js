import * as THREE from 'three';
import { easeInOutQuad } from './Cutscenes.js';

// Shared "slide from one tile to an adjacent tile over `duration` seconds"
// primitive - used by Player.js (input-driven) and NPC.js (AI-driven) so
// both move with the exact same grid-snap feel instead of two copies of
// this interpolation logic drifting apart.
export class TileStepper {
  constructor(startX, startY, duration = 0.15) {
    this.gridX = startX;
    this.gridY = startY;
    this.duration = duration;
    this.isMoving = false;
    this.elapsed = 0;
    this.fromX = startX;
    this.fromY = startY;
    this.toX = startX;
    this.toY = startY;
  }

  // dx/dy each in {-1,0,1}. Commits gridX/gridY to the DESTINATION tile
  // immediately (not on arrival) - this is deliberate: it's what lets
  // Grid.mop()/Grid.getTile() target gridX/gridY directly and unambiguously
  // the instant a step starts, rather than waiting out the slide.
  startStep(dx, dy) {
    if (this.isMoving || (dx === 0 && dy === 0)) return false;
    this.fromX = this.gridX;
    this.fromY = this.gridY;
    this.toX = this.gridX + dx;
    this.toY = this.gridY + dy;
    this.gridX = this.toX;
    this.gridY = this.toY;
    this.isMoving = true;
    this.elapsed = 0;
    return true;
  }

  // Advances the slide and returns the current tile-space world position
  // (in tile units, not yet multiplied by tileSize) plus whether this call
  // just completed the step.
  update(dt) {
    if (!this.isMoving) {
      return { x: this.gridX, y: this.gridY, justArrived: false };
    }
    this.elapsed += dt;
    const raw = Math.min(1, this.elapsed / this.duration);
    const eased = easeInOutQuad(raw);
    const x = THREE.MathUtils.lerp(this.fromX, this.toX, eased);
    const y = THREE.MathUtils.lerp(this.fromY, this.toY, eased);
    const justArrived = raw >= 1;
    if (justArrived) this.isMoving = false;
    return { x, y, justArrived };
  }
}
