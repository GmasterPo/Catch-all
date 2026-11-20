import { totalStagesFor, totalWavesFor, type GameMode } from './config';

/** Boot screen and mode switch: pick a game mode before the gate comes into view. */
export type { GameMode };

export interface ModeMenuHooks {
  /** The menu is up — freeze the board while it is. */
  onOpen(): void;
  /** A playable mode was picked: hand the board back and switch to it. */
  onMode(mode: GameMode): void;
  /** Progress the cards advertise: campaign prestige and the endless record. */
  stats(): { prestige: number; endlessBest: number };
}

const el = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing #${id}`);
  return found as T;
};

let hooks: ModeMenuHooks | null = null;

/** The cards advertise the run the loaded save is actually on. */
export function refreshModeMenu(): void {
  if (!hooks) return;
  const { prestige, endlessBest } = hooks.stats();

  const campaignMeta = document.getElementById('modeCampaignMeta');
  if (campaignMeta) {
    const level = Math.max(0, Math.floor(prestige));
    const waves = totalWavesFor(level);
    const stages = totalStagesFor(level);
    campaignMeta.textContent = level > 0
      ? `Prestige ${level} · ${waves} waves · ${stages} stages`
      : `${waves} waves · ${stages} stages`;
  }

  const endlessMeta = document.getElementById('modeEndlessMeta');
  if (endlessMeta) {
    const best = Math.max(0, Math.floor(endlessBest));
    endlessMeta.textContent = best > 0 ? `Best: wave ${best}` : 'No run yet';
  }
}

export function initModeMenu(menuHooks: ModeMenuHooks): void {
  hooks = menuHooks;

  const pick = (mode: GameMode): void => {
    closeModeMenu();
    hooks?.onMode(mode);
  };

  el('modeCampaign').addEventListener('click', () => pick('campaign'));
  el('modeEndless').addEventListener('click', () => pick('endless'));

  openModeMenu();
}

/** Brings the menu back over a running board — used by the top bar's Modes button. */
export function openModeMenu(): void {
  const menu = document.getElementById('modeMenu');
  if (!menu) return;
  refreshModeMenu();
  document.body.classList.add('menu-open');
  menu.classList.remove('hidden', 'out');
  hooks?.onOpen();
}

/** Fades the menu away and hands the board back to the player. */
export function closeModeMenu(): void {
  const menu = document.getElementById('modeMenu');
  if (!menu || menu.classList.contains('hidden')) return;
  document.body.classList.remove('menu-open');
  menu.classList.add('out');
  window.setTimeout(() => menu.classList.add('hidden'), 280);
}
