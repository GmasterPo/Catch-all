// The simulation: fixed-timestep loop, damage resolution, run lifecycle and
// the world-space render pass.

import { VIEW_RADIUS } from './config.js';
import { clamp, dist2, fmt, lerp, rand } from './util.js';
import { Fx } from './fx.js';
import { Arena } from './arena.js';
import { Wizard } from './wizard.js';
import { EnemyManager } from './enemies.js';
import { Projectiles } from './projectiles.js';
import { SpellSystem } from './spells.js';
import { WaveManager } from './waves.js';
import { liveIdleRate } from './idle.js';

const STEP = 1 / 60;
const MAX_STEPS = 40;

export class Game {
  constructor({ canvas, state, audio, ui }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.state = state;
    this.audio = audio;
    this.ui = ui;

    this.fx = new Fx();
    this.arena = new Arena();
    this.wizard = new Wizard();
    this.enemies = new EnemyManager(this);
    this.projectiles = new Projectiles(this);
    this.spells = new SpellSystem(this);
    this.waves = new WaveManager(this);

    this.speed = 1;
    this.paused = false;
    this.defeat = false;
    this.time = 0;
    this.acc = 0;
    this.lastFrame = 0;
    this.hp = 100;
    this.mana = 100;
    this.enemyHaste = 0;
    this.boss = null;
    this.dmgLog = [];
    this.idleAccrued = 0;
    this.sessionGold = 0;
    this.viewW = 0;
    this.viewH = 0;
    this.scale = 1;
    this.dpr = 1;
    this.running = false;
  }

  init() {
    this.fx.setLowFx(this.state.lowFx);
    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      const target = this.canvas.parentElement || this.canvas;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(target);
    } else {
      window.addEventListener('resize', () => this.resize());
    }

    if (!this.state.data.run.wave) this.state.beginRun();
    this.startRun();
    this.running = true;
    this.lastFrame = performance.now() / 1000;
    requestAnimationFrame(this.loop);
  }

  resize() {
    const parent = this.canvas.parentElement || this.canvas;
    const w = Math.max(220, Math.floor(parent.clientWidth || window.innerWidth));
    const h = Math.max(220, Math.floor(parent.clientHeight || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.viewW = w;
    this.viewH = h;
    this.dpr = dpr;
    this.scale = (Math.min(w, h) / 2 - 6) / VIEW_RADIUS;
    this.arena.resize(w, h, dpr, this.scale);
    this.render();
  }

  startRun() {
    const state = this.state;
    this.defeat = false;
    this.paused = false;
    this.hp = state.maxHealth;
    this.mana = state.manaMax;
    this.enemyHaste = 0;
    this.boss = null;
    this.dmgLog.length = 0;
    this.enemies.clear();
    this.projectiles.clear();
    this.spells.reset();
    this.fx.clear();
    this.wizard.reset();
    this.waves.start();
    this.acc = 0;
    this.ui?.refreshAll();
  }

  restartRun() {
    this.state.beginRun();
    this.startRun();
    this.ui?.closeModals();
    this.ui?.refreshAll();
  }

  setSpeed(n) {
    this.speed = n === 5 ? 5 : n === 2 ? 2 : 1;
    this.ui?.syncSpeed();
  }

  togglePause() {
    if (this.defeat) return;
    this.paused = !this.paused;
    this.ui?.syncPause();
  }

  loop = (ts) => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const now = ts / 1000;
    let frameDt = now - this.lastFrame;
    this.lastFrame = now;
    if (!isFinite(frameDt) || frameDt < 0) frameDt = 0;
    frameDt = Math.min(frameDt, 0.1);

    if (this.defeat) {
      this.wizard.defeat = Math.min(1, this.wizard.defeat + frameDt * 2.2);
      this.fx.update(frameDt);
      this.time += frameDt * 0.4;
    } else if (!this.paused) {
      this.acc += frameDt * this.speed;
      let steps = 0;
      while (this.acc >= STEP && steps < MAX_STEPS * this.speed) {
        this.step(STEP);
        this.acc -= STEP;
        steps++;
        if (this.defeat) break;
      }
      if (steps >= MAX_STEPS * this.speed) this.acc = 0;
    }

    this.render();
    this.ui?.update(this, frameDt);
  };

  step(dt) {
    const state = this.state;
    this.time += dt;
    state.data.stats.playTime += dt;

    this.enemyHaste = Math.max(0, this.enemyHaste - dt);
    this.mana = Math.min(state.manaMax, this.mana + state.manaRegen * dt);

    const target = this.nearestEnemy();
    this.wizard.update(dt, target ? Math.atan2(target.y, target.x) : null);

    this.enemies.update(dt);
    this.spells.update(dt);
    this.projectiles.update(dt);
    this.waves.update(dt);
    this.fx.update(dt);

    // Passive idle trickle while the game is open.
    const gain = liveIdleRate(state) * dt;
    this.idleAccrued += gain;
    if (this.idleAccrued >= 1) {
      const whole = Math.floor(this.idleAccrued);
      this.idleAccrued -= whole;
      state.data.gold += whole;
      state.data.stats.goldEarned += whole;
    }

    // DPS over a 2 second window.
    const cutoff = this.time - 2;
    while (this.dmgLog.length && this.dmgLog[0].t < cutoff) this.dmgLog.shift();

    if (this.hp <= 0 && !this.defeat) this.onDefeat();
  }

  get dps() {
    let total = 0;
    for (const d of this.dmgLog) total += d.a;
    return total / 2;
  }

  nearestEnemy() {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies.list) {
      if (!e.alive) continue;
      const d = dist2(e.x, e.y, 0, 0);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  // --- Combat ---------------------------------------------------------------

  damageEnemy(enemy, amount, opts = {}) {
    if (!enemy.alive || amount <= 0) return;
    const state = this.state;
    let dmg = amount;
    let crit = false;

    if (!opts.dot && !opts.silent && Math.random() < state.critChance) {
      dmg *= state.critMultiplier;
      crit = true;
    }
    const armor = Math.min(0.85, (enemy.armor || 0) + (enemy.shieldT > 0 ? 0.55 : 0));
    dmg *= 1 - armor;

    enemy.hp -= dmg;
    enemy.hitFlash = 1;
    state.data.stats.damage += dmg;
    this.dmgLog.push({ t: this.time, a: dmg });
    if (this.dmgLog.length > 900) this.dmgLog.shift();

    if (!opts.dot && dmg >= 1) {
      this.fx.text(enemy.x + rand(-1.5, 1.5), enemy.y - enemy.radius - 1.5, fmt(Math.round(dmg)), {
        color: crit ? '#ffd166' : opts.color || '#f2ecff',
        crit,
        size: enemy.boss ? 4.6 : 5,
      });
    }

    if (enemy.hp <= 0) this.killEnemy(enemy, opts);
  }

  killEnemy(enemy, opts = {}) {
    if (!enemy.alive) return;
    enemy.alive = false;
    const state = this.state;
    const def = enemy.boss ? 2.2 : 1;
    const gold = Math.max(
      1,
      Math.floor(enemy.reward * (1 + (this.waves.wave - 1) * 0.14) * state.goldMult * state.rewardMult * def)
    );
    state.data.gold += gold;
    state.data.stats.goldEarned += gold;
    state.data.stats.killed += 1;
    this.sessionGold += gold;

    this.fx.text(enemy.x, enemy.y - enemy.radius, `+${fmt(gold)}`, {
      color: '#ffd166',
      size: enemy.boss ? 6.5 : 4.6,
    });
    this.fx.burst(enemy.x, enemy.y, enemy.boss ? '#ff3b6b' : '#ffd9a0', enemy.boss ? 40 : 14, {
      speed: enemy.boss ? 80 : 34,
      size: enemy.boss ? 3 : 1.8,
      life: 0.6,
    });

    if (enemy.boss) {
      this.fx.ring(enemy.x, enemy.y, 4, 70, '#ff3b6b', 0.9, 4);
      this.fx.flashScreen('#ff3b6b', 0.3);
      this.fx.shakeFor(9);
      state.data.stats.bosses += 1;
    }

    this.audio.kill(enemy.boss);
    this.waves.onEnemyDeath(enemy);
  }

  areaDamage(x, y, radius, damage, opts = {}) {
    for (const e of this.enemies.list) {
      if (!e.alive) continue;
      const d = Math.sqrt(dist2(e.x, e.y, x, y));
      if (d > radius + e.radius) continue;
      const falloff = opts.falloff === false ? 1 : lerp(1, 0.55, clamp(d / (radius || 1), 0, 1));
      this.damageEnemy(e, damage * falloff, {
        color: opts.color,
        source: opts.source,
        dot: opts.dot,
      });
      if (opts.slow > 0 && e.alive) {
        e.slowMul = Math.min(e.slowMul, 1 - opts.slow);
        e.slowT = Math.max(e.slowT, opts.slowTime || 2);
      }
    }
  }

  enemyAttack(enemy) {
    const dmg = enemy.damage;
    const ix = enemy.x * 0.72;
    const iy = enemy.y * 0.72;
    this.fx.burst(ix, iy, enemy.boss ? '#ff3b6b' : '#ff9a9a', 9, { speed: 30 });
    this.wizardHit(dmg, enemy);

    // Normal foes expend themselves against the ward; bosses stay and keep
    // hammering, so a wave can only ever land one hit per enemy.
    if (!enemy.boss) {
      enemy.alive = false;
      this.fx.burst(ix, iy, '#ffd0d8', 14, { speed: 46, size: 1.7, life: 0.45 });
      this.fx.ring(ix, iy, 2, 13, '#ff5c7a', 0.34, 1.5);
      this.fx.shakeFor(2);
    }
  }

  enemyBolt(enemy, angle) {
    const a = angle === undefined ? Math.atan2(-enemy.y, -enemy.x) + rand(-0.15, 0.15) : angle;
    this.projectiles.fire({
      x: enemy.x,
      y: enemy.y,
      target: null,
      angle: a,
      damage: enemy.damage * 0.9,
      color: enemy.boss ? '#ff3b6b' : '#ff7a5c',
      speed: 72,
      radius: 2.6,
      style: 'enemy',
      hostile: true,
      homing: false,
      life: 4,
    });
    this.audio.impact();
  }

  wizardHit(amount, source) {
    if (this.defeat) return;
    this.hp = Math.max(0, this.hp - amount);
    this.wizard.takeHit();
    this.fx.text(rand(-5, 5), -9, `-${fmt(Math.max(1, Math.round(amount)))}`, {
      color: '#ff8080',
      size: 6.4,
      vy: -12,
    });
    this.fx.burst(0, 0, '#ff5c7a', 9, { speed: 28, size: 1.7 });
    this.fx.shakeFor(4.2);
    this.fx.flashScreen('#ff3b6b', 0.14);
    this.audio.hurt();
    if (this.hp <= 0) this.onDefeat();
  }

  healWizard(fraction) {
    const max = this.state.maxHealth;
    if (this.hp >= max || fraction <= 0) return;
    this.hp = Math.min(max, this.hp + max * fraction);
    this.fx.text(0, -12, `+${fmt(Math.round(this.state.maxHealth * fraction))}`, { color: '#8df25a', size: 5 });
  }

  addMana(amount) {
    this.mana = Math.min(this.state.manaMax, this.mana + amount);
  }

  // --- Run lifecycle --------------------------------------------------------

  onWaveStart(wave, boss) {
    this.ui?.waveBanner(boss ? `BOSS WAVE ${wave}` : `WAVE ${wave}`, boss);
    this.audio.wave();
    if (boss) this.audio.bossRoar();
  }

  onWaveCleared(wave, bonus) {
    if (this.ui) this.ui.waveCleared(wave, bonus);
  }

  onDefeat() {
    if (this.defeat) return;
    this.defeat = true;
    this.paused = false;
    this.hp = 0;
    const state = this.state;
    if (this.waves.wave > (state.data.run.best || 0)) state.data.run.best = this.waves.wave;
    this.audio.kill(true);
    this.fx.flashScreen('#ff3b6b', 0.45);
    this.fx.shakeFor(10);
    this.ui?.syncPause();
    setTimeout(() => this.ui?.showDefeat(), 700);
  }

  toast(message, kind) {
    this.ui?.toast(message, kind);
  }

  // --- Rendering ------------------------------------------------------------

  render() {
    const ctx = this.ctx;
    if (!ctx || !this.viewW) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.arena.draw(ctx, this.time);
    this.arena.drawMotes(ctx, this.time);

    const shake = this.fx.shake;
    const sx = shake ? rand(-1, 1) * shake : 0;
    const sy = shake ? rand(-1, 1) * shake : 0;

    ctx.save();
    ctx.translate(this.viewW / 2 + sx, this.viewH / 2 + sy);
    ctx.scale(this.scale, this.scale);

    this.spells.draw(ctx, this.time);
    this.enemies.draw(ctx, this.time);
    this.wizard.draw(ctx, this.time);
    this.projectiles.draw(ctx, this.time);
    this.fx.draw(ctx);

    ctx.restore();
    this.fx.drawFlash(ctx, this.viewW, this.viewH);

    if (this.paused && !this.defeat) {
      ctx.fillStyle = 'rgba(7,3,16,0.45)';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }
  }
}
