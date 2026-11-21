// Owns the persistent player data and turns it into gameplay stats.

import {
  UPGRADE_BY_ID,
  UPGRADES,
  PRESTIGE_BY_ID,
  SPELL_BY_ID,
  SPELLS,
  CARD_PACK_BY_ID,
  RARITIES,
  RARITY_BY_ID,
  BASE_DAMAGE,
  BASE_HP,
  PRESTIGE_MIN_WAVE,
  crystalsForWave,
  prestigeCost,
  upgradeCost,
} from './config.js';

export class GameState {
  constructor(save) {
    this.data = save;
    this.listeners = new Set();
    if (!this.data.run) this.data.run = { wave: 0, best: 0 };
    if (typeof this.data.run.best !== 'number') this.data.run.best = this.data.run.wave || 0;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(type, payload) {
    for (const fn of this.listeners) fn(type, payload);
  }

  // --- Upgrade levels -------------------------------------------------------

  lvl(id) {
    return this.data.upgrades[id] || 0;
  }

  plvl(id) {
    return this.data.prestige.levels[id] || 0;
  }

  upgradeDef(id) {
    return UPGRADE_BY_ID[id];
  }

  upgradeCost(id) {
    const def = UPGRADE_BY_ID[id];
    if (!def) return Infinity;
    return upgradeCost(def, this.lvl(id));
  }

  upgradeMaxed(id) {
    const def = UPGRADE_BY_ID[id];
    return !!def && def.max !== undefined && this.lvl(id) >= def.max;
  }

  buyUpgrade(id) {
    const def = UPGRADE_BY_ID[id];
    if (!def || this.upgradeMaxed(id)) return { ok: false, reason: 'max' };
    const cost = this.upgradeCost(id);
    if (this.data.gold < cost) return { ok: false, reason: 'gold', cost };
    this.data.gold -= cost;
    this.data.upgrades[id] = this.lvl(id) + 1;
    this.emit('upgrade', { id, level: this.data.upgrades[id] });
    return { ok: true, cost };
  }

  // --- Spells and spell cards -----------------------------------------------

  spellLevel(id) {
    return this.data.spells.levels[id] || 0;
  }

  // Card level is the single source of truth: 0 cards means not yet unlocked.
  hasSpell(id) {
    return this.spellLevel(id) > 0;
  }

  spellMaxLevel(id) {
    const def = SPELL_BY_ID[id];
    return def ? def.maxLevel : 1;
  }

  spellMaxed(id) {
    return this.spellLevel(id) >= this.spellMaxLevel(id);
  }

  // Effective combat stats for a spell at a level (defaults to its own level).
  // Level 1 is exactly the printed base spell; every later card moves only the
  // stats in that spell's `scale` block.
  spellStats(id, atLevel) {
    const def = SPELL_BY_ID[id];
    if (!def) return null;
    const rawLevel = atLevel === undefined ? this.spellLevel(id) : atLevel;
    const level = Math.max(1, Math.min(this.spellMaxLevel(id), Math.floor(rawLevel) || 1));
    const step = level - 1;
    const sc = def.scale || {};
    const every = (n) => (n > 0 ? Math.floor(step / n) : 0);
    return {
      level,
      damage: this.damage * def.dmg * (1 + (sc.dmg !== undefined ? sc.dmg : 0.1) * step),
      cooldown:
        def.cooldown * this.cooldownMult * Math.max(0.4, 1 - (sc.cooldown !== undefined ? sc.cooldown : 0) * step),
      mana: def.mana || 0,
      aoe: def.aoe ? def.aoe * this.radiusMult * (1 + (sc.aoe || 0) * step) : 0,
      count: (def.count || 0) + every(sc.countEvery),
      targets: (def.targets || 0) + every(sc.targetsEvery),
      jumps: (def.jumps || 0) + every(sc.jumpsEvery),
      pierce: (def.pierce || 0) + every(sc.pierceEvery),
      slow: Math.min(0.8, (def.slow || 0) + (sc.slow || 0) * step),
      slowTime: (def.slowTime || 0) + (sc.slowTime || 0) * step,
      dot: (def.dot || 0) * (1 + (sc.dot || 0) * step),
      dotTime: (def.dotTime || 0) + (sc.dotTime || 0) * step,
      heal: (def.heal || 0) + (sc.heal || 0) * step,
      manaGain: (def.manaGain || 0) + (sc.manaGain || 0) * step,
      speed: def.speed || 0,
      delay: def.delay || 0,
    };
  }

  // Spells that can still take a card (everything below its tier cap).
  get drawableSpells() {
    return SPELLS.filter((s) => !this.spellMaxed(s.id));
  }

  // Total cards the collection can still absorb, so a pack never overcharges
  // by drawing fewer cards than it sold.
  get spellCapacity() {
    return SPELLS.reduce((sum, s) => sum + Math.max(0, s.maxLevel - this.spellLevel(s.id)), 0);
  }

  cardPool(rarityId) {
    return SPELLS.filter((s) => s.rarity === rarityId && !this.spellMaxed(s.id));
  }

  rollRarity() {
    const total = RARITIES.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * total;
    for (const rarity of RARITIES) {
      roll -= rarity.weight;
      if (roll <= 0) return rarity.id;
    }
    return RARITIES[RARITIES.length - 1].id;
  }

  // One card: pick a rarity by weight, then a spell from that rarity's pool.
  rollCard() {
    let pool = this.cardPool(this.rollRarity());
    // A fully maxed tier falls through to whatever can still take cards, so a
    // purchase is never wasted on a capped spell.
    if (!pool.length) pool = this.drawableSpells;
    if (!pool.length) return null;
    const def = pool[Math.floor(Math.random() * pool.length)];
    return { id: def.id, rarity: def.rarity };
  }

  // Cards are always applied immediately: first card unlocks (level 1), every
  // card after that raises the level, up to the rarity cap.
  applyCard(id) {
    const def = SPELL_BY_ID[id];
    if (!def) return { level: 0, isNew: false, maxed: false };
    const was = this.spellLevel(id);
    if (this.spellMaxed(id)) return { level: was, isNew: false, maxed: true };
    const level = was + 1;
    this.data.spells.levels[id] = level;
    if (!this.data.spells.unlocked.includes(id)) this.data.spells.unlocked.push(id);
    this.emit('spellCard', { id, level, isNew: was === 0 });
    return { level, isNew: was === 0, maxed: level >= this.spellMaxLevel(id) };
  }

  drawPrice(pack, currency) {
    return currency === 'gems' ? pack.gems : pack.gold;
  }

  // Charge, generate and apply in one synchronous transaction: cards can never
  // exist without payment, and payment can never happen without cards.
  drawCards(packId, currency = 'gold') {
    const pack = CARD_PACK_BY_ID[packId];
    if (!pack) return { ok: false, reason: 'pack' };
    const cur = currency === 'gems' ? 'gems' : 'gold';
    const price = this.drawPrice(pack, cur);
    if (!this.drawableSpells.length) return { ok: false, reason: 'maxed', pack };
    if (this.spellCapacity < pack.count) {
      return { ok: false, reason: 'capacity', pack, capacity: this.spellCapacity };
    }
    const balance = cur === 'gems' ? this.data.gems : this.data.gold;
    if (!(balance >= price)) return { ok: false, reason: cur, cost: price, pack };

    if (cur === 'gems') this.data.gems = Math.max(0, this.data.gems - price);
    else this.data.gold = Math.max(0, this.data.gold - price);

    const cards = [];
    for (let i = 0; i < pack.count; i++) {
      const card = this.rollCard();
      if (!card) break;
      const applied = this.applyCard(card.id);
      cards.push({ ...card, level: applied.level, isNew: applied.isNew, maxed: applied.maxed });
    }

    this.data.shop.draws += cards.length;
    if (cur === 'gems') this.data.shop.gemsSpent += price;
    else this.data.shop.goldSpent += price;
    this.emit('cardsDrawn', { cards, currency: cur, price, pack });
    return { ok: true, cards, price, currency: cur, pack };
  }

  addGems(amount) {
    const n = Math.max(0, Math.floor(amount));
    if (!n) return 0;
    this.data.gems += n;
    return n;
  }

  // --- Prestige -------------------------------------------------------------

  buyPrestige(id) {
    const def = PRESTIGE_BY_ID[id];
    if (!def) return { ok: false, reason: 'unknown' };
    const cost = prestigeCost(def, this.plvl(id));
    if (this.data.crystals < cost) return { ok: false, reason: 'crystals', cost };
    this.data.crystals -= cost;
    this.data.prestige.levels[id] = this.plvl(id) + 1;
    this.emit('prestigeUpgrade', { id, level: this.data.prestige.levels[id] });
    return { ok: true, cost };
  }

  get prestigeReady() {
    return (this.data.run.best || 0) >= PRESTIGE_MIN_WAVE;
  }

  get prestigeGain() {
    return crystalsForWave(this.data.run.best || 0);
  }

  doPrestige() {
    if (!this.prestigeReady) return { ok: false, reason: 'wave' };
    const gain = this.prestigeGain;
    if (gain <= 0) return { ok: false, reason: 'gain' };
    const gemGain = 5;
    this.data.crystals += gain;
    this.data.gems += gemGain;
    this.data.prestige.count += 1;
    this.data.prestige.totalCrystals += gain;
    this.data.gold = 0;
    this.data.upgrades = {};
    // The spell collection is permanent: cards are kept through ascension.
    this.data.run.wave = 0;
    this.data.run.best = 0;
    this.data.stats.prestiges += 1;
    this.emit('prestige', { gain, gemGain });
    return { ok: true, gain, gemGain };
  }

  // --- Derived combat stats -------------------------------------------------

  get damage() {
    const base = BASE_DAMAGE * (1 + 0.08 * this.lvl('damage'));
    return base * (1 + 0.12 * this.plvl('power'));
  }

  get cooldownMult() {
    const speed = 1 + 0.055 * this.lvl('attackSpeed') + 0.03 * this.plvl('haste');
    return 1 / speed;
  }

  get critChance() {
    return Math.min(0.6, 0.015 * this.lvl('critChance'));
  }

  get critMultiplier() {
    return 1.5 + 0.15 * this.lvl('critDamage');
  }

  get projectileSpeedMult() {
    return 1 + 0.05 * this.lvl('projectileSpeed');
  }

  get maxHealth() {
    return Math.round((BASE_HP + 12 * this.lvl('maxHealth')) * (1 + 0.08 * this.plvl('vitality')));
  }

  get manaRegen() {
    return 4.6 + 0.45 * this.lvl('manaRegen');
  }

  get manaMax() {
    return 120 + 8 * this.lvl('manaRegen');
  }

  get radiusMult() {
    return 1 + 0.025 * this.lvl('spellRadius');
  }

  get targetsPerVolley() {
    return 1 + this.lvl('multiTarget');
  }

  get goldMult() {
    return (1 + 0.04 * this.lvl('goldGain')) * (1 + 0.1 * this.plvl('fortune'));
  }

  get rewardMult() {
    return 1 + 0.05 * this.lvl('rewardMult');
  }

  get idleMult() {
    return (1 + 0.08 * this.lvl('idleMult')) * (1 + 0.12 * this.plvl('meditation'));
  }

  get offlineCapHours() {
    return 2 + this.plvl('offlineCap');
  }

  get startWave() {
    return 1 + 2 * this.plvl('headstart');
  }

  get lowFx() {
    return !!this.data.settings.lowFx;
  }

  spellDamage(id) {
    const stats = this.spellStats(id);
    return stats ? stats.damage : this.damage;
  }

  spellCooldown(id) {
    const stats = this.spellStats(id);
    return stats ? stats.cooldown : 1;
  }

  get allUpgrades() {
    return UPGRADES;
  }

  // Roll a new run while keeping permanent progress.
  beginRun() {
    this.data.run.wave = Math.max(0, this.startWave - 1);
    this.data.run.best = Math.max(0, this.data.run.wave);
    this.data.stats.runs += 1;
  }

  recordWave(wave) {
    this.data.run.wave = wave;
    if (wave > (this.data.run.best || 0)) this.data.run.best = wave;
    if (wave > (this.data.stats.bestWave || 0)) this.data.stats.bestWave = wave;
  }
}
