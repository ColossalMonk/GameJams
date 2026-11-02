import { screenBox, union } from '../game/Scoring.js';
import { PUPPET_FPS, VIEWFINDER } from '../config.js';

/**
 * Press kit (dev server only): renders real evenings at high resolution and saves the itch
 * cover, screenshots, banner and GIF frames into press/ (vite.config.js receives them).
 * Open the dev server with ?press=1, then drive it from the console:
 *
 *   await __press.moments(17)                         tonight's stories and peak times
 *   await __press.cover(10, 10.5, 1000, { title: 'top-left' })   press/cover.png (630×500) and cover@2x.png,
 *                                                    cropped around x = 1000 (or a story id)
 *   await __press.screenshot('shot-1', 17, 9.9, 'train')   1920×1080 with the viewfinder on it
 *   await __press.albumShot('shot-album', 17)         five shots at the evening's peaks, as the album
 *   await __press.banner(17, 14)                      press/banner.png (960×300) for the itch page
 *   await __press.clip('clip', 17, 6, 12)             press/clip-000.png … for ffmpeg
 */
const W = 960;
const H = 540;
const RATIO = 2;
const STEP = 1 / PUPPET_FPS;

export function startPress(api) {
  const { stage } = api;
  document.getElementById('title').classList.add('hidden');
  const app = document.getElementById('app');
  app.style.width = `${W}px`;
  app.style.height = `${H}px`;
  stage.adapt = () => {};
  stage.ratio = RATIO;
  stage.renderer.setPixelRatio(RATIO);
  stage.resize();

  const frames = (n) => new Promise((done) => {
    const tick = () => (--n <= 0 ? done() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });

  /** Tonight's evening n played from the start up to time t, then rendered. */
  async function scene(n, t) {
    api.prepare(n);
    api.particles.clear();
    for (let s = 0; s <= t; s += STEP) {
      api.setTime(s);
      api.show.update(s, STEP, s);
      api.particles.update(STEP);
    }
    api.setTime(t);
    await frames(12);
  }

  /** Render now and copy the frame (the WebGL buffer is only readable right after a render). */
  function grab() {
    stage.renderer.shadowMap.needsUpdate = true;
    stage.render(0);
    const src = stage.renderer.domElement;
    const c = canvas(src.width, src.height);
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }

  function moment(id) {
    const m = api.show.moments.find((q) => q.instance && (q.story.id === id || q.id === id));
    if (!m) throw new Error(`no ${id} tonight`);
    return m;
  }

  /** The square a player would frame around a moment, in CSS pixels. */
  function frameFor(m, pad = 60) {
    const u = union(m.focus().map((o) => screenBox(o, stage.camera, W, H)));
    const size = Math.min(H, Math.max(VIEWFINDER.min * H, Math.max(u.x1 - u.x0, u.y1 - u.y0) + pad));
    const cx = (u.x0 + u.x1) / 2;
    const cy = (u.y0 + u.y1) / 2;
    return { x: Math.min(Math.max(cx - size / 2, 0), W - size), y: Math.min(Math.max(cy - size / 2, 0), H - size), size, cx, cy };
  }

  async function save(name, c) {
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const res = await fetch(`/__press/${name}.png`, { method: 'POST', body: blob });
    if (!res.ok) throw new Error(`saving ${name}: ${res.status}`);
    return `press/${name}.png ${c.width}×${c.height}`;
  }

  async function moments(n) {
    await scene(n, 0);
    return api.show.moments
      .filter((m) => m.instance)
      .map((m) => `${m.story.id}/${m.variant ?? ''} peak ${m.peak?.toFixed?.(1)}${m.rare ? ' rare' : ''}`)
      .concat(`season ${api.evening().season ?? ''}`);
  }

  async function cover(n, t, focus, { title = 'left' } = {}) {
    await scene(n, t);
    const shot = grab();
    // 630×500 crop of the 16:9 frame, centred on the story (or the middle).
    const fx = typeof focus === 'number' ? focus : focus ? frameFor(moment(focus)).cx * RATIO : shot.width / 2;
    const cw = Math.round(shot.height * (630 / 500));
    const x = Math.min(Math.max(fx - cw / 2, 0), shot.width - cw);
    const big = canvas(1260, 1000);
    const ctx = big.getContext('2d');
    ctx.drawImage(shot, x, 0, cw, shot.height, 0, 0, 1260, 1000);
    await titleCard(ctx, 1260, 1000, title);
    const small = canvas(630, 500);
    small.getContext('2d').drawImage(big, 0, 0, 630, 500);
    return [await save('cover@2x', big), await save('cover', small)];
  }

  async function screenshot(name, n, t, focus) {
    await scene(n, t);
    const shot = grab();
    if (focus) viewfinder(shot.getContext('2d'), frameFor(moment(focus)));
    return save(name, shot);
  }

  /** Five photos of the evening's peaks, developed and scored like the game does, as the album. */
  async function albumShot(name, n, ids) {
    await scene(n, 0);
    const picks = (ids ? ids.map(moment) : api.show.moments.filter((m) => m.instance))
      .sort((a, b) => a.peak - b.peak)
      .slice(0, 5);
    const photos = [];
    for (const m of picks) {
      await scene(n, m.peak);
      const pick = moment(m.story.id);
      const rect = frameFor(pick);
      stage.renderer.shadowMap.needsUpdate = true;
      stage.render(0);
      const zoom = Math.log(VIEWFINDER.max / (rect.size / H)) / Math.log(VIEWFINDER.max / VIEWFINDER.min);
      const dataUrl = api.develop(stage.renderer.domElement, rect, { ratio: RATIO, zoom: Math.max(0, zoom), t: m.peak, size: 512 });
      photos.push({ dataUrl, ...api.scorePhoto({ t: m.peak, rect, stage, cast: api.show }), t: m.peak });
    }
    const total = photos.reduce((s, p) => s + p.score, 0);
    api.album.show(photos, total, {
      evening: n,
      request: '',
      fulfilled: false,
      bonus: 0,
      epilogue: '',
      share: '',
      journal: { pages: [], seen: 0, total: 0, fresh: 0 },
    });
    api.album.hide();
    const page = await api.album.image();
    // On a warm desk, 1920×1080.
    const out = canvas(1920, 1080);
    const ctx = out.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, '#3a2a35');
    g.addColorStop(1, '#5a3a3a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1920, 1080);
    const s = Math.min(1800 / page.width, 900 / page.height);
    const pw = page.width * s;
    const ph = page.height * s;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    ctx.drawImage(page, (1920 - pw) / 2, (1080 - ph) / 2, pw, ph);
    ctx.restore();
    return [await save(name, out), photos.map((p) => `${p.score} ${p.caption} [${(p.labels ?? []).join(', ')}]`)];
  }

  async function banner(n, t, focusY = 0.45) {
    await scene(n, t);
    const shot = grab();
    const out = canvas(1920, 600);
    const ctx = out.getContext('2d');
    const y = Math.min(Math.max(shot.height * focusY - 300, 0), shot.height - 600);
    ctx.drawImage(shot, 0, y, 1920, 600, 0, 0, 1920, 600);
    await titleCard(ctx, 1920, 600, 'banner');
    const small = canvas(960, 300);
    small.getContext('2d').drawImage(out, 0, 0, 960, 300);
    return [await save('banner@2x', out), await save('banner', small)];
  }

  /**
   * Frames for an animated GIF: from..to seconds at 12 fps, 960×540, the viewfinder
   * following a story if one is given. Join them with ffmpeg (see ITCH.md).
   */
  async function clip(name, n, from, to, focus) {
    await scene(n, from);
    let i = 0;
    for (let s = from; s <= to; s += STEP, i++) {
      api.setTime(s);
      api.show.update(s, STEP, s);
      api.particles.update(STEP);
      await frames(2);
      const shot = grab();
      const out = canvas(W, H);
      const ctx = out.getContext('2d');
      ctx.drawImage(shot, 0, 0, W, H);
      if (focus) viewfinder(ctx, frameFor(moment(focus)), 1);
      await save(`${name}-${String(i).padStart(3, '0')}`, out);
    }
    return `${i} frames`;
  }

  /** The cream paper title card from the game's title screen. */
  async function titleCard(ctx, w, h, where) {
    await Promise.all([document.fonts.load('600 120px Fraunces'), document.fonts.load('700 60px Caveat')]);
    const k = where === 'banner' ? h / 600 : w / 1260;
    const titleSize = (where === 'banner' ? 150 : 100) * k;
    const handSize = (where === 'banner' ? 52 : 40) * k;
    ctx.font = `600 ${titleSize}px Fraunces`;
    const tw = ctx.measureText('Golden Hour').width;
    const cw = tw + 80 * k;
    const ch = titleSize + handSize + 64 * k;
    const cx = where === 'banner' ? (w - cw) / 2 : where.endsWith('right') ? w - cw - 44 * k : 44 * k;
    const cy = where === 'banner' ? (h - ch) / 2 : where.startsWith('top') ? 44 * k : h - ch - 44 * k;
    ctx.save();
    ctx.translate(cx + cw / 2, cy + ch / 2);
    ctx.rotate((where === 'banner' ? -1 : -2) * (Math.PI / 180));
    ctx.translate(-cw / 2, -ch / 2);
    ctx.shadowColor = 'rgba(40, 20, 30, 0.45)';
    ctx.shadowBlur = 30 * k;
    ctx.shadowOffsetY = 14 * k;
    ctx.fillStyle = '#fbf3e4';
    roughRect(ctx, 0, 0, cw, ch, 6 * k);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#efe2c8';
    ctx.fillRect(0, ch - 5 * k, cw, 5 * k);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d9644a';
    ctx.font = `600 ${titleSize}px Fraunces`;
    ctx.fillText('Golden Hour', cw / 2, 24 * k + titleSize * 0.82);
    ctx.fillStyle = '#2f2530';
    ctx.font = `700 ${handSize}px Caveat`;
    ctx.fillText('20 seconds · 5 shots · one last sunset', cw / 2, 24 * k + titleSize + handSize * 0.85);
    ctx.restore();
  }

  window.__press = { moments, cover, screenshot, albumShot, banner, clip, scene, grab, save };
  console.info('press tool ready: __press');
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** A card with slightly uneven, hand-cut edges. */
function roughRect(ctx, x, y, w, h, wobble) {
  const jitter = (i) => Math.sin(i * 12.9898) * wobble * 0.5;
  ctx.beginPath();
  ctx.moveTo(x + jitter(1), y + jitter(2));
  ctx.lineTo(x + w * 0.5, y + jitter(3));
  ctx.lineTo(x + w + jitter(4), y + jitter(5));
  ctx.lineTo(x + w + jitter(6), y + h * 0.5);
  ctx.lineTo(x + w + jitter(7), y + h + jitter(8));
  ctx.lineTo(x + w * 0.5, y + h + jitter(9));
  ctx.lineTo(x + jitter(10), y + h + jitter(11));
  ctx.lineTo(x + jitter(12), y + h * 0.5);
  ctx.closePath();
}

/** The game's viewfinder corners and cross, drawn onto a frame (r in CSS pixels). */
function viewfinder(ctx, r, ratio = RATIO) {
  const s = r.size * ratio;
  const x = r.x * ratio;
  const y = r.y * ratio;
  const c = s * 0.18;
  const lw = 3 * ratio;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = lw;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 2 * ratio;
  const o = lw / 2;
  for (const [ax, ay, dx, dy] of [[x + o, y + o, 1, 1], [x + s - o, y + o, -1, 1], [x + o, y + s - o, 1, -1], [x + s - o, y + s - o, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(ax + dx * c, ay);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax, ay + dy * c);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2 * ratio;
  const m = 7 * ratio;
  ctx.beginPath();
  ctx.moveTo(x + s / 2 - m, y + s / 2);
  ctx.lineTo(x + s / 2 + m, y + s / 2);
  ctx.moveTo(x + s / 2, y + s / 2 - m);
  ctx.lineTo(x + s / 2, y + s / 2 + m);
  ctx.stroke();
  ctx.restore();
}
