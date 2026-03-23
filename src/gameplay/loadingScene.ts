import { GameScene } from '../engine/sceneManager';

/**
 * Loading scene — shows a loading indicator while the battle scene resources
 * are being prepared. Transitions to battle scene when ready.
 */
export class LoadingScene implements GameScene {
  private container: HTMLDivElement | null = null;
  private onReady: () => void;
  private prepareAsync: () => Promise<void>;

  constructor(prepareAsync: () => Promise<void>, onReady: () => void) {
    this.prepareAsync = prepareAsync;
    this.onReady = onReady;
  }

  enter(): void {
    this.container = document.createElement('div');
    this.container.id = 'loading-screen';
    this.container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #000; z-index: 100;
    `;

    const text = document.createElement('div');
    text.textContent = 'LOADING...';
    text.style.cssText = `
      font-size: 28px; color: #4af; letter-spacing: 4px;
      text-shadow: 0 0 15px rgba(68,170,255,0.6);
      animation: pulse 1.5s ease-in-out infinite;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;
    this.container.appendChild(text);

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
    `;
    this.container.appendChild(style);

    document.getElementById('app')?.appendChild(this.container);

    // Start async preparation, then transition
    this.prepareAsync().then(() => {
      this.onReady();
    });
  }

  update(_dt: number): void {
    // No-op during loading
  }

  render(): void {
    // No-op
  }

  exit(): void {
    this.container?.remove();
    this.container = null;
  }
}
