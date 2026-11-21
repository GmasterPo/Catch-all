// DOM layer: HUD, upgrade/card-shop/collection/prestige/settings panels, modals.

import {
  SPELLS,
  SPELL_BY_ID,
  CARD_PACKS,
  CARD_PACK_BY_ID,
  RARITIES,
  RARITY_BY_ID,
  UPGRADES,
  UPGRADE_CATEGORIES,
  PRESTIGE_UPGRADES,
  PRESTIGE_MIN_WAVE,
} from './config.js';
import { fmt, fmtTime } from './util.js';
import { liveIdleRate } from './idle.js';

const $ = (sel) => document.querySelector(sel);

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

const pct = (v) => `${Math.round(v * 100)}%`;

// Compact stat strip for a spell, driven only by its config + card level.
function statParts(def, st) {
  const parts = [`${fmt(Math.round(st.damage))} dmg`];
  if (st.aoe) parts.push(`${Math.round(st.aoe)} aoe`);
  if (st.count) parts.push(`${st.count} shots`);
  if (st.targets) parts.push(`${st.targets} targets`);
  if (st.jumps) parts.push(`${st.jumps} jumps`);
  if (st.pierce) parts.push(`pierce ${st.pierce}`);
  if (st.slow) parts.push(`-${pct(st.slow)} speed`);
  if (st.dot) parts.push(`${fmt(Math.round(st.damage * st.dot))}/s cloud`);
  if (st.heal) parts.push(`+${pct(st.heal)} hp`);
  if (st.manaGain) parts.push(`+${Math.round(st.manaGain)} mana`);
  parts.push(`${st.cooldown.toFixed(2)}s cd`);
  if (def.mana) parts.push(`${def.mana} mana`);
  return parts;
}

// Only the stats that actually change on the next card.
function statDelta(now, next) {
  const out = [];
  if (next.damage > now.damage + 0.05) out.push(`dmg ${fmt(Math.round(now.damage))} → ${fmt(Math.round(next.damage))}`);
  if (next.aoe > now.aoe + 0.05) out.push(`area ${Math.round(now.aoe)} → ${Math.round(next.aoe)}`);
  if (next.cooldown < now.cooldown - 0.0005) out.push(`cd ${now.cooldown.toFixed(2)} → ${next.cooldown.toFixed(2)}s`);
  if (next.count > now.count) out.push(`shots ${now.count} → ${next.count}`);
  if (next.targets > now.targets) out.push(`targets ${now.targets} → ${next.targets}`);
  if (next.jumps > now.jumps) out.push(`jumps ${now.jumps} → ${next.jumps}`);
  if (next.pierce > now.pierce) out.push(`pierce ${now.pierce} → ${next.pierce}`);
  if (next.slow > now.slow + 0.0005) out.push(`slow ${pct(now.slow)} → ${pct(next.slow)}`);
  if (next.slowTime > now.slowTime + 0.005) out.push(`chill ${now.slowTime.toFixed(1)} → ${next.slowTime.toFixed(1)}s`);
  if (next.dot > now.dot + 0.0005) out.push(`cloud ${Math.round(now.damage * now.dot)} → ${Math.round(next.damage * next.dot)}/s`);
  if (next.dotTime > now.dotTime + 0.005) out.push(`cloud ${now.dotTime.toFixed(1)} → ${next.dotTime.toFixed(1)}s`);
  if (next.heal > now.heal + 0.0005) out.push(`heal ${pct(now.heal)} → ${pct(next.heal)}`);
  if (next.manaGain > now.manaGain) out.push(`mana +${Math.round(now.manaGain)} → +${Math.round(next.manaGain)}`);
  if (!out.length) out.push('more power');
  return out;
}

export class UI {
  constructor({ state, audio }) {
    this.state = state;
    this.audio = audio;
    this.game = null;

    this.sheet = $('#sheet');
    this.sheetBody = $('#sheet-body');
    this.sheetTitle = $('#sheet-title');
    this.sheetCats = $('#sheet-cats');
    this.tab = null;
    this.cat = 'offense';
    this.shopView = 'draw';
    this.collRarity = 'all';
    this.collOwned = 'all';
    this.drawing = false;
    this.drawRoot = $('#draw-root');
    this.hudAcc = 0;
    this.stripEls = new Map();
    this.stripSig = '';
    this.deferredPrompt = null;

    this.el = {
      waveNum: $('#wave-num'),
      waveProgress: $('#wave-progress'),
      hpFill: $('#hp-fill'),
      hpText: $('#hp-text'),
      gold: $('#gold'),
      gems: $('#gems'),
      crystals: $('#crystals'),
      enemies: $('#enemy-count'),
      mana: $('#mana-text'),
      idle: $('#idle-rate'),
      bossBar: $('#boss-bar'),
      bossName: $('#boss-name'),
      bossFill: $('#boss-fill'),
      banner: $('#wave-banner'),
      prestigePill: $('#prestige-pill'),
      prestigeGain: $('#prestige-pill-gain'),
      pauseBtn: $('#btn-pause'),
      pausedOverlay: $('#paused-overlay'),
      resumeBtn: $('#btn-resume'),
      strip: $('#spell-strip'),
      modalRoot: $('#modal-root'),
      toastRoot: $('#toast-root'),
      installBtn: $('#btn-install'),
      tabs: Array.from(document.querySelectorAll('.tabs .tab')),
      speeds: Array.from(document.querySelectorAll('.speed')),
    };

    this.bind();
  }

  setGame(game) {
    this.game = game;
    this.buildSpellStrip(true);
  }

  bind() {
    this.el.tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audio.ui();
        const tab = btn.dataset.tab;
        const view = tab === 'spells' ? 'collection' : tab === 'shop' ? 'draw' : null;
        const showing =
          !this.sheet.hidden && (view ? this.tab === 'shop' && this.shopView === view : this.tab === tab);
        if (showing) this.closeSheet();
        else this.openSheet(tab);
      });
    });

    $('#sheet-close').addEventListener('click', () => {
      this.audio.ui();
      this.closeSheet();
    });

    this.el.speeds.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.game) return;
        this.game.setSpeed(Number(btn.dataset.speed));
        this.audio.ui();
      });
    });

    this.el.pauseBtn.addEventListener('click', () => {
      if (!this.game) return;
      this.game.togglePause();
      this.audio.ui();
    });

    this.el.resumeBtn.addEventListener('click', () => {
      if (!this.game) return;
      this.game.paused = false;
      this.syncPause();
      this.audio.ui();
    });

    this.el.prestigePill.addEventListener('click', () => {
      this.audio.ui();
      this.openSheet('prestige');
    });

    this.sheetBody.addEventListener('click', (ev) => {
      const catBtn = ev.target.closest('button[data-cat]');
      if (catBtn) {
        this.cat = catBtn.dataset.cat;
        this.audio.ui();
        this.renderSheet();
        return;
      }

      const buy = ev.target.closest('button[data-buy]');
      if (buy) {
        this.purchaseUpgrade(buy.dataset.buy);
        return;
      }

      const draw = ev.target.closest('button[data-draw]');
      if (draw) {
        this.handleDraw(draw.dataset.draw, draw.dataset.currency);
        return;
      }

      const view = ev.target.closest('button[data-view]');
      if (view) {
        this.shopView = view.dataset.view === 'collection' ? 'collection' : 'draw';
        this.audio.ui();
        this.syncTabHighlight();
        this.renderSheet();
        return;
      }

      const rarity = ev.target.closest('button[data-rarity]');
      if (rarity) {
        this.collRarity = rarity.dataset.rarity;
        this.audio.ui();
        this.renderSheet();
        return;
      }

      const owned = ev.target.closest('button[data-owned]');
      if (owned) {
        this.collOwned = owned.dataset.owned;
        this.audio.ui();
        this.renderSheet();
        return;
      }

      const pbuy = ev.target.closest('button[data-pbuy]');
      if (pbuy) {
        const res = this.state.buyPrestige(pbuy.dataset.pbuy);
        if (res.ok) {
          this.audio.upgrade();
          this.renderSheet();
          this.refreshAll();
        } else this.deny(res);
        return;
      }

      const ascend = ev.target.closest('button[data-ascend]');
      if (ascend) {
        this.showPrestigeConfirm();
        return;
      }

      const reset = ev.target.closest('button[data-reset-save]');
      if (reset) {
        this.showResetConfirm();
        return;
      }

      const install = ev.target.closest('button[data-install]');
      if (install) {
        this.promptInstall();
        return;
      }
    });

    this.sheetBody.addEventListener('input', (ev) => {
      const input = ev.target;
      if (input.id === 'vol-slider') {
        const v = Number(input.value) / 100;
        this.audio.setVolume(v);
        this.state.data.settings.volume = v;
        setText($('#vol-label'), `${Math.round(v * 100)}%`);
      }
    });

    this.sheetBody.addEventListener('change', (ev) => {
      const input = ev.target;
      if (input.id === 'set-mute') {
        this.audio.setMuted(input.checked);
        this.state.data.settings.muted = input.checked;
        this.syncAudioButtons();
      } else if (input.id === 'set-music') {
        this.state.data.settings.music = input.checked;
        if (input.checked) this.audio.startMusic();
        else this.audio.stopMusic();
      } else if (input.id === 'set-lowfx') {
        this.state.data.settings.lowFx = input.checked;
        this.game?.fx.setLowFx(input.checked);
      }
    });

    this.el.modalRoot.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-modal]');
      if (!btn) return;
      this.handleModalAction(btn.dataset.modal, btn);
    });

    if (this.drawRoot) {
      this.drawRoot.addEventListener('click', () => {
        if (this.drawing) this.closeReveal();
      });
    }

    if (window.matchMedia) {
      const dark = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (dark.matches) this.state.data.settings.lowFx = this.state.data.settings.lowFx || false;
    }

    window.addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      this.deferredPrompt = ev;
      if (this.el.installBtn) this.el.installBtn.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      if (this.el.installBtn) this.el.installBtn.hidden = true;
      this.toast('Arcane Ascension installed', 'gold');
    });

    if (window.matchMedia('(display-mode: standalone)').matches) {
      if (this.el.installBtn) this.el.installBtn.hidden = true;
    }
  }

  // --- HUD ------------------------------------------------------------------

  update(game, dt) {
    this.hudAcc += dt;
    if (this.hudAcc < 0.1) return;
    this.hudAcc = 0;
    const state = this.state;
    const waves = game.waves;

    setText(this.el.waveNum, String(Math.max(1, waves.wave)));
    setText(this.el.waveProgress, `${waves.spawned}/${waves.total || '–'}`);
    this.el.waveProgress.style.opacity = waves.total ? '0.75' : '0.3';

    const maxHp = state.maxHealth;
    const hpPct = Math.max(0, Math.min(1, game.hp / maxHp));
    this.el.hpFill.style.width = `${hpPct * 100}%`;
    this.el.hpFill.className = hpPct < 0.3 ? 'low' : hpPct < 0.6 ? 'mid' : '';
    setText(this.el.hpText, `${fmt(Math.ceil(game.hp))} / ${fmt(maxHp)}`);

    setText(this.el.gold, fmt(Math.floor(state.data.gold)));
    setText(this.el.gems, fmt(Math.floor(state.data.gems)));
    setText(this.el.crystals, fmt(state.data.crystals));

    const living = game.enemies.list.length;
    setText(this.el.enemies, String(living));
    setText(this.el.mana, `${Math.round(game.mana)}/${state.manaMax}`);
    setText(this.el.idle, fmt(Math.round(liveIdleRate(state))));

    if (game.boss && game.boss.alive) {
      this.el.bossBar.hidden = false;
      setText(this.el.bossName, game.boss.name);
      const frac = Math.max(0, game.boss.hp / game.boss.maxHp);
      this.el.bossFill.style.width = `${frac * 100}%`;
    } else {
      this.el.bossBar.hidden = true;
    }

    const ready = state.prestigeReady;
    this.el.prestigePill.hidden = !ready;
    if (ready) setText(this.el.prestigeGain, `+${state.prestigeGain} ✦`);

    // Spell strip cooldowns
    for (const [id, el] of this.stripEls) {
      const ground = el.querySelector('.cd');
      const cd = Math.max(0, game.spells.timers[id] || 0);
      const total = state.spellCooldown(id) || 1;
      const ratio = Math.min(1, cd / total);
      if (ground) {
        ground.style.height = `${ratio * 100}%`;
        ground.style.opacity = ratio > 0.01 ? '1' : '0';
      }
      el.classList.toggle('affordable', game.mana >= (SPELL_BY_ID[id]?.mana || 0));
    }

    // Keep the open sheet's affordability fresh without rebuilding it.
    if (!this.sheet.hidden) {
      if (this.tab === 'prestige') this.syncPrestigeAffordability();
      else this.syncSheetAffordability();
    }
  }

  syncSheetAffordability() {
    const state = this.state;
    const gold = state.data.gold;

    this.sheetBody.querySelectorAll('button[data-buy]').forEach((btn) => {
      const id = btn.dataset.buy;
      btn.disabled = gold < state.upgradeCost(id) || state.upgradeMaxed(id);
      btn.closest('.up-row')?.classList.toggle('can', !btn.disabled);
    });

    this.sheetBody.querySelectorAll('button[data-draw]').forEach((btn) => {
      const pack = CARD_PACK_BY_ID[btn.dataset.draw];
      if (!pack) return;
      const useGems = btn.dataset.currency === 'gems';
      const price = useGems ? pack.gems : pack.gold;
      const balance = useGems ? state.data.gems : gold;
      // Affordable draws stay clickable even when you are short, so the click
      // can report the exact shortfall instead of doing nothing.
      btn.disabled = this.drawing;
      btn.classList.toggle('cant', balance < price || !state.drawableSpells.length);
      btn.closest('.pack-row')?.classList.toggle('can', !btn.disabled && balance >= price);
    });

    const shopGold = $('#shop-gold');
    if (shopGold) setText(shopGold, fmt(Math.floor(gold)));
    const shopGems = $('#shop-gems');
    if (shopGems) setText(shopGems, fmt(Math.floor(state.data.gems)));
  }

  syncPrestigeAffordability() {
    const state = this.state;
    this.sheetBody.querySelectorAll('button[data-pbuy]').forEach((btn) => {
      const def = PRESTIGE_UPGRADES.find((p) => p.id === btn.dataset.pbuy);
      const cost = Math.ceil((def?.baseCost || 1) * Math.pow(def?.growth || 1.6, state.plvl(btn.dataset.pbuy)));
      const afford = state.data.crystals >= cost;
      btn.disabled = !afford;
      btn.closest('.up-row')?.classList.toggle('can', afford);
    });
  }

  refreshAll() {
    this.buildSpellStrip(true);
    if (!this.sheet.hidden) this.renderSheet();
    if (this.game) this.update(this.game, 1);
  }

  syncSpeed() {
    if (!this.game) return;
    this.el.speeds.forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === this.game.speed));
  }

  syncPause() {
    if (!this.game) return;
    this.el.pausedOverlay.hidden = !this.game.paused || this.game.defeat;
    this.el.pauseBtn.textContent = this.game.paused ? '▶' : '⏸';
    this.el.pauseBtn.classList.toggle('is-paused', this.game.paused);
  }

  waveBanner(text, boss) {
    const el = this.el.banner;
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('boss', !!boss);
    el.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }

  waveCleared(wave, bonus) {
    this.toast(`Wave ${wave} cleared · +${fmt(bonus)} gold`, 'gold');
  }

  // --- Spell strip ----------------------------------------------------------

  buildSpellStrip(force = false) {
    if (!this.el.strip) return;
    const owned = SPELLS.filter((s) => this.state.hasSpell(s.id));
    const sig = owned.map((s) => s.id).join(',');
    if (!force && sig === this.stripSig) return;
    this.stripSig = sig;
    this.stripEls.clear();
    this.el.strip.innerHTML = '';
    for (const spell of owned) {
      const btn = document.createElement('button');
      btn.className = 'spell-pip';
      btn.style.setProperty('--c', spell.color);
      btn.title = `${spell.name} — ${spell.mana} mana — ${spell.desc}`;
      btn.innerHTML = `<span class="cd"></span><span class="g">${spell.glyph}</span>`;
      btn.addEventListener('click', () => {
        this.audio.ui();
        this.openSheet('spells');
        setTimeout(() => {
          const card = this.sheetBody.querySelector(`[data-spell="${spell.id}"]`);
          card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 20);
      });
      this.el.strip.appendChild(btn);
      this.stripEls.set(spell.id, btn);
    }
  }

  // --- Sheet ----------------------------------------------------------------

  openSheet(tab) {
    // The dock's Spells button is the collection half of the card shop.
    if (tab === 'spells') {
      this.tab = 'shop';
      this.shopView = 'collection';
    } else {
      this.tab = tab;
      if (tab === 'shop') this.shopView = 'draw';
    }
    this.sheet.hidden = false;
    document.body.classList.add('sheet-open');
    this.syncTabHighlight();
    this.renderSheet();
  }

  syncTabHighlight() {
    const active = this.tab === 'shop' ? (this.shopView === 'collection' ? 'spells' : 'shop') : this.tab;
    this.el.tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === active));
  }

  closeSheet() {
    this.sheet.hidden = true;
    document.body.classList.remove('sheet-open');
    this.el.tabs.forEach((b) => b.classList.remove('active'));
    this.tab = null;
  }

  renderSheet() {
    if (!this.tab) return;
    const titles = {
      upgrades: 'Upgrades',
      shop: this.shopView === 'collection' ? 'Spell Collection' : 'Card Shop',
      prestige: 'Prestige',
      settings: 'Settings',
    };
    setText(this.sheetTitle, titles[this.tab] || 'Arcane Ascension');
    this.sheetCats.innerHTML = '';
    this.sheetCats.hidden = this.tab !== 'upgrades';

    if (this.tab === 'upgrades') this.renderUpgrades();
    else if (this.tab === 'shop') this.renderShop();
    else if (this.tab === 'prestige') this.renderPrestige();
    else this.renderSettings();
  }

  renderUpgrades() {
    this.sheetCats.hidden = false;
    this.sheetCats.innerHTML = UPGRADE_CATEGORIES.map(
      (c) =>
        `<button data-cat="${c.id}" class="${this.cat === c.id ? 'active' : ''}">${c.glyph} ${c.name}</button>`
    ).join('');

    const list = UPGRADES.filter((u) => u.category === this.cat);
    this.sheetBody.innerHTML = list.map((u) => this.upgradeRow(u)).join('');
  }

  upgradeRow(u) {
    const state = this.state;
    const lvl = state.lvl(u.id);
    const cost = state.upgradeCost(u.id);
    const maxed = state.upgradeMaxed(u.id);
    const afford = state.data.gold >= cost && !maxed;
    return `<div class="up-row ${afford ? 'can' : ''}">
      <div class="up-icon" style="--c:#c9a6ff">${u.glyph}</div>
      <div class="up-main">
        <div class="up-title">${u.name}<span class="lvl">Lv ${lvl}</span></div>
        <div class="up-desc">${u.desc}</div>
        <div class="up-now">${u.format(lvl)}</div>
        <div class="up-next">Next: ${u.format(lvl + 1)}</div>
      </div>
      <button class="buy" data-buy="${u.id}" ${afford ? '' : 'disabled'}>
        <span class="c glyph">◆</span>${maxed ? 'MAX' : fmt(cost)}
      </button>
    </div>`;
  }

  renderShop() {
    const state = this.state;
    const view = this.shopView;
    const seg = `<div class="shop-seg">
      <button data-view="draw" class="${view === 'draw' ? 'active' : ''}">Card Draw</button>
      <button data-view="collection" class="${view === 'collection' ? 'active' : ''}">Collection</button>
    </div>`;
    const hero = `<div class="shop-hero">
      <div class="shop-hero-top">
        <h3>${view === 'collection' ? 'Spell Collection' : 'Arcane Card Shop'}</h3>
        <div class="shop-balances">
          <span class="shop-bal gold">◆ <b id="shop-gold">${fmt(Math.floor(state.data.gold))}</b></span>
          <span class="shop-bal gem">❖ <b id="shop-gems">${fmt(Math.floor(state.data.gems))}</b></span>
        </div>
      </div>
      <p>${
        view === 'collection'
          ? `${SPELLS.filter((s) => state.hasSpell(s.id)).length} of ${SPELLS.length} spells collected. Duplicate cards raise levels.`
          : 'Draw spell cards. The first card unlocks a spell; every card after that raises its level.'
      }</p>
    </div>`;

    this.sheetBody.innerHTML = hero + seg + (view === 'collection' ? this.collectionHtml() : this.drawHtml());
  }

  drawHtml() {
    const state = this.state;
    const canDraw = state.drawableSpells.length > 0;
    const packs = CARD_PACKS.map((p) => {
      const goldOk = canDraw && state.data.gold >= p.gold;
      const gemOk = canDraw && state.data.gems >= p.gems;
      return `<div class="pack-row ${goldOk || gemOk ? 'can' : ''}">
        <div class="pack-info">
          <b>${p.name}</b>
          <span>${p.count} card${p.count > 1 ? 's' : ''}</span>
        </div>
        <div class="pack-buys">
          <button class="buy ${goldOk ? '' : 'cant'}" data-draw="${p.id}" data-currency="gold">
            <span class="c glyph">◆</span>${fmt(p.gold)}<small>gold</small>
          </button>
          <button class="buy gem-buy ${gemOk ? '' : 'cant'}" data-draw="${p.id}" data-currency="gems">
            <span class="c glyph">❖</span>${fmt(p.gems)}<small>gems</small>
          </button>
        </div>
      </div>`;
    }).join('');

    const odds = RARITIES.map(
      (r) => `<div class="odds-row" style="--c:${r.color}">
        <span class="odds-dot"></span>
        <span class="odds-name">${r.name}</span>
        <span class="odds-pct">${(r.weight * 100).toFixed(0)}%</span>
        <span class="odds-cap">max Lv ${r.maxLevel}</span>
      </div>`
    ).join('');

    return `<div class="pack-list">${packs}</div>
      <div class="section-label">Drop rates</div>
      <div class="odds">${odds}</div>
      <div class="section-label">How cards work</div>
      <ul class="shop-rules">
        <li>Each draw rolls a rarity by its rate, then a spell from that rarity's pool.</li>
        <li>A new spell unlocks at level 1; duplicate cards add levels up to that tier's cap.</li>
        <li>Cards apply the moment you pay — closing the shop during the reveal never loses them.</li>
      </ul>
      <div class="shop-actions">
        <button class="ghost-btn" data-view="collection">View collection</button>
      </div>`;
  }

  collectionHtml() {
    const state = this.state;
    const rarityChips = [{ id: 'all', name: 'All' }, ...RARITIES]
      .map(
        (r) =>
          `<button class="filter ${this.collRarity === r.id ? 'active' : ''}" data-rarity="${r.id}"${
            r.color ? ` style="--c:${r.color}"` : ''
          }>${r.name}</button>`
      )
      .join('');
    const ownedChips = [
      ['all', 'All'],
      ['owned', 'Owned'],
      ['locked', 'Locked'],
    ]
      .map(
        ([id, name]) =>
          `<button class="filter ${this.collOwned === id ? 'active' : ''}" data-owned="${id}">${name}</button>`
      )
      .join('');

    const list = SPELLS.filter((s) => this.collRarity === 'all' || s.rarity === this.collRarity).filter((s) =>
      this.collOwned === 'all' ? true : this.collOwned === 'owned' ? state.hasSpell(s.id) : !state.hasSpell(s.id)
    );
    const cards = list.length
      ? list.map((s) => this.collectionCard(s)).join('')
      : '<p class="shop-empty">No spells match this filter.</p>';

    return `<div class="filters">${rarityChips}</div>
      <div class="filters">${ownedChips}</div>
      <div class="coll-grid">${cards}</div>`;
  }

  collectionCard(s) {
    const state = this.state;
    const rarity = RARITY_BY_ID[s.rarity];
    const owned = state.hasSpell(s.id);
    const lvl = state.spellLevel(s.id);
    const maxed = owned && lvl >= s.maxLevel;
    const now = state.spellStats(s.id, owned ? lvl : 1);
    const next = state.spellStats(s.id, owned ? Math.min(lvl + 1, s.maxLevel) : 2);
    const delta = statDelta(now, next);
    const nextLine = maxed
      ? 'Maximum level reached'
      : owned
        ? `Next Lv ${lvl + 1}: ${delta.join(' · ')}`
        : `First card unlocks Lv 1 · next: ${delta.join(' · ')}`;

    return `<div class="coll-card rarity-${s.rarity} ${owned ? '' : 'locked'}" data-spell="${s.id}" style="--c:${rarity.color}">
      <div class="coll-head">
        <span class="coll-glyph" style="color:${s.color}">${s.glyph}</span>
        <div class="coll-titles">
          <div class="coll-name">${s.name}</div>
          <div class="coll-rarity">${rarity.name}</div>
        </div>
        <span class="coll-level">${owned ? `Lv ${lvl}` : 'Locked'}</span>
      </div>
      <div class="coll-desc">${s.desc}</div>
      <div class="coll-stats">${statParts(s, now)
        .map((p) => `<span>${p}</span>`)
        .join('')}</div>
      <div class="coll-next">${nextLine}</div>
    </div>`;
  }

  handleDraw(packId, currency) {
    if (this.drawing) return;
    const res = this.state.drawCards(packId, currency);
    if (!res.ok) {
      this.audio.deny();
      if (res.reason === 'gems') this.toast(`Not enough gems — need ❖${fmt(res.cost)}`, 'warn');
      else if (res.reason === 'gold') this.toast(`Not enough gold — need ◆${fmt(res.cost)}`, 'warn');
      else if (res.reason === 'maxed') this.toast('Every spell is at maximum level', 'warn');
      else if (res.reason === 'capacity')
        this.toast(`Only ${res.capacity} card slot${res.capacity === 1 ? '' : 's'} left — pick a smaller draw`, 'warn');
      else this.toast('That draw is unavailable', 'warn');
      return;
    }
    this.showReveal(res);
  }

  showReveal(result) {
    const root = this.drawRoot;
    if (!root) return;
    this.drawing = true;
    // Hold the arena while the player reads their cards (and resume after).
    this.resumeAfterReveal = !!this.game && !this.game.paused && !this.game.defeat;
    if (this.resumeAfterReveal) {
      this.game.paused = true;
      this.syncPause();
    }
    const cards = result.cards
      .map((card, i) => {
        const def = SPELL_BY_ID[card.id];
        const rarity = RARITY_BY_ID[card.rarity];
        return `<div class="draw-card rarity-${card.rarity}" style="--c:${rarity.color}; --i:${i}">
          <span class="draw-rarity">${rarity.name}</span>
          <span class="draw-glyph" style="color:${def.color}">${def.glyph}</span>
          <span class="draw-name">${def.name}</span>
          <span class="draw-tag ${card.isNew ? 'new' : ''}">${
            card.isNew ? 'New spell' : `Lv ${card.level}`
          }${card.maxed ? ' · MAX' : ''}</span>
        </div>`;
      })
      .join('');

    root.innerHTML = `<div class="draw-panel">
      <div class="draw-head">
        <b>${result.pack.count} card${result.pack.count > 1 ? 's' : ''} drawn</b>
        <span>-${result.currency === 'gems' ? '❖' : '◆'}${fmt(result.price)}</span>
      </div>
      <div class="draw-cards">${cards}</div>
      <button class="ascend draw-done" data-draw-done="1">Collect</button>
      <p class="draw-hint">Tap anywhere to continue</p>
    </div>`;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('open'));
    this.audio.upgrade();
    this.renderSheet();
    this.syncSheetAffordability();
  }

  closeReveal() {
    const root = this.drawRoot;
    this.drawing = false;
    if (this.resumeAfterReveal && this.game && !this.game.defeat) {
      this.game.paused = false;
      this.syncPause();
    }
    this.resumeAfterReveal = false;
    if (!root) return;
    root.classList.remove('open');
    root.hidden = true;
    root.innerHTML = '';
    this.refreshAll();
  }

  renderPrestige() {
    const state = this.state;
    const ready = state.prestigeReady;
    const gain = state.prestigeGain;
    const head = `<div class="prestige-hero">
      <div class="prestige-glow">✦</div>
      <h3>${ready ? 'The Rite Awaits' : `Reach wave ${PRESTIGE_MIN_WAVE}`}</h3>
      <p>${
        ready
          ? `Ascending resets your gold and upgrades, but keeps your spell cards and grants <b>${gain} arcane crystal${gain === 1 ? '' : 's'}</b> plus <b>5 ❖ gems</b>.`
          : `Survive to wave ${PRESTIGE_MIN_WAVE} to unlock ascension. Best this run: wave ${state.data.run.best || 0}.`
      }</p>
      <div class="prestige-line">Crystals held: <b>${fmt(state.data.crystals)}</b> · Ascensions: <b>${state.data.prestige.count}</b></div>
      <button class="ascend" data-ascend="1" ${ready ? '' : 'disabled'}>${ready ? `Ascend for ${gain} ✦` : 'Not yet ready'}</button>
    </div>`;

    const tree = PRESTIGE_UPGRADES.map((p) => {
      const lvl = state.plvl(p.id);
      const cost = Math.ceil(p.baseCost * Math.pow(p.growth, lvl));
      const afford = state.data.crystals >= cost;
      return `<div class="up-row ${afford ? 'can' : ''}">
        <div class="up-icon" style="--c:#f2c14e">${p.glyph}</div>
        <div class="up-main">
          <div class="up-title">${p.name}<span class="lvl">Lv ${lvl}</span></div>
          <div class="up-desc">${p.desc}</div>
          <div class="up-now">${p.format(lvl)}</div>
          <div class="up-next">Next: ${p.format(lvl + 1)}</div>
        </div>
        <button class="buy" data-pbuy="${p.id}" ${afford ? '' : 'disabled'}>
          <span class="c glyph">✦</span>${fmt(cost)}
        </button>
      </div>`;
    }).join('');

    this.sheetBody.innerHTML = head + `<div class="section-label">Permanent Ascension Tree</div>` + tree;
  }

  renderSettings() {
    const s = this.state.data.settings;
    const stats = this.state.data.stats;
    this.sheetBody.innerHTML = `
      <div class="set-block">
        <label class="set-row">
          <span>Sound</span>
          <input type="checkbox" id="set-mute" ${s.muted ? '' : 'checked'} />
        </label>
        <label class="set-row">
          <span>Music</span>
          <input type="checkbox" id="set-music" ${s.music ? 'checked' : ''} />
        </label>
        <label class="set-row column">
          <span>Volume <b id="vol-label">${Math.round(s.volume * 100)}%</b></span>
          <input type="range" id="vol-slider" min="0" max="100" value="${Math.round(s.volume * 100)}" />
        </label>
        <label class="set-row">
          <span>Reduced effects</span>
          <input type="checkbox" id="set-lowfx" ${s.lowFx ? 'checked' : ''} />
        </label>
      </div>

      <div class="section-label">Chronicle</div>
      <div class="stat-grid">
        <div><span>Best wave</span><b>${stats.bestWave || 0}</b></div>
        <div><span>Foes slain</span><b>${fmt(stats.killed)}</b></div>
        <div><span>Bosses</span><b>${fmt(stats.bosses)}</b></div>
        <div><span>Ascensions</span><b>${stats.prestiges}</b></div>
        <div><span>Gold earned</span><b>${fmt(stats.goldEarned)}</b></div>
        <div><span>Time played</span><b>${fmtTime(stats.playTime)}</b></div>
      </div>

      <div class="set-block">
        <button class="ghost-btn" data-install="1">⤓ Install as app</button>
        <button class="danger-btn" data-reset-save="1">Reset all progress</button>
      </div>
      <p class="fineprint">Arcane Ascension · your progress saves automatically on this device.</p>
    `;
  }

  purchaseUpgrade(id) {
    const res = this.state.buyUpgrade(id);
    if (res.ok) {
      this.audio.upgrade();
      this.game?.wizard.castSpell('#c9a6ff');
      this.renderSheet();
      this.refreshAll();
    } else {
      this.deny(res);
    }
  }

  deny(res) {
    this.audio.deny();
    if (res.reason === 'wave') this.toast('Reach a higher wave first', 'warn');
    else if (res.reason === 'gold') this.toast('Not enough gold', 'warn');
    else if (res.reason === 'crystals') this.toast('Not enough crystals', 'warn');
    else if (res.reason === 'max') this.toast('Already at maximum level', 'warn');
    else this.toast('Cannot do that yet', 'warn');
  }

  // --- Modals ---------------------------------------------------------------

  openModal(html, kind = '') {
    const wrap = document.createElement('div');
    wrap.className = `modal ${kind}`;
    wrap.innerHTML = `<div class="modal-card">${html}</div>`;
    this.el.modalRoot.appendChild(wrap);
    this.el.modalRoot.classList.add('open');
    requestAnimationFrame(() => wrap.classList.add('show'));
    return wrap;
  }

  closeModals() {
    this.el.modalRoot.innerHTML = '';
    this.el.modalRoot.classList.remove('open');
  }

  handleModalAction(action, btn) {
    if (action === 'close') {
      this.closeModals();
      this.audio.ui();
    } else if (action === 'retry') {
      this.closeModals();
      this.game?.restartRun();
      this.audio.ui();
    } else if (action === 'collect') {
      const amount = Number(btn.dataset.amount || 0);
      if (amount > 0) {
        this.state.data.gold += amount;
        this.state.data.stats.goldEarned += amount;
        this.audio.coin();
      }
      this.closeModals();
      this.refreshAll();
    } else if (action === 'prestige') {
      const res = this.state.doPrestige();
      this.closeModals();
      if (res.ok) {
        this.audio.prestige();
        this.state.beginRun();
        this.game?.startRun();
        this.refreshAll();
        this.toast(`Ascended · +${res.gain} ✦ · +${res.gemGain} ❖`, 'crystal');
      }
    } else if (action === 'reset') {
      localStorage.removeItem('arcane-ascension.save');
      location.reload();
    }
  }

  showDefeat() {
    if (!this.game) return;
    const state = this.state;
    const wave = this.game.waves.wave;
    const canPrestige = state.prestigeReady;
    this.openModal(
      `<div class="modal-glyph">☠</div>
      <h2>You Have Fallen</h2>
      <p class="modal-sub">The horde broke through at wave <b>${wave}</b>.</p>
      <div class="modal-stats">
        <div><span>Gold earned</span><b>${fmt(state.data.stats.goldEarned)}</b></div>
        <div><span>Foes slain</span><b>${fmt(state.data.stats.killed)}</b></div>
        <div><span>Best wave</span><b>${state.data.stats.bestWave}</b></div>
      </div>
      <p class="modal-note">${
        canPrestige
          ? `You can ascend for <b>${state.prestigeGain} ✦</b> arcane crystals, or rise again and push further.`
          : `Your gold and upgrades are kept. Rise again and push deeper.`
      }</p>
      <div class="modal-actions">
        <button class="ascend" data-modal="retry">Rise Again</button>
        ${canPrestige ? '<button class="ghost-btn" data-modal="close">Later</button>' : ''}
      </div>`,
      'defeat'
    );
  }

  showOffline(report) {
    this.openModal(
      `<div class="modal-glyph">☾</div>
      <h2>While You Were Away</h2>
      <p class="modal-sub">Your wards kept working for <b>${fmtTime(report.effective)}</b>${
        report.capped ? ` (capped at ${Math.round(report.capSeconds / 3600)}h)` : ''
      }.</p>
      <div class="modal-stats">
        <div><span>Gold gathered</span><b class="gold">${fmt(report.gold)}</b></div>
        <div><span>Foes repelled</span><b>${fmt(report.kills)}</b></div>
        <div><span>Idle rate</span><b>${fmt(report.rate)}/s</b></div>
      </div>
      <div class="modal-actions">
        <button class="ascend" data-modal="collect" data-amount="${report.gold}">Collect ${fmt(report.gold)} gold</button>
      </div>`,
      'offline'
    );
  }

  showPrestigeConfirm() {
    const state = this.state;
    const gain = state.prestigeGain;
    if (!state.prestigeReady) {
      this.toast(`Reach wave ${PRESTIGE_MIN_WAVE} to ascend`, 'warn');
      return;
    }
    this.openModal(
      `<div class="modal-glyph">✦</div>
      <h2>Begin the Rite?</h2>
      <p class="modal-sub">Ascension is permanent and cannot be undone.</p>
      <div class="modal-cols">
        <div><h4>You lose</h4><ul><li>All gold</li><li>Every upgrade level</li><li>Current wave progress</li></ul></div>
        <div><h4>You keep</h4><ul><li><b>Your spell cards</b></li><li><b>Your gems</b></li></ul></div>
        <div><h4>You gain</h4><ul><li><b>${gain} arcane crystals</b></li><li><b>5 ❖ gems</b></li><li>Permanent power tree</li></ul></div>
      </div>
      <div class="modal-actions">
        <button class="ascend" data-modal="prestige">Ascend now</button>
        <button class="ghost-btn" data-modal="close">Not yet</button>
      </div>`,
      'prestige'
    );
  }

  showResetConfirm() {
    this.openModal(
      `<div class="modal-glyph">⚠</div>
      <h2>Erase Everything?</h2>
      <p class="modal-sub">This deletes your gold, crystals, ascensions, upgrades and statistics from this device.</p>
      <div class="modal-actions">
        <button class="danger-btn" data-modal="reset">Yes, erase my save</button>
        <button class="ghost-btn" data-modal="close">Keep playing</button>
      </div>`,
      'danger'
    );
  }

  promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.final?.then?.(() => {});
      this.deferredPrompt = null;
      this.el.installBtn.hidden = true;
    } else {
      this.toast('Use your browser menu → “Add to Home screen”', 'gold');
    }
  }

  syncAudioButtons() {
    const s = this.state.data.settings;
    const mute = $('#set-mute');
    if (mute) mute.checked = !s.muted;
  }

  // --- Toasts ---------------------------------------------------------------

  toast(message, kind = '') {
    if (!this.el.toastRoot) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    this.el.toastRoot.appendChild(el);
    while (this.el.toastRoot.children.length > 4) {
      this.el.toastRoot.firstElementChild.remove();
    }
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }
}
