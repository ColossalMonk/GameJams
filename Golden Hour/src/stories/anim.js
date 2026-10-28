import * as THREE from 'three';

/** Small easing and timing helpers shared by every story. */

export const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** 0 → 1 as p goes from a to b. */
export const seg = (p, a, b) => clamp01((p - a) / (b - a));

export const smooth = (u) => u * u * (3 - 2 * u);

export const easeOut = (u) => 1 - (1 - u) * (1 - u);

export const easeIn = (u) => u * u;

export const lerp = THREE.MathUtils.lerp;

/** Height of a parabola that starts and ends at 0 and peaks at h when q = 0.5. */
export const arc = (q, h) => 4 * q * (1 - q) * h;

/** 1 inside [a, b] with soft edges of width e on both sides, 0 outside. */
export const window01 = (p, a, b, e = 0.2) => smooth(seg(p, a - e, a)) * (1 - smooth(seg(p, b, b + e)));

export const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
