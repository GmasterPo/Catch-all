# Ogre & Orc Siege — condensed README

Short form of `README.md` in this folder; read that one for the full walkthrough.

**What it is.** A browser tower-defense game. Hold the eastern gate through 50 waves over 5
stages, or survive an endless 50x50 field that opens another portal every ten waves. TypeScript +
Three.js, bundled by Vite. Snapshot 2026-11-20, app version 1.0.0, save format v3.

**Live.** Production https://site-c3924e690b4b4ffb84637228a974296c.freebuff.page · Preview
https://site-339e325142cc47fcb4b768703c26de30.freebuff.page

## Run

```bash
npm install
npm run dev           # http://localhost:3000
npm run build         # tsc --noEmit && vite build -> dist/
npm run build:offline # single-file build -> ogre-orc-siege-offline.html
```

Node 20+. `three@0.169`, `vite@5`, `typescript@5.6`, `@capacitor/*@8`.

## Folder

```
src/              game source; game.ts is stored as 4 parts, run src/join-game.sh
index.html        HUD, shop, panels, dialogs
public/           manifest, service worker, generated icons
assets/           icon + splash masters
tools/            offline bundler, procedural art generator
deploy-worker.js  Cloudflare Worker: serves dist/ and the account API
data/towers.json  tower catalog + progression rules
docs/             save format, tower roster, verification notes
```

## Towers

Five eras, four towers each, unlocked by prestige through one table (`ERA_UNLOCK`):

| Era | Prestige | Towers |
| --- | --- | --- |
| I | 0 | Archer, Cannon, Ballista, Frost |
| II | 1 | Gatling, Mortar, Flame, Tesla |
| III | 2 | Sniper, Missile, Radar, Heavy Autocannon |
| IV | 3 | Laser, Plasma, EMP, Accelerator |
| V | 4 | Quantum, Singularity, Drone Nexus, Storm Generator |
| Tier 5 | — | Artillery — shelved, never purchasable |

Artillery stays in the catalog with `tier: 5, shelved: true`: refused by `beginPlacement`, hidden
from the shop, blocked in `createTower`, rejected by save sanitising, labelled "coming in a future
update". Details in `docs/tower-roster.md`.

## Saves

Local key `ogre-orc-siege.progress.v1`; prestige and the tower storage bin survive a refresh and
sync through the account API. Schema and legacy id map: `docs/save-format.md`.

## Not in this backup

Build output (`node_modules/`, `dist/`, `freebuff-sites-build/`), the 8.2 MB debug APK, the 659 kB
offline HTML, PNG screenshots and icon/splash images, and the `android/` wrapper. Each is
rebuildable — see `README.md` and `docs/verification.md`. All game art is drawn in code.
