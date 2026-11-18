#!/usr/bin/env node
// Loader smoke tests. Runs the real runtime modules in Node with a stub fetch
// and image factory, so index loading, searching, clip lookup, caching and
// animation stepping are exercised without a browser.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FreebuffAssets } from '../src/asset-loader.js';
import { SpriteAnimator } from '../src/sprite-animation.js';
import { listStates, clipsByState } from '../src/asset-search.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'ASSET_INDEX.json'), 'utf8'));

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeImage() {
  const image = { complete: false, naturalWidth: 0, onload: null, onerror: null, srcValue: '' };
  Object.defineProperty(image, 'src', {
    get: () => image.srcValue,
    set: (value) => {
      image.srcValue = value;
      queueMicrotask(() => {
        image.complete = true;
        image.naturalWidth = 64;
        if (typeof image.onload === 'function') image.onload();
      });
    },
  });
  return image;
}

const fetchImpl = async (url) => ({
  ok: url.endsWith('ASSET_INDEX.json'),
  status: url.endsWith('ASSET_INDEX.json') ? 200 : 404,
  json: async () => indexJson,
});

const assets = new FreebuffAssets({ basePath: './freebuff-assets/', fetchImpl, imageFactory: makeImage });

await checkAsync('loads the index over fetch', async () => {
  await assets.loadIndex();
  assert(assets.assets.length > 0, 'no assets loaded');
});

check('index reports 58 assets / 169 clips / 16 sources', () => {
  const { counts } = assets;
  assert(counts.assets === 58, `assets=${counts.assets}`);
  assert(counts.clips === 169, `clips=${counts.clips}`);
  assert(counts.sources === 16, `sources=${counts.sources}`);
});

check('imported stick-figure pack exposes its combo animation', () => {
  const clip = assets.getClip('rgs-stick-fighter', 'combo');
  assert(clip.frameCount === 19, `expected 19 combo frames, got ${clip.frameCount}`);
  const bare = clip.frames[0];
  assert(bare.frameWidth >= bare.w && bare.offsetX <= 0, 'trimmed frame lost its original box');
});

check('asset ids are unique', () => {
  const ids = assets.assets.map((asset) => asset.id);
  assert(new Set(ids).size === ids.length, 'duplicate ids');
});

check('find() filters by category', () => {
  const characters = assets.find({ category: 'characters' });
  assert(characters.length >= 3, `only ${characters.length} characters`);
  assert(characters.every((asset) => asset.category === 'characters'), 'category leak');
});

check('find() matches a text query', () => {
  const results = assets.find({ q: 'laser' });
  assert(results.some((asset) => asset.id === 'space-lasers'), 'space-lasers not found');
});

check('find() filters by tag', () => {
  const results = assets.find({ tags: ['walk-cycle'] });
  assert(results.length >= 3, `only ${results.length} walk-cycle assets`);
});

check('find() filters by animation state', () => {
  const results = assets.find({ state: 'walk', kind: 'animation' });
  assert(results.length >= 3, `only ${results.length} assets with a walk animation`);
});

check('states list includes walk and explosion', () => {
  const states = listStates(assets.index);
  assert(states.includes('walk'), 'walk missing');
  assert(states.includes('explosion'), 'explosion missing');
  assert(clipsByState(assets.index, 'walk').length >= 3, 'walk clips missing');
});

check('getClip returns real frame metadata', () => {
  const clip = assets.getClip('hero-platformer-red', 'walk');
  assert(clip.frameCount === 11, `expected 11 walk frames, got ${clip.frameCount}`);
  assert(clip.frameWidth > 0 && clip.frameHeight > 0, 'bad frame size');
  assert(clip.frames[0].w === clip.frames[0].w, 'bad first frame');
});

check('getAnimation accepts the id:clip shorthand', () => {
  const a = assets.getAnimation('hero-platformer-red:walk');
  const b = assets.getClip('hero-platformer-red', 'walk');
  assert(a === b, 'shorthand resolved a different clip');
});

check('long clips resolve fully', () => {
  const clip = assets.getAnimation('explosion-atlas', 'detonate');
  assert(clip.frameCount === 58, `expected 58 frames, got ${clip.frameCount}`);
});

check('unknown assets and clips throw useful errors', () => {
  let assetError = null;
  try {
    assets.getAsset('does-not-exist');
  } catch (error) {
    assetError = error;
  }
  assert(assetError && assetError.message.includes('unknown asset'), 'no asset error');
  let clipError = null;
  try {
    assets.getClip('hero-platformer-red', 'uppercut');
  } catch (error) {
    clipError = error;
  }
  assert(clipError && clipError.message.includes('has no clip'), 'no clip error');
});

check('every indexed clip has in-bounds frames', () => {
  for (const asset of assets.assets) {
    const [width, height] = asset.sheetSize;
    for (const clip of asset.clips) {
      for (const frame of clip.frames) {
        assert(
          frame.x >= 0 && frame.y >= 0 && frame.x + frame.w <= width && frame.y + frame.h <= height,
          `${asset.id}:${clip.name} frame ${frame.name} out of bounds`,
        );
      }
    }
  }
});

await checkAsync('loadImage caches a sheet', async () => {
  const first = await assets.loadImage('hero-platformer-red');
  const second = await assets.loadImage('hero-platformer-red');
  assert(first === second, 'image was not cached');
  assert(first.src.endsWith('hero-platformer-red/sheet.png'), `unexpected src ${first.src}`);
  assert(assets.cache.size === 1, `cache holds ${assets.cache.size} entries`);
});

await checkAsync('loadClip returns asset, clip and image together', async () => {
  const loaded = await assets.loadClip('hero-platformer-red', 'walk');
  assert(loaded.clip.name === 'walk', 'wrong clip');
  assert(loaded.image && loaded.image.complete, 'image not loaded');
});

await checkAsync('SpriteAnimator steps through an animation and loops', async () => {
  const { asset, clip, image } = await assets.loadClip('hero-platformer-red', 'walk');
  const animator = new SpriteAnimator({ asset, clip, image, scale: 2 });
  assert(animator.frameCount === 11, 'wrong frame count');
  const start = animator.index;
  animator.update(1000 / clip.fps);
  assert(animator.index === start + 1, 'did not advance one frame');
  animator.update((1000 / clip.fps) * 11);
  assert(animator.index < 11, 'did not wrap');
});

await checkAsync('SpriteAnimator holds the last frame of a non-looping clip', async () => {
  const { asset, clip, image } = await assets.loadClip('explosion-atlas', 'detonate');
  const animator = new SpriteAnimator({ asset, clip, image });
  animator.update((1000 / clip.fps) * 200);
  assert(animator.finished, 'clip never finished');
  assert(animator.index === clip.frameCount - 1, 'did not stop on the last frame');
});

if (failures.length) {
  console.error(`loader tests failed: ${failures.length} of ${failures.length + passed}`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`loader tests passed — ${passed} checks`);
