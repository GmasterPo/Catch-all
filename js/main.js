// Bootstrap: load the save, build the systems, unlock audio, autosave and
// register the service worker that makes the game installable as an app.

import { loadSave, writeSave } from './save.js';
import { GameState } from './state.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { computeOffline } from './idle.js';
import { fmt } from './util.js';

const { save, isNew } = loadSave();
const state = new GameState(save);
const audio = new AudioEngine(state.data.settings);
const ui = new UI({ state, audio });

const canvas = document.getElementById('game');
const game = new Game({ canvas, state, audio, ui });
ui.setGame(game);
window.ARCANE = { game, state, audio, ui };

let saveTimer = 0;
function saveNow() {
  if (game.defeat) state.data.run.wave = 0;
  else if (game.waves.wave > 0) state.data.run.wave = game.waves.wave;
  writeSave(state.data);
}

// Offline progress from a previous session.
if (!isNew) {
  const report = computeOffline(state, state.data.lastSeen);
  if (report.gold > 1) {
    setTimeout(() => ui.showOffline(report), 450);
  }
}

game.init();
ui.syncSpeed();
ui.refreshAll();

// Audio needs a user gesture before browsers allow it.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audio.ensure();
  if (state.data.settings.music && !state.data.settings.muted) audio.startMusic();
}
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);
window.addEventListener('touchstart', unlockAudio, { passive: true });

// Autosave every few seconds, plus whenever the app is backgrounded.
setInterval(saveNow, 5000);
window.addEventListener('pagehide', saveNow);
window.addEventListener('beforeunload', saveNow);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveNow();
  } else {
    if (audioUnlocked && state.data.settings.music && !state.data.settings.muted) audio.startMusic();
    const report = computeOffline(state, state.data.lastSeen);
    if (report.gold > 1) {
      state.data.gold += report.gold;
      state.data.stats.goldEarned += report.gold;
      ui.toast(`Idle income: +${fmt(report.gold)} gold`, 'gold');
      ui.refreshAll();
    }
  }
});

// Keyboard shortcuts are convenience only; every action has a touch control.
window.addEventListener('keydown', (ev) => {
  if (ev.key === ' ' || ev.code === 'Space') {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    ev.preventDefault();
    game.togglePause();
  } else if (ev.key === 'Escape') {
    ui.closeSheet();
  } else if (ev.key === '1' || ev.key === '2' || ev.key === '3') {
    game.setSpeed(ev.key === '1' ? 1 : ev.key === '2' ? 2 : 5);
  }
});

// Installable app support.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Arcane Ascension: service worker registration failed.', err);
    });
  });

  // A new shell version takes control mid-session: reload once so the open page
  // is not left running the previous release's cached scripts.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || sessionStorage.getItem('arcane-ascension.reloaded') === '1') return;
    reloading = true;
    sessionStorage.setItem('arcane-ascension.reloaded', '1');
    location.reload();
  });
  window.addEventListener('load', () => sessionStorage.removeItem('arcane-ascension.reloaded'));
}

// Exposed for automated smoke tests and curious players.
window.ARCANE.debug = {
  addGold(n) {
    state.data.gold += n;
    ui.refreshAll();
  },
  addGems(n) {
    state.addGems(n);
    ui.refreshAll();
  },
  jumpWave(n) {
    game.waves.wave = Math.max(0, n - 1);
    game.waves.completeWave();
  },
  offline(seconds) {
    return computeOffline(state, Date.now() - seconds * 1000);
  },
  saveNow,
  spawn(type) {
    return game.enemies.spawn(type, game.waves.wave || 1, { angle: 0, dist: 100 });
  },
};
