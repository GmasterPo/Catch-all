// Endless wave director: builds each wave, spawns it over time, tracks bosses,
// and hands out wave and milestone rewards.

import {
  ENEMY_TYPES,
  bossNamesForWave,
  crystalsForWave,
  hpScale,
  isBossWave,
  rewardScale,
  spawnInterval,
  speedScale,
  waveClearBonus,
  waveEnemyCount,
} from './config.js';
import { rand, TAU } from './util.js';

const NON_BOSS = Object.values(ENEMY_TYPES).filter((d) => !d.boss);

export class WaveManager {
  constructor(game) {
    this.game = game;
    this.wave = 0;
    this.state = 'idle';
    this.queue = [];
    this.total = 0;
    this.spawned = 0;
    this.spawnTimer = 0;
    this.intermission = 0;
    this.bossEnemy = null;
    this.waveKilled = 0;
  }

  start() {
    this.wave = Math.max(0, this.game.state.data.run.wave || 0);
    this.state = 'idle';
    this.queue.length = 0;
    this.intermission = 0.8;
    this.bossEnemy = null;
    this.waveKilled = 0;
  }

  get isBossWave() {
    return isBossWave(this.wave);
  }

  get progress() {
    if (!this.total) return 0;
    return Math.min(1, (this.spawned + this.waveKilled) / this.total);
  }

  update(dt) {
    const game = this.game;
    if (this.state === 'idle' || this.state === 'intermission') {
      this.intermission -= dt;
      if (this.intermission <= 0 && !game.defeat) this.beginNext();
      return;
    }

    if (this.state === 'spawning') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.queue.length) {
        this.spawnOne();
        this.spawnTimer = spawnInterval(this.wave) * rand(0.75, 1.25);
      }
      if (!this.queue.length) this.state = 'clearing';
      return;
    }

    if (this.bossEnemy && !this.bossEnemy.alive) {
      this.bossEnemy = null;
      game.boss = null;
    }

    if (this.state === 'clearing' && !game.enemies.list.length) {
      this.completeWave();
    }
  }

  beginNext() {
    const game = this.game;
    this.wave += 1;
    game.state.recordWave(this.wave);

    const boss = isBossWave(this.wave);
    this.queue = this.buildWave(this.wave, boss);
    this.total = this.queue.length;
    this.spawned = 0;
    this.waveKilled = 0;
    this.spawnTimer = boss ? 0.6 : 0.35;
    this.state = 'spawning';
    this.bossEnemy = null;

    game.onWaveStart(this.wave, boss);
  }

  buildWave(wave, boss) {
    const queue = [];
    if (boss) {
      queue.push('boss');
      const minions = 4 + Math.floor(wave / 10);
      for (let i = 0; i < minions; i++) queue.push(this.pickType(wave));
      return queue;
    }

    const count = waveEnemyCount(wave);
    for (let i = 0; i < count; i++) queue.push(this.pickType(wave));
    return queue;
  }

  pickType(wave) {
    const pool = NON_BOSS.filter((d) => d.minWave <= wave);
    if (!pool.length) return 'slime';
    // Newer, tougher foes gradually take over the mix.
    let total = 0;
    for (const d of pool) {
      total += d.weight * (1 + Math.min(2.2, (wave - d.minWave) * 0.03));
    }
    let roll = Math.random() * total;
    for (const d of pool) {
      roll -= d.weight * (1 + Math.min(2.2, (wave - d.minWave) * 0.03));
      if (roll <= 0) return d.id;
    }
    return pool[pool.length - 1].id;
  }

  spawnOne() {
    const game = this.game;
    const typeId = this.queue.shift();
    if (!typeId) return;
    const angle = rand(0, TAU);
    const wave = this.wave;
    const e = game.enemies.spawn(typeId, wave, {
      angle,
      dist: 100,
      hpScale: hpScale(wave),
      speedScale: speedScale(wave),
      damageScale: 0.62 * (1 + 0.05 * (wave - 1)),
    });
    if (!e) return;
    this.spawned++;
    if (e.boss) {
      this.bossEnemy = e;
      game.boss = e;
      game.audio.bossRoar();
      game.fx.ring(e.x, e.y, 6, 40, '#ff3b6b', 0.9, 3);
    }
  }

  onEnemyDeath(enemy) {
    if (enemy === this.bossEnemy) {
      this.bossEnemy = null;
      this.game.boss = null;
      const gain = 1 + Math.floor(this.wave / 20);
      const gems = 6 + Math.floor(this.wave / 10) * 2;
      this.game.state.data.crystals += gain;
      this.game.state.data.gems += gems;
      this.game.toast(`${enemy.name} falls — +${gain} ✦ · +${gems} ❖ gems`, 'crystal');
      this.game.audio.prestige();
    }
    this.waveKilled++;
    this.game.state.data.stats.killed += 0;
  }

  completeWave() {
    const game = this.game;
    const state = game.state;
    const bonus = Math.floor(
      waveClearBonus(this.wave) * state.goldMult * state.rewardMult * rewardScale(this.wave) * 0.35
    );
    state.data.gold += bonus;
    state.data.stats.goldEarned += bonus;
    this.state = 'intermission';
    this.intermission = isBossWave(this.wave) ? 3.0 : 1.8;

    // Cleansing the arena restores a little of the wizard's wards.
    game.healWizard(0.05);

    game.onWaveCleared(this.wave, bonus);

    if (this.wave % 5 === 0) {
      const extra = Math.floor(bonus * 1.5);
      state.data.gold += extra;
      state.data.stats.goldEarned += extra;
      state.data.gems += 1;
      game.toast(`Wave ${this.wave} milestone — +${extra} gold · +1 ❖`, 'gold');
    }
    if (isBossWave(this.wave)) {
      game.toast(`${bossNamesForWave(this.wave)} defeated`, 'boss');
    }
  }
}
