import * as THREE from 'three';
import { Puppet } from '../characters/Puppet.js';
import { Dog, Cat } from '../characters/Animals.js';
import { Residents } from '../people/Residents.js';
import { fillCaption } from './Story.js';
import { seg, smooth, lerp } from './anim.js';
import { GROUP_WAVE } from '../config.js';

/** Score multiplier for a photo of a story, by rarity. */
const BONUS = { common: 1, rare: 1.5, legendary: 2 };
/** Score multiplier for a photo of one story landing in another. */
const CROSS_BONUS = 1.3;
/** How long a target reacts after something lands on them. */
const REACT = 1.8;

/** Which landing kinds each kind of target can take. */
const TAKES = { person: ['hand', 'head'], dog: ['mouth'], cat: ['head'] };

/**
 * Tonight's show: builds the planned stories, runs them, and exposes them to scoring as
 * "moments". Rebuilt from scratch every evening, so only tonight's stories exist in the scene.
 *
 * It also wires up crossovers: when the director has paired a throwing story with a target
 * story, the thrower's ctx.cross tells it where its prop should land (a person's hand or
 * head, a dog's mouth, a cat's head), the target reacts when it arrives, and the landing
 * becomes a moment of its own.
 */
export class Show {
  constructor(scene, particles, { onCue = () => {} } = {}) {
    this.scene = scene;
    this.particles = particles;
    this.onCue = onCue;
    this.group = null;
    this.moments = [];
    this.people = [];
    this.crossovers = [];
    this.t = 0;
  }

  /** plan: output of planEvening(); site: building-site handles from Facades (or null). */
  load(plan, evening, { site = null } = {}) {
    this.dispose();
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.moments = [];
    this.people = [];
    this.crossovers = [];
    this.t = 0;
    const residents = new Residents(evening);
    const tonight = plan.map((item) => item.story.id);
    const built = [];

    for (const item of plan) {
      const { story, slots, outcome, peak } = item;
      const group = new THREE.Group();
      this.group.add(group);
      const names = {};
      for (const [role, spec] of Object.entries(story.cast)) names[role] = residents.cast(spec);
      const targets = [];
      const extras = [];
      // Filled in once every story exists (see below); throwers read it during update.
      const cross = item.cross ? { active: false, kind: null, name: '', landedAt: null, point: null, land: () => {} } : null;
      const cast = (role, spec) => names[role] || (names[role] = residents.cast(spec));

      const ctx = {
        group,
        slot: slots[0],
        slots,
        outcome,
        peak,
        evening,
        site,
        tonight,
        cross,
        particles: this.particles,
        names,
        /** A paper puppet for a role, standing at (x, y, z). waveArm: 'L' | 'R' | null. */
        person: (role, x, y, z, waveArm = 'R', overrides = {}) => {
          const who = cast(role, {});
          const puppet = new Puppet({ ...who.look, ...overrides });
          puppet.root.position.set(x, y, z);
          group.add(puppet.root);
          if (waveArm) {
            this.people.push({ name: who.first, puppet, object: puppet.root, waveArm, phase: evening.range(0, 6) });
            targets.push({ kind: 'person', name: who.first, puppet, object: puppet.root, side: waveArm });
          }
          return puppet;
        },
        dog: (role) => {
          const who = cast(role, { kind: 'dog' });
          const dog = new Dog(who.look);
          targets.push({ kind: 'dog', name: who.first, animal: dog, object: dog.root });
          return dog;
        },
        cat: (role) => {
          const who = cast(role, { kind: 'cat' });
          const cat = new Cat(who.look);
          targets.push({ kind: 'cat', name: who.first, animal: cat, object: cat.root });
          return cat;
        },
        add: (object, x = 0, y = 0, z = 0) => {
          object.position.set(x, y, z);
          group.add(object);
          return object;
        },
        /**
         * An extra photo moment, e.g. for a chain event. def: { id, at (seconds after this
         * story's peak), dur, focus, captions, tags, visible?, x?, bonus? }.
         */
        moment: (def) => extras.push(def),
      };
      const instance = story.create(ctx);
      const o = story.outcomes[outcome];
      const moment = this.addMoment({
        id: story.id,
        story,
        instance,
        peak,
        dur: story.dur,
        variant: outcome,
        tags: [...o.tags, ...(story.rarity !== 'common' ? ['rare'] : [])],
        rarity: story.rarity,
        bonus: BONUS[story.rarity] ?? 1,
        captions: o.captions,
        names,
        focus: instance.focus,
        visible: instance.visible,
        x: instance.x || (() => slots[0].x),
      });
      for (const def of extras) {
        this.addMoment({
          id: `${story.id}:${def.id}`,
          peak: peak + def.at,
          dur: def.dur ?? 1.2,
          variant: outcome,
          tags: def.tags ?? ['crossover'],
          rarity: 'common',
          bonus: def.bonus ?? CROSS_BONUS,
          captions: def.captions,
          names,
          focus: def.focus,
          visible: def.visible,
          x: def.x || moment.x,
        });
      }
      built.push({ item, names, targets, cross, instance, moment });
    }

    // Crossovers: point each thrower at someone in its target story.
    for (const b of built) {
      if (!b.cross) continue;
      const throws = b.item.story.outcomes[b.item.outcome].throws;
      const into = built.find((x) => x.item === b.item.cross.target);
      const options = into.targets.flatMap((tg) => throws.kinds.filter((k) => TAKES[tg.kind].includes(k)).map((k) => ({ tg, k })));
      if (!options.length) continue;
      const { tg, k } = evening.pick(options);
      const cross = b.cross;
      Object.assign(cross, {
        active: true,
        kind: k,
        name: tg.name,
        target: tg,
        point: (v = new THREE.Vector3()) => landingPoint(tg, k, v),
        land: () => {
          if (cross.landedAt == null) cross.landedAt = this.t;
        },
      });
      this.crossovers.push(cross);
      const names = { ...b.names, target: { first: tg.name, last: '' } };
      this.addMoment({
        id: `${b.item.story.id}>${into.item.story.id}`,
        peak: b.item.peak + throws.lands,
        dur: 1.2,
        variant: b.item.outcome,
        tags: ['crossover', ...(throws.tags ?? b.moment.tags)],
        rarity: 'common',
        bonus: CROSS_BONUS,
        captions: {
          peak: throws.caption,
          near: throws.near ?? 'Something, heading for {target}.',
          after: throws.after ?? throws.caption,
          idle: throws.after ?? throws.caption,
        },
        names,
        focus: () => [tg.object, ...(b.instance.thrown ? [b.instance.thrown] : [])],
        visible: (p) => p > -0.5,
        x: () => tg.object.position.x,
      });
    }
  }

  addMoment(m) {
    const captions = {};
    for (const [k, text] of Object.entries(m.captions)) captions[k] = fillCaption(text, m.names);
    const moment = {
      ...m,
      active: true,
      rare: m.rarity !== 'common',
      captions,
      caption: (kind) => captions[kind],
      cued: false,
      peaked: false,
    };
    this.moments.push(moment);
    return moment;
  }

  update(t, dt, wall) {
    this.t = t;
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
      m.instance?.update(p, { wall, dt, outcome: m.variant });
    }
    this.reactions(t, wall);
    this.groupWave(t, wall);
  }

  /** People something just landed on: a catch held up high, or hands to the head. */
  reactions(t, wall) {
    for (const c of this.crossovers) {
      if (c.landedAt == null || c.target.kind !== 'person') continue;
      const u = t - c.landedAt;
      if (u > REACT) continue;
      const w = smooth(seg(u, 0, 0.15)) * (1 - smooth(seg(u, REACT - 0.4, REACT)));
      const puppet = c.target.puppet;
      if (c.kind === 'hand') {
        const arm = c.target.side === 'L' ? puppet.armL : puppet.armR;
        const sign = c.target.side === 'L' ? -1 : 1;
        arm.rotation.z = lerp(arm.rotation.z, sign * 2.5, w);
      } else {
        puppet.armL.rotation.z = lerp(puppet.armL.rotation.z, -1.3 - Math.sin(wall * 12) * 0.2, w);
        puppet.armR.rotation.z = lerp(puppet.armR.rotation.z, 1.3 + Math.sin(wall * 12) * 0.2, w);
      }
      puppet.mouth.scale.y = lerp(puppet.mouth.scale.y, 1, w);
    }
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

/** Where a thrown prop sits on its target, in world coordinates. */
function landingPoint(tg, kind, v) {
  tg.object.updateMatrixWorld(true);
  if (tg.kind === 'person') return kind === 'hand' ? tg.puppet.hand(tg.side, v) : tg.puppet.headTop(v);
  if (tg.kind === 'dog') return tg.animal.mouth(v);
  return tg.animal.head.localToWorld(v.set(0, 0.24, 0.03));
}
