// Idle and offline progression. Offline time is converted with a reward
// formula instead of simulating every enemy, so returning after hours is instant.

import { idleGoldPerSecond } from './config.js';

export const OFFLINE_EFFICIENCY = 0.75;
export const LIVE_IDLE_SHARE = 0.35;
export const MIN_OFFLINE_SECONDS = 60;

export function currentWaveForIdle(state) {
  return Math.max(1, state.data.run.wave || 0, state.data.run.best || 0);
}

export function idleRatePerSecond(state) {
  return idleGoldPerSecond(currentWaveForIdle(state)) * state.idleMult * state.goldMult;
}

export function liveIdleRate(state) {
  return idleRatePerSecond(state) * LIVE_IDLE_SHARE;
}

export function computeOffline(state, lastSeen, now = Date.now()) {
  const elapsed = Math.max(0, (now - lastSeen) / 1000);
  const capSeconds = state.offlineCapHours * 3600;
  const effective = Math.min(elapsed, capSeconds);
  const rate = idleRatePerSecond(state);
  const gold = elapsed >= MIN_OFFLINE_SECONDS ? Math.floor(rate * effective * OFFLINE_EFFICIENCY) : 0;
  const avgReward = Math.max(1, 3 + currentWaveForIdle(state) * 0.8);
  const kills = Math.floor((rate * effective * OFFLINE_EFFICIENCY) / avgReward);

  return {
    elapsed,
    effective,
    capped: elapsed > capSeconds,
    gold,
    rate,
    kills,
    capSeconds,
  };
}

export function applyOffline(state, report) {
  if (report.gold <= 0) return 0;
  state.data.gold += report.gold;
  state.data.stats.goldEarned += report.gold;
  return report.gold;
}
