import { MAX_LEVEL, type GameMode } from './config';
import { migrateTowerId, type TowerId } from './defs';

export interface SavedTower {
  id: TowerId;
  level: number;
  invested: number;
}

export interface SaveData {
  prestige: number;
  stored: SavedTower[];
  /** Deepest endless wave ever survived; 0 means no endless run yet. */
  endlessBest?: number;
  /** Save schema version; 2 means tower levels sit on the ten-level ladder. */
  version?: number;
}

/**
 * Current save schema.
 * 1: original levels · 2: ten-level ladder · 3: era towers (old ids migrate to the
 * nearest technology that still exists).
 */
export const SAVE_VERSION = 3;

/** Schema that first used the ten-level ladder. */
const TEN_LEVEL_VERSION = 2;

/**
 * Towers used to stop at level 3. Their strength on the ten-level ladder, in DPS:
 * L1 1.00x, old L2 1.87x -> new L4 2.24x, old L3 3.54x -> new L6 3.79x.
 * Every mapping lands at or above the old power, so nobody loses towers.
 */
const LEGACY_LEVEL: Record<number, number> = { 1: 1, 2: 4, 3: 6 };

/** Maps a tower level from a pre-ten-level save onto the new ladder. */
export function legacyLevel(level: number): number {
  return LEGACY_LEVEL[level] ?? level;
}

const KEY = 'ogre-orc-siege.progress.v1';

const EMPTY: SaveData = { prestige: 0, stored: [], endlessBest: 0, version: SAVE_VERSION };

/** Reads the meta progression; anything malformed falls back to a clean slate. */
export function loadProgress(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw) as {
      prestige?: unknown;
      stored?: unknown;
      endlessBest?: unknown;
      version?: unknown;
    };
    const version = typeof data.version === 'number' && Number.isFinite(data.version) ? data.version : 1;

    const prestige =
      typeof data.prestige === 'number' && Number.isFinite(data.prestige)
        ? Math.max(0, Math.floor(data.prestige))
        : 0;

    const endlessBest =
      typeof data.endlessBest === 'number' && Number.isFinite(data.endlessBest)
        ? Math.max(0, Math.floor(data.endlessBest))
        : 0;

    const stored: SavedTower[] = [];
    if (Array.isArray(data.stored)) {
      for (const item of data.stored) {
        if (!item || typeof item !== 'object') continue;
        const rec = item as { id?: unknown; level?: unknown; invested?: unknown };
        if (typeof rec.id !== 'string') continue;
        // era restructure: an old tower id is carried to the closest new technology
        const id: TowerId | null = migrateTowerId(rec.id);
        if (!id) continue;
        const level = typeof rec.level === 'number' && Number.isFinite(rec.level) ? Math.floor(rec.level) : 1;
        const invested =
          typeof rec.invested === 'number' && Number.isFinite(rec.invested) ? Math.floor(rec.invested) : 0;
        stored.push({
          id,
          level: Math.min(MAX_LEVEL, Math.max(1, version >= TEN_LEVEL_VERSION ? level : legacyLevel(level))),
          invested: Math.max(0, invested),
        });
      }
    }

    const result: SaveData = { prestige, stored, endlessBest, version: SAVE_VERSION };
    // rewrite a legacy save once so the migrated levels are what sticks
    if (version < SAVE_VERSION) saveProgress(result);
    return result;
  } catch {
    return EMPTY;
  }
}

/**
 * Each mode is fought on its own board, so a mode switch has to rebuild the
 * page. The choice rides in the URL: unlike storage it survives private mode,
 * file:// and a blocked profile, and it cannot leave a reload loop behind.
 */
export function requestMode(mode: GameMode): void {
  window.location.hash = mode;
}

/** Reads and clears the mode the next page load should open straight into. */
export function takeModeRequest(): GameMode | null {
  const raw = window.location.hash.replace(/^#/, '');
  if (raw !== 'campaign' && raw !== 'endless') return null;
  // strip it, so a plain reload later lands on the menu instead
  try {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    // keep the hash: the worst case is landing in the same mode again
  }
  return raw;
}

/** Writes the meta progression; private-mode browsers simply keep running in memory. */
export function saveProgress(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: SAVE_VERSION }));
  } catch {
    // storage unavailable or full — the run still plays, it just will not survive a refresh
  }
}
