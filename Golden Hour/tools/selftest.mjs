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
 * and broken positions.
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
      const dt = 1 / 60;
      for (let t = 0; t <= shotAt; t += dt) {
        show.update(t, dt, t);
        particles.update(dt);
      }
      scene.updateMatrixWorld(true);
      checkFinite(label);
      const u = union(m.focus().map((o) => screenBox(o, camera, W, H)));
      if (u.x1 - u.x0 > W * 0.9 || u.y1 - u.y0 > H * 0.9) fail(`${label}: focus is bigger than the screen (${Math.round(u.x1 - u.x0)}×${Math.round(u.y1 - u.y0)})`);
      if (u.x1 < 0 || u.x0 > W || u.y1 < 0 || u.y0 > H) fail(`${label}: focus is off screen at the peak`);
      const size = Math.min(H, Math.max(u.x1 - u.x0, u.y1 - u.y0) + 60);
      const cx = (u.x0 + u.x1) / 2;
      const cy = (u.y0 + u.y1) / 2;
      const rect = { x: Math.min(Math.max(cx - size / 2, 0), W - size), y: Math.min(Math.max(cy - size / 2, 0), H - size), size };
      const r = scorePhoto({ t: shotAt, rect, stage, cast: show });
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

// ── 2. Whole evenings ──
if (!filter && !batch) {
  const EVENINGS = 300;
  const count = new Map();
  const sizes = [];
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
      for (let t = 0; t <= 20; t += 1 / 20) show.update(t, 1 / 20, t);
      scene.updateMatrixWorld(true);
      checkFinite(`evening ${n}`);
    } catch (e) {
      fail(`evening ${n}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
    }
  }
  const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  console.log(`\nEvenings (${EVENINGS}): ${Math.min(...sizes)}–${Math.max(...sizes)} stories, average ${avg.toFixed(1)}`);
  const rows = [...count.entries()].sort((a, b) => b[1] - a[1]);
  console.log(rows.map(([id, c]) => `  ${id.padEnd(16)} ${((c / EVENINGS) * 100).toFixed(0).padStart(3)}%`).join('\n'));
  const never = STORIES.filter((s) => !count.has(s.id)).map((s) => s.id);
  if (never.length) fail(`never chosen in ${EVENINGS} evenings: ${never.join(', ')}`);
}

console.log(failures ? `\n${failures} problem(s).` : '\nAll good.');
process.exit(failures ? 1 : 0);
