import { MAX_LEVEL } from './config';

/**
 * The tower catalog. Every tower belongs to a technological era, and an era is
 * opened by a prestige level — that is the single source of truth for what the
 * shop is allowed to sell.
 */

export type TowerId =
  // Era I — Primitive Defense (prestige 0)
  | 'archer'
  | 'cannon'
  | 'ballista'
  | 'frost'
  // Era II — Industrial Technology (prestige 1)
  | 'gatling'
  | 'mortar'
  | 'flame'
  | 'tesla'
  // Era III — Advanced Engineering (prestige 2)
  | 'sniper'
  | 'missile'
  | 'radar'
  | 'autocannon'
  // Era IV — Modern Warfare (prestige 3)
  | 'laser'
  | 'plasma'
  | 'emp'
  | 'accelerator'
  // Era V — Experimental Technology (prestige 4)
  | 'quantum'
  | 'singularity'
  | 'drone'
  | 'stormgen'
  // Shelved: Tier 5, kept in the catalog, never sold or placed
  | 'artillery';

export type ProjectileKind =
  | 'arrow'
  | 'bolt'
  | 'cannon'
  | 'shell'
  | 'bullet'
  | 'flame'
  | 'ice'
  | 'tesla'
  | 'sniper'
  | 'missile'
  | 'laser'
  | 'plasma'
  | 'emp'
  | 'accel'
  | 'quantum'
  | 'void'
  | 'drone'
  | 'storm'
  | 'artillery';

/** Which enemy a tower prefers: deepest along the lane, toughest, or closest. */
export type TargetMode = 'first' | 'strongest' | 'nearest';

/** A support field: nearby towers fire further and faster. */
export interface AuraSpec {
  range: number;
  rangeBoost: number;
  rateBoost: number;
}

export interface TowerDef {
  id: TowerId;
  name: string;
  short: string;
  /** Technological era, 1 (primitive) to 5 (experimental / future). */
  era: 1 | 2 | 3 | 4 | 5;
  /** Legacy tier designation, kept only by the shelved Artillery entry. */
  tier?: 5;
  cost: number;
  icon: string;
  desc: string;
  /** One-line combat role, shown in the shop and the tower panel. */
  ability: string;
  /** Range in tiles at level 1. */
  range: number;
  /** Damage per shot at level 1. */
  damage: number;
  /** Shots per second at level 1. */
  fireRate: number;
  kind: ProjectileKind;
  splash?: number;
  chain?: number;
  targets?: number;
  /** How many enemies a bolt punches through in a line. */
  pierce?: number;
  slow?: number;
  slowTime?: number;
  freeze?: number;
  burnDps?: number;
  burnTime?: number;
  projSpeed?: number;
  muzzle: number;
  /** Fraction of enemy armour the hit ignores. */
  armorPierce?: number;
  /** Energy weapons bypass armour entirely. */
  energy?: boolean;
  /** Half-angle of a cone attack, in radians. */
  cone?: number;
  /** Support field instead of a gun. */
  aura?: AuraSpec;
  /** Fires an instantaneous tracer rather than a projectile. */
  beam?: boolean;
  /** Tiles an enemy is dragged back along the lane. */
  pull?: number;
  /** Chance of a double-damage surge. */
  surge?: number;
  targeting?: TargetMode;
  /** Preserved for a future update: never purchasable, upgradable or placeable. */
  shelved?: boolean;
}

export interface EraDef {
  era: 1 | 2 | 3 | 4 | 5;
  /** Prestige level that opens the era. */
  prestige: number;
  name: string;
  blurb: string;
}

/** Prestige level that opens each era. The only unlock rule in the game. */
export const ERA_UNLOCK: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

export const ERAS: EraDef[] = [
  { era: 1, prestige: 0, name: 'Primitive Defense', blurb: 'Timber, stone and a steady hand.' },
  { era: 2, prestige: 1, name: 'Industrial Technology', blurb: 'Gears, steam and sustained fire.' },
  { era: 3, prestige: 2, name: 'Advanced Engineering', blurb: 'Precision weapons, radar and armour-piercing rounds.' },
  { era: 4, prestige: 3, name: 'Modern Warfare', blurb: 'Beams, plasma and electronic disruption.' },
  { era: 5, prestige: 4, name: 'Experimental Technology', blurb: 'Gravity, quanta and autonomous machines.' },
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** The era a prestige level is currently in — prestiges past 4 stay experimental. */
export function eraForPrestige(prestige: number): EraDef {
  const level = Math.max(0, Math.floor(prestige));
  return ERAS[Math.min(ERAS.length - 1, level)];
}

export const TOWERS: TowerDef[] = [
  // ---------------------------------------------------------------- Era I
  {
    id: 'archer',
    name: 'Archer Tower',
    short: 'Archer',
    era: 1,
    cost: 70,
    icon: '🏹',
    desc: 'A timber watchtower with a long bow. Cheap, quick, and the backbone of any first wall.',
    ability: 'Rapid single-target arrows',
    range: 9,
    damage: 11,
    fireRate: 2.4,
    kind: 'arrow',
    projSpeed: 44,
    muzzle: 2.15,
  },
  {
    id: 'cannon',
    name: 'Cannon Tower',
    short: 'Cannon',
    era: 1,
    cost: 120,
    icon: '💣',
    desc: 'A stone emplacement and a powder charge. Explosive shells scatter a small pack.',
    ability: 'Splash damage',
    range: 8.5,
    damage: 34,
    fireRate: 0.8,
    kind: 'cannon',
    splash: 1.5,
    projSpeed: 26,
    muzzle: 1.1,
  },
  {
    id: 'ballista',
    name: 'Ballista Tower',
    short: 'Ballista',
    era: 1,
    cost: 160,
    icon: '🎯',
    desc: 'A braced torsion bow throwing an iron bolt clean through a file of enemies.',
    ability: 'Bolt pierces 3 enemies',
    range: 12,
    damage: 62,
    fireRate: 0.45,
    kind: 'bolt',
    pierce: 3,
    projSpeed: 52,
    muzzle: 1.6,
  },
  {
    id: 'frost',
    name: 'Frost Tower',
    short: 'Frost',
    era: 1,
    cost: 130,
    icon: '❄️',
    desc: 'A runed pillar of river ice. Shards chill a walker and can hold the weak in place.',
    ability: 'Slows and briefly freezes',
    range: 9.5,
    damage: 12,
    fireRate: 1.4,
    kind: 'ice',
    slow: 0.5,
    slowTime: 2.4,
    freeze: 0.45,
    projSpeed: 32,
    muzzle: 1.9,
  },

  // --------------------------------------------------------------- Era II
  {
    id: 'gatling',
    name: 'Gatling Tower',
    short: 'Gatling',
    era: 2,
    cost: 260,
    icon: '🔫',
    desc: 'A hand-cranked rotator bank. Weak rounds alone, but the barrels spin up while it fires.',
    ability: 'Spin-up to 1.6× fire rate',
    range: 8,
    damage: 9,
    fireRate: 6,
    kind: 'bullet',
    projSpeed: 64,
    muzzle: 1.25,
  },
  {
    id: 'mortar',
    name: 'Mortar Tower',
    short: 'Mortar',
    era: 2,
    cost: 300,
    icon: '💥',
    desc: 'A rifled tube that lobs a heavy shell far down the lane and carpets the road where it lands.',
    ability: 'Long-range bombardment',
    range: 14,
    damage: 90,
    fireRate: 0.5,
    kind: 'shell',
    splash: 2.8,
    projSpeed: 22,
    muzzle: 1.35,
  },
  {
    id: 'flame',
    name: 'Flame Tower',
    short: 'Flame',
    era: 2,
    cost: 240,
    icon: '🔥',
    desc: 'A pressurised oil jet. Washes a cone of fire over everything close and leaves it burning.',
    ability: 'Cone of fire + burn',
    range: 7.5,
    damage: 20,
    fireRate: 2.2,
    kind: 'flame',
    cone: 0.55,
    burnDps: 18,
    burnTime: 3,
    muzzle: 1.7,
  },
  {
    id: 'tesla',
    name: 'Tesla Tower',
    short: 'Tesla',
    era: 2,
    cost: 380,
    icon: '⚡',
    desc: 'A copper coil fed by a steam dynamo. Lightning leaps from one body to the next.',
    ability: 'Chain lightning',
    range: 10,
    damage: 55,
    fireRate: 1,
    kind: 'tesla',
    chain: 3,
    muzzle: 2.35,
  },

  // -------------------------------------------------------------- Era III
  {
    id: 'sniper',
    name: 'Sniper Tower',
    short: 'Sniper',
    era: 3,
    cost: 520,
    icon: '🔭',
    desc: 'A long-barrelled precision rifle on a survey mount. Picks out the toughest target in reach.',
    ability: 'Hitscan the toughest target',
    range: 18,
    damage: 240,
    fireRate: 0.35,
    kind: 'sniper',
    beam: true,
    armorPierce: 0.5,
    targeting: 'strongest',
    muzzle: 1.55,
  },
  {
    id: 'missile',
    name: 'Missile Tower',
    short: 'Missile',
    era: 3,
    cost: 540,
    icon: '🚀',
    desc: 'A guided rack. Missiles steer into a moving target and detonate on contact.',
    ability: 'Tracking missiles',
    range: 12,
    damage: 85,
    fireRate: 0.7,
    kind: 'missile',
    splash: 2.2,
    projSpeed: 16,
    muzzle: 1.4,
  },
  {
    id: 'radar',
    name: 'Radar Tower',
    short: 'Radar',
    era: 3,
    cost: 240,
    icon: '📡',
    desc: 'A dish and a plotting table. No gun of its own: it feeds targets to every tower nearby.',
    ability: '+25% range, +20% fire rate near it',
    range: 8,
    damage: 0,
    fireRate: 0,
    kind: 'drone',
    muzzle: 1,
    aura: { range: 8, rangeBoost: 0.25, rateBoost: 0.2 },
  },
  {
    id: 'autocannon',
    name: 'Heavy Autocannon',
    short: 'Autocannon',
    era: 3,
    cost: 600,
    icon: '⚙️',
    desc: 'A belt-fed cannon with tungsten penetrators. Armour counts for very little against it.',
    ability: 'Ignores 60% of armour',
    range: 10,
    damage: 26,
    fireRate: 2.6,
    kind: 'bullet',
    armorPierce: 0.6,
    projSpeed: 62,
    muzzle: 1.2,
  },

  // --------------------------------------------------------------- Era IV
  {
    id: 'laser',
    name: 'Laser Tower',
    short: 'Laser',
    era: 4,
    cost: 900,
    icon: '🔆',
    desc: 'A solid-state emitter on a tracking gimbal. No shells, no travel time — just a held beam.',
    ability: 'Continuous beam damage',
    range: 11,
    damage: 26,
    fireRate: 5,
    kind: 'laser',
    beam: true,
    energy: true,
    muzzle: 1.9,
  },
  {
    id: 'plasma',
    name: 'Plasma Tower',
    short: 'Plasma',
    era: 4,
    cost: 760,
    icon: '💠',
    desc: 'A magnetically bottled plasma bolt. Energy burns straight through plate and bursts on impact.',
    ability: 'Energy blasts ignore armour',
    range: 11,
    damage: 95,
    fireRate: 0.55,
    kind: 'plasma',
    splash: 2.2,
    energy: true,
    projSpeed: 26,
    muzzle: 1.95,
  },
  {
    id: 'emp',
    name: 'EMP Tower',
    short: 'EMP',
    era: 4,
    cost: 680,
    icon: '🌀',
    desc: 'A capacitor bank that dumps its charge in a ring. Everything caught in it stops dead.',
    ability: 'Stuns a whole cluster',
    range: 9.5,
    damage: 18,
    fireRate: 0.35,
    kind: 'emp',
    splash: 3,
    freeze: 1.2,
    slow: 0.5,
    slowTime: 3,
    energy: true,
    muzzle: 2.2,
  },
  {
    id: 'accelerator',
    name: 'Accelerator Tower',
    short: 'Accelerator',
    era: 4,
    cost: 950,
    icon: '☄️',
    desc: 'A rail assembly that charges, then flings a slug down a straight line of bodies.',
    ability: 'Charged shot pierces 4',
    range: 15,
    damage: 170,
    fireRate: 0.3,
    kind: 'accel',
    pierce: 4,
    energy: true,
    projSpeed: 70,
    muzzle: 1.8,
  },

  // ---------------------------------------------------------------- Era V
  {
    id: 'quantum',
    name: 'Quantum Tower',
    short: 'Quantum',
    era: 5,
    cost: 1400,
    icon: '🔮',
    desc: 'A probability projector. Its shots exist in two damage states until they land.',
    ability: '30% chance of a double-damage surge',
    range: 12,
    damage: 60,
    fireRate: 0.85,
    kind: 'quantum',
    splash: 1.2,
    surge: 0.3,
    energy: true,
    projSpeed: 34,
    muzzle: 1.8,
  },
  {
    id: 'singularity',
    name: 'Singularity Tower',
    short: 'Singularity',
    era: 5,
    cost: 1600,
    icon: '🕳️',
    desc: 'A contained collapse. Its shell drags anything nearby back the way it came.',
    ability: 'Pulls enemies backwards along the lane',
    range: 12,
    damage: 34,
    fireRate: 0.4,
    kind: 'void',
    splash: 3.4,
    pull: 2.5,
    slow: 0.4,
    slowTime: 2,
    energy: true,
    projSpeed: 20,
    muzzle: 2,
  },
  {
    id: 'drone',
    name: 'Drone Nexus',
    short: 'Drone',
    era: 5,
    cost: 1500,
    icon: '🛸',
    desc: 'A hangar and three autonomous hunters. Each drone picks its own target.',
    ability: 'Three independent drones',
    range: 11,
    damage: 34,
    fireRate: 1.2,
    kind: 'drone',
    targets: 3,
    projSpeed: 30,
    muzzle: 2.4,
  },
  {
    id: 'stormgen',
    name: 'Storm Generator',
    short: 'Storm',
    era: 5,
    cost: 1500,
    icon: '🌩️',
    desc: 'An ioniser that seeds a thunderhead over the lane and calls down strike after strike.',
    ability: 'Sky-wide storm strikes',
    range: 13,
    damage: 90,
    fireRate: 0.45,
    kind: 'storm',
    targets: 5,
    energy: true,
    muzzle: 3,
  },

  // ------------------------------------------------------- Tier 5, shelved
  {
    id: 'artillery',
    name: 'Artillery',
    short: 'Artillery',
    era: 5,
    tier: 5,
    cost: 1500,
    icon: '🎆',
    desc: 'Artillery — coming in a future update. A command battery meant to blanket the whole field.',
    ability: 'Unreleased content',
    range: 44,
    damage: 33,
    fireRate: 0.2,
    kind: 'artillery',
    splash: 1.6,
    projSpeed: 30,
    muzzle: 2.4,
    shelved: true,
  },
];

export const TOWER_BY_ID: Record<TowerId, TowerDef> = Object.fromEntries(
  TOWERS.map((t) => [t.id, t]),
) as Record<TowerId, TowerDef>;

/** Towers the shop may sell: everything that is not shelved for a future update. */
export const ACTIVE_TOWERS: TowerDef[] = TOWERS.filter((t) => !t.shelved);

/** The one shelved tower, kept in the catalog so a future update can switch it on. */
export const SHELVED_TOWERS: TowerDef[] = TOWERS.filter((t) => t.shelved);

export const isShelved = (id: TowerId): boolean => !!TOWER_BY_ID[id]?.shelved;

/** Prestige level a tower needs. Shelved towers never unlock. */
export function towerUnlockPrestige(id: TowerId): number {
  const def = TOWER_BY_ID[id];
  if (!def || def.shelved) return Number.POSITIVE_INFINITY;
  return ERA_UNLOCK[def.era] ?? 0;
}

export function towerUnlocked(id: TowerId, prestige: number): boolean {
  return prestige >= towerUnlockPrestige(id);
}

/** Towers in an era, shelved ones included so the shop can show them as sealed. */
export const towersInEra = (era: number): TowerDef[] => TOWERS.filter((t) => t.era === era);

/**
 * Per-level multipliers, one entry per level up to MAX_LEVEL (10). Upgrades buy
 * damage and fire rate only — range never changes, so coverage stays a placement
 * decision rather than something gold can buy.
 */
export const LEVEL_DMG = [1, 1.22, 1.49, 1.82, 2.22, 2.71, 3.3, 4.03, 4.92, 6];
export const LEVEL_RANGE = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
export const LEVEL_RATE = [1, 1.07, 1.14, 1.23, 1.31, 1.4, 1.5, 1.61, 1.72, 1.84];

/** DPS multiplier for a tower level, used by the shop and the balance harness. */
export const levelDps = (level: number): number =>
  LEVEL_DMG[Math.min(LEVEL_DMG.length, Math.max(1, level)) - 1] *
  LEVEL_RATE[Math.min(LEVEL_RATE.length, Math.max(1, level)) - 1];

/**
 * Each upgrade costs more than the one before it: +25% per step, starting at
 * half the tower's build price. Level 10 costs ~14x the base tower in total.
 */
export function upgradeCost(def: TowerDef, level: number): number {
  return Math.round(def.cost * 0.5 * Math.pow(1.25, level - 1));
}

/**
 * Towers that left the catalog when the eras landed. A storage bin from an old
 * save keeps its towers: each old id is carried to the closest new technology,
 * so no player loses stored hardware to the restructure.
 */
export const LEGACY_TOWER_ID: Record<string, TowerId> = {
  barrage: 'archer',
  heavy: 'mortar',
  fire: 'flame',
  ice: 'frost',
  lava: 'plasma',
  doors: 'frost',
  inferno: 'plasma',
  storm: 'stormgen',
  siege: 'sniper',
  // Artillery used to be sellable; it is shelved now, so those bins hold a railgun instead
  artillery: 'accelerator',
};

/** Maps any stored tower id, old or new, onto a tower that exists today. */
export function migrateTowerId(raw: string): TowerId | null {
  if (raw in TOWER_BY_ID && !TOWER_BY_ID[raw as TowerId].shelved) return raw as TowerId;
  const mapped = LEGACY_TOWER_ID[raw];
  if (mapped && !TOWER_BY_ID[mapped].shelved) return mapped;
  return null;
}

/** Every id a save may legitimately contain after migration. */
export const ACTIVE_TOWER_IDS: TowerId[] = ACTIVE_TOWERS.map((t) => t.id);
