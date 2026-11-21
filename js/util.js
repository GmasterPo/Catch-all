// Small shared helpers: math, formatting, RNG and pooled object lists.

export const TAU = Math.PI * 2;

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export function easeOutCubic(t) {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

export function easeInQuad(t) {
  return t * t;
}

export function angleDiff(a, b) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return d;
}

export function angleLerp(a, b, t) {
  return a + angleDiff(a, b) * t;
}

export function approachAngle(a, b, maxStep) {
  const d = angleDiff(a, b);
  if (Math.abs(d) <= maxStep) return b;
  return a + Math.sign(d) * maxStep;
}

// Seeded RNG so prerendered scenery is stable across resizes.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NUM_UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];

export function fmt(n) {
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  n = Math.abs(n);
  let suffix = '';
  if (n < 1000) {
    const v = n < 10 && n % 1 !== 0 ? Math.round(n * 10) / 10 : Math.floor(n);
    return (neg ? '-' : '') + v + suffix;
  }
  let i = 0;
  while (n >= 1000 && i < NUM_UNITS.length - 1) {
    n /= 1000;
    i++;
  }
  suffix = NUM_UNITS[i];
  const v = n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString();
  return (neg ? '-' : '') + v + suffix;
}

export function fmtTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function hexToRgba(hex, alpha) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const num = parseInt(h, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function shade(hex, amount) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const num = parseInt(h, 16);
  const r = clamp(((num >> 16) & 255) + amount, 0, 255);
  const g = clamp(((num >> 8) & 255) + amount, 0, 255);
  const b = clamp((num & 255) + amount, 0, 255);
  return `rgb(${r},${g},${b})`;
}

// Recycles frequently spawned objects (particles, projectiles, enemies, texts).
export class Pool {
  constructor(factory) {
    this.factory = factory;
    this.items = [];
    this._free = [];
  }

  spawn() {
    const o = this._free.pop() || this.factory();
    o.alive = true;
    this.items.push(o);
    return o;
  }

  release(o) {
    o.alive = false;
  }

  sweep() {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      if (!items[i].alive) {
        this._free.push(items[i]);
        items[i] = items[items.length - 1];
        items.pop();
      }
    }
  }

  clear() {
    for (const o of this.items) {
      o.alive = false;
      this._free.push(o);
    }
    this.items.length = 0;
  }

  get count() {
    return this.items.length;
  }
}
