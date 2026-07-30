import * as THREE from 'three';
import { TILE, TILE_SIZE } from './TileGrid.js';
import { toonMaterial, toonMaterialWithMap, spiritMaterial, PALETTE } from '../rendering/LayerMaterials.js';
import { parchmentTexture, groundTexture } from '../rendering/ProceduralTextures.js';
import { Settings } from '../core/Settings.js';

/** Builds procedural low-poly geometry for a TileGrid and manages tile-level visual state. */
export class TileRenderer {
  constructor(grid) {
    this.grid = grid;
    this.group = new THREE.Group();
    this.decorations = new Map(); // "col,row" -> mesh (pickups, sconces, runes, gate)
    this.waterMeshes = new Map(); // "col,row" -> water base mesh, swapped for a deck once bridged
    this.spiritOnlyMaterials = []; // materials that fade in with layerBlend
    this.animated = []; // { mesh, baseY, phase, bob, spin } — idle bob/spin for collectibles
    this.bursts = []; // { points, velocities, ring, life, maxLife } — one-shot pickup celebration fx
    this._animClock = 0;
    this._build();
  }

  _groundMat() {
    if (!this._groundMatVariants) {
      this._groundMatVariants = [
        toonMaterialWithMap(groundTexture(PALETTE.physical.ground, 0x6b8a4a)),
        toonMaterialWithMap(groundTexture(PALETTE.physical.ground, 0x486b2f)),
        toonMaterialWithMap(groundTexture(0x527038, 0x7a9a5a)),
      ];
    }
    return this._groundMatVariants[Math.floor(Math.random() * this._groundMatVariants.length)];
  }
  _waterMat() {
    if (!this._waterMatCache) {
      this._waterMatCache = toonMaterial(PALETTE.physical.water);
      this._waterMatCache.transparent = true;
      this._waterMatCache.opacity = 0.85;
    }
    return this._waterMatCache;
  }
  _stoneMat() {
    if (!this._stoneMatCache) this._stoneMatCache = toonMaterial(PALETTE.physical.stone);
    return this._stoneMatCache;
  }

  _build() {
    const { grid } = this;
    const groundGeo = new THREE.BoxGeometry(TILE_SIZE, 0.2, TILE_SIZE);
    const waterGeo = new THREE.BoxGeometry(TILE_SIZE, 0.15, TILE_SIZE);
    const bareGroundTiles = [];

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const t = grid.tiles[row][col];
        const pos = grid.worldPos(col, row);

        // Base ground plate under everything walkable-ish (skip under trees/vines for variety)
        if (t !== TILE.TREE) {
          const isWater = t === TILE.WATER;
          const base = new THREE.Mesh(isWater ? waterGeo : groundGeo, isWater ? this._waterMat() : this._groundMat());
          base.position.set(pos.x, isWater ? -0.1 : -0.1, pos.z);
          base.receiveShadow = true;
          this.group.add(base);
          if (isWater) this.waterMeshes.set(`${col},${row}`, base);
        }

        if (t === TILE.GROUND) bareGroundTiles.push([col, row]);

        this._buildFeature(t, col, row, pos);
      }
    }

    this._addGroundDetails(bareGroundTiles);
    this._addDustMotes();
    this._addBackgroundTrees();
  }

  _buildFeature(t, col, row, pos) {
    switch (t) {
      case TILE.TREE:
        this._addTree(pos);
        break;
      case TILE.SPIRIT_WALL:
        this._addSpiritWall(col, row, pos);
        break;
      case TILE.SPIRIT_PATH:
        this._addSpiritPath(pos);
        break;
      case TILE.DENSE_VINES:
        this._addVines(col, row, pos);
        break;
      case TILE.GATE:
        this._addGate(col, row, pos);
        break;
      case TILE.PICKUP_MAP:
        this._addPickup(col, row, pos, 0xf5d76e, 'map');
        break;
      case TILE.PICKUP_KEY:
        this._addPickup(col, row, pos, 0xd4af37, 'key');
        break;
      case TILE.PICKUP_LOG:
        this._addLog(col, row, pos);
        break;
      case TILE.TORCH_SCONCE:
        this._addSconce(col, row, pos);
        break;
      case TILE.RUNE:
        this._addRune(col, row, pos);
        break;
      case TILE.CENTER:
        this._addCenterMarker(pos);
        break;
      default:
        break;
    }
  }

  _addTree(pos) {
    const scale = 0.8 + Math.random() * 0.55;
    const group = new THREE.Group();
    group.position.set(pos.x + (Math.random() - 0.5) * 0.5, 0, pos.z + (Math.random() - 0.5) * 0.5);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.scale.setScalar(scale);

    const trunkColor = new THREE.Color(PALETTE.physical.trunk).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
    const canopyBase = new THREE.Color(PALETTE.physical.canopy);
    const trunkMat = toonMaterial(trunkColor.getHex());

    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.22, 0.25, 6), trunkMat);
    root.position.y = 0.12;
    root.castShadow = true;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 2.3, 6), trunkMat);
    trunk.position.y = 1.35;
    trunk.rotation.z = (Math.random() - 0.5) * 0.08;
    trunk.castShadow = true;
    group.add(root, trunk);

    // Cluster of offset canopy cones (instead of one plain cone) for a fuller, less geometric silhouette.
    const clusterCount = 3 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < clusterCount; i++) {
      const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 0.6;
      const r = 0.28 + Math.random() * 0.15;
      const size = 0.55 + Math.random() * 0.35;
      const color = canopyBase.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.12
      );
      const cone = new THREE.Mesh(new THREE.ConeGeometry(size, size * 1.9, 5 + Math.floor(Math.random() * 2)), toonMaterial(color.getHex()));
      cone.position.set(Math.cos(angle) * r, 2.5 + i * 0.32 - clusterCount * 0.12 + Math.random() * 0.2, Math.sin(angle) * r);
      cone.rotation.y = Math.random() * Math.PI;
      cone.castShadow = true;
      group.add(cone);
    }

    if (Math.random() < 0.4) {
      const bAngle = Math.random() * Math.PI * 2;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 4), trunkMat);
      branch.position.set(Math.cos(bAngle) * 0.18, 1.9, Math.sin(bAngle) * 0.18);
      branch.rotation.z = (Math.PI / 2.5) * (Math.random() < 0.5 ? 1 : -1);
      branch.rotation.y = bAngle;
      branch.castShadow = true;
      group.add(branch);
    }

    this.group.add(group);
  }

  /**
   * A distant backdrop forest beyond the playable border, so the jungle doesn't visibly end.
   * Uses two InstancedMeshes (trunks + canopies) — just 2 draw calls regardless of tree count,
   * no shadows, so it stays cheap even on integrated graphics.
   */
  _addBackgroundTrees() {
    const densityScale = Settings.get('particleDensity') === 'low' ? 0.4 : 1;
    const halfW = (this.grid.width * TILE_SIZE) / 2;
    const halfH = (this.grid.height * TILE_SIZE) / 2;
    const innerMargin = 3;
    const ringDepth = 16;
    const count = Math.round(220 * densityScale);

    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.0, 5);
    const canopyGeo = new THREE.ConeGeometry(0.75, 1.7, 5);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, toonMaterial(PALETTE.physical.trunk), count);
    const canopyMesh = new THREE.InstancedMesh(canopyGeo, toonMaterial(PALETTE.physical.canopy), count);
    trunkMesh.castShadow = false;
    canopyMesh.castShadow = false;
    trunkMesh.frustumCulled = false;
    canopyMesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      let x;
      let z;
      do {
        x = (Math.random() * 2 - 1) * (halfW + ringDepth);
        z = (Math.random() * 2 - 1) * (halfH + ringDepth);
      } while (Math.abs(x) < halfW + innerMargin && Math.abs(z) < halfH + innerMargin);

      const scale = 0.6 + Math.random() * 0.9;
      const rot = Math.random() * Math.PI * 2;

      dummy.position.set(x, 1.0 * scale, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.y = 2.3 * scale;
      dummy.updateMatrix();
      canopyMesh.setMatrixAt(i, dummy.matrix);
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    this.group.add(trunkMesh, canopyMesh);
  }

  /** Scatters instanced grass tufts and rocks across bare ground tiles for visual density. */
  _addGroundDetails(tiles) {
    if (!tiles.length) return;
    const densityScale = Settings.get('particleDensity') === 'low' ? 0.35 : 1;
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    const grassCount = Math.floor(shuffled.length * 0.22 * densityScale);
    const rockCount = Math.floor(shuffled.length * 0.05 * densityScale);
    const grassTiles = shuffled.slice(0, grassCount);
    const rockTiles = shuffled.slice(grassCount, grassCount + rockCount);
    const dummy = new THREE.Object3D();

    if (grassTiles.length) {
      const grassGeo = new THREE.ConeGeometry(0.07, 0.32, 4);
      const colors = [0x4a7a2a, 0x6a9a3a, 0x3a6b28];
      const meshes = colors.map((c) => new THREE.InstancedMesh(grassGeo, toonMaterial(c), grassTiles.length));
      const counts = [0, 0, 0];
      grassTiles.forEach(([c, r]) => {
        const pos = this.grid.worldPos(c, r);
        const which = Math.floor(Math.random() * colors.length);
        dummy.position.set(pos.x + (Math.random() - 0.5) * 1.3, 0.14, pos.z + (Math.random() - 0.5) * 1.3);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.scale.setScalar(0.7 + Math.random() * 0.7);
        dummy.updateMatrix();
        meshes[which].setMatrixAt(counts[which]++, dummy.matrix);
      });
      meshes.forEach((m, i) => {
        m.count = counts[i];
        m.instanceMatrix.needsUpdate = true;
        this.group.add(m);
      });
    }

    if (rockTiles.length) {
      const rockGeo = new THREE.IcosahedronGeometry(0.22, 0);
      const rockMesh = new THREE.InstancedMesh(rockGeo, toonMaterial(0x6b6b5a), rockTiles.length);
      rockTiles.forEach(([c, r], i) => {
        const pos = this.grid.worldPos(c, r);
        dummy.position.set(pos.x + (Math.random() - 0.5) * 0.9, 0.08, pos.z + (Math.random() - 0.5) * 0.9);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.setScalar(0.5 + Math.random() * 0.8);
        dummy.updateMatrix();
        rockMesh.setMatrixAt(i, dummy.matrix);
      });
      rockMesh.instanceMatrix.needsUpdate = true;
      rockMesh.castShadow = true;
      this.group.add(rockMesh);
    }
  }

  /** Slow-drifting dust motes for atmosphere, mostly noticeable in the physical layer. */
  _addDustMotes() {
    const count = Settings.get('particleDensity') === 'low' ? 40 : 140;
    const halfW = (this.grid.width * TILE_SIZE) / 2;
    const halfH = (this.grid.height * TILE_SIZE) / 2;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * halfW;
      positions[i * 3 + 1] = 0.3 + Math.random() * 3.5;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * halfH;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xf5d76e, size: 0.035, transparent: true, opacity: 0.35, depthWrite: false });
    this.dustMotes = new THREE.Points(geo, mat);
    this.group.add(this.dustMotes);
  }

  /** Called every frame to drift the dust motes upward and gently rotate the field. */
  updateDust(dt) {
    if (!this.dustMotes) return;
    const posAttr = this.dustMotes.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      let y = posAttr.getY(i) + dt * 0.15;
      if (y > 4) y = 0.2;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
    this.dustMotes.rotation.y += dt * 0.02;
  }

  _addSpiritWall(col, row, pos) {
    const geo = new THREE.BoxGeometry(TILE_SIZE * 0.9, 2.2, TILE_SIZE * 0.9);
    const mat = spiritMaterial(PALETTE.spirit.barrier, PALETTE.spirit.barrier, 1.0);
    mat.opacity = 0;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 1.1, pos.z);
    this.group.add(mesh);
    this.spiritOnlyMaterials.push(mat);
    this.decorations.set(`${col},${row}`, mesh);
  }

  _addSpiritPath(pos) {
    const geo = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 6);
    const mat = spiritMaterial(PALETTE.spirit.leyLine, PALETTE.spirit.leyLine, 1.2);
    mat.opacity = 0;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.2, pos.z);
    this.group.add(mesh);
    this.spiritOnlyMaterials.push(mat);
  }

  _addVines(col, row, pos) {
    const geo = new THREE.TorusKnotGeometry(0.5, 0.15, 32, 6);
    const mesh = new THREE.Mesh(geo, toonMaterial(0x3a5a1b));
    mesh.position.set(pos.x, 1, pos.z);
    mesh.scale.set(0.6, 0.6, 0.6);
    this.group.add(mesh);
    this.decorations.set(`${col},${row}`, mesh);
  }

  _addGate(col, row, pos) {
    const geo = new THREE.BoxGeometry(TILE_SIZE * 0.85, 3, TILE_SIZE * 0.85);
    const mesh = new THREE.Mesh(geo, this._stoneMat());
    mesh.position.set(pos.x, 1.5, pos.z);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.decorations.set(`${col},${row}`, mesh);
  }

  /** A thin translucent glow pillar so collectibles read clearly from a distance. */
  _makeBeacon(color, height) {
    const geo = new THREE.CylinderGeometry(0.035, 0.13, height, 6, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    const beacon = new THREE.Mesh(geo, mat);
    beacon.position.y = height / 2 + 0.2;
    return beacon;
  }

  /** A flat pulsing ring on the ground beneath a collectible — reads clearly from the isometric/top-down camera. */
  _addGroundGlow(color, radius) {
    const geo = new THREE.RingGeometry(radius * 0.55, radius, 20);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    return ring;
  }

  _registerAnimated(mesh, baseY, { bob = 0.08, spin = 0, root = null, pulseMat = null } = {}) {
    this.animated.push({ mesh, baseY, phase: Math.random() * Math.PI * 2, bob, spin, root: root || mesh, pulseMat });
  }

  /** A one-shot sparkle burst + expanding shockwave ring — the "pop" feedback when something is collected/activated. */
  spawnPickupBurst(worldPos, color) {
    const count = 14;
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = worldPos.x;
      positions[i * 3 + 1] = 0.35;
      positions[i * 3 + 2] = worldPos.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 1.8;
      velocities.push(new THREE.Vector3(Math.cos(angle) * speed, 2.2 + Math.random() * 2, Math.sin(angle) * speed));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.22, transparent: true, opacity: 1, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    const ringGeo = new THREE.RingGeometry(0.12, 0.32, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(worldPos.x, 0.05, worldPos.z);
    this.group.add(ring);

    this.bursts.push({ points, velocities, ring, life: 0, maxLife: 0.7 });
  }

  /** Advances and prunes active pickup bursts. */
  _updateBursts(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life += dt;
      const t = Math.min(1, b.life / b.maxLife);
      if (t >= 1) {
        this.group.remove(b.points, b.ring);
        b.points.geometry.dispose();
        b.points.material.dispose();
        b.ring.geometry.dispose();
        b.ring.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const posAttr = b.points.geometry.attributes.position;
      for (let p = 0; p < b.velocities.length; p++) {
        const v = b.velocities[p];
        posAttr.array[p * 3] += v.x * dt;
        posAttr.array[p * 3 + 1] += v.y * dt;
        posAttr.array[p * 3 + 2] += v.z * dt;
        v.y -= 6 * dt;
      }
      posAttr.needsUpdate = true;
      b.points.material.opacity = 1 - t;
      const ringScale = 1 + t * 3.5;
      b.ring.scale.set(ringScale, ringScale, ringScale);
      b.ring.material.opacity = 0.85 * (1 - t);
    }
  }

  _addPickup(col, row, pos, color, kind) {
    const itemGroup = new THREE.Group();
    itemGroup.position.set(pos.x, 0, pos.z);
    let model;
    let baseY;

    if (kind === 'map') {
      // A curled, torn scroll fragment with a wax seal, not just a flat plane.
      const mapModel = new THREE.Group();
      const paperMat = new THREE.MeshBasicMaterial({ map: parchmentTexture(), side: THREE.DoubleSide });
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8, 3, 3), paperMat);
      const posAttr = sheet.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        posAttr.setZ(i, Math.pow(Math.abs(x) / 0.4, 2) * 0.08);
      }
      posAttr.needsUpdate = true;
      sheet.geometry.computeVertexNormals();
      sheet.rotation.x = -Math.PI / 2;
      mapModel.add(sheet);

      const sealMat = toonMaterial(0xb5432e);
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), sealMat);
      seal.position.set(0.12, 0.045, 0.1);
      const sealRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 10), toonMaterial(0x8a2e1c));
      sealRing.rotation.x = Math.PI / 2;
      sealRing.position.set(0.12, 0.06, 0.1);
      mapModel.add(seal, sealRing);

      model = mapModel;
      baseY = 0.32;
      model.position.y = baseY;
      const glow = this._addGroundGlow(0xf5d76e, 0.55);
      itemGroup.add(model, this._makeBeacon(0xf5d76e, 1.3), glow);
      this._registerAnimated(model, baseY, { bob: 0.09, spin: 1.4, root: itemGroup, pulseMat: glow.material });
    } else {
      // A recognizable key: bow (ring) + inset gem + shaft + two teeth, tilted for a natural resting pose.
      const keyModel = new THREE.Group();
      keyModel.rotation.z = Math.PI / 2.3;
      const mat = spiritMaterial(color, color, 0.7);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 6, 12), mat);
      bow.rotation.x = Math.PI / 2;
      bow.position.y = 0.22;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), spiritMaterial(0x6fd6c8, 0x6fd6c8, 1.1));
      gem.position.y = 0.22;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 6), mat);
      const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.045), mat);
      tooth1.position.set(0.065, -0.13, 0);
      const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.045), mat);
      tooth2.position.set(0.05, -0.19, 0);
      keyModel.add(bow, gem, shaft, tooth1, tooth2);
      baseY = 0.5;
      keyModel.position.y = baseY;
      model = keyModel;
      const glow = this._addGroundGlow(0xd4af37, 0.62);
      itemGroup.add(model, this._makeBeacon(0xd4af37, 1.3), glow);
      this._registerAnimated(model, baseY, { bob: 0.09, spin: 1.2, root: itemGroup, pulseMat: glow.material });
    }

    this.group.add(itemGroup);
    this.decorations.set(`${col},${row}`, itemGroup);
  }

  _addLog(col, row, pos) {
    const itemGroup = new THREE.Group();
    itemGroup.position.set(pos.x, 0, pos.z);
    const logModel = new THREE.Group();
    const barkMat = toonMaterial(PALETTE.physical.trunk);
    const ringMat = toonMaterial(0x3d2c1a);
    const geo = new THREE.CylinderGeometry(0.25, 0.25, 1.6, 8);
    const mesh = new THREE.Mesh(geo, barkMat);
    mesh.rotation.z = Math.PI / 2;
    logModel.add(mesh);

    // Cut end-rings so it reads as a felled log, not a plain cylinder.
    for (const side of [-0.79, 0.79]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 12), ringMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side, 0, 0);
      logModel.add(ring);
    }
    // Bark knots for surface detail.
    for (let i = 0; i < 3; i++) {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), ringMat);
      const angle = Math.random() * Math.PI * 2;
      knot.position.set(-0.5 + i * 0.5, Math.cos(angle) * 0.25, Math.sin(angle) * 0.25);
      logModel.add(knot);
    }
    logModel.position.y = 0.3;
    const glow = this._addGroundGlow(0xff8c42, 0.7);
    itemGroup.add(logModel, this._makeBeacon(0xff8c42, 1.1), glow);
    this._registerAnimated(logModel, 0.3, { bob: 0.04, spin: 0, root: itemGroup, pulseMat: glow.material });
    this.group.add(itemGroup);
    this.decorations.set(`${col},${row}`, itemGroup);
  }

  _addSconce(col, row, pos) {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6);
    const pole = new THREE.Mesh(poleGeo, toonMaterial(PALETTE.physical.trunk));
    pole.position.set(pos.x, 0.7, pos.z);
    const flameGeo = new THREE.SphereGeometry(0.18, 6, 4);
    const flame = new THREE.Mesh(flameGeo, spiritMaterial(0xf5d76e, 0xf5d76e, 1.2));
    flame.position.set(pos.x, 1.45, pos.z);
    this.group.add(pole, flame);
    this.decorations.set(`${col},${row}`, flame);
  }

  /**
   * Public entry points for placing a collectible/sconce dynamically at runtime (after the
   * initial _build() pass), so a zone can randomize item positions fresh on every load instead
   * of baking them into the static layout. Each just wraps the existing private builder with a
   * freshly computed world position for the given tile.
   */
  placeKey(col, row) {
    this._addPickup(col, row, this.grid.worldPos(col, row), 0xd4af37, 'key');
  }

  placeFragment(col, row) {
    this._addPickup(col, row, this.grid.worldPos(col, row), 0xf5d76e, 'map');
  }

  placeLog(col, row) {
    this._addLog(col, row, this.grid.worldPos(col, row));
  }

  placeSconce(col, row) {
    this._addSconce(col, row, this.grid.worldPos(col, row));
  }

  /** Always-visible stone dais + carved symbol (so physical-mode players see runes exist), plus a spirit-only glow ring that only lights up for the Jaguar. */
  _addRune(col, row, pos) {
    const daisGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.12, 6);
    const dais = new THREE.Mesh(daisGeo, this._stoneMat());
    dais.position.set(pos.x, 0.06, pos.z);
    dais.receiveShadow = true;
    this.group.add(dais);

    const symbolGeo = new THREE.RingGeometry(0.18, 0.34, 6);
    const symbolMat = new THREE.MeshBasicMaterial({
      color: PALETTE.spirit.leyLine, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
    });
    const symbol = new THREE.Mesh(symbolGeo, symbolMat);
    symbol.rotation.x = -Math.PI / 2;
    symbol.position.set(pos.x, 0.13, pos.z);
    this.group.add(symbol);
    if (!this.runeSymbols) this.runeSymbols = new Map();
    this.runeSymbols.set(`${col},${row}`, symbol);

    const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.08, 6);
    const mat = spiritMaterial(PALETTE.spirit.leyLine, PALETTE.spirit.leyLine, 1.0);
    mat.opacity = 0;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.16, pos.z);
    this.group.add(mesh);
    this.spiritOnlyMaterials.push(mat);
    this.decorations.set(`${col},${row}`, mesh);
  }

  /** Brightens a rune's always-visible symbol once awakened, so progress reads in either mode. */
  activateRune(col, row) {
    const symbol = this.runeSymbols && this.runeSymbols.get(`${col},${row}`);
    if (!symbol) return;
    symbol.material.opacity = 0.9;
    symbol.material.color.set(0xf5d76e);
  }

  _addCenterMarker(pos) {
    const geo = new THREE.BoxGeometry(1, 1.4, 0.6);
    const mesh = new THREE.Mesh(geo, this._stoneMat());
    mesh.position.set(pos.x, 0.7, pos.z);
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  /** Removes a decoration (pickup collected, vine cleared) and its grid override — handles both plain meshes and groups. */
  removeDecoration(col, row) {
    const key = `${col},${row}`;
    const obj = this.decorations.get(key);
    if (obj) {
      this.group.remove(obj);
      obj.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
      this.decorations.delete(key);
    }
  }

  /** Hides gate box tiles once a gate opens. */
  openGate(cols, row) {
    for (const col of cols) this.removeDecoration(col, row);
  }

  /** Re-materializes gate box tiles once a sustained (pressure-plate) gate closes again. */
  closeGate(cols, row) {
    for (const col of cols) {
      if (!this.decorations.has(`${col},${row}`)) {
        this._addGate(col, row, this.grid.worldPos(col, row));
      }
    }
  }

  /** Swaps water tiles for a visible log-deck bridge once the log is laid (RiverGate solved). */
  buildBridge(tiles) {
    for (const [col, row] of tiles) {
      const key = `${col},${row}`;
      const waterMesh = this.waterMeshes.get(key);
      if (waterMesh) {
        this.group.remove(waterMesh);
        waterMesh.geometry.dispose();
        this.waterMeshes.delete(key);
      }
      const pos = this.grid.worldPos(col, row);
      const deckGeo = new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.16, TILE_SIZE * 0.92);
      const deck = new THREE.Mesh(deckGeo, toonMaterial(PALETTE.physical.trunk));
      deck.position.set(pos.x, 0.02, pos.z);
      deck.receiveShadow = true;
      this.group.add(deck);
    }
  }

  /** Fades out spirit-wall visuals at the given tiles (barrier dispelled). */
  clearSpiritWalls(cols, row) {
    for (const col of cols) this.removeDecoration(col, row);
  }

  /** Low-trust effect: temporarily grows vines over a ground tile (reversible). */
  growVine(col, row) {
    const pos = this.grid.worldPos(col, row);
    this.grid.set(col, row, TILE.DENSE_VINES);
    this._addVines(col, row, pos);
  }

  clearVine(col, row) {
    this.removeDecoration(col, row);
    this.grid.set(col, row, TILE.GROUND);
  }

  /** Idle bob/spin for collectibles, and prunes entries whose mesh was already collected. */
  updateDecorations(dt) {
    this._animClock += dt;
    for (let i = this.animated.length - 1; i >= 0; i--) {
      const a = this.animated[i];
      if (!a.root.parent) {
        this.animated.splice(i, 1);
        continue;
      }
      a.mesh.position.y = a.baseY + Math.sin(this._animClock * 2.2 + a.phase) * a.bob;
      if (a.spin) a.mesh.rotation.y += dt * a.spin;
      if (a.pulseMat) a.pulseMat.opacity = 0.35 + Math.sin(this._animClock * 2.6 + a.phase) * 0.2;
    }
    if (this.bursts.length) this._updateBursts(dt);
  }

  /** blend in [0,1] — fades in spirit-only geometry (barriers, paths, ley lines). */
  updateLayerBlend(blend) {
    for (const mat of this.spiritOnlyMaterials) mat.opacity = blend;
  }
}
