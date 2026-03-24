import { aabbOverlap } from '../engine/collision';
import { getPlayerConfig, getPowerupConfig } from '../dev/configBridge';
import { Player } from './player';
import { PlayerBulletSystem } from './playerBullets';
import { EnemyBulletSystem } from './enemyBullets';
import { EnemySystem, Enemy } from './enemies';
import { PowerupSystem } from './powerups';
import { CameraSystem } from '../engine/cameraSystem';

/**
 * CollisionManager — per-tick collision sweep for all active entity pairs.
 */
export class CollisionManager {
  /** Callback when an enemy is destroyed (for scoring, power-up drops). */
  public onEnemyDestroyed: ((enemy: Enemy) => void) | null = null;
  /** Callback when player dies. */
  public onPlayerDied: (() => void) | null = null;
  /** Callback to trigger screen-clear bomb visual. */
  public onBombTriggered: (() => void) | null = null;

  /** Tracked setTimeout IDs for cleanup on scene exit. */
  private pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  update(
    player: Player,
    playerBullets: PlayerBulletSystem,
    enemyBullets: EnemyBulletSystem,
    enemies: EnemySystem,
    powerups: PowerupSystem,
    cameraSystem: CameraSystem,
  ): void {
    // 1. Player bullets ↔ enemies
    playerBullets.pool.forEachActive((bullet) => {
      const bx = bullet.mesh.position.x;
      const by = bullet.mesh.position.y;
      const bhx = 0.15; // bullet half-extent
      const bhy = 0.15;

      enemies.pool.forEachActive((enemy) => {
        if (!bullet.active) return; // already consumed

        const ex = enemy.mesh.position.x;
        const ey = enemy.mesh.position.y;
        const ehx = enemy.stats.halfExtents.x;
        const ehy = enemy.stats.halfExtents.y;

        if (aabbOverlap(bx, by, bhx, bhy, ex, ey, ehx, ehy)) {
          // Deactivate bullet
          playerBullets.pool.release(bullet);

          // Damage enemy
          enemy.health -= bullet.damage;
          if (enemy.health <= 0) {
            enemies.pool.release(enemy);
            this.onEnemyDestroyed?.(enemy);
          }
        }
      });
    });

    // 2. Enemy bullets ↔ player
    if (!player.isInvincible()) {
      const px = player.mesh.position.x;
      const py = player.mesh.position.y;
      const phx = getPlayerConfig().halfExtents.x;
      const phy = getPlayerConfig().halfExtents.y;

      enemyBullets.pool.forEachActive((bullet) => {
        if (player.isInvincible()) return; // became invincible from prior hit this tick

        const bx = bullet.mesh.position.x;
        const by = bullet.mesh.position.y;

        if (aabbOverlap(px, py, phx, phy, bx, by, 0.15, 0.15)) {
          enemyBullets.pool.release(bullet);
          const died = player.takeDamage();
          if (died) this.onPlayerDied?.();
        }
      });
    }

    // 3. Enemy body ↔ player
    if (!player.isInvincible()) {
      const px = player.mesh.position.x;
      const py = player.mesh.position.y;
      const phx = getPlayerConfig().halfExtents.x;
      const phy = getPlayerConfig().halfExtents.y;

      enemies.pool.forEachActive((enemy) => {
        if (player.isInvincible()) return;

        const ex = enemy.mesh.position.x;
        const ey = enemy.mesh.position.y;
        const ehx = enemy.stats.halfExtents.x;
        const ehy = enemy.stats.halfExtents.y;

        if (aabbOverlap(px, py, phx, phy, ex, ey, ehx, ehy)) {
          enemies.pool.release(enemy);
          this.onEnemyDestroyed?.(enemy);
          const died = player.takeDamage();
          if (died) this.onPlayerDied?.();
        }
      });
    }

    // 4. Player ↔ power-up pickups
    {
      const px = player.mesh.position.x;
      const py = player.mesh.position.y;
      const phx = getPlayerConfig().halfExtents.x;
      const phy = getPlayerConfig().halfExtents.y;
      const puhx = getPowerupConfig().halfExtents.x;
      const puhy = getPowerupConfig().halfExtents.y;

      powerups.pool.forEachActive((pickup) => {
        const pux = pickup.mesh.position.x;
        const puy = pickup.mesh.position.y;

        if (aabbOverlap(px, py, phx, phy, pux, puy, puhx, puhy)) {
          powerups.pool.release(pickup);

          if (pickup.type === 'bomb') {
            // Screen-clear bomb: destroy all enemies, deactivate all enemy bullets
            enemies.pool.forEachActive((enemy) => {
              enemies.pool.release(enemy);
              this.onEnemyDestroyed?.(enemy);
            });
            enemyBullets.releaseAll();
            cameraSystem.transitionToCinematic(0.7);
            // Schedule return to gameplay camera
            const timerId = setTimeout(() => {
              this.pendingTimers.delete(timerId);
              cameraSystem.transitionToGameplay(0.7);
            }, 1500);
            this.pendingTimers.add(timerId);
            this.onBombTriggered?.();
          } else {
            player.applyPowerup(pickup.type, playerBullets);
          }
        }
      });
    }
  }

  /** Cancel all pending timers (call on scene exit). */
  clearPendingTimers(): void {
    for (const id of this.pendingTimers) {
      clearTimeout(id);
    }
    this.pendingTimers.clear();
  }
}
