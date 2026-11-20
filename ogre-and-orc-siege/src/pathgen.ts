import { GATE_TILE, GRID_X, GRID_Z, TKEY, type Tile } from './config';
import { clamp } from './util';

/** Board cell count — the grid is resized per prestige, so this is never cached. */
const cells = () => GRID_X * GRID_Z;

class MinHeap {
  private idx: number[] = [];
  private pri: number[] = [];

  get size(): number {
    return this.idx.length;
  }

  push(i: number, p: number): void {
    this.idx.push(i);
    this.pri.push(p);
    let c = this.idx.length - 1;
    while (c > 0) {
      const parent = (c - 1) >> 1;
      if (this.pri[parent] <= this.pri[c]) break;
      this.swap(parent, c);
      c = parent;
    }
  }

  pop(): number {
    const top = this.idx[0];
    const lastIdx = this.idx.pop() as number;
    const lastPri = this.pri.pop() as number;
    if (this.idx.length > 0) {
      this.idx[0] = lastIdx;
      this.pri[0] = lastPri;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < this.idx.length && this.pri[l] < this.pri[m]) m = l;
        if (r < this.idx.length && this.pri[r] < this.pri[m]) m = r;
        if (m === c) break;
        this.swap(m, c);
        c = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const ti = this.idx[a];
    this.idx[a] = this.idx[b];
    this.idx[b] = ti;
    const tp = this.pri[a];
    this.pri[a] = this.pri[b];
    this.pri[b] = tp;
  }
}

function heuristic(x: number, z: number, gx: number, gz: number): number {
  return Math.abs(x - gx) + Math.abs(z - gz);
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** A* over the 4-connected grid. `blocked` tiles are impassable. */
export function findPath(
  start: Tile,
  goal: Tile,
  blocked: Uint8Array,
  extraCost?: Float32Array,
): Tile[] | null {
  const sx = clamp(start.x, 0, GRID_X - 1);
  const sz = clamp(start.z, 0, GRID_Z - 1);
  const gx = clamp(goal.x, 0, GRID_X - 1);
  const gz = clamp(goal.z, 0, GRID_Z - 1);
  const s = TKEY(sx, sz);
  const t = TKEY(gx, gz);
  if (blocked[s] || blocked[t]) return null;
  if (s === t) return [{ x: sx, z: sz }];

  const gScore = new Float32Array(cells()).fill(Infinity);
  const came = new Int32Array(cells()).fill(-1);
  const closed = new Uint8Array(cells());
  const heap = new MinHeap();

  gScore[s] = 0;
  heap.push(s, heuristic(sx, sz, gx, gz));

  while (heap.size > 0) {
    const cur = heap.pop();
    if (cur === t) break;
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cx = Math.floor(cur / GRID_Z);
    const cz = cur % GRID_Z;

    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS[d][0];
      const nz = cz + DIRS[d][1];
      if (nx < 0 || nx >= GRID_X || nz < 0 || nz >= GRID_Z) continue;
      const ni = TKEY(nx, nz);
      if (blocked[ni] || closed[ni]) continue;
      const step = 1 + (extraCost ? extraCost[ni] : 0);
      const tentative = gScore[cur] + step;
      if (tentative < gScore[ni]) {
        gScore[ni] = tentative;
        came[ni] = cur;
        heap.push(ni, tentative + heuristic(nx, nz, gx, gz));
      }
    }
  }

  if (came[t] === -1) return null;

  const out: Tile[] = [];
  let cur = t;
  while (cur !== s) {
    out.push({ x: Math.floor(cur / GRID_Z), z: cur % GRID_Z });
    cur = came[cur];
  }
  out.push({ x: sx, z: sz });
  out.reverse();
  return out;
}

/** BFS flood fill from the gate across non-blocked tiles. */
export function reachableFromGate(blocked: Uint8Array): Uint8Array {
  const seen = new Uint8Array(cells());
  const queue = new Int32Array(cells());
  let head = 0;
  let tail = 0;
  const start = TKEY(GATE_TILE.x, GATE_TILE.z);
  if (blocked[start]) return seen;
  seen[start] = 1;
  queue[tail++] = start;

  while (head < tail) {
    const cur = queue[head++];
    const cx = Math.floor(cur / GRID_Z);
    const cz = cur % GRID_Z;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS[d][0];
      const nz = cz + DIRS[d][1];
      if (nx < 0 || nx >= GRID_X || nz < 0 || nz >= GRID_Z) continue;
      const ni = TKEY(nx, nz);
      if (seen[ni] || blocked[ni]) continue;
      seen[ni] = 1;
      queue[tail++] = ni;
    }
  }
  return seen;
}

/** Column-0 tiles the gate can still be reached from. */
export function reachableEntrances(blocked: Uint8Array): Tile[] {
  const seen = reachableFromGate(blocked);
  const out: Tile[] = [];
  for (let z = 0; z < GRID_Z; z++) {
    if (seen[TKEY(0, z)] && !blocked[TKEY(0, z)]) out.push({ x: 0, z });
  }
  return out;
}

export interface WaveRoute {
  tiles: Tile[];
  entrance: Tile;
}

export interface WavePathResult {
  routes: WaveRoute[];
  tiles: Set<number>;
}

function nearestFree(tile: Tile, blocked: Uint8Array): Tile | null {
  if (!blocked[TKEY(tile.x, tile.z)]) return tile;
  const maxR = Math.max(2, Math.round(Math.min(GRID_X, GRID_Z) * 0.2));
  for (let r = 1; r <= maxR; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const x = clamp(tile.x + dx, 1, GRID_X - 2);
        const z = clamp(tile.z + dz, 1, GRID_Z - 2);
        if (!blocked[TKEY(x, z)]) return { x, z };
      }
    }
  }
  return null;
}

/**
 * Picks the portals a stage attacks from. One portal on the small field; the
 * expanded battlefield opens a second one, so lanes split across both.
 */
function pickPortals(entrances: Tile[], rng: () => number, portalCount: number): Tile[] {
  if (portalCount < 2 || entrances.length < 2) {
    return [entrances[Math.floor(rng() * entrances.length)]];
  }
  // one portal in the northern half of the west wall, one in the southern half
  const sorted = [...entrances].sort((a, b) => a.z - b.z);
  const mid = Math.max(1, Math.floor(sorted.length / 2));
  const north = sorted.slice(0, mid);
  const south = sorted.slice(mid).length ? sorted.slice(mid) : sorted;
  const pick = (list: Tile[]) => list[Math.floor(rng() * list.length)] ?? sorted[0];
  const first = pick(north);
  let second = pick(south);
  if (second.z === first.z) second = { x: 0, z: clamp(first.z + Math.floor(GRID_Z / 3), 1, GRID_Z - 2) };
  return [first, second];
}

/**
 * One extra endless lane: a winding route from a new portal to the gate that
 * keeps its distance from the paths already on the board, then sweeps around
 * towers the player has built since.
 */
export function generateRoute(
  entrance: Tile,
  blocked: Uint8Array,
  rng: () => number,
  taken: Set<number>,
): WaveRoute | null {
  const avoid = new Float32Array(cells());
  for (const key of taken) {
    const x = Math.floor(key / GRID_Z);
    const z = key % GRID_Z;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nx >= GRID_X || nz < 0 || nz >= GRID_Z) continue;
        const k = TKEY(nx, nz);
        avoid[k] = Math.min(3, avoid[k] + 0.8);
      }
    }
  }

  const innerCount = GRID_X < 30 ? 3 : 4;
  for (let attempt = 0; attempt < 10; attempt++) {
    const waypoints: Tile[] = [entrance];
    for (let k = 1; k <= innerCount; k++) {
      const frac = k / (innerCount + 1);
      const x = Math.round(GRID_X * 0.18 + frac * GRID_X * 0.62 + (rng() - 0.5) * GRID_X * 0.18);
      const z = clamp(Math.round(entrance.z + (rng() - 0.5) * GRID_Z * 0.55), 3, GRID_Z - 4);
      waypoints.push({ x: clamp(x, 3, GRID_X - 4), z });
    }
    waypoints.push({ ...GATE_TILE });

    const tiles: Tile[] = [];
    let ok = true;
    for (let k = 0; k < waypoints.length - 1; k++) {
      const from = nearestFree(waypoints[k], blocked);
      const to = nearestFree(waypoints[k + 1], blocked);
      if (!from || !to) {
        ok = false;
        break;
      }
      // the first passes keep clear of the older lanes; later ones settle for any gap
      const seg = findPath(from, to, blocked, attempt < 5 ? avoid : undefined);
      if (!seg) {
        ok = false;
        break;
      }
      for (const tile of seg) {
        const last = tiles[tiles.length - 1];
        if (!last || last.x !== tile.x || last.z !== tile.z) tiles.push(tile);
      }
    }
    if (ok && tiles.length > 4) return { tiles, entrance };
  }

  // a crowded board still needs a lane: take the plainest way through
  const tiles = findPath(entrance, GATE_TILE, blocked);
  return tiles && tiles.length > 4 ? { tiles, entrance } : null;
}

/**
 * Builds fresh routes for a wave: random waypoints connected with A* around
 * towers, with multiple lanes that split near the spawn and merge at the gate.
 * With two portals the lanes alternate between them.
 */
export function generateWavePaths(
  wave: number,
  blocked: Uint8Array,
  rng: () => number,
  forcedLanes?: number,
  portalCount = 1,
): WavePathResult {
  const entrances = reachableEntrances(blocked);
  if (entrances.length === 0) {
    return { routes: [], tiles: new Set() };
  }

  // a small field cannot hold three separate lanes without them merging
  const maxLanes = GRID_Z < 24 ? 2 : 3;
  const natural = wave < 5 ? 1 : wave < 11 ? 2 : wave % 5 === 0 ? 3 : 2;
  const portals = pickPortals(entrances, rng, portalCount);
  // every portal must send at least one lane, or it would just sit there
  const laneCount = clamp(Math.max(forcedLanes ?? natural, portals.length), 1, maxLanes);
  const avoid = new Float32Array(cells());
  const routes: WaveRoute[] = [];
  const allTiles = new Set<number>();

  for (let i = 0; i < laneCount; i++) {
    let bestRoute: WaveRoute | null = null;
    // lanes take turns, so both portals feed the assault
    const entrance = portals[i % portals.length];
    for (let attempt = 0; attempt < 8 && !bestRoute; attempt++) {
      const laneCenter =
        laneCount === 1 ? GRID_Z / 2 : GRID_Z * 0.12 + ((i + 0.5) / laneCount) * GRID_Z * 0.76;
      const waypoints: Tile[] = [entrance];
      // fewer turns on a small field, so the route reads clearly
      const innerCount = laneCount === 1 ? (GRID_X < 30 ? 3 : 4) : GRID_X < 30 ? 2 : 3;

      for (let k = 1; k <= innerCount; k++) {
        const frac = k / (innerCount + 1);
        const x = Math.round(
          GRID_X * 0.18 + frac * GRID_X * 0.62 + (rng() - 0.5) * GRID_X * 0.18,
        );
        // a split lane keeps its own band, so the paths stay separate
        const spread = laneCount === 1 ? GRID_Z * 0.62 : (GRID_Z * 0.5) / laneCount;
        let z = Math.round(laneCenter + (rng() - 0.5) * spread);
        z = clamp(z, 3, GRID_Z - 4);
        waypoints.push({ x: clamp(x, 3, GRID_X - 4), z });
      }
      waypoints.push({ ...GATE_TILE });

      const tiles: Tile[] = [];
      let ok = true;
      for (let k = 0; k < waypoints.length - 1; k++) {
        const from = nearestFree(waypoints[k], blocked);
        const to = nearestFree(waypoints[k + 1], blocked);
        if (!from || !to) {
          ok = false;
          break;
        }
        const seg = findPath(from, to, blocked, avoid) ?? findPath(from, to, blocked);
        if (!seg) {
          ok = false;
          break;
        }
        for (const tile of seg) {
          const last = tiles[tiles.length - 1];
          if (!last || last.x !== tile.x || last.z !== tile.z) tiles.push(tile);
        }
      }

      if (ok && tiles.length > 4) {
        bestRoute = { tiles, entrance };
      }
    }

    if (bestRoute) {
      routes.push(bestRoute);
      for (const tile of bestRoute.tiles) {
        allTiles.add(TKEY(tile.x, tile.z));
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const x = tile.x + dx;
            const z = tile.z + dz;
            if (x < 0 || x >= GRID_X || z < 0 || z >= GRID_Z) continue;
            const k = TKEY(x, z);
            avoid[k] = Math.min(3, avoid[k] + 0.45);
          }
        }
      }
    }
  }

  return { routes, tiles: allTiles };
}
