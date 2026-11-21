// Pre-renders the enchanted stone arena once per resize, then draws it with a
// slowly rotating rune sigil added on top.

import { TAU, mulberry32 } from './util.js';

export class Arena {
  constructor() {
    this.canvas = null;
    this.runeCanvas = null;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.scale = 1;
    this.radius = 0;
    this.cx = 0;
    this.cy = 0;
  }

  resize(w, h, dpr, scale) {
    if (w === this.w && h === this.h && dpr === this.dpr && scale === this.scale) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.scale = scale;
    this.cx = w / 2;
    this.cy = h / 2;
    this.radius = 100 * scale;
    this.render(dpr);
  }

  render(dpr) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(this.w * dpr));
    canvas.height = Math.max(1, Math.round(this.h * dpr));
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const { cx, cy, w, h } = this;
    const R = this.radius;
    const rng = mulberry32(20261119);

    // Void backdrop
    const backdrop = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, Math.max(w, h) * 0.75);
    backdrop.addColorStop(0, '#1b1230');
    backdrop.addColorStop(0.55, '#0c0718');
    backdrop.addColorStop(1, '#05030a');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, w, h);

    // Distant ruins silhouettes
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 22; i++) {
      const a = rng() * TAU;
      const dist = R * (1.35 + rng() * 0.9);
      const x = cx + Math.cos(a) * dist;
      const y = cy + Math.sin(a) * dist;
      const bw = R * (0.06 + rng() * 0.12);
      const bh = R * (0.14 + rng() * 0.4);
      ctx.fillStyle = i % 3 === 0 ? '#160e26' : '#0e0919';
      ctx.fillRect(x - bw / 2, y - bh, bw, bh);
      if (rng() > 0.5) {
        ctx.fillStyle = '#0b0613';
        ctx.fillRect(x - bw * 0.9, y - bh * 0.55, bw * 0.5, bh * 0.55);
      }
    }
    ctx.restore();

    // Moss and grass just outside the arena wall
    ctx.save();
    for (let i = 0; i < 260; i++) {
      const a = rng() * TAU;
      const dist = R * (1.03 + rng() * 0.3);
      const x = cx + Math.cos(a) * dist;
      const y = cy + Math.sin(a) * dist;
      ctx.strokeStyle = rng() > 0.6 ? 'rgba(74,110,74,0.45)' : 'rgba(48,78,62,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + rng() * 4 - 2, y - 4, x + rng() * 6 - 3, y - 8);
      ctx.stroke();
    }
    ctx.restore();

    // Arena floor
    const floor = ctx.createRadialGradient(cx - R * 0.15, cy - R * 0.2, R * 0.05, cx, cy, R);
    floor.addColorStop(0, '#33265c');
    floor.addColorStop(0.42, '#241a45');
    floor.addColorStop(0.78, '#1a1233');
    floor.addColorStop(1, '#130c26');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = floor;
    ctx.fill();

    // Stone tiling: rings + radial seams
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();

    for (let ring = 1; ring <= 7; ring++) {
      const rr = (R / 7) * ring;
      ctx.strokeStyle = 'rgba(8,5,18,0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,98,190,0.09)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rr + 1.6, 0, TAU);
      ctx.stroke();
    }

    for (let ring = 0; ring < 7; ring++) {
      const r0 = (R / 7) * ring;
      const r1 = (R / 7) * (ring + 1);
      const segs = 10 + ring * 3;
      const offset = rng() * TAU;
      for (let i = 0; i < segs; i++) {
        const a = offset + (i / segs) * TAU;
        ctx.strokeStyle = 'rgba(8,5,18,0.32)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }
    }

    // Tile shade variation
    for (let i = 0; i < 90; i++) {
      const a = rng() * TAU;
      const dist = Math.sqrt(rng()) * R * 0.97;
      const x = cx + Math.cos(a) * dist;
      const y = cy + Math.sin(a) * dist;
      const size = R * (0.02 + rng() * 0.07);
      ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * (0.5 + rng() * 0.6), a, 0, TAU);
      ctx.fill();
    }

    // Cracks
    for (let i = 0; i < 9; i++) {
      const a = rng() * TAU;
      let dist = R * (0.15 + rng() * 0.75);
      let x = cx + Math.cos(a) * dist;
      let y = cy + Math.sin(a) * dist;
      ctx.strokeStyle = 'rgba(6,3,12,0.6)';
      ctx.lineWidth = 1 + rng() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let heading = a + rng() * 1.2;
      for (let s = 0; s < 5; s++) {
        heading += (rng() - 0.5) * 1.5;
        const len = R * (0.04 + rng() * 0.09);
        x += Math.cos(heading) * len;
        y += Math.sin(heading) * len;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Glowing seams from the centre
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.12;
      const grad = ctx.createLinearGradient(
        cx + Math.cos(a) * R * 0.12,
        cy + Math.sin(a) * R * 0.12,
        cx + Math.cos(a) * R,
        cy + Math.sin(a) * R
      );
      grad.addColorStop(0, 'rgba(150,110,255,0.22)');
      grad.addColorStop(1, 'rgba(150,110,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // Arena wall
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R + 3, 0, TAU);
    ctx.strokeStyle = 'rgba(96,72,160,0.35)';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6.5, 0, TAU);
    ctx.strokeStyle = 'rgba(10,6,20,0.8)';
    ctx.lineWidth = 8;
    ctx.stroke();
    // Runic notches in the rim
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      const x0 = cx + Math.cos(a) * (R + 0.5);
      const y0 = cy + Math.sin(a) * (R + 0.5);
      const x1 = cx + Math.cos(a) * (R + 6);
      const y1 = cy + Math.sin(a) * (R + 6);
      ctx.strokeStyle = i % 7 === 0 ? 'rgba(240,200,120,0.55)' : 'rgba(150,120,230,0.3)';
      ctx.lineWidth = i % 7 === 0 ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();

    // Vignette
    const vignette = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, Math.max(w, h) * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    this.canvas = canvas;
    this.renderRuneSigil(dpr);
  }

  renderRuneSigil(dpr) {
    const size = this.radius * 1.6;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.max(1, Math.round(size * dpr));
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const c = size / 2;
    const R = this.radius * 0.62;
    const rng = mulberry32(777);

    ctx.strokeStyle = 'rgba(206,168,255,0.5)';
    ctx.lineWidth = 1.2;
    for (const k of [1, 0.86, 0.52]) {
      ctx.beginPath();
      ctx.arc(c, c, R * k, 0, TAU);
      ctx.stroke();
    }

    // Glyph band
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const x = c + Math.cos(a) * R * 0.93;
      const y = c + Math.sin(a) * R * 0.93;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(247,211,125,0.6)' : 'rgba(196,160,255,0.42)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      const g = Math.floor(rng() * 4);
      if (g === 0) {
        ctx.moveTo(-2, -3);
        ctx.lineTo(2, -3);
        ctx.lineTo(0, 3);
        ctx.closePath();
      } else if (g === 1) {
        ctx.moveTo(-2, 3);
        ctx.lineTo(-2, -3);
        ctx.lineTo(2, 0);
        ctx.lineTo(-2, 3);
      } else if (g === 2) {
        ctx.moveTo(-2.5, 0);
        ctx.lineTo(2.5, 0);
        ctx.moveTo(0, -3);
        ctx.lineTo(0, 3);
      } else {
        ctx.moveTo(-2, -2.5);
        ctx.lineTo(2, 2.5);
        ctx.moveTo(2, -2.5);
        ctx.lineTo(-2, 2.5);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Central star
    ctx.strokeStyle = 'rgba(247,211,125,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * R * 0.18, c + Math.sin(a) * R * 0.18);
      ctx.lineTo(c + Math.cos(a) * R * 0.5, c + Math.sin(a) * R * 0.5);
      ctx.stroke();
    }

    this.runeCanvas = canvas;
    this.runeSize = size;
  }

  draw(ctx, time) {
    if (!this.canvas) return;
    ctx.drawImage(this.canvas, 0, 0, this.w, this.h);

    if (this.runeCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22 + Math.sin(time * 0.6) * 0.06;
      ctx.translate(this.cx, this.cy);
      ctx.rotate(time * 0.035);
      ctx.drawImage(this.runeCanvas, -this.runeSize / 2, -this.runeSize / 2, this.runeSize, this.runeSize);
      ctx.restore();
    }
  }

  // Drifting motes of magic drifting up from the stone.
  drawMotes(ctx, time) {
    const R = this.radius;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const seed = i * 12.9898;
      const a = (seed % TAU) + time * 0.04 * (0.4 + (i % 5) * 0.2);
      const drift = ((time * 0.35 + i * 0.37) % 1);
      const dist = R * (0.15 + ((i * 0.618) % 0.8));
      const x = this.cx + Math.cos(a) * dist;
      const y = this.cy + Math.sin(a) * dist - drift * R * 0.25;
      const alpha = Math.sin(drift * Math.PI) * 0.35;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 3 === 0 ? '#f7d37d' : '#b18cff';
      ctx.beginPath();
      ctx.arc(x, y, 1.1 + (i % 3) * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
