import './style.css';
import { configureMap } from './config';
import { Game } from './game';
import { loadProgress, takeModeRequest } from './save';
import { registerServiceWorker } from './pwa';
import { initAccount } from './account';
import { closeModeMenu, initModeMenu, openModeMenu, refreshModeMenu } from './menu';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
// a mode switch reloads the page, because each mode is fought on its own board
const requested = takeModeRequest();
configureMap(loadProgress().prestige, requested ?? 'campaign');
const game = new Game(canvas);
registerServiceWorker();

// the board idles behind the mode menu until a mode is picked
initModeMenu({
  onOpen: () => game.setMenuOpen(true),
  onMode: (mode) => {
    game.setMenuOpen(false);
    game.startMode(mode);
  },
  stats: () => ({ prestige: game.prestigeLevel, endlessBest: game.endlessBestWave }),
});

// a reloaded mode switch lands straight on the board it was asked for
if (requested) {
  closeModeMenu();
  game.setMenuOpen(false);
  game.startMode(requested);
}

// back to the menu without a reload: the run is frozen, not thrown away
document.getElementById('menuBtn')?.addEventListener('click', () => openModeMenu());

initAccount({
  getSave: () => game.saveData(),
  applySave: (data) => {
    game.applySaveData(data);
    // another save can carry another prestige and endless record: keep the cards honest
    refreshModeMenu();
  },
  toast: (message, kind) => game.notify(message, kind),
  onProgress: (listener) => game.onProgress(listener),
});
