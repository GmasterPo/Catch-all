# Freebuff Universal Game Asset Library

A reusable 2D game art library for HTML5/JavaScript projects: **58 assets**,
**169 clips**, from **16 license-verified CC0 1.0 sources**. Every sheet is
committed with its original frame metadata, so nothing here is a placeholder or
a hand-guessed rectangle.

```js
import { FreebuffAssets } from './freebuff-assets/src/asset-loader.js';
import { SpriteAnimator } from './freebuff-assets/src/sprite-animation.js';

const assets = new FreebuffAssets({ basePath: './freebuff-assets/' });
await assets.loadIndex();

const fighter = assets.find({ tags: ['walk-cycle'] })[0];
const { asset, clip, image } = await assets.loadClip(fighter.id, 'walk');

const animator = new SpriteAnimator({ asset, clip, image, scale: 3 });
animator.update(16.7);
animator.draw(ctx, x, y);   // anchored bottom-center by default
```

Open `examples/html5/index.html` through a local server to see the loader,
search and animation running:

```bash
python3 -m http.server 3000   # from the repository root
# then visit http://localhost:3000/freebuff-assets/examples/html5/
```

## What is in the library

| Category | Assets | Contents |
| --- | --- | --- |
| `characters` | 14 | three platformer heroes with idle/walk/jump/crouch/hurt clips, a racing cast, a pixel adventurer sheet, plus nine stick-figure and martial-arts imports (RGS stick fighter with a 19-frame combo, a 12-frame stick-man run, a dancing stickman, Streets of Fight's brawler girl and punk, Game Boy Kung Fu Man, Mustermann's karate walk, Vander reference sheets and a kung-fu cast sheet) |
| `effects` | 4 | explosion sequence, debris bursts, beams, thruster and impact flickers, plus a 12-frame energy burst |
| `projectiles` | 1 | blue/green/red laser sequences |
| `powers` | 1 | shield and star animations plus power-up pickups |
| `objects` | 8 | items, HUD hearts, terrain tiles, generic inventory icons, cars, track props, coins |
| `environments` | 5 | clouds, mountains, castles, trees, racing roads, background plates |
| `interfaces` | 25 | buttons, arrows, icons, checkboxes and sliders |

67 of the 169 clips are multi-frame animations; the other 102 are named sprites
(`kind: "sprite"`, one frame), which makes single images addressable through the
same API as animations.

## Clip model

An asset is one PNG. Its `clips` describe named animations inside that image:

```json
{
  "name": "walk",
  "state": "walk",
  "kind": "animation",
  "fps": 12,
  "loop": true,
  "frameCount": 11,
  "frameWidth": 72,
  "frameHeight": 97,
  "frames": [{ "name": "walk01", "x": 0, "y": 0, "w": 72, "h": 97 }]
}
```

`state` is the gameplay state a game would ask for (`idle`, `walk`, `jump`,
`crouch`, `hurt`, `block`, `power`, `explosion`, `beam`, `thruster`, `hit`,
`projectile`, `drive`, `sprite`). `frames` are source rectangles in the sheet;
trimmed frames also carry `frameWidth`, `frameHeight`, `offsetX` and `offsetY`
so they line up on the original sprite box.

## API

`FreebuffAssets` (`src/asset-loader.js`)

| Method | Purpose |
| --- | --- |
| `loadIndex(url?)` | fetch and parse `ASSET_INDEX.json` |
| `loadIndexFromObject(index)` | use an already-parsed index |
| `find(filter)` | search by `q`, `category`, `style`, `tags`, `state`, `kind`, `clip`, `limit` |
| `getAsset(id)` / `hasAsset(id)` | look up an asset record |
| `getClip(id, name)` | clip by name, or by state as a fallback |
| `getAnimation('id:clip')` | shorthand for the same lookup |
| `loadImage(id)` | load and cache a sheet |
| `loadClip(id, name)` | `{ asset, clip, image, url }` in one call |
| `preload(ids)` / `clearCache()` | batch loading and cache control |

`searchAssets`, `listStates` and `clipsByState` (`src/asset-search.js`) are pure
functions over the index. `AssetCache` (`src/asset-cache.js`) de-duplicates
in-flight image requests. `SpriteAnimator` (`src/sprite-animation.js`) steps a
clip on a canvas and can flip, scale and anchor it.

## Repository layout

```
freebuff-assets/
├── ASSET_INDEX.json        generated index: assets, clips, frames, sources
├── assets/<category>/<id>/ sheet.png or sprite.png + sheet.xml / sheet.txt
├── docs/                   integration guide and import/licensing policy
├── examples/html5/         loader + animation demo
├── licenses/               the original CC0 notice from each pack
├── manifests/              sources, characters, animations, powers, effects
├── src/                    loader, search, cache, sprite animation
└── tools/                  catalog, index builder, validator, loader tests
```

Animations are stored as clip records inside each sheet rather than as
duplicated per-frame PNGs: the frames already exist in the atlas, and slicing
them out would only add copies of the same pixels.

## Building and checking

```bash
cd freebuff-assets
npm run build      # regenerate ASSET_INDEX.json and manifests/ from the catalog
npm run validate   # file, frame, count and license checks
npm test           # loader smoke tests (17 checks)
npm run check      # all three, in order
```

`tools/catalog.mjs` is the source of truth. `tools/build-index.mjs` parses the
committed XML/text metadata, resolves each clip's frames, and refuses to build if
a clip name matches no frames or a frame falls outside its sheet.

## Licensing

Everything here is **CC0 1.0** (public domain dedication) and may be used,
modified and redistributed, including commercially, without attribution. Credit
to Kenney (kenney.nl) is appreciated but not required. Per-pack notices and
source pages are in `licenses/` and `manifests/sources.json`; the import rules
are in `docs/ASSET_IMPORT_AND_LICENSES.md`.

Eight of the sources are stick-figure and martial-arts packs, imported after a
source survey: the research report
[`docs/STICK_FIGURE_MARTIAL_ARTS_SOURCES.md`](docs/STICK_FIGURE_MARTIAL_ARTS_SOURCES.md)
catalogues 22 verified sources with the licence evidence quoted from each item
page, and the eight CC0 picks now live under `assets/characters/` and
`assets/effects/`.
