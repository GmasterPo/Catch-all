// The spell engine: cooldowns, targeting and one visual identity per spell.

import { SPELLS, VIEW_RADIUS } from './config.js';
import { TAU, clamp, dist2, rand } from './util.js';
import { drawGlow } from './fx.js';

export class SpellSystem {
  constructor(game) {
    this.game = game;
    this.timers = {};
    this.pending = [];
    this.zones = [];
  }

  reset() {
    this.timers = {};
    this.pending.length = 0;
    this.zones.length = 0;
    for (const s of SPELLS) this.timers[s.id] = rand(0.1, 0.7);
  }

  update(dt) {
    for (const id in this.timers) {
      if (this.timers[id] > 0) this.timers[id] -= dt;
    }

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const m = this.pending[i];
      m.t -= dt;
      if (m.t <= 0) {
        this.detonate(m);
        this.pending.splice(i, 1);
      }
    }

    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= dt;
      this.game.enemies.list.forEach((e) => {
        if (!e.alive) return;
        if (dist2(e.x, e.y, z.x, z.y) < (z.r + e.radius) * (z.r + e.radius)) {
          this.game.damageEnemy(e, z.dps * dt, { dot: true, silent: true });
          if (e.slow && z.slow) {
            e.slowT = Math.max(e.slowT, 0.6);
            e.slowMul = Math.min(e.slowMul, 1 - z.slow);
          }
        }
      });
      if (Math.random() < dt * 14) {
        const a = rand(0, TAU);
        const d = Math.sqrt(Math.random()) * z.r;
        this.game.fx.trail(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, z.color, 1.5, 0.5);
      }
      if (z.life <= 0) this.zones.splice(i, 1);
    }

    this.tryCast();
  }

  tryCast() {
    const game = this.game;
    const state = game.state;
    // Highest tier first so big spells get the mana they need.
    for (let i = SPELLS.length - 1; i >= 0; i--) {
      const def = SPELLS[i];
      if (!state.hasSpell(def.id)) continue;
      if ((this.timers[def.id] || 0) > 0) continue;
      if (game.mana < def.mana) continue;
      const stats = state.spellStats(def.id);
      const targets = this.pickTargets(def, stats);
      if (!targets.length) continue;
      game.mana = Math.max(0, game.mana - def.mana);
      this.timers[def.id] = stats.cooldown;
      this.cast(def, targets, stats);
    }
  }

  pickTargets(def, stats) {
    const list = this.game.enemies.list;
    if (!list.length) return [];
    const alive = list.filter((e) => e.alive);
    if (!alive.length) return [];

    if (def.kind === 'nova') {
      const near = alive.filter((e) => dist2(e.x, e.y, 0, 0) < Math.pow(stats.aoe, 2));
      return near.length ? [near[0]] : [];
    }
    if (def.kind === 'meteor' || def.kind === 'storm') {
      return [this.clusterPoint()];
    }

    const sorted = alive
      .slice()
      .sort((a, b) => dist2(a.x, a.y, 0, 0) - dist2(b.x, b.y, 0, 0));

    if (def.kind === 'barrage') {
      return sorted.slice(0, stats.count);
    }
    if (def.kind === 'drain') {
      return sorted.slice(0, stats.targets || 1);
    }
    if (def.kind === 'chain') {
      return sorted.slice(0, 1);
    }
    return sorted.slice(0, Math.max(1, this.game.state.targetsPerVolley));
  }

  // A spot in the horde with the most neighbours around it.
  clusterPoint() {
    const alive = this.game.enemies.list.filter((e) => e.alive);
    if (!alive.length) return { x: 0, y: 0 };
    let best = alive[0];
    let bestScore = -1;
    const sample = alive.length > 24 ? 24 : alive.length;
    for (let i = 0; i < sample; i++) {
      const e = alive[Math.floor((i / sample) * alive.length)];
      let score = 0;
      for (const o of alive) {
        if (o === e) continue;
        if (dist2(e.x, e.y, o.x, o.y) < 34 * 34) score += 1 + (o.boss ? 2 : 0);
      }
      score += (VIEW_RADIUS - Math.sqrt(dist2(e.x, e.y, 0, 0))) * 0.02;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return { x: best.x, y: best.y };
  }

  cast(def, targets, stats) {
    const game = this.game;
    const state = game.state;
    const dmg = stats.damage;
    const target = targets[0];

    game.wizard.castSpell(def.color);
    game.audio.cast(def.id);

    switch (def.kind) {
      case 'bolt': {
        for (const t of targets) {
          game.projectiles.fire({
            x: 0,
            y: 0,
            target: t,
            damage: dmg,
            color: def.color,
            speed: def.speed * state.projectileSpeedMult,
            radius: def.radius,
            style: 'bolt',
          });
        }
        break;
      }
      case 'aoebolt': {
        game.projectiles.fire({
          x: 0,
          y: 0,
          target,
          damage: dmg,
          color: def.color,
          speed: def.speed * state.projectileSpeedMult,
          radius: def.radius,
          aoe: stats.aoe,
          style: 'fire',
        });
        break;
      }
      case 'lance': {
        for (const t of targets) {
          game.projectiles.fire({
            x: 0,
            y: 0,
            target: t,
            damage: dmg,
            color: def.color,
            speed: def.speed * state.projectileSpeedMult,
            radius: def.radius,
            pierce: stats.pierce,
            slow: stats.slow,
            slowTime: stats.slowTime,
            style: 'ice',
            turn: 4,
          });
        }
        break;
      }
      case 'nova': {
        const r = stats.aoe;
        game.areaDamage(0, 0, r, dmg, {
          color: def.color,
          slow: stats.slow,
          slowTime: stats.slowTime,
          source: 'nova',
        });
        game.fx.ring(0, 0, 6, r, def.color, 0.5, 2.6);
        game.fx.ring(0, 0, 2, r * 0.8, '#ffffff', 0.32, 1.2);
        game.fx.burst(0, 0, def.color, 26, { speed: 70, size: 2.4 });
        game.fx.flashScreen(def.color, 0.18);
        game.fx.shakeFor(3.5);
        break;
      }
      case 'chain': {
        let from = { x: 0, y: 0 };
        let current = target;
        let power = dmg;
        const hit = new Set();
        for (let i = 0; i < stats.jumps; i++) {
          if (!current) break;
          this.lightning(from.x, from.y, current.x, current.y, def.color);
          game.damageEnemy(current, power, { color: def.color, source: 'chain' });
          game.fx.burst(current.x, current.y, def.color, 8, { speed: 34 });
          hit.add(current);
          from = current;
          power *= 0.82;
          current = this.nearestUnhit(from, hit, def.jumpRange);
        }
        game.audio.cast('chain');
        break;
      }
      case 'cloud': {
        game.projectiles.fire({
          x: 0,
          y: 0,
          target,
          damage: dmg,
          color: def.color,
          speed: def.speed * state.projectileSpeedMult,
          radius: def.radius,
          style: 'poison',
          onImpact: true,
        });
        // The orb is converted into a cloud when it lands; we tag it here.
        const p = game.projectiles.list[game.projectiles.list.length - 1];
        p.cloud = { r: stats.aoe, dot: dmg * stats.dot, time: stats.dotTime };
        break;
      }
      case 'barrage': {
        const count = Math.max(stats.count, targets.length);
        for (let i = 0; i < count; i++) {
          const t = targets[i % targets.length];
          if (!t) continue;
          game.projectiles.fire({
            x: Math.cos((i / count) * TAU) * 3,
            y: Math.sin((i / count) * TAU) * 3,
            target: t,
            damage: dmg,
            color: def.color,
            speed: def.speed * state.projectileSpeedMult,
            radius: def.radius,
            style: 'missile',
            turn: 9,
          });
        }
        break;
      }
      case 'meteor': {
        this.pending.push({
          x: target.x,
          y: target.y,
          t: def.delay,
          delay: def.delay,
          radius: stats.aoe,
          damage: dmg,
          color: def.color,
          big: true,
        });
        break;
      }
      case 'storm': {
        for (let i = 0; i < stats.count; i++) {
          const p = this.clusterPoint();
          const a = rand(0, TAU);
          const d = rand(0, 26);
          this.pending.push({
            x: clamp(p.x + Math.cos(a) * d, -VIEW_RADIUS + 6, VIEW_RADIUS - 6),
            y: clamp(p.y + Math.sin(a) * d, -VIEW_RADIUS + 6, VIEW_RADIUS - 6),
            t: def.delay + i * 0.06,
            delay: def.delay,
            radius: stats.aoe,
            damage: dmg,
            color: def.color,
            big: false,
          });
        }
        break;
      }
      case 'drain': {
        for (const t of targets) {
          this.lightning(0, 0, t.x, t.y, def.color, 3);
          game.damageEnemy(t, dmg, { color: def.color, source: 'drain' });
          game.fx.burst(t.x, t.y, def.color, 10, { speed: 26 });
          const back = Math.atan2(-t.y, -t.x);
          game.fx.burst(t.x, t.y, '#ffffff', 4, { speed: 40, angle: back, spread: 0.9 });
        }
        game.healWizard(stats.heal);
        game.addMana(stats.manaGain);
        break;
      }
      default:
        break;
    }
  }

  detonate(m) {
    const game = this.game;
    game.areaDamage(m.x, m.y, m.radius, m.damage, { color: m.color, source: 'meteor' });
    game.fx.ring(m.x, m.y, 2, m.radius * 1.15, m.color, 0.55, m.big ? 3.4 : 2);
    game.fx.burst(m.x, m.y, m.color, m.big ? 34 : 16, { speed: m.big ? 70 : 44, size: 2.6 });
    game.fx.burst(m.x, m.y, '#fff2c0', m.big ? 12 : 6, { speed: 30, size: 2 });
    game.fx.shakeFor(m.big ? 6 : 2.5);
    game.audio.impact();
  }

  lightning(x1, y1, x2, y2, color, width = 1) {
    const points = [x1, y1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const segs = Math.max(2, Math.round(len / 9));
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const off = rand(-1, 1) * (len * 0.025 + 1.5);
      points.push(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
    }
    points.push(x2, y2);
    this.game.fx.bolt(points, color, 0.22 + width * 0.02);
  }

  nearestUnhit(from, hit, range) {
    let best = null;
    let bestD = range * range;
    for (const e of this.game.enemies.list) {
      if (!e.alive || hit.has(e)) continue;
      const d = dist2(from.x, from.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  draw(ctx, time) {
    // Lingering clouds
    ctx.save();
    for (const z of this.zones) {
      const k = clamp(z.life / z.maxLife, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, z.x, z.y, z.r * (1.05 + Math.sin(time * 2 + z.x) * 0.04), z.color, 0.2 * k);
      ctx.globalAlpha = 0.3 * k;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 1.1;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    ctx.restore();

    // Incoming meteors and runes
    for (const m of this.pending) {
      const k = clamp(1 - m.t / m.delay, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.4 + k * 0.4;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * (1.25 - k * 0.25), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.2 + k * 0.3;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * 0.4 * (1 + k), 0, TAU);
      ctx.fillStyle = m.color;
      ctx.fill();

      const px = m.x + 30 * (1 - k);
      const py = m.y - 82 * (1 - k);
      drawGlow(ctx, px, py, m.big ? 9 : 5, m.color, 0.85);
      ctx.strokeStyle = m.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = m.big ? 3 : 1.6;
      ctx.beginPath();
      ctx.moveTo(px + (m.big ? 12 : 6), py - (m.big ? 26 : 14));
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.restore();
    }
  }
}
