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
    this.epilogueEl = document.getElementById('album-epilogue');
    this.shareButton = document.getElementById('share');
    this.shareText = '';
    this.shareButton.addEventListener('click', () => this.share());
    this.newspaper = document.getElementById('newspaper');
    this.journalEl = document.getElementById('journal');
    this.journalButton = document.getElementById('journal-open');
    this.journalButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openJournal();
    });
    document.getElementById('journal-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.journalEl.classList.add('hidden');
    });
    this.journalView = null;
    this.grid = document.getElementById('polaroids');
    this.photos = [];
    this.total = 0;
    this.evening = 0;
    document.getElementById('save').addEventListener('click', () => this.save());
  }

  /** night: { evening, request, fulfilled, bonus, epilogue, share, journal: { pages, seen, total, fresh } } */
  show(photos, total, night) {
    this.journalView = night.journal;
    this.journalButton.textContent = `Journal ${night.journal.seen}/${night.journal.total}${night.journal.fresh ? ` · +${night.journal.fresh} new` : ''}`;
    this.renderNewspaper(photos, night);
    this.shareText = night.share;
    this.shareButton.textContent = 'Copy result';
    this.epilogueEl.textContent = night.epilogue;
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
        const labels = document.createElement('div');
        labels.className = 'labels';
        for (const text of photo.labels ?? []) {
          const chip = document.createElement('span');
          chip.textContent = text;
          labels.append(chip);
        }
        card.append(frame, caption, score, labels);
        if (photo.legendary || photo.rare) {
          const sticker = document.createElement('span');
          sticker.className = photo.legendary ? 'sticker legendary' : 'sticker';
          sticker.textContent = photo.legendary ? 'legendary' : 'rare';
          card.prepend(sticker);
        }
        return card;
      }),
    );
    this.el.classList.remove('hidden');
    this.el.scrollTop = 0;
  }

  /** Copy a short, spoiler-free result line, for sharing a score on an evening. */
  async share() {
    try {
      await navigator.clipboard.writeText(this.shareText);
    } catch {
      // Clipboard can be blocked inside the itch.io frame: fall back to a selectable prompt.
      window.prompt('Copy your result:', this.shareText);
      return;
    }
    this.shareButton.textContent = 'Copied ✓';
  }

  /** The Elm Street Evening Post: tonight's best photo on the front page. */
  renderNewspaper(photos, night) {
    const best = photos.filter((p) => p.dataUrl).sort((a, b) => b.score - a.score)[0];
    const headline = best ? best.caption.replace(/[.!]+$/, '').toUpperCase() : 'PHOTOGRAPHER SEES EVERYTHING, SHOOTS NOTHING';
    this.newspaper.replaceChildren();
    const make = (tag, cls, text) => {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      if (text) el.textContent = text;
      return el;
    };
    this.newspaper.append(
      make('div', 'masthead', 'The Elm Street Evening Post'),
      make('div', 'dateline', `Evening No. ${night.evening} · Final edition · The very last one`),
      make('h3', 'headline', headline),
    );
    if (best) {
      const img = new Image();
      img.src = best.dataUrl;
      img.alt = best.caption;
      this.newspaper.append(img);
    }
    this.newspaper.append(make('p', 'story', `${night.epilogue} The sun is expected to keep growing. Residents say they "wouldn't miss it".`));
  }

  openJournal() {
    if (!this.journalView) return;
    const { pages, seen, total } = this.journalView;
    document.getElementById('journal-count').textContent = `${seen} of ${total} endings caught at their peak, across all your evenings.`;
    const list = document.getElementById('journal-list');
    list.replaceChildren(
      ...pages.map((page) => {
        const card = document.createElement('div');
        card.className = `journal-page ${page.rarity}`;
        for (const ending of page.endings) {
          const row = document.createElement('div');
          row.className = ending.seen ? 'ending seen' : 'ending';
          row.textContent = ending.seen ? ending.caption : '? ? ?';
          card.append(row);
        }
        return card;
      }),
    );
    this.journalEl.classList.remove('hidden');
    this.journalEl.scrollTop = 0;
  }

  hide() {
    this.el.classList.add('hidden');
    this.journalEl.classList.add('hidden');
  }

  /** Download the album as one PNG, for sharing. */
  async save() {
    const canvas = await this.image();
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'golden-hour-album.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  /** The album drawn on one canvas (also used by the press tool). */
  async image() {
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
    return canvas;
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
