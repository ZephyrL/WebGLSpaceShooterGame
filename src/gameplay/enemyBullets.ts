import * as THREE from 'three';
import { ObjectPool, Poolable, warnPoolExhausted } from '../engine/objectPool';
import { getGameConfig, getEnemyBulletSpeed } from '../dev/configBridge';
import { createEnemyBulletMesh } from '../engine/placeholderFactory';

/** A single enemy bullet entity. */
export interface EnemyBullet extends Poolable {
  active: boolean;
  mesh: THREE.Mesh;
  /** Direction of travel (normalised). */
  dirX: number;
  dirY: number;
}

function createBullet(_index: number): EnemyBullet {
  return {
    active: false,
    mesh: createEnemyBulletMesh(),
    dirX: 0,
    dirY: -1,
  };
}

export class EnemyBulletSystem {
  public pool: ObjectPool<EnemyBullet>;

  constructor() {
    this.pool = new ObjectPool<EnemyBullet>(createBullet, getGameConfig().poolSizes.enemyBullets);
  }

  attachToScene(scene: THREE.Scene): void {
    this.pool.attachToScene(scene);
  }

  /** Fire a bullet from position in the given direction. */
  fire(x: number, y: number, dirX: number, dirY: number): void {
    const bullet = this.pool.acquire();
    if (!bullet) { warnPoolExhausted('EnemyBullets'); return; }
    bullet.mesh.position.set(x, y, 0);
    // Normalise direction
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    bullet.dirX = dirX / len;
    bullet.dirY = dirY / len;
  }

  /** Update all active bullets: move, deactivate off-screen. */
  update(dt: number): void {
    const halfW = getGameConfig().playArea.width / 2;
    const halfH = getGameConfig().playArea.height / 2;
    const speed = getEnemyBulletSpeed();

    this.pool.forEachActive((bullet) => {
      bullet.mesh.position.x += bullet.dirX * speed * dt;
      bullet.mesh.position.y += bullet.dirY * speed * dt;

      const { x, y } = bullet.mesh.position;
      if (x < -halfW - 2 || x > halfW + 2 || y < -halfH - 2 || y > halfH + 2) {
        this.pool.release(bullet);
      }
    });
  }

  releaseAll(): void {
    this.pool.releaseAll();
  }
}
