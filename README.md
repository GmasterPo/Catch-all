# Arcane Ascension — Idle Tower Defense

An idle tower-defense game that runs entirely in the browser: an archmage
autocasts twelve spells against endless waves while upgrades, ascension prestige
and offline rewards keep the numbers climbing. It installs as a PWA and plays
offline after the first load.

The game is served from the repository root, so this repository *is* the app:

| Path | What it is |
| --- | --- |
| `index.html` | Markup, HUD and overlays |
| `css/style.css` | All styling |
| `js/` | Game modules — `game.js`, `arena.js`, `wizard.js`, `enemies.js`, `waves.js`, `spells.js`, `state.js`, `save.js`, `ui.js` and the rest |
| `manifest.json`, `sw.js`, `icons/` | Installability and the offline cache |

Every path in the game is relative, so the same files work at a domain root, in
a subfolder, or as an installed app.

## Run it locally

```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

## Other folders

- `freebuff-assets/` — reusable, license-verified CC0 1.0 art library for HTML5
  games; see [FREEBUFF_ASSETS.md](FREEBUFF_ASSETS.md).
- `ogre-and-orc-siege/` — backup snapshot of the Ogre & Orc Siege tower-defense
  project; see [its README](ogre-and-orc-siege/README.md).
