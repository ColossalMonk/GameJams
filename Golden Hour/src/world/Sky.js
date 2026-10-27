import * as THREE from 'three';
import { card, paperTexture, glowMaterials } from './paper.js';
import { circle } from './shapes.js';
import { GAME_LENGTH } from '../config.js';

/**
 * The clock of the game is the sky. Everything that changes over the 20 seconds — sky
 * colours, the swelling sun, the light angle and colour, the town lights coming on — is a
 * keyframe here, sampled by time.
 */
const KEYS = [
  { t: 0, top: '#5f9fd6', horizon: '#ffe6b8', glow: '#fff1c4', sun: '#fff3cf', light: '#fff1dc', intensity: 3.2, height: 17, hemiSky: '#bcd6f0', hemiGround: '#e9cfa0', hemi: 0.55, lamps: 0 },
  { t: 4, top: '#6c9ad2', horizon: '#ffd590', glow: '#ffdf96', sun: '#ffeab0', light: '#ffe6b8', intensity: 3.2, height: 14, hemiSky: '#c9cfe8', hemiGround: '#e0bf8c', hemi: 0.55, lamps: 0 },
  { t: 7.5, top: '#9a8ac6', horizon: '#ffbd78', glow: '#ffc878', sun: '#ffd890', light: '#ffcf8a', intensity: 3.3, height: 11, hemiSky: '#d6bfe0', hemiGround: '#c9a07a', hemi: 0.52, lamps: 0.2 },
  { t: 11, top: '#d27f9c', horizon: '#ffa25e', glow: '#ffb466', sun: '#ffc678', light: '#ffb06a', intensity: 3.4, height: 8, hemiSky: '#e8a8a8', hemiGround: '#9e7468', hemi: 0.5, lamps: 0.9 },
  { t: 14, top: '#9a4a7c', horizon: '#ff7c4c', glow: '#ff9a5a', sun: '#ffb070', light: '#ff9a5e', intensity: 3.5, height: 6, hemiSky: '#d98aa0', hemiGround: '#6e4a62', hemi: 0.5, lamps: 1.4 },
  { t: 17, top: '#5a2a5c', horizon: '#ff5c34', glow: '#ffa060', sun: '#ffd29a', light: '#ff9a68', intensity: 3.8, height: 4.5, hemiSky: '#f0907e', hemiGround: '#5a3a56', hemi: 0.6, lamps: 1.6 },
  { t: 18.6, top: '#ffd9a8', horizon: '#fff0d0', glow: '#ffffff', sun: '#fff8ea', light: '#ffe6c8', intensity: 5, height: 4.5, hemiSky: '#fff0e0', hemiGround: '#ffe0c0', hemi: 1.6, lamps: 1.6 },
  { t: GAME_LENGTH, top: '#ffffff', horizon: '#ffffff', glow: '#ffffff', sun: '#ffffff', light: '#ffffff', intensity: 8, height: 4.5, hemiSky: '#ffffff', hemiGround: '#ffffff', hemi: 3.2, lamps: 1.6 },
];

const COLOR_FIELDS = ['top', 'horizon', 'glow', 'sun', 'light', 'hemiSky', 'hemiGround'];
const NUMBER_FIELDS = ['intensity', 'height', 'hemi', 'lamps'];

// Pre-parse colours once.
for (const k of KEYS) for (const f of COLOR_FIELDS) k[f] = new THREE.Color(k[f]);

/** Where the sun sets changes every evening (see setSunX). */
let sunX = 3.6;
const SUN_Z = -11.5;

export function setSunX(x) {
  sunX = x;
}

/** Where the sun is centred and how big it is at time t. */
export function sunCentre(t) {
  const u = Math.min(1, t / 17);
  return new THREE.Vector3(sunX, 8.2 - 3.8 * (u * u * (3 - 2 * u)), SUN_Z);
}
export function sunRadius(t) {
  return 1.4 * Math.exp(0.1353 * t);
}

const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec2 uSun;
  uniform float uSunR;
  uniform sampler2D uPaper;
  varying vec3 vWorld;
  void main() {
    float h = clamp((vWorld.y + 1.0) / 17.0, 0.0, 1.0);
    vec3 c = mix(uHorizon, uTop, smoothstep(0.0, 1.0, h));
    float d = max(distance(vWorld.xy, uSun) - uSunR, 0.0);
    float g = exp(-d / (uSunR * 0.9 + 2.5));
    c = mix(c, uGlow, g * 0.85);
    float p = texture2D(uPaper, vWorld.xy * 0.18).r;
    c *= 0.9 + 0.12 * p;
    gl_FragColor = vec4(c, 1.0);
  }
`;

export class Sky {
  constructor(scene) {
    this.state = {};
    for (const f of COLOR_FIELDS) this.state[f] = new THREE.Color();

    this.skyUniforms = {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uSun: { value: new THREE.Vector2() },
      uSunR: { value: 1 },
      uPaper: { value: paperTexture() },
    };
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 80),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        depthWrite: false,
      }),
    );
    sky.position.set(0, 14, -14);
    scene.add(sky);

    this.sunMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', map: paperTexture() });
    this.sun = card(circle(0, 0, 1), null, { depth: 0.02, material: this.sunMaterial, shadows: false });
    this.sun.receiveShadow = false;
    scene.add(this.sun);

    this.light = new THREE.DirectionalLight('#ffffff', 2.6);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048);
    const cam = this.light.shadow.camera;
    cam.left = -20;
    cam.right = 20;
    cam.top = 16;
    cam.bottom = -8;
    cam.near = 1;
    cam.far = 70;
    this.light.shadow.bias = -0.0004;
    this.light.shadow.normalBias = 0.02;
    this.light.shadow.radius = 3;
    this.light.target.position.set(0, 2, -3);
    scene.add(this.light, this.light.target);

    this.hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1);
    scene.add(this.hemi);

    this.update(0);
  }

  /** Sample the keyframes at time t and apply them. */
  update(t) {
    let i = 0;
    while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const raw = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1);
    const u = raw * raw * (3 - 2 * raw);
    const s = this.state;
    for (const f of COLOR_FIELDS) s[f].lerpColors(a[f], b[f], u);
    for (const f of NUMBER_FIELDS) s[f] = THREE.MathUtils.lerp(a[f], b[f], u);

    const centre = sunCentre(t);
    const r = sunRadius(t);
    this.sun.position.copy(centre);
    this.sun.scale.set(r, r, 1);
    this.sunMaterial.color.copy(s.sun).multiplyScalar(1.7);

    this.skyUniforms.uTop.value.copy(s.top);
    this.skyUniforms.uHorizon.value.copy(s.horizon);
    this.skyUniforms.uGlow.value.copy(s.glow);
    this.skyUniforms.uSun.value.set(centre.x, centre.y);
    this.skyUniforms.uSunR.value = r;

    this.light.color.copy(s.light);
    this.light.intensity = s.intensity;
    // The key light leans the same way as the sun, so shadows change with it.
    this.light.position.set(11 + sunX * 1.6, s.height, 8);
    this.hemi.color.copy(s.hemiSky);
    this.hemi.groundColor.copy(s.hemiGround);
    this.hemi.intensity = s.hemi;

    for (const m of glowMaterials) m.emissiveIntensity = s.lamps;
  }
}
