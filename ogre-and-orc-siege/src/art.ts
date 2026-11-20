import * as THREE from 'three';
import { MAX_LEVEL } from './config';
import type { EnemyId, ProjectileKind, TowerId } from './defs';

type Ctx = CanvasRenderingContext2D;

const INK = '#111a23';

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { canvas, ctx };
}

const texCache = new Map<string, THREE.Texture>();

function cachedTexture(key: string, size: number, draw: (ctx: Ctx) => void): THREE.Texture {
  let tex = texCache.get(key);
  if (!tex) {
    const { canvas, ctx } = makeCanvas(size);
    draw(ctx);
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    texCache.set(key, tex);
  }
  return tex;
}

function path(ctx: Ctx, pts: number[], close = true): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  if (close) ctx.closePath();
}

function poly(ctx: Ctx, pts: number[], fill: string, stroke = INK, lw = 5): void {
  path(ctx, pts);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function circ(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke = INK, lw = 5): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function ell(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke = INK,
  lw = 5,
  rot = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function rrect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke = INK,
  lw = 5,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 0.55): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, 'rgba(6,10,14,0.5)');
  grad.addColorStop(0.6, 'rgba(6,10,14,0.26)');
  grad.addColorStop(1, 'rgba(6,10,14,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function flame(ctx: Ctx, x: number, y: number, w: number, h: number, outer: string, inner: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.bezierCurveTo(x + w * 0.95, y - h * 0.35, x + w * 0.78, y + h * 0.45, x, y + h * 0.5);
  ctx.bezierCurveTo(x - w * 0.78, y + h * 0.45, x - w * 0.95, y - h * 0.35, x, y - h);
  ctx.fillStyle = outer;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.55);
  ctx.bezierCurveTo(x + w * 0.45, y - h * 0.1, x + w * 0.35, y + h * 0.3, x, y + h * 0.32);
  ctx.bezierCurveTo(x - w * 0.35, y + h * 0.3, x - w * 0.45, y - h * 0.1, x, y - h * 0.55);
  ctx.fillStyle = inner;
  ctx.fill();
}

function gem(ctx: Ctx, x: number, y: number, r: number, fill: string, light: string): void {
  poly(ctx, [x, y - r, x + r * 0.75, y, x, y + r, x - r * 0.75, y], fill, INK, 4);
  poly(ctx, [x, y - r, x + r * 0.2, y - r * 0.1, x, y + r * 0.15, x - r * 0.2, y - r * 0.1], light, 'rgba(0,0,0,0)', 0);
}

// ---------------------------------------------------------------------------
// Tower icons
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Tower icons — one drawing per tower, styled by technological era
// ---------------------------------------------------------------------------

const TOWER_ACCENT: Record<TowerId, string> = {
  // Era I: timber, stone, iron
  archer: '#a8e07f',
  cannon: '#c3ccd6',
  ballista: '#d8c08a',
  frost: '#8fe0ff',
  // Era II: brass, steel, fire
  gatling: '#ffb262',
  mortar: '#b9a67e',
  flame: '#ff8a3c',
  tesla: '#7ce8ff',
  // Era III: gunmetal and optics
  sniper: '#9ad8c8',
  missile: '#ff9d6b',
  radar: '#8fe4c0',
  autocannon: '#d8b56a',
  // Era IV: energy white-blue
  laser: '#8fd8ff',
  plasma: '#c08bff',
  emp: '#7fd8ff',
  accelerator: '#a0f0ff',
  // Era V: exotic violet and teal
  quantum: '#c9a4ff',
  singularity: '#9d7bff',
  drone: '#7fe4d0',
  stormgen: '#a8ccff',
  // shelved
  artillery: '#ffd27a',
};

export const TOWER_SIZE: Record<TowerId, number> = {
  archer: 1.56,
  cannon: 1.62,
  ballista: 1.66,
  frost: 1.58,
  gatling: 1.64,
  mortar: 1.72,
  flame: 1.6,
  tesla: 1.72,
  sniper: 1.78,
  missile: 1.76,
  radar: 1.66,
  autocannon: 1.8,
  laser: 1.74,
  plasma: 1.76,
  emp: 1.7,
  accelerator: 1.84,
  quantum: 1.78,
  singularity: 1.82,
  drone: 1.8,
  stormgen: 1.84,
  artillery: 2.2,
};

/** Shared base plate: rim, level studs along the south rim, era accent ring. */
function plate(ctx: Ctx, accent: string, level: number, r = 52, core = '#1d2732'): void {
  shadow(ctx, 80, 118, r * 1.02, r * 0.38);
  circ(ctx, 80, 88, r, core, INK, 6);
  circ(ctx, 80, 88, r - 8, '#2a3644', 'rgba(0,0,0,0)', 0);
  ctx.beginPath();
  ctx.arc(80, 88, r - 5, 0, Math.PI * 2);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.95;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const lit = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)));
  const rim = r - 9;
  for (let i = 0; i < MAX_LEVEL; i++) {
    const t = MAX_LEVEL > 1 ? i / (MAX_LEVEL - 1) : 0.5;
    const a = Math.PI * (0.82 - t * 0.64);
    const x = 80 + Math.cos(a) * rim;
    const y = 88 + Math.sin(a) * rim;
    const on = i < lit;
    circ(ctx, x, y, 3.4, on ? '#f4d47a' : '#46525f', on ? INK : '#2a343f', 2);
  }
}

// ---------------------------------------------------------------- Era I

function archerIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.archer, level);
  circ(ctx, 80, 82, 42, '#9a6a3a', INK, 6);
  ctx.save();
  ctx.beginPath();
  ctx.arc(80, 82, 38, 0, Math.PI * 2);
  ctx.clip();
  for (let i = -2; i <= 2; i++) line(ctx, 40, 82 + i * 15, 120, 82 + i * 15, 'rgba(60,35,15,0.35)', 3);
  ctx.restore();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    circ(ctx, 80 + Math.cos(a) * 39, 82 + Math.sin(a) * 39, 4, '#6d4423', INK, 2.5);
  }
  // roof peak seen from above
  poly(ctx, [80, 42, 104, 78, 80, 96, 56, 78], '#b5813f', INK, 5);
  line(ctx, 80, 46, 80, 92, 'rgba(70,42,18,0.55)', 3);
  // bow and nocked arrow
  ctx.beginPath();
  ctx.arc(80, 84, 26, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = '#e3d3a6';
  ctx.lineWidth = 5;
  ctx.stroke();
  line(ctx, 80, 60, 80, 110, '#caa76c', 4);
  poly(ctx, [74, 60, 86, 60, 80, 46], '#d8d2bc', INK, 2.5);
}

function cannonIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.cannon, level);
  circ(ctx, 80, 86, 44, '#8e9299', INK, 6);
  ctx.save();
  ctx.beginPath();
  ctx.arc(80, 86, 40, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    const y = 54 + i * 13;
    line(ctx, 38, y, 122, y, 'rgba(58,64,72,0.4)', 3);
    line(ctx, 40, y + 5, 120, y + 2, 'rgba(58,64,72,0.25)', 2);
  }
  ctx.restore();
  rrect(ctx, 66, 24, 28, 86, 10, '#4b5560', INK, 6);
  rrect(ctx, 61, 20, 38, 16, 6, '#2f3740', INK, 5);
  rrect(ctx, 64, 98, 32, 14, 6, '#2f3740', INK, 5);
  line(ctx, 72, 40, 72, 96, 'rgba(190,205,218,0.35)', 4);
  for (const [x, y] of [
    [48, 78],
    [38, 88],
    [52, 90],
  ]) {
    circ(ctx, x, y, 7, '#2d333a', INK, 3);
  }
}

function ballistaIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.ballista, level);
  // timber frame
  rrect(ctx, 58, 58, 44, 58, 8, '#7d5730', INK, 5);
  for (const x of [52, 100]) rrect(ctx, x, 40, 12, 46, 5, '#8f6236', INK, 4);
  // torsion arms
  line(ctx, 58, 44, 34, 22, '#d9c48c', 6);
  line(ctx, 102, 44, 126, 22, '#d9c48c', 6);
  ctx.beginPath();
  ctx.moveTo(34, 22);
  ctx.lineTo(80, 40);
  ctx.lineTo(126, 22);
  ctx.strokeStyle = '#f0e3bb';
  ctx.lineWidth = 3;
  ctx.stroke();
  // loaded bolt
  rrect(ctx, 76, 18, 9, 66, 4, '#e6dcc0', INK, 3);
  poly(ctx, [72, 22, 88, 22, 80, 6], '#cfd6dc', INK, 3);
  poly(ctx, [74, 78, 86, 78, 80, 92], '#8a2f2a', INK, 2);
  circ(ctx, 80, 66, 4, '#f4d47a', INK, 2);
}

function frostIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.frost, level);
  circ(ctx, 80, 88, 40, '#a9d6e6', INK, 6);
  circ(ctx, 80, 88, 31, '#cdeef8', 'rgba(0,0,0,0)', 0);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    const x = 80 + Math.cos(a) * 26;
    const y = 88 + Math.sin(a) * 26;
    gem(ctx, x, y, 15, '#5fc4e8', '#d9f6ff');
  }
  gem(ctx, 80, 88, 24, '#6fd2f2', '#e8fbff');
  circ(ctx, 80, 88, 6, '#ffffff', INK, 3);
  glow(ctx, 80, 88, 44, 'rgba(140,220,255,0.75)', 0.5);
}

// --------------------------------------------------------------- Era II

function gatlingIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.gatling, level);
  circ(ctx, 80, 88, 42, '#5d4c33', INK, 6);
  circ(ctx, 80, 88, 34, '#8a6f42', INK, 4);
  // six barrels around the hub
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = 80 + Math.cos(a) * 17;
    const y = 88 + Math.sin(a) * 17;
    circ(ctx, x, y, 8, '#3d4650', INK, 3);
    circ(ctx, x, y, 4, '#12181e', 'rgba(0,0,0,0)', 0);
  }
  circ(ctx, 80, 88, 9, '#c9903c', INK, 3);
  // brass hopper and crank
  rrect(ctx, 104, 68, 24, 26, 6, '#b98a3c', INK, 4);
  line(ctx, 36, 88, 52, 88, '#c9c2b0', 5);
  circ(ctx, 34, 88, 6, '#8f9aa5', INK, 3);
}

function mortarIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.mortar, level);
  circ(ctx, 80, 90, 42, '#6f6a58', INK, 6);
  // wide bore tube angled north
  ctx.save();
  ctx.translate(80, 84);
  ctx.rotate(-0.22);
  rrect(ctx, -20, -58, 40, 82, 14, '#4c5258', INK, 6);
  rrect(ctx, -24, -64, 48, 16, 7, '#2c3136', INK, 5);
  circ(ctx, 0, -56, 13, '#14181c', INK, 4);
  line(ctx, -12, -40, -12, 16, 'rgba(210,220,228,0.28)', 4);
  ctx.restore();
  // trail legs and shells
  line(ctx, 62, 104, 44, 122, '#8d8f83', 6);
  line(ctx, 98, 104, 116, 122, '#8d8f83', 6);
  for (const [x, y] of [
    [38, 96],
    [122, 98],
  ]) {
    circ(ctx, x, y, 6, '#3b4247', INK, 3);
  }
}

function flameIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.flame, level);
  circ(ctx, 80, 88, 40, '#5a5248', INK, 6);
  circ(ctx, 80, 88, 32, '#2f2b26', INK, 4);
  glow(ctx, 80, 88, 40, 'rgba(255,140,40,0.9)', 0.8);
  flame(ctx, 80, 92, 27, 44, '#ff7a1f', '#ffd35c');
  flame(ctx, 56, 98, 14, 28, '#ff8f2a', '#ffcf58');
  flame(ctx, 104, 98, 14, 28, '#ff8f2a', '#ffcf58');
  for (const [x, y] of [
    [58, 62],
    [100, 56],
    [90, 116],
  ]) {
    circ(ctx, x, y, 3.4, '#ffd35c', 'rgba(0,0,0,0)', 0);
  }
  circ(ctx, 80, 88, 34, 'rgba(0,0,0,0)', '#2a2521', 5);
}

function teslaIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.tesla, level);
  circ(ctx, 80, 88, 40, '#4d5661', INK, 6);
  circ(ctx, 80, 88, 31, '#5f6a75', INK, 4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    circ(ctx, 80 + Math.cos(a) * 35, 88 + Math.sin(a) * 35, 3.4, '#b7c2cc', INK, 2);
  }
  ctx.beginPath();
  ctx.arc(80, 88, 24, 0, Math.PI * 2);
  ctx.strokeStyle = '#c98a3c';
  ctx.lineWidth = 6;
  ctx.stroke();
  glow(ctx, 80, 88, 32, 'rgba(140,235,255,0.85)', 0.65);
  poly(ctx, [84, 46, 68, 86, 78, 86, 70, 128, 96, 82, 84, 82, 94, 46], '#ffe66a', INK, 3);
  circ(ctx, 80, 88, 5, '#ffffff', 'rgba(0,0,0,0)', 0);
}

// -------------------------------------------------------------- Era III

function sniperIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.sniper, level, 50);
  circ(ctx, 80, 90, 38, '#3b4a46', INK, 6);
  for (const a of [0.6, 2.2, 3.8, 5.4]) {
    line(ctx, 80, 90, 80 + Math.cos(a) * 34, 90 + Math.sin(a) * 34, '#5d6f69', 4);
  }
  // long barrel north with muzzle brake
  rrect(ctx, 74, 8, 12, 96, 5, '#2f3a37', INK, 5);
  rrect(ctx, 70, 22, 20, 14, 4, '#1d2624', INK, 4);
  line(ctx, 78, 16, 78, 96, 'rgba(200,225,215,0.3)', 3);
  // scope
  rrect(ctx, 86, 58, 26, 12, 5, '#25322f', INK, 4);
  circ(ctx, 108, 64, 5, '#9ad8c8', INK, 2);
  // bipod
  line(ctx, 62, 96, 44, 118, '#8d9a95', 5);
  line(ctx, 98, 96, 116, 118, '#8d9a95', 5);
}

function missileIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.missile, level);
  rrect(ctx, 46, 52, 68, 58, 12, '#3d4348', INK, 6);
  for (const x of [54, 74, 94]) {
    rrect(ctx, x, 24, 16, 46, 7, '#8b9198', INK, 4);
    poly(ctx, [x - 2, 26, x + 18, 26, x + 8, 8], '#e05f4a', INK, 3);
    line(ctx, x + 8, 30, x + 8, 64, 'rgba(255,255,255,0.35)', 3);
  }
  rrect(ctx, 50, 94, 60, 12, 5, '#2b3034', INK, 4);
  // guidance dish
  ctx.beginPath();
  ctx.arc(80, 104, 14, Math.PI, 0);
  ctx.strokeStyle = '#9fe8d8';
  ctx.lineWidth = 4;
  ctx.stroke();
  glow(ctx, 80, 104, 20, 'rgba(150,240,220,0.7)', 0.5);
}

function radarIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.radar, level);
  circ(ctx, 80, 92, 34, '#33443f', INK, 5);
  // dish
  ctx.save();
  ctx.translate(80, 74);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#93a39c';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 13, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5f7169';
  ctx.fill();
  ctx.restore();
  // sweep
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(80, 74);
  ctx.arc(80, 74, 42, -0.9, 0.5);
  ctx.closePath();
  ctx.fillStyle = 'rgba(143,228,192,0.35)';
  ctx.fill();
  ctx.restore();
  line(ctx, 80, 74, 62, 112, '#8f9a95', 5);
  for (const [x, y] of [
    [108, 62],
    [126, 84],
    [60, 100],
  ]) {
    circ(ctx, x, y, 3.2, '#8fe4c0', 'rgba(0,0,0,0)', 0);
  }
}

function autocannonIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.autocannon, level, 54);
  circ(ctx, 80, 92, 42, '#6d6a5c', INK, 6);
  // twin heavy barrels
  for (const x of [58, 84]) {
    rrect(ctx, x, 22, 26, 92, 9, '#444d57', INK, 6);
    rrect(ctx, x - 4, 16, 34, 16, 6, '#2a323b', INK, 5);
    line(ctx, x + 7, 38, x + 7, 102, 'rgba(200,212,224,0.32)', 4);
  }
  rrect(ctx, 52, 70, 64, 14, 5, '#8a6a28', INK, 4);
  circ(ctx, 60, 77, 3.2, '#f0cf7a', INK, 2);
  circ(ctx, 100, 77, 3.2, '#f0cf7a', INK, 2);
  for (const x of [58, 102]) {
    for (let i = 0; i < 4; i++) line(ctx, x - 5, 102 + i * 4, x + 5, 106 + i * 4, '#9aa4ae', 2.5);
  }
  // ammo belt
  for (let i = 0; i < 5; i++) rrect(ctx, 104 + i * 6, 96 - i * 6, 8, 10, 2, '#d8b56a', INK, 2);
}

// --------------------------------------------------------------- Era IV

function laserIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.laser, level, 48);
  circ(ctx, 80, 90, 38, '#2b3a44', INK, 6);
  // heat fins
  for (let i = 0; i < 4; i++) {
    rrect(ctx, 44 + i * 4, 56 - i * 3, 6, 54, 3, '#3f5360', INK, 2.5);
    rrect(ctx, 110 - i * 4, 56 - i * 3, 6, 54, 3, '#3f5360', INK, 2.5);
  }
  // emitter block and lens
  rrect(ctx, 64, 40, 32, 62, 10, '#46606f', INK, 5);
  circ(ctx, 80, 52, 17, '#8fd8ff', INK, 4);
  circ(ctx, 80, 52, 10, '#ffffff', 'rgba(0,0,0,0)', 0);
  glow(ctx, 80, 52, 30, 'rgba(140,215,255,0.9)', 0.75);
  // beam up the sprite
  line(ctx, 80, 8, 80, 44, 'rgba(200,240,255,0.85)', 6);
  line(ctx, 80, 4, 80, 30, 'rgba(255,255,255,0.9)', 2);
}

function plasmaIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.plasma, level);
  // containment ring
  ctx.beginPath();
  ctx.arc(80, 86, 40, 0, Math.PI * 2);
  ctx.strokeStyle = '#6a4a9a';
  ctx.lineWidth = 8;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    circ(ctx, 80 + Math.cos(a) * 40, 86 + Math.sin(a) * 40, 6, '#c9a4ff', INK, 2.5);
  }
  glow(ctx, 80, 86, 38, 'rgba(190,130,255,0.9)', 0.8);
  circ(ctx, 80, 86, 20, '#a35cff', INK, 4);
  circ(ctx, 80, 86, 11, '#e9d6ff', 'rgba(0,0,0,0)', 0);
  for (const [x, y, r] of [
    [80, 30, 5],
    [46, 52, 4],
    [114, 52, 4],
  ]) {
    circ(ctx, x, y, r, '#f0e2ff', 'rgba(0,0,0,0)', 0);
  }
}

function empIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.emp, level);
  circ(ctx, 80, 88, 40, '#2f3c4a', INK, 6);
  // capacitor stack
  for (let i = 0; i < 4; i++) {
    rrect(ctx, 58, 48 + i * 16, 44, 12, 5, i % 2 ? '#8fb6c9' : '#5f7f93', INK, 3.5);
  }
  circ(ctx, 80, 46, 12, '#7fd8ff', INK, 4);
  glow(ctx, 80, 88, 40, 'rgba(130,215,255,0.75)', 0.6);
  // discharge arcs
  for (const [x1, y1, x2, y2] of [
    [80, 60, 40, 74],
    [80, 60, 122, 66],
    [80, 96, 44, 116],
    [80, 96, 118, 112],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo((x1 + x2) / 2 + 6, (y1 + y2) / 2 - 4);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(190,240,255,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function acceleratorIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.accelerator, level, 48);
  // twin rails
  rrect(ctx, 56, 12, 10, 108, 5, '#3c5a66', INK, 4);
  rrect(ctx, 94, 12, 10, 108, 5, '#3c5a66', INK, 4);
  for (let i = 0; i < 5; i++) {
    rrect(ctx, 68, 24 + i * 20, 24, 8, 3, '#5f8794', INK, 2.5);
  }
  // charged slug at the muzzle
  glow(ctx, 80, 20, 26, 'rgba(160,240,255,0.95)', 0.85);
  poly(ctx, [70, 26, 90, 26, 80, 4], '#d8f6ff', INK, 3);
  // capacitor drums
  circ(ctx, 46, 96, 13, '#456070', INK, 4);
  circ(ctx, 114, 96, 13, '#456070', INK, 4);
  circ(ctx, 46, 96, 6, '#a0f0ff', 'rgba(0,0,0,0)', 0);
  circ(ctx, 114, 96, 6, '#a0f0ff', 'rgba(0,0,0,0)', 0);
}

// ---------------------------------------------------------------- Era V

function quantumIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.quantum, level);
  // hex frame
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    pts.push(80 + Math.cos(a) * 36, 88 + Math.sin(a) * 36);
  }
  poly(ctx, pts, '#2b2440', INK, 5);
  poly(ctx, pts, 'rgba(201,164,255,0.16)', 'rgba(0,0,0,0)', 0);
  glow(ctx, 80, 88, 34, 'rgba(190,150,255,0.85)', 0.7);
  circ(ctx, 80, 88, 14, '#c9a4ff', INK, 3);
  circ(ctx, 80, 88, 6, '#ffffff', 'rgba(0,0,0,0)', 0);
  // probability orbs
  for (const [x, y, r] of [
    [80, 46, 7],
    [116, 72, 5],
    [46, 72, 5],
    [80, 126, 4],
  ]) {
    circ(ctx, x, y, r, 'rgba(220,190,255,0.85)', INK, 2);
  }
  ctx.beginPath();
  ctx.arc(80, 88, 28, 0.4, 2.4);
  ctx.strokeStyle = 'rgba(230,210,255,0.7)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function singularityIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.singularity, level, 50, '#141020');
  // accretion ring
  ctx.save();
  ctx.translate(80, 88);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 38 - i * 7, 22 - i * 4, i * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(157,123,255,${0.75 - i * 0.18})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, 80, 88, 30, 'rgba(140,100,255,0.6)', 0.6);
  circ(ctx, 80, 88, 16, '#0a0714', INK, 4);
  circ(ctx, 80, 88, 11, '#000000', 'rgba(0,0,0,0)', 0);
  for (const [x, y] of [
    [36, 60],
    [124, 64],
    [108, 116],
    [48, 112],
  ]) {
    circ(ctx, x, y, 3, '#d8c8ff', 'rgba(0,0,0,0)', 0);
  }
}

function droneIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.drone, level, 46);
  // hangar disc
  circ(ctx, 80, 92, 36, '#274742', INK, 6);
  circ(ctx, 80, 92, 24, '#356057', INK, 4);
  rrect(ctx, 66, 84, 28, 16, 6, '#7fe4d0', INK, 3);
  line(ctx, 80, 84, 80, 70, '#9feee0', 3);
  // three drones on station
  for (const [x, y, s] of [
    [80, 40, 1],
    [38, 68, 0.85],
    [122, 66, 0.85],
  ]) {
    circ(ctx, x, y, 12 * s, '#3d6a63', INK, 3);
    circ(ctx, x, y, 6 * s, '#7fe4d0', 'rgba(0,0,0,0)', 0);
    line(ctx, x - 16 * s, y, x - 8 * s, y, '#9feee0', 3);
    line(ctx, x + 8 * s, y, x + 16 * s, y, '#9feee0', 3);
  }
}

function stormgenIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.stormgen, level);
  circ(ctx, 80, 96, 38, '#394a63', INK, 6);
  // thunderhead
  for (const [x, y, r] of [
    [64, 52, 20],
    [84, 44, 24],
    [104, 54, 18],
    [80, 62, 22],
  ]) {
    circ(ctx, x, y, r, '#7f93b3', INK, 4);
  }
  glow(ctx, 80, 58, 44, 'rgba(160,200,255,0.6)', 0.55);
  poly(ctx, [88, 56, 66, 96, 80, 96, 70, 130, 100, 88, 86, 88, 98, 56], '#ffe66a', INK, 3);
  for (const [x, y] of [
    [40, 84],
    [124, 92],
  ]) {
    circ(ctx, x, y, 3.4, '#cfe4ff', 'rgba(0,0,0,0)', 0);
  }
}

// ---------------------------------------------------------- Tier 5 (shelved)

function artilleryIcon(ctx: Ctx, level: number): void {
  plate(ctx, TOWER_ACCENT.artillery, level, 56);
  circ(ctx, 80, 94, 44, '#4a4032', INK, 6);
  // howitzer
  ctx.save();
  ctx.translate(80, 78);
  ctx.rotate(-0.4);
  rrect(ctx, -14, -52, 28, 88, 10, '#5d5344', INK, 6);
  rrect(ctx, -18, -58, 36, 14, 6, '#2f2a22', INK, 5);
  ctx.restore();
  for (const x of [46, 114]) {
    circ(ctx, x, 108, 14, '#2e2a24', INK, 4);
    circ(ctx, x, 108, 6, '#8a7150', INK, 2);
  }
  // scattered shells
  for (const [x, y] of [
    [34, 74],
    [126, 82],
    [104, 128],
  ]) {
    circ(ctx, x, y, 6, '#3a3a3a', INK, 3);
    circ(ctx, x - 2, y - 2, 2, '#ffd27a', 'rgba(0,0,0,0)', 0);
  }
}

const TOWER_DRAW: Record<TowerId, (ctx: Ctx, level: number) => void> = {
  archer: archerIcon,
  cannon: cannonIcon,
  ballista: ballistaIcon,
  frost: frostIcon,
  gatling: gatlingIcon,
  mortar: mortarIcon,
  flame: flameIcon,
  tesla: teslaIcon,
  sniper: sniperIcon,
  missile: missileIcon,
  radar: radarIcon,
  autocannon: autocannonIcon,
  laser: laserIcon,
  plasma: plasmaIcon,
  emp: empIcon,
  accelerator: acceleratorIcon,
  quantum: quantumIcon,
  singularity: singularityIcon,
  drone: droneIcon,
  stormgen: stormgenIcon,
  artillery: artilleryIcon,
};

export function towerTexture(id: TowerId, level: number): THREE.Texture {
  level = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)));
  return cachedTexture(`tower:${id}:${level}`, 160, (ctx) => TOWER_DRAW[id](ctx, level));
}

/** Draws a tower sprite at an arbitrary resolution, scaled out of its native 160px space. */
export function drawTowerSprite(ctx: Ctx, id: TowerId, level: number, size = 160): void {
  ctx.save();
  ctx.scale(size / 160, size / 160);
  TOWER_DRAW[id](ctx, level);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

export const PROJECTILE_SIZE: Record<ProjectileKind, number> = {
  arrow: 0.48,
  bolt: 0.58,
  cannon: 0.4,
  shell: 0.5,
  bullet: 0.3,
  flame: 0.46,
  ice: 0.43,
  tesla: 0.46,
  sniper: 0.42,
  missile: 0.5,
  laser: 0.46,
  plasma: 0.52,
  emp: 0.5,
  accel: 0.6,
  quantum: 0.52,
  void: 0.6,
  drone: 0.44,
  storm: 0.46,
  artillery: 0.62,
};

function circleBall(ctx: Ctx, fill: string, r = 14, shine = 'rgba(255,255,255,0.4)'): void {
  circ(ctx, 32, 32, r, fill, INK, 4);
  circ(ctx, 27, 27, r * 0.35, shine, 'rgba(0,0,0,0)', 0);
}

const PROJ_DRAW: Record<ProjectileKind, (ctx: Ctx) => void> = {
  arrow: (ctx) => {
    line(ctx, 32, 54, 32, 16, '#caa76c', 5);
    line(ctx, 32, 54, 32, 20, 'rgba(60,35,15,0.45)', 2);
    poly(ctx, [26, 18, 38, 18, 32, 6], '#d8d2bc', INK, 2.5);
    poly(ctx, [26, 46, 16, 52, 32, 58], '#8a2f2a', INK, 2);
    poly(ctx, [38, 46, 48, 52, 32, 58], '#8a2f2a', INK, 2);
  },
  bolt: (ctx) => {
    line(ctx, 32, 58, 32, 14, '#e0d3ac', 7);
    line(ctx, 32, 56, 32, 16, 'rgba(90,64,28,0.4)', 3);
    poly(ctx, [22, 18, 42, 18, 32, 2], '#cfd6dc', INK, 3);
    for (const y of [40, 50]) {
      poly(ctx, [24, y, 12, y + 8, 32, y + 6], '#8a2f2a', INK, 2);
      poly(ctx, [40, y, 52, y + 8, 32, y + 6], '#8a2f2a', INK, 2);
    }
  },
  cannon: (ctx) => circleBall(ctx, '#3b424b', 14, 'rgba(200,215,230,0.45)'),
  shell: (ctx) => {
    glow(ctx, 32, 34, 26, 'rgba(255,180,90,0.55)', 0.5);
    rrect(ctx, 22, 14, 20, 34, 8, '#4f5a63', INK, 3);
    poly(ctx, [22, 18, 42, 18, 32, 4], '#d8a45a', INK, 2.5);
    rrect(ctx, 20, 44, 24, 8, 3, '#2b3238', INK, 2.5);
  },
  bullet: (ctx) => {
    glow(ctx, 32, 32, 16, 'rgba(255,220,140,0.6)', 0.45);
    rrect(ctx, 27, 16, 10, 28, 5, '#e8dcae', INK, 2.5);
    poly(ctx, [27, 20, 37, 20, 32, 8], '#fff3c4', INK, 2);
  },
  flame: (ctx) => {
    glow(ctx, 32, 34, 24, 'rgba(255,140,30,0.9)', 0.7);
    flame(ctx, 32, 38, 16, 26, '#ff7a1f', '#ffd35c');
  },
  ice: (ctx) => {
    glow(ctx, 32, 32, 22, 'rgba(120,220,255,0.9)', 0.6);
    gem(ctx, 32, 32, 18, '#6fd2f2', '#e8fbff');
  },
  tesla: (ctx) => {
    glow(ctx, 32, 32, 22, 'rgba(120,220,255,0.9)', 0.6);
    circ(ctx, 32, 32, 12, '#9fe8ff', INK, 3);
    circ(ctx, 32, 32, 6, '#ffffff', 'rgba(0,0,0,0)', 0);
  },
  sniper: (ctx) => {
    glow(ctx, 32, 32, 18, 'rgba(160,240,220,0.7)', 0.5);
    line(ctx, 32, 58, 32, 8, '#e8fff8', 4);
    line(ctx, 32, 50, 32, 14, 'rgba(120,220,200,0.8)', 8);
  },
  missile: (ctx) => {
    glow(ctx, 32, 44, 22, 'rgba(255,160,90,0.8)', 0.6);
    rrect(ctx, 24, 8, 16, 34, 7, '#c9ced4', INK, 3);
    poly(ctx, [24, 12, 40, 12, 32, 0], '#e05f4a', INK, 2.5);
    poly(ctx, [24, 34, 16, 44, 32, 40], '#8f979e', INK, 2);
    poly(ctx, [40, 34, 48, 44, 32, 40], '#8f979e', INK, 2);
    flame(ctx, 32, 52, 9, 16, '#ff9d3c', '#ffe08a');
  },
  laser: (ctx) => {
    glow(ctx, 32, 32, 26, 'rgba(140,215,255,0.95)', 0.8);
    line(ctx, 32, 4, 32, 60, '#eafaff', 4);
    line(ctx, 32, 0, 32, 64, 'rgba(190,235,255,0.75)', 12);
  },
  plasma: (ctx) => {
    glow(ctx, 32, 32, 28, 'rgba(190,130,255,0.95)', 0.85);
    circ(ctx, 32, 32, 16, '#a35cff', INK, 3);
    circ(ctx, 32, 32, 9, '#efe0ff', 'rgba(0,0,0,0)', 0);
    ctx.beginPath();
    ctx.arc(32, 32, 20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(220,190,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },
  emp: (ctx) => {
    glow(ctx, 32, 32, 26, 'rgba(130,215,255,0.9)', 0.75);
    ctx.beginPath();
    ctx.arc(32, 32, 16, 0, Math.PI * 2);
    ctx.strokeStyle = '#bdf1ff';
    ctx.lineWidth = 4;
    ctx.stroke();
    poly(ctx, [36, 8, 24, 30, 32, 30, 26, 56, 44, 28, 34, 28, 42, 8], '#eafaff', INK, 2);
  },
  accel: (ctx) => {
    glow(ctx, 32, 32, 24, 'rgba(160,240,255,0.9)', 0.8);
    rrect(ctx, 28, 6, 8, 52, 4, '#d8f6ff', INK, 2.5);
    line(ctx, 32, 10, 32, 54, 'rgba(255,255,255,0.9)', 2);
    for (const y of [20, 44]) {
      line(ctx, 18, y, 46, y, 'rgba(160,240,255,0.6)', 3);
    }
  },
  quantum: (ctx) => {
    glow(ctx, 32, 32, 24, 'rgba(200,160,255,0.9)', 0.75);
    circ(ctx, 32, 32, 12, '#c9a4ff', INK, 3);
    circ(ctx, 32, 32, 6, '#ffffff', 'rgba(0,0,0,0)', 0);
    for (const [x, y] of [
      [22, 20],
      [42, 44],
    ]) {
      circ(ctx, x, y, 5, 'rgba(230,210,255,0.75)', INK, 1.5);
    }
  },
  void: (ctx) => {
    glow(ctx, 32, 32, 26, 'rgba(140,100,255,0.8)', 0.7);
    circ(ctx, 32, 32, 14, '#0a0714', INK, 3.5);
    ctx.beginPath();
    ctx.ellipse(32, 32, 24, 12, 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(180,150,255,0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
  },
  drone: (ctx) => {
    glow(ctx, 32, 32, 18, 'rgba(127,228,208,0.7)', 0.55);
    circ(ctx, 32, 32, 10, '#3d6a63', INK, 3);
    circ(ctx, 32, 32, 5, '#7fe4d0', 'rgba(0,0,0,0)', 0);
    line(ctx, 14, 32, 24, 32, '#9feee0', 3);
    line(ctx, 40, 32, 50, 32, '#9feee0', 3);
  },
  storm: (ctx) => {
    glow(ctx, 32, 32, 24, 'rgba(160,230,255,0.9)', 0.6);
    poly(ctx, [36, 8, 22, 32, 30, 32, 24, 56, 44, 28, 34, 28, 42, 8], '#ffe66a', INK, 3);
  },
  artillery: (ctx) => {
    glow(ctx, 32, 34, 30, 'rgba(255,190,90,0.95)', 0.75);
    circ(ctx, 32, 33, 13, '#3a3f46', INK, 4);
    circ(ctx, 32, 31, 7, '#ffd27a', 'rgba(0,0,0,0)', 0);
    line(ctx, 32, 20, 32, 8, '#c9b07a', 3);
  },
};

export function projectileTexture(kind: ProjectileKind): THREE.Texture {
  return cachedTexture(`proj:${kind}`, 64, PROJ_DRAW[kind] ?? PROJ_DRAW.cannon);
}

// ---------------------------------------------------------------------------
// Enemy icons (drawn facing south / down the sprite)
// ---------------------------------------------------------------------------

export const ENEMY_SIZE: Record<EnemyId, number> = {
  goblin: 1.08,
  infiltrator: 1.36,
  orc: 1.32,
  warg: 1.46,
  troll: 1.64,
  ogre: 1.88,
  ogreking: 2.5,
  trollwarlord: 2.82,
  titan: 3.3,
};

/** Body, silhouette and highlight for each creature. */
const ENEMY_PALETTE: Record<EnemyId, { body: string; dark: string; light: string; skin: string }> = {
  goblin: { body: '#8db255', dark: '#5e7d36', light: '#b3d47c', skin: '#a8c96b' },
  infiltrator: { body: '#7a5ea8', dark: '#4d3a70', light: '#a88ad4', skin: '#b9a3d8' },
  orc: { body: '#5f8a3f', dark: '#3d5c28', light: '#87b063', skin: '#6f9c4b' },
  warg: { body: '#8a6b4a', dark: '#5b452c', light: '#b5916a', skin: '#9c7a55' },
  troll: { body: '#5c8f80', dark: '#3a6257', light: '#85b7a7', skin: '#6ba191' },
  ogre: { body: '#a47c4e', dark: '#6f5232', light: '#cba576', skin: '#b78e5c' },
  ogreking: { body: '#b8843f', dark: '#7d5526', light: '#e0b273', skin: '#c99a58' },
  trollwarlord: { body: '#4f7f7a', dark: '#2f534f', light: '#7aa6a0', skin: '#5f928c' },
  titan: { body: '#6b5b6e', dark: '#443a48', light: '#94819a', skin: '#7d6c81' },
};

/** Shared top-down torso: shadow, shoulders, chest plate, head, two eyes. */
function creatureBody(
  ctx: Ctx,
  pal: { body: string; dark: string; light: string; skin: string },
  scale = 1,
): void {
  shadow(ctx, 80, 122, 46 * scale, 20 * scale);
  // shoulders
  circ(ctx, 80 - 26 * scale, 82, 17 * scale, pal.dark, INK, 5);
  circ(ctx, 80 + 26 * scale, 82, 17 * scale, pal.dark, INK, 5);
  // torso
  ctx.beginPath();
  ctx.ellipse(80, 92, 34 * scale, 30 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // belt / chest strap
  ctx.beginPath();
  ctx.ellipse(80, 100, 30 * scale, 12 * scale, 0, 0, Math.PI);
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = 4;
  ctx.stroke();
  // head
  circ(ctx, 80, 60, 22 * scale, pal.skin, INK, 5);
  // eyes
  circ(ctx, 80 - 8 * scale, 58, 3.4 * scale, '#141c22', 'rgba(0,0,0,0)', 0);
  circ(ctx, 80 + 8 * scale, 58, 3.4 * scale, '#141c22', 'rgba(0,0,0,0)', 0);
}

function goblinIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.goblin;
  creatureBody(ctx, pal, 0.78);
  // pointed ears
  poly(ctx, [60, 48, 44, 36, 58, 62], pal.light, INK, 3);
  poly(ctx, [100, 48, 116, 36, 102, 62], pal.light, INK, 3);
  // rusty dagger in the right hand
  line(ctx, 108, 96, 124, 112, '#8d8f92', 5);
  poly(ctx, [120, 108, 132, 116, 124, 120], '#c9cdd2', INK, 2.5);
  line(ctx, 104, 100, 112, 92, '#6b4423', 5);
}

function infiltratorIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.infiltrator;
  creatureBody(ctx, pal, 0.9);
  // hood
  ctx.beginPath();
  ctx.moveTo(80, 26);
  ctx.quadraticCurveTo(118, 46, 106, 80);
  ctx.quadraticCurveTo(80, 92, 54, 80);
  ctx.quadraticCurveTo(42, 46, 80, 26);
  ctx.fillStyle = pal.dark;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // masked face
  ctx.beginPath();
  ctx.ellipse(80, 62, 15, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e6dcf4';
  ctx.fill();
  circ(ctx, 74, 60, 2.6, '#3a2a52', 'rgba(0,0,0,0)', 0);
  circ(ctx, 86, 60, 2.6, '#3a2a52', 'rgba(0,0,0,0)', 0);
  // twin blades
  for (const [x, dx] of [
    [46, -16],
    [114, 16],
  ]) {
    line(ctx, x, 92, x + dx, 118, '#cdd6e0', 4);
    line(ctx, x + dx * 0.2, 96, x + dx, 118, 'rgba(255,255,255,0.55)', 1.5);
  }
}

function orcIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.orc;
  creatureBody(ctx, pal, 0.95);
  // jaw with tusks
  ctx.beginPath();
  ctx.ellipse(80, 72, 15, 10, 0, 0, Math.PI);
  ctx.fillStyle = pal.dark;
  ctx.fill();
  poly(ctx, [70, 70, 74, 78, 76, 70], '#f0e6cc', INK, 2);
  poly(ctx, [90, 70, 86, 78, 84, 70], '#f0e6cc', INK, 2);
  // axe
  line(ctx, 112, 88, 128, 124, '#6b4423', 6);
  poly(ctx, [118, 104, 144, 100, 138, 122, 120, 120], '#9aa4ae', INK, 4);
  // shoulder plate
  circ(ctx, 54, 80, 12, '#8d97a1', INK, 4);
}

function wargIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.warg;
  shadow(ctx, 80, 124, 48, 20);
  // four legs
  for (const [x, y] of [
    [52, 96],
    [108, 96],
    [56, 116],
    [104, 116],
  ]) {
    circ(ctx, x, y, 9, pal.dark, INK, 4);
  }
  // wolf body, head down the sprite
  ctx.beginPath();
  ctx.ellipse(80, 92, 30, 38, 0, 0, Math.PI * 2);
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // head
  circ(ctx, 80, 44, 20, pal.light, INK, 5);
  poly(ctx, [64, 34, 54, 20, 70, 30], pal.dark, INK, 3);
  poly(ctx, [96, 34, 106, 20, 90, 30], pal.dark, INK, 3);
  circ(ctx, 72, 42, 3.2, '#e8dc4a', 'rgba(0,0,0,0)', 0);
  circ(ctx, 88, 42, 3.2, '#e8dc4a', 'rgba(0,0,0,0)', 0);
  // rider
  circ(ctx, 80, 92, 15, '#6d5a3f', INK, 4);
  circ(ctx, 80, 82, 8, pal.skin, INK, 3);
}

function trollIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.troll;
  creatureBody(ctx, pal, 1.08);
  // tusks and heavy brow
  line(ctx, 58, 54, 102, 54, pal.dark, 5);
  poly(ctx, [68, 74, 74, 86, 78, 74], '#f0ead2', INK, 2.5);
  poly(ctx, [92, 74, 86, 86, 82, 74], '#f0ead2', INK, 2.5);
  // bone club
  line(ctx, 112, 92, 130, 122, '#d8cfae', 8);
  circ(ctx, 132, 118, 13, '#e3dcc0', INK, 4);
  for (const [x, y] of [
    [124, 108],
    [140, 112],
  ]) {
    circ(ctx, x, y, 4, '#c9c0a0', INK, 2);
  }
  // moss patches
  for (const [x, y] of [
    [62, 96],
    [96, 104],
    [74, 112],
  ]) {
    circ(ctx, x, y, 5, 'rgba(150,200,140,0.55)', 'rgba(0,0,0,0)', 0);
  }
}

function ogreIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.ogre;
  creatureBody(ctx, pal, 1.28);
  // gut and harness
  circ(ctx, 80, 104, 22, pal.light, INK, 4);
  line(ctx, 48, 76, 112, 112, '#6b4423', 6);
  line(ctx, 112, 76, 48, 112, '#6b4423', 6);
  // giant club
  line(ctx, 112, 86, 134, 118, '#6b4423', 9);
  circ(ctx, 138, 116, 17, '#8a6134', INK, 5);
  for (const [x, y] of [
    [128, 104],
    [148, 108],
    [142, 130],
  ]) {
    poly(ctx, [x, y - 5, x + 6, y + 4, x - 6, y + 4], '#c9cdd2', INK, 2);
  }
  // horned helm
  poly(ctx, [62, 46, 44, 26, 66, 40], '#d8cfae', INK, 3);
  poly(ctx, [98, 46, 116, 26, 94, 40], '#d8cfae', INK, 3);
}

function ogrekingIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.ogreking;
  creatureBody(ctx, pal, 1.6);
  circ(ctx, 80, 104, 26, pal.light, INK, 4);
  // fur mantle
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * (0.05 + (i / 9) * 0.9);
    circ(ctx, 80 + Math.cos(a) * 44, 84 + Math.sin(a) * 30, 8, '#5c4732', INK, 3);
  }
  // crown
  poly(ctx, [56, 40, 104, 40, 100, 22, 90, 34, 80, 16, 70, 34, 60, 22], '#f4d47a', INK, 4);
  circ(ctx, 80, 32, 4, '#ff8a3c', INK, 2);
  // great cleaver
  line(ctx, 116, 84, 138, 112, '#5c4732', 8);
  poly(ctx, [126, 104, 154, 96, 150, 128, 128, 122], '#b9c2cc', INK, 4);
  line(ctx, 132, 106, 148, 118, 'rgba(255,255,255,0.5)', 2);
}

function trollwarlordIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.trollwarlord;
  creatureBody(ctx, pal, 1.7);
  // spiked pauldrons
  for (const x of [46, 114]) {
    circ(ctx, x, 80, 16, '#3f5f5b', INK, 4);
    for (let i = 0; i < 3; i++) {
      poly(ctx, [x - 6 + i * 6, 66, x - 2 + i * 6, 54, x + 2 + i * 6, 66], '#cfd6dc', INK, 2);
    }
  }
  // war paint and tusks
  line(ctx, 56, 52, 104, 52, '#c94b3a', 5);
  poly(ctx, [66, 72, 72, 88, 78, 72], '#f0ead2', INK, 2.5);
  poly(ctx, [94, 72, 88, 88, 82, 72], '#f0ead2', INK, 2.5);
  // spiked mace
  line(ctx, 114, 90, 136, 118, '#4a3a2a', 8);
  circ(ctx, 140, 118, 16, '#5c6b70', INK, 5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    poly(
      ctx,
      [
        140 + Math.cos(a) * 14,
        118 + Math.sin(a) * 14,
        140 + Math.cos(a) * 26,
        118 + Math.sin(a) * 26,
        140 + Math.cos(a + 0.4) * 14,
        118 + Math.sin(a + 0.4) * 14,
      ],
      '#cfd6dc',
      INK,
      2,
    );
  }
}

function titanIcon(ctx: Ctx): void {
  const pal = ENEMY_PALETTE.titan;
  creatureBody(ctx, pal, 1.95);
  // slab armour
  rrect(ctx, 52, 74, 56, 44, 10, '#5a4f61', INK, 5);
  for (const y of [84, 96, 108]) line(ctx, 56, y, 104, y, 'rgba(210,200,220,0.22)', 3);
  // helmet with glowing visor
  ctx.beginPath();
  ctx.arc(80, 58, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#4a4052';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  rrect(ctx, 64, 54, 32, 9, 4, '#ff7a4a', INK, 3);
  glow(ctx, 80, 58, 26, 'rgba(255,120,70,0.55)', 0.5);
  // colossal hammer
  line(ctx, 116, 82, 140, 116, '#3c3446', 10);
  rrect(ctx, 126, 100, 34, 30, 6, '#7d6c81', INK, 5);
  circ(ctx, 132, 108, 4, '#c9b8d0', 'rgba(0,0,0,0)', 0);
  circ(ctx, 152, 122, 4, '#c9b8d0', 'rgba(0,0,0,0)', 0);
  // rune cracks
  for (const [x1, y1, x2, y2] of [
    [62, 70, 70, 84],
    [98, 66, 92, 80],
  ]) {
    line(ctx, x1, y1, x2, y2, 'rgba(255,140,90,0.6)', 2);
  }
}

const ENEMY_DRAW: Record<EnemyId, (ctx: Ctx) => void> = {
  goblin: goblinIcon,
  infiltrator: infiltratorIcon,
  orc: orcIcon,
  warg: wargIcon,
  troll: trollIcon,
  ogre: ogreIcon,
  ogreking: ogrekingIcon,
  trollwarlord: trollwarlordIcon,
  titan: titanIcon,
};

/** Draws an enemy sprite at an arbitrary resolution, scaled out of its 160px space. */
export function drawEnemySprite(ctx: Ctx, id: EnemyId, size = 160): void {
  ctx.save();
  ctx.scale(size / 160, size / 160);
  ENEMY_DRAW[id](ctx);
  ctx.restore();
}

export function enemyTexture(id: EnemyId): THREE.Texture {
  return cachedTexture(`enemy:${id}`, 160, (ctx) => ENEMY_DRAW[id](ctx));
}

// ---------------------------------------------------------------------------
// Terrain props
// ---------------------------------------------------------------------------

export function treeTexture(): THREE.Texture {
  return cachedTexture('deco:tree', 160, (ctx) => {
    shadow(ctx, 84, 116, 56, 26);
    // pine canopy from above
    for (let i = 0; i < 5; i++) {
      const r = 44 - i * 6;
      const shade = i % 2 ? '#3d7136' : '#47803c';
      ctx.beginPath();
      ctx.arc(80, 82, r, 0, Math.PI * 2);
      ctx.fillStyle = shade;
      ctx.fill();
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      const inner = 14;
      const outer = 48;
      poly(
        ctx,
        [80 + Math.cos(a) * inner, 82 + Math.sin(a) * inner, 80 + Math.cos(a + 0.12) * outer, 82 + Math.sin(a + 0.12) * outer, 80 + Math.cos(a - 0.12) * outer, 82 + Math.sin(a - 0.12) * outer],
        i % 2 ? '#356629' : '#3e7732',
        'rgba(10,20,10,0.35)',
        2,
      );
    }
    circ(ctx, 80, 82, 13, '#548f45', 'rgba(0,0,0,0)', 0);
    circ(ctx, 76, 78, 6, '#6ca85a', 'rgba(0,0,0,0)', 0);
    circ(ctx, 80, 82, 5, '#6b4a2a', INK, 2);
  });
}

export function bushTexture(): THREE.Texture {
  return cachedTexture('deco:bush', 160, (ctx) => {
    shadow(ctx, 82, 112, 44, 20);
    for (const [x, y, r] of [
      [60, 88, 24],
      [96, 86, 22],
      [78, 74, 26],
      [82, 100, 20],
    ] as [number, number, number][]) {
      circ(ctx, x, y, r, '#3e7a36', 'rgba(10,20,10,0.35)', 3);
    }
    for (const [x, y, r] of [
      [60, 82, 10],
      [96, 80, 9],
      [78, 68, 12],
    ] as [number, number, number][]) {
      circ(ctx, x, y, r, '#51944a', 'rgba(0,0,0,0)', 0);
    }
    for (let i = 0; i < 5; i++) {
      circ(ctx, 52 + i * 12, 102 - (i % 2) * 8, 4, '#8fbf6a', 'rgba(0,0,0,0)', 0);
    }
  });
}

export function rockTexture(): THREE.Texture {
  return cachedTexture('deco:rock', 160, (ctx) => {
    shadow(ctx, 84, 112, 40, 18);
    poly(ctx, [48, 88, 60, 60, 88, 48, 118, 62, 124, 94, 100, 116, 66, 112], '#8a8b82', INK, 4);
    poly(ctx, [60, 62, 88, 48, 118, 62, 96, 76], '#a3a49a', 'rgba(0,0,0,0)', 0);
    poly(ctx, [48, 88, 66, 112, 82, 94, 66, 76], '#74756c', 'rgba(0,0,0,0)', 0);
    line(ctx, 88, 74, 96, 106, 'rgba(50,52,48,0.5)', 3);
    for (const [x, y] of [
      [74, 92],
      [100, 84],
      [92, 58],
    ]) {
      circ(ctx, x, y, 3, '#b9baae', 'rgba(0,0,0,0)', 0);
    }
  });
}

export function flowerTexture(): THREE.Texture {
  return cachedTexture('deco:flower', 160, (ctx) => {
    const palette = ['#ffe066', '#ff8fb1', '#f5f0e0', '#c58bff', '#ffb347'];
    for (let i = 0; i < 7; i++) {
      const x = 44 + (i % 3) * 30 + (i % 2) * 8;
      const y = 56 + Math.floor(i / 3) * 34;
      const c = palette[i % palette.length];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        circ(ctx, x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5, c, 'rgba(0,0,0,0.25)', 1.5);
      }
      circ(ctx, x, y, 4, '#f4d47a', '#6b4a2a', 1.5);
    }
  });
}
