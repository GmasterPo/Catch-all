// Pooled projectiles for both the wizard's spells and enemy attacks.

import { Pool, TAU, clamp, dist2, lerp, rand } from './util.js';
import { drawGlow } from './fx.js';

export class Projectiles {
  constructor(game) {
    this.game = game;
    this.pool = new Pool(() => ({}));
    this.list = this.pool.items;
  }

  clear() {
    this.pool.clear();
  }

  fire(opts) {
    const p = this.pool.spawn();
    p.x = opts.x || 0;
    p.y = opts.y || 0;
    p.target = opts.target || null;
    p.damage = opts.damage || 0;
    p.color = opts.color || '#8ff';
    p.speed = opts.speed || 180;
    p.radius = opts.radius || 2.4;
    p.aoe = opts.aoe || 0;
    p.pierce = opts.pierce || 0;
    p.slow = opts.slow || 0;
    p.slowTime = opts.slowTime || 0;
    p.style = opts.style || 'bolt';
    p.hostile = !!opts.hostile;
    p.homing = opts.homing !== false;
    p.turn = opts.turn || 7;
    p.life = opts.life || 3.2;
    p.trailT = 0;
    p.hitList = [];
    p.angle = opts.angle !== undefined ? opts.angle : Math.atan2((p.target ? p.target.y : 0) - p.y, (p.target ? p.target.x : 0) - p.x);
    p.vx = Math.cos(p.angle) * p.speed;
    p.vy = Math.sin(p.angle) * p.speed;
    p.spin = rand(0, TAU);
    p.age = 0;
    return p;
  }

  update(dt) {
    const game = this.game;
    for (const p of this.list) {
      p.age += dt;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }

      if (p.homing && p.target && p.target.alive) {
        const desired = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        let diff = ((desired - p.angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
        p.angle += clamp(diff, -p.turn * dt, p.turn * dt);
        p.vx = Math.cos(p.angle) * p.speed;
        p.vy = Math.sin(p.angle) * p.speed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += dt * 7;

      p.trailT -= dt;
      if (p.trailT <= 0) {
        p.trailT = 0.018;
        game.fx.trail(p.x, p.y, p.color, p.radius * 0.55, 0.3);
      }

      if (p.hostile) {
        if (dist2(p.x, p.y, 0, 0) < 64) {
          game.wizardHit(p.damage, null);
          game.fx.burst(p.x, p.y, p.color, 10, { speed: 30 });
          p.alive = false;
        }
      } else {
        for (const e of game.enemies.list) {
          if (!e.alive) continue;
          if (p.hitList.includes(e)) continue;
          const r = e.radius + p.radius;
          if (dist2(p.x, p.y, e.x, e.y) <= r * r) {
            this.impact(p, e);
            if (!p.alive) break;
          }
        }
      }

      if (dist2(p.x, p.y, 0, 0) > 130 * 130) p.alive = false;
    }
    this.pool.sweep();
  }

  impact(p, enemy) {
    const game = this.game;
    if (p.aoe > 0) {
      game.areaDamage(p.x, p.y, p.aoe, p.damage, {
        color: p.color,
        slow: p.slow,
        slowTime: p.slowTime,
        source: 'aoe',
      });
      game.fx.ring(p.x, p.y, p.radius, p.aoe, p.color, 0.42, 1.8);
      game.fx.burst(p.x, p.y, p.color, 22, { speed: 46, size: 2.2 });
      game.fx.shakeFor(p.aoe > 28 ? 4.5 : 2.2);
      game.audio.impact();
      p.alive = false;
      return;
    }

    game.damageEnemy(enemy, p.damage, { color: p.color, source: p.style });
    if (p.cloud) {
      game.spells.zones.push({
        x: p.x,
        y: p.y,
        r: p.cloud.r,
        life: p.cloud.time,
        maxLife: p.cloud.time,
        dps: p.cloud.dot,
        color: p.color,
        slow: 0,
      });
      game.fx.burst(p.x, p.y, p.color, 18, { speed: 32, size: 2.2 });
    }
    if (p.slow > 0 && enemy.alive) {
      enemy.slowMul = Math.min(enemy.slowMul, 1 - p.slow);
      enemy.slowT = Math.max(enemy.slowT, p.slowTime);
    }
    game.fx.burst(p.x, p.y, p.color, p.pierce > 0 ? 6 : 13, { speed: 30, size: 1.6 });
    game.audio.impact();

    if (p.pierce > 0) {
      p.hitList.push(enemy);
      p.pierce -= 1;
      p.damage *= 0.85;
    } else {
      p.alive = false;
    }
  }

  draw(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      const pulse = 1 + Math.sin(time * 18 + p.spin) * 0.12;
      const r = p.radius * pulse;
      drawGlow(ctx, p.x, p.y, r * 4.2, p.color, 0.55);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      if (p.style === 'ice') {
        ctx.fillStyle = '#eaffff';
        ctx.beginPath();
        ctx.moveTo(r * 2.6, 0);
        ctx.lineTo(0, r * 0.9);
        ctx.lineTo(-r * 2.0, 0);
        ctx.lineTo(0, -r * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(r * 1.6, 0);
        ctx.lineTo(0, r * 0.55);
        ctx.lineTo(-r * 1.4, 0);
        ctx.lineTo(0, -r * 0.55);
        ctx.closePath();
        ctx.fill();
      } else if (p.style === 'fire') {
        ctx.fillStyle = '#fff2c0';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, TAU);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.quadraticCurveTo(0, r * 1.5, -r * 2.6, 0);
        ctx.quadraticCurveTo(0, -r * 1.5, r * 2.2, 0);
        ctx.fill();
      } else if (p.style === 'rune') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = r * 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55, 0, TAU);
        ctx.fill();
      } else if (p.style === 'missile') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(-r * 0.6, 0, r * 2.0, r * 0.7, 0, 0, TAU);
        ctx.fill();
      } else if (p.style === 'poison') {
        const wob = 1 + Math.sin(p.age * 14) * 0.15;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.5 * wob, r * 1.2, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(240,255,190,0.8)';
        ctx.beginPath();
        ctx.arc(-r * 0.4, -r * 0.3, r * 0.4, 0, TAU);
        ctx.fill();
      } else if (p.hostile) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(r * 2.4, 0);
        ctx.lineTo(-r * 1.2, r * 1.2);
        ctx.lineTo(-r * 0.4, 0);
        ctx.lineTo(-r * 1.2, -r * 1.2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.9, 0, TAU);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(-r * 0.9, 0, r * 2.2, r * 0.8, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      if (p.aoe > 0) {
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.aoe * 0.35, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }
}
