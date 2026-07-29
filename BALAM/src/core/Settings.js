const STORAGE_KEY = 'balam-settings';

const DEFAULTS = {
  masterVolume: 0.8,
  musicVolume: 0.8,
  sfxVolume: 0.8,
  shadows: true,
  bloom: true,
  particleDensity: 'high', // 'low' | 'high'
  antialiasing: true,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

const values = load();

export const Settings = {
  get(key) {
    return values[key];
  },
  set(key, value) {
    values[key] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      /* localStorage unavailable — settings just won't persist across reloads */
    }
  },
};
