import { POWERUP_CONFIG, PowerupType } from '../config/powerupConfig';

/**
 * HUD — HTML/CSS overlay for score, health, power-up indicator,
 * wave announcements, and game state screens.
 */
export class HUD {
  private container: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private healthEl: HTMLDivElement;
  private powerupEl: HTMLDivElement;
  private waveEl: HTMLDivElement;
  private pauseBtn: HTMLButtonElement;
  private timerEl: HTMLDivElement;
  private waveTimer = 0;

  private score = 0;

  /** Callback when pause button is clicked */
  public onPauseClick: (() => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 10; font-family: 'Segoe UI', Arial, sans-serif;
    `;

    // Score (top-right)
    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = `
      position: absolute; top: 16px; right: 20px;
      font-size: 24px; font-weight: bold; color: #fff;
      text-shadow: 0 0 8px rgba(0,150,255,0.6);
    `;
    this.scoreEl.textContent = 'Score: 0';
    this.container.appendChild(this.scoreEl);

    // Health (top-left)
    this.healthEl = document.createElement('div');
    this.healthEl.style.cssText = `
      position: absolute; top: 16px; left: 20px;
      font-size: 20px; color: #ff4444;
      text-shadow: 0 0 6px rgba(255,0,0,0.5);
    `;
    this.container.appendChild(this.healthEl);

    // Pause button (top-left, offset below health)
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.textContent = '| |';
    this.pauseBtn.style.cssText = `
      position: absolute; top: 48px; left: 20px;
      width: 36px; height: 36px; font-size: 14px; font-weight: bold;
      color: #aaa; background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;
      cursor: pointer; pointer-events: auto;
      transition: all 0.15s;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;
    this.pauseBtn.addEventListener('mouseenter', () => {
      this.pauseBtn.style.background = 'rgba(255,255,255,0.15)';
      this.pauseBtn.style.color = '#fff';
    });
    this.pauseBtn.addEventListener('mouseleave', () => {
      this.pauseBtn.style.background = 'rgba(255,255,255,0.08)';
      this.pauseBtn.style.color = '#aaa';
    });
    this.pauseBtn.addEventListener('click', () => {
      this.onPauseClick?.();
    });
    this.container.appendChild(this.pauseBtn);

    // Session timer (top-centre-left, between health and powerup)
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      position: absolute; top: 48px; left: 50%; transform: translateX(-50%);
      font-size: 18px; color: #aaa;
      text-shadow: 0 0 4px rgba(150,150,255,0.3);
      font-variant-numeric: tabular-nums;
    `;
    this.timerEl.textContent = '00:00';
    this.container.appendChild(this.timerEl);

    // Power-up indicator (top-centre)
    this.powerupEl = document.createElement('div');
    this.powerupEl.style.cssText = `
      position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
      font-size: 18px; color: #ffcc00; display: none;
      text-shadow: 0 0 6px rgba(255,200,0,0.5);
    `;
    this.container.appendChild(this.powerupEl);

    // Wave indicator (centre)
    this.waveEl = document.createElement('div');
    this.waveEl.style.cssText = `
      position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
      font-size: 36px; font-weight: bold; color: #fff;
      text-shadow: 0 0 12px rgba(0,150,255,0.8);
      opacity: 0; transition: opacity 0.5s;
    `;
    this.container.appendChild(this.waveEl);
  }

  /** Attach HUD to the DOM. */
  attach(): void {
    document.getElementById('app')?.appendChild(this.container);
  }

  /** Remove HUD from the DOM. */
  detach(): void {
    this.container.remove();
  }

  /** Show the HUD. */
  show(): void {
    this.container.style.display = '';
  }

  /** Hide the HUD. */
  hide(): void {
    this.container.style.display = 'none';
  }

  /** Add points to the score. */
  addScore(points: number): void {
    this.score += points;
    this.scoreEl.textContent = `Score: ${this.score}`;
  }

  /** Get current score. */
  getScore(): number {
    return this.score;
  }

  /** Update health display. */
  setHealth(current: number, max: number): void {
    const hearts = '\u2764'.repeat(current) + '\u2661'.repeat(max - current);
    this.healthEl.textContent = `HP: ${hearts}`;
  }

  /** Update power-up indicator. */
  setPowerup(info: { type: PowerupType; remaining: number } | null): void {
    if (!info) {
      this.powerupEl.style.display = 'none';
      return;
    }
    this.powerupEl.style.display = '';
    const name = POWERUP_CONFIG.types[info.type].displayName;
    this.powerupEl.textContent = `${name}: ${info.remaining.toFixed(1)}s`;
  }

  /** Show a wave announcement. */
  showWave(waveNumber: number): void {
    this.waveEl.textContent = `Wave ${waveNumber}`;
    this.waveEl.style.opacity = '1';
    this.waveTimer = 2;
  }

  /** Update timers (call each tick). */
  update(dt: number): void {
    if (this.waveTimer > 0) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveEl.style.opacity = '0';
      }
    }
  }

  /** Set the session timer display from seconds. */
  setSessionTime(seconds: number): void {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /** Hide the pause button (e.g. during game-over). */
  hidePauseButton(): void {
    this.pauseBtn.style.display = 'none';
  }

  /** Show the pause button. */
  showPauseButton(): void {
    this.pauseBtn.style.display = '';
  }

  /** Reset score and display for new game. */
  reset(maxHealth: number): void {
    this.score = 0;
    this.scoreEl.textContent = 'Score: 0';
    this.setHealth(maxHealth, maxHealth);
    this.setPowerup(null);
    this.waveEl.style.opacity = '0';
    this.setSessionTime(0);
    this.showPauseButton();
  }
}
