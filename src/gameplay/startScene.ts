import { GameScene } from '../engine/sceneManager';

/**
 * Start screen scene — 2D HTML overlay with title and Start Game button.
 */
export class StartScene implements GameScene {
  private container: HTMLDivElement | null = null;
  private onStart: () => void;

  constructor(onStart: () => void) {
    this.onStart = onStart;
  }

  enter(): void {
    this.container = document.createElement('div');
    this.container.id = 'start-screen';
    this.container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(ellipse at center, #0a0a2e 0%, #000 70%);
      z-index: 100;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'SPACECRAFT SHOOTER';
    title.style.cssText = `
      font-size: 48px; color: #4af; letter-spacing: 6px;
      text-shadow: 0 0 20px rgba(68,170,255,0.8), 0 0 40px rgba(68,170,255,0.4);
      margin-bottom: 12px; font-family: 'Segoe UI', Arial, sans-serif;
    `;
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'WebGL 3D Demo';
    subtitle.style.cssText = `
      font-size: 16px; color: #888; margin-bottom: 60px;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;
    this.container.appendChild(subtitle);

    // Start button
    const startBtn = document.createElement('button');
    startBtn.textContent = 'START GAME';
    startBtn.style.cssText = `
      padding: 16px 48px; font-size: 22px; font-weight: bold;
      color: #fff; background: linear-gradient(135deg, #0066cc, #0044aa);
      border: 2px solid #4af; border-radius: 8px; cursor: pointer;
      text-shadow: 0 0 8px rgba(68,170,255,0.6);
      box-shadow: 0 0 20px rgba(68,170,255,0.3);
      transition: all 0.2s;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;
    startBtn.addEventListener('mouseenter', () => {
      startBtn.style.background = 'linear-gradient(135deg, #0088ff, #0066cc)';
      startBtn.style.boxShadow = '0 0 30px rgba(68,170,255,0.5)';
    });
    startBtn.addEventListener('mouseleave', () => {
      startBtn.style.background = 'linear-gradient(135deg, #0066cc, #0044aa)';
      startBtn.style.boxShadow = '0 0 20px rgba(68,170,255,0.3)';
    });
    startBtn.addEventListener('click', () => {
      this.onStart();
    });
    this.container.appendChild(startBtn);

    // Settings button (placeholder, non-functional)
    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = 'SETTINGS';
    settingsBtn.style.cssText = `
      position: absolute; bottom: 24px; right: 24px;
      padding: 8px 20px; font-size: 14px; color: #666;
      background: rgba(255,255,255,0.05); border: 1px solid #333;
      border-radius: 4px; cursor: not-allowed;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;
    settingsBtn.title = '[PLACEHOLDER] Settings — not yet implemented';
    this.container.appendChild(settingsBtn);

    // Keyboard shortcut: Space to start
    this.handleKeydown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.onStart();
      }
    };
    window.addEventListener('keydown', this.handleKeydown);

    document.getElementById('app')?.appendChild(this.container);
  }

  private handleKeydown: ((e: KeyboardEvent) => void) | null = null;

  update(_dt: number): void {
    // No-op for static screen
  }

  render(): void {
    // No-op — pure HTML
  }

  exit(): void {
    if (this.handleKeydown) {
      window.removeEventListener('keydown', this.handleKeydown);
      this.handleKeydown = null;
    }
    this.container?.remove();
    this.container = null;
  }
}
