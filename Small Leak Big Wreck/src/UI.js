// UI.js - thin wrapper around the overlay divs defined in index.html

const el = (id) => document.getElementById(id);

const LEGEND = [
  { color: '#d8c9a3', label: 'Dry floor' },
  { color: '#2f8fd0', label: 'Water (mop it up!)' },
  { color: '#e0c860', label: 'Outlet (ignites when wet)' },
  { color: '#c98b3a', label: 'Flammable (fire spreads fast)' },
  { color: '#7a3ae0', label: 'Critical (don\'t let it burn!)' },
  { color: '#ff6a1a', label: 'On fire' },
  { color: '#2b2b2b', label: 'Burnt' },
];

function legendHTML() {
  return LEGEND.map(l =>
    `<span class="legend-item"><span class="legend-swatch" style="background:${l.color}"></span>${l.label}</span>`
  ).join('');
}

export const UI = {
  mainMenuOverlay: el('main-menu-overlay'),
  btnPlay: el('btn-play'),
  btnSettingsMain: el('btn-settings-main'),

  pauseOverlay: el('pause-overlay'),
  btnResume: el('btn-resume'),
  btnRestart: el('btn-restart'),
  btnSettingsPause: el('btn-settings-pause'),
  btnQuit: el('btn-quit'),

  settingsOverlay: el('settings-overlay'),
  btnSettingsBack: el('btn-settings-back'),
  volMaster: el('vol-master'),
  volMusic: el('vol-music'),
  volSfx: el('vol-sfx'),

  howtoOverlay: el('howto-overlay'),
  howtoLegend: el('howto-legend'),
  timeskipOverlay: el('timeskip-overlay'),
  timeskipText: el('timeskip-text'),
  hud: el('hud'),
  hudLegend: el('hud-legend'),
  levelLabel: el('level-label'),
  timerBar: el('timer-bar'),
  dangerBar: el('danger-bar'),
  dangerThresholdMark: el('danger-threshold-mark'),
  dangerLabel: el('danger-label'),
  failBanner: el('fail-banner'),
  storyOverlay: el('story-overlay'),
  storyTitle: el('story-title'),
  storyText: el('story-text'),
  scoreOverlay: el('score-overlay'),
  scoreTitle: el('score-title'),
  scoreBreakdown: el('score-breakdown'),
  scorePrompt: el('story-prompt2'),
  finalOverlay: el('final-overlay'),
  finalScore: el('final-score'),
  finalTagline: el('final-tagline'),

  init() {
    this.howtoLegend.innerHTML = legendHTML();
    this.hudLegend.innerHTML = legendHTML();
  },

  showMainMenu() {
    this.mainMenuOverlay.classList.remove('hidden');
  },
  hideMainMenu() {
    this.mainMenuOverlay.classList.add('hidden');
  },

  showPause() {
    this.pauseOverlay.classList.remove('hidden');
  },
  hidePause() {
    this.pauseOverlay.classList.add('hidden');
  },

  // Settings never changes game state itself - it overlays on top of
  // whichever screen (main menu or pause) called it, and Back just hides
  // this overlay again, revealing that screen underneath unchanged.
  showSettings(volumes) {
    this.volMaster.value = volumes.master;
    this.volMusic.value = volumes.music;
    this.volSfx.value = volumes.sfx;
    this.settingsOverlay.classList.remove('hidden');
  },
  hideSettings() {
    this.settingsOverlay.classList.add('hidden');
  },

  showHowTo() {
    this.howtoOverlay.classList.remove('hidden');
  },
  hideHowTo() {
    this.howtoOverlay.classList.add('hidden');
  },

  showTimeSkip(text) {
    this.timeskipText.textContent = text;
    this.timeskipOverlay.classList.remove('hidden');
  },
  hideTimeSkip() {
    this.timeskipOverlay.classList.add('hidden');
  },

  showHUD(level) {
    this.hud.classList.remove('hidden');
    this.levelLabel.textContent = `${level.title} — ${level.subtitle}`;
    this.failBanner.classList.add('hidden');
  },
  hideHUD() {
    this.hud.classList.add('hidden');
  },
  setTimer(pct) {
    this.timerBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  },
  setDanger(pct, limit) {
    const clampedPct = Math.max(0, Math.min(100, pct));
    this.dangerBar.style.width = `${clampedPct}%`;
    this.dangerThresholdMark.style.left = `${Math.max(0, Math.min(100, limit))}%`;
    const holding = pct <= limit;
    this.dangerLabel.textContent = `${pct}% (target ≤ ${limit}%) — ${holding ? 'holding' : 'over the line'}`;
    this.dangerLabel.style.color = holding ? '' : '#ff6b6b';
  },
  showFailBanner() {
    this.failBanner.classList.remove('hidden');
  },

  showStory(title, text) {
    this.storyTitle.textContent = title;
    this.storyText.textContent = text;
    this.storyOverlay.classList.remove('hidden');
  },
  hideStory() {
    this.storyOverlay.classList.add('hidden');
  },

  showScore(level, chaosScore, danger, dangerLimit, stabilized, forceAdvance) {
    this.scoreTitle.textContent = stabilized
      ? `${level.title} — STABILIZED`
      : forceAdvance
        ? `${level.title} — STILL A MESS, MOVING ON`
        : `${level.title} — NOT UNDER CONTROL`;

    const lines = [
      `Danger Level: ${danger}% (needs ≤ ${dangerLimit}%)`,
      `Chaos Score: ${chaosScore}%`,
    ];
    // Only show the resolution narrative once the scene is actually
    // resolved (stabilized, or pity-advanced past retries) - showing
    // "it's handled" copy over an unresolved room breaks the fiction.
    if (stabilized || forceAdvance) {
      lines.push('', level.flashbackOutro ?? level.outro);
    } else {
      lines.push('', "Still spreading. Get back in there.");
    }
    this.scoreBreakdown.innerHTML = lines.join('<br>');
    if (this.scorePrompt) {
      this.scorePrompt.textContent = (stabilized || forceAdvance)
        ? 'Press SPACE to continue'
        : 'Press SPACE to try again';
    }
    this.scoreOverlay.classList.remove('hidden');
  },
  hideScore() {
    this.scoreOverlay.classList.add('hidden');
  },

  showFinal(totalScore, moneyEstimate) {
    this.finalScore.textContent = `${totalScore}% Total Chaos`;
    this.finalTagline.textContent = `Estimated Damage: $${moneyEstimate.toLocaleString()}. Cause: One Drip.`;
    this.finalOverlay.classList.remove('hidden');
  },
};
