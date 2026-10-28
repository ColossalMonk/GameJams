import * as THREE from 'three';
import { Puppet } from '../characters/Puppet.js';
import { Dog, Cat } from '../characters/Animals.js';
import { Residents } from '../people/Residents.js';
import { fillCaption } from './Story.js';
import { seg, smooth, lerp } from './anim.js';
import { GROUP_WAVE } from '../config.js';

/**
 * Tonight's show: builds the planned stories, runs them, and exposes them to scoring as
 * "moments". Rebuilt from scratch every evening, so only tonight's stories exist in the scene.
 */
export class Show {
  constructor(scene, particles, { onCue = () => {} } = {}) {
    this.scene = scene;
    this.particles = particles;
    this.onCue = onCue;
    this.group = null;
    this.moments = [];
    this.people = [];
  }

  /** plan: output of planEvening(); site: building-site handles from Facades (or null). */
  load(plan, evening, { site = null } = {}) {
    this.dispose();
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.moments = [];
    this.people = [];
    const residents = new Residents(evening);
    const tonight = plan.map((item) => item.story.id);

    for (const item of plan) {
      const { story, slots, outcome, peak } = item;
      const group = new THREE.Group();
      this.group.add(group);
      const names = {};
      for (const [role, spec] of Object.entries(story.cast)) names[role] = residents.cast(spec);

      const ctx = {
        group,
        slot: slots[0],
        slots,
        outcome,
        peak,
        evening,
        site,
        tonight,
        particles: this.particles,
        names,
        /** A paper puppet for a role, standing at (x, y, z). waveArm: 'L' | 'R' | null. */
        person: (role, x, y, z, waveArm = 'R', overrides = {}) => {
          const who = names[role] || (names[role] = residents.cast({}));
          const puppet = new Puppet({ ...who.look, ...overrides });
          puppet.root.position.set(x, y, z);
          group.add(puppet.root);
          if (waveArm) this.people.push({ name: who.first, puppet, object: puppet.root, waveArm, phase: evening.range(0, 6) });
          return puppet;
        },
        dog: (role) => new Dog((names[role] || (names[role] = residents.cast({ kind: 'dog' }))).look),
        cat: (role) => new Cat((names[role] || (names[role] = residents.cast({ kind: 'cat' }))).look),
        add: (object, x = 0, y = 0, z = 0) => {
          object.position.set(x, y, z);
          group.add(object);
          return object;
        },
      };
      const instance = story.create(ctx);
      const o = story.outcomes[outcome];
      const captions = {};
      for (const [k, text] of Object.entries(o.captions)) captions[k] = fillCaption(text, names);
      this.moments.push({
        id: story.id,
        story,
        instance,
        group,
        peak,
        dur: story.dur,
        variant: outcome,
        tags: [...o.tags, ...(story.rarity !== 'common' ? ['rare'] : [])],
        rare: story.rarity !== 'common',
        rarity: story.rarity,
        active: true,
        captions,
        caption: (kind) => captions[kind],
        focus: instance.focus,
        visible: instance.visible,
        x: instance.x || (() => slots[0].x),
        cued: false,
        peaked: false,
      });
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
      m.instance.update(p, { wall, dt, outcome: m.variant });
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

  dispose() {
    if (!this.group) return;
    this.scene.remove(this.group);
    this.group.traverse((o) => o.geometry?.dispose());
    this.group = null;
  }
}
