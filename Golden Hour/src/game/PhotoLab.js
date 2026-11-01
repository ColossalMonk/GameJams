/**
 * Develops a viewfinder capture into an instant photo, with the 2D canvas API only.
 * Steps, in order:
 * - Base: the square is copied with a clamped-edge margin so blurs never pull in black.
 * - Motion blur: speed above 600 CSS px/s smears the image along dir, growing to 10 px
 *   (at the output size) by 1800 px/s. A still camera gives a sharp photo.
 * - Tilt-shift: zoom above 0.5 blurs the top and bottom bands through a vertical mask,
 *   keeping a sharp band through the middle; up to 6 px of blur at zoom 1.
 * - Instant-film look: a warm soft-light tint and a soft vignette.
 * - Late light: from t = 15.5 to 20 the photo washes toward warm white (screen wash that
 *   lifts the blacks, an additive warm push and a soft glow); clearly bleached at 19.5.
 * - Film character: a faint light leak on one corner and very light grain, both picked
 *   from a stable hash of t so each photo varies.
 * Canvases and the grain tile are made on first use and reused, so importing never
 * touches the DOM.
 */

const MARGIN = 24;
const MOTION = { start: 600, full: 1800, max: 10 };
const TILT = { start: 0.5, max: 6 };
const LATE = { start: 15.5, end: 20 };
const GRAIN_TILE = 128;
const GLOW_SIZE = 96;

const pool = new Map();
let filterSupport;
let grain = null;

/** A cached canvas, cleared and with its state reset. */
function surface(key, w, h) {
  let c = pool.get(key);
  if (!c) {
    c = document.createElement('canvas');
    pool.set(key, c);
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (canFilter(ctx)) ctx.filter = 'none';
  ctx.clearRect(0, 0, w, h);
  return { c, ctx };
}

/** ctx.filter is missing in some browsers (Safari); setting it there only makes an expando. */
function canFilter(ctx) {
  if (filterSupport === undefined) {
    filterSupport = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;
    if (filterSupport) {
      ctx.filter = 'blur(1px)';
      filterSupport = ctx.filter === 'blur(1px)';
      ctx.filter = 'none';
    }
  }
  return filterSupport;
}

/** Stable 0..1 hash of a time in seconds (to the millisecond). */
function hash(t) {
  let x = Math.round(t * 1000) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

/** Copy the square plus a margin, stretching the edge pixels where the margin falls off the canvas. */
function copyWithMargin(ctx, src, rect, ratio, size) {
  const W = size + 2 * MARGIN;
  const k = (rect.size * ratio) / size;
  const sx0 = rect.x * ratio - MARGIN * k;
  const sy0 = rect.y * ratio - MARGIN * k;
  const cx0 = Math.max(0, sx0);
  const cy0 = Math.max(0, sy0);
  const cx1 = Math.min(src.width, sx0 + W * k);
  const cy1 = Math.min(src.height, sy0 + W * k);
  if (cx1 <= cx0 || cy1 <= cy0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, W);
    return;
  }
  const dx0 = (cx0 - sx0) / k;
  const dy0 = (cy0 - sy0) / k;
  const dx1 = (cx1 - sx0) / k;
  const dy1 = (cy1 - sy0) / k;
  ctx.drawImage(src, cx0, cy0, cx1 - cx0, cy1 - cy0, dx0, dy0, dx1 - dx0, dy1 - dy0);
  const c = ctx.canvas;
  const l = Math.ceil(dx0);
  const r = Math.floor(dx1);
  const t = Math.ceil(dy0);
  const b = Math.floor(dy1);
  if (l > 0) ctx.drawImage(c, l, 0, 1, W, 0, 0, l, W);
  if (r < W) ctx.drawImage(c, r - 1, 0, 1, W, r, 0, W - r, W);
  if (t > 0) ctx.drawImage(c, 0, t, W, 1, 0, 0, W, t);
  if (b < W) ctx.drawImage(c, 0, b - 1, W, 1, 0, b, W, W - b);
}

/** Gaussian blur with ctx.filter, or a downscale and smooth upscale where that is missing. */
function blurInto(dst, src, px) {
  const W = src.width;
  if (canFilter(dst.ctx)) {
    dst.ctx.filter = `blur(${px.toFixed(2)}px)`;
    dst.ctx.drawImage(src, 0, 0);
    dst.ctx.filter = 'none';
    return;
  }
  const w = Math.max(8, Math.round(W / Math.max(1.5, px * 0.8)));
  const down = surface('down', W, W);
  down.ctx.drawImage(src, 0, 0, w, w);
  dst.ctx.drawImage(down.c, 0, 0, w, w, 0, 0, W, W);
}

function grainPattern(ctx) {
  if (!grain) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = GRAIN_TILE;
    const tctx = tile.getContext('2d');
    const img = tctx.createImageData(GRAIN_TILE, GRAIN_TILE);
    let seed = 0x9e3779b9;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const v = 128 + (((seed >>> 24) - 128) * 0.9);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    grain = { tile, ctx: null, pattern: null };
  }
  if (grain.ctx !== ctx) {
    grain.ctx = ctx;
    grain.pattern = ctx.createPattern(grain.tile, 'repeat');
  }
  return grain.pattern;
}

function motionBlur(src, amount, ux, uy) {
  const W = src.width;
  const b = surface('motion', W, W);
  b.ctx.drawImage(src, 0, 0);
  // Running average: each tap weighs the same as the sharp copy underneath.
  const n = Math.min(8, Math.max(3, Math.ceil(amount / 1.5)));
  for (let i = 0; i < n; i++) {
    const o = (i / (n - 1) - 0.5) * amount;
    b.ctx.globalAlpha = 1 / (i + 2);
    b.ctx.drawImage(src, o * ux, o * uy);
  }
  return b.c;
}

function tiltShift(ctx, src, blur, size) {
  const W = src.width;
  const m = surface('tilt', W, W);
  blurInto(m, src, blur);
  m.ctx.globalCompositeOperation = 'destination-in';
  const g = m.ctx.createLinearGradient(0, MARGIN, 0, MARGIN + size);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.18, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.38, 'rgba(0,0,0,0)');
  g.addColorStop(0.62, 'rgba(0,0,0,0)');
  g.addColorStop(0.82, 'rgba(0,0,0,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  m.ctx.fillStyle = g;
  m.ctx.fillRect(0, 0, W, W);
  ctx.drawImage(m.c, MARGIN, MARGIN, size, size, 0, 0, size, size);
}

function filmLook(ctx, size) {
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(255, 196, 120, 0.35)';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'multiply';
  const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.75);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(1, 'rgba(150,120,110,1)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
}

function lateLight(ctx, canvas, e, size) {
  const glow = surface('glow', GLOW_SIZE, GLOW_SIZE);
  if (canFilter(glow.ctx)) glow.ctx.filter = 'blur(2px)';
  glow.ctx.drawImage(canvas, 0, 0, GLOW_SIZE, GLOW_SIZE);
  if (canFilter(glow.ctx)) glow.ctx.filter = 'none';
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.5 * e;
  ctx.drawImage(glow.c, 0, 0, size, size);
  // Screen lifts the blacks toward the wash colour and leaves whites alone.
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(255, 232, 196, ${0.55 * e})`;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(48, 34, 18, ${e})`;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
}

function lightLeak(ctx, t, size) {
  const corner = Math.floor(hash(t) * 4) % 4;
  const x = corner & 1 ? size : 0;
  const y = corner & 2 ? size : 0;
  const s = 0.14 + 0.1 * hash(t + 1.7);
  const r = size * (0.45 + 0.25 * hash(t + 3.1));
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255, 110, 50, ${s})`);
  g.addColorStop(0.45, `rgba(255, 170, 90, ${s * 0.4})`);
  g.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
}

function filmGrain(ctx, t, size) {
  const ox = Math.floor(hash(t + 5.3) * GRAIN_TILE);
  const oy = Math.floor(hash(t + 7.9) * GRAIN_TILE);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.07;
  ctx.translate(-ox, -oy);
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(ox, oy, size, size);
  ctx.restore();
}

/**
 * src: the WebGL canvas (already rendered this frame)
 * rect: { x, y, size } viewfinder square in CSS pixels
 * opts: { ratio, zoom 0..1, speed CSS px/s, dir unit vector, t seconds, size = 512 }
 * Returns a JPEG data URL.
 */
export function develop(src, rect, opts = {}) {
  const { ratio = 1, zoom = 0, speed = 0, dir = { x: 0, y: 0 }, t = 0, size = 512 } = opts;
  const W = size + 2 * MARGIN;
  const base = surface('base', W, W);
  copyWithMargin(base.ctx, src, rect, ratio, size);
  let img = base.c;

  const smear = Math.min(MOTION.max, (MOTION.max * (speed - MOTION.start)) / (MOTION.full - MOTION.start));
  const dl = Math.hypot(dir.x || 0, dir.y || 0);
  if (smear > 0.5 && dl > 0) img = motionBlur(img, smear, dir.x / dl, dir.y / dl);

  const out = surface('out', size, size);
  const ctx = out.ctx;
  ctx.drawImage(img, MARGIN, MARGIN, size, size, 0, 0, size, size);

  const blur = TILT.max * clamp01((zoom - TILT.start) / (1 - TILT.start));
  if (blur > 0.4) tiltShift(ctx, img, blur, size);

  filmLook(ctx, size);

  const e = Math.pow(clamp01((t - LATE.start) / (LATE.end - LATE.start)), 1.4);
  if (e > 0.01) lateLight(ctx, out.c, e, size);

  lightLeak(ctx, t, size);
  filmGrain(ctx, t, size);
  return out.c.toDataURL('image/jpeg', 0.9);
}
