const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export class InputManager {
  constructor(canvasEl) {
    this.keys = new Set();
    this.onSwitch = null;
    this.onInteract = null;
    this.onPause = null;
    this.onLeftClick = null; // (clientX, clientY) — Jaguar move-to, spirit mode only
    this.onRightClick = null; // (clientX, clientY) — Jaguar interact, spirit mode only

    window.addEventListener('keydown', (e) => this._keydown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    if (canvasEl) {
      canvasEl.addEventListener('click', (e) => this.onLeftClick && this.onLeftClick(e.clientX, e.clientY));
      canvasEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.onRightClick && this.onRightClick(e.clientX, e.clientY);
      });
    }
  }

  _keydown(e) {
    if (['Tab', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
    if (this.keys.has(e.code)) return; // ignore key-repeat for edge events
    this.keys.add(e.code);

    if (e.code === 'Tab' || e.code === 'Space') this.onSwitch && this.onSwitch();
    else if (e.code === 'KeyE' || e.code === 'Enter') this.onInteract && this.onInteract();
    else if (e.code === 'Escape') this.onPause && this.onPause();
  }

  keydownRaw(code) {
    // called by keyup handler indirectly via Set deletion; kept for API symmetry
  }

  /** Returns a [dx, dy] grid direction if a movement key is newly relevant this frame, else null. */
  getMoveDirection() {
    for (const code of this.keys) {
      if (MOVE_KEYS[code]) return MOVE_KEYS[code];
    }
    return null;
  }
}
