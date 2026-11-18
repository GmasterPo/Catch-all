// FreebuffAssets — browser-native loader for ASSET_INDEX.json.
//
//   import { FreebuffAssets } from './freebuff-assets/src/asset-loader.js';
//
//   const assets = new FreebuffAssets({ basePath: './freebuff-assets/' });
//   await assets.loadIndex();
//   const fighter = assets.find({ tags: ['walk-cycle'] })[0];
//   const run = await assets.loadClip(fighter.id, 'walk');
//
// No dependencies, no bundler. Works in any modern browser; a Node test can
// inject fetchImpl/imageFactory instead of using fetch and HTMLImageElement.
import { AssetCache } from './asset-cache.js';
import { searchAssets, listStates } from './asset-search.js';

function joinUrl(basePath, relative) {
  if (/^[a-z]+:\/\//i.test(basePath)) {
    const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
    return new URL(relative.replace(/^\.?\//, ''), base).href;
  }
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${base}${String(relative).replace(/^\.?\//, '')}`;
}

function defaultImageFactory() {
  return () => {
    if (typeof Image === 'undefined') {
      throw new Error(
        'No Image constructor available; pass an imageFactory option to load sheets outside a browser.',
      );
    }
    return new Image();
  };
}

function loadImageElement(image, url) {
  return new Promise((resolve, reject) => {
    if (image.complete && image.naturalWidth) {
      resolve(image);
      return;
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load image ${url}`));
    image.src = url;
  });
}

export class FreebuffAssets {
  constructor(options = {}) {
    this.basePath = options.basePath ?? './freebuff-assets/';
    this.indexUrl = options.indexUrl ?? joinUrl(this.basePath, 'ASSET_INDEX.json');
    this.fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.imageFactory = options.imageFactory ?? defaultImageFactory();
    this.cache = new AssetCache();
    this.index = null;
    this.byId = new Map();
  }

  get counts() {
    return this.index?.counts ?? { assets: 0, clips: 0, sources: 0 };
  }

  get assets() {
    return this.index?.assets ?? [];
  }

  get sources() {
    return this.index?.sources ?? [];
  }

  get states() {
    return listStates(this.index);
  }

  async loadIndex(url = this.indexUrl) {
    if (!this.fetchImpl) throw new Error('no fetch implementation available; call loadIndexFromObject');
    const response = await this.fetchImpl(url);
    if (!response.ok) throw new Error(`failed to load ${url}: HTTP ${response.status}`);
    return this.loadIndexFromObject(await response.json());
  }

  // Loads an already-parsed index (tests, server-side tooling, or a game that
  // bundles the JSON itself).
  loadIndexFromObject(index) {
    if (!index || !Array.isArray(index.assets)) throw new Error('asset index is missing an assets array');
    this.index = index;
    this.byId = new Map(index.assets.map((asset) => [asset.id, asset]));
    return this;
  }

  getAsset(id) {
    const asset = this.byId.get(id);
    if (!asset) throw new Error(`unknown asset: ${id}`);
    return asset;
  }

  hasAsset(id) {
    return this.byId.has(id);
  }

  // filter: { q, category, style, tags, state, kind, clip, limit }
  find(filter = {}) {
    if (!this.index) throw new Error('call loadIndex() or loadIndexFromObject() first');
    return searchAssets(this.index, filter);
  }

  getClip(assetId, clipName) {
    const asset = this.getAsset(assetId);
    const clips = asset.clips ?? [];
    const clip = clips.find((entry) => entry.name === clipName) ?? clips.find((entry) => entry.state === clipName);
    if (!clip) {
      throw new Error(`asset ${assetId} has no clip "${clipName}" (has: ${clips.map((c) => c.name).join(', ')})`);
    }
    return clip;
  }

  // Accepts ("asset-id", "walk") or the shorthand "asset-id:walk".
  getAnimation(assetId, clipName) {
    if (clipName === undefined && typeof assetId === 'string' && assetId.includes(':')) {
      const [id, name] = assetId.split(':');
      return this.getClip(id, name);
    }
    return this.getClip(assetId, clipName);
  }

  urlFor(assetId) {
    return joinUrl(this.basePath, this.getAsset(assetId).sheet);
  }

  // Loads (and caches) the sheet for an asset.
  async loadImage(assetId) {
    const asset = this.getAsset(assetId);
    const url = this.urlFor(assetId);
    return this.cache.load(asset.sheet, async () => {
      const image = this.imageFactory();
      return loadImageElement(image, url);
    });
  }

  // One call for the common case: sheet + clip metadata, ready for a canvas.
  async loadClip(assetId, clipName) {
    const asset = this.getAsset(assetId);
    const clip = this.getClip(assetId, clipName);
    const image = await this.loadImage(assetId);
    return { asset, clip, image, url: this.urlFor(assetId) };
  }

  async preload(assetIds) {
    return Promise.all(assetIds.map((id) => this.loadImage(id)));
  }

  clearCache() {
    this.cache.clear();
  }
}

export { searchAssets, listStates, joinUrl };
export default FreebuffAssets;
