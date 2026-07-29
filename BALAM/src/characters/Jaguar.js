import * as THREE from 'three';
import { spiritMaterial, PALETTE } from '../rendering/LayerMaterials.js';
import { findPath } from '../world/TileGrid.js';

const TILE_MOVE_TIME = 0.32;
const SENSE_IDLE_TIME = 1.5;
const WALK_SWING_SPEED = 13;
const MAX_SWING = 0.55;

export class Jaguar {
  constructor(grid, startCol, startRow) {
    this.grid = grid;
    this.col = startCol;
    this.row = startRow;
    this.targetCol = startCol;
    this.targetRow = startRow;
    this.moveT = 1;
    this.idleTime = 0;
    this.justSensed = false;
    this._path = null;

    this._walkPhase = 0;
    this._swingAmount = 0;
    this._facingY = 0;
    this._bobPhase = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();
    this.model = new THREE.Group();
    this.mesh.add(this.model);

    const bodyMat = spiritMaterial(PALETTE.spirit.jaguar, 0x4a2080, 0.8);
    const markMat = spiritMaterial(PALETTE.spirit.motes, 0x9b7fd4, 0.5);
    this._materials = [bodyMat, markMat];

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.44, 1.1), bodyMat);
    body.position.y = 0.42;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), bodyMat);
    head.position.set(0, 0.52, 0.62);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 6), bodyMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.46, 0.9);

    const earGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.16, 0.76, 0.58);
    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.16, 0.76, 0.58);

    const markGeo = new THREE.SphereGeometry(0.06, 4, 3);
    const marks = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(markGeo, markMat);
      m.position.set((Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 0.15, -0.4 + Math.random() * 0.8);
      marks.add(m);
    }

    this.model.add(body, head, snout, earL, earR, marks);

    // Legs, in swing pivots for a trotting walk cycle (front-left/back-right paired).
    const legGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.42, 6);
    this.legFL = this._buildLeg(legGeo, bodyMat, -0.28, 0.25, 0.4);
    this.legFR = this._buildLeg(legGeo, bodyMat, 0.28, 0.25, 0.4);
    this.legBL = this._buildLeg(legGeo, bodyMat, -0.28, 0.25, -0.4);
    this.legBR = this._buildLeg(legGeo, bodyMat, 0.28, 0.25, -0.4);
    this.model.add(this.legFL, this.legFR, this.legBL, this.legBR);

    // Tail, animated with a side-to-side sway.
    this.tailPivot = new THREE.Group();
    this.tailPivot.position.set(0, 0.55, -0.55);
    const tailGeo = new THREE.CylinderGeometry(0.09, 0.04, 0.75, 6);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.z = -0.32;
    tail.rotation.x = Math.PI / 2.4;
    this.tailPivot.add(tail);
    this.model.add(this.tailPivot);

    this._buildParticles();
    this.model.add(this.particles);

    const pos = grid.worldPos(startCol, startRow);
    this.mesh.position.set(pos.x, 0, pos.z);
  }

  _buildLeg(geo, mat, x, y, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const leg = new THREE.Mesh(geo, mat);
    leg.position.y = -0.21;
    pivot.add(leg);
    return pivot;
  }

  _buildParticles() {
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 0.6 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = 0.5 + r * Math.cos(phi) * 0.5;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: PALETTE.spirit.motes, size: 0.05, transparent: true, opacity: 0.9 });
    this.particles = new THREE.Points(geo, mat);
    this._particleMat = mat;
  }

  get worldPosition() {
    return this.mesh.position;
  }

  tryMove(dx, dy, layer) {
    if (this.moveT < 1) return false;
    const nc = this.col + dx;
    const nr = this.row + dy;
    if (!this.grid.isWalkable(nc, nr, layer)) return false;
    this.targetCol = nc;
    this.targetRow = nr;
    this.moveT = 0;
    this.idleTime = 0;
    this._facingY = Math.atan2(dx, dy);
    return true;
  }

  /** Queues a BFS path to (col,row) in spirit-layer terms. Returns false if unreachable or mid-move. */
  setPathTarget(col, row) {
    if (this.moveT < 1) return false;
    const path = findPath(this.grid, this.col, this.row, col, row, 'spirit');
    if (!path || path.length === 0) return false;
    this._path = path;
    return true;
  }

  update(dt, isActive) {
    if (this.moveT >= 1 && isActive && this._path && this._path.length) {
      const [nc, nr] = this._path[0];
      if (this.tryMove(nc - this.col, nr - this.row, 'spirit')) {
        this._path.shift();
        if (this._path.length === 0) this._path = null;
      } else {
        this._path = null; // world changed under us (e.g. a gate closed); abandon the stale path
      }
    }

    const isMoving = this.moveT < 1;
    if (isMoving) {
      this.moveT = Math.min(1, this.moveT + dt / TILE_MOVE_TIME);
      const from = this.grid.worldPos(this.col, this.row);
      const to = this.grid.worldPos(this.targetCol, this.targetRow);
      this.mesh.position.set(
        THREE.MathUtils.lerp(from.x, to.x, this.moveT),
        0,
        THREE.MathUtils.lerp(from.z, to.z, this.moveT)
      );
      if (this.moveT >= 1) {
        this.col = this.targetCol;
        this.row = this.targetRow;
      }
    }

    let da = this._facingY - this.model.rotation.y;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    this.model.rotation.y += da * Math.min(1, dt * 14);

    this._swingAmount = THREE.MathUtils.lerp(this._swingAmount, isMoving ? MAX_SWING : 0, Math.min(1, dt * 10));
    if (isMoving) this._walkPhase += dt * WALK_SWING_SPEED;
    const swing = Math.sin(this._walkPhase) * this._swingAmount;
    this.legFL.rotation.x = swing;
    this.legBR.rotation.x = swing;
    this.legFR.rotation.x = -swing;
    this.legBL.rotation.x = -swing;

    this._bobPhase += dt * (isMoving ? 10 : 1.6);
    const bobHeight = isMoving ? 0.04 : 0.015;
    this.mesh.position.y = Math.abs(Math.sin(this._bobPhase)) * bobHeight;

    this.tailPivot.rotation.y = Math.sin(performance.now() * 0.0025) * 0.4 + (isMoving ? swing * 0.3 : 0);

    this.particles.rotation.y += dt * 0.5;

    this.justSensed = false;
    if (isActive && this.moveT >= 1) {
      this.idleTime += dt;
      if (this.idleTime >= SENSE_IDLE_TIME) {
        this.justSensed = true;
        this.idleTime = -1000; // fire once, wait for movement to reset
      }
    } else {
      this.idleTime = 0;
    }
  }

  /** blend 0 = physical (faint smoke), 1 = full spirit (vivid) */
  setLayerBlend(blend) {
    const opacity = THREE.MathUtils.lerp(0.15, 1.0, blend);
    for (const m of this._materials) m.opacity = opacity;
    this._particleMat.opacity = THREE.MathUtils.lerp(0.1, 0.9, blend);
  }
}
