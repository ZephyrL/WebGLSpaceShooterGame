import * as THREE from 'three';
import { ObjectPool, Poolable, warnPoolExhausted } from '../engine/objectPool';
import { getGameConfig, getPowerupConfig } from '../dev/configBridge';
import type { PowerupType } from '../dev/configBridge';
import {
  createMultishotPickupMesh,
  createDamageBoostPickupMesh,
  createBombPickupMesh,
} from '../engine/placeholderFactory';

/** A single power-up pickup entity. */
export interface PowerupPickup extends Poolable {
  active: boolean;
  mesh: THREE.Mesh;
  type: PowerupType;
}

const meshFactories: Record<PowerupType, () => THREE.Mesh> = {
  multishot: createMultishotPickupMesh,
  damage_boost: createDamageBoostPickupMesh,
  bomb: createBombPickupMesh,
};

const POWERUP_TYPES: PowerupType[] = ['multishot', 'damage_boost', 'bomb'];

function createPickup(_index: number): PowerupPickup {
  return {
    active: false,
    mesh: createMultishotPickupMesh(),
    type: 'multishot',
  };
}

export class PowerupSystem {
  public pool: ObjectPool<PowerupPickup>;

  constructor() {
    this.pool = new ObjectPool<PowerupPickup>(createPickup, getGameConfig().poolSizes.powerups);
  }

  attachToScene(scene: THREE.Scene): void {
    this.pool.attachToScene(scene);
  }

  /**
   * Roll for a power-up drop. If successful, spawn a random pickup at (x, y).
   * Call this when an enemy is destroyed.
   */
  tryDrop(x: number, y: number): void {
    if (Math.random() > getPowerupConfig().dropChance) return;

    const pickup = this.pool.acquire();
    if (!pickup) { warnPoolExhausted('Powerups'); return; }

    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]!;
    pickup.type = type;

    // Swap mesh geometry/material
    const newMesh = meshFactories[type]();
    pickup.mesh.geometry.dispose();
    pickup.mesh.geometry = newMesh.geometry;
    (pickup.mesh.material as THREE.Material).dispose();
    pickup.mesh.material = newMesh.material;

    pickup.mesh.position.set(x, y, 0);
    pickup.mesh.rotation.set(0, 0, 0);
    pickup.mesh.scale.set(1, 1, 1);
    pickup.mesh.visible = true;
  }

  /** Update all active pickups: drift downward, cleanup off-screen. */
  update(dt: number): void {
    const halfH = getGameConfig().playArea.height / 2;

    this.pool.forEachActive((pickup) => {
      pickup.mesh.position.y -= getPowerupConfig().driftSpeed * dt;

      // Spin for visual interest
      pickup.mesh.rotation.y += dt * 3;
      pickup.mesh.rotation.z += dt * 1.5;

      if (pickup.mesh.position.y < -halfH - 1) {
        this.pool.release(pickup);
      }
    });
  }

  releaseAll(): void {
    this.pool.releaseAll();
  }
}
