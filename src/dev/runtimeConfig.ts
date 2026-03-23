import { GAME_CONFIG } from '../config/gameConfig';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { ENEMY_CONFIG, ENEMY_BULLET_SPEED, type EnemyType, type EnemyStats } from '../config/enemyConfig';
import { POWERUP_CONFIG } from '../config/powerupConfig';
import { WAVE_CONFIG, type WaveDefinition } from '../config/waveConfig';

// ── Types for mutable copies ──────────────────────────────────────────

type Widen<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T;
type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : Widen<T[K]> };

export type MutableGameConfig = Mutable<typeof GAME_CONFIG>;
export type MutablePlayerConfig = Mutable<typeof PLAYER_CONFIG>;
export type MutableEnemyConfig = { [K in EnemyType]: Mutable<EnemyStats> };
export type MutablePowerupConfig = Mutable<typeof POWERUP_CONFIG>;

// ── Deep clone helper ─────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ── Archive entry ─────────────────────────────────────────────────────

interface ConfigSnapshot {
  game: MutableGameConfig;
  player: MutablePlayerConfig;
  enemy: MutableEnemyConfig;
  powerup: MutablePowerupConfig;
  waves: WaveDefinition[];
  enemyBulletSpeed: number;
}

export interface ArchiveEntry {
  timestamp: string;
  label: string;
  data: ConfigSnapshot;
}

// ── Storage keys ──────────────────────────────────────────────────────

const STORAGE_KEY = 'spaceshooter_dev_config';
const ARCHIVE_KEY = 'spaceshooter_dev_archives';
const MAX_ARCHIVES = 20;

// ── RuntimeConfig singleton ───────────────────────────────────────────

class RuntimeConfig {
  game: MutableGameConfig;
  player: MutablePlayerConfig;
  enemy: MutableEnemyConfig;
  powerup: MutablePowerupConfig;
  waves: WaveDefinition[];
  enemyBulletSpeed: number;

  private saveCount = 0;

  constructor() {
    this.game = deepClone(GAME_CONFIG) as MutableGameConfig;
    this.player = deepClone(PLAYER_CONFIG) as MutablePlayerConfig;
    this.enemy = deepClone(ENEMY_CONFIG) as MutableEnemyConfig;
    this.powerup = deepClone(POWERUP_CONFIG) as MutablePowerupConfig;
    this.waves = deepClone(WAVE_CONFIG);
    this.enemyBulletSpeed = ENEMY_BULLET_SPEED;

    this.load();
  }

  /** Snapshot current config state. */
  private snapshot(): ConfigSnapshot {
    return deepClone({
      game: this.game,
      player: this.player,
      enemy: this.enemy,
      powerup: this.powerup,
      waves: this.waves,
      enemyBulletSpeed: this.enemyBulletSpeed,
    });
  }

  /** Apply a snapshot to the live config. */
  private applySnapshot(snap: ConfigSnapshot): void {
    Object.assign(this.game, snap.game);
    Object.assign(this.player, snap.player);
    for (const key of Object.keys(snap.enemy) as EnemyType[]) {
      Object.assign(this.enemy[key], snap.enemy[key]);
    }
    Object.assign(this.powerup, deepClone(snap.powerup));
    this.waves.length = 0;
    this.waves.push(...deepClone(snap.waves));
    this.enemyBulletSpeed = snap.enemyBulletSpeed;
  }

  /** Save current config to localStorage. Archives previous version automatically. */
  save(): void {
    try {
      // Archive the previous saved version (if any)
      const prev = localStorage.getItem(STORAGE_KEY);
      if (prev) {
        this.archivePrevious(prev);
      }

      const data = JSON.stringify(this.snapshot());
      localStorage.setItem(STORAGE_KEY, data);
      this.saveCount++;
      console.log('[DevConfig] Saved config (version ' + this.saveCount + ')');
    } catch (e) {
      console.warn('[DevConfig] Failed to save:', e);
    }
  }

  /** Load config from localStorage (if present). */
  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw) as ConfigSnapshot;
      this.applySnapshot(snap);
      console.log('[DevConfig] Loaded saved config from localStorage');
    } catch (e) {
      console.warn('[DevConfig] Failed to load:', e);
    }
  }

  /** Reset all configs to code defaults. */
  reset(): void {
    this.game = deepClone(GAME_CONFIG) as MutableGameConfig;
    this.player = deepClone(PLAYER_CONFIG) as MutablePlayerConfig;
    this.enemy = deepClone(ENEMY_CONFIG) as MutableEnemyConfig;
    this.powerup = deepClone(POWERUP_CONFIG) as MutablePowerupConfig;
    this.waves = deepClone(WAVE_CONFIG);
    this.enemyBulletSpeed = ENEMY_BULLET_SPEED;
    console.log('[DevConfig] Reset to defaults');
  }

  /** List archived config versions. */
  listArchives(): ArchiveEntry[] {
    try {
      const raw = localStorage.getItem(ARCHIVE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as ArchiveEntry[];
    } catch {
      return [];
    }
  }

  /** Restore a specific archive by index. */
  restoreArchive(index: number): boolean {
    const archives = this.listArchives();
    const entry = archives[index];
    if (!entry) return false;
    this.applySnapshot(entry.data);
    console.log('[DevConfig] Restored archive: ' + entry.label);
    return true;
  }

  /** Export current config as a JSON string (for file download). */
  exportJSON(): string {
    return JSON.stringify(this.snapshot(), null, 2);
  }

  /** Import config from a JSON string. */
  importJSON(json: string): void {
    const snap = JSON.parse(json) as ConfigSnapshot;
    this.applySnapshot(snap);
    console.log('[DevConfig] Imported config from JSON');
  }

  /** Archive a previous localStorage value. */
  private archivePrevious(rawPrev: string): void {
    try {
      const archives = this.listArchives();
      const prevSnap = JSON.parse(rawPrev) as ConfigSnapshot;
      archives.push({
        timestamp: new Date().toISOString(),
        label: 'v' + (archives.length + 1),
        data: prevSnap,
      });

      // Trim to max
      while (archives.length > MAX_ARCHIVES) {
        archives.shift();
      }

      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives));
    } catch (e) {
      console.warn('[DevConfig] Failed to archive previous config:', e);
    }
  }
}

/**
 * Singleton instance — only created in dev mode.
 * In production builds Vite replaces `import.meta.env.DEV` with `false`,
 * so the constructor never runs and Rollup can tree-shake the class.
 */
export const runtimeConfig: RuntimeConfig = import.meta.env.DEV
  ? new RuntimeConfig()
  : (undefined as unknown as RuntimeConfig);
