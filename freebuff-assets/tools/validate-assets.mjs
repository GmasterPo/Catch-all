#!/usr/bin/env node
// Validates the shipped library without network access:
//   - index/manifest JSON parses and counts agree
//   - every asset file exists, is a PNG, and matches the recorded sheet size
//   - every clip has frames, and every frame lies inside its sheet
//   - every asset carries CC0 1.0 provenance, a known source and a license file
//   - categories map to real folders and every asset folder is indexed
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pngSize, walkFiles } from './lib/png.mjs';
import { ASSETS, SOURCES, LICENSE } from './catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  } catch (error) {
    fail(`${file}: ${error.message}`);
    return null;
  }
}

const index = readJson('ASSET_INDEX.json');
if (index) {
  if (index.license !== LICENSE) fail(`index license is ${index.license}, expected ${LICENSE}`);
  if (!Array.isArray(index.assets) || index.assets.length === 0) fail('index has no assets');

  const ids = new Set();
  const clipNames = new Set();
  let clips = 0;
  let animations = 0;
  let frames = 0;

  for (const asset of index.assets) {
    if (ids.has(asset.id)) fail(`duplicate asset id: ${asset.id}`);
    ids.add(asset.id);

    const source = SOURCES[asset.source];
    if (!source) fail(`${asset.id}: unknown source ${asset.source}`);
    if (asset.license !== LICENSE) fail(`${asset.id}: license ${asset.license} is not ${LICENSE}`);
    if (!asset.licenseUrl) fail(`${asset.id}: missing licenseUrl`);
    if (asset.redistributionAllowed !== true) fail(`${asset.id}: redistributionAllowed must be true`);
    if (asset.placeholder !== false) fail(`${asset.id}: placeholder records are not allowed`);
    if (!asset.creator) fail(`${asset.id}: missing creator`);
    if (!Array.isArray(asset.tags) || asset.tags.length === 0) fail(`${asset.id}: missing tags`);

    const sheetPath = path.join(ROOT, asset.sheet);
    if (!fs.existsSync(sheetPath)) {
      fail(`${asset.id}: sheet missing at ${asset.sheet}`);
      continue;
    }
    const [width, height] = pngSize(sheetPath);
    if (width !== asset.sheetSize[0] || height !== asset.sheetSize[1]) {
      fail(`${asset.id}: sheet is ${width}x${height}, index says ${asset.sheetSize.join('x')}`);
    }

    if (!asset.clips || asset.clips.length === 0) {
      fail(`${asset.id}: no clips`);
      continue;
    }
    for (const clip of asset.clips) {
      clips += 1;
      if (clip.kind === 'animation') animations += 1;
      const key = `${asset.id}:${clip.name}`;
      if (clipNames.has(key)) fail(`duplicate clip: ${key}`);
      clipNames.add(key);
      if (!clip.frames || clip.frames.length === 0) {
        fail(`${key}: no frames`);
        continue;
      }
      if (clip.frameCount !== clip.frames.length) fail(`${key}: frameCount mismatch`);
      if (!(clip.frameWidth > 0) || !(clip.frameHeight > 0)) fail(`${key}: bad frame size`);
      for (const frame of clip.frames) {
        frames += 1;
        if (frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0) {
          fail(`${key}: frame ${frame.name} has an invalid rectangle`);
        }
        if (frame.x + frame.w > width || frame.y + frame.h > height) {
          fail(`${key}: frame ${frame.name} exceeds the ${width}x${height} sheet`);
        }
      }
    }
  }

  const counters = {
    assets: index.counts.assets,
    clips: index.counts.clips,
    animations: index.counts.animations,
    sprites: index.counts.sprites,
    sources: index.counts.sources,
    frames: index.counts.frames,
  };
  if (counters.assets !== index.assets.length) fail(`counts.assets ${counters.assets} != ${index.assets.length}`);
  if (counters.clips !== clips) fail(`counts.clips ${counters.clips} != ${clips}`);
  if (counters.animations !== animations) fail(`counts.animations ${counters.animations} != ${animations}`);
  if (counters.sprites !== clips - animations) fail('counts.sprites mismatch');
  if (counters.frames !== frames) fail(`counts.frames ${counters.frames} != ${frames}`);

  const usedSources = new Set(index.assets.map((a) => a.source));
  if (counters.sources !== usedSources.size) fail(`counts.sources ${counters.sources} != ${usedSources.size}`);
  if (!index.sources || index.sources.length !== usedSources.size) fail('index.sources does not list every used source');
  for (const source of index.sources || []) {
    if (!fs.existsSync(path.join(ROOT, source.licenseFile))) {
      fail(`source ${source.id}: missing license file ${source.licenseFile}`);
    }
    if (source.license !== LICENSE) fail(`source ${source.id}: license is not ${LICENSE}`);
    if (!source.page || !source.download) fail(`source ${source.id}: missing provenance URL`);
  }

  // Every committed asset folder should be indexed, and vice versa.
  const exported = walkFiles(path.join(ROOT, 'assets'))
    .map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
    .filter((file) => file.endsWith('/sheet.png') || file.endsWith('/sprite.png'));
  const indexedSheets = new Set(index.assets.map((a) => a.sheet));
  for (const file of exported) if (!indexedSheets.has(file)) fail(`unindexed asset file: ${file}`);
  if (exported.length !== index.assets.length) {
    fail(`asset files ${exported.length} != indexed assets ${index.assets.length}`);
  }

  for (const [name, categories] of [
    ['characters', ['characters']],
    ['animations', ['characters', 'effects', 'projectiles', 'powers']],
    ['powers', ['powers', 'projectiles']],
    ['effects', ['effects']],
  ]) {
    const manifest = readJson(`manifests/${name}.json`);
    if (!manifest) continue;
    const expected = index.assets.filter((a) => categories.includes(a.category)).map((a) => a.id);
    const actual = manifest.assets.map((a) => a.id);
    if (expected.join(',') !== actual.join(',')) fail(`manifests/${name}.json does not match the index`);
  }

  const catalogIds = ASSETS.map((a) => a.id).sort();
  if (catalogIds.join(',') !== [...ids].sort().join(',')) fail('catalog and index asset ids differ');
}

if (failures.length) {
  console.error(`asset validation failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}

console.log(
  `assets valid — ${index.counts.assets} assets, ${index.counts.clips} clips ` +
    `(${index.counts.animations} animations, ${index.counts.sprites} sprites), ` +
    `${index.counts.sources} sources, ${index.counts.frames} frames, all ${LICENSE}`,
);
