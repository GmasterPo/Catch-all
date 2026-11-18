# Freebuff asset library

`freebuff-assets/` is a reusable 2D game art library for HTML5/JavaScript
projects. It is additive: `index.html` (Ninja Kombat) is untouched and draws
everything procedurally.

- **48 assets**, **126 clips** (33 animations, 93 named sprites), **8 sources**
- every file is **CC0 1.0**, with creator, source page and the pack's own licence
  notice recorded in `freebuff-assets/manifests/sources.json` and `licenses/`
- frame metadata is parsed from the original packs' sprite-sheet XML/text, not
  guessed

## Use it

```js
import { FreebuffAssets } from './freebuff-assets/src/asset-loader.js';

const assets = new FreebuffAssets({ basePath: './freebuff-assets/' });
await assets.loadIndex();

const results = assets.find({ tags: ['walk-cycle'], category: 'characters' });
const { asset, clip, image } = await assets.loadClip(results[0].id, 'walk');
```

`src/sprite-animation.js` plays a clip on a canvas, `src/asset-search.js` searches
the index, and `src/asset-cache.js` caches sheets. `freebuff-assets/ASSET_INDEX.json`
is the machine-readable index; `freebuff-assets/examples/html5/index.html` is a
working demo.

## Where to read more

| Document | Contents |
| --- | --- |
| [`freebuff-assets/README.md`](freebuff-assets/README.md) | API, layout, clip model, build and test commands |
| [`freebuff-assets/docs/FREEBUFF_INTEGRATION.md`](freebuff-assets/docs/FREEBUFF_INTEGRATION.md) | how a new project should search, reuse and extend the library |
| [`freebuff-assets/docs/ASSET_IMPORT_AND_LICENSES.md`](freebuff-assets/docs/ASSET_IMPORT_AND_LICENSES.md) | import checklist, source table, what was deliberately excluded |

## Check it

```bash
cd freebuff-assets
npm run check   # build index, validate files/frames/licences, run loader tests
```

Only verifiably redistributable art may be added. A licence that permits use in
a game but forbids handing out the raw files is not enough for this repository.
