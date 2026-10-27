import { SHOTS } from '../config.js';

/** Film counter, tonight's request, the tray of photos taken so far, the shutter flash and the whiteout. */
export class HUD {
  constructor() {
    this.app = document.getElementById('app');
    this.viewfinder = document.getElementById('viewfinder');
    this.film = document.getElementById('film');
    this.tray = document.getElementById('tray');
    this.whiteout = document.getElementById('whiteout');
    this.title = document.getElementById('title');
    this.request = document.getElementById('request');
    this.requestText = document.getElementById('request-text');
    this.titleRequest = document.getElementById('title-request');
    this.frames = [];
    for (let i = 0; i < SHOTS; i++) {
      const f = document.createElement('div');
      f.className = 'frame';
      this.film.appendChild(f);
      this.frames.push(f);
    }
  }

  startRun() {
    this.title.classList.add('hidden');
    this.app.classList.remove('menu');
    this.viewfinder.classList.remove('hidden', 'locked');
    this.film.classList.remove('hidden');
    this.request.classList.remove('hidden', 'done');
    this.frames.forEach((f) => f.classList.remove('used'));
    this.tray.replaceChildren();
    this.setWhiteout(0);
  }

  endRun() {
    this.app.classList.add('menu');
    this.viewfinder.classList.add('hidden');
    this.film.classList.add('hidden');
    this.request.classList.add('hidden');
    this.tray.replaceChildren();
  }

  /** Show the evening's request on the title card and on the in-game tag. */
  setRequest(number, text) {
    this.requestText.textContent = text;
    this.titleRequest.innerHTML = '';
    const line = document.createElement('span');
    line.textContent = `Evening No. ${number} · tonight's request: `;
    const strong = document.createElement('strong');
    strong.textContent = text;
    this.titleRequest.append(line, strong);
  }

  requestDone() {
    this.request.classList.add('done');
  }

  shot(index, dataUrl) {
    this.frames[index]?.classList.add('used');
    this.viewfinder.classList.remove('shot');
    void this.viewfinder.offsetWidth; // restart the flash animation
    this.viewfinder.classList.add('shot', 'locked');
    const mini = document.createElement('div');
    mini.className = 'mini';
    const img = new Image();
    img.src = dataUrl;
    mini.appendChild(img);
    mini.style.transform = `rotate(${(Math.random() - 0.5) * 8}deg)`;
    this.tray.appendChild(mini);
  }

  unlock() {
    this.viewfinder.classList.remove('locked');
  }

  setWhiteout(opacity) {
    this.whiteout.style.opacity = String(opacity);
  }
}
