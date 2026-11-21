// Central balance table: stats, spells, upgrades, prestige tree, wave curves.

export const VIEW_RADIUS = 110;
export const CONTACT_RADIUS = 15.5;
export const BASE_DAMAGE = 20;
export const BASE_HP = 100;

export const ENEMY_TYPES = {
  slime: {
    id: 'slime',
    name: 'Slime',
    hp: 11,
    speed: 9.5,
    radius: 7.2,
    damage: 3,
    attackInterval: 1.25,
    reward: 5,
    armor: 0,
    color: '#6ef07a',
    minWave: 1,
    weight: 34,
  },
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    hp: 9,
    speed: 17,
    radius: 6.0,
    damage: 2.5,
    attackInterval: 1.0,
    reward: 5,
    armor: 0,
    color: '#c9d16a',
    minWave: 3,
    weight: 26,
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton',
    hp: 17,
    speed: 11,
    radius: 6.6,
    damage: 5,
    attackInterval: 1.3,
    reward: 8,
    armor: 0.05,
    color: '#e6e2d0',
    minWave: 5,
    weight: 26,
  },
  spider: {
    id: 'spider',
    name: 'Spider',
    hp: 13,
    speed: 21,
    radius: 6.4,
    damage: 4,
    attackInterval: 0.85,
    reward: 9,
    armor: 0,
    color: '#8b3fb0',
    minWave: 8,
    weight: 22,
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    hp: 42,
    speed: 7.6,
    radius: 9.0,
    damage: 9,
    attackInterval: 1.8,
    reward: 14,
    armor: 0.1,
    color: '#7fae4e',
    minWave: 11,
    weight: 18,
  },
  wraith: {
    id: 'wraith',
    name: 'Wraith',
    hp: 24,
    speed: 13.5,
    radius: 7.2,
    damage: 7,
    attackInterval: 1.4,
    reward: 12,
    armor: 0.15,
    color: '#a97bff',
    minWave: 15,
    weight: 16,
  },
  knight: {
    id: 'knight',
    name: 'Armored Knight',
    hp: 58,
    speed: 6.6,
    radius: 8.8,
    damage: 8,
    attackInterval: 1.7,
    reward: 19,
    armor: 0.35,
    color: '#8fa6c9',
    minWave: 20,
    weight: 14,
  },
  demon: {
    id: 'demon',
    name: 'Demon',
    hp: 54,
    speed: 9.2,
    radius: 9.2,
    damage: 12,
    attackInterval: 2.0,
    reward: 23,
    armor: 0.2,
    color: '#ff5a4e',
    minWave: 26,
    weight: 12,
    ranged: true,
  },
  boss: {
    id: 'boss',
    name: 'Arch Demon',
    hp: 340,
    speed: 4.6,
    radius: 17,
    damage: 20,
    attackInterval: 3.0,
    reward: 140,
    armor: 0.25,
    color: '#ff3b6b',
    minWave: 10,
    weight: 0,
    boss: true,
  },
};

export const BOSS_NAMES = [
  'Ashwarden, the Cinder King',
  'Nyxaria, Weaver of Dusk',
  'Molgrim, the Bone Titan',
  'Vaelith, Storm Devourer',
  'Kozrath, Herald of the Void',
  'Sableth, the Endless Maw',
];

// Spell definitions. `dmg` is a multiplier over the wizard's derived damage.
export const SPELLS = [
  {
    id: 'bolt',
    name: 'Arcane Bolt',
    glyph: '✦',
    desc: 'A swift bolt of focused mana. Free to cast, always available.',
    kind: 'bolt',
    unlockWave: 1,
    cost: 0,
    cooldown: 0.7,
    mana: 0,
    dmg: 1,
    speed: 210,
    color: '#7cf3ff',
    radius: 2.6,
    levels: true,
  },
  {
    id: 'fireball',
    name: 'Fireball',
    glyph: '✹',
    desc: 'Hurls a burning sphere that detonates for area damage.',
    kind: 'aoebolt',
    unlockWave: 4,
    cost: 220,
    cooldown: 2.3,
    mana: 4,
    dmg: 2.2,
    speed: 150,
    radius: 3.4,
    aoe: 24,
    color: '#ff9a3c',
    levels: true,
  },
  {
    id: 'icelance',
    name: 'Ice Lance',
    glyph: '❄',
    desc: 'Piercing shard of ice that chills everything it passes through.',
    kind: 'lance',
    unlockWave: 8,
    cost: 900,
    cooldown: 2.0,
    mana: 5,
    dmg: 2.6,
    speed: 300,
    radius: 2.8,
    pierce: 3,
    slow: 0.45,
    slowTime: 2.4,
    color: '#a9e6ff',
    levels: true,
  },
  {
    id: 'nova',
    name: 'Arcane Nova',
    glyph: '◉',
    desc: 'Releases a ring of force that scorches everything nearby.',
    kind: 'nova',
    unlockWave: 11,
    cost: 2600,
    cooldown: 3.2,
    mana: 7,
    dmg: 1.9,
    aoe: 46,
    color: '#c084fc',
    levels: true,
  },
  {
    id: 'chain',
    name: 'Chain Lightning',
    glyph: '⚡',
    desc: 'Arcs between foes, losing a little power with every jump.',
    kind: 'chain',
    unlockWave: 14,
    cost: 6500,
    cooldown: 2.6,
    mana: 9,
    dmg: 1.7,
    jumps: 4,
    jumpRange: 42,
    color: '#ffe066',
    levels: true,
  },
  {
    id: 'poison',
    name: 'Poison Orb',
    glyph: '☣',
    desc: 'Bursts into a caustic cloud that eats away at anything inside.',
    kind: 'cloud',
    unlockWave: 17,
    cost: 15000,
    cooldown: 3.6,
    mana: 10,
    dmg: 0.9,
    dot: 0.55,
    dotTime: 5,
    aoe: 26,
    speed: 145,
    radius: 3.6,
    color: '#9bf25a',
    levels: true,
  },
  {
    id: 'frostnova',
    name: 'Frost Nova',
    glyph: '❅',
    desc: 'A wave of frost that freezes the arena and slows all it touches.',
    kind: 'nova',
    unlockWave: 20,
    cost: 30000,
    cooldown: 6.0,
    mana: 13,
    dmg: 1.35,
    aoe: 62,
    slow: 0.55,
    slowTime: 3.5,
    color: '#9fe8ff',
    levels: true,
  },
  {
    id: 'barrage',
    name: 'Magic Missile Barrage',
    glyph: '⁂',
    desc: 'Fires a volley of homing missiles at every nearby target.',
    kind: 'barrage',
    unlockWave: 23,
    cost: 60000,
    cooldown: 3.0,
    mana: 12,
    dmg: 1.15,
    count: 5,
    speed: 230,
    radius: 2.4,
    color: '#ff7ce0',
    levels: true,
  },
  {
    id: 'meteor',
    name: 'Meteor',
    glyph: '☄',
    desc: 'Calls a burning rock from the sky onto the thickest cluster of foes.',
    kind: 'meteor',
    unlockWave: 26,
    cost: 120000,
    cooldown: 5.2,
    mana: 15,
    dmg: 5.5,
    aoe: 34,
    delay: 0.75,
    color: '#ff5a2a',
    levels: true,
  },
  {
    id: 'souldrain',
    name: 'Soul Drain',
    glyph: '☽',
    desc: 'Siphons life from the nearest foes, restoring health and mana.',
    kind: 'drain',
    unlockWave: 30,
    cost: 260000,
    cooldown: 4.2,
    mana: 8,
    dmg: 3.2,
    targets: 2,
    heal: 0.02,
    manaGain: 26,
    color: '#b06bff',
    levels: true,
  },
  {
    id: 'voidpulse',
    name: 'Void Pulse',
    glyph: '◈',
    desc: 'A pulsing shockwave of void energy that shreds the horde.',
    kind: 'nova',
    unlockWave: 34,
    cost: 520000,
    cooldown: 6.4,
    mana: 20,
    dmg: 4.4,
    aoe: 74,
    color: '#8a4bff',
    levels: true,
  },
  {
    id: 'runestorm',
    name: 'Rune Storm',
    glyph: '✶',
    desc: 'The endgame barrage. Runes rain from the sky across the arena.',
    kind: 'storm',
    unlockWave: 40,
    cost: 1200000,
    cooldown: 7.5,
    mana: 26,
    dmg: 3.0,
    count: 10,
    aoe: 16,
    delay: 0.9,
    color: '#ffe9a8',
    levels: true,
  },
];

// --- Spell cards: rarity tiers, drop weights and per-level scaling -----------
//
// A spell joins a rarity pool through SPELL_RARITY. Anything without an entry
// falls back to Common, so adding a new spell needs no shop changes. Each spell
// scales only the stats listed in its `scale` block, which keeps its identity
// (a damage nuke never turns into a slow field, and vice versa).

export const RARITIES = [
  { id: 'common', name: 'Common', weight: 0.6, maxLevel: 30, color: '#9fb2c9', glow: 'rgba(159, 178, 201, 0.45)' },
  { id: 'uncommon', name: 'Uncommon', weight: 0.25, maxLevel: 24, color: '#5fd48a', glow: 'rgba(95, 212, 138, 0.5)' },
  { id: 'rare', name: 'Rare', weight: 0.1, maxLevel: 20, color: '#5aa8ff', glow: 'rgba(90, 168, 255, 0.55)' },
  { id: 'epic', name: 'Epic', weight: 0.04, maxLevel: 16, color: '#c77dff', glow: 'rgba(199, 125, 255, 0.6)' },
  { id: 'legendary', name: 'Legendary', weight: 0.01, maxLevel: 12, color: '#ffb648', glow: 'rgba(255, 182, 72, 0.7)' },
];

export const RARITY_BY_ID = Object.fromEntries(RARITIES.map((r) => [r.id, r]));

export const SPELL_RARITY = {
  bolt: 'common',
  fireball: 'common',
  icelance: 'common',
  nova: 'uncommon',
  chain: 'uncommon',
  poison: 'uncommon',
  frostnova: 'rare',
  barrage: 'rare',
  meteor: 'epic',
  souldrain: 'epic',
  voidpulse: 'legendary',
  runestorm: 'legendary',
};

// Per-level deltas. `dmg` is a fraction of base damage per level; `*Every`
// grants one extra projectile/jump/target every N levels.
const SPELL_SCALE = {
  bolt: { dmg: 0.1, cooldown: 0.008 },
  fireball: { dmg: 0.09, aoe: 0.02, cooldown: 0.006 },
  icelance: { dmg: 0.1, cooldown: 0.006, pierceEvery: 4, slow: 0.008, slowTime: 0.12 },
  nova: { dmg: 0.1, aoe: 0.03, cooldown: 0.008 },
  chain: { dmg: 0.09, cooldown: 0.006, jumpsEvery: 3 },
  poison: { dmg: 0.08, aoe: 0.025, dot: 0.09, dotTime: 0.2 },
  frostnova: { dmg: 0.1, aoe: 0.03, cooldown: 0.008, slow: 0.01, slowTime: 0.14 },
  barrage: { dmg: 0.08, cooldown: 0.006, countEvery: 3 },
  meteor: { dmg: 0.12, aoe: 0.025, cooldown: 0.008 },
  souldrain: { dmg: 0.1, targetsEvery: 4, manaGain: 4, heal: 0.003 },
  voidpulse: { dmg: 0.13, aoe: 0.03, cooldown: 0.01 },
  runestorm: { dmg: 0.11, aoe: 0.02, cooldown: 0.008, countEvery: 4 },
};

for (const spell of SPELLS) {
  spell.rarity = SPELL_RARITY[spell.id] || 'common';
  spell.scale = { dmg: 0.1, ...(SPELL_SCALE[spell.id] || {}) };
  spell.maxLevel = (RARITY_BY_ID[spell.rarity] || RARITIES[0]).maxLevel;
}

export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

// Card packs. Every pack costs exactly 1,000 gold or 25 gems per card, so no
// pack is cheaper per card than another (no discounts).
export const CARD_PACKS = [
  { id: 'single', name: 'Single Draw', count: 1, gold: 1000, gems: 25 },
  { id: 'five', name: '5 Card Draw', count: 5, gold: 5000, gems: 125 },
  { id: 'ten', name: '10 Card Draw', count: 10, gold: 10000, gems: 250 },
];

export const CARD_PACK_BY_ID = Object.fromEntries(CARD_PACKS.map((p) => [p.id, p]));

export const UPGRADE_CATEGORIES = [
  { id: 'offense', name: 'Offensive', glyph: '⚔' },
  { id: 'defense', name: 'Defensive', glyph: '⛨' },
  { id: 'magic', name: 'Magical', glyph: '✧' },
  { id: 'economy', name: 'Economy', glyph: '◆' },
  { id: 'idle', name: 'Idle', glyph: '☾' },
];

// `value(level)` returns the total effect at that level; `next` text is UI copy.
export const UPGRADES = [
  {
    id: 'damage',
    name: 'Spell Damage',
    glyph: '✹',
    category: 'offense',
    desc: 'Raw power behind every spell you cast.',
    baseCost: 35,
    growth: 1.145,
    value: (l) => 1 + 0.08 * l,
    format: (l) => `+${Math.round(8 * l)}% damage`,
  },
  {
    id: 'attackSpeed',
    name: 'Attack Speed',
    glyph: '⏱',
    category: 'offense',
    desc: 'Shortens the cooldown of every spell.',
    baseCost: 50,
    growth: 1.155,
    value: (l) => 1 / (1 + 0.055 * l),
    format: (l) => `+${Math.round(5.5 * l)}% cast speed`,
  },
  {
    id: 'critChance',
    name: 'Critical Chance',
    glyph: '◈',
    category: 'offense',
    desc: 'Chance for a spell to strike critically.',
    baseCost: 80,
    growth: 1.17,
    max: 38,
    value: (l) => Math.min(0.6, 0.015 * l),
    format: (l) => `${(1.5 * l).toFixed(1)}% crit chance`,
  },
  {
    id: 'critDamage',
    name: 'Critical Damage',
    glyph: '✦',
    category: 'offense',
    desc: 'How much extra damage a critical strike deals.',
    baseCost: 95,
    growth: 1.165,
    value: (l) => 1.5 + 0.15 * l,
    format: (l) => `+${Math.round(15 * l)}% crit damage`,
  },
  {
    id: 'projectileSpeed',
    name: 'Projectile Speed',
    glyph: '➤',
    category: 'offense',
    desc: 'Spells travel faster, landing hits sooner.',
    baseCost: 28,
    growth: 1.115,
    value: (l) => 1 + 0.05 * l,
    format: (l) => `+${Math.round(5 * l)}% travel speed`,
  },
  {
    id: 'multiTarget',
    name: 'Multi-Target',
    glyph: '⋔',
    category: 'magic',
    desc: 'Each volley strikes one additional foe.',
    baseCost: 260,
    growth: 1.55,
    value: (l) => 1 + l,
    format: (l) => `${1 + l} target${l ? 's' : ''} per volley`,
  },
  {
    id: 'maxHealth',
    name: 'Wizard Health',
    glyph: '❤',
    category: 'defense',
    desc: 'Raises the wizard\u2019s maximum health.',
    baseCost: 45,
    growth: 1.135,
    value: (l) => 12 * l,
    format: (l) => `+${12 * l} max health`,
  },
  {
    id: 'manaRegen',
    name: 'Mana Regeneration',
    glyph: '✧',
    category: 'magic',
    desc: 'Restores mana faster so stronger spells keep firing.',
    baseCost: 42,
    growth: 1.135,
    value: (l) => 0.35 * l,
    format: (l) => `+${(0.35 * l).toFixed(2)} mana/s`,
  },
  {
    id: 'spellRadius',
    name: 'Spell Radius',
    glyph: '◎',
    category: 'magic',
    desc: 'Widens the area of every explosion and nova.',
    baseCost: 65,
    growth: 1.15,
    value: (l) => 1 + 0.025 * l,
    format: (l) => `+${(2.5 * l).toFixed(1)}% spell radius`,
  },
  {
    id: 'goldGain',
    name: 'Gold Generation',
    glyph: '◆',
    category: 'economy',
    desc: 'Increases the gold dropped by every foe.',
    baseCost: 55,
    growth: 1.14,
    value: (l) => 1 + 0.04 * l,
    format: (l) => `+${Math.round(4 * l)}% gold`,
  },
  {
    id: 'rewardMult',
    name: 'Enemy Reward',
    glyph: '✧',
    category: 'economy',
    desc: 'Bonus gold from kills and wave clears.',
    baseCost: 110,
    growth: 1.155,
    value: (l) => 1 + 0.05 * l,
    format: (l) => `+${Math.round(5 * l)}% rewards`,
  },
  {
    id: 'idleMult',
    name: 'Idle Reward',
    glyph: '☾',
    category: 'idle',
    desc: 'Boosts gold earned while you are away or resting.',
    baseCost: 190,
    growth: 1.16,
    value: (l) => 1 + 0.08 * l,
    format: (l) => `+${Math.round(8 * l)}% idle gold`,
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export const PRESTIGE_MIN_WAVE = 25;

export const PRESTIGE_UPGRADES = [
  {
    id: 'power',
    name: 'Arcanic Power',
    glyph: '✹',
    desc: 'Permanent bonus to all spell damage.',
    baseCost: 1,
    growth: 1.6,
    value: (l) => 1 + 0.12 * l,
    format: (l) => `+${Math.round(12 * l)}% damage`,
  },
  {
    id: 'haste',
    name: 'Temporal Flow',
    glyph: '⏱',
    desc: 'Permanent bonus to casting speed.',
    baseCost: 2,
    growth: 1.65,
    value: (l) => 0.03 * l,
    format: (l) => `+${Math.round(3 * l)}% cast speed`,
  },
  {
    id: 'vitality',
    name: 'Eternal Vigor',
    glyph: '❤',
    desc: 'Permanent bonus to maximum health.',
    baseCost: 2,
    growth: 1.7,
    value: (l) => 1 + 0.08 * l,
    format: (l) => `+${Math.round(8 * l)}% health`,
  },
  {
    id: 'fortune',
    name: 'Golden Fate',
    glyph: '◆',
    desc: 'Permanent bonus to gold from every source.',
    baseCost: 3,
    growth: 1.6,
    value: (l) => 1 + 0.1 * l,
    format: (l) => `+${Math.round(10 * l)}% gold`,
  },
  {
    id: 'meditation',
    name: 'Deep Meditation',
    glyph: '☾',
    desc: 'Permanent bonus to idle and offline earnings.',
    baseCost: 2,
    growth: 1.55,
    value: (l) => 1 + 0.12 * l,
    format: (l) => `+${Math.round(12 * l)}% idle gold`,
  },
  {
    id: 'headstart',
    name: 'Head Start',
    glyph: '⚑',
    desc: 'Begin every new run at a higher wave.',
    baseCost: 5,
    growth: 2.1,
    value: (l) => 2 * l,
    format: (l) => `start at wave ${1 + 2 * l}`,
  },
  {
    id: 'offlineCap',
    name: 'Lingering Presence',
    glyph: '⌛',
    desc: 'Extends the time offline rewards can accumulate.',
    baseCost: 4,
    growth: 1.8,
    value: (l) => l,
    format: (l) => `+${l}h offline cap`,
  },
];

export const PRESTIGE_BY_ID = Object.fromEntries(PRESTIGE_UPGRADES.map((p) => [p.id, p]));

// --- Wave and economy curves -------------------------------------------------

export function hpScale(wave) {
  const w = Math.max(0, wave - 1);
  return 1 + 0.16 * w + 0.003 * w * w;
}

export function speedScale(wave) {
  return Math.min(1.45, 1 + 0.011 * Math.max(0, wave - 1));
}

export function rewardScale(wave) {
  return 1 + 0.16 * Math.max(0, wave - 1);
}

export function waveEnemyCount(wave) {
  return Math.min(56, 4 + Math.floor(wave * 0.9));
}

export function spawnInterval(wave) {
  return Math.max(0.24, 0.95 - wave * 0.018);
}

export function waveClearBonus(wave) {
  return Math.floor((18 + wave * 9) * (1 + wave * 0.05));
}

export function isBossWave(wave) {
  return wave > 0 && wave % 10 === 0;
}

export function crystalsForWave(wave) {
  const over = Math.max(0, wave - 10);
  return Math.floor(Math.pow(over / 6, 1.4));
}

export function bossNamesForWave(wave) {
  return BOSS_NAMES[Math.floor(wave / 10 - 1) % BOSS_NAMES.length];
}

export function upgradeCost(def, level) {
  return Math.ceil(def.baseCost * Math.pow(def.growth, level));
}

export function prestigeCost(def, level) {
  return Math.ceil(def.baseCost * Math.pow(def.growth, level));
}

// Gold per second earned while the game is closed (before idle multipliers).
export function idleGoldPerSecond(wave) {
  const w = Math.max(1, wave);
  return 1.2 + w * 0.62 + Math.pow(w, 1.35) * 0.06;
}
