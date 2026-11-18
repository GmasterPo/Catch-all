// Small dependency-free cache with in-flight de-duplication.
//
// Games typically request the same sheet from several systems in the same
// frame; load() shares one promise per key so the image is fetched once.
export class AssetCache {
  constructor() {
    this.entries = new Map();
    this.pending = new Map();
  }

  get size() {
    return this.entries.size;
  }

  has(key) {
    return this.entries.has(key);
  }

  get(key) {
    return this.entries.get(key);
  }

  set(key, value) {
    this.entries.set(key, value);
    return value;
  }

  delete(key) {
    this.pending.delete(key);
    return this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
    this.pending.clear();
  }

  keys() {
    return [...this.entries.keys()];
  }

  // Returns the cached value, or runs factory() once and caches its result.
  // A rejected factory is not cached, so a later retry can succeed.
  async load(key, factory) {
    if (this.entries.has(key)) return this.entries.get(key);
    if (this.pending.has(key)) return this.pending.get(key);

    const promise = Promise.resolve()
      .then(factory)
      .then((value) => {
        this.entries.set(key, value);
        this.pending.delete(key);
        return value;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }
}

export default AssetCache;
