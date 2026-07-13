// ===================================================================
// render.js — everything that draws to the canvas
// ===================================================================

const stage = document.getElementById('stage');
const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
let cell, gridPxW, gridPxH;

function resize() {
  const availW = stage.clientWidth - 16;
  const availH = stage.clientHeight - 16;
  cell = Math.floor(Math.min(availW / COLS, availH / ROWS));
  gridPxW = cell * COLS; gridPxH = cell * ROWS;
  canvas.width = gridPxW; canvas.height = gridPxH;
  canvas.style.width = gridPxW + 'px';
  canvas.style.height = gridPxH + 'px';
}
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

let particles = [];
function spawnParticles(r, c, node) {
  const cx = c * cell + cell / 2, cy = r * cell + cell / 2;
  const col = node.colorIdx >= 0 ? COLORS[node.colorIdx].c : '#FFE066';
  for (let i = 0; i < 14; i++) {
    const ang = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 3.2;
    particles.push({
      x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 1.6,
      life: 1, color: col, spin: Math.random() * Math.PI,
    });
  }
}

function floatScoreAt(r, c, text, chainLen) {
  const el = document.createElement('div');
  el.className = 'floatScore';
  el.textContent = text;
  el.style.left = (canvas.offsetLeft + c * cell + cell / 2 - 20) + 'px';
  el.style.top = (canvas.offsetTop + r * cell) + 'px';
  el.style.fontSize = (14 + Math.min(chainLen, 8) * 2) + 'px';
  el.style.color = chainLen > 4 ? '#FFE066' : '#fff';
  document.getElementById('floatScores').appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function drawBackdrop() {
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(74,59,107,0.05)';
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cell, 0); ctx.lineTo(c * cell, gridPxH); ctx.stroke(); }
  for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * cell); ctx.lineTo(gridPxW, r * cell); ctx.stroke(); }
}

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawFace(baseR, t, wobble) {
  const blink = Math.sin(t / 600 + wobble * 3) > 0.965;
  const eyeOff = baseR * 0.34, eyeR = Math.max(2.2, baseR * 0.22);
  ctx.fillStyle = '#3A2E52';
  if (!blink) {
    ctx.beginPath(); ctx.arc(-eyeOff, -eyeOff * 0.25, eyeR, 0, Math.PI * 2); ctx.arc(eyeOff, -eyeOff * 0.25, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeOff + eyeR * 0.35, -eyeOff * 0.25 - eyeR * 0.35, eyeR * 0.32, 0, Math.PI * 2);
    ctx.arc(eyeOff + eyeR * 0.35, -eyeOff * 0.25 - eyeR * 0.35, eyeR * 0.32, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = '#3A2E52'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-eyeOff - 4, -eyeOff * 0.25); ctx.lineTo(-eyeOff + 4, -eyeOff * 0.25);
    ctx.moveTo(eyeOff - 4, -eyeOff * 0.25); ctx.lineTo(eyeOff + 4, -eyeOff * 0.25);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3A2E52'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, baseR * 0.14, baseR * 0.32, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}

function drawNormalCritter(node, baseR, t) {
  const col = COLORS[node.colorIdx];
  ctx.fillStyle = col.c;
  ctx.strokeStyle = col.d;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, baseR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-baseR * 0.32, -baseR * 0.42, baseR * 0.34, baseR * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();

  const blushR = baseR * 0.17;
  ctx.fillStyle = 'rgba(255,120,120,0.35)';
  ctx.beginPath(); ctx.ellipse(-baseR * 0.52, baseR * 0.12, blushR, blushR * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(baseR * 0.52, baseR * 0.12, blushR, blushR * 0.7, 0, 0, Math.PI * 2); ctx.fill();

  drawFace(baseR, t, node.wobble);
}

function drawPowerCritter(node, baseR, t) {
  const conf = POWER_UPS[node.power];
  const spin = t / 700;

  // rotating ring of colors
  ctx.save();
  ctx.rotate(spin);
  const segs = conf.ring.length;
  for (let i = 0; i < segs; i++) {
    ctx.beginPath();
    ctx.fillStyle = conf.ring[i];
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, baseR, (i / segs) * Math.PI * 2, ((i + 1) / segs) * Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // core
  ctx.beginPath();
  ctx.arc(0, 0, baseR * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = conf.core;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = node.power === 'bomb' ? '#FFF3B0' : '#5A4A80';
  ctx.font = `${Math.round(baseR * 0.85)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const icon = node.power === 'rainbow' ? '✨' : node.power === 'bomb' ? '💣' : '⭐';
  ctx.fillText(icon, 0, baseR * 0.05);

  drawFace(baseR * 0.62, t, node.wobble);
}

function drawNode(r, c, node, t) {
  const cx = c * cell + cell / 2, cy = r * cell + cell / 2;
  const age = t - node.spawnT;
  let spawnScale = 1;
  if (age < 260) spawnScale = Math.max(0, easeOutBack(Math.min(1, age / 260)));
  const bob = Math.sin(t / 420 + node.wobble) * 2.2;
  const wiggle = Math.sin(t / 900 + node.wobble) * 0.05;
  const baseR = cell * 0.5 * 0.86 * (node.power ? 0.95 : SIZES[node.sizeIdx].scale);
  const popPulse = node.popping ? 1.3 : 1;

  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.rotate(wiggle);
  ctx.scale(spawnScale * popPulse, spawnScale * popPulse);

  // soft shadow
  ctx.beginPath();
  ctx.ellipse(0, baseR * 0.78, baseR * 0.7, baseR * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(74,59,107,0.12)';
  ctx.fill();

  if (node.power) drawPowerCritter(node, baseR, t);
  else drawNormalCritter(node, baseR, t);

  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.032; p.spin += 0.2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y); ctx.rotate(p.spin);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -4); ctx.lineTo(3, 0); ctx.lineTo(0, 4); ctx.lineTo(-3, 0); ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  ctx.globalAlpha = 1;
  particles = particles.filter(p => p.life > 0);
}
