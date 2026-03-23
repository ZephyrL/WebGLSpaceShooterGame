import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Placeholder mesh factory — creates simple Three.js geometries
 * for all game entity types with distinct colours and shapes.
 *
 * Each factory function returns a Mesh ready to be added to a scene.
 */

// -- Player Ship: blue cone pointing upward --
export function createPlayerMesh(): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(0.6, 1.6, 6);
  geometry.rotateX(0); // cone already points up in Y by default when rendered top-down
  const material = new THREE.MeshStandardMaterial({ color: 0x3399ff });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

// -- Enemies --
export function createDroneMesh(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1.0, 1.0, 0.5);
  const material = new THREE.MeshStandardMaterial({ color: 0xff3333 });
  return new THREE.Mesh(geometry, material);
}

export function createFighterMesh(): THREE.Mesh {
  const geometry = new THREE.OctahedronGeometry(0.6);
  const material = new THREE.MeshStandardMaterial({ color: 0xff8800 });
  return new THREE.Mesh(geometry, material);
}

export function createBomberMesh(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1.6, 1.6, 0.8);
  const material = new THREE.MeshStandardMaterial({ color: 0xaa44ff });
  return new THREE.Mesh(geometry, material);
}

// -- Bullets --
export function createPlayerBulletMesh(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.15, 6, 6);
  const material = new THREE.MeshStandardMaterial({
    color: 0x44ff44,
    emissive: 0x22aa22,
    emissiveIntensity: 0.5,
  });
  return new THREE.Mesh(geometry, material);
}

export function createEnemyBulletMesh(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.15, 6, 6);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    emissive: 0xaa2222,
    emissiveIntensity: 0.5,
  });
  return new THREE.Mesh(geometry, material);
}

// -- Power-ups --
export function createMultishotPickupMesh(): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(0.4, 0.15, 8, 12);
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ccff,
    emissive: 0x006688,
    emissiveIntensity: 0.3,
  });
  return new THREE.Mesh(geometry, material);
}

export function createDamageBoostPickupMesh(): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(0.45);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    emissive: 0x886600,
    emissiveIntensity: 0.3,
  });
  return new THREE.Mesh(geometry, material);
}

export function createBombPickupMesh(): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.35, 0.35, 0.6, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0044,
    emissive: 0x880022,
    emissiveIntensity: 0.5,
  });
  return new THREE.Mesh(geometry, material);
}

/**
 * Debug label system — creates/shows/hides HTML text labels near entities.
 */
export class DebugLabelSystem {
  private container: HTMLDivElement;
  private labels = new Map<THREE.Object3D, HTMLDivElement>();
  private enabled: boolean;
  private camera: THREE.Camera | null = null;

  constructor() {
    this.enabled = GAME_CONFIG.debug.showLabels;
    this.container = document.createElement('div');
    this.container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    document.getElementById('app')?.appendChild(this.container);
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /** Create a label for an object. */
  addLabel(obj: THREE.Object3D, text: string): void {
    if (!this.enabled) return;
    const label = document.createElement('div');
    label.textContent = text;
    label.style.cssText = 'position:absolute;color:#fff;font-size:10px;background:rgba(0,0,0,0.6);padding:1px 4px;border-radius:2px;white-space:nowrap;transform:translate(-50%,-100%);';
    this.container.appendChild(label);
    this.labels.set(obj, label);
  }

  /** Remove a label for an object. */
  removeLabel(obj: THREE.Object3D): void {
    const label = this.labels.get(obj);
    if (label) {
      this.container.removeChild(label);
      this.labels.delete(obj);
    }
  }

  /** Update label positions to follow their objects. Call each frame. */
  update(): void {
    if (!this.enabled || !this.camera) return;

    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    const vec = new THREE.Vector3();

    this.labels.forEach((label, obj) => {
      if (!obj.visible) {
        label.style.display = 'none';
        return;
      }
      label.style.display = '';
      vec.setFromMatrixPosition(obj.matrixWorld);
      vec.project(this.camera!);

      const x = (vec.x * halfW) + halfW;
      const y = -(vec.y * halfH) + halfH - 20;
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
    });
  }

  dispose(): void {
    this.container.remove();
  }
}
