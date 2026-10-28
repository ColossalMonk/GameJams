import * as THREE from 'three';
import { GAME_LENGTH, GROUP_WAVE } from '../config.js';
import { sunCentre, sunRadius } from '../world/Sky.js';

const box = new THREE.Box3();
const corner = new THREE.Vector3();

/** Screen-space bounding rectangle (CSS px) of an object, from its 3D bounding box. */
export function screenBox(object, camera, w, h) {
  box.setFromObject(object);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
    corner.project(camera);
    const sx = ((corner.x + 1) / 2) * w;
    const sy = ((1 - corner.y) / 2) * h;
    x0 = Math.min(x0, sx);
    y0 = Math.min(y0, sy);
    x1 = Math.max(x1, sx);
    y1 = Math.max(y1, sy);
  }
  return { x0, y0, x1, y1 };
}

/** Fraction of b that lies inside frame. */
function coverage(b, f) {
  const iw = Math.max(0, Math.min(b.x1, f.x1) - Math.max(b.x0, f.x0));
  const ih = Math.max(0, Math.min(b.y1, f.y1) - Math.max(b.y0, f.y0));
  const area = Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0));
  return (iw * ih) / area;
}

export function union(boxes) {
  return boxes.reduce((u, b) => ({
    x0: Math.min(u.x0, b.x0),
    y0: Math.min(u.y0, b.y0),
    x1: Math.max(u.x1, b.x1),
    y1: Math.max(u.y1, b.y1),
  }));
}

/** Small bonus for a subject sitting on a rule-of-thirds line. */
function thirds(b, f, size) {
  const u = ((b.x0 + b.x1) / 2 - f.x0) / size;
  return Math.abs(u - 1 / 3) < 0.08 || Math.abs(u - 2 / 3) < 0.08 ? 40 : 0;
}

const KIND_POINTS = { peak: 500, near: 160, after: 90, idle: 60 };

/** Rare moments (balloon, paper plane, fireworks) are worth more. */
const RARE_BONUS = 1.5;

/**
 * Score a photo from what was inside the viewfinder at the moment it was taken.
 * Returns { score, caption, kind, tags, people, sunInside, rare }; the extra fields are what
 * the evening's request checks.
 */
export function scorePhoto({ t, rect, stage, cast }) {
  const camera = stage.camera;
  const w = stage.width;
  const h = stage.height;
  const f = { x0: rect.x, y0: rect.y, x1: rect.x + rect.size, y1: rect.y + rect.size };
  const candidates = [];
  const tags = new Set();
  let rare = false;
  let points = 0;

  for (const m of cast.moments) {
    if (!m.active || (m.visible && !m.visible(t - m.peak))) continue;
    const boxes = m.focus().map((o) => screenBox(o, camera, w, h));
    if (!boxes.every((b) => coverage(b, f) >= 0.7)) continue;
    const u = union(boxes);
    const fill = Math.max(u.x1 - u.x0, u.y1 - u.y0) / rect.size;
    const framing = 0.5 + 0.5 * Math.min(1, fill / 0.55);
    const p = t - m.peak;
    let kind = 'idle';
    if (p >= 0 && p <= m.dur) kind = 'peak';
    else if (p >= -0.5 && p < 0) kind = 'near';
    else if (p > m.dur) kind = 'after';
    let pts = KIND_POINTS[kind] * framing + thirds(u, f, rect.size);
    if (m.rare) {
      pts *= RARE_BONUS;
      rare = true;
    }
    if (kind === 'peak' || kind === 'after') for (const tag of m.tags) tags.add(tag);
    points += pts;
    candidates.push({ pts, caption: m.caption(kind), kind });
  }

  const people = cast.people.filter((person) => coverage(screenBox(person.object, camera, w, h), f) >= 0.7).length;
  if (t >= GROUP_WAVE.start && t <= GROUP_WAVE.end) {
    if (people >= 2) {
      tags.add('joy');
      const pts = 120 * people;
      points += pts;
      candidates.push({
        pts,
        caption: people >= 4 ? 'Everyone on Elm Street, waving goodbye.' : 'Waving goodbye to the sun.',
        kind: 'peak',
      });
    }
  }

  // The sun: overlapping the frame is nice, having it right in the shot is nicer.
  const c = sunCentre(t);
  const edge = c.clone().add(new THREE.Vector3(sunRadius(t), 0, 0));
  c.project(camera);
  edge.project(camera);
  const sx = ((c.x + 1) / 2) * w;
  const sy = ((1 - c.y) / 2) * h;
  const sr = Math.abs(((edge.x + 1) / 2) * w - sx);
  const nearestX = Math.min(Math.max(sx, f.x0), f.x1);
  const nearestY = Math.min(Math.max(sy, f.y0), f.y1);
  const sunOverlaps = Math.hypot(sx - nearestX, sy - nearestY) < sr;
  const sunInside = sx > f.x0 && sx < f.x1 && sy > f.y0 && sy < f.y1;
  if (sunOverlaps) points += 80;
  if (sunInside) points += 60;

  const light = 1 + 1.5 * Math.pow(Math.min(t, GAME_LENGTH) / GAME_LENGTH, 1.6);
  const score = Math.round(points * light);

  candidates.sort((a, b) => b.pts - a.pts);
  let caption = '…something happened here.';
  let kind = 'miss';
  if (candidates.length) ({ caption, kind } = candidates[0]);
  else if (sunInside || sunOverlaps) {
    caption = t > 15 ? 'The sun, filling the whole sky.' : 'The sun, closer than ever.';
    kind = 'sun';
  }
  return { score, caption, kind, tags: [...tags], people, sunInside, rare };
}
