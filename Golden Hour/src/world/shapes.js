import * as THREE from 'three';

/** Axis-aligned rectangle with its bottom-left corner at (x, y). */
export function rect(x, y, w, h) {
  const s = new THREE.Shape();
  s.moveTo(x, y);
  s.lineTo(x + w, y);
  s.lineTo(x + w, y + h);
  s.lineTo(x, y + h);
  s.closePath();
  return s;
}

/** Rectangle with rounded corners, bottom-left at (x, y). */
export function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function circle(cx, cy, r) {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return s;
}

export function ellipse(cx, cy, rx, ry, rotation = 0) {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, rotation);
  return s;
}

/** Closed polygon from a flat list of [x, y] pairs. */
export function poly(points) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  return s;
}

/**
 * A limb: a capsule of width w hanging straight down from the origin, so it rotates
 * around its top end like a paper-fastener joint.
 */
export function limb(w, len) {
  return roundRect(-w / 2, -len, w, len, w / 2);
}

export function heart(size) {
  const s = new THREE.Shape();
  const k = size;
  s.moveTo(0, -0.9 * k);
  s.bezierCurveTo(-0.2 * k, -0.6 * k, -1.0 * k, -0.2 * k, -0.9 * k, 0.3 * k);
  s.bezierCurveTo(-0.8 * k, 0.8 * k, -0.15 * k, 0.85 * k, 0, 0.35 * k);
  s.bezierCurveTo(0.15 * k, 0.85 * k, 0.8 * k, 0.8 * k, 0.9 * k, 0.3 * k);
  s.bezierCurveTo(1.0 * k, -0.2 * k, 0.2 * k, -0.6 * k, 0, -0.9 * k);
  return s;
}

/** A soft cloud-like blob made of overlapping bumps along a base line. */
export function cloud(w, h) {
  const s = new THREE.Shape();
  const bumps = 4;
  s.moveTo(-w / 2, 0);
  for (let i = 0; i < bumps; i++) {
    const x0 = -w / 2 + (w / bumps) * i;
    const x1 = x0 + w / bumps;
    const peak = h * (0.55 + 0.45 * Math.sin((i + 0.5) / bumps * Math.PI));
    s.bezierCurveTo(x0, peak, x1, peak, x1, 0);
  }
  s.closePath();
  return s;
}

/**
 * A hill outline from a height function, sampled across [x0, x1] and closed down to y = 0.
 */
export function hill(x0, x1, heightAt, steps = 40) {
  const s = new THREE.Shape();
  s.moveTo(x0, 0);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    s.lineTo(x, heightAt(x));
  }
  s.lineTo(x1, 0);
  s.closePath();
  return s;
}

/** A flame / teardrop with its base at the origin. */
export function teardrop(w, h) {
  const s = new THREE.Shape();
  s.moveTo(0, h);
  s.bezierCurveTo(w * 0.6, h * 0.45, w * 0.6, 0, 0, 0);
  s.bezierCurveTo(-w * 0.6, 0, -w * 0.6, h * 0.45, 0, h);
  return s;
}
