const TITLES = [
  [1, 'You Were Too Busy Watching'],
  [700, 'Mostly Sky'],
  [2000, 'A Nice Ending'],
  [3400, 'Picture Perfect'],
  [5000, 'The Last Great Album'],
  [Infinity, 'Golden'],
];

function titleFor(total) {
  return TITLES.find(([limit]) => total < limit)[1];
}

/**
 * The end screen: five polaroids with captions. Photos without a picture (shots never
 * taken) show as empty frames.
 */
export class Album {
  constructor() {
    this.el = document.getElementById('album');
    this.titleEl = document.getElementById('album-title');
    this.totalEl = document.getElementById('album-total');
    this.eveningEl = document.getElementById('album-evening');
    this.requestEl = document.getElementById('album-request');
    this.grid = document.getElementById('polaroids');
    this.photos = [];
    this.total = 0;
    this.evening = 0;
    document.getElementById('save').addEventListener('click', () => this.save());
  }

  /** night: { evening, request, fulfilled, bonus } */
  show(photos, total, night) {
    this.photos = photos;
    this.total = total;
    this.evening = night.evening;
    this.eveningEl.textContent = `Elm Street · Evening No. ${night.evening}`;
    this.requestEl.textContent = night.fulfilled
      ? `Tonight's request: ${night.request} ✓ +${night.bonus}`
      : `Tonight's request: ${night.request}. Missed it.`;
    this.requestEl.classList.toggle('done', night.fulfilled);
    this.titleEl.textContent = titleFor(total);
    this.totalEl.textContent = total > 0 ? `${total.toLocaleString()} points of golden light` : 'Not a single photo. Maybe that was the point.';
    this.grid.replaceChildren(
      ...photos.map((photo, i) => {
        const card = document.createElement('figure');
        card.className = 'polaroid' + (photo.dataUrl ? '' : ' empty');
        card.style.setProperty('--tilt', `${((i * 37) % 7) - 3}deg`);
        card.style.animationDelay = `${0.6 + i * 0.22}s`;
        card.style.margin = '0';
        const frame = document.createElement('div');
        frame.className = 'photo';
        if (photo.dataUrl) {
          const img = new Image();
          img.src = photo.dataUrl;
          img.alt = photo.caption;
          img.style.animationDelay = `${0.6 + i * 0.22}s`;
          frame.appendChild(img);
        }
        const caption = document.createElement('figcaption');
        caption.className = 'caption';
        caption.textContent = photo.caption;
        const score = document.createElement('div');
        score.className = 'score';
        score.textContent = photo.dataUrl ? `${photo.score}` : '';
        card.append(frame, caption, score);
        if (photo.rare) {
          const sticker = document.createElement('span');
          sticker.className = 'sticker';
          sticker.textContent = 'rare';
          card.prepend(sticker);
        }
        return card;
      }),
    );
    this.el.classList.remove('hidden');
    this.el.scrollTop = 0;
  }

  hide() {
    this.el.classList.add('hidden');
  }

  /** Download the album as one PNG, for sharing. */
  async save() {
    await document.fonts.ready;
    const card = 280;
    const pad = 40;
    const width = this.photos.length * card + (this.photos.length + 1) * pad;
    const height = 640;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf2';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d9644a';
    ctx.font = '600 56px Fraunces, Georgia, serif';
    ctx.fillText(titleFor(this.total), width / 2, 84);
    ctx.fillStyle = '#2f2530';
    ctx.font = '500 30px Caveat, cursive';
    ctx.fillText(`${this.total.toLocaleString()} points of golden light`, width / 2, 126);

    const images = await Promise.all(
      this.photos.map((p) => (p.dataUrl ? new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = p.dataUrl;
      }) : null)),
    );
    this.photos.forEach((photo, i) => {
      const x = pad + i * (card + pad);
      const y = 170;
      ctx.save();
      ctx.translate(x + card / 2, y + 200);
      ctx.rotate(((((i * 37) % 7) - 3) * Math.PI) / 180);
      ctx.translate(-card / 2, -200);
      ctx.shadowColor = 'rgba(60,40,30,0.25)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, card, card + 110);
      ctx.shadowColor = 'transparent';
      if (images[i]) ctx.drawImage(images[i], 14, 14, card - 28, card - 28);
      else {
        ctx.fillStyle = '#efe8dc';
        ctx.fillRect(14, 14, card - 28, card - 28);
      }
      ctx.fillStyle = '#2f2530';
      ctx.font = '500 26px Caveat, cursive';
      wrap(ctx, photo.caption, card / 2, card + 22, card - 30, 26);
      ctx.restore();
    });
    ctx.fillStyle = 'rgba(47,37,48,0.45)';
    ctx.font = '500 20px Fraunces, Georgia, serif';
    ctx.fillText(`Golden Hour · Evening No. ${this.evening} · #20SecondGameJam`, width / 2, height - 24);

    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'golden-hour-album.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }
}

function wrap(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}
