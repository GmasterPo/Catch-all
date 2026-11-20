/** Which run the board is playing, each on its own board. */
export type GameMode = 'campaign' | 'endless';

/** Battlefield grid dimensions (x: west→east, z: north→south).
 *  The opening campaign plays on the small field; prestige 3 opens the big one. */
export let GRID_X = 35;
export let GRID_Z = 25;
export let HALF_X = GRID_X / 2;
export let HALF_Z = GRID_Z / 2;

export const SMALL_MAP = { x: 35, z: 25 } as const;
export const BIG_MAP = { x: 45, z: 45 } as const;
/** Endless gets the largest field: room for six portals and six static lanes. */
export const ENDLESS_MAP = { x: 50, z: 50 } as const;
/** Prestige level that swaps in the big battlefield and its second portal. */
export const BIG_MAP_PRESTIGE = 3;

/** The field a run at this prestige level is fought on. */
export const mapGridFor = (prestige: number) =>
  prestige >= BIG_MAP_PRESTIGE ? BIG_MAP : SMALL_MAP;

/** The field a run in this mode is fought on — endless always gets its own board. */
export const mapGridForMode = (mode: GameMode, prestige: number) =>
  mode === 'endless' ? ENDLESS_MAP : mapGridFor(prestige);

/** Starting resources. */
export const START_GOLD = 500;
export const START_LIVES = 20;

/** Campaign length in waves — five stages, each closed by a boss. */
export const TOTAL_WAVES = 50;

/** Every prestige level adds another full campaign on top of the last one. */
export const WAVES_PER_PRESTIGE = 50;

/** Deepest campaign in the game: 500 waves, fifty stages. */
export const MAX_WAVES = 500;

/** Waves in a run at this prestige level: 50, 100, … capped at MAX_WAVES. */
export const totalWavesFor = (prestige: number): number =>
  Math.min(MAX_WAVES, TOTAL_WAVES + WAVES_PER_PRESTIGE * Math.max(0, Math.floor(prestige)));

/** Every prestige level makes the horde 20% harder. */
export const PRESTIGE_HP_STEP = 0.2;

/** Every stage is ten waves, and a boss closes each one. */
export const STAGE_LENGTH = 10;
export const TOTAL_STAGES = Math.ceil(TOTAL_WAVES / STAGE_LENGTH);

/** Stages in a run at this prestige level: 5, 10, … 50. */
export const totalStagesFor = (prestige: number): number =>
  Math.ceil(totalWavesFor(prestige) / STAGE_LENGTH);

export const stageOf = (wave: number) => Math.floor((wave - 1) / STAGE_LENGTH) + 1;
export const waveInStage = (wave: number) => ((wave - 1) % STAGE_LENGTH) + 1;
/** "1-1" for stage 1 wave 1, "2-1" for stage 2 wave 1. */
export const stageLabel = (wave: number) => `${stageOf(wave)}-${waveInStage(wave)}`;

/** Fraction of invested gold returned when selling a tower. */
export const SELL_RATE = 0.7;

/** Maximum tower level (level 1 is the built state); nine upgrades. */
export const MAX_LEVEL = 10;

/** Half-width of the build lane that follows each wave's route (5 tiles wide). */
export const BUILD_LANE_RADIUS = 2;

/** Warded tiles around the spawn portal where towers cannot be built. */
export const PORTAL_NO_BUILD_RADIUS = 3;

/** Grid coordinates (x: west→east, z: north→south). */
export interface Tile {
  x: number;
  z: number;
}

/** Fixed gate tile on the eastern edge — every route ends here. */
export let GATE_TILE: Tile = { x: GRID_X - 1, z: Math.floor(GRID_Z / 2) };

export const TKEY = (x: number, z: number) => x * GRID_Z + z;
export const inBounds = (x: number, z: number) => x >= 0 && x < GRID_X && z >= 0 && z < GRID_Z;
export const tileCenterX = (x: number) => x - GRID_X / 2 + 0.5;
export const tileCenterZ = (z: number) => z - GRID_Z / 2 + 0.5;
export const worldToTile = (wx: number, wz: number): Tile => ({
  x: Math.floor(wx + GRID_X / 2),
  z: Math.floor(wz + GRID_Z / 2),
});

/**
 * Sizes the board for a prestige level and mode. Everything downstream (paths,
 * world geometry, picking) reads the live GRID_* values, so this must run
 * before the world is built. Changing it mid-run needs a fresh page.
 */
export function configureMap(prestige: number, mode: GameMode = 'campaign'): void {
  const { x, z } = mapGridForMode(mode, prestige);
  GRID_X = x;
  GRID_Z = z;
  HALF_X = x / 2;
  HALF_Z = z / 2;
  GATE_TILE = { x: x - 1, z: Math.floor(z / 2) };
}
