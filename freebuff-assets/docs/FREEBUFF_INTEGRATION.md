# Using this library from a new Freebuff project

Read this before drawing new art for a game. The point of the library is that
existing, license-clean sprites get reused instead of regenerated badly.

## 1. Inspect the index first

`ASSET_INDEX.json` is the contract. Check `index.counts` for the totals and read
`assets[]` for ids, categories, styles, tags and clips. Do not hard-code file
paths: every path in the index is relative to the library root.

## 2. Search before creating

```js
const assets = new FreebuffAssets({ basePath: './freebuff-assets/' });
await assets.loadIndex();

assets.find({ tags: ['walk-cycle'] });          // animation with a walk cycle
assets.find({ q: 'laser', category: 'projectiles' });
assets.find({ state: 'explosion', kind: 'animation' });
assets.find({ category: 'interfaces', limit: 10 });
```

Match on `state` when you need behaviour (a character that walks, an effect that
detonates), and on `tags`/`style` when you need a look. `listStates()` tells you
which gameplay states already exist.

## 3. Reuse correctly

- Draw only the clip's frame rectangles; never assume a grid or a fixed frame
  size across assets.
- Respect `fps` and `loop`. Non-looping clips (jump, hurt, explosion) should
  play once and hold or hand control back; `SpriteAnimator` exposes `finished`
  and `onComplete`.
- Honour `frameWidth`/`frameHeight` and `offsetX`/`offsetY` when they exist:
  those frames are trimmed and must be positioned inside the untrimmed box.
- Scale by an integer factor for pixel-art styles (`8-bit-pixel`,
  `16-bit-pixel`) and set `image-rendering: pixelated` / `ctx.imageSmoothingEnabled = false`.
- Load each sheet once and share it; `loadImage()` already caches, and
  `loadClip()` is the one-call path.

## 4. Respect licensing

Every asset is CC0 1.0, so attribution is optional. Keep the provenance intact
anyway: when you copy files into a project, keep `licenses/` and the asset's
`creator`/`source` fields in whatever manifest the game ships. Never add an
asset that is not verifiably redistributable — see
`docs/ASSET_IMPORT_AND_LICENSES.md`.

## 5. When nothing fits

Create original art for the gap rather than stretching an unrelated sprite. Then
either add it to the library through `tools/catalog.mjs` (with genuine license
and source data) or keep it project-local. Do not fake an index entry to make a
game run: `placeholder` must stay `false`, and the validator enforces it.

## 6. Update the manifest when the library changes

1. Copy the sheet plus its frame metadata to `assets/<category>/<id>/`.
2. Add a source to `SOURCES` if it is a new pack.
3. Add an entry to `ASSETS` with real clip prefixes and gameplay states.
4. Run `npm run check` from `freebuff-assets/`: the build resolves frames, the
   validator checks bounds/licenses/counts, and the loader tests must stay green.
5. Update the counts in this repository's README if the totals changed.

## 7. Do not disturb the host game

The library is additive. In this repository, `index.html` (Ninja Kombat) is
untouched by asset work: it draws procedurally and loads nothing from here. A
new game should live in its own page and pull from `freebuff-assets/` without
editing existing game files.

## Minimal integration example

```html
<canvas id="stage" width="640" height="260"></canvas>
<script type="module">
import { FreebuffAssets } from './freebuff-assets/src/asset-loader.js';
import { SpriteAnimator } from './freebuff-assets/src/sprite-animation.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const assets = new FreebuffAssets({ basePath: './freebuff-assets/' });
await assets.loadIndex();

const { asset, clip, image } = await assets.loadClip('hero-platformer-red', 'walk');
const animator = new SpriteAnimator({ asset, clip, image, scale: 2 });

let last = performance.now();
requestAnimationFrame(function loop(now) {
  animator.update(now - last);
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  animator.draw(ctx, canvas.width / 2, canvas.height - 20);
  requestAnimationFrame(loop);
});
</script>
```
