import { screenBox, union } from '../game/Scoring.js';

/**
 * Development gallery: play one story (or a few) on their own, pick the outcome, scrub
 * time, and see the box the scoring uses as the story's focus.
 * Open with ?story=kite (or ?story=kite,crane&outcome=alt&peak=6).
 * Keys: Space play/pause · [ ] previous/next story · O next outcome · R restart.
 */
export function startGallery(api) {
  const { stage, show, stories, options } = api;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('app').classList.add('menu');

  const css = `
    #gallery { position: absolute; left: 12px; top: 12px; z-index: 10; padding: 10px 12px; width: 300px;
      background: rgba(251,243,228,0.94); border-radius: 6px; font: 13px system-ui, sans-serif; color: #2f2530;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25); cursor: default; }
    #gallery label { display: flex; gap: 6px; align-items: center; margin: 4px 0; }
    #gallery select, #gallery input[type=number] { flex: 1; font: inherit; }
    #gallery input[type=range] { flex: 1; }
    #gallery .row { display: flex; gap: 6px; margin-top: 6px; }
    #gallery button { font-size: 12px; padding: 4px 10px; box-shadow: none; }
    #gallery .info { margin-top: 6px; font-size: 12px; line-height: 1.35; white-space: pre-wrap; }
    #focus-box { position: absolute; border: 2px dashed #e2574c; pointer-events: none; z-index: 9; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'gallery';
  panel.innerHTML = `
    <strong>Story gallery</strong>
    <label>Story <select id="g-story"></select></label>
    <label>Outcome <select id="g-outcome"></select></label>
    <label>Peak at <input id="g-peak" type="number" step="0.5" min="0" max="20"></label>
    <label>Time <input id="g-time" type="range" min="0" max="20" step="0.01"></label>
    <div class="row"><button id="g-play" type="button">Pause</button><button id="g-restart" type="button">Restart</button><button id="g-slow" type="button">Speed 1×</button></div>
    <div class="info" id="g-info"></div>`;
  const app = document.getElementById('app');
  app.appendChild(panel);
  const box = document.createElement('div');
  box.id = 'focus-box';
  app.appendChild(box);
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());

  const $ = (id) => document.getElementById(id);
  const storySel = $('g-story');
  const outcomeSel = $('g-outcome');
  const peakIn = $('g-peak');
  const timeIn = $('g-time');
  for (const s of stories) storySel.add(new Option(`${s.id} (${s.slots.join('+')})`, s.id));

  let playing = true;
  let speed = 1;
  let last = performance.now();

  const current = () => stories.find((s) => s.id === storySel.value);
  const fillOutcomes = () => {
    outcomeSel.replaceChildren(...Object.keys(current().outcomes).map((o) => new Option(o, o)));
    if (options.outcome && current().outcomes[options.outcome]) outcomeSel.value = options.outcome;
  };
  const rebuild = (time = 0) => {
    options.only = [storySel.value];
    options.outcome = outcomeSel.value;
    options.peak = Number(peakIn.value);
    api.prepare(options);
    api.setTime(time);
  };

  storySel.value = options.only[0];
  fillOutcomes();
  peakIn.value = options.peak;
  storySel.onchange = () => {
    options.outcome = null;
    fillOutcomes();
    rebuild();
  };
  outcomeSel.onchange = () => rebuild();
  peakIn.onchange = () => rebuild();
  timeIn.oninput = () => {
    const v = Number(timeIn.value);
    // One-shot effects (puffs, hearts) only fire going forwards, so rebuild to scrub back.
    if (v < api.getTime()) rebuild(0);
    api.setTime(v);
  };
  $('g-play').onclick = () => {
    playing = !playing;
    $('g-play').textContent = playing ? 'Pause' : 'Play';
  };
  $('g-restart').onclick = () => rebuild(0);
  $('g-slow').onclick = () => {
    speed = speed === 1 ? 0.25 : 1;
    $('g-slow').textContent = `Speed ${speed}×`;
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') $('g-play').click();
    else if (e.key === 'r') rebuild(0);
    else if (e.key === 'o') {
      outcomeSel.selectedIndex = (outcomeSel.selectedIndex + 1) % outcomeSel.options.length;
      rebuild();
    } else if (e.key === '[' || e.key === ']') {
      const n = storySel.options.length;
      storySel.selectedIndex = (storySel.selectedIndex + (e.key === ']' ? 1 : n - 1)) % n;
      storySel.onchange();
    }
  });

  const tick = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      let t = api.getTime() + dt * speed;
      if (t > 20) {
        rebuild(0);
        t = 0;
      }
      api.setTime(t);
    }
    const t = api.getTime();
    timeIn.value = t;
    const m = show.moments[0];
    if (m) {
      const boxes = m.focus().map((o) => screenBox(o, stage.camera, stage.width, stage.height));
      const u = union(boxes);
      Object.assign(box.style, { left: `${u.x0}px`, top: `${u.y0}px`, width: `${u.x1 - u.x0}px`, height: `${u.y1 - u.y0}px` });
      const p = t - m.peak;
      const kind = p >= 0 && p <= m.dur ? 'peak' : p >= -0.5 && p < 0 ? 'near' : p > m.dur ? 'after' : 'idle';
      $('g-info').textContent = `t ${t.toFixed(2)} · p ${p.toFixed(2)} · ${kind}\n“${m.caption(kind)}”\ntags: ${m.tags.join(', ') || '—'}`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
