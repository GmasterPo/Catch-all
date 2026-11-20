# Tower roster

Twenty towers across five prestige eras, plus one tier-5 tower that is deliberately not in the
shop. The catalog and the exact numbers live in `src/towers.ts`; `data/towers.json` is the same
catalog exported to JSON (`cost`, `damage`, `range`, `fireRate`, `kind`, `bonus`, `era`, `tier`,
`shelved`), so a tool can read the balance without loading TypeScript.

## Unlock rule

Unlocking is one table, `ERA_UNLOCK` in `src/towers.ts`: era 1 is free, era 2 opens at prestige 1,
era 3 at 2, era 4 at 3, era 5 at 4. The shop and the placement code both call
`towerUnlockPrestige()`, so what the shop shows and what the board accepts cannot disagree.

| Era | Prestige | Towers |
| --- | --- | --- |
| I · Primitive Defense | 0 | Archer, Cannon, Ballista, Frost |
| II · Industrial Technology | 1 | Gatling, Mortar, Flame, Tesla |
| III · Advanced Engineering | 2 | Sniper, Missile, Radar, Heavy Autocannon |
| IV · Modern Warfare | 3 | Laser, Plasma, EMP, Accelerator |
| V · Experimental Technology | 4 | Quantum, Singularity, Drone Nexus, Storm Generator |
| Tier 5 (shelved) | — | Artillery — not released |

## What each tower does

- **Archer** — rapid single-target arrows.
- **Cannon** — splash shells with falloff.
- **Ballista** — a bolt that pierces three enemies in a line.
- **Frost** — slow field with a brief freeze.
- **Gatling** — spin-up while firing, up to 1.6x rate.
- **Mortar** — long-range bombardment.
- **Flame** — a cone of fire that sets everything inside it burning.
- **Tesla** — chain lightning; a direct hit on an infiltrator does double damage.
- **Sniper** — hitscan tracer on the toughest target in range.
- **Missile** — tracking missiles.
- **Radar** — no gun: a support aura worth +25% range and +20% reload to towers in reach, stacking
  to two dishes.
- **Heavy Autocannon** — physical damage that ignores 60% of enemy armour.
- **Laser** — continuous beam, hits instantly.
- **Plasma** — armour-ignoring energy blasts.
- **EMP** — cluster stun around the target.
- **Accelerator** — a charged shot that pierces four.
- **Quantum** — 30% chance of a double-damage surge on each shot.
- **Singularity** — drags enemies backwards along their lane.
- **Drone Nexus** — three drones that each pick their own target.
- **Storm Generator** — multi-strike lightning on the front of the wave.

Levels run 1 to 10. Weapon damage, range and rate each scale on their own per-level table
(`LEVEL_DMG`, `LEVEL_RANGE`, `LEVEL_RATE` in `src/defs.ts`), and `upgradeCost()` prices the next
step. Selling refunds `SELL_RATE` of everything invested in the tower.

## Artillery is shelved, not broken

`artillery` exists in the catalog with `tier: 5` and `shelved: true`. It is refused by
`beginPlacement`, hidden from the sellable list, blocked inside `createTower`, skipped by the dev
harness, and rejected by save sanitising on both the client and the deploy worker. The shop shows
it disabled and labelled "Artillery — coming in a future update". A legacy save that still carries
one is migrated to Accelerator. Leave it that way until it is actually designed.
