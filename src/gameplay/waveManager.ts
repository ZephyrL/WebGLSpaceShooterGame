import { getGameConfig, getWaveConfig } from '../dev/configBridge';
import type { WaveEntry } from '../dev/configBridge';
import { EnemySystem } from './enemies';

/**
 * WaveManager — reads wave definitions and spawns enemies sequentially.
 *
 * Detects wave completion, pauses between waves, and advances difficulty.
 */
export class WaveManager {
  private currentWaveIndex = 0;
  private currentEntryIndex = 0;
  private spawnedInEntry = 0;
  private spawnTimer = 0;
  private postWaveTimer = 0;
  private inPostWaveDelay = false;
  private allWavesComplete = false;

  /** Total enemies spawned in current wave (for completion tracking) */
  private totalSpawnedThisWave = 0;

  /** Callback when a new wave starts */
  public onWaveStart: ((waveNumber: number) => void) | null = null;

  constructor() {
    // Initial state
  }

  reset(): void {
    this.currentWaveIndex = 0;
    this.currentEntryIndex = 0;
    this.spawnedInEntry = 0;
    this.spawnTimer = 0;
    this.postWaveTimer = 0;
    this.inPostWaveDelay = false;
    this.allWavesComplete = false;
    this.totalSpawnedThisWave = 0;
  }

  /** Get current wave number (1-indexed for display). */
  getCurrentWaveNumber(): number {
    return this.currentWaveIndex + 1;
  }

  isComplete(): boolean {
    return this.allWavesComplete;
  }

  update(dt: number, enemySystem: EnemySystem): void {
    if (this.allWavesComplete) return;

    // Post-wave delay
    if (this.inPostWaveDelay) {
      this.postWaveTimer -= dt;
      if (this.postWaveTimer <= 0) {
        this.inPostWaveDelay = false;
        this.advanceWave();
      }
      return;
    }

    // Check if current wave is complete (all entries spawned + all enemies gone)
    const wave = getWaveConfig()[this.currentWaveIndex];
    if (!wave) {
      this.allWavesComplete = true;
      return;
    }

    if (this.currentEntryIndex >= wave.entries.length) {
      // All entries spawned — wait for enemies to be defeated/off-screen
      if (enemySystem.activeCount() === 0) {
        this.inPostWaveDelay = true;
        this.postWaveTimer = wave.postWaveDelay;
      }
      return;
    }

    // Spawn enemies for current entry
    const entry = wave.entries[this.currentEntryIndex]!;
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0 && this.spawnedInEntry < entry.count) {
      this.spawnEnemy(entry, enemySystem);
      this.spawnedInEntry++;
      this.totalSpawnedThisWave++;
      this.spawnTimer = entry.spawnInterval;

      if (this.spawnedInEntry >= entry.count) {
        // Move to next entry
        this.currentEntryIndex++;
        this.spawnedInEntry = 0;
        this.spawnTimer = 0;
      }
    }
  }

  private spawnEnemy(entry: WaveEntry, enemySystem: EnemySystem): void {
    const halfW = getGameConfig().playArea.width / 2;
    const halfH = getGameConfig().playArea.height / 2;

    // Random X within play area, Y at top
    const x = (Math.random() * (halfW * 2 - 2)) - halfW + 1;
    const y = halfH + 1;

    enemySystem.spawn(entry.type, x, y);
  }

  private advanceWave(): void {
    this.currentWaveIndex++;
    this.currentEntryIndex = 0;
    this.spawnedInEntry = 0;
    this.spawnTimer = 0;
    this.totalSpawnedThisWave = 0;

    if (this.currentWaveIndex >= getWaveConfig().length) {
      this.allWavesComplete = true;
      return;
    }

    // Notify new wave
    this.onWaveStart?.(this.getCurrentWaveNumber());
  }

  /** Start the first wave (call once at game start). */
  start(): void {
    this.reset();
    this.onWaveStart?.(1);
  }
}
