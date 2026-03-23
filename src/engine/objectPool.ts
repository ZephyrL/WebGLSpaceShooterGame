import * as THREE from 'three';

/**
 * Generic typed object pool.
 *
 * Pre-allocates items at init time. Items are flagged active/inactive.
 * Avoids runtime allocation during gameplay.
 */
export interface Poolable {
  active: boolean;
  mesh: THREE.Object3D;
}

export class ObjectPool<T extends Poolable> {
  private items: T[] = [];
  private scene: THREE.Scene | null = null;

  /**
   * @param factory Creates a new pool item (initially inactive)
   * @param size Number of items to pre-allocate
   */
  constructor(factory: (index: number) => T, size: number) {
    for (let i = 0; i < size; i++) {
      const item = factory(i);
      item.active = false;
      item.mesh.visible = false;
      this.items.push(item);
    }
  }

  /** Attach all pool meshes to a scene. */
  attachToScene(scene: THREE.Scene): void {
    this.scene = scene;
    for (const item of this.items) {
      scene.add(item.mesh);
    }
  }

  /** Acquire an inactive item from the pool. Returns null if pool is exhausted. */
  acquire(): T | null {
    for (const item of this.items) {
      if (!item.active) {
        item.active = true;
        item.mesh.visible = true;
        return item;
      }
    }
    return null;
  }

  /** Release an item back to the pool. */
  release(item: T): void {
    item.active = false;
    item.mesh.visible = false;
  }

  /** Iterate over all active items. */
  forEachActive(callback: (item: T) => void): void {
    for (const item of this.items) {
      if (item.active) {
        callback(item);
      }
    }
  }

  /** Release all active items. */
  releaseAll(): void {
    for (const item of this.items) {
      if (item.active) {
        this.release(item);
      }
    }
  }

  /** Count of currently active items. */
  activeCount(): number {
    let count = 0;
    for (const item of this.items) {
      if (item.active) count++;
    }
    return count;
  }

  /** Remove all meshes from scene. */
  detachFromScene(): void {
    if (!this.scene) return;
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.scene = null;
  }
}
