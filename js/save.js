// Versioned localStorage persistence. Every read is sanitised so a corrupt or
// hand-edited save can never put NaN into the simulation.

export const SAVE_KEY = 'arcane-ascension.save';
export const SAVE_VERSION = 4;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    gold: 0,
    gems: 0,
    crystals: 0,
    upgrades: {},
    spells: { unlocked: ['bolt'], levels: { bolt: 1 } },
    shop: { draws: 0, goldSpent: 0, gemsSpent: 0 },
    prestige: { levels: {}, count: 0, totalCrystals: 0 },
    run: { wave: 0 },
    stats: {
      killed: 0,
      bosses: 0,
      damage: 0,
      runs: 0,
      bestWave: 0,
      goldEarned: 0,
      playTime: 0,
      prestiges: 0,
    },
    settings: { muted: false, volume: 0.55, music: true, lowFx: false },
  };
}

const num = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);

function sanitizeLevels(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      const n = Math.floor(num(v, 0));
      if (n > 0) out[k] = Math.min(n, 100000);
    }
  }
  return out;
}

export function sanitizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;

  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const spells = raw.spells && typeof raw.spells === 'object' ? raw.spells : {};
  const prestige = raw.prestige && typeof raw.prestige === 'object' ? raw.prestige : {};
  const shop = raw.shop && typeof raw.shop === 'object' ? raw.shop : {};

  const save = {
    version: SAVE_VERSION,
    createdAt: num(raw.createdAt, base.createdAt),
    lastSeen: num(raw.lastSeen, Date.now()),
    gold: Math.max(0, num(raw.gold, 0)),
    gems: Math.max(0, Math.floor(num(raw.gems, 0))),
    crystals: Math.max(0, num(raw.crystals, 0)),
    upgrades: sanitizeLevels(raw.upgrades),
    spells: {
      unlocked: Array.isArray(spells.unlocked)
        ? Array.from(new Set(spells.unlocked.filter((s) => typeof s === 'string'))).slice(0, 64)
        : ['bolt'],
      levels: sanitizeLevels(spells.levels),
    },
    shop: {
      draws: Math.max(0, Math.floor(num(shop.draws, 0))),
      goldSpent: Math.max(0, num(shop.goldSpent, 0)),
      gemsSpent: Math.max(0, Math.floor(num(shop.gemsSpent, 0))),
    },
    prestige: {
      levels: sanitizeLevels(prestige.levels),
      count: Math.max(0, Math.floor(num(prestige.count, 0))),
      totalCrystals: Math.max(0, Math.floor(num(prestige.totalCrystals, 0))),
    },
    run: {
      wave: Math.max(0, Math.floor(num(raw.run && raw.run.wave, 0))),
      best: Math.max(0, Math.floor(num(raw.run && raw.run.best, 0))),
    },
    stats: {
      killed: Math.max(0, Math.floor(num(stats.killed, 0))),
      bosses: Math.max(0, Math.floor(num(stats.bosses, 0))),
      damage: Math.max(0, num(stats.damage, 0)),
      runs: Math.max(0, Math.floor(num(stats.runs, 0))),
      bestWave: Math.max(0, Math.floor(num(stats.bestWave, 0))),
      goldEarned: Math.max(0, num(stats.goldEarned, 0)),
      playTime: Math.max(0, num(stats.playTime, 0)),
      prestiges: Math.max(0, Math.floor(num(stats.prestiges, 0))),
    },
    settings: {
      muted: !!settings.muted,
      volume: Math.min(1, Math.max(0, num(settings.volume, 0.55))),
      music: settings.music !== false,
      lowFx: !!settings.lowFx,
    },
  };

  if (!save.spells.unlocked.length) save.spells.unlocked.push('bolt');
  // Every owned spell holds at least one card: level 1 is the unlock.
  for (const id of save.spells.unlocked) {
    if (!save.spells.levels[id]) save.spells.levels[id] = 1;
  }
  return save;
}

// Future schema changes get a migration step here; unknown versions fall back
// to a sanitised save rather than throwing.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return defaultSave();
  const version = num(raw.version, 1);
  let data = raw;

  if (version < 2) {
    data = { ...data, charms: undefined };
  }
  if (version < 3) {
    data = { ...data, lastSeen: num(data.lastSeen, Date.now()) };
  }
  if (version < 4) {
    // Card economy: gems and shop totals are new; spell levels become card
    // counts, so every already-owned spell starts at level 1 minimum.
    data = { ...data, gems: num(data.gems, 0), shop: data.shop };
  }

  data.version = SAVE_VERSION;
  return sanitizeSave(data);
}

export function loadSave() {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (!text) return { save: defaultSave(), isNew: true };
    return { save: migrate(JSON.parse(text)), isNew: false };
  } catch (err) {
    console.warn('Arcane Ascension: save could not be read, starting fresh.', err);
    return { save: defaultSave(), isNew: true };
  }
}

export function writeSave(data) {
  try {
    data.version = SAVE_VERSION;
    data.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('Arcane Ascension: save could not be written.', err);
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (err) {
    return false;
  }
}
