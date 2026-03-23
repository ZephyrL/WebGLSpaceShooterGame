import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Dual-camera system for the battle scene.
 *
 * - Gameplay camera: OrthographicCamera (top-down, Z-axis)
 * - Cinematic camera: PerspectiveCamera (low-angle dramatic view)
 *
 * Supports smooth interpolated transitions between the two.
 */
export class CameraSystem {
  /** Orthographic gameplay camera (top-down) */
  public readonly gameplayCamera: THREE.OrthographicCamera;
  /** Perspective cinematic camera (low-angle) */
  public readonly cinematicCamera: THREE.PerspectiveCamera;

  private activeCamera: THREE.Camera;
  private transitioning = false;
  private transitionProgress = 0;
  private transitionDuration = 0;
  private transitionTarget: 'cinematic' | 'gameplay' = 'gameplay';

  // Stored positions/rotations for interpolation
  private startPos = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private startQuat = new THREE.Quaternion();
  private endQuat = new THREE.Quaternion();

  // The camera used during transitions (a perspective camera that lerps)
  private transitionCamera: THREE.PerspectiveCamera;

  constructor() {
    const { height } = GAME_CONFIG.playArea;
    const aspect = window.innerWidth / window.innerHeight;
    const viewHeight = height / 2;
    const viewWidth = viewHeight * aspect;

    // Orthographic: looks down -Z
    this.gameplayCamera = new THREE.OrthographicCamera(
      -viewWidth, viewWidth, viewHeight, -viewHeight, 0.1, 100
    );
    this.gameplayCamera.position.set(0, 0, 30);
    this.gameplayCamera.lookAt(0, 0, 0);

    // Cinematic: low-angle perspective
    this.cinematicCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    this.cinematicCamera.position.set(0, -20, 8);
    this.cinematicCamera.lookAt(0, 0, 0);

    // Transition camera
    this.transitionCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);

    this.activeCamera = this.gameplayCamera;

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const { height } = GAME_CONFIG.playArea;
    const aspect = window.innerWidth / window.innerHeight;
    const viewHeight = height / 2;
    const viewWidth = viewHeight * aspect;

    this.gameplayCamera.left = -viewWidth;
    this.gameplayCamera.right = viewWidth;
    this.gameplayCamera.top = viewHeight;
    this.gameplayCamera.bottom = -viewHeight;
    this.gameplayCamera.updateProjectionMatrix();

    this.cinematicCamera.aspect = aspect;
    this.cinematicCamera.updateProjectionMatrix();

    this.transitionCamera.aspect = aspect;
    this.transitionCamera.updateProjectionMatrix();
  };

  /** Get the currently active camera for rendering. */
  getActiveCamera(): THREE.Camera {
    if (this.transitioning) {
      return this.transitionCamera;
    }
    return this.activeCamera;
  }

  /** Start smooth transition to cinematic view. */
  transitionToCinematic(duration = 0.7): void {
    this.beginTransition('cinematic', duration);
  }

  /** Start smooth transition back to gameplay view. */
  transitionToGameplay(duration = 0.7): void {
    this.beginTransition('gameplay', duration);
  }

  /** Is a camera transition currently in progress? */
  isTransitioning(): boolean {
    return this.transitioning;
  }

  private beginTransition(target: 'cinematic' | 'gameplay', duration: number): void {
    this.transitioning = true;
    this.transitionProgress = 0;
    this.transitionDuration = duration;
    this.transitionTarget = target;

    const from = target === 'cinematic' ? this.gameplayCamera : this.cinematicCamera;
    const to = target === 'cinematic' ? this.cinematicCamera : this.gameplayCamera;

    this.startPos.copy(from.position);
    this.endPos.copy(to.position);
    this.startQuat.copy(from.quaternion);
    this.endQuat.copy(to.quaternion);

    // Initialise transition camera from start position
    this.transitionCamera.position.copy(this.startPos);
    this.transitionCamera.quaternion.copy(this.startQuat);
  }

  /** Call each fixed-timestep tick to advance transitions. */
  update(dt: number): void {
    if (!this.transitioning) return;

    this.transitionProgress += dt / this.transitionDuration;

    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.transitioning = false;
      this.activeCamera = this.transitionTarget === 'cinematic'
        ? this.cinematicCamera
        : this.gameplayCamera;
    }

    // Ease-in-out interpolation
    const t = this.easeInOut(this.transitionProgress);

    this.transitionCamera.position.lerpVectors(this.startPos, this.endPos, t);
    this.transitionCamera.quaternion.slerpQuaternions(this.startQuat, this.endQuat, t);
    this.transitionCamera.updateProjectionMatrix();
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
  }
}
