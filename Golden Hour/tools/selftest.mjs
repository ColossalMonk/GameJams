/**
 * Headless check of every story and of many whole evenings. Runs in Node, no browser:
 *
 *   node tools/selftest.mjs            all stories + 300 evenings
 *   node tools/selftest.mjs crane      just the stories whose id contains "crane"
 *   node tools/selftest.mjs --index b  just the stories in catalogue/index-b.js (skips evenings)
 *
 * For each story and outcome it plays the story up to the middle of its peak, frames the
 * story's focus the way a player would, and checks that scoring calls it a peak with the
 * right caption. Then it plans and runs whole evenings looking for crashes, slot clashes
 * and broken positions. Crossovers (a thrown prop landing in another story) are checked
 * the same way, for every throwing outcome and every kind of target.
 */
import * as THREE from 'three';
import { usesSite } from '../src/stories/registry.js';
import { Show } from '../src/stories/Show.js';
import { planEvening } from '../src/director/Director.js';
import { Evening } from '../src/game/Evening.js';
import { SLOTS } from '../src/world/Town.js';
import { Facades } from '../src/world/Facades.js';
import { Particles } from '../src/characters/Particles.js';
import { setSunX } from '../src/world/Sky.js';
import { scorePhoto, screenBox, union } from '../src/game/Scoring.js';
import { fitCamera } from '../src/core/framing.js';

const W = 1600;
const H = 900;
const args = process.argv.slice(2);
const indexAt = args.indexOf('--index');
const batch = indexAt >= 0 ? args.splice(indexAt, 2)[1] : null;
const filter = args[0];
// With --index, load only that batch file, so a half-written story in another batch
// can't break this run.
const STORIES = batch
  ? (await import(`../src/stories/catalogue/index-${batch}.js`)).default
  : (await import('../src/stories/registry.js')).STORIES;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 200);
const target = new THREE.Vector3();
fitCamera(camera, target, camera.position);
camera.lookAt(target);
camera.updateMatrixWorld();
const stage = { camera, width: W, height: H };
const particles = new Particles(scene);
const facades = new Facades(scene, new THREE.MeshStandardMaterial());
const show = new Show(scene, particles);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};

function load(plan, evening) {
  facades.build(evening, { site: usesSite(plan) });
  show.load(plan, evening, { site: facades.site });
  particles.clear();
}

function checkFinite(label) {
  let bad = null;
  show.group.traverse((o) => {
    if (bad) return;
    const p = o.position;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) bad = o.type;
  });
  if (bad) fail(`${label}: non-finite position on a ${bad}`);
}

/** Frame a moment's focus the way a player would and score the photo. */
function shoot(m, t, label) {
  const u = union(m.focus().map((o) => screenBox(o, camera, W, H)));
  if (u.x1 - u.x0 > W * 0.9 || u.y1 - u.y0 > H * 0.9) fail(`${label}: focus is bigger than the screen (${Math.round(u.x1 - u.x0)}×${Math.round(u.y1 - u.y0)})`);
  if (u.x1 < 0 || u.x0 > W || u.y1 < 0 || u.y0 > H) fail(`${label}: focus is off screen at the peak`);
  const size = Math.min(H, Math.max(u.x1 - u.x0, u.y1 - u.y0) + 60);
  const cx = (u.x0 + u.x1) / 2;
  const cy = (u.y0 + u.y1) / 2;
  const rect = { x: Math.min(Math.max(cx - size / 2, 0), W - size), y: Math.min(Math.max(cy - size / 2, 0), H - size), size };
  return scorePhoto({ t, rect, stage, cast: show });
}

function play(from, to, dt = 1 / 60) {
  for (let t = from; t <= to; t += dt) {
    show.update(t, dt, t);
    particles.update(dt);
  }
  scene.updateMatrixWorld(true);
}

// ── 1. Every story, every outcome ──
const stories = STORIES.filter((s) => !filter || s.id.includes(filter));
console.log(`Stories (${stories.length}):`);
for (const story of stories) {
  for (const outcome of Object.keys(story.outcomes)) {
    const label = `${story.id}/${outcome}`;
    try {
      const evening = new Evening(7);
      setSunX(3.6);
      const plan = planEvening(evening, { stories: STORIES, slots: SLOTS, only: [story.id] });
      if (!plan.length) {
        fail(`${label}: no free slot of type ${story.slots.join('+')}`);
        continue;
      }
      plan[0].outcome = outcome;
      plan[0].peak = (story.window[0] + story.window[1]) / 2;
      load(plan, evening);
      const m = show.moments[0];
      const shotAt = m.peak + m.dur / 2;
      play(0, shotAt);
      checkFinite(label);
      const r = shoot(m, shotAt, label);
      const want = m.caption('peak');
      if (r.caption !== want) fail(`${label}: expected "${want}" but scored "${r.caption}" (${r.kind}, ${r.score})`);
      else console.log(`  ✓ ${label.padEnd(28)} ${String(r.score).padStart(5)}  ${r.caption}`);
      // Play out the rest of the run too.
      for (let t = shotAt; t <= 20; t += 1 / 30) show.update(t, 1 / 30, t);
      scene.updateMatrixWorld(true);
      checkFinite(`${label} (end of run)`);
    } catch (e) {
      fail(`${label}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
    }
  }
}

// ── 1b. Crossovers: every throwing outcome onto every kind of target it can take ──
const TARGET_FOR = { hand: 'musician', head: 'proposal', mouth: 'frisbee' };
const throwers = stories.flatMap((s) => Object.entries(s.outcomes).filter(([, o]) => o.throws).map(([name, o]) => ({ story: s, outcome: name, throws: o.throws })));
if (throwers.length) console.log(`\nCrossovers (${throwers.length} throwing outcomes):`);
const ALL = (await import('../src/stories/registry.js')).STORIES;
for (const { story, outcome, throws } of throwers) {
  for (const kind of throws.kinds) {
    const targetId = TARGET_FOR[kind] === story.id ? 'cat' : TARGET_FOR[kind];
    const label = `${story.id}/${outcome} → ${targetId} (${kind})`;
    try {
      const evening = new Evening(11);
      setSunX(3.6);
      const plan = planEvening(evening, { stories: ALL, slots: SLOTS, only: [story.id, targetId] });
      if (plan.length < 2) {
        fail(`${label}: could not place both stories`);
        continue;
      }
      const [th, tg] = plan;
      th.outcome = outcome;
      th.peak = (story.window[0] + story.window[1]) / 2;
      tg.peak = th.peak + throws.lands + 2.5;
      th.cross = { target: tg };
      load(plan, evening);
      const c = show.moments.find((m) => m.id.includes('>'));
      if (!c) {
        fail(`${label}: no crossover moment (the target offers no ${kind})`);
        continue;
      }
      const shotAt = c.peak + 0.4;
      play(0, shotAt);
      checkFinite(label);
      const r = shoot(c, shotAt, label);
      const want = c.caption('peak');
      if (r.caption !== want) fail(`${label}: expected "${want}" but scored "${r.caption}" (${r.kind}, ${r.score})`);
      else console.log(`  ✓ ${label.padEnd(44)} ${String(r.score).padStart(5)}  ${r.caption}`);
      play(shotAt, 20, 1 / 30);
      checkFinite(`${label} (end of run)`);
    } catch (e) {
      fail(`${label}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
    }
  }
}

// ── 1c. Chain events: one story's aftermath ending up in another's place ──
const CHAINS = [
  { stories: ['bellRinger', 'rooftopKiss'], outcome: 'main', moment: 'bellRinger:roost' },
  { stories: ['balloonSeller', 'cranePiano'], outcome: 'main', moment: 'balloonSeller:crane' },
];
if (!filter && !batch) console.log('\nChain events:');
for (const chain of !filter && !batch ? CHAINS : []) {
  const label = chain.moment;
  try {
    const evening = new Evening(5);
    setSunX(3.6);
    const plan = planEvening(evening, { stories: ALL, slots: SLOTS, only: chain.stories });
    plan[0].outcome = chain.outcome;
    plan[0].peak = 5;
    plan[1].peak = 12;
    load(plan, evening);
    const c = show.moments.find((m) => m.id === chain.moment);
    if (!c) {
      fail(`${label}: no chain moment`);
      continue;
    }
    const shotAt = c.peak + 0.4;
    play(0, shotAt);
    checkFinite(label);
    const r = shoot(c, shotAt, label);
    const want = c.caption('peak');
    if (r.caption !== want) fail(`${label}: expected "${want}" but scored "${r.caption}" (${r.kind}, ${r.score})`);
    else console.log(`  ✓ ${label.padEnd(44)} ${String(r.score).padStart(5)}  ${r.caption}`);
  } catch (e) {
    fail(`${label}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
}

// ── 2. Whole evenings ──
if (!filter && !batch) {
  const EVENINGS = 300;
  const count = new Map();
  const sizes = [];
  let crossed = 0;
  for (let n = 1; n <= EVENINGS; n++) {
    try {
      const evening = new Evening(n);
      setSunX(evening.range(-5, 7));
      const plan = planEvening(evening, { stories: STORIES, slots: SLOTS });
      const slotIds = plan.flatMap((i) => i.slots.map((s) => s.id));
      if (new Set(slotIds).size !== slotIds.length) fail(`evening ${n}: a slot is used twice`);
      const peaks = plan.map((i) => i.peak).sort((a, b) => a - b);
      for (let i = 1; i < peaks.length; i++) if (peaks[i] - peaks[i - 1] < 0.55) fail(`evening ${n}: peaks ${peaks[i - 1].toFixed(2)} and ${peaks[i].toFixed(2)} too close`);
      if (!plan.some((i) => i.peak < 3.6)) fail(`evening ${n}: nothing happens in the first 3.6 s`);
      sizes.push(plan.length);
      for (const i of plan) count.set(i.story.id, (count.get(i.story.id) || 0) + 1);
      load(plan, evening);
      if (show.moments.some((m) => m.tags.includes('crossover'))) crossed++;
      for (let t = 0; t <= 20; t += 1 / 20) show.update(t, 1 / 20, t);
      scene.updateMatrixWorld(true);
      checkFinite(`evening ${n}`);
    } catch (e) {
      fail(`evening ${n}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
    }
  }
  const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  console.log(`\nEvenings (${EVENINGS}): ${Math.min(...sizes)}–${Math.max(...sizes)} stories, average ${avg.toFixed(1)}; ${((crossed / EVENINGS) * 100).toFixed(0)}% have a crossover or chain event`);
  const rows = [...count.entries()].sort((a, b) => b[1] - a[1]);
  console.log(rows.map(([id, c]) => `  ${id.padEnd(16)} ${((c / EVENINGS) * 100).toFixed(0).padStart(3)}%`).join('\n'));
  const never = STORIES.filter((s) => !count.has(s.id)).map((s) => s.id);
  if (never.length) fail(`never chosen in ${EVENINGS} evenings: ${never.join(', ')}`);
}

console.log(failures ? `\n${failures} problem(s).` : '\nAll good.');
process.exit(failures ? 1 : 0);
