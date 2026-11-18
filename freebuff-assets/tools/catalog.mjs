// Catalog of every asset that ships in freebuff-assets/.
//
// This file is the single source of truth: tools/build-index.mjs reads it,
// parses the committed frame metadata next to each sheet, and regenerates
// ASSET_INDEX.json plus the manifests. Every entry points at real frame data
// from the original CC0 pack — no frame rectangles are hand-written here.
//
// Adding an asset: copy the sheet plus its frame metadata into
// assets/<category>/<id>/, add a source if needed, then add an entry below and
// run `npm run build` followed by `npm run validate`.

export const LICENSE = 'CC0-1.0';

export const SOURCES = {
  'platformer-deluxe': {
    title: 'Platformer Art Deluxe',
    creator: 'Kenney (Kenney Vleugels)',
    creatorUrl: 'https://www.kenney.nl',
    license: LICENSE,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/platformer-art-deluxe',
    download: 'https://opengameart.org/sites/default/files/platformerGraphicsDeluxe_Updated.zip',
    licenseFile: 'licenses/platformer-deluxe.txt',
  },
  'platformer-pixel-redux': {
    title: 'Platformer Art: Pixel Redux',
    creator: 'Kenney (Kenney Vleugels)',
    creatorUrl: 'https://www.kenney.nl',
    license: LICENSE,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/platformer-art-pixel-redux',
    download: 'https://opengameart.org/sites/default/files/Platformer%20Art%20Pixel%20Redux.zip',
    licenseFile: 'licenses/platformer-pixel-redux.txt',
  },
  'space-shooter-redux': {
    title: 'Space Shooter Redux',
    creator: 'Kenney (Kenney Vleugels)',
    creatorUrl: 'https://www.kenney.nl',
    license: LICENSE,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/space-shooter-redux',
    download: 'https://opengameart.org/sites/default/files/SpaceShooterRedux.zip',
    licenseFile: 'licenses/space-shooter-redux.txt',
  },
  'ui-pack': {
    title: 'UI Pack',
    creator: 'Kenney (Kenney Vleugels)',
    creatorUrl: 'https://www.kenney.nl',
    license: LICENSE,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/ui-pack',
    download: 'https://opengameart.org/sites/default/files/kenney_ui-pack.zip',
    licenseFile: 'licenses/ui-pack.txt',
  },
  'racing-pack': {
    title: 'Racing Pack',
    creator: 'Kenney (Kenney Vleugels)',
    creatorUrl: 'https://www.kenney.nl',
    license: LICENSE,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/racing-pack',
    download: 'https://opengameart.org/sites/default/files/racing-pack.zip',
    licenseFile: 'licenses/racing-pack.txt',
  },
  'background-elements': {
    title: 'Background Elements',
    creator: 'Kenney (Kenney Vleugels)',
    creatorUrl: 'https://www.kenney.nl',
    license: LICENSE,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/background-elements',
    download: 'https://opengameart.org/sites/default/files/kenney_backgroundElements.zip',
    licenseFile: 'licenses/background-elements.txt',
  },
  'generic-items': {
    title: 'Generic Items',
    creator: 'Kenney (Kenney Vleugels)',
    creatorUrl: 'https://www.kenney.nl',
    license: LICENSE,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/generic-items',
    download: 'https://opengameart.org/sites/default/files/kenney_genericItems_updatedCross.zip',
    licenseFile: 'licenses/generic-items.txt',
  },
  'physics-assets': {
    title: 'Physics Assets',
    creator: 'Kenney (Kenney Vleugels)',
    creatorUrl: 'https://www.kenney.nl',
    license: LICENSE,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: 'https://opengameart.org/content/physics-assets',
    download: 'https://opengameart.org/sites/default/files/kenney_physicsAssets_v2.zip',
    licenseFile: 'licenses/physics-assets.txt',
  },
};

// Clip shorthand:
//   { name, state, from, fps, loop }
//   `from` is a frame-name prefix. A frame matches when its name (minus .png) is
//   the prefix itself or the prefix plus an optional _/- and a frame number, so
//   `walk` collects walk01..walk11 while `beam` collects beam0..beam6 and does
//   not swallow beamLong1. An entry with no `meta` is a single image and gets one
//   `default` clip covering the whole file.
const sprite = (name, from) => ({ name, state: 'sprite', from, fps: 0, loop: false });
const anim = (name, state, from, fps, loop = true) => ({ name, state, from, fps, loop });

export const ASSETS = [
  // ── characters ────────────────────────────────────────────────────────────
  {
    id: 'hero-platformer-red',
    name: 'Platformer Hero — Red',
    category: 'characters',
    style: '16-bit-pixel',
    tags: ['hero', 'platformer', 'walk-cycle', 'jump', 'player'],
    source: 'platformer-deluxe',
    stripPrefix: 'p1_',
    clips: [
      anim('idle', 'idle', 'stand', 6),
      anim('walk', 'walk', 'walk', 12),
      anim('jump', 'jump', 'jump', 12, false),
      anim('crouch', 'crouch', 'duck', 1, false),
      anim('hurt', 'hurt', 'hurt', 12, false),
      anim('front', 'idle', 'front', 1, false),
    ],
  },
  {
    id: 'hero-platformer-green',
    name: 'Platformer Hero — Green',
    category: 'characters',
    style: '16-bit-pixel',
    tags: ['hero', 'platformer', 'walk-cycle', 'jump', 'player'],
    source: 'platformer-deluxe',
    stripPrefix: 'p2_',
    clips: [
      anim('idle', 'idle', 'stand', 6),
      anim('walk', 'walk', 'walk', 12),
      anim('jump', 'jump', 'jump', 12, false),
      anim('crouch', 'crouch', 'duck', 1, false),
      anim('hurt', 'hurt', 'hurt', 12, false),
      anim('front', 'idle', 'front', 1, false),
    ],
  },
  {
    id: 'hero-platformer-blue',
    name: 'Platformer Hero — Blue',
    category: 'characters',
    style: '16-bit-pixel',
    tags: ['hero', 'platformer', 'walk-cycle', 'jump', 'player'],
    source: 'platformer-deluxe',
    stripPrefix: 'p3_',
    clips: [
      anim('idle', 'idle', 'stand', 6),
      anim('walk', 'walk', 'walk', 12),
      anim('jump', 'jump', 'jump', 12, false),
      anim('crouch', 'crouch', 'duck', 1, false),
      anim('hurt', 'hurt', 'hurt', 12, false),
      anim('front', 'idle', 'front', 1, false),
    ],
  },
  {
    id: 'racer-characters',
    name: 'Racing Characters',
    category: 'characters',
    style: 'flat-vector',
    tags: ['racer', 'driver', 'top-down', 'cast'],
    source: 'racing-pack',
    clips: [
      sprite('racer-blue', 'racer_blue'),
      sprite('racer-red', 'racer_red'),
      sprite('racer-green', 'racer_green'),
      sprite('racer-black', 'racer_black'),
      sprite('racer-yellow', 'racer_yellow'),
    ],
  },
  {
    id: 'pixel-adventurers',
    name: 'Pixel Adventurers Sheet',
    category: 'characters',
    style: '8-bit-pixel',
    tags: ['adventurer', 'pixel', 'sheet', 'platformer'],
    source: 'platformer-pixel-redux',
    clips: [sprite('sheet', '*')],
  },

  // ── effects ───────────────────────────────────────────────────────────────
  {
    id: 'space-effects',
    name: 'Space Effects Atlas',
    category: 'effects',
    style: 'flat-vector',
    tags: ['explosion', 'beam', 'engine', 'thruster', 'hit'],
    source: 'space-shooter-redux',
    clips: [
      anim('fire', 'explosion', 'fire', 24, false),
      anim('beam', 'beam', 'beam', 18, false),
      anim('beam-long', 'beam', 'beamLong', 18, false),
      anim('scratch', 'hit', 'scratch', 18, false),
      anim('engine', 'thruster', 'engine', 14),
    ],
  },
  {
    id: 'explosion-atlas',
    name: 'Explosion Atlas',
    category: 'effects',
    style: 'flat-vector',
    tags: ['explosion', 'blast', 'debris', 'impact'],
    source: 'physics-assets',
    clips: [anim('detonate', 'explosion', 'elementExplosive', 30, false)],
  },
  {
    id: 'debris-atlas',
    name: 'Debris Atlas',
    category: 'effects',
    style: 'flat-vector',
    tags: ['debris', 'shatter', 'glass', 'stone', 'wood'],
    source: 'physics-assets',
    clips: [
      anim('glass', 'hit', 'debrisGlass', 18, false),
      anim('stone', 'hit', 'debrisStone', 18, false),
      anim('wood', 'hit', 'debrisWood', 18, false),
    ],
  },

  // ── projectiles ───────────────────────────────────────────────────────────
  {
    id: 'space-lasers',
    name: 'Space Lasers',
    category: 'projectiles',
    style: 'flat-vector',
    tags: ['laser', 'shot', 'projectile', 'bullet'],
    source: 'space-shooter-redux',
    clips: [
      anim('laser-blue', 'projectile', 'laserBlue', 24, false),
      anim('laser-green', 'projectile', 'laserGreen', 24, false),
      anim('laser-red', 'projectile', 'laserRed', 24, false),
    ],
  },

  // ── powers ────────────────────────────────────────────────────────────────
  {
    id: 'space-shields',
    name: 'Space Shields and Power-ups',
    category: 'powers',
    style: 'flat-vector',
    tags: ['shield', 'powerup', 'pickup', 'buff'],
    source: 'space-shooter-redux',
    clips: [
      anim('shield', 'block', 'shield', 12),
      anim('star', 'power', 'star', 12),
      sprite('powerup-blue', 'powerupBlue'),
      sprite('powerup-red', 'powerupRed'),
    ],
  },

  // ── objects ───────────────────────────────────────────────────────────────
  {
    id: 'platformer-items',
    name: 'Platformer Items',
    category: 'objects',
    style: '16-bit-pixel',
    tags: ['coin', 'gem', 'bomb', 'item', 'pickup'],
    source: 'platformer-deluxe',
    clips: [
      sprite('coin-gold', 'coinGold'),
      sprite('gem-red', 'gemRed'),
      sprite('bomb', 'bomb'),
      sprite('fireball', 'fireball'),
      sprite('star', 'star'),
      sprite('springboard', 'springboardUp'),
    ],
  },
  {
    id: 'platformer-hud',
    name: 'Platformer HUD',
    category: 'objects',
    style: '16-bit-pixel',
    tags: ['hud', 'heart', 'health', 'coin', 'interface'],
    source: 'platformer-deluxe',
    clips: [
      sprite('heart-full', 'hud_heartFull'),
      sprite('heart-half', 'hud_heartHalf'),
      sprite('heart-empty', 'hud_heartEmpty'),
      sprite('coins', 'hud_coins'),
      sprite('gem-blue', 'hud_gem_blue'),
    ],
  },
  {
    id: 'platformer-tiles',
    name: 'Platformer Tiles',
    category: 'objects',
    style: '16-bit-pixel',
    tags: ['tile', 'tileset', 'terrain', 'grass', 'water'],
    source: 'platformer-deluxe',
    clips: [
      sprite('grass', 'grassMid'),
      sprite('dirt', 'dirtMid'),
      sprite('box-coin', 'boxCoin'),
      sprite('water', 'liquidWater'),
      sprite('snow', 'snowMid'),
      sprite('castle', 'castleMid'),
    ],
  },
  {
    id: 'generic-items-colored',
    name: 'Generic Items — Colored',
    category: 'objects',
    style: 'flat-vector',
    tags: ['items', 'icons', 'inventory', 'colored'],
    source: 'generic-items',
    clips: [
      sprite('item-001', 'genericItem_color_001'),
      sprite('item-002', 'genericItem_color_002'),
      sprite('item-003', 'genericItem_color_003'),
      sprite('item-004', 'genericItem_color_004'),
      sprite('item-005', 'genericItem_color_005'),
    ],
  },
  {
    id: 'generic-items-white',
    name: 'Generic Items — White',
    category: 'objects',
    style: 'flat-vector',
    tags: ['items', 'icons', 'inventory', 'white', 'tintable'],
    source: 'generic-items',
    clips: [
      sprite('item-001', 'genericItem_white_001'),
      sprite('item-002', 'genericItem_white_002'),
      sprite('item-003', 'genericItem_white_003'),
      sprite('item-004', 'genericItem_white_004'),
    ],
  },
  {
    id: 'racing-vehicles',
    name: 'Racing Vehicles',
    category: 'objects',
    style: 'flat-vector',
    tags: ['car', 'vehicle', 'racer', 'top-down'],
    source: 'racing-pack',
    clips: [
      anim('car-blue', 'drive', 'car_blue', 12, false),
      anim('car-red', 'drive', 'car_red', 12, false),
      anim('car-black', 'drive', 'car_black', 12, false),
      anim('car-yellow', 'drive', 'car_yellow', 12, false),
      anim('car-green', 'drive', 'car_green', 12, false),
    ],
  },
  {
    id: 'racing-objects',
    name: 'Racing Track Objects',
    category: 'objects',
    style: 'flat-vector',
    tags: ['props', 'track', 'prop', 'obstacle'],
    source: 'racing-pack',
    clips: [
      sprite('cone', 'cone_straight'),
      sprite('barrel', 'barrel_red'),
      sprite('tires', 'tires_red'),
      sprite('barrier', 'barrier_red'),
      sprite('tribune', 'tribune_full'),
    ],
  },
  {
    id: 'physics-tiles',
    name: 'Physics Tiles',
    category: 'objects',
    style: 'flat-vector',
    tags: ['coin', 'star', 'flag', 'prop'],
    source: 'physics-assets',
    clips: [
      sprite('coin-gold', 'coinGold'),
      sprite('star-gold', 'starGold'),
      sprite('flag-blue', 'flagBlue'),
      sprite('bush', 'bush'),
      sprite('rock', 'rock'),
    ],
  },

  // ── environments ──────────────────────────────────────────────────────────
  {
    id: 'background-elements',
    name: 'Background Elements',
    category: 'environments',
    style: 'flat-vector',
    tags: ['sky', 'cloud', 'mountain', 'castle', 'tree'],
    source: 'background-elements',
    clips: [
      sprite('cloud-small', 'cloud1'),
      sprite('cloud-mid', 'cloud2'),
      sprite('cloud-bank', 'cloud8'),
      sprite('mountain', 'mountain1'),
      sprite('castle', 'castle'),
      sprite('tree', 'tree01'),
      sprite('sun', 'sun'),
      sprite('hills', 'hills1'),
    ],
  },
  {
    id: 'racing-tiles',
    name: 'Racing Tiles',
    category: 'environments',
    style: 'flat-vector',
    tags: ['tile', 'road', 'terrain', 'track'],
    source: 'racing-pack',
    clips: [
      sprite('land-grass', 'land_grass'),
      sprite('land-sand', 'land_sand'),
      sprite('road-asphalt', 'road_asphalt'),
      sprite('road-dirt', 'road_dirt'),
    ],
  },
  {
    id: 'physics-aliens',
    name: 'Physics Aliens',
    category: 'environments',
    style: 'flat-vector',
    tags: ['character', 'alien', 'physics', 'prop'],
    source: 'physics-assets',
    clips: [
      sprite('alien-blue', 'alienBlue_suit'),
      sprite('alien-green', 'alienGreen_suit'),
      sprite('alien-pink', 'alienPink_round'),
      sprite('alien-yellow', 'alienYellow_square'),
    ],
  },
  {
    id: 'physics-elements',
    name: 'Physics Materials',
    category: 'environments',
    style: 'flat-vector',
    tags: ['metal', 'stone', 'wood', 'blocks', 'physics'],
    source: 'physics-assets',
    clips: [
      sprite('metal', 'elementMetal'),
      sprite('stone', 'elementStone'),
      sprite('wood', 'elementWood'),
    ],
  },
  {
    id: 'pixel-backdrops',
    name: 'Pixel Backdrops',
    category: 'environments',
    style: '8-bit-pixel',
    tags: ['background', 'backdrop', 'sky', 'pixel'],
    source: 'platformer-pixel-redux',
    clips: [sprite('sheet', '*')],
  },

  // ── interfaces ────────────────────────────────────────────────────────────
  ...interfaceAssets(),
];

function interfaceAssets() {
  const entries = [
    ['button-rectangle-flat', 'Button — Rectangle Flat', ['button', 'ui', 'flat']],
    ['button-rectangle-border', 'Button — Rectangle Outline', ['button', 'ui', 'outline']],
    ['button-rectangle-depth-flat', 'Button — Rectangle Depth', ['button', 'ui', 'depth']],
    ['button-rectangle-gloss', 'Button — Rectangle Gloss', ['button', 'ui', 'gloss']],
    ['button-round-flat', 'Button — Round Flat', ['button', 'ui', 'round']],
    ['button-round-border', 'Button — Round Outline', ['button', 'ui', 'round', 'outline']],
    ['button-round-depth-flat', 'Button — Round Depth', ['button', 'ui', 'round', 'depth']],
    ['button-square-flat', 'Button — Square Flat', ['button', 'ui', 'square']],
    ['button-square-border', 'Button — Square Outline', ['button', 'ui', 'square', 'outline']],
    ['arrow-basic-n', 'Arrow — Basic North', ['arrow', 'ui', 'direction']],
    ['arrow-basic-e', 'Arrow — Basic East', ['arrow', 'ui', 'direction']],
    ['arrow-basic-s', 'Arrow — Basic South', ['arrow', 'ui', 'direction']],
    ['arrow-basic-w', 'Arrow — Basic West', ['arrow', 'ui', 'direction']],
    ['arrow-decorative-n', 'Arrow — Decorative North', ['arrow', 'ui', 'decorative']],
    ['icon-checkmark', 'Icon — Checkmark', ['icon', 'ui', 'confirm']],
    ['icon-cross', 'Icon — Cross', ['icon', 'ui', 'close']],
    ['icon-circle', 'Icon — Circle', ['icon', 'ui', 'shape']],
    ['icon-square', 'Icon — Square', ['icon', 'ui', 'shape']],
    ['icon-outline-checkmark', 'Icon — Checkmark Outline', ['icon', 'ui', 'confirm', 'outline']],
    ['icon-outline-cross', 'Icon — Cross Outline', ['icon', 'ui', 'close', 'outline']],
    ['star', 'Icon — Star', ['icon', 'ui', 'favourite', 'rating']],
    ['star-outline', 'Icon — Star Outline', ['icon', 'ui', 'favourite', 'outline']],
    ['check-square-color-checkmark', 'Checkbox — Square Checked', ['checkbox', 'ui', 'form']],
    ['slide-horizontal-color', 'Slider — Horizontal', ['slider', 'ui', 'form']],
    ['slide-vertical-color', 'Slider — Vertical', ['slider', 'ui', 'form']],
  ];

  return entries.map(([slug, name, tags]) => ({
    id: `ui-blue-${slug}`,
    name,
    category: 'interfaces',
    style: 'flat-vector',
    tags: ['blue', ...tags],
    source: 'ui-pack',
    clips: [sprite('default', '*')],
  }));
}

export default { LICENSE, SOURCES, ASSETS };
