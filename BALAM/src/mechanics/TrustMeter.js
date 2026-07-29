// Passive proximity build is intentionally small — trust is meant to be *earned* by solving
// gates together (see addTrust calls in each zone's rules), not accumulated by idling nearby.
const BUILD_RATE = 0.015; // per second, small trickle when within proximity
const ADJACENT_TILES = 1; // same tile or directly adjacent
const ADJACENT_BUILD_RATE = 0.06; // per second, much faster when side-by-side
const DECAY_RATE = 0.05; // per second, once far apart past grace period
const PROXIMITY_TILES = 4;
export const FAR_TILES = 8;
const FAR_GRACE = 3; // seconds before decay kicks in — tighter than before, separation has real cost
const LOST_TILES = 10;
const LOST_GRACE = 30; // seconds before soft-reset triggers
const SWITCH_FAR_PENALTY = 0.05; // instant cost for switching control while far apart — no ping-ponging

export class TrustMeter {
  constructor() {
    this.value = 0.5;
    this._farTimer = 0;
    this._lostTimer = 0;
    this.onLost = null;
    this.onMilestone = null; // called with ('bleed'|'vines'|'unlock', active:boolean)
    this._wasBleed = false;
    this._wasVines = false;
  }

  addTrust(amount) {
    this.value = Math.min(1, Math.max(0, this.value + amount));
  }

  /** Called when the player switches active character while far from their partner. */
  penalizeSeparation() {
    this.value = Math.max(0, this.value - SWITCH_FAR_PENALTY);
  }

  update(dt, tileDistance) {
    if (tileDistance <= ADJACENT_TILES) {
      this.value = Math.min(1, this.value + ADJACENT_BUILD_RATE * dt);
    } else if (tileDistance <= PROXIMITY_TILES) {
      this.value = Math.min(1, this.value + BUILD_RATE * dt);
    }

    if (tileDistance > FAR_TILES) {
      this._farTimer += dt;
      if (this._farTimer > FAR_GRACE) {
        this.value = Math.max(0, this.value - DECAY_RATE * dt);
      }
    } else {
      this._farTimer = 0;
    }

    if (tileDistance > LOST_TILES) {
      this._lostTimer += dt;
      if (this._lostTimer > LOST_GRACE) {
        this._lostTimer = 0;
        if (this.onLost) this.onLost();
      }
    } else {
      this._lostTimer = 0;
    }

    const vines = this.value < 0.3;
    const bleed = this.value > 0.7;
    if (vines !== this._wasVines) { this._wasVines = vines; this.onMilestone && this.onMilestone('vines', vines); }
    if (bleed !== this._wasBleed) { this._wasBleed = bleed; this.onMilestone && this.onMilestone('bleed', bleed); }
  }

  get gateReady() {
    return this.value >= 1.0;
  }

  reset(value = 0.5) {
    this.value = value;
    this._farTimer = 0;
    this._lostTimer = 0;
  }
}
