#!/usr/bin/env node
// Regenerates ASSET_INDEX.json and manifests/ from tools/catalog.mjs plus the
// frame metadata committed next to each sheet. Deterministic: running it twice
// on the same tree produces byte-identical output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS, SOURCES, LICENSE } from './catalog.mjs';
import { pngSize, walkFiles } from './lib/png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readFrames(asset) {
  const dir = path.join(ROOT, 'assets', asset.category, asset.id);
  const sheetPath = path.join(dir, 'sheet.png');
  const spritePath = path.join(dir, 'sprite.png');
  const imageFile = fs.existsSync(sheetPath) ? sheetPath : spritePath;
  if (!fs.existsSync(imageFile)) {
    throw new Error(`${asset.id}: no sheet.png or sprite.png in ${dir}`);
  }
  const [width, height] = pngSize(imageFile);

  const xmlPath = path.join(dir, 'sheet.xml');
  const txtPath = path.join(dir, 'sheet.txt');
  let frames;
  let metaType;

  if (fs.existsSync(xmlPath)) {
    metaType = 'sparrow-xml';
    const text = fs.readFileSync(xmlPath, 'utf8');
    frames = [...text.matchAll(/<SubTexture\s+name="([^"]+)"([^>]*)>/g)].map((match) => {
      const attrs = match[2];
      const num = (key) => {
        const found = attrs.match(new RegExp(`${key}="(-?\\d+)"`));
        return found ? Number(found[1]) : undefined;
      };
      const frame = {
        name: match[1].replace(/\.png$/i, ''),
        x: num('x'),
        y: num('y'),
        w: num('width'),
        h: num('height'),
      };
      const frameWidth = num('frameWidth');
      const frameHeight = num('frameHeight');
      if (frameWidth && frameHeight) {
        frame.frameWidth = frameWidth;
        frame.frameHeight = frameHeight;
        frame.offsetX = num('frameX') ?? 0;
        frame.offsetY = num('frameY') ?? 0;
      }
      return frame;
    });
  } else if (fs.existsSync(txtPath)) {
    metaType = 'text-table';
    frames = fs
      .readFileSync(txtPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, ...numbers] = line.split('=');
        const [x, y, w, h] = numbers.join('=').trim().split(/\s+/).map(Number);
        return { name: name.trim(), x, y, w, h };
      });
  } else {
    metaType = 'image';
    frames = [{ name: 'sheet', x: 0, y: 0, w: width, h: height }];
  }

  if (asset.stripPrefix) {
    frames = frames.map((frame) => ({
      ...frame,
      name: frame.name.startsWith(asset.stripPrefix)
        ? frame.name.slice(asset.stripPrefix.length)
        : frame.name,
    }));
  }

  return { imageFile, width, height, frames, metaType, metaPath: xmlPath, txtPath };
}

function orderKey(frame) {
  const digits = frame.name.match(/(\d+)$/);
  return digits ? Number(digits[1]) : 0;
}

function matchesPrefix(frameName, prefix) {
  if (prefix === '*') return true;
  if (frameName === prefix) return true;
  if (!frameName.startsWith(prefix)) return false;
  return /^[_-]?\d+$/.test(frameName.slice(prefix.length));
}

function resolveClips(asset, frames, sheetWidth, sheetHeight) {
  return asset.clips.map((clip) => {
    const matched = frames.filter((frame) => matchesPrefix(frame.name, clip.from));
    if (matched.length === 0) {
      throw new Error(
        `${asset.id}: clip "${clip.name}" matched no frames for prefix "${clip.from}"`,
      );
    }
    matched.sort((a, b) => orderKey(a) - orderKey(b) || a.name.localeCompare(b.name));
    for (const frame of matched) {
      if (frame.x < 0 || frame.y < 0 || frame.x + frame.w > sheetWidth || frame.y + frame.h > sheetHeight) {
        throw new Error(`${asset.id}: frame ${frame.name} falls outside the ${sheetWidth}x${sheetHeight} sheet`);
      }
    }
    const frameWidth = Math.max(...matched.map((f) => f.frameWidth ?? f.w));
    const frameHeight = Math.max(...matched.map((f) => f.frameHeight ?? f.h));
    return {
      name: clip.name,
      state: clip.state,
      kind: matched.length > 1 ? 'animation' : 'sprite',
      fps: clip.fps,
      loop: clip.loop,
      frameCount: matched.length,
      frameWidth,
      frameHeight,
      frames: matched,
    };
  });
}

const assets = [];
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

for (const asset of ASSETS) {
  const source = SOURCES[asset.source];
  if (!source) throw new Error(`${asset.id}: unknown source "${asset.source}"`);
  const data = readFrames(asset);
  const clips = resolveClips(asset, data.frames, data.width, data.height);
  assets.push({
    id: asset.id,
    name: asset.name,
    category: asset.category,
    style: asset.style,
    tags: [...asset.tags].sort(),
    source: asset.source,
    sheet: rel(data.imageFile),
    sheetSize: [data.width, data.height],
    frameMetadata: { type: data.metaType, file: rel(data.metaPath) },
    ...(asset.stripPrefix ? { frameNameStripped: asset.stripPrefix } : {}),
    license: source.license,
    licenseUrl: source.licenseUrl,
    creator: source.creator,
    attribution: `${source.title} by ${source.creator} (${source.page}) — ${source.license}`,
    redistributionAllowed: true,
    placeholder: false,
    clips,
  });
}

assets.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));

const allClips = assets.flatMap((asset) => asset.clips.map((clip) => ({ asset: asset.id, ...clip })));
const usedSources = Object.keys(SOURCES).filter((id) => assets.some((a) => a.source === id));

const index = {
  schemaVersion: 1,
  name: 'Freebuff universal game asset library',
  description:
    'Curated, license-verified CC0 1.0 art for HTML5/JavaScript games, with per-clip frame metadata taken from the original packs.',
  license: LICENSE,
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  basePath: './',
  generatedBy: 'tools/build-index.mjs',
  counts: {
    assets: assets.length,
    clips: allClips.length,
    animations: allClips.filter((c) => c.kind === 'animation').length,
    sprites: allClips.filter((c) => c.kind === 'sprite').length,
    sources: usedSources.length,
    frames: assets.reduce((sum, a) => sum + a.clips.reduce((n, c) => n + c.frameCount, 0), 0),
  },
  sources: usedSources.map((id) => {
    const source = SOURCES[id];
    return {
      id,
      ...source,
      assets: assets.filter((a) => a.source === id).length,
      clips: allClips.filter((c) => assets.find((a) => a.id === c.asset)?.source === id).length,
    };
  }),
  assets,
};

for (const source of index.sources) {
  const licensePath = path.join(ROOT, source.licenseFile);
  if (!fs.existsSync(licensePath)) throw new Error(`missing license file ${source.licenseFile}`);
}

fs.writeFileSync(path.join(ROOT, 'ASSET_INDEX.json'), `${JSON.stringify(index, null, 2)}\n`);

const manifestsDir = path.join(ROOT, 'manifests');
fs.mkdirSync(manifestsDir, { recursive: true });
fs.writeFileSync(
  path.join(manifestsDir, 'sources.json'),
  `${JSON.stringify({ license: LICENSE, counts: { sources: index.sources.length }, sources: index.sources }, null, 2)}\n`,
);

const pick = (categories) => assets.filter((a) => categories.includes(a.category));
const manifestFor = (name, categories) =>
  fs.writeFileSync(
    path.join(manifestsDir, `${name}.json`),
    `${JSON.stringify(
      {
        generatedBy: 'tools/build-index.mjs',
        notice: 'Index entries only; see ASSET_INDEX.json for frame metadata.',
        assets: pick(categories).map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          style: a.style,
          tags: a.tags,
          sheet: a.sheet,
          clips: a.clips.map((c) => ({ name: c.name, state: c.state, kind: c.kind, frameCount: c.frameCount })),
        })),
      },
      null,
      2,
    )}\n`,
  );

manifestFor('characters', ['characters']);
manifestFor('animations', ['characters', 'effects', 'projectiles', 'powers']);
manifestFor('powers', ['powers', 'projectiles']);
manifestFor('effects', ['effects']);

// Guard: every committed asset folder must be represented in the catalog.
const folders = walkFiles(path.join(ROOT, 'assets'))
  .map((file) => rel(file))
  .filter((file) => file.endsWith('/sheet.png') || file.endsWith('/sprite.png'));
const indexed = new Set(assets.map((a) => a.sheet));
for (const file of folders) {
  if (!indexed.has(file)) throw new Error(`asset folder not in catalog: ${file}`);
}

console.log(
  `built ASSET_INDEX.json — ${index.counts.assets} assets, ${index.counts.clips} clips ` +
    `(${index.counts.animations} animations, ${index.counts.sprites} sprites), ` +
    `${index.counts.sources} sources, ${index.counts.frames} frame records`,
);
