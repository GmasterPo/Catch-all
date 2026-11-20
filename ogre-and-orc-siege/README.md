# Ogre & Orc Siege — backup snapshot

Snapshot date: **2026-11-20** · app version 1.0.0 · save format **v3**

Ogre & Orc Siege is a top-down tower-defense game in the browser: hold the eastern gate through
50 waves over 5 campaign stages, or survive an endless 50x50 field that opens another portal every
ten waves. TypeScript + Three.js, bundled by Vite, shipped three ways — a hosted web app, a
single-file offline HTML build, and a Capacitor Android APK.

This folder is both the reference point for how the game works and the recoverable copy of its
code. It was taken at the point where the tower system was rebuilt into the prestige-era roster
described below.

| Where | URL |
| --- | --- |
| Production | https://site-c3924e690b4b4ffb84637228a974296c.freebuff.page |
| Preview | https://site-339e325142cc47fcb4b768703c26de30.freebuff.page |

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # tsc --noEmit && vite build -> dist/
npm run build:offline# single-file build -> ogre-orc-siege-offline.html (+ public/)
```

Requires Node 20+. Stack: `three@0.169.0`, `vite@5`, `typescript@5.6`, `@capacitor/*@8`.

## What is in this folder

```
src/                 game source (see the module map below)
index.html           HUD, shop, panels and dialogs
public/              manifest, service worker, generated icons and the offline build
assets/              app icon + splash masters
tools/               offline bundler and the procedural art generator
deploy-worker.js     Cloudflare Worker that serves dist/ and the account API
deploy.json          hosting manifest (entry worker + assets)
data/towers.json     machine-readable tower catalog + progression rules
docs/                save format, tower roster, verification notes
```

### Module map

| File | Responsibility |
| --- | --- |
| `src/main.ts` | boots the renderer, menu, PWA and account session |
| `src/game.ts` | the whole simulation: board, waves, towers, projectiles, economy, prestige, dev hooks |
| `src/towers.ts` | tower catalog, eras, unlock rules, level curves, legacy-id migration |
| `src/defs.ts` | enemies, wave composition, hp scaling (re-exports `towers.ts`) |
| `src/config.ts` | grid sizes, tile maths, stage/wave helpers, economy constants |
| `src/pathgen.ts` | route generation and pathfinding for lanes and endless portals |
| `src/world.ts` | terrain, path tiles, build lane, portals, props |
| `src/models.ts` | builds the 3D tower/enemy meshes and projectiles |
| `src/art.ts` | all canvas-drawn sprites: 21 towers, 9 enemies, 19 projectiles, terrain |
| `src/ui.ts` | HUD, era-grouped shop, tower panel, toasts, dialogs |
| `src/save.ts` | localStorage persistence, versioning and migration |
| `src/account.ts` | optional sign-in and progress sync |
| `src/menu.ts` | campaign/endless mode menu |
| `src/audio.ts`, `src/pwa.ts`, `src/util.ts` | sound, install/offline support, helpers |

## Tower system: five eras, twenty towers

Eras are tied to prestige: every prestige step opens the next era's four towers. Unlock is
computed from one table (`ERA_UNLOCK` in `src/towers.ts`), and both the shop and the placement
code consult it, so the UI and the rules cannot drift apart.

| Era | Prestige | Towers |
| --- | --- | --- |
| I · Primitive Defense | 0 | Archer, Cannon, Ballista, Frost |
| II · Industrial Technology | 1 | Gatling, Mortar, Flame, Tesla |
| III · Advanced Engineering | 2 | Sniper, Missile, Radar, Heavy Autocannon |
| IV · Modern Warfare | 3 | Laser, Plasma, EMP, Accelerator |
| V · Experimental Technology | 4 | Quantum, Singularity, Drone Nexus, Storm Generator |
| Tier 5 (shelved) | — | **Artillery** — not released |

Every tower is a working unit; none is a shop entry that does nothing:

- **Archer** rapid single-target arrows · **Cannon** splash shells
- **Ballista** bolt pierces 3 in a line · **Frost** slow + brief freeze
- **Gatling** spin-up to 1.6x rate · **Mortar** long-range bombardment
- **Flame** cone of fire + burn · **Tesla** chain lightning
- **Sniper** hitscan on the toughest target · **Missile** tracking missiles
- **Radar** support aura (+25% range, +20% rate, no gun) · **Heavy Autocannon** ignores 60% armour
- **Laser** continuous beam · **Plasma** armour-ignoring energy blasts
- **EMP** cluster stun · **Accelerator** charged shot that pierces 4
- **Quantum** 30% double-damage surge · **Singularity** drags enemies backwards
- **Drone Nexus** three independent drones · **Storm Generator** multi-strike storm

Full numbers: `data/towers.json` (exported from the live catalog) and `docs/tower-roster.md`.

### Artillery is deliberately unfinished

`artillery` exists in the catalog with `tier: 5` and `shelved: true`. It is refused by
`beginPlacement`, filtered out of the sellable list, hard-blocked inside `createTower`, excluded
from the dev build harness, and rejected by save sanitising on both client and worker. The shop
renders it disabled and labelled "Artillery — coming in a future update". Any legacy save that
still contains one migrates to Accelerator. Keep it that way until it is actually designed.

## Progression and saves

Prestige is earned by finishing a campaign run; each level increases enemy hp and opens an era.
At a stage change every built tower returns to the storage bin, where it can be recalled onto the
new map at its old level for free.

Save key: `ogre-orc-siege.progress.v1` — see `docs/save-format.md` for the schema, the legacy
id map and the account sync contract.

## Build and deploy

- `npm run build` typechecks (`tsc --noEmit`) then bundles to `dist/`.
- `deploy.json` points the hosting manifest at `deploy-worker.js`, which serves `dist/` as
  assets and exposes the account endpoints; `compatibilityDate` is pinned there.
- `npm run build:offline` produces a standalone `ogre-orc-siege-offline.html` with JS and CSS
  inlined, plus a copy under `public/` so the hosted site can hand it out.

## Assets

All game art is drawn in code (`src/art.ts`) and baked to sprites at runtime, so the visual
assets are reproducible from source. App icons and the splash screen are generated by
`tools/make-art.ts` (fonts under `tools/fonts/`, output into `assets/` and `public/icons/`).

## What this backup does not contain

Binary and derived files are left out on purpose; each is either rebuildable or too large for a
source repository:

- `node_modules/`, `dist/`, `freebuff-sites-build/` — build output, regenerate with npm
- `Ogre-and-Orc-Siege-debug.apk` (8.2 MB) — debug Android build, regenerate with Capacitor
- `ogre-orc-siege-offline.html` (659 kB) — `npm run build:offline`
- PNG screenshots and icon/splash images — see `docs/verification.md` for the list, and
  `tools/make-art.ts` for how icons and splash are produced
- the `android/` Capacitor wrapper — regenerate with `npx cap add android` from
  `capacitor.config.json` (`appId com.ogresiege.game`, `webDir dist`)

Those files still exist in the working copy this snapshot was taken from.
