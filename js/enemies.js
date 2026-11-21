// Enemy spawning, movement, attacks and the per-type procedural sprites.

import { ENEMY_TYPES, CONTACT_RADIUS, bossNamesForWave, hpScale, speedScale } from './config.js';
import { TAU, clamp, dist2, hexToRgba, Pool, rand, randInt } from './util.js';
import { drawGlow } from './fx.js';

class Enemy {
  constructor() {
    this.alive = false;
    this.type = null;
    this.x = 0;
    this.y = 0;
    this.hp = 1;
    this.maxHp = 1;
    this.radius = 5;
    this.speed = 10;
    this.damage = 2;
    this.armor = 0;
    this.reward = 1;
    this.attackTimer = 0;
    this.attackInterval = 1;
    this.slowT = 0;
    this.slowMul = 1;
    this.dotT = 0;
    this.dotDps = 0;
    this.hitFlash = 0;
    this.phase = 0;
    this.walk = 0;
    this.spawnAnim = 0;
    this.boss = false;
    this.shieldT = 0;
    this.abilityTimer = 0;
    this.ranged = false;
    this.rangedTimer = 0;
    this.name = '';
    this.wobble = 0;
  }
}

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.pool = new Pool(() => new Enemy());
    this.list = this.pool.items;
  }

  clear() {
    this.pool.clear();
  }

  spawn(typeId, wave, opts = {}) {
    const def = ENEMY_TYPES[typeId];
    if (!def) return null;
    const hpScale = opts.hpScale || 1;
    const spdScale = opts.speedScale || 1;
    const dmgScale = opts.damageScale || 1;

    const e = this.pool.spawn();
    e.type = typeId;
    e.hp = e.maxHp = Math.round(def.hp * hpScale);
    e.radius = def.radius;
    e.speed = def.speed * spdScale;
    e.damage = def.damage * dmgScale;
    e.armor = def.armor || 0;
    e.reward = def.reward;
    e.attackInterval = def.attackInterval;
    e.attackTimer = rand(0, 0.6);
    e.ranged = !!def.ranged;
    e.rangedTimer = 0;
    e.boss = !!def.boss;
    e.name = def.boss ? bossNamesForWave(wave) : def.name;
    e.slowT = 0;
    e.slowMul = 1;
    e.dotT = 0;
    e.dotDps = 0;
    e.hitFlash = 0;
    e.phase = rand(0, TAU);
    e.walk = rand(0, TAU);
    e.spawnAnim = 0;
    e.shieldT = 0;
    e.abilityTimer = e.boss ? 3.5 : 0;
    e.wobble = 0;

    if (opts.x !== undefined && opts.y !== undefined) {
      e.x = opts.x;
      e.y = opts.y;
    } else {
      const angle = opts.angle !== undefined ? opts.angle : rand(0, TAU);
      const dist = opts.dist || 100;
      e.x = Math.cos(angle) * dist;
      e.y = Math.sin(angle) * dist;
    }
    return e;
  }

  update(dt) {
    const wizard = this.game.wizard;
    const haste = this.game.enemyHaste > 0 ? 1.3 : 1;

    for (const e of this.list) {
      e.spawnAnim = Math.min(1, e.spawnAnim + dt * 3.4);
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      e.walk += dt * (e.boss ? 3 : 8);
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) e.slowMul = 1;
      }
      if (e.shieldT > 0) e.shieldT -= dt;

      if (e.dotT > 0) {
        e.dotT -= dt;
        this.game.damageEnemy(e, e.dotDps * dt, { dot: true, silent: true });
        if (e.alive && Math.random() < dt * 6) {
          this.game.fx.trail(e.x + rand(-e.radius, e.radius), e.y + rand(-e.radius, e.radius), '#8df25a', 1.1, 0.4);
        }
      }
      if (!e.alive) continue;

      const d2 = dist2(e.x, e.y, 0, 0);
      const dist = Math.sqrt(d2);
      const stopAt = CONTACT_RADIUS + e.radius * 0.35;

      if (e.boss) this.updateBoss(e, dt, dist);

      const wantsRange = e.ranged && dist < 62 && dist > 40;
      const moving = dist > stopAt && !wantsRange;

      if (moving) {
        const nx = -e.x / (dist || 1);
        const ny = -e.y / (dist || 1);
        const speed = e.speed * e.slowMul * haste * (e.boss ? 1 : 1);
        e.x += nx * speed * dt;
        e.y += ny * speed * dt;
      }

      // Soft separation so the horde spreads out instead of stacking.
      if (!e.boss) {
        for (const o of this.list) {
          if (o === e || !o.alive) continue;
          const dx = e.x - o.x;
          const dy = e.y - o.y;
          const minD = e.radius + o.radius;
          const dd = dx * dx + dy * dy;
          if (dd > 0.0001 && dd < minD * minD) {
            const d = Math.sqrt(dd);
            const push = ((minD - d) / minD) * 14 * dt;
            e.x += (dx / d) * push;
            e.y += (dy / d) * push;
          }
        }
      }

      // Attack the wizard
      e.attackTimer -= dt;
      if (dist <= stopAt + (e.boss ? 6 : 1.5) && e.attackTimer <= 0) {
        e.attackTimer = e.attackInterval;
        this.game.enemyAttack(e);
      }
      if (e.ranged) {
        e.rangedTimer -= dt;
        if (dist < 70 && e.rangedTimer <= 0) {
          e.rangedTimer = 2.6;
          this.game.enemyBolt(e);
        }
      }
    }
    this.pool.sweep();
  }

  updateBoss(e, dt, dist) {
    e.abilityTimer -= dt;
    if (e.abilityTimer > 0) return;
    e.abilityTimer = rand(5.2, 7.4);
    const roll = randInt(0, 4);
    const game = this.game;
    if (roll === 0) {
      const count = 3;
      const wave = game.waves.wave || 1;
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU);
        const minion = game.enemies.spawn(randInt(0, 1) ? 'skeleton' : 'goblin', wave, {
          x: e.x + Math.cos(a) * e.radius,
          y: e.y + Math.sin(a) * e.radius,
          hpScale: hpScale(wave),
          speedScale: speedScale(wave),
          damageScale: 1 + 0.05 * (wave - 1),
        });
        if (minion) game.fx.burst(minion.x, minion.y, '#b06bff', 8, { speed: 22 });
      }
      game.fx.ring(e.x, e.y, 4, e.radius * 2.4, '#b06bff', 0.5, 1.6);
      game.toast(`${e.name} summons reinforcements`, 'boss');
    } else if (roll === 1) {
      e.shieldT = 3.2;
      game.fx.ring(e.x, e.y, e.radius * 0.6, e.radius * 1.9, '#8fd8ff', 0.7, 2);
      game.toast(`${e.name} hardens its wards`, 'boss');
    } else if (roll === 2) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + rand(-0.2, 0.2);
        game.enemyBolt(e, a);
      }
      game.audio.bossRoar();
    } else if (roll === 3) {
      game.enemyHaste = 4;
      game.fx.ring(e.x, e.y, 6, 78, '#ff9a3c', 0.8, 2);
      game.toast(`${e.name} enrages the horde`, 'boss');
    } else {
      if (dist < 46) game.wizardHit(e.damage * 1.6, e);
      game.fx.ring(e.x, e.y, 8, 52, '#ff3b6b', 0.6, 3);
      game.fx.shakeFor(6);
      game.audio.bossRoar();
    }
  }

  draw(ctx, time) {
    for (const e of this.list) {
      if (!e.alive) continue;
      const def = ENEMY_TYPES[e.type];
      const scale = e.radius / 5.4;
      const appear = 0.5 + 0.5 * e.spawnAnim;

      ctx.save();
      ctx.translate(e.x, e.y);

      // ground shadow
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = '#04020a';
      ctx.beginPath();
      ctx.ellipse(0, e.radius * 0.45, e.radius * 0.95, e.radius * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (e.boss) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, 0, 0, e.radius * 2.4 + Math.sin(time * 2) * 4, def.color, 0.22);
        ctx.restore();
        ctx.save();
        ctx.rotate(time * 0.6);
        ctx.strokeStyle = hexToRgba(def.color, 0.4);
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 1.7, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      const facing = Math.atan2(-e.y, -e.x) + Math.PI / 2;
      ctx.rotate(facing);
      ctx.scale(scale * appear, scale * appear);

      const flash = e.hitFlash;
      drawEnemyBody(ctx, e, def, time, flash);
      ctx.restore();

      // Status effects
      if (e.slowT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(150,230,255,0.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 1.6, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      if (e.shieldT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(140,216,255,0.75)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + time;
          const px = e.x + Math.cos(a) * (e.radius + 3);
          const py = e.y + Math.sin(a) * (e.radius + 3);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // Health bar (hidden at full health for small foes)
      const showBar = e.hp < e.maxHp || e.boss;
      if (showBar) {
        const w = e.radius * 2.2;
        const h = e.boss ? 3 : 1.8;
        const x = e.x - w / 2;
        const y = e.y - e.radius - (e.boss ? 7 : 4.5);
        ctx.fillStyle = 'rgba(4,2,10,0.8)';
        ctx.fillRect(x - 0.6, y - 0.6, w + 1.2, h + 1.2);
        const frac = clamp(e.hp / e.maxHp, 0, 1);
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        if (e.boss) {
          grad.addColorStop(0, '#ff3b6b');
          grad.addColorStop(1, '#ffb36b');
        } else {
          grad.addColorStop(0, '#ff5d5d');
          grad.addColorStop(1, '#ffd166');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w * frac, h);
      }
    }
  }
}

// --- Per-type art -----------------------------------------------------------

function drawEnemyBody(ctx, e, def, time, flash) {
  const white = (alpha) => `rgba(255,255,255,${alpha})`;
  const bob = Math.sin(e.walk) * 0.35;
  const tint = (base) => (flash > 0.25 ? white(0.85) : base);

  switch (e.type) {
    case 'slime': {
      const squash = 1 + Math.sin(e.walk * 1.4) * 0.12;
      ctx.save();
      ctx.scale(1 / squash, squash);
      ctx.beginPath();
      ctx.ellipse(0, 0.6, 5.2, 4.2, 0, 0, TAU);
      ctx.fillStyle = tint(hexToRgba(def.color, 0.85));
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,60,30,0.7)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-1.6, -1.0, 1.7, 1.1, -0.4, 0, TAU);
      ctx.fillStyle = 'rgba(240,255,235,0.55)';
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#0a1a10';
      ctx.beginPath();
      ctx.arc(-1.5, -0.6, 0.75, 0, TAU);
      ctx.arc(1.5, -0.6, 0.75, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#d7ffd9';
      ctx.beginPath();
      ctx.arc(-1.7, -0.85, 0.28, 0, TAU);
      ctx.arc(1.3, -0.85, 0.28, 0, TAU);
      ctx.fill();
      break;
    }
    case 'goblin': {
      ctx.save();
      ctx.translate(0, bob * 0.4);
      // body
      ctx.beginPath();
      ctx.ellipse(0, 1.4, 3.5, 4.2, 0, 0, TAU);
      ctx.fillStyle = tint('#6d7a37');
      ctx.fill();
      ctx.strokeStyle = '#2a3215';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.arc(0, -2.6, 3.1, 0, TAU);
      ctx.fillStyle = tint(def.color);
      ctx.fill();
      ctx.stroke();
      // ears
      ctx.beginPath();
      ctx.moveTo(-2.7, -3.4);
      ctx.lineTo(-5.4, -5.2);
      ctx.lineTo(-2.4, -4.9);
      ctx.closePath();
      ctx.moveTo(2.7, -3.4);
      ctx.lineTo(5.4, -5.2);
      ctx.lineTo(2.4, -4.9);
      ctx.closePath();
      ctx.fillStyle = tint('#a9b354');
      ctx.fill();
      ctx.stroke();
      // eyes
      ctx.fillStyle = '#fff2a8';
      ctx.beginPath();
      ctx.arc(-1.1, -3.0, 0.6, 0, TAU);
      ctx.arc(1.1, -3.0, 0.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3a1a00';
      ctx.beginPath();
      ctx.arc(-1.1, -3.0, 0.28, 0, TAU);
      ctx.arc(1.1, -3.0, 0.28, 0, TAU);
      ctx.fill();
      // jagged grin
      ctx.strokeStyle = '#3a2a10';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-1.3, -1.5);
      ctx.lineTo(-0.5, -1.0);
      ctx.lineTo(0.4, -1.6);
      ctx.lineTo(1.2, -1.0);
      ctx.stroke();
      // dagger
      ctx.save();
      ctx.rotate(0.5 + Math.sin(e.walk) * 0.06);
      ctx.strokeStyle = '#cfd6e0';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(3.4, 1.0);
      ctx.lineTo(6.4, -0.6);
      ctx.stroke();
      ctx.strokeStyle = '#7a5230';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(2.8, 1.4);
      ctx.lineTo(3.6, 1.0);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      break;
    }
    case 'skeleton': {
      ctx.save();
      ctx.translate(0, bob * 0.3);
      // ribcage
      ctx.strokeStyle = tint(def.color);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -0.4);
      ctx.lineTo(0, 4.6);
      ctx.stroke();
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-2.2 + i * 0.15, 0.4 + i * 1.1);
        ctx.quadraticCurveTo(0, 1.2 + i * 1.1, 2.2 - i * 0.15, 0.4 + i * 1.1);
        ctx.stroke();
      }
      // pelvis
      ctx.beginPath();
      ctx.ellipse(0, 4.9, 1.6, 1.0, 0, 0, TAU);
      ctx.fillStyle = tint(def.color);
      ctx.fill();
      // skull
      ctx.beginPath();
      ctx.arc(0, -2.4, 2.9, 0, TAU);
      ctx.fillStyle = tint('#efe9d4');
      ctx.fill();
      ctx.strokeStyle = '#7d7563';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      // jaw
      ctx.beginPath();
      ctx.rect(-1.5, -0.6, 3.0, 1.3);
      ctx.fillStyle = tint('#ded7c0');
      ctx.fill();
      ctx.strokeStyle = '#7d7563';
      ctx.stroke();
      // eye sockets
      ctx.fillStyle = '#1a0a12';
      ctx.beginPath();
      ctx.ellipse(-1.05, -2.9, 0.75, 0.9, 0, 0, TAU);
      ctx.ellipse(1.05, -2.9, 0.75, 0.9, 0, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, -1.05, -2.9, 1.1, '#9ce7ff', 0.5);
      drawGlow(ctx, 1.05, -2.9, 1.1, '#9ce7ff', 0.5);
      ctx.restore();
      // rusted blade
      ctx.strokeStyle = '#8e8a74';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(3.2, 1.6);
      ctx.lineTo(6.0, -0.4);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'orc': {
      ctx.save();
      ctx.translate(0, bob * 0.35);
      // shoulders
      ctx.beginPath();
      ctx.ellipse(0, 1.2, 5.4, 4.6, 0, 0, TAU);
      ctx.fillStyle = tint('#5f8a36');
      ctx.fill();
      ctx.strokeStyle = '#243312';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.arc(0, -3.4, 3.5, 0, TAU);
      ctx.fillStyle = tint(def.color);
      ctx.fill();
      ctx.stroke();
      // topknot
      ctx.fillStyle = '#2a1a10';
      ctx.beginPath();
      ctx.ellipse(0, -6.6, 0.8, 1.6, 0, 0, TAU);
      ctx.fill();
      // brow
      ctx.strokeStyle = '#2b3d16';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-2.4, -4.3);
      ctx.lineTo(-0.5, -3.8);
      ctx.moveTo(2.4, -4.3);
      ctx.lineTo(0.5, -3.8);
      ctx.stroke();
      // tusks
      ctx.fillStyle = '#f2ecd2';
      ctx.beginPath();
      ctx.moveTo(-1.5, -1.9);
      ctx.lineTo(-1.0, -0.2);
      ctx.lineTo(-0.5, -1.9);
      ctx.closePath();
      ctx.moveTo(1.5, -1.9);
      ctx.lineTo(1.0, -0.2);
      ctx.lineTo(0.5, -1.9);
      ctx.closePath();
      ctx.fill();
      // eyes
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.arc(-1.4, -3.6, 0.6, 0, TAU);
      ctx.arc(1.4, -3.6, 0.6, 0, TAU);
      ctx.fill();
      // club
      ctx.save();
      ctx.rotate(-0.35 + Math.sin(e.walk) * 0.05);
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(4.2, 2.0);
      ctx.lineTo(5.6, -2.4);
      ctx.stroke();
      ctx.fillStyle = '#7d5632';
      ctx.beginPath();
      ctx.ellipse(5.9, -3.2, 1.9, 1.4, 0.2, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.restore();
      break;
    }
    case 'wraith': {
      ctx.save();
      ctx.globalAlpha = 0.88;
      const fl = Math.sin(time * 3 + e.phase) * 1.2;
      // trailing tatters
      ctx.beginPath();
      ctx.moveTo(-3.6, 0);
      ctx.quadraticCurveTo(-4.6 + fl, 4.6, -2.0 + fl, 7.4);
      ctx.quadraticCurveTo(0, 8.8 + fl * 0.4, 2.0 + fl, 7.4);
      ctx.quadraticCurveTo(4.6 + fl, 4.6, 3.6, 0);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -4, 0, 8);
      grad.addColorStop(0, hexToRgba(def.color, 0.85));
      grad.addColorStop(1, hexToRgba(def.color, 0.05));
      ctx.fillStyle = flash > 0.25 ? white(0.8) : grad;
      ctx.fill();
      // hood
      ctx.beginPath();
      ctx.moveTo(-3.4, -1.0);
      ctx.quadraticCurveTo(-3.8, -7.4, 0, -7.8);
      ctx.quadraticCurveTo(3.8, -7.4, 3.4, -1.0);
      ctx.quadraticCurveTo(0, 0.4, -3.4, -1.0);
      ctx.closePath();
      ctx.fillStyle = flash > 0.25 ? white(0.85) : hexToRgba('#2a1050', 0.92);
      ctx.fill();
      ctx.strokeStyle = hexToRgba('#c9a0ff', 0.5);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // face void + eyes
      ctx.beginPath();
      ctx.ellipse(0, -3.6, 1.8, 2.0, 0, 0, TAU);
      ctx.fillStyle = '#08030f';
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, -0.7, -3.9, 1.3, '#c9a0ff', 0.85);
      drawGlow(ctx, 0.7, -3.9, 1.3, '#c9a0ff', 0.85);
      ctx.restore();
      // claw arms
      ctx.strokeStyle = hexToRgba('#d8b6ff', 0.7);
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-3.2, 0.4);
      ctx.quadraticCurveTo(-5.4, 1.4, -4.6, 3.4);
      ctx.moveTo(3.2, 0.4);
      ctx.quadraticCurveTo(5.4, 1.4, 4.6, 3.4);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'spider': {
      ctx.save();
      // legs
      ctx.strokeStyle = tint('#4d1f6b');
      ctx.lineWidth = 0.75;
      for (let i = 0; i < 4; i++) {
        const swing = Math.sin(e.walk + i * 1.4) * 1.1;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 2.0, -1.0 + i * 1.4);
          ctx.quadraticCurveTo(
            side * (5.6 + swing),
            -3.0 + i * 2.0,
            side * (7.0 + swing * 0.6),
            1.0 + i * 1.6
          );
          ctx.stroke();
        }
      }
      // abdomen
      ctx.beginPath();
      ctx.ellipse(0, 1.8, 3.4, 4.2, 0, 0, TAU);
      ctx.fillStyle = tint('#5c2a80');
      ctx.fill();
      ctx.strokeStyle = '#25102e';
      ctx.stroke();
      // pattern
      ctx.fillStyle = hexToRgba('#ff4f7a', 0.7);
      ctx.beginPath();
      ctx.ellipse(0, 1.4, 1.0, 2.0, 0, 0, TAU);
      ctx.fill();
      // head
      ctx.beginPath();
      ctx.arc(0, -2.6, 2.4, 0, TAU);
      ctx.fillStyle = tint(def.color);
      ctx.fill();
      ctx.strokeStyle = '#25102e';
      ctx.stroke();
      // eyes
      ctx.fillStyle = '#ff6b6b';
      for (const dx of [-1.1, -0.35, 0.35, 1.1]) {
        ctx.beginPath();
        ctx.arc(dx, -3.2, 0.42, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'knight': {
      ctx.save();
      ctx.translate(0, bob * 0.25);
      // cloak
      ctx.fillStyle = '#5c1f2e';
      ctx.beginPath();
      ctx.moveTo(-3.6, -1.0);
      ctx.quadraticCurveTo(-5.2, 3.0, -2.4, 6.0);
      ctx.quadraticCurveTo(0, 6.8, 2.4, 6.0);
      ctx.quadraticCurveTo(5.2, 3.0, 3.6, -1.0);
      ctx.closePath();
      ctx.fill();
      // torso plate
      ctx.beginPath();
      ctx.moveTo(-3.6, -2.4);
      ctx.quadraticCurveTo(0, -3.6, 3.6, -2.4);
      ctx.lineTo(3.0, 4.4);
      ctx.quadraticCurveTo(0, 5.6, -3.0, 4.4);
      ctx.closePath();
      const plate = ctx.createLinearGradient(-3, -3, 3, 5);
      plate.addColorStop(0, '#d7e2f2');
      plate.addColorStop(0.5, def.color);
      plate.addColorStop(1, '#4d5f7d');
      ctx.fillStyle = flash > 0.25 ? white(0.9) : plate;
      ctx.fill();
      ctx.strokeStyle = '#2a3446';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // helmet
      ctx.beginPath();
      ctx.arc(0, -4.4, 3.1, 0, TAU);
      ctx.fillStyle = flash > 0.25 ? white(0.9) : '#b8c8de';
      ctx.fill();
      ctx.strokeStyle = '#2a3446';
      ctx.stroke();
      // visor
      ctx.fillStyle = '#131a26';
      ctx.fillRect(-2.0, -5.2, 4.0, 1.2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ff7a7a';
      ctx.fillRect(-1.5, -4.9, 1.1, 0.5);
      ctx.fillRect(0.4, -4.9, 1.1, 0.5);
      ctx.restore();
      // shield
      ctx.save();
      ctx.translate(-4.4, 0.6);
      ctx.rotate(-0.2);
      ctx.beginPath();
      ctx.moveTo(0, -3.6);
      ctx.quadraticCurveTo(3.2, -2.4, 2.8, 1.4);
      ctx.quadraticCurveTo(1.6, 4.0, 0, 4.6);
      ctx.quadraticCurveTo(-1.6, 4.0, -2.8, 1.4);
      ctx.quadraticCurveTo(-3.2, -2.4, 0, -3.6);
      ctx.closePath();
      ctx.fillStyle = '#3f5a7d';
      ctx.fill();
      ctx.strokeStyle = '#c8b06a';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.strokeStyle = '#c8b06a';
      ctx.beginPath();
      ctx.moveTo(0, -2.4);
      ctx.lineTo(0, 3.2);
      ctx.moveTo(-2.0, 0);
      ctx.lineTo(2.0, 0);
      ctx.stroke();
      ctx.restore();
      // sword
      ctx.strokeStyle = '#dfe8f5';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(3.6, 2.4);
      ctx.lineTo(6.4, -1.6);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'demon': {
      ctx.save();
      ctx.translate(0, bob * 0.5);
      // wings
      const flap = Math.sin(time * 6 + e.phase) * 1.6;
      ctx.fillStyle = hexToRgba('#5c0f1f', 0.9);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 3.0, -1.0);
        ctx.quadraticCurveTo(side * (10 + flap), -6.0, side * (9 - flap), 2.0);
        ctx.quadraticCurveTo(side * 6.0, 1.0, side * 3.4, 3.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = hexToRgba('#ff6b6b', 0.4);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      // body
      ctx.beginPath();
      ctx.ellipse(0, 1.6, 4.4, 4.8, 0, 0, TAU);
      ctx.fillStyle = tint('#a41f2e');
      ctx.fill();
      ctx.strokeStyle = '#3a0710';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // molten cracks
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexToRgba('#ff9a3c', 0.8);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-2.4, 0.4);
      ctx.lineTo(-0.8, 2.0);
      ctx.lineTo(-1.6, 4.0);
      ctx.moveTo(2.2, 0.0);
      ctx.lineTo(1.0, 2.4);
      ctx.lineTo(2.0, 4.4);
      ctx.stroke();
      ctx.restore();
      // head
      ctx.beginPath();
      ctx.arc(0, -3.6, 2.9, 0, TAU);
      ctx.fillStyle = tint('#c22b36');
      ctx.fill();
      ctx.strokeStyle = '#3a0710';
      ctx.stroke();
      // horns
      ctx.fillStyle = '#2a1014';
      ctx.beginPath();
      ctx.moveTo(-1.9, -5.6);
      ctx.quadraticCurveTo(-4.4, -8.6, -2.2, -9.4);
      ctx.quadraticCurveTo(-1.4, -7.4, -0.9, -5.9);
      ctx.closePath();
      ctx.moveTo(1.9, -5.6);
      ctx.quadraticCurveTo(4.4, -8.6, 2.2, -9.4);
      ctx.quadraticCurveTo(1.4, -7.4, 0.9, -5.9);
      ctx.closePath();
      ctx.fill();
      // eyes
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, -1.0, -4.0, 1.4, '#ffd24a', 0.8);
      drawGlow(ctx, 1.0, -4.0, 1.4, '#ffd24a', 0.8);
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.ellipse(-1.0, -4.0, 0.45, 0.6, 0.3, 0, TAU);
      ctx.ellipse(1.0, -4.0, 0.45, 0.6, -0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.restore();
      break;
    }
    case 'boss': {
      ctx.save();
      const pulse = 1 + Math.sin(time * 2.4) * 0.03;
      ctx.scale(pulse, pulse);
      // wings
      const flap = Math.sin(time * 3) * 2.4;
      ctx.fillStyle = hexToRgba('#4a0a1e', 0.92);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 4.0, -2.0);
        ctx.quadraticCurveTo(side * (16 + flap), -12, side * (15 - flap), 6);
        ctx.quadraticCurveTo(side * 10, 3, side * 5.0, 6.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = hexToRgba('#ff3b6b', 0.45);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      // body
      ctx.beginPath();
      ctx.ellipse(0, 2.0, 7.0, 7.6, 0, 0, TAU);
      const bodyGrad = ctx.createRadialGradient(0, -2, 1, 0, 2, 8);
      bodyGrad.addColorStop(0, '#ff5a6e');
      bodyGrad.addColorStop(0.6, '#a3172f');
      bodyGrad.addColorStop(1, '#48061a');
      ctx.fillStyle = flash > 0.2 ? white(0.9) : bodyGrad;
      ctx.fill();
      ctx.strokeStyle = '#28040e';
      ctx.lineWidth = 1;
      ctx.stroke();
      // chest core
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, 0, 2.4, 6.5 + Math.sin(time * 4) * 1.4, '#ffb36b', 0.7);
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(0, 2.4, 1.8, 0, TAU);
      ctx.fill();
      ctx.restore();
      // head
      ctx.beginPath();
      ctx.arc(0, -6.4, 5.0, 0, TAU);
      ctx.fillStyle = flash > 0.2 ? white(0.9) : '#b81f33';
      ctx.fill();
      ctx.strokeStyle = '#28040e';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      // horns
      ctx.fillStyle = '#2a0a10';
      ctx.beginPath();
      ctx.moveTo(-3.2, -9.8);
      ctx.quadraticCurveTo(-8.4, -15.4, -4.2, -16.0);
      ctx.quadraticCurveTo(-2.6, -12.0, -1.6, -9.6);
      ctx.closePath();
      ctx.moveTo(3.2, -9.8);
      ctx.quadraticCurveTo(8.4, -15.4, 4.2, -16.0);
      ctx.quadraticCurveTo(2.6, -12.0, 1.6, -9.6);
      ctx.closePath();
      ctx.fill();
      // crown
      ctx.fillStyle = '#e8b64a';
      ctx.beginPath();
      ctx.moveTo(-3.4, -10.4);
      ctx.lineTo(-2.6, -13.4);
      ctx.lineTo(-1.2, -11.4);
      ctx.lineTo(0, -14.2);
      ctx.lineTo(1.2, -11.4);
      ctx.lineTo(2.6, -13.4);
      ctx.lineTo(3.4, -10.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8a5c14';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      // eyes
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, -1.9, -6.6, 2.6, '#ffd24a', 0.9);
      drawGlow(ctx, 1.9, -6.6, 2.6, '#ffd24a', 0.9);
      ctx.fillStyle = '#fff6c4';
      ctx.beginPath();
      ctx.ellipse(-1.9, -6.6, 0.9, 0.7, 0.3, 0, TAU);
      ctx.ellipse(1.9, -6.6, 0.9, 0.7, -0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      //jaw
      ctx.fillStyle = '#26040a';
      ctx.beginPath();
      ctx.moveTo(-2.6, -3.4);
      ctx.quadraticCurveTo(0, -1.4, 2.6, -3.4);
      ctx.quadraticCurveTo(0, -2.6, -2.6, -3.4);
      ctx.fill();
      ctx.restore();
      break;
    }
    default: {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, TAU);
      ctx.fill();
    }
  }
}
