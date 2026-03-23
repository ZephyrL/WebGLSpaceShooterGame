import { getGameConfig } from '../dev/configBridge';

/**
 * TimeControl — centralised time management for the game.
 *
 * Owns:
 * - `paused`: boolean flag to freeze gameplay
 * - `timeScale`: multiplier applied to dt (default 1.0, future use for slow-motion)
 * - `sessionElapsed`: total gameplay time in seconds (excludes paused time)
 */
export class TimeControl {
  public paused = false;
  public timeScale: number;
  public sessionElapsed = 0;

  private defaultTimeScale: number;

  constructor() {
    this.defaultTimeScale = getGameConfig().timeControl.defaultTimeScale;
    this.timeScale = this.defaultTimeScale;
  }

  /**
   * Update the time control each tick.
   * If not paused, increments sessionElapsed.
   * Returns the effective dt that gameplay systems should use.
   */
  update(dt: number): number {
    if (this.paused) return 0;
    const effectiveDt = dt * this.timeScale;
    this.sessionElapsed += effectiveDt;
    return effectiveDt;
  }

  /** Reset to initial state. */
  reset(): void {
    this.sessionElapsed = 0;
    this.paused = false;
    this.timeScale = this.defaultTimeScale;
  }

  /** Toggle pause. Returns the new paused state. */
  togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }
}
