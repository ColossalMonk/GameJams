export class HUD {
  constructor() {
    this.layerIndicator = document.getElementById('layer-indicator');
    this.trustFill = document.getElementById('trust-bar-fill');
    this.portraitExplorer = document.getElementById('portrait-explorer');
    this.portraitJaguar = document.getElementById('portrait-jaguar');
    this.fragmentPopup = document.getElementById('fragment-popup');
    this.messageBanner = document.getElementById('message-banner');
    this.endingText = document.getElementById('ending-text');
    this.zoneHint = document.getElementById('zone-hint');
    this.interactPrompt = document.getElementById('interact-prompt');
    this.objectivesBtn = document.getElementById('objectives-btn');
    this.objectivesPanel = document.getElementById('objectives-panel');
    this.objectivesList = document.getElementById('objectives-list');
    this.objectivesCloseBtn = document.getElementById('objectives-close');
    this.zoneTimer = document.getElementById('zone-timer');
    this.progressCounter = document.getElementById('progress-counter');
    this._messageTimeout = null;
    this._hintTimeout = null;

    this.objectivesBtn.addEventListener('click', () => this.toggleObjectives());
    this.objectivesCloseBtn.addEventListener('click', () => this.hideObjectives());
  }

  /** seconds remaining; pass null to show a neutral placeholder (e.g. no zone loaded). */
  setZoneTimer(seconds) {
    if (seconds == null) {
      this.zoneTimer.textContent = '--:--';
      this.zoneTimer.classList.remove('low');
      return;
    }
    const clamped = Math.max(0, Math.round(seconds));
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    this.zoneTimer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    this.zoneTimer.classList.toggle('low', clamped <= 60);
  }

  /** parts: [{label, done, total}] — pass [] or null to hide. */
  setProgress(parts) {
    if (!parts || !parts.length) {
      this.progressCounter.classList.remove('show');
      return;
    }
    this.progressCounter.innerHTML = parts.map((p) => `<div>${p.label} ${p.done}/${p.total}</div>`).join('');
    this.progressCounter.classList.add('show');
  }

  /** Populates the objectives checklist for the current zone (does not open the panel). */
  setObjectives(title, list) {
    this.objectivesList.innerHTML = '';
    const heading = this.objectivesPanel.querySelector('h3');
    if (heading) heading.textContent = title || 'Objectives';
    for (const item of list || []) {
      const li = document.createElement('li');
      li.textContent = item;
      this.objectivesList.appendChild(li);
    }
  }

  showObjectives() {
    this.objectivesPanel.classList.remove('hidden');
  }

  hideObjectives() {
    this.objectivesPanel.classList.add('hidden');
  }

  toggleObjectives() {
    this.objectivesPanel.classList.toggle('hidden');
  }

  setLayer(layer) {
    this.layerIndicator.textContent = layer === 'spirit' ? '✦ SPIRIT' : '🌿 PHYSICAL';
    this.layerIndicator.classList.toggle('spirit', layer === 'spirit');
  }

  setActiveCharacter(character) {
    this.portraitExplorer.classList.toggle('active', character === 'explorer');
    this.portraitJaguar.classList.toggle('active', character === 'jaguar');
  }

  setTrust(value) {
    this.trustFill.style.width = `${Math.round(value * 100)}%`;
  }

  showFragmentPopup() {
    this.fragmentPopup.classList.add('show');
    setTimeout(() => this.fragmentPopup.classList.remove('show'), 3000);
  }

  showMessage(text, duration = 2500) {
    clearTimeout(this._messageTimeout);
    this.messageBanner.textContent = text;
    this.messageBanner.classList.add('show');
    this._messageTimeout = setTimeout(() => this.messageBanner.classList.remove('show'), duration);
  }

  showZoneHint(text, duration = 6000) {
    clearTimeout(this._hintTimeout);
    this.zoneHint.textContent = text;
    this.zoneHint.classList.add('show');
    this._hintTimeout = setTimeout(() => this.zoneHint.classList.remove('show'), duration);
  }

  /** Pass null/empty to hide. Cheap to call every frame — no-ops if text is unchanged. */
  setInteractPrompt(text) {
    if (!text) {
      if (this.interactPrompt.classList.contains('show')) this.interactPrompt.classList.remove('show');
      return;
    }
    if (this.interactPrompt.textContent !== text) this.interactPrompt.textContent = text;
    if (!this.interactPrompt.classList.contains('show')) this.interactPrompt.classList.add('show');
  }

  showEndingText(text) {
    this.endingText.textContent = text;
    this.endingText.classList.add('show');
  }

  hideEndingText() {
    this.endingText.classList.remove('show');
  }
}
