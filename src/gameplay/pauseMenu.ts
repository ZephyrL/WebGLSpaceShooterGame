import { getGameConfig } from '../dev/configBridge';

/**
 * PauseMenu — modal overlay shown when the game is paused.
 *
 * Provides Resume, Restart, Settings (placeholder), and Quit to Main Menu buttons.
 * Dims the background with a semi-transparent overlay.
 */
export interface PauseMenuCallbacks {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export class PauseMenu {
  private container: HTMLDivElement | null = null;
  private callbacks: PauseMenuCallbacks;
  private visible = false;

  constructor(callbacks: PauseMenuCallbacks) {
    this.callbacks = callbacks;
  }

  /** Show the pause menu overlay. */
  show(): void {
    if (this.visible) return;
    this.visible = true;

    this.container = document.createElement('div');
    this.container.id = 'pause-menu';
    this.container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.65);
      z-index: ${getGameConfig().zIndex.pauseMenu};
      font-family: 'Segoe UI', Arial, sans-serif;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'PAUSED';
    title.style.cssText = `
      font-size: 44px; color: #fff; letter-spacing: 6px;
      text-shadow: 0 0 15px rgba(68,170,255,0.6);
      margin-bottom: 40px;
    `;
    this.container.appendChild(title);

    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex; flex-direction: column; gap: 14px; width: 240px;
    `;

    // Resume
    btnContainer.appendChild(this.createButton('RESUME', false, () => {
      this.callbacks.onResume();
    }));

    // Restart
    btnContainer.appendChild(this.createButton('RESTART', false, () => {
      this.callbacks.onRestart();
    }));

    // Settings (placeholder)
    const settingsBtn = this.createButton('SETTINGS', true, () => {});
    settingsBtn.title = '[PLACEHOLDER] Settings — not yet implemented';
    btnContainer.appendChild(settingsBtn);

    // Quit to Main Menu
    btnContainer.appendChild(this.createButton('QUIT TO MENU', false, () => {
      this.callbacks.onQuit();
    }));

    this.container.appendChild(btnContainer);
    document.getElementById('app')?.appendChild(this.container);
  }

  /** Hide the pause menu overlay. */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container?.remove();
    this.container = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  private createButton(text: string, disabled: boolean, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.disabled = disabled;
    btn.style.cssText = `
      padding: 12px 24px; font-size: 18px; font-weight: bold; width: 100%;
      color: ${disabled ? '#666' : '#fff'};
      background: ${disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #0066cc, #0044aa)'};
      border: ${disabled ? '1px solid #333' : '2px solid #4af'};
      border-radius: 6px;
      cursor: ${disabled ? 'not-allowed' : 'pointer'};
      text-shadow: ${disabled ? 'none' : '0 0 8px rgba(68,170,255,0.6)'};
      box-shadow: ${disabled ? 'none' : '0 0 15px rgba(68,170,255,0.2)'};
      transition: all 0.15s;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;

    if (!disabled) {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'linear-gradient(135deg, #0088ff, #0066cc)';
        btn.style.boxShadow = '0 0 25px rgba(68,170,255,0.4)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'linear-gradient(135deg, #0066cc, #0044aa)';
        btn.style.boxShadow = '0 0 15px rgba(68,170,255,0.2)';
      });
      btn.addEventListener('click', onClick);
    }

    return btn;
  }
}
