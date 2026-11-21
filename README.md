# Catch-all

A working repository of self-contained browser game projects and reusable game art.

## Contents

- **[`freebuff-assets/`](freebuff-assets/README.md)** — a reusable, license-verified
  **CC0 1.0** 2D art library for HTML5 games: **58 assets**, **169 clips** (67
  animations, 102 named sprites) from **16 sources**, with a browser-native loader,
  index search and sprite animator. Summary and provenance live in
  [FREEBUFF_ASSETS.md](FREEBUFF_ASSETS.md); API, layout and licences in
  [freebuff-assets/README.md](freebuff-assets/README.md). Validate it with
  `cd freebuff-assets && npm run check`.
- **[`ogre-and-orc-siege/`](ogre-and-orc-siege/README.md)** — backup snapshot of the
  Ogre & Orc Siege top-down tower-defense project (TypeScript + Three.js, built with
  Vite, shipped as a web app, a single-file offline build and a Capacitor APK).

There is no page at the repository root: each project lives in its own folder.

## Using the asset library

```js
import { FreebuffAssets } from './freebuff-assets/src/asset-loader.js';

const assets = new FreebuffAssets({ basePath: './freebuff-assets/' });
await assets.loadIndex();
const { clip, image } = await assets.loadClip('hero-platformer-red', 'walk');
```

Every file in `freebuff-assets/` is CC0 1.0, with creator, source page and the
pack's own licence notice recorded under `freebuff-assets/manifests/sources.json`
and `freebuff-assets/licenses/`.

`.nojekyll` is kept so GitHub Pages serves these folders as-is.
