/** Enemy type identifiers */
export type EnemyType = 'drone' | 'fighter' | 'bomber';

/** Per-enemy-type stats */
export interface EnemyStats {
  health: number;
  moveSpeed: number;
  fireRate: number; // shots per second, 0 = no shooting
  spreadAngle: number; // degrees, for spread-fire enemies
  bulletCount: number; // bullets per shot
  pointValue: number;
  halfExtents: { x: number; y: number };
  color: number; // hex colour
  sineAmplitude: number; // horizontal oscillation amplitude, 0 = straight
  sineFrequency: number; // oscillation frequency
}

export const ENEMY_CONFIG: Record<EnemyType, EnemyStats> = {
  drone: {
    health: 1,
    moveSpeed: 5,
    fireRate: 0,
    spreadAngle: 0,
    bulletCount: 0,
    pointValue: 100,
    halfExtents: { x: 0.5, y: 0.5 },
    color: 0xff3333,
    sineAmplitude: 0,
    sineFrequency: 0,
  },
  fighter: {
    health: 2,
    moveSpeed: 4,
    fireRate: 1.2,
    spreadAngle: 0,
    bulletCount: 1,
    pointValue: 200,
    halfExtents: { x: 0.5, y: 0.6 },
    color: 0xff8800,
    sineAmplitude: 4,
    sineFrequency: 2,
  },
  bomber: {
    health: 4,
    moveSpeed: 2.5,
    fireRate: 0.6,
    spreadAngle: 30,
    bulletCount: 3,
    pointValue: 500,
    halfExtents: { x: 0.8, y: 0.8 },
    color: 0xaa44ff,
    sineAmplitude: 0,
    sineFrequency: 0,
  },
} as const;

/** Enemy bullet speed in world units per second */
export const ENEMY_BULLET_SPEED = 12;
