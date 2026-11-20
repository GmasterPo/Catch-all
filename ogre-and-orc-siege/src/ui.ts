import { STAGE_LENGTH, stageLabel, totalStagesFor, type GameMode } from './config';
import {
  ERAS,
  ROMAN,
  TOWERS,
  eraForPrestige,
  isShelved,
  towerUnlockPrestige,
  towersInEra,
  type TowerDef,
  type TowerId,
} from './defs';

export interface UIHandlers {
  onPickTower(id: TowerId): void;
  onRecall(index: number): void;
  onStartWave(): void;
  onSpeed(n: number): void;
  onPause(): void;
  onUpgrade(): void;
  onSell(): void;
  onDeselect(): void;
  onRestart(): void;
  onPrestige(): void;
  onBetch(): void;
  onConfirmBuild(): void;
  onCancelBuild(): void;
}

export interface TowerPanelInfo {
  id: TowerId;
  name: string;
  icon: string;
  era: number;
  eraName: string;
  ability: string;
  level: number;
  damage: number;
  range: number;
  rate: number;
  kills: number;
  upgradeCost: number | null;
  sellValue: number;
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing HUD element #${id}`);
  return node as T;
}

export class UI {
  private h: UIHandlers;
  private goldEl = el('gold');
  private livesEl = el('lives');
  private waveEl = el('wave');
  private waveTotalEl = el('waveTotal');
  private statLives = document.querySelector('.vital.lives') as HTMLElement | null;
  private tiersEl = el('tiers');
  private placingName = el('placingName');
  private selection = el('selection');
  private pop = el('towerPop');
  private popIcon = el('popIcon');
  private popName = el('popName');
  private popTier = el('popTier');
  private popDesc = el('popDesc');
  private startWave = el<HTMLButtonElement>('startWave');
  private waveTitle = el('waveTitle');
  private waveInfo = el('waveInfo');
  private waveBadge = el('waveBadge');
  private bossbar = el('bossbar');
  private bossname = el('bossname');
  private bossfill = el('bossfill');
  private toasts = el('toasts');
  private overlay = el('overlay');
  private ovTitle = el('ovTitle');
  private ovText = el('ovText');
  private ovBtn = el('ovBtn');
  private prestigeBtn = el<HTMLButtonElement>('prestigeBtn');
  private prestigePill = el('prestigePill');
  private prestigeVal = el('prestigeVal');
  private help = el('help');
  private pauseBtn = el('pauseBtn');
  private betchBtn = el<HTMLButtonElement>('betchBtn');
  private betchWarn = el('betchWarn');
  private buildConfirm = el('buildConfirm');
  private confirmLabel = el('confirmLabel');
  private confirmBuild = el<HTMLButtonElement>('confirmBuild');
  private betchTimer = 0;
  private storageEl = el('storage');
  private storageList = el('storageList');
  private storageCount = el('storageCount');
  private stagebanner = el('stagebanner');
  private stageNum = el('stageNum');
  private stageLabelEl = el('stageLabel');
  private bannerTimer = 0;

  private cards = new Map<TowerId, HTMLButtonElement>();
  private eraRows = new Map<number, HTMLElement>();
  /** Towers the current prestige has opened — the only ones gold can unlock. */
  private unlocked = new Set<TowerId>();
  private eraPill = el('eraPill');
  private prep = true;
  private isPaused = false;
  /** Endless has no stages: waves are plain numbers and the total is open. */
  private endless = false;
  private waveNo = 1;
  private prestigeLevel = 0;
  private gold = -1;
  private current: TowerPanelInfo | null = null;

  constructor(handlers: UIHandlers) {
    this.h = handlers;
    this.waveTotalEl.textContent = `/${totalStagesFor(0)}-${STAGE_LENGTH}`;

    // one row per technological era; every tower stays in view, locked ones included
    for (const era of ERAS) {
      const row = document.createElement('div');
      row.className = 'tier-row era-row';
      row.dataset.era = String(era.era);
      const tag = document.createElement('div');
      tag.className = 'tier-tag';
      tag.textContent = ROMAN[era.era - 1];
      tag.title = `Era ${ROMAN[era.era - 1]} — ${era.name} (opens at prestige ${era.prestige})`;
      const cards = document.createElement('div');
      cards.className = 'cards';

      for (const def of towersInEra(era.era)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'card';
        btn.dataset.id = def.id;
        btn.title = this.cardTooltip(def);
        btn.innerHTML = `<span class="ico">${def.icon}</span><span class="nm">${def.short}</span><span class="cost">🪙 ${def.cost}</span>`;
        if (isShelved(def.id)) {
          btn.disabled = true;
          btn.classList.add('shelved');
          btn.dataset.seal = 'Future update';
          btn.title = `${def.name} — coming in a future update. Not available to build.`;
        } else {
          btn.addEventListener('click', () => this.h.onPickTower(def.id));
        }
        cards.appendChild(btn);
        this.cards.set(def.id, btn);
      }

      row.appendChild(tag);
      row.appendChild(cards);
      this.tiersEl.appendChild(row);
      this.eraRows.set(era.era, row);
    }

    this.startWave.addEventListener('click', () => this.h.onStartWave());
    el('pauseBtn').addEventListener('click', () => this.h.onPause());
    el('helpBtn').addEventListener('click', () => this.toggleHelp(true));
    el('helpClose').addEventListener('click', () => this.toggleHelp(false));
    this.ovBtn.addEventListener('click', () => this.h.onRestart());
    el('popClose').addEventListener('click', () => this.hideTowerPopup());
    this.prestigeBtn.addEventListener('click', () => this.h.onPrestige());
    this.betchBtn.addEventListener('click', () => this.h.onBetch());
    this.confirmBuild.addEventListener('click', () => this.h.onConfirmBuild());
    el('cancelBuild').addEventListener('click', () => this.h.onCancelBuild());
    this.help.addEventListener('click', (e) => {
      if (e.target === this.help) this.toggleHelp(false);
    });

    document.querySelectorAll<HTMLButtonElement>('.spd').forEach((btn) => {
      btn.addEventListener('click', () => this.h.onSpeed(Number(btn.dataset.spd ?? 1)));
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggleHelp(false);
      }
    });

    this.refreshPlay();
    this.refreshEraLocks();
  }

  /** Tooltip: role, description, cost and the stats the tower ships with. */
  private cardTooltip(def: TowerDef): string {
    const era = ERAS[def.era - 1];
    const stats = `Cost ${def.cost} · Range ${def.range} · ${def.damage} damage · ${def.fireRate}/s`;
    return `${def.name} (Era ${ROMAN[def.era - 1]} — ${era.name})\n${def.ability}\n${def.desc}\n${stats}`;
  }

  /**
   * Locked towers stay in the shop so the whole progression is legible: a sealed
   * card names the prestige that opens it, and the era pill says where we are.
   */
  private refreshEraLocks(): void {
    const era = eraForPrestige(this.prestigeLevel);
    this.eraPill.textContent = `Era ${ROMAN[era.era - 1]} · ${era.name}`;
    this.eraPill.title = era.era < 5
      ? `Prestige ${era.prestige + 1} opens Era ${ROMAN[era.era]} (${ERAS[era.era].name})`
      : 'The final era — every technology is available';
    this.eraPill.classList.toggle('next', era.era < 5);

    this.unlocked.clear();
    for (const def of TOWERS) {
      const card = this.cards.get(def.id);
      if (!card) continue;
      if (def.shelved) {
        card.classList.add('sealed');
        card.dataset.seal = 'Future update';
        continue;
      }
      const needed = towerUnlockPrestige(def.id);
      const sealed = this.prestigeLevel < needed;
      card.classList.toggle('sealed', sealed);
      if (sealed) {
        card.dataset.seal = `Prestige ${needed}`;
        card.title = `${def.name} — ${def.ability}\nUnlocks with Era ${ROMAN[def.era - 1]} at prestige ${needed}`;
      } else {
        delete card.dataset.seal;
        card.title = this.cardTooltip(def);
        this.unlocked.add(def.id);
      }
      card.classList.toggle('locked', !sealed && def.cost > this.gold);
    }

    for (const [level, row] of this.eraRows) {
      row.classList.toggle('sealed-era', level > era.era);
      row.classList.toggle('current-era', level === era.era);
    }
  }

  private waveName(wave: number): string {
    return this.endless ? String(wave) : stageLabel(wave);
  }

  private refreshPlay(): void {
    const ready = this.prep || this.isPaused;
    this.startWave.disabled = !ready;
    this.startWave.classList.toggle('ready', ready);
    if (this.isPaused) this.startWave.textContent = '▶ Resume';
    else if (this.prep) this.startWave.textContent = `▶ Start ${this.waveName(this.waveNo)}`;
    else this.startWave.textContent = 'Wave in progress';
  }

  setGold(gold: number): void {
    if (gold === this.gold) return;
    this.gold = gold;
    this.goldEl.textContent = String(Math.floor(gold));
    for (const [id, card] of this.cards) {
      if (!this.unlocked.has(id)) continue;
      const def = TOWERS.find((t) => t.id === id);
      card.classList.toggle('locked', !!def && def.cost > gold);
    }
    this.refreshUpgrade();
  }

  setLives(lives: number): void {
    this.livesEl.textContent = String(Math.max(0, lives));
    this.statLives?.classList.toggle('low', lives <= 5);
  }

  setWave(wave: number): void {
    this.waveEl.textContent = this.waveName(wave);
  }

  /** Switches the HUD between the campaign's staged waves and endless numbering. */
  setMode(mode: GameMode): void {
    this.endless = mode === 'endless';
    this.betchBtn.classList.toggle('hidden', this.endless);
    this.prestigePill.classList.toggle('hidden', this.endless || this.prestigeLevel <= 0);
    this.waveTotalEl.textContent = this.endless ? '/∞' : `/${totalStagesFor(this.prestigeLevel)}-${STAGE_LENGTH}`;
    this.setWave(this.waveNo);
    this.refreshPlay();
  }

  setPrep(wave: number, routes: number, enemies: number): void {
    this.waveTitle.textContent = `Wave ${this.waveName(wave)}`;
    this.waveBadge.textContent = 'Prepare';
    this.waveBadge.className = '';
    const boss = wave % 10 === 0;
    this.waveInfo.innerHTML =
      `${routes} route${routes === 1 ? '' : 's'} · ${enemies} enemies` +
      (boss ? ' · <span style="color:#ff9d8c">BOSS</span>' : '');
    this.waveNo = wave;
    this.prep = true;
    this.refreshPlay();
  }

  setFighting(wave: number, enemies: number): void {
    this.waveTitle.textContent = `Wave ${this.waveName(wave)}`;
    this.waveBadge.textContent = 'Fighting';
    this.waveBadge.className = 'fighting';
    this.waveInfo.textContent = `${enemies} enemies incoming`;
    this.waveNo = wave;
    this.prep = false;
    this.refreshPlay();
  }

  setRemaining(enemies: number): void {
    if (this.waveBadge.textContent === 'Fighting') {
      this.waveInfo.textContent = `${enemies} enemies remaining`;
    }
  }

  setPlacing(id: TowerId | null): void {
    for (const [cid, card] of this.cards) card.classList.toggle('active', cid === id);
    if (id) {
      const def = TOWERS.find((t) => t.id === id);
      this.placingName.textContent = def ? `· ${def.name}` : '';
    } else {
      this.placingName.textContent = '';
    }
  }

  showTower(info: TowerPanelInfo): void {
    this.current = info;
    this.selection.classList.remove('hidden');
    this.selection.innerHTML = `
      <div class="sel-head">
        <span class="sel-ico">${info.icon}</span>
        <div>
          <h3>${info.name}</h3>
          <p>Era ${ROMAN[info.era - 1]} · ${info.eraName} · Level ${info.level}</p>
        </div>
        <button class="sel-close" title="Close">✕</button>
      </div>
      <div class="sel-ability">${info.ability}</div>
      <div class="sel-stats">
        <div class="sel-stat"><span>Damage</span><b>${Math.round(info.damage)}</b></div>
        <div class="sel-stat"><span>Range</span><b>${info.range.toFixed(1)}</b></div>
        <div class="sel-stat"><span>Rate</span><b>${info.rate.toFixed(2)}/s</b></div>
        <div class="sel-stat"><span>Kills</span><b>${info.kills}</b></div>
      </div>
      <div class="sel-actions">
        <button class="upgrade${info.upgradeCost === null ? ' maxed' : ''}" id="upgradeBtn">
          ${info.upgradeCost === null ? 'Maximum level' : `Upgrade — 🪙 ${info.upgradeCost}`}
        </button>
        <button class="sell" id="sellBtn">Sell for 🪙 ${info.sellValue}</button>
      </div>`;

    this.selection.querySelector('.sel-close')?.addEventListener('click', () => this.h.onDeselect());
    this.selection.querySelector('#sellBtn')?.addEventListener('click', () => this.h.onSell());
    const upgradeBtn = this.selection.querySelector<HTMLButtonElement>('#upgradeBtn');
    upgradeBtn?.addEventListener('click', () => {
      if (upgradeBtn.disabled) return;
      this.h.onUpgrade();
    });
    this.refreshUpgrade();
  }

  refreshUpgrade(): void {
    if (!this.current) return;
    const btn = this.selection.querySelector<HTMLButtonElement>('#upgradeBtn');
    if (!btn) return;
    const cost = this.current.upgradeCost;
    const maxed = cost === null;
    btn.disabled = maxed || this.gold < (cost ?? 0);
    btn.classList.toggle('maxed', maxed || this.gold < (cost ?? 0));
  }

  hideTower(): void {
    this.current = null;
    this.selection.classList.add('hidden');
    this.selection.innerHTML = '';
    this.hideTowerPopup();
  }

  /** Short description card that floats above the selected turret. */
  showTowerPopup(def: TowerDef): void {
    this.popIcon.textContent = def.icon;
    this.popName.textContent = def.name;
    if (def.shelved) {
      this.popTier.innerHTML = 'Tier V · shelved — coming in a future update';
    } else {
      const era = ERAS[def.era - 1];
      this.popTier.innerHTML =
        `Era ${ROMAN[def.era - 1]} · ${era.name}` +
        `<span class="pop-stats">${def.ability} · 🪙 ${def.cost} · range ${def.range} · ${def.damage} dmg · ${def.fireRate.toFixed(2)}/s</span>`;
    }
    this.popDesc.textContent = def.desc;
    this.pop.classList.remove('hidden');
  }

  hideTowerPopup(): void {
    this.pop.classList.add('hidden');
  }

  /** Bar for the staged placement — the tower is only bought when this is confirmed. */
  showBuildConfirm(info: { name: string; cost: number; recall: boolean; affordable: boolean }): void {
    this.confirmLabel.textContent = info.recall
      ? `Recall ${info.name} here?`
      : `Build ${info.name} — ${info.cost} gold`;
    this.confirmBuild.textContent = info.recall ? 'Recall tower' : 'Confirm build';
    this.confirmBuild.disabled = !info.affordable;
    this.confirmBuild.title = info.affordable ? '' : 'Not enough gold';
    this.buildConfirm.classList.remove('hidden');
  }

  hideBuildConfirm(): void {
    this.buildConfirm.classList.add('hidden');
  }

  setStorage(items: { id: TowerId; level: number }[]): void {
    this.storageEl.classList.toggle('hidden', items.length === 0);
    this.storageCount.textContent = items.length ? `${items.length} stored` : '';
    this.storageList.innerHTML = '';
    items.forEach((item, index) => {
      const def = TOWERS.find((t) => t.id === item.id);
      if (!def) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stored';
      btn.title = `${def.name} · level ${item.level} — recall for free`;
      btn.innerHTML =
        `<span class="s-lv">L${item.level}</span>` +
        `<span class="s-ico">${def.icon}</span>` +
        `<span class="s-nm">${def.short}</span>`;
      btn.addEventListener('click', () => this.h.onRecall(index));
      this.storageList.appendChild(btn);
    });
  }

  showStageBanner(stage: number, waveIn: number): void {
    this.stageNum.textContent = String(stage);
    this.stageLabelEl.textContent = `${stage}-${waveIn}`;
    this.stagebanner.classList.remove('hidden', 'out');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => {
      this.stagebanner.classList.add('out');
      window.setTimeout(() => this.stagebanner.classList.add('hidden'), 600);
    }, 2400);
  }

  setBoss(name: string | null, ratio = 1): void {
    if (!name) {
      this.bossbar.classList.add('hidden');
      return;
    }
    this.bossbar.classList.remove('hidden');
    this.bossname.textContent = name;
    this.bossfill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }

  toast(message: string, kind: 'good' | 'bad' | '' = ''): void {
    const div = document.createElement('div');
    div.className = `toast ${kind}`.trim();
    div.textContent = message;
    this.toasts.appendChild(div);
    while (this.toasts.children.length > 4) this.toasts.removeChild(this.toasts.children[0]);
    window.setTimeout(() => {
      div.classList.add('out');
      window.setTimeout(() => div.remove(), 450);
    }, 2300);
  }

  showOverlay(title: string, text: string, offerPrestige = false, variant?: 'betch'): void {
    this.ovTitle.textContent = title;
    this.ovText.textContent = text;
    this.ovBtn.textContent = 'Play again';
    this.prestigeBtn.classList.toggle('hidden', !offerPrestige);
    this.overlay.classList.toggle('betch', variant === 'betch');
    this.overlay.classList.remove('hidden');
  }

  /** The bargain button: one press per run, then it stays spent. */
  setBetch(pressed: boolean): void {
    this.betchBtn.disabled = pressed;
    this.betchBtn.classList.toggle('pressed', pressed);
    this.betchBtn.textContent = pressed ? 'Betch: active' : "I'm a Betch";
  }

  flashBetchWarning(): void {
    this.betchWarn.classList.remove('hidden', 'flash');
    void this.betchWarn.offsetWidth;
    this.betchWarn.classList.add('flash');
    window.clearTimeout(this.betchTimer);
    this.betchTimer = window.setTimeout(() => this.betchWarn.classList.add('hidden'), 4200);
  }

  setPrestige(level: number): void {
    // longer campaigns as prestige climbs: 5-10, 10-10, 15-10, …
    this.waveTotalEl.textContent = this.endless ? '/∞' : `/${totalStagesFor(level)}-${STAGE_LENGTH}`;
    this.prestigeLevel = level;
    this.prestigePill.classList.toggle('hidden', level <= 0 || this.endless);
    this.prestigeVal.textContent = String(level);
    this.refreshEraLocks();
  }

  hideOverlay(): void {
    this.overlay.classList.add('hidden');
  }

  toggleHelp(open: boolean): void {
    this.help.classList.toggle('hidden', !open);
  }

  setSpeed(n: number): void {
    document.querySelectorAll<HTMLButtonElement>('.spd').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.spd) === n);
    });
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.pauseBtn.textContent = paused ? '▶' : '⏸';
    this.pauseBtn.classList.toggle('on', paused);
    this.refreshPlay();
  }
}
