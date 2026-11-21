// Particles, floating numbers, expanding rings, lightning arcs and camera shake.
// Everything is pooled and capped so long runs stay smooth on phones.

import { Pool, TAU, clamp, hexToRgba, rand, lerp } from './util.js';

const glowCache = new Map();

function glowSprite(color) {
  let canvas = glowCache.get(color);
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.18, hexToRgba(color, 0.9));
  grad.addColorStop(0.45, hexToRgba(color, 0.35));
  grad.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  glowCache.set(color, canvas);
  return canvas;
}

export function drawGlow(ctx, x, y, radius, color, alpha = 1) {
  if (radius <= 0 || alpha <= 0) return;
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

const MAX_PARTICLES = 900;
const MAX_PARTICLES_LOW = 340;

export class Fx {
  constructor() {
    this.particles = new Pool(() => ({}));
    this.texts = new Pool(() => ({}));
    this.rings = new Pool(() => ({}));
    this.bolts = new Pool(() => ({}));
    this.shake = 0;
    this.flash = 0;
    this.flashColor = '#ffffff';
    this.low = false;
    this.quality = 1;
  }

  setLowFx(low) {
    this.low = !!low;
    this.quality = low ? 0.45 : 1;
  }

  clear() {
    this.particles.clear();
    this.texts.clear();
    this.rings.clear();
    this.bolts.clear();
    this.shake = 0;
    this.flash = 0;
  }

  addParticle(x, y, vx, vy, opts) {
    const max = this.low ? MAX_PARTICLES_LOW : MAX_PARTICLES;
    if (this.particles.count >= max) return null;
    const p = this.particles.spawn();
    p.x = x;
    p.y = y;
    p.px = x;
    p.py = y;
    p.vx = vx;
    p.vy = vy;
    p.life = opts.life || 0.5;
    p.maxLife = p.life;
    p.size = opts.size || 1.4;
    p.color = opts.color || '#8ff';
    p.drag = opts.drag === undefined ? 2.2 : opts.drag;
    p.gravity = opts.gravity || 0;
    p.glow = opts.glow !== false;
    p.spark = !!opts.spark;
    p.spin = rand(0, TAU);
    p.spinSpeed = rand(-6, 6);
    return p;
  }

  burst(x, y, color, count = 10, opts = {}) {
    const n = Math.max(1, Math.round(count * this.quality));
    const speed = opts.speed || 26;
    const spread = opts.spread === undefined ? TAU : opts.spread;
    const baseAngle = opts.angle === undefined ? rand(0, TAU) : opts.angle;
    for (let i = 0; i < n; i++) {
      const a = baseAngle + rand(-spread / 2, spread / 2);
      const s = speed * rand(0.35, 1.15);
      this.addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, {
        color,
        life: (opts.life || 0.55) * rand(0.65, 1.25),
        size: (opts.size || 1.5) * rand(0.7, 1.5),
        drag: opts.drag === undefined ? 2.4 : opts.drag,
        gravity: opts.gravity || 0,
        glow: opts.glow !== false,
        spark: opts.spark,
      });
    }
  }

  trail(x, y, color, size = 1.2, life = 0.32) {
    this.addParticle(x, y, rand(-4, 4), rand(-4, 4), {
      color,
      life,
      size,
      drag: 3.5,
      glow: true,
    });
  }

  ring(x, y, from, to, color, life = 0.45, width = 1.6) {
    const r = this.rings.spawn();
    r.x = x;
    r.y = y;
    r.from = from;
    r.to = to;
    r.life = life;
    r.maxLife = life;
    r.color = color;
    r.width = width;
  }

  text(x, y, str, opts = {}) {
    if (this.texts.count > 90) return;
    const t = this.texts.spawn();
    t.x = x + rand(-2, 2);
    t.y = y;
    t.vy = opts.vy === undefined ? -18 : opts.vy;
    t.life = opts.life || 0.8;
    t.maxLife = t.life;
    t.text = str;
    t.color = opts.color || '#ffffff';
    t.size = opts.size || 5.4;
    t.crit = !!opts.crit;
  }

  bolt(points, color, life = 0.24) {
    const b = this.bolts.spawn();
    b.points = points;
    b.life = life;
    b.maxLife = life;
    b.color = color;
  }

  shakeFor(amount) {
    this.shake = Math.min(14, this.shake + amount);
  }

  flashScreen(color = '#ffffff', amount = 0.4) {
    this.flashColor = color;
    this.flash = Math.min(0.6, this.flash + amount);
  }

  update(dt) {
    for (const p of this.particles.items) {
      p.px = p.x;
      p.py = p.y;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      const damping = 1 - clamp(p.drag * dt, 0, 0.95);
      p.vx *= damping;
      p.vy = p.vy * damping + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += p.spinSpeed * dt;
    }
    this.particles.sweep();

    for (const t of this.texts.items) {
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 1 - 1.6 * dt;
      if (t.life <= 0) t.alive = false;
    }
    this.texts.sweep();

    for (const r of this.rings.items) {
      r.life -= dt;
      if (r.life <= 0) r.alive = false;
    }
    this.rings.sweep();

    for (const b of this.bolts.items) {
      b.life -= dt;
      if (b.life <= 0) b.alive = false;
    }
    this.bolts.sweep();

    this.shake = Math.max(0, this.shake - dt * 34);
    this.flash = Math.max(0, this.flash - dt * 2.6);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const r of this.rings.items) {
      const k = 1 - r.life / r.maxLife;
      const radius = lerp(r.from, r.to, 1 - Math.pow(1 - k, 2.2));
      const alpha = (1 - k) * 0.85;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k * 0.55);
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(0.1, radius), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.25;
      ctx.lineWidth = r.width * 3;
      ctx.stroke();
    }

    for (const b of this.bolts.items) {
      const k = b.life / b.maxLife;
      ctx.globalAlpha = k;
      ctx.strokeStyle = b.color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < b.points.length; i += 2) {
        if (i === 0) ctx.moveTo(b.points[0], b.points[1]);
        else ctx.lineTo(b.points[i], b.points[i + 1]);
      }
      ctx.stroke();
      ctx.globalAlpha = k * 0.3;
      ctx.lineWidth = 5.5;
      ctx.stroke();
    }

    for (const p of this.particles.items) {
      const k = p.life / p.maxLife;
      if (p.glow) {
        drawGlow(ctx, p.x, p.y, p.size * (1.4 + k * 1.8), p.color, k * 0.85);
      } else if (p.spark) {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    for (const t of this.texts.items) {
      const k = t.life / t.maxLife;
      const rise = 1 - k;
      ctx.globalAlpha = Math.min(1, k * 1.9);
      ctx.font = `${t.crit ? 'bold ' : ''}${t.size * (t.crit ? 1.15 : 1)}px "Palatino Linotype", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = t.size * 0.38;
      ctx.strokeStyle = 'rgba(6,3,14,0.85)';
      ctx.strokeText(t.text, t.x, t.y - rise * 3);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y - rise * 3);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawFlash(ctx, w, h) {
    if (this.flash <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.flash * 0.5;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
