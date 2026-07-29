import * as THREE from 'three';
import { toonMaterial } from '../rendering/LayerMaterials.js';

const TILE_MOVE_TIME = 0.32;
const WALK_SWING_SPEED = 11;
const MAX_SWING = 0.7;

export class Explorer {
  constructor(grid, startCol, startRow) {
    this.grid = grid;
    this.col = startCol;
    this.row = startRow;
    this.targetCol = startCol;
    this.targetRow = startRow;
    this.moveT = 1; // 1 = arrived
    this.hasKey = false;
    this.hasLog = false;
    this.mapFragments = 0;

    this._walkPhase = 0;
    this._swingAmount = 0;
    this._facingY = 0;
    this._bobPhase = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();
    this.model = new THREE.Group();
    this.mesh.add(this.model);

    const skin = toonMaterial(0xc4a882);
    const cloth = toonMaterial(0x8b6914);
    const packMat = toonMaterial(0x5a4a1f);
    const scarfMat = toonMaterial(0xb5432e);
    const bootMat = toonMaterial(0x3d2c1a);
    const beltMat = toonMaterial(0x2e2216);
    const buckleMat = toonMaterial(0xd4af37);
    this._materials = [skin, cloth, packMat, scarfMat, bootMat, beltMat, buckleMat];

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.3), cloth);
    body.position.y = 0.72;
    body.castShadow = true;

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.32), beltMat);
    belt.position.y = 0.48;
    belt.castShadow = true;

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.04), buckleMat);
    buckle.position.set(0, 0.48, 0.17);

    const scarf = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 8), scarfMat);
    scarf.position.y = 0.98;
    scarf.castShadow = true;

    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.16), packMat);
    pack.position.set(0, 0.74, -0.2);
    pack.castShadow = true;
    const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.03), scarfMat);
    packFlap.position.set(0, 0.66, -0.28);
    packFlap.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
    head.position.y = 1.16;
    head.castShadow = true;

    const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.12, 8), skin);
    jaw.position.y = 1.03;
    jaw.castShadow = true;

    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 12), cloth);
    hatBrim.position.y = 1.28;
    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 10), cloth);
    hatTop.position.y = 1.38;
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 10), scarfMat);
    hatBand.position.y = 1.31;
    hatBrim.castShadow = true;
    hatTop.castShadow = true;

    this.model.add(body, belt, buckle, scarf, pack, packFlap, head, jaw, hatBrim, hatTop, hatBand);

    // Limbs hang from shoulder/hip pivots so they can swing for a walk cycle.
    const armGeo = new THREE.BoxGeometry(0.1, 0.42, 0.1);
    const legGeo = new THREE.BoxGeometry(0.13, 0.3, 0.13);
    const bootGeo = new THREE.BoxGeometry(0.15, 0.16, 0.19);

    this.leftArmPivot = this._buildLimb(armGeo, skin, -0.28, 0.98, 0, -0.21);
    this.rightArmPivot = this._buildLimb(armGeo, skin, 0.28, 0.98, 0, -0.21);
    this.leftLegPivot = this._buildLimb(legGeo, cloth, -0.13, 0.46, 0, -0.15, bootGeo, bootMat, -0.38);
    this.rightLegPivot = this._buildLimb(legGeo, cloth, 0.13, 0.46, 0, -0.15, bootGeo, bootMat, -0.38);
    this.model.add(this.leftArmPivot, this.rightArmPivot, this.leftLegPivot, this.rightLegPivot);

    this.torch = new THREE.PointLight(0xf5d76e, 1.4, 6, 2);
    this.torch.position.set(0.28, 0.5, 0);
    this.rightArmPivot.add(this.torch);

    const pos = grid.worldPos(startCol, startRow);
    this.mesh.position.set(pos.x, 0, pos.z);
  }

  _buildLimb(geo, mat, x, y, z, hangY, footGeo = null, footMat = null, footY = 0) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const limb = new THREE.Mesh(geo, mat);
    limb.position.y = hangY;
    limb.castShadow = true;
    pivot.add(limb);
    if (footGeo) {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.y = footY;
      foot.castShadow = true;
      pivot.add(foot);
    }
    return pivot;
  }

  get worldPosition() {
    return this.mesh.position;
  }

  /** Attempts to move by grid delta [dx,dy]; returns true if a move started. */
  tryMove(dx, dy, layer) {
    if (this.moveT < 1) return false;
    const nc = this.col + dx;
    const nr = this.row + dy;
    if (!this.grid.isWalkable(nc, nr, layer)) return false;
    this.targetCol = nc;
    this.targetRow = nr;
    this.moveT = 0;
    this._facingY = Math.atan2(dx, dy);
    return true;
  }

  update(dt) {
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

    // Smoothly turn to face the direction of travel.
    let da = this._facingY - this.model.rotation.y;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    this.model.rotation.y += da * Math.min(1, dt * 12);

    // Walk-cycle limb swing, settling back to neutral when idle.
    this._swingAmount = THREE.MathUtils.lerp(this._swingAmount, isMoving ? MAX_SWING : 0, Math.min(1, dt * 10));
    if (isMoving) this._walkPhase += dt * WALK_SWING_SPEED;
    const swing = Math.sin(this._walkPhase) * this._swingAmount;
    this.leftArmPivot.rotation.x = swing;
    this.rightArmPivot.rotation.x = -swing;
    this.leftLegPivot.rotation.x = -swing;
    this.rightLegPivot.rotation.x = swing;

    // Gentle idle/walk bob.
    this._bobPhase += dt * (isMoving ? 9 : 2.2);
    const bobHeight = isMoving ? 0.05 : 0.02;
    this.mesh.position.y = Math.abs(Math.sin(this._bobPhase)) * bobHeight;
  }

  /** blend 0 = full physical (opaque), 1 = full spirit (faint warm silhouette) */
  setLayerBlend(blend) {
    const opacity = THREE.MathUtils.lerp(1.0, 0.25, blend);
    for (const m of this._materials) m.opacity = opacity;
    this.torch.intensity = THREE.MathUtils.lerp(1.4, 0.3, blend);
  }
}
