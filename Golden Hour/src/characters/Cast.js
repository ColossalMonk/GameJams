import * as THREE from 'three';
import { Puppet } from './Puppet.js';
import { Dog, Cat } from './Animals.js';
import { makeCar, makeKite, makeHat, makeGuitar, makeCake, makeBouquet, makeFrisbee, makeRingBox } from './Props.js';
import { LAYOUT, hillHeight } from '../world/Town.js';
import { GROUP_WAVE } from '../config.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** 0 → 1 as p goes from a to b. */
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (u) => u * u * (3 - 2 * u);
const easeOut = (u) => 1 - (1 - u) * (1 - u);
const lerp = THREE.MathUtils.lerp;

/** Minimum gap between two moments' peaks, so the player is never asked to be in two places. */
const MIN_GAP = 0.6;

/**
 * Everyone in town and their one big moment. Each moment has a random peak time inside
 * its window; its update(p) is driven by p = t − peak, so p < 0 is the build-up, 0..dur is
 * the peak worth photographing, and after that is the aftermath.
 */
export class Cast {
  constructor(scene, particles, { onCue = () => {} } = {}) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.particles = particles;
    this.onCue = onCue;
    this.people = [];
    this.moments = [];
    this.build();
    this.reset();
  }

  person(name, options, x, y, z, waveArm) {
    const puppet = new Puppet(options);
    puppet.root.position.set(x, y, z);
    this.group.add(puppet.root);
    this.people.push({ name, puppet, object: puppet.root, waveArm, phase: Math.random() * 6 });
    return puppet;
  }

  add(object, x, y, z) {
    object.position.set(x, y, z);
    this.group.add(object);
    return object;
  }

  moment(def) {
    this.moments.push({ ...def, peak: 0, cued: false, peaked: false, state: {} });
  }

  /** New random schedule for a fresh run. */
  reset() {
    const placed = [];
    for (const m of this.moments) {
      let peak = 0;
      for (let tries = 0; tries < 60; tries++) {
        peak = lerp(m.window[0], m.window[1], Math.random());
        if (placed.every((q) => Math.abs(q - peak) >= MIN_GAP)) break;
      }
      placed.push(peak);
      m.peak = peak;
      m.cued = false;
      m.peaked = false;
      m.state = {};
    }
  }

  update(t, dt, wall) {
    for (const m of this.moments) {
      const p = t - m.peak;
      if (!m.cued && p >= -1.0) {
        m.cued = true;
        this.onCue('build', m);
      }
      if (!m.peaked && p >= 0) {
        m.peaked = true;
        this.onCue('peak', m);
      }
      m.update(p, wall, dt, m.state);
    }
    this.groupWave(t, wall);
  }

  /** Near the end everyone turns to the sun and waves with a free hand. */
  groupWave(t, wall) {
    const w = smooth(seg(t, GROUP_WAVE.start, GROUP_WAVE.start + 0.5)) * (1 - smooth(seg(t, GROUP_WAVE.end - 0.4, GROUP_WAVE.end)));
    if (w <= 0) return;
    for (const person of this.people) {
      const arm = person.waveArm === 'L' ? person.puppet.armL : person.puppet.armR;
      const sign = person.waveArm === 'L' ? -1 : 1;
      const angle = sign * (2.55 + Math.sin(wall * 9 + person.phase) * 0.35);
      arm.rotation.z = lerp(arm.rotation.z, angle, w);
      person.puppet.mouth.scale.y = lerp(person.puppet.mouth.scale.y, 0.8, w);
    }
  }

  build() {
    const g = this.group;
    const v = () => new THREE.Vector3();

    // ── 1. Mittens the cat yawns on the garden wall ──
    {
      const cat = new Cat();
      cat.root.scale.setScalar(0.85);
      this.add(cat.root, LAYOUT.cat.x, LAYOUT.wall.h + 0.12, LAYOUT.wall.z + 0.12);
      const dur = 0.8;
      this.moment({
        id: 'cat',
        window: [1.4, 3.6],
        dur,
        x: LAYOUT.cat.x,
        focus: () => [cat.root],
        captions: {
          peak: 'Mittens, mid-yawn.',
          near: 'Mittens, almost yawning.',
          after: 'Mittens, back to not caring.',
          idle: 'Mittens, unbothered by the sun.',
        },
        update: (p, wall) => {
          const build = smooth(seg(p, -1.0, 0));
          const open = p < 0 ? 0 : p < dur ? easeOut(seg(p, 0, 0.25)) : 1 - smooth(seg(p, dur, dur + 0.5));
          cat.pose({
            stretch: build * (1 - seg(p, dur, dur + 0.6)),
            yawn: open,
            sway: Math.sin(wall * 1.7) * 0.25,
            head: open * 0.12 + Math.sin(wall * 0.7) * 0.05,
          });
        },
      });
    }

    // ── 2. Ada gets her kite up on the hill ──
    {
      const kx = LAYOUT.kiteKid.x;
      const ky = hillHeight(kx);
      const kz = LAYOUT.hill.z + 0.25;
      const ada = this.person('Ada', { kid: true, height: 0.62, top: '#f2c14e', bottom: '#5f8fb5', hair: '#2f2226', hairStyle: 'bun', skin: '#a8714e' }, kx, ky - 0.03, kz, 'L');
      const kite = makeKite();
      g.add(kite.group);
      const stringPoints = 14;
      const stringGeo = new THREE.BufferGeometry();
      stringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(stringPoints * 3), 3));
      const string = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: '#3a3340' }));
      string.frustumCulled = false;
      g.add(string);
      const ground = new THREE.Vector3(kx + 0.75, hillHeight(kx + 0.75) + 0.14, kz + 0.05);
      const dragEnd = ground.clone().add(new THREE.Vector3(0.35, 0.55, 0));
      const hand = v();
      const dur = 0.8;
      this.moment({
        id: 'kite',
        window: [2.4, 6.0],
        dur,
        x: kx,
        focus: () => [kite.group],
        captions: {
          peak: "Ada's kite, finally up.",
          near: 'Ada, running as fast as she can.',
          after: "Ada's kite, higher than the birds.",
          idle: 'Ada and a kite that will not fly.',
        },
        update: (p, wall) => {
          const run = p >= -1.6 && p < 0;
          if (p < -1.6) {
            ada.pose({ bob: Math.abs(Math.sin(wall * 3)) * 0.03, armR: 0.5, armL: 0.2, mouth: 0.35 });
            kite.group.position.copy(ground);
            kite.group.rotation.z = 1.25;
          } else if (run) {
            const u = seg(p, -1.6, 0);
            const stride = Math.sin(wall * 16);
            ada.pose({ lean: 0.18, bob: Math.abs(stride) * 0.06, legL: stride * 0.55, legR: stride * 0.55, armR: 0.9, armL: 0.6 - stride * 0.4, mouth: 0.6 });
            kite.group.position.lerpVectors(ground, dragEnd, u);
            kite.group.position.y += Math.abs(Math.sin(wall * 10)) * 0.15 * u;
            kite.group.rotation.z = 1.25 * (1 - u);
          } else {
            const u = easeOut(seg(p, 0, 0.7));
            const high = new THREE.Vector3(kx - 1.7 + Math.sin(wall * 0.9) * 0.25, ky + 3.5 + Math.sin(wall * 1.3) * 0.15, kz);
            kite.group.position.lerpVectors(dragEnd, high, u);
            kite.group.rotation.z = Math.sin(wall * 1.5) * 0.15;
            if (p < dur) ada.pose({ bob: Math.abs(Math.sin(wall * 9)) * 0.1, armL: 2.6, armR: 2.6, mouth: 1 });
            else ada.pose({ bob: Math.abs(Math.sin(wall * 3)) * 0.02, armR: 2.0, armL: 0.3, mouth: 0.5 });
          }
          kite.bows.forEach((bow, i) => {
            bow.position.set(Math.sin(wall * 3 + i) * 0.06 * (i + 1), -0.5 - i * 0.17, 0.01);
            bow.rotation.z = Math.sin(wall * 4 + i) * 0.4;
          });
          ada.root.updateMatrixWorld(true);
          ada.hand('R', hand);
          const kp = kite.group.position;
          const taut = p >= 0 ? 0.15 : 0.35;
          const arr = stringGeo.attributes.position.array;
          for (let i = 0; i < stringPoints; i++) {
            const s = i / (stringPoints - 1);
            arr[i * 3] = lerp(hand.x, kp.x, s);
            arr[i * 3 + 1] = lerp(hand.y, kp.y, s) - Math.sin(Math.PI * s) * taut;
            arr[i * 3 + 2] = lerp(hand.z, kp.z, s);
          }
          stringGeo.attributes.position.needsUpdate = true;
        },
      });
    }

    // ── 3. Biscuit catches the frisbee ──
    {
      const fz = LAYOUT.frisbee.z;
      const kai = this.person('Kai', { top: '#7fae6a', bottom: '#4a3f5c', hair: '#1f1a22', skin: '#c68a5e' }, LAYOUT.frisbee.thrower, 0, fz, 'R');
      const dog = new Dog();
      dog.root.scale.set(-0.9, 0.9, 0.9);
      this.add(dog.root, LAYOUT.frisbee.dog, 0, fz + 0.1);
      const frisbee = makeFrisbee();
      g.add(frisbee);
      const release = -0.35;
      const catchAt = 0.15;
      const jump = (p) => (p > -0.25 && p < 0.75 ? 1.5 * Math.sin((Math.PI * (p + 0.25)) / 1.0) : 0);
      const dogPose = (p, wall) => {
        const inAir = p > -0.25 && p < 0.75;
        const crouch = p > -0.6 && p <= -0.25 ? 0.09 * smooth(seg(p, -0.6, -0.3)) : 0;
        const excited = p > -1.2;
        const landed = p >= 0.75;
        dog.pose({
          jump: jump(p) + (landed ? Math.abs(Math.sin(wall * 7)) * 0.06 * (1 - seg(p, 0.75, 2.5)) : 0),
          crouch,
          tilt: inAir ? 0.45 * Math.cos(Math.PI * (p + 0.25)) : 0,
          legs: inAir ? 0.55 : 0,
          wag: Math.sin(wall * (excited ? 16 : 5)) * (excited ? 0.5 : 0.25),
          head: inAir ? 0.2 : 0,
        });
      };
      // Where the dog's mouth is at the moment of the catch — the frisbee flies there.
      dogPose(catchAt, 0);
      dog.root.updateMatrixWorld(true);
      const catchPoint = dog.mouth(v());
      const throwFrom = new THREE.Vector3(LAYOUT.frisbee.thrower + 0.75, 1.15, fz + 0.12);
      const dur = 0.7;
      this.moment({
        id: 'dog',
        window: [4.2, 8.6],
        dur,
        x: LAYOUT.frisbee.dog,
        focus: () => [dog.root],
        captions: {
          peak: 'Biscuit, mid-catch.',
          near: 'Biscuit, almost.',
          after: 'Biscuit, very proud of himself.',
          idle: 'Biscuit, waiting patiently.',
        },
        update: (p, wall) => {
          const wind = smooth(seg(p, -1.1, -0.45));
          const fling = easeOut(seg(p, -0.45, release + 0.1));
          let armR = lerp(0.3 + Math.sin(wall * 1.5) * 0.05, -0.7, wind);
          if (p > -0.45) armR = lerp(-0.7, 1.7, fling);
          if (p > release + 0.5) armR = lerp(1.7, 0.4, smooth(seg(p, release + 0.5, release + 1.0)));
          const cheering = p > catchAt && p < 2.5;
          const clap = Math.abs(Math.sin(wall * 10)) * 0.3;
          kai.pose({
            lean: lerp(0, 0.08, wind) - 0.12 * fling * (1 - seg(p, 0.3, 1)),
            armR: cheering && p > release + 1.0 ? 0.6 + clap : armR,
            armL: cheering ? 0.6 + clap : 0.15,
            mouth: cheering ? 0.9 : 0.35,
          });
          dogPose(p, wall);

          kai.root.updateMatrixWorld(true);
          dog.root.updateMatrixWorld(true);
          if (p < release) {
            kai.hand('R', frisbee.position);
            frisbee.position.z += 0.06;
            frisbee.rotation.z = 0;
          } else if (p < catchAt) {
            const u = seg(p, release, catchAt);
            frisbee.position.lerpVectors(throwFrom, catchPoint, u);
            frisbee.position.y += Math.sin(Math.PI * u) * 0.5;
            frisbee.rotation.z = -0.2;
          } else {
            dog.mouth(frisbee.position);
            frisbee.position.z += 0.05;
            frisbee.rotation.z = dog.body.rotation.z * -1;
          }
        },
      });
    }

    // ── 4. Lou plays the last chord and throws his hat ──
    {
      const M = LAYOUT.musician;
      const lou = this.person('Lou', { top: '#3f6f8f', bottom: '#2f2a30', hair: '#6b4636', skin: '#e0a77e' }, M.x, 0, M.z, 'L');
      const guitar = makeGuitar();
      guitar.position.set(0.1, 0.18, 0.08);
      guitar.rotation.z = 0.95;
      lou.hips.add(guitar);
      const hat = makeHat();
      g.add(hat);
      const top = v();
      const dur = 0.7;
      const flight = 1.3;
      this.moment({
        id: 'musician',
        window: [5.2, 9.6],
        dur,
        x: M.x,
        focus: () => [lou.root],
        captions: {
          peak: "Lou's last chord.",
          near: 'Lou, building up to something.',
          after: 'Lou, taking a bow.',
          idle: 'Lou, playing for the whole street.',
        },
        update: (p, wall) => {
          const build = seg(p, -1.2, 0);
          const speed = 8 + 8 * build;
          const strum = -0.25 + Math.sin(wall * speed) * 0.18 * (1 + 1.6 * build);
          let armR = strum;
          let lean = -0.06 * build;
          let mouth = 0.35 + 0.3 * build;
          if (p >= 0) {
            const up = easeOut(seg(p, 0, 0.15)) * (1 - smooth(seg(p, dur, dur + 0.6)));
            armR = lerp(-0.25, 2.8, up);
            lean = -0.13 * up;
            mouth = 0.35 + 0.6 * up;
          }
          const bow = p > dur + 0.6 && p < dur + 2.2 ? Math.sin(Math.PI * seg(p, dur + 0.6, dur + 2.2)) : 0;
          lou.pose({ lean, armR, armL: 0.75, head: Math.sin(wall * 6) * 0.06 * (1 - bow) - bow * 0.25, bob: -bow * 0.06, mouth });

          lou.root.updateMatrixWorld(true);
          lou.headTop(top);
          hat.position.set(top.x, top.y - 0.06, top.z + 0.02);
          hat.rotation.z = lou.hips.rotation.z + lou.neck.rotation.z;
          if (p >= 0 && p < flight) {
            const q = p / flight;
            hat.position.y += 4 * q * (1 - q) * 1.2;
            hat.position.x += Math.sin(Math.PI * q) * 0.25;
            hat.rotation.z += q * Math.PI * 4;
          }
        },
      });
    }

    // ── 5. Grandma Rosa blows out her candles ──
    {
      const T = LAYOUT.table;
      const rosa = this.person('Rosa', { top: '#c9a4c4', dress: true, hair: '#ece6dc', hairStyle: 'bun', skin: '#eebf9a', height: 0.92 }, T.x - 0.38, 0, T.z - 0.5, 'L');
      const pip = this.person('Pip', { kid: true, height: 0.6, top: '#7fb3d6', bottom: '#f2c14e', hair: '#8a5a3a', skin: '#eebf9a' }, T.x + 0.82, 0, T.z - 0.1, 'R');
      const cake = makeCake();
      this.add(cake.group, T.x + 0.05, 0.82, T.z - 0.05);
      const pos = v();
      const dur = 0.8;
      this.moment({
        id: 'birthday',
        window: [6.2, 10.6],
        dur,
        x: T.x,
        focus: () => [rosa.root, cake.group],
        captions: {
          peak: 'Grandma Rosa, every candle in one go.',
          near: 'Grandma Rosa, taking a deep breath.',
          after: 'Rosa, ninety years and one minute.',
          idle: 'Grandma Rosa and her cake.',
        },
        update: (p, wall, dt, s) => {
          cake.flames.forEach((f, i) => {
            f.visible = p < 0;
            f.scale.set(1 + Math.sin(wall * 23 + i * 2) * 0.12, 1 + Math.sin(wall * 17 + i) * 0.15, 1);
          });
          if (p >= 0 && !s.blown) {
            s.blown = true;
            for (const f of cake.flames) {
              f.getWorldPosition(pos);
              this.particles.spawn('smoke', pos, new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.5, 0), { life: 1.8 });
            }
          }
          const leanIn = smooth(seg(p, -1.0, -0.15)) * (1 - smooth(seg(p, 0.15, 0.8)));
          const cheer = p >= 0 && p < dur + 1.2;
          const clap = Math.abs(Math.sin(wall * 10)) * 0.3;
          rosa.pose({
            lean: -0.3 * leanIn + Math.sin(wall * 0.9) * 0.02,
            head: -0.15 * leanIn,
            armL: cheer ? (p < dur ? 2.4 : 0.6 + clap) : 0.2,
            armR: cheer ? (p < dur ? 2.4 : 0.6 + clap) : 0.2,
            mouth: p < 0 ? 0.35 + 0.6 * leanIn : 0.7,
          });
          pip.pose({
            bob: cheer ? Math.abs(Math.sin(wall * 10)) * 0.12 : Math.abs(Math.sin(wall * 4)) * 0.03,
            armL: cheer ? 2.7 : 0.3,
            armR: cheer ? 2.7 : 0.3,
            mouth: cheer ? 1 : 0.4,
          });
        },
      });
    }

    // ── 6. Mr. Okafor's car finally starts ──
    {
      const car = makeCar();
      this.add(car.group, LAYOUT.car.x, 0, LAYOUT.car.z);
      const okafor = this.person('Mr. Okafor', { top: '#b5524a', bottom: '#5a4a3a', hair: '#d8d2cc', hairStyle: 'bald', beard: true, skin: '#8a5a3e', height: 0.95 }, LAYOUT.oldMan.x, 0, LAYOUT.oldMan.z, 'L');
      const exhaust = v();
      const dur = 0.8;
      this.moment({
        id: 'car',
        window: [8.0, 12.0],
        dur,
        x: LAYOUT.car.x,
        focus: () => [okafor.root, car.group],
        captions: {
          peak: 'Mr. Okafor finally got it running.',
          near: 'Mr. Okafor, one more try.',
          after: 'Mr. Okafor, never been happier.',
          idle: 'Mr. Okafor and his old car.',
        },
        update: (p, wall, dt, s) => {
          const build = seg(p, -1.6, 0);
          const running = p >= 0;
          const shake = running ? lerp(0.07, 0.014, seg(p, 0, 1.2)) : p > -1.6 ? 0.035 * build : 0;
          car.body.position.y = shake * Math.abs(Math.sin(wall * 40));
          car.body.rotation.z = shake * Math.sin(wall * 33) * 0.8;
          car.headlightMat.emissiveIntensity = running ? 2.6 : p > -1.6 && Math.sin(wall * 25) > 0.6 ? 0.8 : 0;

          car.group.updateMatrixWorld(true);
          car.body.localToWorld(exhaust.copy(car.exhaust));
          s.nextPuff ??= 0;
          if (running && !s.burst) {
            s.burst = true;
            for (let i = 0; i < 7; i++) {
              this.particles.spawn('puff', exhaust, new THREE.Vector3(0.6 + Math.random() * 1.1, 0.2 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3), { life: 1.6, scale: 0.8 + Math.random() * 0.8 });
            }
          } else if (p > -1.6 && wall > s.nextPuff) {
            s.nextPuff = wall + (running ? 0.5 : 0.32);
            this.particles.spawn('smoke', exhaust, new THREE.Vector3(0.5, 0.15, 0), { life: 1.2, scale: running ? 1.4 : 1 });
          }

          if (p < -1.6) {
            okafor.pose({ armL: 2.75 + Math.sin(wall * 6) * 0.08, armR: 0.45, lean: -0.04, head: 0.1 });
          } else if (!running) {
            okafor.pose({ armL: 0.9, armR: 1.25 + Math.sin(wall * 14) * 0.35, lean: -0.12, mouth: 0.2 });
          } else if (p < dur) {
            okafor.pose({ armL: 2.8, armR: 2.8, bob: Math.abs(Math.sin(wall * 9)) * 0.12, mouth: 1 });
          } else {
            okafor.pose({ armL: 0.3, armR: 2.3 + Math.sin(wall * 8) * 0.3, mouth: 0.7 });
          }
        },
      });
    }

    // ── 7. The bride throws her bouquet ──
    {
      const W = LAYOUT.wedding;
      const bride = this.person('the bride', { top: '#fbf6ee', dress: true, veil: true, hair: '#6b4636', hairStyle: 'long' }, W.x - 0.42, 0, W.z, 'R');
      const groom = this.person('the groom', { top: '#3a3550', bottom: '#3a3550', hair: '#2f2226', skin: '#c68a5e' }, W.x + 0.42, 0, W.z, 'R');
      const bouquet = makeBouquet();
      g.add(bouquet);
      const landing = new THREE.Vector3(W.x + 1.4, 0.12, W.z + 2.8);
      const flight = 1.5;
      const dur = 0.7;
      this.moment({
        id: 'wedding',
        window: [9.2, 13.0],
        dur,
        x: W.x,
        focus: () => [bride.root],
        captions: {
          peak: 'The bouquet, airborne.',
          near: 'The bride, winding up.',
          after: 'Mr. and Mrs. Lee, just married.',
          idle: 'Mr. and Mrs. Lee, just married.',
        },
        update: (p, wall, dt, s) => {
          let armL = 0.3;
          if (p > -1.0 && p < -0.3) armL = lerp(0.3, -0.5, smooth(seg(p, -1.0, -0.3)));
          if (p >= -0.3) armL = lerp(-0.5, 2.9, easeOut(seg(p, -0.3, 0)));
          const cheer = p >= 0 && p < dur + 1.0;
          if (p > dur + 1.0) armL = lerp(2.9, 0.3, smooth(seg(p, dur + 1.0, dur + 1.6)));
          const sway = Math.sin(wall * 1.1) * 0.03;
          bride.pose({ lean: sway, armL, armR: cheer ? 2.6 : 0.45, mouth: cheer ? 0.9 : 0.4 });
          groom.pose({ lean: sway, armL: cheer ? 2.4 : 0.45, armR: cheer ? 2.4 : 0.15, mouth: cheer ? 0.9 : 0.35 });

          bride.root.updateMatrixWorld(true);
          if (p < 0) {
            bride.hand('L', bouquet.position);
            bouquet.position.z += 0.08;
            bouquet.position.y += 0.08;
            bouquet.rotation.z = 0;
          } else if (p < flight) {
            if (!s.start) {
              s.start = bride.hand('L', v());
              s.start.y += 0.08;
            }
            const q = p / flight;
            bouquet.position.lerpVectors(s.start, landing, q);
            bouquet.position.y += 4 * q * (1 - q) * 2.0;
            bouquet.rotation.z = q * Math.PI * 3;
          } else {
            bouquet.position.copy(landing);
            bouquet.rotation.z = 1.4;
          }
        },
      });
    }

    // ── 8. Jo proposes, Sam says yes ──
    {
      const P = LAYOUT.proposal;
      const jo = this.person('Jo', { top: '#2f6f6a', bottom: '#e9d9b6', hair: '#3a2a24', skin: '#d9a07a' }, P.a, 0, P.z, 'L');
      const sam = this.person('Sam', { top: '#f2c14e', dress: true, hair: '#b0453a', hairStyle: 'long' }, P.b, 0, P.z, 'R');
      const ring = makeRingBox();
      g.add(ring);
      const between = new THREE.Vector3((P.a + P.b) / 2, 1.7, P.z + 0.2);
      const dur = 0.8;
      this.moment({
        id: 'proposal',
        window: [10.2, 13.8],
        dur,
        x: (P.a + P.b) / 2,
        focus: () => [jo.root, sam.root],
        captions: {
          peak: 'Sam said yes.',
          near: 'Jo, down on one knee.',
          after: 'Sam and Jo, engaged at the end of the world.',
          idle: 'Sam and Jo, out for a walk.',
        },
        update: (p, wall, dt, s) => {
          const kneel = smooth(seg(p, -1.6, -0.9)) * (1 - smooth(seg(p, dur + 0.6, dur + 1.3)));
          const offer = smooth(seg(p, -1.0, -0.6)) * (1 - smooth(seg(p, dur + 0.6, dur + 1.0)));
          const hug = smooth(seg(p, dur + 0.9, dur + 1.6));
          const chat = p < -1.6 ? Math.sin(wall * 2.2) * 0.08 : 0;
          jo.pose({
            bob: -0.3 * kneel,
            legL: 0.6 * kneel,
            legR: 0.15 * kneel,
            armR: 1.3 * offer + 0.6 * hug,
            lean: -0.15 * hug,
            head: chat,
            mouth: 0.35,
          });
          const surprised = smooth(seg(p, -0.9, -0.4));
          const jumpU = seg(p, 0, 0.5);
          const yes = p >= 0 && p < dur + 0.6;
          sam.pose({
            bob: yes ? 0.25 * Math.sin(Math.PI * jumpU) : 0,
            armL: yes ? 3.0 : lerp(0.2, 2.75, surprised) * (1 - hug) + 0.6 * hug,
            armR: yes ? 3.0 : lerp(0.2, 2.75, surprised) * (1 - hug) + 0.3 * hug,
            lean: 0.15 * hug,
            head: -chat,
            mouth: yes ? 1 : 0.35 + 0.55 * surprised,
          });

          ring.visible = p > -1.0 && p < dur + 0.8;
          jo.root.updateMatrixWorld(true);
          jo.hand('R', ring.position);
          ring.position.z += 0.08;
          ring.position.y += 0.04;
          if (p >= 0 && !s.hearts) {
            s.hearts = true;
            for (let i = 0; i < 6; i++) {
              this.particles.spawn('heart', between, new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 0.8, 0.1), { life: 1.6, scale: 0.8 + Math.random() * 0.6 });
            }
          }
        },
      });
    }

    // ── 9. June and Theo kiss on the rooftop ──
    {
      const R = LAYOUT.rooftop;
      const june = this.person('June', { top: '#e2574c', dress: true, hair: '#2f2226', hairStyle: 'long', skin: '#c68a5e', height: 0.95 }, R.a, R.y, R.z, 'L');
      const theo = this.person('Theo', { top: '#f3ead8', bottom: '#5f8fb5', hair: '#d9b04a' }, R.b, R.y, R.z, 'R');
      const above = new THREE.Vector3((R.a + R.b) / 2, R.y + 2.0, R.z + 0.2);
      const dur = 0.8;
      this.moment({
        id: 'kiss',
        window: [11.2, 14.6],
        dur,
        x: (R.a + R.b) / 2,
        focus: () => [june.root, theo.root],
        captions: {
          peak: 'June and Theo, on the roof.',
          near: 'June and Theo, almost.',
          after: 'June and Theo, watching it come.',
          idle: 'June and Theo, up on the roof.',
        },
        update: (p, wall, dt, s) => {
          const toward = smooth(seg(p, -1.2, 0)) * 0.3 * (1 - 0.6 * smooth(seg(p, dur + 1.2, dur + 2.0)));
          const closed = p >= -0.1 && p < dur + 1.2;
          const sway = Math.sin(wall * 1.2) * 0.02;
          june.pose({ lean: -toward + sway, head: -toward * 0.4, armR: 0.45, eyes: closed ? 0.15 : 1, mouth: 0.3 });
          theo.pose({ lean: toward + sway, head: toward * 0.4, armL: 0.45, eyes: closed ? 0.15 : 1, mouth: 0.3 });
          if (p >= 0.05 && !s.heart) {
            s.heart = true;
            this.particles.spawn('heart', above, new THREE.Vector3(0, 0.4, 0), { life: 1.8, scale: 1.6 });
          }
        },
      });
    }
  }
}
