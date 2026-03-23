import { getGameConfig } from '../dev/configBridge';
import { SceneManager } from './sceneManager';

/**
 * Fixed-timestep game loop using requestAnimationFrame.
 *
 * Accumulates real elapsed time and processes game-logic updates at a
 * fixed rate (GAME_CONFIG.fixedTimestep). Rendering runs once per frame
 * after all accumulated ticks.
 */
export class GameLoop {
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private rafId = 0;
  private sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const dt = getGameConfig().fixedTimestep;
    let elapsed = (now - this.lastTime) / 1000; // seconds
    this.lastTime = now;

    // Clamp to prevent spiral of death on long frames
    if (elapsed > 0.25) {
      elapsed = 0.25;
    }

    this.accumulator += elapsed;

    while (this.accumulator >= dt) {
      this.sceneManager.update(dt);
      this.accumulator -= dt;
    }

    this.sceneManager.render();

    this.rafId = requestAnimationFrame(this.tick);
  };
}
