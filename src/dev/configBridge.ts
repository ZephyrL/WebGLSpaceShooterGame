/**
 * Config bridge — re-exports mutable config in dev mode, originals in prod.
 *
 * All gameplay systems should import from this module instead of directly
 * from `../config/*`. In production builds, Vite tree-shakes the dev path
 * and the runtimeConfig module is never bundled.
 */

import { GAME_CONFIG as _GAME } from '../config/gameConfig';
import { PLAYER_CONFIG as _PLAYER } from '../config/playerConfig';
import { ENEMY_CONFIG as _ENEMY, ENEMY_BULLET_SPEED as _EBS } from '../config/enemyConfig';
import { POWERUP_CONFIG as _POWERUP } from '../config/powerupConfig';
import { WAVE_CONFIG as _WAVES } from '../config/waveConfig';
import { runtimeConfig } from './runtimeConfig';

// Re-export types that consumers need
export type { EnemyType, EnemyStats } from '../config/enemyConfig';
export type { PowerupType, PowerupStats } from '../config/powerupConfig';
export type { WaveDefinition, WaveEntry } from '../config/waveConfig';

// ── Exported config accessors ─────────────────────────────────────────
// In dev mode these return mutable objects from runtimeConfig.
// In prod mode these return the original frozen `as const` objects.

export const getGameConfig = import.meta.env.DEV
  ? () => runtimeConfig.game
  : () => _GAME;

export const getPlayerConfig = import.meta.env.DEV
  ? () => runtimeConfig.player
  : () => _PLAYER;

export const getEnemyConfig = import.meta.env.DEV
  ? () => runtimeConfig.enemy
  : () => _ENEMY;

export const getEnemyBulletSpeed = import.meta.env.DEV
  ? () => runtimeConfig.enemyBulletSpeed
  : () => _EBS;

export const getPowerupConfig = import.meta.env.DEV
  ? () => runtimeConfig.powerup
  : () => _POWERUP;

export const getWaveConfig = import.meta.env.DEV
  ? () => runtimeConfig.waves
  : () => _WAVES;
