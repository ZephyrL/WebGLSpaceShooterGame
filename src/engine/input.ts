import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Input system — tracks keyboard, mouse drag, and touch drag state.
 *
 * Provides:
 * - isKeyDown(key): boolean for current frame
 * - getPointerWorldPosition(): world coords of drag target (or null)
 * - isDragging: whether user is currently dragging
 */
export class InputSystem {
  /** Currently-pressed keys (lowercase) */
  private keys = new Set<string>();
  /** Previous frame's key state (for edge detection) */
  private previousKeys = new Set<string>();
  /** Whether the user is currently dragging (mouse or touch) */
  public isDragging = false;
  /** World-space position of the current drag */
  private pointerWorld: THREE.Vector2 | null = null;

  private camera: THREE.OrthographicCamera | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /** Bind to a canvas + camera for pointer-to-world conversion */
  bind(canvas: HTMLCanvasElement, camera: THREE.OrthographicCamera): void {
    this.camera = camera;
    this.canvas = canvas;

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    canvas.addEventListener('touchcancel', this.onTouchEnd);
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  /** Returns true only on the frame the key transitions from released to pressed. */
  wasKeyPressed(key: string): boolean {
    const k = key.toLowerCase();
    return this.keys.has(k) && !this.previousKeys.has(k);
  }

  /** Snapshot current key state for edge detection. Call once per tick after all updates. */
  endFrame(): void {
    this.previousKeys.clear();
    for (const key of this.keys) {
      this.previousKeys.add(key);
    }
  }

  /** Returns current drag position in world coords, or null if not dragging. */
  getPointerWorldPosition(): THREE.Vector2 | null {
    return this.pointerWorld;
  }

  // --- Keyboard ---

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  // --- Mouse ---

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.updatePointerFromScreen(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    this.updatePointerFromScreen(e.clientX, e.clientY);
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.pointerWorld = null;
  };

  // --- Touch ---

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    this.isDragging = true;
    this.updatePointerFromScreen(touch.clientX, touch.clientY);
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    this.updatePointerFromScreen(touch.clientX, touch.clientY);
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    this.pointerWorld = null;
  };

  // --- Conversion ---

  private updatePointerFromScreen(screenX: number, screenY: number): void {
    if (!this.camera || !this.canvas) return;

    const { width, height } = GAME_CONFIG.playArea;

    // Normalised device coordinates (-1 to +1)
    const ndcX = (screenX / this.canvas.clientWidth) * 2 - 1;
    const ndcY = -(screenY / this.canvas.clientHeight) * 2 + 1;

    // Convert NDC to world space using ortho camera extents
    const worldX = ndcX * (this.camera.right);
    const worldY = ndcY * (this.camera.top);

    // Clamp to play area
    const halfW = width / 2;
    const halfH = height / 2;
    const clampedX = Math.max(-halfW, Math.min(halfW, worldX));
    const clampedY = Math.max(-halfH, Math.min(halfH, worldY));

    if (!this.pointerWorld) {
      this.pointerWorld = new THREE.Vector2(clampedX, clampedY);
    } else {
      this.pointerWorld.set(clampedX, clampedY);
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    // Canvas listeners are cleaned up if canvas is removed from DOM
  }
}
