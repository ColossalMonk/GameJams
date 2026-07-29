import * as THREE from 'three';

const LOW_COLOR = new THREE.Color(0x7b5ea7);
const HIGH_COLOR = new THREE.Color(0xffb830);

export class TrustBond {
  constructor(explorer, jaguar) {
    this.explorer = explorer;
    this.jaguar = jaguar;
    this.material = new THREE.MeshBasicMaterial({ color: LOW_COLOR.clone() });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this._lastGeo = null;
  }

  update(trust) {
    const a = this.explorer.worldPosition.clone();
    a.y += 0.6;
    const b = this.jaguar.worldPosition.clone();
    b.y += 0.6;
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 0.4 + trust * 0.3;

    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const radius = THREE.MathUtils.lerp(0.03, 0.12, trust);
    const geo = new THREE.TubeGeometry(curve, 12, radius, 6, false);

    if (this._lastGeo) this._lastGeo.dispose();
    this.mesh.geometry = geo;
    this._lastGeo = geo;

    this.material.color.copy(LOW_COLOR).lerp(HIGH_COLOR, trust);
  }
}
