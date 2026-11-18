// Index searching for FreebuffAssets.
//
// Everything here is pure: pass an index object (or the loader's index) and get
// matching assets back. Filters combine, and text is scored so an exact id beats
// a tag hit and a tag hit beats a loose description match.

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalise(text) {
  return String(text ?? '').toLowerCase();
}

function scoreAsset(asset, query) {
  if (!query) return 0;
  const q = normalise(query);
  const id = normalise(asset.id);
  const name = normalise(asset.name);
  let score = 0;

  if (id === q) score = Math.max(score, 120);
  if (name === q) score = Math.max(score, 110);
  if (id.startsWith(q)) score = Math.max(score, 90);
  if (name.startsWith(q)) score = Math.max(score, 80);
  if (id.includes(q)) score = Math.max(score, 60);
  if (name.includes(q)) score = Math.max(score, 50);
  for (const tag of asset.tags ?? []) {
    const value = normalise(tag);
    if (value === q) score = Math.max(score, 70);
    else if (value.includes(q)) score = Math.max(score, 40);
  }
  if (normalise(asset.category).includes(q)) score = Math.max(score, 30);
  if (normalise(asset.style).includes(q)) score = Math.max(score, 20);
  for (const clip of asset.clips ?? []) {
    if (normalise(clip.name) === q) score = Math.max(score, 65);
    else if (normalise(clip.name).includes(q)) score = Math.max(score, 35);
    if (normalise(clip.state) === q) score = Math.max(score, 45);
  }
  return score;
}

function hasClip(asset, { state, kind, clip }) {
  const wantedState = asArray(state).map(normalise);
  const wantedKind = asArray(kind).map(normalise);
  const wantedClip = asArray(clip).map(normalise);

  return (asset.clips ?? []).some((entry) => {
    if (wantedState.length && !wantedState.includes(normalise(entry.state))) return false;
    if (wantedKind.length && !wantedKind.includes(normalise(entry.kind))) return false;
    if (wantedClip.length && !wantedClip.includes(normalise(entry.name))) return false;
    return true;
  });
}

// filter: { q, category, style, tags, state, kind, clip, limit }
export function searchAssets(index, filter = {}) {
  const assets = index?.assets ?? [];
  const { q, category, style, tags, state, kind, clip, limit } = filter;

  const wantedCategories = asArray(category).map(normalise);
  const wantedStyles = asArray(style).map(normalise);
  const wantedTags = asArray(tags).map(normalise);

  const scored = [];
  for (const asset of assets) {
    if (wantedCategories.length && !wantedCategories.includes(normalise(asset.category))) continue;
    if (wantedStyles.length && !wantedStyles.includes(normalise(asset.style))) continue;
    if (wantedTags.length) {
      const assetTags = (asset.tags ?? []).map(normalise);
      if (!wantedTags.every((tag) => assetTags.includes(tag))) continue;
    }
    if ((state || kind || clip) && !hasClip(asset, { state, kind, clip })) continue;

    const score = scoreAsset(asset, q);
    if (q && score === 0) continue;
    scored.push({ asset, score });
  }

  scored.sort((a, b) => b.score - a.score || a.asset.id.localeCompare(b.asset.id));
  const results = scored.map((entry) => entry.asset);
  return typeof limit === 'number' ? results.slice(0, limit) : results;
}

// Every animation state present in the library, e.g. walk, jump, block.
export function listStates(index) {
  const states = new Set();
  for (const asset of index?.assets ?? []) {
    for (const clip of asset.clips ?? []) {
      if (clip.state && clip.state !== 'sprite') states.add(clip.state);
    }
  }
  return [...states].sort();
}

// Animation clips that carry a given state, across the whole library.
export function clipsByState(index, state) {
  const wanted = normalise(state);
  return (index?.assets ?? []).flatMap((asset) =>
    (asset.clips ?? [])
      .filter((clip) => normalise(clip.state) === wanted && clip.kind === 'animation')
      .map((clip) => ({ asset, clip })),
  );
}

export default { searchAssets, listStates, clipsByState };
