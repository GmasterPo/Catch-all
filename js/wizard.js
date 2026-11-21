// The player character: a hand-drawn (path based) archmage seen from above.
// Everything is animated procedurally: breathing, robe sway, staff lift on cast,
// facing rotation, hit flash and a collapse pose on defeat.

import { TAU, angleLerp, clamp, hexToRgba } from './util.js';
import { drawGlow } from './fx.js';

const ROBE = '#4a34a8';
const ROBE_DARK = '#2a1a66';
const ROBE_LIGHT = '#8268ee';
const GOLD = '#f2c14e';
const ORB = '#7cf3ff';

export class Wizard {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.facing = -Math.PI / 2;
    this.cast = 0;
    this.hit = 0;
    this.defeat = 0;
    this.manaRatio = 1;
    this.radius = 6.4;
    this.castingSpell = null;
    this.castTint = ORB;
  }

  reset() {
    this.facing = -Math.PI / 2;
    this.cast = 0;
    this.hit = 0;
    this.defeat = 0;
    this.castingSpell = null;
    this.castTint = ORB;
  }

  update(dt, targetAngle) {
    if (targetAngle !== null && targetAngle !== undefined) {
      this.facing = angleLerp(this.facing, targetAngle, clamp(1 - Math.pow(0.0008, dt), 0, 1));
    }
    this.cast = Math.max(0, this.cast - dt * 3.4);
    this.hit = Math.max(0, this.hit - dt * 4.2);
  }

  castSpell(color) {
    this.cast = 1;
    if (color) this.castTint = color;
  }

  takeHit() {
    this.hit = 1;
  }

  draw(ctx, time) {
    const t = time;
    const breathe = Math.sin(t * 2.1);
    const sway = Math.sin(t * 1.65);
    const cast = this.cast;
    const castLift = cast * cast;
    const defeat = this.defeat;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Ground aura
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 0, 1, 21 + cast * 6, '#8a63ff', 0.26 + cast * 0.2);
    ctx.restore();

    // Rune ring beneath the wizard
    ctx.save();
    ctx.rotate(t * 0.5);
    ctx.strokeStyle = hexToRgba('#b79bff', 0.16 + cast * 0.4);
    ctx.lineWidth = 0.7;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 13.4, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.strokeStyle = hexToRgba(i % 2 ? '#f2c14e' : '#b79bff', 0.2 + cast * 0.4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 11.8, Math.sin(a) * 11.8);
      ctx.lineTo(Math.cos(a) * 14.6, Math.sin(a) * 14.6);
      ctx.stroke();
    }
    ctx.restore();

    // Contact shadow
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#05020c';
    ctx.beginPath();
    ctx.ellipse(0, 3.0, 8.6, 6.0, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    const bob = breathe * 0.22 + castLift * 0.35;
    ctx.translate(0, -bob);
    if (defeat > 0) {
      ctx.rotate(defeat * 1.1);
      ctx.translate(0, defeat * 1.5);
      ctx.globalAlpha = 1 - defeat * 0.35;
    }

    ctx.rotate(this.facing + Math.PI / 2);
    ctx.scale(1.7, 1.7 * (1 + breathe * 0.012));

    const flash = this.hit;

    // --- Cloak trailing behind ---
    ctx.beginPath();
    ctx.moveTo(-3.6, -4.2);
    ctx.quadraticCurveTo(-5.4 + sway * 0.5, 1.2, -4.6 + sway * 1.1, 6.2);
    ctx.quadraticCurveTo(-2.4 + sway, 8.1, 0, 7.6);
    ctx.quadraticCurveTo(2.4 + sway, 8.1, 4.6 - sway * 1.1, 6.2);
    ctx.quadraticCurveTo(5.4 - sway * 0.5, 1.2, 3.6, -4.2);
    ctx.closePath();
    const cloakGrad = ctx.createLinearGradient(0, -4, 0, 8);
    cloakGrad.addColorStop(0, '#2a1a5e');
    cloakGrad.addColorStop(1, '#150c30');
    ctx.fillStyle = flash > 0.2 ? '#d8d0ff' : cloakGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,6,22,0.8)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // --- Robe body ---
    ctx.beginPath();
    ctx.moveTo(0, -5.4);
    ctx.quadraticCurveTo(-3.4, -4.9, -3.9, -0.6);
    ctx.quadraticCurveTo(-4.9 + sway * 0.6, 2.2, -4.2 + sway * 0.9, 5.5);
    ctx.quadraticCurveTo(-2.1, 6.6, 0, 6.3);
    ctx.quadraticCurveTo(2.1, 6.6, 4.2 - sway * 0.9, 5.5);
    ctx.quadraticCurveTo(4.9 - sway * 0.6, 2.2, 3.9, -0.6);
    ctx.quadraticCurveTo(3.4, -4.9, 0, -5.4);
    ctx.closePath();
    const robeGrad = ctx.createLinearGradient(-4, -5, 4, 6.5);
    robeGrad.addColorStop(0, ROBE_LIGHT);
    robeGrad.addColorStop(0.45, ROBE);
    robeGrad.addColorStop(1, ROBE_DARK);
    ctx.fillStyle = flash > 0.2 ? '#efeaff' : robeGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(12,7,26,0.9)';
    ctx.lineWidth = 0.55;
    ctx.stroke();

    // Robe folds
    ctx.strokeStyle = 'rgba(18,10,40,0.5)';
    ctx.lineWidth = 0.42;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 1.7, -1.4);
      ctx.quadraticCurveTo(i * 2.1 + sway * 0.4, 2.6, i * 2.6 + sway * 0.7, 5.6);
      ctx.stroke();
    }

    // Gold hem
    ctx.strokeStyle = hexToRgba(GOLD, 0.85);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-4.1 + sway * 0.9, 5.35);
    ctx.quadraticCurveTo(-2.1, 6.3, 0, 6.05);
    ctx.quadraticCurveTo(2.1, 6.3, 4.1 - sway * 0.9, 5.35);
    ctx.stroke();

    // Sash
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-3.2, 0.2);
    ctx.lineTo(3.2, 0.2);
    ctx.lineTo(3.0, 1.4);
    ctx.lineTo(-3.0, 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8d6bd8';
    ctx.beginPath();
    ctx.arc(0, 0.8, 0.75, 0, TAU);
    ctx.fill();

    // --- Shoulders / mantle ---
    ctx.beginPath();
    ctx.moveTo(-3.9, -4.1);
    ctx.quadraticCurveTo(-4.6, -2.4, -3.4, -1.5);
    ctx.quadraticCurveTo(0, -2.6, 3.4, -1.5);
    ctx.quadraticCurveTo(4.6, -2.4, 3.9, -4.1);
    ctx.quadraticCurveTo(0, -6.3, -3.9, -4.1);
    ctx.closePath();
    ctx.fillStyle = flash > 0.2 ? '#f2eeff' : '#4a34a0';
    ctx.fill();
    ctx.strokeStyle = 'rgba(12,7,26,0.85)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(GOLD, 0.7);
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-3.3, -1.9);
    ctx.quadraticCurveTo(0, -3.0, 3.3, -1.9);
    ctx.stroke();

    // --- Left arm raised slightly ---
    ctx.save();
    ctx.translate(-3.2, -1.2);
    ctx.rotate(-0.5 - castLift * 0.5);
    ctx.fillStyle = flash > 0.2 ? '#f2eeff' : ROBE;
    ctx.beginPath();
    ctx.moveTo(-1.3, 0);
    ctx.quadraticCurveTo(-1.9, 2.2, -0.3, 2.6);
    ctx.quadraticCurveTo(1.2, 2.2, 0.9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8cfa8';
    ctx.beginPath();
    ctx.arc(0.1, 2.9, 0.8, 0, TAU);
    ctx.fill();
    ctx.restore();

    // --- Wide hat brim (reads clearly from above) ---
    ctx.beginPath();
    ctx.ellipse(0, -4.6, 5.4, 2.0, 0, 0, TAU);
    ctx.fillStyle = flash > 0.2 ? '#f2eeff' : '#241650';
    ctx.fill();
    ctx.strokeStyle = hexToRgba(GOLD, 0.65);
    ctx.lineWidth = 0.45;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -5.0, 3.4, 1.2, 0, 0, TAU);
    ctx.fillStyle = 'rgba(12,6,26,0.55)';
    ctx.fill();

    // --- Hood ---
    ctx.beginPath();
    ctx.moveTo(-3.5, -4.3);
    ctx.quadraticCurveTo(-4.3, -8.7, -0.4, -10.3);
    ctx.quadraticCurveTo(3.7, -9.1, 3.5, -4.3);
    ctx.quadraticCurveTo(0, -2.9, -3.5, -4.3);
    ctx.closePath();
    const hoodGrad = ctx.createLinearGradient(0, -10, 0, -3);
    hoodGrad.addColorStop(0, '#5a41bd');
    hoodGrad.addColorStop(1, '#2a1a63');
    ctx.fillStyle = flash > 0.2 ? '#f6f2ff' : hoodGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,5,22,0.9)';
    ctx.lineWidth = 0.55;
    ctx.stroke();

    // Hood brim
    ctx.strokeStyle = hexToRgba(GOLD, 0.75);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-3.5, -4.3);
    ctx.quadraticCurveTo(0, -2.9, 3.5, -4.3);
    ctx.stroke();

    // Face void
    ctx.beginPath();
    ctx.ellipse(0, -6.1, 2.2, 2.5, 0, 0, TAU);
    ctx.fillStyle = '#0a0518';
    ctx.fill();

    // Glowing eyes
    const eyeAlpha = 0.75 + Math.sin(t * 4) * 0.15 + cast * 0.1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, -0.82, -6.35, 1.5, '#8ef8ff', eyeAlpha * 0.55);
    drawGlow(ctx, 0.82, -6.35, 1.5, '#8ef8ff', eyeAlpha * 0.55);
    ctx.fillStyle = '#d9ffff';
    ctx.beginPath();
    ctx.ellipse(-0.82, -6.35, 0.4, 0.55, 0, 0, TAU);
    ctx.ellipse(0.82, -6.35, 0.4, 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // --- Staff ---
    ctx.save();
    ctx.translate(2.9, 0.4);
    ctx.rotate(-0.16 - castLift * 0.22);
    ctx.translate(0, -castLift * 0.6);

    // shaft
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 0.95;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 3.6);
    ctx.lineTo(0, -9.6);
    ctx.stroke();
    ctx.strokeStyle = '#a2764a';
    ctx.lineWidth = 0.38;
    ctx.beginPath();
    ctx.moveTo(-0.25, 3.4);
    ctx.lineTo(-0.25, -9.4);
    ctx.stroke();

    // gold bands
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-0.55, 1.4);
    ctx.lineTo(0.55, 1.4);
    ctx.moveTo(-0.5, -8.6);
    ctx.lineTo(0.5, -8.6);
    ctx.stroke();

    // claws around the orb
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -9.5);
    ctx.quadraticCurveTo(-1.6, -10.4, -1.2, -11.9);
    ctx.moveTo(0, -9.5);
    ctx.quadraticCurveTo(1.6, -10.4, 1.2, -11.9);
    ctx.stroke();

    // orb
    const orbPulse = 0.9 + Math.sin(t * 3.2) * 0.08 + cast * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 0, -10.9, 6.4 * orbPulse, this.castTint, 0.55 + cast * 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -10.9, 1.15 * orbPulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = hexToRgba(this.castTint || ORB, 0.75);
    ctx.beginPath();
    ctx.arc(0, -10.9, 1.9 * orbPulse, 0, TAU);
    ctx.fill();
    ctx.restore();

    // orbiting motes while casting
    if (cast > 0.15) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i / 3) * TAU;
        const r = 2.1 + cast * 1.2;
        drawGlow(ctx, Math.cos(a) * r, -10.9 + Math.sin(a) * r * 0.6, 1.6, this.castTint, cast * 0.8);
      }
      ctx.restore();
    }
    ctx.restore();

    // Cast flare at the chest
    if (cast > 0.2) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, 0, -2.4, 7 * cast, this.castTint, cast * 0.4);
      ctx.restore();
    }

    ctx.restore();
  }
}
