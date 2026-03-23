import { EnemyType } from './enemyConfig';

/** Single wave definition */
export interface WaveDefinition {
  /** Enemies to spawn in this wave */
  entries: WaveEntry[];
  /** Delay before next wave starts (seconds) */
  postWaveDelay: number;
}

export interface WaveEntry {
  type: EnemyType;
  count: number;
  /** Delay between each spawn in this entry (seconds) */
  spawnInterval: number;
}

export const WAVE_CONFIG: WaveDefinition[] = [
  // Wave 1: intro — just drones
  {
    entries: [{ type: 'drone', count: 5, spawnInterval: 0.8 }],
    postWaveDelay: 2,
  },
  // Wave 2: more drones
  {
    entries: [{ type: 'drone', count: 8, spawnInterval: 0.6 }],
    postWaveDelay: 2,
  },
  // Wave 3: introduce fighters
  {
    entries: [
      { type: 'drone', count: 4, spawnInterval: 0.7 },
      { type: 'fighter', count: 2, spawnInterval: 1.2 },
    ],
    postWaveDelay: 2,
  },
  // Wave 4: fighters + drones
  {
    entries: [
      { type: 'fighter', count: 3, spawnInterval: 1.0 },
      { type: 'drone', count: 6, spawnInterval: 0.5 },
    ],
    postWaveDelay: 2,
  },
  // Wave 5: introduce bombers
  {
    entries: [
      { type: 'drone', count: 4, spawnInterval: 0.6 },
      { type: 'bomber', count: 1, spawnInterval: 1.5 },
    ],
    postWaveDelay: 2.5,
  },
  // Wave 6: mixed
  {
    entries: [
      { type: 'fighter', count: 3, spawnInterval: 0.8 },
      { type: 'bomber', count: 2, spawnInterval: 1.5 },
    ],
    postWaveDelay: 2,
  },
  // Wave 7: swarm
  {
    entries: [
      { type: 'drone', count: 12, spawnInterval: 0.3 },
      { type: 'fighter', count: 2, spawnInterval: 1.0 },
    ],
    postWaveDelay: 2,
  },
  // Wave 8: heavy
  {
    entries: [
      { type: 'bomber', count: 3, spawnInterval: 1.2 },
      { type: 'fighter', count: 4, spawnInterval: 0.8 },
    ],
    postWaveDelay: 2,
  },
  // Wave 9: intense mix
  {
    entries: [
      { type: 'drone', count: 10, spawnInterval: 0.25 },
      { type: 'fighter', count: 4, spawnInterval: 0.7 },
      { type: 'bomber', count: 2, spawnInterval: 1.0 },
    ],
    postWaveDelay: 2.5,
  },
  // Wave 10: boss wave — lots of bombers
  {
    entries: [
      { type: 'bomber', count: 5, spawnInterval: 1.0 },
      { type: 'fighter', count: 6, spawnInterval: 0.6 },
      { type: 'drone', count: 8, spawnInterval: 0.2 },
    ],
    postWaveDelay: 3,
  },
];
