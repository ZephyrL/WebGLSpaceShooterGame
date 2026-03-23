import * as THREE from 'three';
import { ObjectPool, Poolable } from '../engine/objectPool';
import { GAME_CONFIG } from '../config/gameConfig';
import { EnemyType, ENEMY_CONFIG, EnemyStats } from '../config/enemyConfig';
import { EnemyBulletSystem } from './enemyBullets';
import {
  createDroneMesh,
  createFighterMesh,
  createBomberMesh,
} from '../engine/placeholderFactory';

/** A single enemy entity. */
export interface Enemy extends Poolable {
  active: boolean;
  mesh: THREE.Mesh;
  type: EnemyType;
  health: number;
  stats: EnemyStats;
  /** Time since spawn, for sine-wave calculation */
  elapsed: number;
  /** Spawn X position, for sine-wave origin */
  spawnX: number;
  /** Fire cooldown remaining */
  fireCooldown: number;
}

const meshFactories: Record<EnemyType, () => THREE.Mesh> = {
  drone: createDroneMesh,
  fighter: createFighterMesh,
  bomber: createBomberMesh,
};

function createEnemy(_index: number): Enemy {
  // Default to drone; type is set on spawn
  return {
    active: false,
    mesh: createDroneMesh(),
    type: 'drone',
    health: 1,
    stats: ENEMY_CONFIG.drone,
    elapsed: 0,
    spawnX: 0,
    fireCooldown: 0,
  };
}

export class EnemySystem {
  public pool: ObjectPool<Enemy>;

  /** Reference to player position for aimed shots */
  private playerX = 0;
  private playerY = 0;

  constructor() {
    this.pool = new ObjectPool<Enemy>(createEnemy, GAME_CONFIG.poolSizes.enemies);
  }

  attachToScene(scene: THREE.Scene): void {
    this.pool.attachToScene(scene);
  }

  /** Update player position reference (called each tick by battle scene). */
  setPlayerPosition(x: number, y: number): void {
    this.playerX = x;
    this.playerY = y;
  }

  /** Spawn an enemy of the given type at a position. */
  spawn(type: EnemyType, x: number, y: number): void {
    const enemy = this.pool.acquire();
    if (!enemy) return;

    const stats = ENEMY_CONFIG[type];
    enemy.type = type;
    enemy.health = stats.health;
    enemy.stats = stats;
    enemy.elapsed = 0;
    enemy.spawnX = x;
    enemy.fireCooldown = stats.fireRate > 0 ? 1 / stats.fireRate : 0;

    // Swap mesh geometry/material for the correct type
    const newMesh = meshFactories[type]();
    enemy.mesh.geometry.dispose();
    enemy.mesh.geometry = newMesh.geometry;
    (enemy.mesh.material as THREE.Material).dispose();
    enemy.mesh.material = newMesh.material;

    enemy.mesh.position.set(x, y, 0);
    enemy.mesh.visible = true;
  }

  /** Update all active enemies: move, fire, deactivate off-screen. */
  update(dt: number, bulletSystem: EnemyBulletSystem): void {
    const halfH = GAME_CONFIG.playArea.height / 2;

    this.pool.forEachActive((enemy) => {
      enemy.elapsed += dt;
      const stats = enemy.stats;

      // Movement
      switch (enemy.type) {
        case 'drone':
          // Straight down
          enemy.mesh.position.y -= stats.moveSpeed * dt;
          break;

        case 'fighter':
          // Sine-wave horizontal + downward
          enemy.mesh.position.y -= stats.moveSpeed * dt;
          enemy.mesh.position.x = enemy.spawnX +
            Math.sin(enemy.elapsed * stats.sineFrequency * Math.PI * 2) * stats.sineAmplitude;
          break;

        case 'bomber':
          // Slow downward
          enemy.mesh.position.y -= stats.moveSpeed * dt;
          break;
      }

      // Firing
      if (stats.fireRate > 0) {
        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0) {
          enemy.fireCooldown = 1 / stats.fireRate;
          this.firePattern(enemy, bulletSystem);
        }
      }

      // Off-screen cleanup
      if (enemy.mesh.position.y < -halfH - 2) {
        this.pool.release(enemy);
      }
    });
  }

  private firePattern(enemy: Enemy, bulletSystem: EnemyBulletSystem): void {
    const ex = enemy.mesh.position.x;
    const ey = enemy.mesh.position.y;

    switch (enemy.type) {
      case 'fighter': {
        // Aimed shot toward player
        const dx = this.playerX - ex;
        const dy = this.playerY - ey;
        bulletSystem.fire(ex, ey, dx, dy);
        break;
      }
      case 'bomber': {
        // 3-bullet fan spread
        const spreadRad = (enemy.stats.spreadAngle * Math.PI) / 180;
        const angles = [-spreadRad / 2, 0, spreadRad / 2];
        for (const angle of angles) {
          const dirX = Math.sin(angle);
          const dirY = -Math.cos(angle); // downward
          bulletSystem.fire(ex, ey, dirX, dirY);
        }
        break;
      }
      default:
        break;
    }
  }

  /** Count of active enemies. */
  activeCount(): number {
    return this.pool.activeCount();
  }

  releaseAll(): void {
    this.pool.releaseAll();
  }
}
