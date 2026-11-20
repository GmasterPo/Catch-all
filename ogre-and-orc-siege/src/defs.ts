import { TOTAL_WAVES } from './config';

// The tower catalog lives in its own module now that tower progress hangs off
// prestige eras. Re-exported here so the rest of the game keeps importing './defs'.
export * from './towers';

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

export type EnemyId =
  | 'goblin'
  | 'infiltrator'
  | 'orc'
  | 'warg'
  | 'troll'
  | 'ogre'
  | 'ogreking'
  | 'trollwarlord'
  | 'titan';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  /** Tiles per second. */
  speed: number;
  reward: number;
  radius: number;
  /** Fraction of physical damage ignored. */
  armor: number;
  /** Gate damage if it gets through. */
  lives: number;
  color: number;
  scale: number;
  boss?: boolean;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  goblin: { id: 'goblin', name: 'Goblin', hp: 34, speed: 2.3, reward: 8, radius: 0.34, armor: 0, lives: 1, color: 0x8db255, scale: 1 },
  orc: { id: 'orc', name: 'Orc', hp: 85, speed: 1.7, reward: 14, radius: 0.42, armor: 0.1, lives: 1, color: 0x5f8a3f, scale: 1.1 },
  warg: { id: 'warg', name: 'Warg Rider', hp: 70, speed: 3.3, reward: 12, radius: 0.4, armor: 0, lives: 1, color: 0x8a6b4a, scale: 1 },
  troll: { id: 'troll', name: 'Troll', hp: 260, speed: 1.25, reward: 32, radius: 0.58, armor: 0.22, lives: 2, color: 0x5c8f80, scale: 1.15 },
  ogre: { id: 'ogre', name: 'Ogre', hp: 520, speed: 1.05, reward: 58, radius: 0.7, armor: 0.3, lives: 3, color: 0xa47c4e, scale: 1.25 },
  infiltrator: { id: 'infiltrator', name: 'Infiltrator', hp: 170, speed: 2.0, reward: 26, radius: 0.42, armor: 0.05, lives: 2, color: 0x7a5ea8, scale: 1 },
  ogreking: { id: 'ogreking', name: 'Ogre King', hp: 4200, speed: 0.85, reward: 500, radius: 1.1, armor: 0.35, lives: 6, color: 0xb8843f, scale: 1.9, boss: true },
  trollwarlord: { id: 'trollwarlord', name: 'Troll Warlord', hp: 15000, speed: 0.8, reward: 1200, radius: 1.3, armor: 0.4, lives: 8, color: 0x4f7f7a, scale: 2.2, boss: true },
  titan: { id: 'titan', name: 'Siege Titan', hp: 42000, speed: 0.7, reward: 3000, radius: 1.6, armor: 0.45, lives: 12, color: 0x6b5b6e, scale: 2.7, boss: true },
};

export const ENEMY_ICON: Record<EnemyId, string> = {
  goblin: '👺',
  infiltrator: '🕵️',
  orc: '👹',
  warg: '🐺',
  troll: '🧟',
  ogre: '👺',
  ogreking: '👑',
  trollwarlord: '🪓',
  titan: '💀',
};

export function hpScale(wave: number): number {
  const t = wave - 1;
  // The first campaign (waves 1-50) keeps its original curve exactly. Past 5-10
  // that curve is frozen and growth continues linearly, then almost flat after
  // wave 150: tower damage stops at level 3, so health cannot compound forever.
  const early = Math.min(t, TOTAL_WAVES - 1);
  const late = t - early;
  return (
    1 +
    0.22 * early +
    0.014 * early * early +
    0.45 * Math.min(late, 100) +
    0.05 * Math.max(0, late - 100)
  );
}

/** Bosses keep their flat health through wave 50, then grow with the run so a
 *  deep-run boss is still a boss: ~14% of a wave's health at 10-10, ~45% at 50-10. */
export function bossHpScale(wave: number): number {
  return 1 + 0.025 * Math.max(0, wave - TOTAL_WAVES);
}

/**
 * Endless never flattens. The opening campaign waves feel exactly as they do in
 * the campaign, then health keeps climbing along a steeper line-plus-square, so
 * the wall comes from the horde rather than from the last wave of a stage.
 */
export function endlessHpScale(wave: number): number {
  const early = Math.min(wave - 1, TOTAL_WAVES - 1);
  const late = Math.max(0, wave - TOTAL_WAVES);
  return 1 + 0.22 * early + 0.014 * early * early + 0.55 * late + 0.005 * late * late;
}

/** Endless bosses match the campaign's flat health up to wave 50, then ride the
 *  trash curve measured from the 50-wave boss, so the first one is the same fight. */
export function endlessBossHpScale(wave: number): number {
  if (wave <= TOTAL_WAVES) return 1;
  return endlessHpScale(wave) / endlessHpScale(TOTAL_WAVES);
}

export function speedScale(wave: number): number {
  return Math.min(1.15, 1 + 0.004 * (wave - 1));
}

export function rewardScale(wave: number): number {
  return 1 + 0.06 * (wave - 1);
}

export interface GroupSpec {
  type: EnemyId;
  count: number;
  interval: number;
  delay: number;
}

export function bossForWave(wave: number): EnemyId {
  if (wave >= 30) return 'titan';
  if (wave >= 20) return 'trollwarlord';
  return 'ogreking';
}

export function makeWaveGroups(wave: number): GroupSpec[] {
  const boss = wave % 10 === 0;
  const f = boss ? 0.55 : 1;
  const groups: GroupSpec[] = [];

  const gob = Math.min(20, Math.round((4 + wave * 0.7) * f));
  const orc = Math.min(20, Math.round((2 + wave * 0.85) * f));
  const warg = wave >= 4 ? Math.min(14, Math.round((wave - 3) * 0.75 * f)) : 0;
  const troll = wave >= 7 ? Math.min(10, Math.round((wave - 6) * 0.7 * f)) : 0;
  const ogre = wave >= 11 ? Math.min(8, Math.round((wave - 10) * 0.55 * f)) : 0;
  // saboteurs appear from 2-2 and bring a couple more every stage
  const infil = wave >= 12 ? Math.min(6, 1 + Math.floor((wave - 12) / 12)) : 0;

  if (gob > 0) groups.push({ type: 'goblin', count: gob, interval: 0.55, delay: 0 });
  if (orc > 0) groups.push({ type: 'orc', count: orc, interval: 0.78, delay: 0.7 });
  if (warg > 0) groups.push({ type: 'warg', count: warg, interval: 0.85, delay: 1.5 });
  if (troll > 0) groups.push({ type: 'troll', count: troll, interval: 1.7, delay: 2.2 });
  if (ogre > 0) groups.push({ type: 'ogre', count: ogre, interval: 2.3, delay: 3.1 });
  if (infil > 0) groups.push({ type: 'infiltrator', count: infil, interval: 2.4, delay: 4.8 });
  if (boss) groups.push({ type: bossForWave(wave), count: 1, interval: 1, delay: 2.4 });

  return groups;
}

/** Endless waves: the campaign recipe, with the packs thickening for ever after. */
export function makeEndlessGroups(wave: number): GroupSpec[] {
  const groups = makeWaveGroups(wave);
  const extra = Math.max(0, Math.floor((wave - TOTAL_WAVES) / 10));
  if (extra === 0) return groups;
  for (const g of groups) {
    if (g.type === 'goblin') g.count = Math.min(28, g.count + extra);
    else if (g.type === 'orc') g.count = Math.min(26, g.count + extra);
  }
  return groups;
}

/** The wave's enemies for a mode. */
export function waveGroups(wave: number, endless: boolean): GroupSpec[] {
  return endless ? makeEndlessGroups(wave) : makeWaveGroups(wave);
}

export function countGroups(groups: GroupSpec[]): number {
  return groups.reduce((n, g) => n + g.count, 0);
}

export function waveEnemyCount(wave: number): number {
  return countGroups(makeWaveGroups(wave));
}

export function describeGroup(g: GroupSpec): string {
  return `${g.count}× ${ENEMIES[g.type].name}`;
}
