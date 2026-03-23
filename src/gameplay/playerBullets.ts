import * as THREE from 'three';
import { ObjectPool, Poolable } from '../engine/objectPool';
import { GAME_CONFIG } from '../config/gameConfig';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { createPlayerBulletMesh } from '../engine/placeholderFactory';

/** A single player bullet entity. */
export interface PlayerBullet extends Poolable {
  active: boolean;
  mesh: THREE.Mesh;
  damage: number;
}

function createBullet(_index: number): PlayerBullet {
  return {
    active: false,
    mesh: createPlayerBulletMesh(),
    damage: PLAYER_CONFIG.bulletDamage,
  };
}

export class PlayerBulletSystem {
  public pool: ObjectPool<PlayerBullet>;

  /** Current bullet material colour (changes during damage boost) */
  private normalColor = 0x44ff44;
  private boostedColor = 0xff8800;
  private isBoosted = false;

  constructor() {
    this.pool = new ObjectPool<PlayerBullet>(createBullet, GAME_CONFIG.poolSizes.playerBullets);
  }

  attachToScene(scene: THREE.Scene): void {
    this.pool.attachToScene(scene);
  }

  /** Fire a bullet from the given world position. */
  fire(x: number, y: number, damage: number): void {
    const bullet = this.pool.acquire();
    if (!bullet) return;
    bullet.mesh.position.set(x, y, 0);
    bullet.damage = damage;
  }

  /** Fire multiple bullets (multi-shot mode). */
  fireMulti(x: number, y: number, damage: number, count: number, offset: number): void {
    if (count === 1) {
      this.fire(x, y, damage);
      return;
    }
    const startX = x - ((count - 1) / 2) * offset;
    for (let i = 0; i < count; i++) {
      this.fire(startX + i * offset, y, damage);
    }
  }

  /** Update all active bullets: move upward, deactivate off-screen. */
  update(dt: number): void {
    const halfH = GAME_CONFIG.playArea.height / 2;
    const speed = PLAYER_CONFIG.bulletSpeed;

    this.pool.forEachActive((bullet) => {
      bullet.mesh.position.y += speed * dt;
      if (bullet.mesh.position.y > halfH + 1) {
        this.pool.release(bullet);
      }
    });
  }

  /** Set visual state for damage boost. */
  setDamageBoost(boosted: boolean): void {
    if (this.isBoosted === boosted) return;
    this.isBoosted = boosted;
    const color = boosted ? this.boostedColor : this.normalColor;
    this.pool.forEachActive((bullet) => {
      const mat = bullet.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(color);
      mat.emissive.setHex(boosted ? 0x884400 : 0x22aa22);
    });
  }

  releaseAll(): void {
    this.pool.releaseAll();
  }
}
