import * as THREE from 'three';

/**
 * Engine renderer — manages the WebGLRenderer and handles viewport resize.
 */
export class Renderer {
  public readonly domElement: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000011);
    this.domElement = this.renderer.domElement;
    container.appendChild(this.domElement);

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  /** Render a scene with the given camera. */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
