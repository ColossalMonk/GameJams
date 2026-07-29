import * as THREE from 'three';

function canvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** A mottled ground texture: patchy grass tones + dirt fleck noise, to break up flat color fills. */
export function groundTexture(baseHex, patchHex, size = 128) {
  const tex = canvasTexture((ctx, s) => {
    const base = new THREE.Color(baseHex);
    const patch = new THREE.Color(patchHex);
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, s, s);

    for (let i = 0; i < 26; i++) {
      const r = 6 + Math.random() * 16;
      const x = Math.random() * s;
      const y = Math.random() * s;
      const t = Math.random();
      const c = base.clone().lerp(patch, t);
      ctx.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},0.5)`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 500; i++) {
      const shade = Math.random() > 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,';
      ctx.fillStyle = `${shade}${(Math.random() * 0.06).toFixed(3)})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
  }, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function parchmentTexture() {
  return canvasTexture((ctx, s) => {
    ctx.fillStyle = '#e8d9a8';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(120,90,40,${Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, Math.random() * 3, Math.random() * 3);
    }
    ctx.strokeStyle = 'rgba(90,60,20,0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, s - 8, s - 8);
  });
}

export function stoneTexture() {
  return canvasTexture((ctx, s) => {
    ctx.fillStyle = '#8A8070';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(60,55,45,${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * s, Math.random() * s);
      ctx.lineTo(Math.random() * s, Math.random() * s);
      ctx.stroke();
    }
  });
}

/** Stone texture with a name carved letter-by-letter. progress in [0,1] controls reveal. */
export function stoneNameTexture(name, progress) {
  return canvasTexture((ctx, s) => {
    ctx.fillStyle = '#3a3428';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) {
      ctx.strokeStyle = `rgba(80,75,65,${Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * s, Math.random() * s);
      ctx.lineTo(Math.random() * s, Math.random() * s);
      ctx.stroke();
    }
    const visibleChars = Math.floor(name.length * progress);
    const visible = name.slice(0, visibleChars);
    ctx.fillStyle = '#F5D76E';
    ctx.font = 'bold 34px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#F5D76E';
    ctx.shadowBlur = 12;
    ctx.fillText(visible, s / 2, s / 2);
  }, 256);
}
